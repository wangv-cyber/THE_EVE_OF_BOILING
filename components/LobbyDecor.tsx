
import React from 'react';
import { LOBBY_DECOR } from '../constants';

// PART 1: The Title
export const LobbyTitle: React.FC = () => {
  return (
    <div className="absolute top-[4%] left-0 right-0 z-[40] flex flex-col items-center justify-center pointer-events-none">
      <h1 className="relative font-calligraphy text-[5rem] sm:text-[6rem] leading-none select-none text-center transform scale-y-110"
        style={{
          color: '#b91c1c',
          // Enhanced shadow for better readability over the busy pot background
          textShadow: '3px 6px 0px rgba(255,255,255,0.9), 0 10px 20px rgba(185, 28, 28, 0.4)'
        }}>
        沸腾之夜
      </h1>
      <div className="mt-2 text-[#991b1b] text-xs sm:text-sm font-black tracking-[0.3em] uppercase drop-shadow-md opacity-90 bg-white/30 backdrop-blur-sm px-4 py-1 rounded-full border border-white/20">
        {LOBBY_DECOR.TITLE_SUB}
      </div>
    </div>
  );
};
