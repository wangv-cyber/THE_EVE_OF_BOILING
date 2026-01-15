
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player } from './types';
import { generateFoodItem } from './constants';
import { Pot } from './components/Pot';
import { Controls } from './components/Controls';
import { PlayerCard } from './components/PlayerCard';
import { Receipt } from './components/Receipt';
import { RoomPanel } from './components/RoomPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { LobbyTitle } from './components/LobbyDecor';
import { RulesModal } from './components/RulesModal';
import { RefreshCw, ChefHat, Flame, Loader2, Plus, Clock, Trophy, ChevronUp, Bug, UserCog, LogOut, ShieldAlert } from 'lucide-react';
import { platformVibrate, callCloudFunction, platformAlert } from './utils/platform';

// Flying Food Component (Internal)
const FlyingFood = ({ startX, startY, icon, delay }: { startX: string, startY: string, icon: string, delay: number }) => {
  const [pos, setPos] = useState({ left: startX, top: startY, opacity: 1, scale: 1 });
  
  useEffect(() => {
    // Fly to Center (50%, 40%)
    const timer = setTimeout(() => {
        setPos({ left: '50%', top: '35%', opacity: 0, scale: 0.5 });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className="fixed text-4xl pointer-events-none transition-all duration-700 ease-in-out z-50"
      style={{ left: pos.left, top: pos.top, opacity: pos.opacity, transform: `scale(${pos.scale}) translate(-50%, -50%)` }}
    >
      {icon}
    </div>
  );
};

// --- V7.0 GOD MODE DEBUGGER COMPONENT ---
const GodModePanel = ({ 
    gameState, 
    setGameState, 
    onClose 
}: { 
    gameState: GameState, 
    setGameState: (s: GameState) => void,
    onClose: () => void 
}) => {
    const toggleRole = () => {
        setGameState({ ...gameState, isHost: !gameState.isHost });
        platformVibrate('light');
    };

    const simJoinAsGuest = async () => {
        const newState = await callCloudFunction('joinRoom', {});
        setGameState(newState);
        onClose();
    };

    const simPassiveDisband = async () => {
        // Simulate receiving a "Room Disbanded" push event
        platformAlert('系统通知', '房主解散了房间');
        const lobbyState = await callCloudFunction('disbandRoom', {});
        setGameState(lobbyState);
        onClose();
    };

    const simPassiveKick = async () => {
         // Simulate receiving a "You Kicked" push event
         platformAlert('系统通知', '你被房主移出了房间');
         const lobbyState = await callCloudFunction('disbandRoom', {});
         setGameState(lobbyState);
         onClose();
    };

    return (
        <div className="fixed top-16 left-4 z-[100] bg-stone-900/90 backdrop-blur text-white p-4 rounded-2xl shadow-2xl border border-white/20 animate-float w-48">
            <h3 className="text-xs font-black text-stone-400 mb-3 uppercase flex items-center gap-2">
                <Bug size={12}/> 上帝模式 (Debug)
            </h3>
            <div className="flex flex-col gap-2">
                <button onClick={toggleRole} className="text-xs font-bold bg-stone-700 hover:bg-stone-600 py-2 rounded px-2 flex items-center justify-between transition-colors">
                    <span>身份: {gameState.isHost ? '房主' : '路人'}</span>
                    <UserCog size={12}/>
                </button>
                <div className="h-[1px] bg-white/10 my-1"></div>
                <button onClick={simJoinAsGuest} className="text-xs font-bold bg-blue-900/50 hover:bg-blue-800 py-2 rounded px-2 text-left transition-colors">
                    模拟: 路人加入
                </button>
                <button onClick={simPassiveKick} className="text-xs font-bold bg-red-900/50 hover:bg-red-800 py-2 rounded px-2 text-left flex items-center justify-between transition-colors">
                    模拟: 被踢出 <LogOut size={12}/>
                </button>
                <button onClick={simPassiveDisband} className="text-xs font-bold bg-orange-900/50 hover:bg-orange-800 py-2 rounded px-2 text-left flex items-center justify-between transition-colors">
                    模拟: 房间解散 <ShieldAlert size={12}/>
                </button>
            </div>
            <button onClick={onClose} className="mt-3 text-[10px] text-center w-full text-stone-500 py-2">关闭菜单</button>
        </div>
    );
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'LOBBY',
    systemLimit: 0,
    visibleRange: [0, 0],
    currentLoad: 0,
    round: 1,
    players: [],
    logs: [],
    potFood: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [flyingItems, setFlyingItems] = useState<{id: string, startX: string, startY: string, icon: string, delay: number}[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isRoomPanelOpen, setIsRoomPanelOpen] = useState(true);
  const [showRules, setShowRules] = useState(false);
  
  // V7.0 Debug State
  const [showDebug, setShowDebug] = useState(false);

  const userPlayer = gameState.players.find(p => p.id === 'user');

  useEffect(() => {
    if (gameState.phase === 'WAITING') {
      setIsRoomPanelOpen(true);
    }
  }, [gameState.phase]);

  // --- V4.0 Passive Autopilot Timer Logic ---
  useEffect(() => {
    if (gameState.phase !== 'PLAYING' || isLoading) {
        setTimeLeft(null);
        return;
    }

    const isDormant = userPlayer?.isDormant || false;
    const initialDuration = isDormant ? 2 : 20;
    
    setTimeLeft(initialDuration);

    const interval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev === null) return null;
            if (prev <= 1) {
                clearInterval(interval);
                handleUserBid(null);
                return 0;
            }
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.phase, gameState.round, isLoading, userPlayer?.isDormant]);


  // --- CLOUD ACTIONS ---

  const createRoom = async () => {
    if (isLoading) return;
    setIsLoading(true);
    platformVibrate('light');
    try {
      const waitingState = await callCloudFunction('createRoom', {});
      setGameState(waitingState);
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const startGame = async () => {
    if (isLoading) return;
    setIsLoading(true);
    platformVibrate('heavy');
    try {
      const playingState = await callCloudFunction('startGame', { gameState });
      setGameState(playingState);
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const handleUpdateProfile = async (name?: string, avatar?: string) => {
    const newState = await callCloudFunction('updateProfile', { gameState, name, avatar });
    setGameState(newState);
  };

  // V6.0 Disband Room (Host Active Action)
  // FIXED: Removed window.confirm to prevent blocking issues in preview
  const handleDisbandRoom = async () => {
    console.log("Triggering Disband Room...");
    setIsLoading(true);
    try {
        const lobbyState = await callCloudFunction('disbandRoom', {});
        console.log("Disband Success, setting state:", lobbyState);
        setGameState(lobbyState);
        platformAlert('提示', '房间已解散');
    } catch(e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  // V6.0 Kick Player (Host Active Action)
  // FIXED: Removed window.confirm, added console logs
  const handleKickPlayer = async (targetId: string) => {
    console.log("Triggering Kick Player:", targetId);
    try {
        const newState = await callCloudFunction('kickPlayer', { gameState, targetId });
        console.log("Kick Success, new players count:", newState.players.length);
        setGameState(newState);
        platformVibrate('heavy');
    } catch(e) { console.error(e); }
  };

  const handleUserBid = async (val: number | null) => {
    if (gameState.phase !== 'PLAYING') return;
    if (val !== null && isLoading) return; 
    
    setIsLoading(true); 
    setTimeLeft(null); 
    
    const newFlyingItems: any[] = [];
    const displayVal = val === null ? 1 : val; 

    const addFlyers = (count: number, startX: string, startY: string, baseDelay: number) => {
      const visualCount = Math.min(count, 4);
      for(let i=0; i<visualCount; i++) {
        const item = generateFoodItem();
        newFlyingItems.push({
          id: Math.random().toString(),
          startX, startY, icon: item.icon, delay: baseDelay + (i * 80)
        });
      }
    };
    
    addFlyers(displayVal, '50%', '85%', 0);
    setFlyingItems(prev => [...prev, ...newFlyingItems]);

    try {
        const { nextState, roundBids } = await callCloudFunction('settleRound', { 
            gameState, 
            userBid: val 
        });

        const botFlyingItems: any[] = [];
        nextState.players.forEach((p: Player, idx: number) => {
            if (p.isBot && p.status === 'alive') {
                const botBid = roundBids[p.id] || 0;
                const randomX = `${10 + Math.random() * 80}%`;
                const visualCount = Math.min(botBid, 4);
                for(let i=0; i<visualCount; i++) {
                    const item = generateFoodItem();
                    botFlyingItems.push({
                        id: Math.random().toString(),
                        startX: randomX, startY: '15%', icon: item.icon, delay: 200 + idx * 50 + (i * 80)
                    });
                }
            }
        });
        setFlyingItems(prev => [...prev, ...botFlyingItems]);

        setGameState(prev => ({
            ...prev,
            phase: 'REVEAL',
            players: prev.players.map(p => ({
                ...p,
                currentBid: roundBids[p.id] || null
            }))
        }));

        setTimeout(() => {
            setGameState(nextState);
            setFlyingItems([]);
            setIsLoading(false);
            platformVibrate(nextState.phase === 'GAME_OVER' ? 'heavy' : 'light');
        }, 2000);

    } catch (e) {
        console.error("Cloud Error", e);
        setIsLoading(false);
    }
  };

  const opponents = gameState.players.filter(p => p.id !== 'user');
  const isPlayingOrOver = gameState.phase === 'PLAYING' || gameState.phase === 'REVEAL' || gameState.phase === 'GAME_OVER';
  const isLobbyOrWaiting = gameState.phase === 'LOBBY' || gameState.phase === 'WAITING';

  return (
    <div 
      className="h-[100dvh] w-full flex flex-col font-sans max-w-lg mx-auto relative overflow-hidden bg-tablecloth selection:bg-orange-200"
    >
      {/* 0. DEBUG TRIGGER - High Contrast Style */}
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="fixed top-4 left-4 z-[90] bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 active:scale-90 transition-all border-2 border-white"
        title="打开调试菜单"
      >
        <Bug size={20} />
      </button>

      {/* 0.1 RULES TRIGGER - Receipt Style Stub (Rotated -90deg) */}
      <button
        onClick={() => { setShowRules(true); platformVibrate('light'); }}
        className="fixed top-24 right-0 z-[60] origin-bottom-right rotate-[-90deg] hover:translate-y-[-4px] transition-transform duration-300"
        title="游戏说明"
      >
        <div className="bg-[#fffcf5] shadow-[-4px_4px_10px_rgba(0,0,0,0.1)] border-t border-x border-stone-200 px-3 py-2 pb-4 flex flex-col items-center gap-1 rounded-t-md relative">
             {/* Tape */}
             <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-yellow-200/90 backdrop-blur-[1px] rotate-1 shadow-sm"></div>
             
             {/* Text */}
             <div className="flex flex-col items-center leading-none mt-1.5">
                <span className="font-black text-stone-800 text-xs whitespace-nowrap">用餐须知</span>
                <span className="font-bold text-stone-400 text-[8px] tracking-wider scale-90 mt-0.5">HOUSE RULES</span>
             </div>
             
             {/* Dashed line at bottom to imply cut-off */}
             <div className="absolute bottom-1 left-2 right-2 border-b-2 border-dashed border-stone-300 opacity-50"></div>
        </div>
      </button>

      {showDebug && (
        <GodModePanel 
            gameState={gameState} 
            setGameState={setGameState} 
            onClose={() => setShowDebug(false)} 
        />
      )}

      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}

      {/* 0. Flying Animation Layer */}
      {flyingItems.map(item => (
        <FlyingFood key={item.id} {...item} />
      ))}

      {/* 0.5. Lobby Title */}
      {(gameState.phase === 'LOBBY' || gameState.phase === 'WAITING') && (
        <LobbyTitle />
      )}

      {/* 0.8. Background Table Items (Safe Zone: 60%-80% Height) - BELOW POT (z-0) */}
      {/* STRICTLY CONDITIONAL: Only rendered in LOBBY or WAITING phases to prevent overlap during gameplay */}
      {isLobbyOrWaiting && (
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden animate-fade-in">
          {/* Left: Sauce Dishes */}
          <div className="absolute top-[62%] left-2 sm:left-6 flex flex-col gap-2 transform rotate-12 scale-110 sm:scale-125 origin-left opacity-100 transition-all duration-500">
             {/* Dish 1: Garlic/Sesame */}
             <div className="w-16 h-16 bg-[#fafaf9] rounded-full shadow-md border border-white flex items-center justify-center">
                 <div className="w-12 h-12 bg-[#e4c9a3] rounded-full shadow-inner flex items-center justify-center">
                    <span className="text-xs opacity-60 grayscale">🧄</span>
                 </div>
             </div>
             {/* Dish 2: Chili Oil */}
             <div className="w-16 h-16 bg-[#fafaf9] rounded-full shadow-md border border-white flex items-center justify-center translate-x-8 -translate-y-3">
                 <div className="w-12 h-12 bg-[#b91c1c] rounded-full shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="absolute top-2 left-2 w-4 h-1.5 bg-white/20 rounded-full rotate-45"></div>
                 </div>
             </div>
          </div>

          {/* Right: Empty Plate */}
          <div className="absolute top-[58%] -right-2 sm:right-2 transform -rotate-6 scale-100 sm:scale-110 origin-right opacity-100 transition-all duration-500">
             <div className="w-48 h-48 bg-white rounded-full shadow-xl border-4 border-[#f5f5f4] flex items-center justify-center relative">
                 <div className="w-32 h-32 rounded-full border border-stone-100 shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] bg-[#fafaf9]"></div>
                 {/* Reflection */}
                 <div className="absolute top-8 right-12 w-16 h-8 bg-white rounded-full opacity-70 rotate-[-30deg] blur-[2px]"></div>
             </div>
          </div>
      </div>
      )}

      {/* 1. TOP RAIL */}
      {isPlayingOrOver && (
      <div className="flex-none h-20 pt-2 px-2 z-20 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
         <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md rounded-full pl-2 pr-3 py-1 shadow-sm border border-orange-100 z-50 flex items-center gap-1.5 transition-all pointer-events-auto">
             <div className="bg-orange-100 p-1 rounded-full">
                <ChefHat size={12} className="text-orange-500"/>
             </div>
             <span className="text-[10px] text-stone-600 font-extrabold tracking-wide">
                {gameState.visibleRange[0]} ~ {gameState.visibleRange[1]}
             </span>
         </div>
         <div className="flex overflow-x-auto no-scrollbar w-full items-start pt-3 pb-2 px-2 gap-1 snap-x pointer-events-auto">
            {opponents.length > 0 && opponents.map(p => (
              <PlayerCard 
                  key={p.id} 
                  player={p} 
                  isRevealed={gameState.phase === 'REVEAL' || gameState.phase === 'GAME_OVER'} 
                  isGameOver={gameState.phase === 'GAME_OVER'}
                  variant="compact" 
              />
            ))}
         </div>
      </div>
      )}

      {/* 2. MIDDLE POT */}
      <div className={`flex-1 min-h-0 w-full flex items-center justify-center relative z-10 transition-transform duration-500
          ${(gameState.phase === 'LOBBY' || gameState.phase === 'WAITING') ? '-translate-y-24 scale-125' : ''}
          ${isPlayingOrOver ? 'translate-y-4 sm:translate-y-0' : ''}
      `}>
        <div className="relative w-[min(70vw,18rem)] aspect-square z-10">
            <Pot 
              currentLoad={gameState.currentLoad} 
              limitMin={gameState.visibleRange[0]}
              limitMax={gameState.visibleRange[1]}
              isShaking={gameState.currentLoad > (gameState.visibleRange[0] * 0.8)}
              phase={gameState.phase}
              foodItems={gameState.potFood}
            />
        </div>
      </div>

      {/* 3. BOTTOM LAYOUT */}
      
      {/* A. LOBBY */}
      {gameState.phase === 'LOBBY' && (
          <div className="absolute bottom-12 left-0 right-0 z-50 flex items-stretch gap-4 px-8 animate-float">
             {/* Left: Leaderboard */}
             <button 
                onClick={() => { setShowLeaderboard(true); platformVibrate('light'); }}
                className="flex-none w-20 bg-white/90 backdrop-blur text-stone-600 rounded-2xl shadow-xl clay-btn border-2 border-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
             >
                <Trophy size={24} style={{ color: '#F7B718' }} className="drop-shadow-sm" /> 
                <span className="text-[10px] font-black">排行榜</span>
             </button>
             
             {/* Right: Create Room -> Now "约饭" */}
             <button 
                onClick={createRoom}
                className="flex-1 bg-gradient-to-br from-[#78C753] to-[#3ca059] text-white text-xl font-black py-5 rounded-2xl shadow-xl clay-btn flex items-center justify-center gap-2 active:scale-95 transition-transform"
             >
                {isLoading ? <Loader2 className="animate-spin" /> : '约饭'}
             </button>
          </div>
      )}

      {/* B. WAITING ROOM */}
      {gameState.phase === 'WAITING' && (
        <>
            {!isRoomPanelOpen && (
                 <div className="absolute bottom-12 left-0 right-0 z-40 flex flex-col items-center gap-4 animate-float">
                    {/* Return to Room Button */}
                    <button 
                        onClick={() => setIsRoomPanelOpen(true)}
                        className="bg-stone-800 text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 hover:scale-105 transition-transform border-2 border-white/20"
                    >
                        <ChevronUp size={24} /> 
                        <span className="text-lg">返回房间</span>
                        <span className="bg-orange-500 text-xs px-2 py-1 rounded-full">{gameState.players.length}人</span>
                    </button>

                    {/* Leaderboard Button - Visible when Minimized */}
                    <button 
                        onClick={() => { setShowLeaderboard(true); platformVibrate('light'); }}
                        className="bg-white/80 backdrop-blur text-stone-600 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-white shadow-sm transition-all"
                    >
                        <Trophy size={16} style={{ color: '#F7B718' }} /> 排行榜
                    </button>
                 </div>
            )}
            
            {isRoomPanelOpen && (
                 <RoomPanel 
                    gameState={gameState} 
                    onStart={startGame} 
                    onUpdateProfile={handleUpdateProfile}
                    onClose={() => setIsRoomPanelOpen(false)}
                    onDisband={handleDisbandRoom}
                    onKick={handleKickPlayer}
                 />
            )}
        </>
      )}

      {/* C. GAME CONTROLS */}
      {isPlayingOrOver && (
      <div className="flex-none w-full h-[360px] relative z-30 pointer-events-none">
          <div className="absolute bottom-28 left-4 z-20 pointer-events-auto origin-bottom-left transition-transform hover:scale-105 hover:rotate-0 -rotate-3 scale-90 sm:scale-100">
             {userPlayer && <Receipt player={userPlayer} />}
          </div>

          <div className="absolute bottom-28 right-4 sm:right-6 z-10 pointer-events-none transition-transform duration-300 scale-90 sm:scale-100">
              {userPlayer && 
                <PlayerCard 
                    player={userPlayer} 
                    isRevealed={gameState.phase === 'REVEAL' || gameState.phase === 'GAME_OVER'} 
                    isGameOver={gameState.phase === 'GAME_OVER'}
                    variant="hero" 
                />
              }
          </div>

          {timeLeft !== null && !isLoading && (
              <div className="absolute bottom-[280px] right-8 z-40 pointer-events-none animate-float">
                  <div className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border-2 border-white
                      ${timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-stone-600'}
                  `}>
                      <Clock size={14} className={timeLeft <= 5 ? 'animate-spin' : ''} />
                      <span className="text-sm font-black tabular-nums">{timeLeft}s</span>
                      <span className="text-[10px] font-bold opacity-80">托管</span>
                  </div>
              </div>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full pointer-events-auto">
               {gameState.phase === 'GAME_OVER' && (
                 <button 
                     onClick={(e) => { e.stopPropagation(); createRoom(); }}
                     className="w-48 bg-stone-800 text-white font-black py-4 rounded-2xl clay-btn flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-transform"
                   >
                     {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />} 
                     {isLoading ? '准备中...' : '再来一把'}
                   </button>
               )}

               {gameState.phase === 'PLAYING' && (
                   <Controls onBid={handleUserBid} disabled={isLoading} />
               )}
               
               {gameState.phase === 'REVEAL' && (
                   <div className="w-32 bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white text-center flex items-center justify-center">
                       <div className="text-orange-500 font-black text-sm animate-pulse flex items-center justify-center gap-1">
                         <Flame size={16} /> 下菜中
                       </div>
                   </div>
               )}
          </div>
      </div>
      )}

      {showLeaderboard && (
          <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />
      )}

    </div>
  );
};

export default App;
