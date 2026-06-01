
import { GameState, Player, PlayerId } from '../types';
import { AVATARS, generateFoodBatch } from '../constants';
import { calculateGameLimits, generateBotBid, calculateScores, getRandomInt, MAX_ROUNDS } from './gameLogic';
import { calculateTitle } from '../utils/levelSystem';
import { IGameService } from './gameAdapter';

// Reusing the logic from the original cloudMock.ts but structured as a service

interface DB_User {
  _openid: string;
  nickName: string;
  avatarUrl: string;
  stats: {
    totalBounty: number;
    scapegoatCount: number;
    title: string;
  };
}

const generateMockDB = (): DB_User[] => {
  const users: DB_User[] = [];
  users.push({
    _openid: 'user_me',
    nickName: '本大厨 (我)',
    avatarUrl: AVATARS.USER,
    stats: { totalBounty: 12500, scapegoatCount: 5, title: calculateTitle(12500) }
  });
  const botNames = ['Gordon', 'Jamie', 'Salt Bae', 'Uncle Roger', 'Ratatouille', 'SpongeBob', 'Sanji', 'Toriko', 'Cooking Mama', 'Leon'];
  for (let i = 0; i < 20; i++) {
    const score = getRandomInt(0, 55000);
    users.push({
      _openid: `user_${i}`,
      nickName: botNames[i % botNames.length] + `_${i}`,
      avatarUrl: Object.values(AVATARS)[i % 8],
      stats: { totalBounty: score, scapegoatCount: getRandomInt(0, 50), title: calculateTitle(score) }
    });
  }
  return users;
};

const CloudDB_Mock = generateMockDB();

