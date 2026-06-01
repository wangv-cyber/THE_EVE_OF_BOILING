import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import type { GameState, Player, PlayerId } from './types.ts';
import { AVATARS, generateFoodBatch } from './constants.ts';
import { calculateGameLimits, generateBotBid, calculateScores, getRandomInt, MAX_ROUNDS } from './services/gameLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 8080;

// Serve Static Files
app.use(express.static(path.join(__dirname, 'dist')));

// --- GAME STATE STORE ---
const rooms = new Map<string, GameState>();
// Map SocketID -> { roomCode, userId }
const socketMapping = new Map<string, { roomCode: string, userId: string }>();
const roomBids = new Map<string, Record<string, number>>();

const createInitialState = (roomCode: string, userId: string): GameState => {
  const startFoodCount = () => generateFoodBatch(getRandomInt(5, 8));
  const hostPlayer: Player = {
    id: userId, // Use Persistent ID
    name: `大厨${roomCode}`,
    isBot: false,
    avatar: AVATARS.USER,
    stash: 0,
    currentBid: null,
    status: 'alive',
    plateFood: startFoodCount(),
    consecutiveTimeouts: 0,
    isDormant: false
  };

  return {
    phase: 'WAITING',
    roomCode,
    isHost: false, // Client logic determines host based on ID
    systemLimit: 0,
    visibleRange: [0, 0],
    currentLoad: 0,
    round: 0,
    players: [hostPlayer],
    logs: [],
    potFood: []
  };
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('create_room', ({ userId }, callback) => {
    // userId is required for persistence
    const actualUserId = userId || socket.id;

    const roomCode = Math.random().toString(36).substr(2, 4).toUpperCase();
    const state = createInitialState(roomCode, actualUserId);
    rooms.set(roomCode, state);

    console.log(`[CREATE] Room ${roomCode} created by ${actualUserId}`);
    console.log(`[CREATE] Total rooms in memory: ${rooms.size}`);
    console.log(`[CREATE] Room codes: ${Array.from(rooms.keys()).join(', ')}`);

    socketMapping.set(socket.id, { roomCode, userId: actualUserId });
    socket.join(roomCode);

    callback({ status: 'ok', data: state });
  });

  socket.on('join_room', ({ roomCode, userId }, callback) => {
    // Convert to uppercase to match room creation format
    const upperRoomCode = roomCode?.toUpperCase() || roomCode;

    console.log(`[JOIN] Attempting to join room: ${roomCode} (normalized: ${upperRoomCode})`);
    console.log(`[JOIN] Total rooms in memory: ${rooms.size}`);
    console.log(`[JOIN] Available room codes: ${Array.from(rooms.keys()).join(', ')}`);

    const state = rooms.get(upperRoomCode);
    if (!state) {
      console.log(`[JOIN] ERROR: Room ${upperRoomCode} not found!`);
      callback({ status: 'error', error: 'Room not found' });
      return;
    }
    console.log(`[JOIN] Successfully found room ${upperRoomCode}`);

    // Use normalized room code for all subsequent operations
    const normalizedRoomCode = upperRoomCode;

    const actualUserId = userId || socket.id;

    // Check if player already exists (Reconnection Logic)
    const existingPlayer = state.players.find(p => p.id === actualUserId);

    if (existingPlayer) {
      // RECONNECTING
      console.log(`User ${actualUserId} reconnected to ${roomCode}`);
      // No visual change to player list, just update socket mapping
    } else {
      // NEW PLAYER
      if (state.phase !== 'WAITING') {
        callback({ status: 'error', error: 'Game already started' });
        return;
      }

      const startFoodCount = () => generateFoodBatch(getRandomInt(5, 8));
      const newPlayer: Player = {
        id: actualUserId,
        name: `食客${state.players.length + 1}`,
        isBot: false,
        avatar: Object.values(AVATARS)[state.players.length % 8],
        stash: 0, currentBid: null, status: 'alive', plateFood: startFoodCount(), consecutiveTimeouts: 0, isDormant: false
      };
      state.players.push(newPlayer);
    }

    socketMapping.set(socket.id, { roomCode: normalizedRoomCode, userId: actualUserId });
    socket.join(normalizedRoomCode);

    // Broadcast update to everyone
    io.to(normalizedRoomCode).emit('game_update_with_bids', { state, roundBids: {} });
    callback({ status: 'ok', data: state });
  });

  socket.on('start_game', ({ roomCode }, callback) => {
    const upperRoomCode = roomCode?.toUpperCase() || roomCode;
    const state = rooms.get(upperRoomCode);
    if (!state) return;

    const [L_min, L_max] = calculateGameLimits(state.players.length);
    state.phase = 'PLAYING';
    state.systemLimit = getRandomInt(L_min, L_max);
    state.visibleRange = [L_min, L_max];
    state.round = 1;
    state.logs = ['火锅开锅了！请下注...'];

    io.to(upperRoomCode).emit('game_update_with_bids', { state, roundBids: {} });
    callback({ status: 'ok', data: state });
  });

  socket.on('submit_bid', ({ roomCode, bid }) => {
    const upperRoomCode = roomCode?.toUpperCase() || roomCode;
    const state = rooms.get(upperRoomCode);
    if (!state || state.phase !== 'PLAYING') return;

    const mapping = socketMapping.get(socket.id);
    if (!mapping) return;
    const userId = mapping.userId;

    if (!roomBids.has(upperRoomCode)) {
      roomBids.set(upperRoomCode, {});
    }

    const currentBids = roomBids.get(upperRoomCode)!;

    // Handle null bid (timeout)
    let actualBid = bid;
    if (actualBid === null) {
      actualBid = getRandomInt(1, 5);
    }

    currentBids[userId] = actualBid;

    console.log(`[BID] User ${userId} bid ${actualBid} in room ${upperRoomCode}, round ${state.round}`);
    console.log(`[BID] Current bids:`, currentBids);

    // Check if everyone bid
    // Only count players who are supposedly 'alive'
    // For now, we assume everyone must bid. If a player is disconnected, the client won't trigger submit_bid.
    // In a real app, we need a server-side timer to force round end if someone disconnects during play.
    // For this prototype, we rely on the client Auto-play logic sending the 'null' bid.

    const activePlayers = state.players.filter(p => p.status === 'alive');
    console.log(`[BID] Active players:`, activePlayers.map(p => p.id));

    const allBidsReceived = activePlayers.every(p => currentBids[p.id] !== undefined);
    console.log(`[BID] All bids received? ${allBidsReceived}`);

    if (allBidsReceived) {
      console.log(`[SETTLE] Settling round ${state.round} for room ${upperRoomCode}`);

      // --- SETTLE ROUND ---
      let roundTotal = 0;
      Object.values(currentBids).forEach(v => roundTotal += v);

      const newLoad = state.currentLoad + roundTotal;
      const newPotItems = generateFoodBatch(Math.min(roundTotal, 8));

      let endReason: 'PERFECT_FIT' | 'COLLAPSE' | 'WIPEOUT' | undefined = undefined;
      if (newLoad === state.systemLimit) endReason = 'PERFECT_FIT';
      else if (newLoad > state.systemLimit) endReason = 'COLLAPSE';

      const { updatedPlayers, scapegoats, cowards } = calculateScores(
        state.players,
        currentBids,
        endReason === 'COLLAPSE',
        endReason === 'PERFECT_FIT'
      );

      if (endReason === 'COLLAPSE') {
        const living = updatedPlayers.filter(p => p.status !== 'dead');
        if (living.length === 0) endReason = 'WIPEOUT';
      }

      const isGameOver = !!endReason;
      state.players = updatedPlayers;
      state.currentLoad = newLoad;
      state.potFood = [...state.potFood, ...newPotItems];
      state.endReason = endReason;
      state.phase = isGameOver ? 'GAME_OVER' : 'PLAYING';
      if (!isGameOver) state.round += 1;

      io.to(upperRoomCode).emit('game_update_with_bids', { state, roundBids: currentBids });

      console.log(`[SETTLE] Round settled. New round: ${state.round}, Game over: ${isGameOver}`);
      console.log(`[SETTLE] Clearing bids for room ${upperRoomCode}`);
      roomBids.set(upperRoomCode, {});
    }
  });

  socket.on('update_profile', ({ roomCode, name, avatar }, callback) => {
    const upperRoomCode = roomCode?.toUpperCase() || roomCode;
    const state = rooms.get(upperRoomCode);
    const mapping = socketMapping.get(socket.id);

    if (state && mapping) {
      const p = state.players.find(p => p.id === mapping.userId);
      if (p) {
        if (name) p.name = name;
        if (avatar) { p.avatar = avatar; p.isImageAvatar = true; }
        io.to(upperRoomCode).emit('game_update_with_bids', { state, roundBids: {} });
        callback({ status: 'ok', data: state });
      }
    }
  });

  socket.on('disband_room', ({ roomCode }, callback) => {
    const upperRoomCode = roomCode?.toUpperCase() || roomCode;
    // Only host should be able to, but simplicity first
    rooms.delete(upperRoomCode);
    io.to(upperRoomCode).emit('game_update_with_bids', {
      state: {
        phase: 'LOBBY', roomCode: '', systemLimit: 0, visibleRange: [0, 0], currentLoad: 0, round: 0, players: [], logs: [], potFood: []
      },
      roundBids: {}
    });
    callback({ status: 'ok' });
  });

  socket.on('kick_player', ({ roomCode, targetId }, callback) => {
    const upperRoomCode = roomCode?.toUpperCase() || roomCode;
    const state = rooms.get(upperRoomCode);
    if (state) {
      state.players = state.players.filter(p => p.id !== targetId);
      io.to(upperRoomCode).emit('game_update_with_bids', { state, roundBids: {} });
      callback({ status: 'ok', data: state });
    }
  });

  socket.on('disconnect', () => {
    const mapping = socketMapping.get(socket.id);
    if (mapping) {
      const { roomCode, userId } = mapping;
      // IMPORTANT CHANGE: Do not remove player from GameState on disconnect.
      // Just remove socket mapping.
      // We can add a "status: 'offline'" later if we want visual feedback.
      socketMapping.delete(socket.id);

      // Optional: If room is empty of sockets, maybe delete room after timeout?
      // For now, keep it alive so they can rejoin.
      console.log(`User ${userId} disconnected from ${roomCode}, but kept in game.`);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});