import { gameAdapter, IGameService } from '../services/gameAdapter';

/**
 * PLATFORM ADAPTER
 * ----------------
 * Bridges UI to the Logic Layer (GameAdapter).
 */

// 1. Vibration / Haptics
export const platformVibrate = (type: 'heavy' | 'light' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'heavy') navigator.vibrate(20); 
    else navigator.vibrate(5);
  }
};

// 2. System Modal / Alert
export const platformAlert = (title: string, content: string) => {
  alert(`${title}\n\n${content}`);
};

// 3. Unified API Call
export const callCloudFunction = async (name: keyof IGameService, data: any): Promise<any> => {
  // console.log(`[Adapter] Calling '${name}'...`, data);
  
  const service = gameAdapter.getService();
  // CRITICAL FIX: Bind the function to the service instance.
  // Without .bind(service), methods from Class-based services (like OnlineGameService)
  // lose their 'this' context, causing errors when accessing 'this.socket' etc.
  const fn = (service[name] as Function).bind(service);

  if (!fn) {
    throw new Error(`Function '${name}' not implemented in current service.`);
  }

  // Simulate network latency for local mode only to feel real
  // Online mode has real latency
  // @ts-ignore
  if (service.constructor.name !== 'OnlineGameService') {
     await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Spread arguments if data is object, or pass directly
  // Adjusting signature to match Service methods
  let result;
  if (name === 'createRoom' || name === 'getLeaderboard') {
      result = await fn(data);
  } else if (name === 'joinRoom') {
      result = await fn(data.roomCode);
  } else if (name === 'settleRound') {
      result = await fn(data.gameState, data.userBid);
  } else if (name === 'kickPlayer') {
      result = await fn(data.gameState, data.targetId);
  } else if (name === 'updateProfile') {
      result = await fn(data.gameState, data.name, data.avatar);
  } else if (name === 'startGame' || name === 'disbandRoom') {
      result = await fn(data.gameState);
  } else {
      result = await fn(data);
  }

  return result;
};