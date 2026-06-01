
import { io, Socket } from "socket.io-client";
import { GameState } from "../types";
import { IGameService } from "./gameAdapter";

const USER_ID_KEY = 'THE_EVE_USER_ID';

export class OnlineGameService implements IGameService {
  private socket: Socket;
  private currentRoomCode: string | null = null;
  private persistentUserId: string;
  private listeners: ((state: GameState) => void)[] = [];

  constructor(serverUrl: string) {
    // 1. Setup Persistent User ID
    let storedId = sessionStorage.getItem(USER_ID_KEY);
    if (!storedId) {
        storedId = 'user_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(USER_ID_KEY, storedId);
    }
    this.persistentUserId = storedId;

    // 2. Setup Socket
    // Allow Socket.IO to use default transport negotiation (polling then upgrade to websocket)
    this.socket = io(serverUrl, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        autoConnect: true
    });
    
    this.socket.on("connect", () => {
      console.log("Connected to server. Socket ID:", this.socket.id, "Persistent ID:", this.persistentUserId);
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    this.socket.on("error", (err: any) => {
      console.error("Socket error:", err);
    });

    // 3. Global State Listener
    this.socket.on('game_update_with_bids', (data: { state: GameState, roundBids: Record<string, number> }) => {
        const transformedState = this.transformState(data.state);
        this.listeners.forEach(cb => cb(transformedState));
    });
  }

  // Helper to wrap socket emits in promises
  private async emitAck<T>(event: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket.connected) {
          this.socket.connect();
      }

      this.socket.emit(event, data, (response: { status: string, data?: T, error?: string }) => {
        if (response.status === 'ok') {
          resolve(response.data as T);
        } else {
          reject(new Error(response.error));
        }
      });
      
      setTimeout(() => reject(new Error("Request timed out")), 5000);
    });
  }

  // --- API Methods ---

  async createRoom(): Promise<GameState> {
    const state = await this.emitAck<GameState>('create_room', { userId: this.persistentUserId });
    this.currentRoomCode = state.roomCode || null;
    return this.transformState(state);
  }

  async joinRoom(roomCode?: string): Promise<GameState> {
    if (!roomCode) throw new Error("Room code required");
    const state = await this.emitAck<GameState>('join_room', { 
        roomCode, 
        userId: this.persistentUserId 
    });
    this.currentRoomCode = roomCode;
    return this.transformState(state);
  }

  async startGame(gameState: GameState): Promise<GameState> {
    const state = await this.emitAck<GameState>('start_game', { roomCode: this.currentRoomCode });
    return this.transformState(state);
  }

  async settleRound(gameState: GameState, userBid: number | null): Promise<{ nextState: GameState, roundBids: Record<string, number> }> {
    return new Promise((resolve, reject) => {
      this.socket.emit('submit_bid', { roomCode: this.currentRoomCode, bid: userBid });
      
      const handler = (data: { state: GameState, roundBids: Record<string, number> }) => {
        this.socket.off('game_update_with_bids', handler);
        resolve({ nextState: this.transformState(data.state), roundBids: data.roundBids });
      };
      
      this.socket.on('game_update_with_bids', handler);
      
      setTimeout(() => {
          this.socket.off('game_update_with_bids', handler);
          reject(new Error("Timeout waiting for round result"));
      }, 30000); 
    });
  }

  async disbandRoom(gameState: GameState): Promise<GameState> {
    const state = await this.emitAck<GameState>('disband_room', { roomCode: this.currentRoomCode });
    return this.transformState(state);
  }

  async leaveRoom(gameState: GameState): Promise<GameState> {
    await this.emitAck<GameState>('kick_player', { 
        roomCode: this.currentRoomCode, 
        targetId: this.persistentUserId 
    });
    return {
       phase: 'LOBBY', systemLimit: 0, visibleRange: [0, 0], currentLoad: 0, round: 1, players: [], logs: [], potFood: []
    };
  }

  async kickPlayer(gameState: GameState, targetId: string): Promise<GameState> {
    const state = await this.emitAck<GameState>('kick_player', { roomCode: this.currentRoomCode, targetId });
    return this.transformState(state);
  }

  async updateProfile(gameState: GameState, name?: string, avatar?: string): Promise<GameState> {
     const state = await this.emitAck<GameState>('update_profile', { 
         roomCode: this.currentRoomCode, 
         name: name, 
         avatar: avatar 
     });
     return this.transformState(state);
  }

  async getLeaderboard(type: 'GREED' | 'WANTED'): Promise<any> {
    return { list: [], myRank: 0, myData: null };
  }

  onGameStateChange(callback: (state: GameState) => void): void {
      this.listeners.push(callback);
  }

  offGameStateChange(callback: (state: GameState) => void): void {
      this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  private transformState(serverState: GameState): GameState {
     const mappedPlayers = serverState.players.map(p => {
         if (p.id === this.persistentUserId) {
             return { ...p, id: 'user' };
         }
         return p;
     });

     const hostPlayer = serverState.players[0];
     const amIHost = hostPlayer && hostPlayer.id === this.persistentUserId;

     return {
         ...serverState,
         players: mappedPlayers,
         isHost: amIHost
     };
  }
}
