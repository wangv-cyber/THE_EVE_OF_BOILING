
import React from 'react';
import { X } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      {/* Receipt Container */}
      <div 
        className="relative w-full max-w-[320px] transform rotate-1 transition-transform hover:rotate-0 duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the receipt
      >
        {/* Paper Body */}
        <div className="w-full bg-[#fffcf5] shadow-2xl p-6 pb-8 text-stone-800 font-mono text-xs relative">
           {/* Top Tape */}
           <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-200/50 backdrop-blur-sm -rotate-2 shadow-sm z-10"></div>
           
           {/* Close Button */}
           <button onClick={onClose} className="absolute top-2 right-2 p-2 text-stone-400 hover:text-red-500 transition-colors z-20">
              <X size={20} />
           </button>

           {/* Header */}
           <div className="flex flex-col items-center border-b-2 border-dashed border-stone-300 pb-4 mb-4 mt-2">
             <div className="text-3xl mb-2">📜</div>
             <div className="font-black text-xl tracking-widest text-stone-800">用餐须知</div>
             <div className="text-[10px] text-stone-400 font-bold uppercase">HOUSE RULES</div>
           </div>

           {/* Content List */}
           <div className="flex flex-col gap-3 text-sm leading-relaxed text-stone-600 font-bold">
              <div className="flex gap-2 items-start">
                 <span className="bg-stone-800 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">1</span>
                 <p>所有玩家<span className="text-orange-600">长按菜盘</span>，松手向锅中加菜 (1-20)。</p>
              </div>
              <div className="flex gap-2 items-start">
                 <span className="bg-stone-800 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">2</span>
                 <p>每局锅都不一样大，<span className="text-red-600">加菜太多</span>(锅放不下)时，本轮炸锅，游戏结束。</p>
              </div>
              
              <div className="border-t border-dashed border-stone-200 my-1"></div>

              <div className="flex gap-2 items-start">
                 <span className="bg-stone-800 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">3</span>
                 <div>
                    <span className="bg-red-100 text-red-600 px-1 rounded mr-1">饭醉分子</span>
                    那个加最大一盘菜的朋友(当轮出价最高)，标记为<span className="text-red-600 font-black">饭醉分子</span>，负责<span className="underline decoration-wavy decoration-red-400">买单</span>(本局积分清空)。
                 </div>
              </div>

              <div className="flex gap-2 items-start">
                 <span className="bg-stone-800 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">4</span>
                 <div>
                    <span className="bg-green-100 text-green-600 px-1 rounded mr-1">顶级老饕</span>
                    其余玩家标记为<span className="text-green-600 font-black">顶级老饕</span>，带走本局累计积分，并<span className="text-orange-500">瓜分买单者的积分</span>。加菜越多，分的越多。
                 </div>
              </div>

              <div className="flex gap-2 items-start">
                 <span className="bg-stone-800 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs mt-0.5">5</span>
                 <div>
                    <span className="bg-stone-200 text-stone-500 px-1 rounded mr-1">小鸟胃</span>
                    想试图苟活？在炸锅轮出价最低的人，标记为<span className="text-stone-400 font-black">小鸟胃</span>，<span className="text-stone-400 border-b border-stone-300">本局不得分</span>。
                 </div>
              </div>
           </div>

           {/* Footer Quote */}
           <div className="mt-6 pt-4 border-t-2 border-stone-800 text-center">
              <p className="font-calligraphy text-lg text-stone-700 leading-relaxed">
                "你是想猛猛添菜大赚一笔，还是小心翼翼地试探？"
              </p>
              
              <div className="mt-4 opacity-30">
                <div className="h-4 w-full bg-repeat-x" style={{ backgroundImage: 'linear-gradient(90deg, #000 50%, transparent 50%)', backgroundSize: '4px 100%' }}></div>
                <div className="text-[10px] text-center mt-1 text-stone-400">GOOD LUCK & HAVE FUN</div>
              </div>
           </div>

        </div>

        {/* Jagged Bottom Edge */}
        <div 
          className="w-full h-4 relative -mt-[1px]"
          style={{
              background: `
                  linear-gradient(135deg, #fffcf5 50%, transparent 50%) 0 0,
                  linear-gradient(45deg, #fffcf5 50%, transparent 50%) 0 0
              `,
              backgroundSize: '12px 12px',
              backgroundRepeat: 'repeat-x'
          }}
        ></div>
      </div>
    </div>
  );
};
