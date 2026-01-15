
import { SliderConfig, FoodItem } from './types';

// V2.0: L_MIN = 40 * N, L_MAX = 60 * N
export const LIMIT_MULTIPLIER = {
  MIN: 40,
  MAX: 60
};

// NEW: Game Room Configuration
export const ROOM_CONFIG = {
  MIN_PLAYERS: 3, // Minimum players required to start
  MAX_PLAYERS: 12,
  MAX_NAME_LENGTH: 16 // Matches typical WeChat nickname limits (approx 32 bytes or 16 chars)
};

export const INPUT_RANGE: SliderConfig = {
  min: 1,
  max: 20,
  safeMax: 5,   // 1-5
  warnMax: 14   // 6-14
};

// Cutier Avatars
export const AVATARS = {
  USER: '🧑‍🍳', // Chef
  BOT1: '🐕', // Dog
  BOT2: '🐈', // Cat
  BOT3: '🦊',
  BOT4: '🐼',
  BOT5: '🐨',
  BOT6: '🐷',
  BOT7: '🐸',
};

// Expanded Food Library for visual variety
// REMOVED tableware (bowls 🥣, pans 🥘)
export const FOOD_LIBRARY = [
  // Meats
  '🥩', '🍗', '🥓', '🍖', 
  // Veggies
  '🥬', '🥦', '🌽', '🥕', '🍄', '🍅', '🥔', '🍆',
  // Seafood / Proteins
  '🍤', '🍥', '🥚', '🐟', '🦀', '🦞', '🐙', '🦑',
  // Hotpot friendly items
  '🥟', '🍡'
];

// LOBBY DECORATION ASSETS
export const LOBBY_DECOR = {
  SPICES: ['🌶️', '🧄', '🧅', '🍁', '🍃'], // Maple leaf used as Star Anise
  UTENSILS: ['🥢', '🥣', '🥡', '🍶'],
  TITLE_MAIN: '沸腾前夜',
  TITLE_SUB: 'THE EVE OF BOILING'
};

// NEW: Requested Chaos Items for Lobby Overlays
export const LOBBY_CHAOS_ITEMS = [
  // Required Spices & Meat
  '🥩', '🌶️', '🧅', '🧄', '🫚', 
  // Drinks
  '🍺', '🥃', '🍷', '🍹', '🥤',
  // Extra Richness
  '🥓', '🥦', '🍄', '🦞', '🦀', 
  '🥢', '🥣' 
];

export const generateFoodItem = (): FoodItem => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    icon: FOOD_LIBRARY[Math.floor(Math.random() * FOOD_LIBRARY.length)],
    rotation: Math.floor(Math.random() * 360),
    // Random position within a circle container usually
    offsetX: Math.random() * 60 + 20, // 20% to 80%
    offsetY: Math.random() * 60 + 20,
    scale: 0.9 + Math.random() * 0.4, // 0.9x to 1.3x size
  };
};

export const generateFoodBatch = (count: number): FoodItem[] => {
  return Array.from({ length: count }).map(() => generateFoodItem());
};

// Soft Clay Theme Colors
export const THEME_COLORS = {
  // Broth colors (Gradients)
  SAFE: 'from-[#fff1eb] to-[#ace0f9]', // Light Blue/White (Bone Broth)
  WARN: 'from-[#fad0c4] to-[#ffd1ff]', // Pinkish (Tomato)
  DANGER: 'from-[#ff9a9e] to-[#fecfef]', // Red/Pink (Spicy)
  
  // UI Accents
  BUTTON_GRADIENT: 'from-[#fbc2eb] to-[#a6c1ee]',
  BUTTON_HOVER: 'from-[#fbc2eb] to-[#a6c1ee]',
};
