
import React from 'react';
import { Player } from '../types';
import { Pencil, ZapOff, Moon, X, Flame, Crown, Leaf } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isRevealed: boolean;
  isGameOver?: boolean; // New prop to control role reveal
  variant?: 'hero' | 'compact' | 'waiting'; 
  onEditProfile?: () => void; 
  canKick?: boolean; 
  onKick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  isRevealed, 
  isGameOver = false, 
  variant = 'compact', 
  onEditProfile, 
  canKick, 
  onKick 
}) => {
  // Determine Role Archetype for Visuals
  const isCoward = player.isCoward;
  const isDead = player.status === 'dead';
  const isWinner = player.status === 'winner';
  
  let roleType: 'CRIMINAL' | 'GOURMET' | 'COWARD' | 'NORMAL' = 'NORMAL';
  
  // Bugfix: Role badges and special styling should ONLY appear at Game Over.
  // During normal rounds, everyone is just playing (NORMAL).
  if (isGameOver) {
      if (isCoward) {
          roleType = 'COWARD';
      } else if (isDead) {
          roleType = 'CRIMINAL';
      } else if (isWinner) {
          roleType = 'GOURMET';
      }
  }

  // V4.0 Autopilot States
  const isAuto = player.consecutiveTimeouts > 0;
  const isDormant = player.isDormant;

  // Is this the current user in waiting mode?
  const isEditable = variant === 'waiting' && player.id === 'user';

  // --- HERO VARIANT (User In-Game) ---
  if (variant === 'hero') {
    const visibleFood = player.plateFood; 

    // Hero Style Mapping
    let heroBorder = 'border-stone-100';
    let heroBg = 'bg-white';
    let heroShadow = 'shadow-2xl';
    
    // Only apply Role Colors if it's determined (Game Over)
    if (isRevealed && roleType !== 'NORMAL') {
        if (roleType === 'CRIMINAL') {
            heroBorder = 'border-red-500';
            heroBg = 'bg-red-50';
            heroShadow = 'shadow-red-200 ring-4 ring-red-100';
        } else if (roleType === 'GOURMET') {
            heroBorder = 'border-yellow-400';
            heroBg = 'bg-yellow-50';
            heroShadow = 'shadow-yellow-200 ring-4 ring-yellow-100';
        } else if (roleType === 'COWARD') {
            heroBorder = 'border-stone-400 border-dashed';
            heroBg = 'bg-stone-200';
            heroShadow = 'shadow-none grayscale';
        }
    }

    return (
      <div className="relative flex flex-col items-center transition-all duration-500 z-20">
        <div className={`
          relative w-56 h-56 rounded-full border-8 flex items-center justify-center transition-all duration-300
          ${heroBorder} ${heroBg} ${heroShadow}
        `}>
           <div className="absolute inset-1 rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.1)] pointer-events-none z-20"></div>

           <div className="absolute inset-4 rounded-full overflow-hidden">
             {visibleFood.length > 0 ? visibleFood.map((item, i) => (
               <div 
                 key={item.id}
                 className="absolute drop-shadow-md transition-all select-none"
                 style={{
                    left: `${item.offsetX}%`,
                    top: `${item.offsetY}%`,
                    transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale * 1.4})`, 
                    zIndex: i,
                    fontSize: '3rem'
                 }}
               >
                 {item.icon}
               </div>
             )) : (
               <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <span className="text-stone-300 text-xs font-bold">
                    空盘等待...
                 </span>
               </div>
             )}
           </div>

           {/* User Name Tag for Hero */}
           <div className="absolute -bottom-8 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-md border border-stone-100 flex items-center gap-1">
             {player.isImageAvatar ? (
               <img src={player.avatar} alt="avatar" className="w-4 h-4 rounded-full object-cover" />
             ) : (
               <span className="text-xs">{player.avatar}</span>
             )}
             <span className="text-xs font-bold text-stone-700">{player.name}</span>
           </div>
           
           {/* V4.0 Autopilot/Dormant Badge (Hero) */}
           {(isAuto || isDormant) && !isDead && (
              <div className="absolute -top-2 left-0 bg-stone-800 text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-lg z-30 animate-pulse">
                {isDormant ? <Moon size={12} className="text-blue-300"/> : <ZapOff size={12} className="text-yellow-400"/>}
                <span className="text-[10px] font-bold">{isDormant ? '沉睡中' : '托管中'}</span>
              </div>
           )}

           {isRevealed && player.currentBid && (
              <div className="absolute -top-4 -right-4 bg-orange-500 text-white font-black text-2xl w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white animate-bounce z-50">
                {player.currentBid}
              </div>
           )}

            {/* End Game Role Badge (Hero) */}
            {isRevealed && roleType !== 'NORMAL' && (
                <div className={`
                    absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full shadow-lg z-50 whitespace-nowrap border-2 font-black flex items-center gap-1
                    ${roleType === 'CRIMINAL' ? 'bg-red-600 text-white border-white animate-pulse' : ''}
                    ${roleType === 'GOURMET' ? 'bg-yellow-400 text-yellow-900 border-white' : ''}
                    ${roleType === 'COWARD' ? 'bg-stone-400 text-white border-stone-200' : ''}
                `}>
                    {roleType === 'CRIMINAL' && <><Flame size={12} fill="currentColor"/> 饭醉分子</>}
                    {roleType === 'GOURMET' && <><Crown size={12} fill="currentColor"/> 顶级老饕</>}
                    {roleType === 'COWARD' && <><Leaf size={12} fill="currentColor"/> 小鸟胃</>}
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- WAITING / COMPACT VARIANT ---
  const sizeClass = variant === 'waiting' ? 'w-20 h-20 text-3xl' : 'w-12 h-12 text-xl';
  const containerClass = variant === 'waiting' ? 'w-24 mx-2 mb-2' : 'w-16 mx-1';
  
  // Compact Style Mapping
  let compactBorder = isEditable ? 'border-orange-300 ring-4 ring-orange-100' : 'border-stone-200';
  let compactBg = 'bg-white';
  
  if (isRevealed && variant !== 'waiting') {
      if (roleType === 'CRIMINAL') {
          compactBorder = 'border-red-500 ring-2 ring-red-200';
          compactBg = 'bg-red-50';
      } else if (roleType === 'GOURMET') {
          compactBorder = 'border-yellow-400 ring-2 ring-yellow-200';
          compactBg = 'bg-yellow-50';
      } else if (roleType === 'COWARD') {
          compactBorder = 'border-stone-300 border-dashed';
          compactBg = 'bg-stone-200 opacity-60';
      }
  } else if (isDead && variant !== 'waiting') {
      // Fallback for dead state if not fully revealed yet? usually concurrent
      compactBg = 'bg-stone-300';
  }

  return (
    <div className={`
      flex flex-col items-center justify-center flex-shrink-0 transition-all duration-300 relative group
      ${containerClass}
    `}>
      {/* Avatar Circle */}
      <div 
        onClick={isEditable ? onEditProfile : undefined}
        className={`
        relative ${sizeClass} rounded-full border-2 flex items-center justify-center shadow-sm mb-1 overflow-visible transition-colors duration-300
        ${compactBorder} ${compactBg}
        ${isEditable ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
      `}>
         {player.isImageAvatar ? (
            <img src={player.avatar} alt="avatar" className={`w-full h-full rounded-full object-cover ${roleType === 'COWARD' && isRevealed ? 'grayscale' : ''}`} />
         ) : (
            <span className={roleType === 'COWARD' && isRevealed ? 'grayscale' : ''}>
              {player.avatar}
            </span>
         )}
         
         {/* Edit Badge */}
         {isEditable && (
            <div className="absolute -top-1 -right-1 bg-[#78C753] text-white p-1.5 rounded-full shadow-md z-20">
              <Pencil size={12} />
            </div>
         )}
         
         {/* Kick Button */}
         {canKick && onKick && (
            <button 
                onClick={(e) => { e.stopPropagation(); onKick(); }}
                className="absolute -top-1 -right-1 bg-black text-white p-1.5 rounded-full shadow-md z-50 hover:scale-110 active:scale-90 transition-transform cursor-pointer"
            >
                <X size={12} strokeWidth={3} />
            </button>
         )}
         
         {/* V4.0 Autopilot Indicator (Small) */}
         {(isAuto || isDormant) && !isDead && (
            <div className="absolute -top-2 -right-2 bg-stone-800 text-white p-1 rounded-full z-20 border border-white">
                {isDormant ? <Moon size={10} className="text-blue-300"/> : <ZapOff size={10} className="text-yellow-400"/>}
            </div>
         )}
         
         {/* Bid Bubble */}
         {isRevealed && player.currentBid && (
            <div className={`
                absolute -bottom-2 -right-2 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white z-10
                ${roleType === 'CRIMINAL' ? 'bg-red-600 text-white' : 'bg-stone-800 text-white'}
                ${roleType === 'GOURMET' ? 'bg-yellow-500 text-white' : ''}
            `}>
              {player.currentBid}
            </div>
         )}
         
         {/* ROLE STAMP OVERLAY (Compact) */}
         {isRevealed && variant !== 'waiting' && roleType !== 'NORMAL' && (
             <div className={`
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max max-w-[150%] text-center font-black shadow-sm pointer-events-none border-2 rounded px-1 whitespace-nowrap z-50
                ${roleType === 'CRIMINAL' ? 'bg-red-600 text-white border-white text-[8px] sm:text-[10px]' : ''}
                ${roleType === 'GOURMET' ? 'bg-yellow-400 text-yellow-900 border-white text-[8px] sm:text-[10px]' : ''}
                ${roleType === 'COWARD' ? 'bg-stone-500 text-stone-200 border-stone-300 text-[8px]' : ''}
             `}>
                 {roleType === 'CRIMINAL' && '饭醉分子'}
                 {roleType === 'GOURMET' && '顶级老饕'}
                 {roleType === 'COWARD' && '小鸟胃'}
             </div>
         )}
      </div>

      <span className="text-[10px] sm:text-xs text-stone-500 font-bold truncate max-w-full leading-tight">
        {player.name}
      </span>
      
      {variant !== 'waiting' && (
        <span className={`text-[10px] font-black leading-tight ${roleType === 'CRIMINAL' ? 'text-red-500' : 'text-stone-800'}`}>
            ¥{Math.floor(player.stash)}
        </span>
      )}
    </div>
  );
};
