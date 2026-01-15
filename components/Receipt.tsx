import React from 'react';
import { Player } from '../types';
import { Ticket, Skull } from 'lucide-react';

interface ReceiptProps {
  player: Player;
}

export const Receipt: React.FC<ReceiptProps> = ({ player }) => {
  const isDead = player.status === 'dead';
  const isCoward = player.isCoward;

  return (
    <div className="relative w-full max-w-[140px] transform -rotate-2 origin-bottom-left transition-transform hover:rotate-0 duration-300">
      {/* Paper Body */}
      <div className={`
        w-full bg-white shadow-lg p-4 pb-8 text-stone-800 font-mono text-xs relative
        ${isDead ? 'grayscale opacity-80' : ''}
      `}>
        {/* Top Tape Effect */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-yellow-200/50 backdrop-blur-sm rotate-1 shadow-sm"></div>

        {/* Header */}
        <div className="flex flex-col items-center border-b-2 border-dashed border-stone-300 pb-3 mb-3">
          <div className="text-2xl mb-1">{player.avatar}</div>
          <div className="font-black text-sm uppercase tracking-widest text-stone-400">TABLE 01</div>
          <div className="font-bold text-base">{player.name}</div>
        </div>

        {/* Items */}
        <div className="flex justify-between items-end mb-1 text-stone-500">
          <span>STATUS</span>
          <span className="font-bold text-right">
            {isDead ? (isCoward ? "BIRD APPETITE" : "CRIMINAL") : "ACTIVE"}
          </span>
        </div>
        
        <div className="flex justify-between items-end mb-4 text-stone-500">
          <span>ROUND</span>
          <span className="font-bold text-right">--</span>
        </div>

        {/* Total */}
        <div className="border-t-2 border-stone-800 pt-2 flex justify-between items-end">
          <span className="font-black text-lg">TTL</span>
          <div className="text-right">
             <span className="text-xs text-stone-400 mr-1">¥</span>
             <span className="text-2xl font-black leading-none">{Math.floor(player.stash)}</span>
          </div>
        </div>
        
        {/* Footer Barcode decoration */}
        <div className="mt-4 opacity-30">
            <div className="h-4 w-full bg-repeat-x" style={{ backgroundImage: 'linear-gradient(90deg, #000 50%, transparent 50%)', backgroundSize: '4px 100%' }}></div>
            <div className="text-[8px] text-center mt-1 text-stone-400">THANK YOU FOR DINING</div>
        </div>

        {/* Stamp for Death */}
        {isDead && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 font-black text-xl p-2 rotate-12 opacity-80 rounded mix-blend-multiply pointer-events-none whitespace-nowrap">
                {isCoward ? 'PETITE' : 'GUILTY'}
            </div>
        )}

      </div>

      {/* Jagged Bottom Edge (Sawtooth CSS) */}
      <div 
        className="w-full h-3 relative -mt-[1px]"
        style={{
            background: `
                linear-gradient(135deg, white 50%, transparent 50%) 0 0,
                linear-gradient(45deg, white 50%, transparent 50%) 0 0
            `,
            backgroundSize: '10px 10px',
            backgroundRepeat: 'repeat-x'
        }}
      ></div>
    </div>
  );
};