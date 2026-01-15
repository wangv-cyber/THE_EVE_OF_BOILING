
import React, { useState, useRef, useEffect } from 'react';
import { INPUT_RANGE, FOOD_LIBRARY } from '../constants';
import { platformVibrate } from '../utils/platform';
import { X, CornerRightDown, ChevronsUp } from 'lucide-react';

interface ControlsProps {
  onBid: (value: number) => void;
  disabled: boolean;
}

type InteractionState = 'IDLE' | 'CHARGING' | 'REDUCING' | 'CANCELING';

export const Controls: React.FC<ControlsProps> = ({ onBid, disabled }) => {
  const [value, setValue] = useState<number>(1);
  const [status, setStatus] = useState<InteractionState>('IDLE');
  
  // Refs
  const timerRef = useRef<any>(null);
  const startPos = useRef<{x: number, y: number} | null>(null);
  const valueRef = useRef<number>(1);
  const statusRef = useRef<InteractionState>('IDLE'); // Logical source of truth
  
  // Cleanup
  useEffect(() => {
    return () => stopTimer();
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // --- Helper: Synchronous Status Update ---
  // Critical fix: Update ref IMMEDIATELY so endInteraction sees it instantly,
  // avoiding the race condition where setStatus is too slow during a fast swipe.
  const updateStatus = (newStatus: InteractionState) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  };

  // --- Core Logic ---

  const startInteraction = (clientX: number, clientY: number) => {
    if (disabled) return;
    
    startPos.current = { x: clientX, y: clientY };
    
    setValue(1);
    valueRef.current = 1;
    updateStatus('CHARGING');
    platformVibrate('light');

    // Start logic loop
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      tickLogic();
    }, 100); 
  };

  const moveInteraction = (clientX: number, clientY: number) => {
    if (!startPos.current || disabled || statusRef.current === 'IDLE') return;
    
    const diffX = clientX - startPos.current.x;
    const diffY = clientY - startPos.current.y;

    // Adjusted Thresholds for easier triggering
    const CANCEL_THRESHOLD_X = 40; // Reduced from 60
    const REDUCE_THRESHOLD_Y = 30; // Reduced from 40

    // 1. Check Horizontal Cancel (Side Swipe)
    if (Math.abs(diffX) > CANCEL_THRESHOLD_X) {
      if (statusRef.current !== 'CANCELING') {
        updateStatus('CANCELING');
        platformVibrate('heavy');
      }
      return;
    }

    // 2. Check Vertical Rewind (Swipe Down)
    if (diffY > REDUCE_THRESHOLD_Y) {
      // Dragging Down
      if (statusRef.current !== 'REDUCING' && statusRef.current !== 'CANCELING') {
        updateStatus('REDUCING');
        platformVibrate('light');
      }
    } else {
      // Returned Up
      if (statusRef.current === 'REDUCING') {
        updateStatus('CHARGING');
        platformVibrate('light');
      }
    }
  };

  const endInteraction = () => {
    stopTimer();
    startPos.current = null;

    // Read synchronously from Ref to get the true latest status
    const finalStatus = statusRef.current;

    // Always reset to IDLE for UI
    updateStatus('IDLE');
    setValue(1); // Reset display value visual

    if (finalStatus === 'CANCELING') {
      // Do nothing, just cancel
      return;
    }

    if (finalStatus !== 'IDLE' && !disabled) {
      // Submit Bid
      platformVibrate('heavy');
      onBid(valueRef.current);
    }
    
    valueRef.current = 1;
  };

  const tickLogic = () => {
    const currentStatus = statusRef.current;
    
    if (currentStatus === 'CANCELING') return;

    if (currentStatus === 'CHARGING') {
      if (valueRef.current < INPUT_RANGE.max) {
        valueRef.current += 1;
        setValue(valueRef.current);
        platformVibrate('light');
      } else {
        // Max reached feedback
        if (valueRef.current === INPUT_RANGE.max) platformVibrate('heavy');
      }
    } else if (currentStatus === 'REDUCING') {
      if (valueRef.current > 1) {
        valueRef.current -= 1;
        setValue(valueRef.current);
        platformVibrate('light');
      }
    }
  };

  // --- Pointer Events (Modern Standard) ---
  // Pointer events unify Mouse and Touch and support 'setPointerCapture' 
  // which allows dragging OUTSIDE the element without losing the event stream.

  const handlePointerDown = (e: React.PointerEvent) => {
    // Implicitly captures pointer in React/Modern browsers, but explicit is safer
    e.currentTarget.setPointerCapture(e.pointerId);
    startInteraction(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    moveInteraction(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Release happens automatically usually, but good practice
    e.currentTarget.releasePointerCapture(e.pointerId);
    endInteraction();
  };
  
  const handlePointerCancel = (e: React.PointerEvent) => {
     e.currentTarget.releasePointerCapture(e.pointerId);
     endInteraction();
  };

  // --- Visual Helpers ---
  const isInteracting = status !== 'IDLE';
  const previewIcons = FOOD_LIBRARY.slice(0, Math.min(value, 5)); 

  return (
    <div className="w-full max-w-xs mx-auto z-40 relative flex flex-col items-center">
      
      {/* 1. The Interaction Bubble */}
      {isInteracting && (
        <div 
          className={`
            absolute -top-32 left-1/2 -translate-x-1/2 
            w-32 h-32 rounded-full flex flex-col items-center justify-center
            transition-all duration-200 z-50 pointer-events-none select-none
            ${status === 'CANCELING' ? 'bg-stone-200/90 scale-90 grayscale' : 'bg-white shadow-2xl scale-110'}
            ${status === 'REDUCING' ? 'border-4 border-yellow-400' : ''}
            ${value > INPUT_RANGE.warnMax ? 'shadow-red-200 animate-[shake_0.2s_infinite]' : ''}
          `}
        >
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 transform origin-center"></div>

          {status === 'CANCELING' ? (
             <>
               <X size={48} className="text-stone-400" />
               <span className="text-xs font-bold text-stone-500 mt-1">已取消</span>
             </>
          ) : (
             <>
               <div className="flex flex-wrap justify-center items-center gap-1 w-20 h-12 overflow-hidden content-center">
                  {previewIcons.map((icon, i) => (
                    <span key={i} className="text-2xl leading-none animate-[float_3s_ease-in-out_infinite]">{icon}</span>
                  ))}
                  {value > 5 && <span className="text-xs font-black text-stone-400">+{value - 5}</span>}
               </div>
               
               <div className={`text-4xl font-black ${value > INPUT_RANGE.warnMax ? 'text-red-500' : 'text-stone-800'}`}>
                 {value}
               </div>
               
               <div className="absolute -bottom-8 bg-stone-800 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                 {status === 'REDUCING' ? (
                   <><CornerRightDown size={10}/> 松手下菜</>
                 ) : (
                   <><ChevronsUp size={10}/> 长按加量</>
                 )}
               </div>
             </>
          )}
        </div>
      )}

      {/* 2. The Trigger Button */}
      <button
        // Use Pointer Events for unified Mouse/Touch + Capture support
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerUp} // Backup if capture fails
        
        disabled={disabled}
        className={`
          relative w-24 h-24 rounded-full shadow-xl transition-all duration-100 ease-out select-none touch-none cursor-pointer
          flex flex-col items-center justify-center gap-1 border-4
          ${disabled ? 'bg-stone-200 border-stone-300 opacity-50 cursor-not-allowed' : 'bg-gradient-to-br from-orange-100 to-white border-white active:scale-90 active:bg-orange-200'}
          ${isInteracting && status !== 'CANCELING' ? 'scale-90 border-orange-300 ring-4 ring-orange-100' : ''}
        `}
        style={{ touchAction: 'none' }} // Prevents browser scroll/zoom
      >
        {disabled ? (
          <span className="text-2xl">⏳</span>
        ) : (
          <>
            <span className="text-4xl">🥢</span>
            <span className="text-[10px] font-bold text-stone-500">
               {isInteracting ? '松手下' : '涮菜'}
            </span>
          </>
        )}
        
        {!isInteracting && !disabled && (
           <div className="absolute -top-10 text-stone-400 text-[10px] animate-bounce pointer-events-none">
             按住我!
           </div>
        )}
      </button>

      {/* 3. Interaction Hints */}
      <div className={`
         absolute top-4 w-64 flex justify-between pointer-events-none transition-opacity duration-300
         ${isInteracting ? 'opacity-100' : 'opacity-0'}
      `}>
          <div className={`flex items-center gap-1 text-xs font-bold ${status==='CANCELING' ? 'text-red-500 scale-110' : 'text-stone-400'}`}>
             <X size={14}/> 侧滑取消
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold ${status==='REDUCING' ? 'text-yellow-600 scale-110' : 'text-stone-400'}`}>
             下滑减少 <CornerRightDown size={14}/>
          </div>
      </div>

    </div>
  );
};
