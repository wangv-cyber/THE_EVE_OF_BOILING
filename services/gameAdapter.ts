
import { GameState } from '../types';
import { localGameService } from './localGame';
import { OnlineGameService } from './onlineGame';

// The Interface that both Local and Online services must implement
export interface IGameService {
  createRoom(): Promise<GameState>;
  joinRoom(roomCode?: string): Promise<GameState>;
  startGame(gameState: GameState): Promise<GameState>;
  settleRound(gameState: GameState, userBid: number | null): Promise<{ nextState: GameState, roundBids: Record<string, number> }>;
  disbandRoom(gameState: GameState): Promise<GameState>;
  leaveRoom(gameState: GameState): Promise<GameState>; // NEW
  kickPlayer(gameState: GameState, targetId: string): Promise<GameState>;
  updateProfile(gameState: GameState, name?: string, avatar?: string): Promise<GameState>;
  getLeaderboard(type: 'GREED' | 'WANTED'): Promise<any>;
  
  // NEW: Real-time subscription
  onGameStateChange(callback: (state: GameState) => void): void;
  offGameStateChange(callback: (state: GameState) => void): void;
}

class GameAdapter {
  private service: IGameService | null = null;
  private mode: 'SOLO' | 'ONLINE' | null = null;

  setMode(mode: 'SOLO' | 'ONLINE', socketUrl?: string) {
    // Only recreate if mode changes or service doesn't exist
    if (this.mode === mode && this.service) return;
    
    this.mode = mode;
    if (mode === 'SOLO') {
      this.service = localGameService;
    } else {
      this.service = new OnlineGameService(socketUrl || window.location.origin);
    }
  }

  getService(): IGameService {
    if (!this.service) {
      throw new Error("Game Service not initialized. Please select a mode.");
    }
    return this.service;
  }
}

export const gameAdapter = new GameAdapter();
