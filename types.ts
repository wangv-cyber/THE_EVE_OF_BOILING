
export type PlayerId = 'user' | 'bot1' | 'bot2' | 'bot3' | 'bot4' | 'bot5' | 'bot6' | 'bot7' | string;

export interface FoodItem {
  id: string;
  icon: string;
  rotation: number;
  offsetX: number; // Percentage 0-100
  offsetY: number; // Percentage 0-100
  scale: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  isBot: boolean;
  avatar: string; // Emoji or Image URL
  isImageAvatar?: boolean; // Flag to render img tag instead of text
  stash: number; // Accumulated score
  currentBid: number | null; // Bid in the current round
  status: 'alive' | 'dead' | 'winner';
  isCoward?: boolean; 
  lastAction?: string;
  // Visuals for the food on their plate
  plateFood: FoodItem[];
  
  // V4.0 Autopilot Stats
  consecutiveTimeouts: number;
  isDormant: boolean;
}

export interface GameState {
  phase: 'LOBBY' | 'WAITING' | 'PLAYING' | 'REVEAL' | 'GAME_OVER';
  roomCode?: string; // Room ID for sharing
  isHost?: boolean; // Is current user the host
  systemLimit: number; 
  visibleRange: [number, number]; 
  currentLoad: number; 
  round: number;
  players: Player[];
  logs: string[];
  endReason?: 'COLLAPSE' | 'PERFECT_FIT' | 'WIPEOUT';
  // Visuals for food inside the pot
  potFood: FoodItem[];
}

export type BidType = number;

export interface SliderConfig {
  min: number;
  max: number;
  safeMax: number;
  warnMax: number;
}

export type GameMode = 'SOLO' | 'ONLINE' | null;