export const localGameService: IGameService = {
  createRoom: async (): Promise<GameState> => {
    const startFoodCount = () => generateFoodBatch(getRandomInt(5, 8));
    const user: Player = {
      id: 'user',
      name: `大厨${getRandomInt(100, 999)}`,
      isBot: false, avatar: AVATARS.USER, stash: 0, currentBid: null, status: 'alive', plateFood: startFoodCount(), consecutiveTimeouts: 0, isDormant: false
    };
    const bots: Player[] = Array.from({ length: 3 }).map((_, i) => ({
      id: `bot${i + 1}` as PlayerId,
      name: `摸鱼王${i + 1}`,
      isBot: true, avatar: Object.values(AVATARS)[(i + 1) % Object.values(AVATARS).length], stash: 0, currentBid: null, status: 'alive', plateFood: startFoodCount(), consecutiveTimeouts: 0, isDormant: false
    }));

    return {
      phase: 'WAITING',
      roomCode: Math.random().toString().substr(2, 6).toUpperCase(),
      isHost: true,
      systemLimit: 0, visibleRange: [0, 0], currentLoad: 0, round: 0,
      players: [user, ...bots], logs: [], potFood: []
    };
  },

  joinRoom: async (): Promise<GameState> => {
    // Local mock join always behaves as a guest joining a mock room
    const startFoodCount = () => generateFoodBatch(getRandomInt(5, 8));
    const user: Player = {
      id: 'user', name: `路人${getRandomInt(100, 999)}`, isBot: false, avatar: AVATARS.USER, stash: 0, currentBid: null, status: 'alive', plateFood: startFoodCount(), consecutiveTimeouts: 0, isDormant: false
    };
    const host: Player = {
      id: 'bot_host' as PlayerId, name: '房主大王', isBot: true, avatar: AVATARS.BOT7, stash: 0, currentBid: null, status: 'alive', plateFood: startFoodCount(), consecutiveTimeouts: 0, isDormant: false
    };
    const bots: Player[] = Array.from({ length: 2 }).map((_, i) => ({
      id: `bot${i + 1}` as PlayerId, name: `食客${i + 1}`, isBot: true, avatar: Object.values(AVATARS)[i], stash: 0, currentBid: null, status: 'alive', plateFood: startFoodCount(), consecutiveTimeouts: 0, isDormant: false
    }));

    return {
      phase: 'WAITING', roomCode: '8888', isHost: false, systemLimit: 0, visibleRange: [0, 0], currentLoad: 0, round: 0,
      players: [host, user, ...bots], logs: [], potFood: []
    };
  },

  disbandRoom: async (): Promise<GameState> => {
    return {
      phase: 'LOBBY', systemLimit: 0, visibleRange: [0, 0], currentLoad: 0, round: 1, players: [], logs: [], potFood: [],
    };
  },

  leaveRoom: async (): Promise<GameState> => {
    // For local, leaving is same as disbanding/resetting to lobby
    return {
      phase: 'LOBBY', systemLimit: 0, visibleRange: [0, 0], currentLoad: 0, round: 1, players: [], logs: [], potFood: [],
    };
  },

  kickPlayer: async (gameState: GameState, targetId: string): Promise<GameState> => {
    const newPlayers = gameState.players.filter(p => p.id !== targetId);
    return { ...gameState, players: newPlayers };
  },

  updateProfile: async (gameState: GameState, name?: string, avatar?: string): Promise<GameState> => {
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === 'user') {
        return { ...p, name: name || p.name, avatar: avatar || p.avatar, isImageAvatar: !!avatar };
      }
      return p;
    });
    return { ...gameState, players: updatedPlayers };
  },

  startGame: async (gameState: GameState): Promise<GameState> => {
    const totalPlayers = gameState.players.length;
    const [L_min, L_max] = calculateGameLimits(totalPlayers);
    const trueLimit = getRandomInt(L_min, L_max);

    const freshPlayers = gameState.players.map(p => ({
      ...p, consecutiveTimeouts: 0, isDormant: false, status: 'alive' as const, stash: 0, plateFood: generateFoodBatch(getRandomInt(5, 8))
    }));

    return {
      ...gameState, phase: 'PLAYING', systemLimit: trueLimit, visibleRange: [L_min, L_max], currentLoad: 0, round: 1, logs: ['火锅开锅了！请下注...'], players: freshPlayers
    };
  },

  settleRound: async (gameState: GameState, userBid: number | null): Promise<{ nextState: GameState, roundBids: Record<string, number> }> => {
    const roundBids: Record<string, number> = {};
    const user = gameState.players.find(p => p.id === 'user')!;
    let actualUserBid = 0;
    let userTimeoutCount = user.consecutiveTimeouts;
    let userIsDormant = user.isDormant;

    if (userBid === null) {
      actualUserBid = getRandomInt(1, 10);
      userTimeoutCount++;
      if (userTimeoutCount >= 2) userIsDormant = true;
    } else {
      actualUserBid = userBid;
      userTimeoutCount = 0;
      userIsDormant = false;
    }

    roundBids['user'] = actualUserBid;

    gameState.players.forEach(p => {
      if (p.isBot && p.status === 'alive') {
        roundBids[p.id] = generateBotBid(gameState.currentLoad, gameState.visibleRange[0]);
      }
    });

    let roundTotal = 0;
    Object.values(roundBids).forEach(v => roundTotal += v);

    const newLoad = gameState.currentLoad + roundTotal;
    const newPotItems = generateFoodBatch(Math.min(roundTotal, 8));
    let roundLog = `第 ${gameState.round} 轮: +${roundTotal}`;
    if (userBid === null) roundLog += ' (自动托管)';

    let systemLimit = gameState.systemLimit;
    const isCollapse = newLoad > systemLimit;
    const isPerfect = newLoad === systemLimit;

    let endReason: 'PERFECT_FIT' | 'COLLAPSE' | 'WIPEOUT' | undefined = undefined;
    if (isPerfect) endReason = 'PERFECT_FIT';
    else if (isCollapse) endReason = 'COLLAPSE';

    const updatedPlayersWithFlags = gameState.players.map(p => {
      if (p.id === 'user') return { ...p, consecutiveTimeouts: userTimeoutCount, isDormant: userIsDormant };
      return p;
    });

    const { updatedPlayers, scapegoats, cowards } = calculateScores(
      updatedPlayersWithFlags,
      roundBids,
      isCollapse,
      isPerfect
    );

    if (endReason === 'COLLAPSE') {
      const livingPlayers = updatedPlayers.filter(p => p.status !== 'dead');
      if (livingPlayers.length === 0) endReason = 'WIPEOUT';
    }

    const extraLogs = [];
    if (endReason === 'PERFECT_FIT') extraLogs.push('✨ 完美！大家吃好喝好！');
    if (endReason === 'COLLAPSE') {
      extraLogs.push('🔥 炸锅了！');
      if (scapegoats.length > 0) extraLogs.push(`🥵 饭醉分子: ${scapegoats.map(id => updatedPlayers.find(p => p.id === id)?.name).join(', ')}`);
      if (cowards.length > 0) extraLogs.push(`🐤 小鸟胃: ${cowards.map(id => updatedPlayers.find(p => p.id === id)?.name).join(', ')} (清洗)`);
    }
    if (endReason === 'WIPEOUT') extraLogs.push('🤡 全军覆没！');

    const isGameOver = !!endReason;
    if (!isGameOver && gameState.round >= MAX_ROUNDS) {
      systemLimit = newLoad;
      extraLogs.push('⚠️ 强制沸腾生效：阈值已收缩！');
    }

    const nextState: GameState = {
      ...gameState, systemLimit: systemLimit, currentLoad: newLoad,
      phase: isGameOver ? 'GAME_OVER' : 'PLAYING', endReason, round: isGameOver ? gameState.round : gameState.round + 1,
      logs: [...extraLogs, roundLog, ...gameState.logs],
      players: isGameOver ? updatedPlayers : gameState.players.map(p => {
        const updatedP = updatedPlayers.find(up => up.id === p.id);
        return {
          ...p, stash: updatedP ? updatedP.stash : p.stash, plateFood: updatedP ? updatedP.plateFood : p.plateFood,
          status: updatedP ? (isGameOver ? updatedP.status : 'alive') : p.status,
          consecutiveTimeouts: user.id === p.id ? userTimeoutCount : p.consecutiveTimeouts,
          isDormant: user.id === p.id ? userIsDormant : p.isDormant, currentBid: null
        };
      }),
      potFood: [...gameState.potFood, ...newPotItems]
    };

    return { nextState, roundBids };
  },

  getLeaderboard: async (type: 'GREED' | 'WANTED'): Promise<any> => {
    let sorted = [...CloudDB_Mock];
    if (type === 'GREED') sorted.sort((a, b) => b.stats.totalBounty - a.stats.totalBounty);
    else sorted.sort((a, b) => b.stats.scapegoatCount - a.stats.scapegoatCount);
    const myIndex = sorted.findIndex(u => u._openid === 'user_me');
    return { list: sorted.slice(0, 50), myRank: myIndex + 1, myData: sorted[myIndex] };
  },

  // No-op for local
  onGameStateChange: (cb) => { },
  offGameStateChange: (cb) => { }
};
