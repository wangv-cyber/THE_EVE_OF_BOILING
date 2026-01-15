
import React from 'react';
import { FoodItem } from '../types';

interface PotProps {
  currentLoad: number;
  limitMin: number;
  limitMax: number;
  isShaking: boolean;
  phase: string;
  foodItems: FoodItem[];
}

export const Pot: React.FC<PotProps> = ({ currentLoad, limitMin, limitMax, isShaking, phase, foodItems }) => {
  
  // V7.1 Fix: Treat WAITING phase visually same as LOBBY (Red, Boiling)
  // This prevents the pot from turning "cold" when minimizing the room panel before game start.
  const isIdle = phase === 'LOBBY' || phase === 'WAITING';
  
  // Determine if the pot is active/hot
  const hasHeat = isIdle || currentLoad > 0;

  // Dynamic broth color
  let brothColor = 'bg-gradient-to-br from-amber-50 to-orange-100'; // Default Clear soup
  let face = '( ◡́.◡̀)';
  
  const criticalThreshold = limitMin * 0.8;
  
  if (isIdle) {
    // Red Spicy Broth for Lobby & Waiting Room
    brothColor = 'bg-gradient-to-br from-[#ef4444] to-[#991b1b]'; 
  } else if (currentLoad > limitMin) {
    brothColor = 'bg-gradient-to-br from-rose-500 to-red-600'; // Overload
    face = '( > ﹏ < )';
  } else if (currentLoad > criticalThreshold) {
    brothColor = 'bg-gradient-to-br from-orange-300 to-red-400'; // Warning
    face = '( O . O )';
  } else if (currentLoad > 0) {
    brothColor = 'bg-gradient-to-br from-yellow-100 to-amber-200'; // Cooking
    face = '( ＾◡＾)';
  }

  return (
    // Fills the parent container.
    <div className={`relative w-full h-full transition-transform duration-100 z-10 ${isShaking ? 'animate-[shake_0.3s_infinite]' : ''}`}>
      
      {/* 1. Pot Handles (Darker Stone) */}
      <div className="absolute top-1/2 -left-6 sm:-left-8 w-10 sm:w-12 h-16 sm:h-20 bg-stone-900 rounded-l-lg -translate-y-1/2 shadow-xl border-r border-stone-700"></div>
      <div className="absolute top-1/2 -right-6 sm:-right-8 w-10 sm:w-12 h-16 sm:h-20 bg-stone-900 rounded-r-lg -translate-y-1/2 shadow-xl border-l border-stone-700"></div>

      {/* 2. Pot Body (Thick Rim) */}
      <div className="w-full h-full bg-stone-800 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)] relative flex items-center justify-center p-1">
        
        {/* Inner Metal Rim Highlight */}
        <div className="absolute inset-0 rounded-full border-[8px] border-stone-700/50 pointer-events-none"></div>

        {/* 3. Inner Soup Area (With depth shadow) */}
        <div className={`
            w-[90%] h-[90%] rounded-full relative overflow-hidden transition-all duration-1000 
            shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]
            ${brothColor}
        `}>
           
           {/* Liquid Animation Layer - Pulse faster when hot */}
           <div className={`absolute inset-0 bg-white/5 animate-pulse ${hasHeat ? 'duration-1000' : 'duration-3000'}`}></div>
           
           {/* ACTIVE BOILING EFFECTS (Bubbles & Steam) */}
           {hasHeat && (
             <>
                {/* --- LARGE SLOW BUBBLES --- */}
                <div className="absolute top-[40%] left-[45%] w-10 h-10 bg-white/10 rounded-full animate-boil" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
                <div className="absolute bottom-[30%] right-[30%] w-8 h-8 bg-white/10 rounded-full animate-boil" style={{ animationDelay: '1.5s', animationDuration: '3.5s' }}></div>

                {/* --- MEDIUM ACTIVE BUBBLES --- */}
                <div className="absolute top-[30%] left-[55%] w-6 h-6 bg-white/20 rounded-full animate-boil" style={{ animationDelay: '0.2s' }}></div>
                <div className="absolute bottom-[45%] right-[25%] w-5 h-5 bg-white/25 rounded-full animate-boil" style={{ animationDelay: '1.2s' }}></div>
                <div className="absolute top-[50%] left-[20%] w-5 h-5 bg-white/20 rounded-full animate-boil" style={{ animationDelay: '0.7s' }}></div>
                <div className="absolute top-[25%] right-[50%] w-6 h-6 bg-white/20 rounded-full animate-boil" style={{ animationDelay: '2.0s' }}></div>

                {/* --- TINY FIZZ BUBBLES (Fast) --- */}
                <div className="absolute top-[60%] left-[35%] w-3 h-3 bg-white/40 rounded-full animate-boil" style={{ animationDelay: '0.4s', animationDuration: '1.5s' }}></div>
                <div className="absolute top-[50%] right-[40%] w-2 h-2 bg-white/50 rounded-full animate-boil" style={{ animationDelay: '1.1s', animationDuration: '1.2s' }}></div>
                <div className="absolute bottom-[40%] left-[40%] w-2.5 h-2.5 bg-white/40 rounded-full animate-boil" style={{ animationDelay: '0.1s', animationDuration: '1.8s' }}></div>
                <div className="absolute top-[35%] left-[25%] w-3 h-3 bg-white/30 rounded-full animate-boil" style={{ animationDelay: '1.8s', animationDuration: '1.4s' }}></div>
                <div className="absolute bottom-[55%] right-[20%] w-2 h-2 bg-white/50 rounded-full animate-boil" style={{ animationDelay: '0.9s', animationDuration: '1.0s' }}></div>
                
                {/* --- HOLLOW RING BUBBLES --- */}
                <div className="absolute top-[30%] left-[30%] w-7 h-7 border-[2px] border-white/40 bg-transparent rounded-full animate-boil" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-[25%] left-[25%] w-5 h-5 border-[2px] border-white/30 bg-transparent rounded-full animate-boil" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute bottom-[50%] right-[50%] w-4 h-4 border-[1px] border-white/40 bg-transparent rounded-full animate-boil" style={{ animationDelay: '0.9s' }}></div>
                <div className="absolute top-[25%] left-[60%] w-6 h-6 border-[2px] border-white/30 bg-transparent rounded-full animate-boil" style={{ animationDelay: '2.1s' }}></div>

                {/* High Heat Extras (Idle or High Load) */}
                {(isIdle || currentLoad > criticalThreshold) && (
                   <>
                     {/* More aggressive bubbles */}
                     <div className="absolute top-[55%] left-[60%] w-8 h-8 border-[3px] border-white/50 bg-transparent rounded-full animate-boil" style={{ animationDelay: '0.8s', animationDuration: '1.5s' }}></div>
                     <div className="absolute top-[15%] left-[50%] w-5 h-5 border-[2px] border-white/40 bg-transparent rounded-full animate-boil" style={{ animationDelay: '1.2s', animationDuration: '1.2s' }}></div>
                     <div className="absolute bottom-[40%] right-[20%] w-9 h-9 border-[3px] border-white/40 bg-transparent rounded-full animate-boil" style={{ animationDelay: '0.3s', animationDuration: '1.8s' }}></div>
                     
                     <div className="absolute top-[45%] left-[15%] w-5 h-5 bg-white/30 rounded-full animate-boil" style={{ animationDelay: '0.1s', animationDuration: '0.8s' }}></div>
                     <div className="absolute bottom-[30%] right-[15%] w-6 h-6 bg-white/20 rounded-full animate-boil" style={{ animationDelay: '0.6s', animationDuration: '1.0s' }}></div>

                     {/* Steam/Fog Layers */}
                     <div className="absolute bottom-0 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
                     <div className="absolute top-0 right-10 w-24 h-24 bg-white/10 rounded-full blur-3xl animate-pulse delay-700 pointer-events-none"></div>
                   </>
                )}
             </>
           )}

           {/* Surface Reflection */}
           <div className="absolute top-4 left-8 w-24 h-10 bg-white/10 rounded-full -rotate-12 pointer-events-none backdrop-brightness-110"></div>

           {/* 4. Stacked Food Items */}
           <div className="absolute inset-4"> 
              {foodItems.map((item, index) => (
                <div
                  key={item.id}
                  className="absolute transition-all duration-500 ease-out flex items-center justify-center select-none"
                  style={{
                    left: `${item.offsetX}%`,
                    top: `${item.offsetY}%`,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                    zIndex: index, 
                    fontSize: 'clamp(3.5rem, 12vw, 5rem)', 
                    filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.15))'
                  }}
                >
                  {/* Inner wrapper for Floating/Bobbing animation. 
                      We apply it here to avoid conflict with the parent's transform style. */}
                  <div 
                    className={hasHeat ? 'animate-float' : ''} 
                    style={{ animationDelay: `${(index * 0.3) % 2}s` }} // Staggered start
                  >
                    {item.icon}
                  </div>
                </div>
              ))}
           </div>

           {/* 5. Face Overlay - HIDDEN IN LOBBY & WAITING */}
           {!isIdle && (
             <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-black text-stone-700 shadow-lg border border-white z-50 whitespace-nowrap">
               {face} <span className="text-stone-400 text-[10px] ml-1">{currentLoad}°C</span>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};
