
import React, { useState, useEffect, useRef } from 'react';
import { GameMode, GameState, Player } from './types';
import { generateFoodItem } from './constants';
import { Pot } from './components/Pot';
import { Controls } from './components/Controls';
import { PlayerCard } from './components/PlayerCard';
import { Receipt } from './components/Receipt';
import { RoomPanel } from './components/RoomPanel';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { LobbyTitle } from './components/LobbyDecor';
import { RulesModal } from './components/RulesModal';
import { RefreshCw, ChefHat, Flame, Loader2, Plus, Clock, Trophy, ChevronUp, UserCog, LogOut, ShieldAlert, Swords, User } from 'lucide-react';
import { platformVibrate, callCloudFunction, platformAlert } from './utils/platform';
import { gameAdapter } from './services/gameAdapter';

// --- Flying Food Component ---
const FlyingFood = ({ startX, startY, icon, delay }: { startX: string, startY: string, icon: string, delay: number }) => {
  const [pos, setPos] = useState({ left: startX, top: startY, opacity: 1, scale: 1 });

  useEffect(() => {
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

// --- MODE SELECTION COMPONENT ---
const ModeSelection = ({ onSelect }: { onSelect: (mode: GameMode, code?: string) => void }) => {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  return (
    <div className="fixed inset-0 z-[80] bg-tablecloth flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="font-calligraphy text-6xl text-red-700 drop-shadow-md mb-2">沸腾之夜</h1>
          <span className="bg-stone-800 text-white text-xs px-3 py-1 rounded-full tracking-[0.3em] font-bold">THE BOILING NIGHT</span>
        </div>

        {/* Solo Button */}
        <button
          onClick={() => onSelect('SOLO')}
          className="group relative bg-white p-6 rounded-3xl shadow-xl border-4 border-stone-100 flex items-center gap-4 transition-transform active:scale-95 hover:border-orange-200"
        >
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
            🧑‍🍳
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-xl font-black text-stone-800">单机演练</h3>
            <p className="text-xs text-stone-400 font-bold mt-1">Solo Mode • AI陪玩 • 即刻开局</p>
          </div>
          <User className="text-stone-300" />
        </button>

        {/* Online Button & Input */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-xl border-4 border-stone-100 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl shadow-inner">
              🌏
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-xl font-black text-stone-800">联机对战</h3>
              <p className="text-xs text-stone-400 font-bold mt-1">Online Mode • 真实玩家 • 需房间号</p>
            </div>
            <Swords className="text-stone-300" />
          </div>

          <div className="mt-2 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="输入房间号 (选填)"
              className="flex-1 bg-stone-100 rounded-xl px-4 py-3 font-bold text-stone-700 outline-none focus:ring-2 focus:ring-blue-200 uppercase tracking-widest text-center"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              onClick={() => onSelect('ONLINE', code)}
              className="bg-stone-800 text-white font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform whitespace-nowrap sm:min-w-[80px]"
            >
              {code ? '加入' : '创建'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>(null);

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
  const [flyingItems, setFlyingItems] = useState<{ id: string, startX: string, startY: string, icon: string, delay: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isRoomPanelOpen, setIsRoomPanelOpen] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const userPlayer = gameState.players.find(p => p.id === 'user');

  useEffect(() => {
    if (gameState.phase === 'WAITING') {
      setIsRoomPanelOpen(true);
    }
  }, [gameState.phase]);

  // --- Real-time Subscription ---
  useEffect(() => {
    if (gameMode) {
      const handler = (newState: GameState) => {
        // Prevent state flicker if we are waiting for a settle animation
        // But generally we want to sync.
        // If phase is 'GAME_OVER' in newState but we are 'REVEAL', we might want to wait?
        // For now, direct sync is safest for multiplayer consistency.
        setGameState(newState);

        // Note: We no longer auto-reset gameMode on LOBBY phase. 
        // The LOBBY phase is now a valid "Room Disbanded" screen where user can exit.
      };

      gameAdapter.getService().onGameStateChange(handler);

      return () => {
        gameAdapter.getService().offGameStateChange(handler);
      };
    }
  }, [gameMode]);

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

  const handleModeSelect = async (mode: GameMode, roomCode?: string) => {
    setIsLoading(true);
    setGameMode(mode);
    // Initialize Adapter
    gameAdapter.setMode(mode || 'SOLO');

    try {
      let waitingState: GameState;
      if (mode === 'ONLINE' && roomCode) {
        waitingState = await callCloudFunction('joinRoom', { roomCode });
      } else {
        waitingState = await callCloudFunction('createRoom', {});
      }
      setGameState(waitingState);
    } catch (e) {
      console.error(e);
      platformAlert('Error', '无法连接或房间不存在');
      setGameMode(null); // Reset
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    // Only available when room is disbanded (LOBBY phase), so no need for confirm check usually.
    // But safety check just in case.
    if (gameState.phase === 'PLAYING' || gameState.phase === 'WAITING') {
      const confirm = window.confirm('确定要返回首页吗？当前房间/游戏进度将丢失。');
      if (!confirm) return;
    }

    // Reset everything
    setGameMode(null);
    setGameState({
      phase: 'LOBBY',
      systemLimit: 0,
      visibleRange: [0, 0],
      currentLoad: 0,
      round: 1,
      players: [],
      logs: [],
      potFood: [],
    });
    setIsLoading(false);
    platformVibrate('light');
  };

  const createRoom = async () => {
    // If inside game, "Create Room" usually means "Restart/New Game"
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

  const handleDisbandRoom = async () => {
    setIsLoading(true);
    try {
      const lobbyState = await callCloudFunction('disbandRoom', { gameState });
      setGameState(lobbyState);
      platformAlert('提示', '房间已解散');
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleLeaveRoom = async () => {
    setIsLoading(true);
    try {
      const lobbyState = await callCloudFunction('leaveRoom', { gameState });
      setGameState(lobbyState);
      platformAlert('提示', '你已离开房间');
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleKickPlayer = async (targetId: string) => {
    try {
      const newState = await callCloudFunction('kickPlayer', { gameState, targetId });
      setGameState(newState);
      platformVibrate('heavy');
    } catch (e) { console.error(e); }
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
      for (let i = 0; i < visualCount; i++) {
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
      if (gameMode === 'ONLINE') {
        // Online mode: just submit bid, server will broadcast state update
        await callCloudFunction('settleRound', {
          gameState,
          userBid: val
        });
        // Don't manipulate state - let real-time subscription handle it
        setIsLoading(false);
      } else {
        // Solo mode: handle locally with animations
        const { nextState, roundBids } = await callCloudFunction('settleRound', {
          gameState,
          userBid: val
        });

        // Trigger bot animations
        const botFlyingItems: any[] = [];
        nextState.players.forEach((p: Player, idx: number) => {
          if (p.id !== 'user' && p.status === 'alive') {
            const botBid = roundBids[p.id] || 0;
            if (botBid > 0) {
              const randomX = `${10 + Math.random() * 80}%`;
              const visualCount = Math.min(botBid, 4);
              for (let i = 0; i < visualCount; i++) {
                const item = generateFoodItem();
                botFlyingItems.push({
                  id: Math.random().toString(),
                  startX: randomX, startY: '15%', icon: item.icon, delay: 200 + idx * 50 + (i * 80)
                });
              }
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
      }
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
      {/* --- 0. MODE SELECTION --- */}
      {!gameMode && <ModeSelection onSelect={handleModeSelect} />}

      {/* --- 0.1 EXIT BUTTON --- */}
      {/* Show ONLY if gameMode is selected AND we are back in LOBBY phase (Disbanded/Left) */}
      {gameMode && gameState.phase === 'LOBBY' && (
        <button
          onClick={handleBackToHome}
          className="fixed top-6 left-6 z-[60] bg-white/80 backdrop-blur text-stone-600 p-3 rounded-full shadow-md border border-stone-100 hover:scale-110 active:scale-95 transition-all hover:bg-red-50 hover:text-red-500 animate-fade-in"
          title="返回首页"
        >
          <LogOut size={20} />
        </button>
      )}

      {/* --- 0.2 RULES (No Debug) --- */}
      <button
        onClick={() => { setShowRules(true); platformVibrate('light'); }}
        className="fixed top-24 right-0 z-[60] origin-bottom-right rotate-[-90deg] hover:translate-y-[-4px] transition-transform duration-300"
        title="游戏说明"
      >
        <div className="bg-[#fffcf5] shadow-[-4px_4px_10px_rgba(0,0,0,0.1)] border-t border-x border-stone-200 px-3 py-2 pb-4 flex flex-col items-center gap-1 rounded-t-md relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-yellow-200/90 backdrop-blur-[1px] rotate-1 shadow-sm"></div>
          <div className="flex flex-col items-center leading-none mt-1.5">
            <span className="font-black text-stone-800 text-xs whitespace-nowrap">用餐须知</span>
            <span className="font-bold text-stone-400 text-[8px] tracking-wider scale-90 mt-0.5">HOUSE RULES</span>
          </div>
          <div className="absolute bottom-1 left-2 right-2 border-b-2 border-dashed border-stone-300 opacity-50"></div>
        </div>
      </button>

      {/* --- MODALS --- */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* --- LAYERS --- */}
      {flyingItems.map(item => (
        <FlyingFood key={item.id} {...item} />
      ))}

      {(gameState.phase === 'LOBBY' || gameState.phase === 'WAITING') && (
        <LobbyTitle />
      )}

      {/* Background Decor */}
      {isLobbyOrWaiting && (
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden animate-fade-in">
          <div className="absolute top-[62%] left-2 sm:left-6 flex flex-col gap-2 transform rotate-12 scale-110 sm:scale-125 origin-left opacity-100 transition-all duration-500">
            <div className="w-16 h-16 bg-[#fafaf9] rounded-full shadow-md border border-white flex items-center justify-center">
              <div className="w-12 h-12 bg-[#e4c9a3] rounded-full shadow-inner flex items-center justify-center">
                <span className="text-xs opacity-60 grayscale">🧄</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-[#fafaf9] rounded-full shadow-md border border-white flex items-center justify-center translate-x-8 -translate-y-3">
              <div className="w-12 h-12 bg-[#b91c1c] rounded-full shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="absolute top-2 left-2 w-4 h-1.5 bg-white/20 rounded-full rotate-45"></div>
              </div>
            </div>
          </div>
          <div className="absolute top-[58%] -right-2 sm:right-2 transform -rotate-6 scale-100 sm:scale-110 origin-right opacity-100 transition-all duration-500">
            <div className="w-48 h-48 bg-white rounded-full shadow-xl border-4 border-[#f5f5f4] flex items-center justify-center relative">
              <div className="w-32 h-32 rounded-full border border-stone-100 shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)] bg-[#fafaf9]"></div>
              <div className="absolute top-8 right-12 w-16 h-8 bg-white rounded-full opacity-70 rotate-[-30deg] blur-[2px]"></div>
            </div>
          </div>
        </div>
      )}

      {/* Top Players Rail */}
      {isPlayingOrOver && (
        <div className="flex-none h-20 pt-2 px-2 z-20 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
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

      {/* Main Pot */}
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

      {/* --- UI PANELS --- */}

      {/* 1. LOBBY (Disbanded / Left) */}
      {gameState.phase === 'LOBBY' && gameMode && (
        <div className="absolute bottom-12 left-0 right-0 z-50 flex items-stretch gap-4 px-8 animate-float">
          <button
            onClick={() => { setShowLeaderboard(true); platformVibrate('light'); }}
            className="flex-none w-20 bg-white/90 backdrop-blur text-stone-600 rounded-2xl shadow-xl clay-btn border-2 border-white flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
          >
            <Trophy size={24} style={{ color: '#F7B718' }} className="drop-shadow-sm" />
            <span className="text-[10px] font-black">排行榜</span>
          </button>

          <button
            onClick={createRoom}
            className="flex-1 bg-gradient-to-br from-[#78C753] to-[#3ca059] text-white text-xl font-black py-5 rounded-2xl shadow-xl clay-btn flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : '开始游戏'}
          </button>
        </div>
      )}

      {/* 2. WAITING */}
      {gameState.phase === 'WAITING' && (
        <>
          {!isRoomPanelOpen && (
            <div className="absolute bottom-12 left-0 right-0 z-40 flex flex-col items-center gap-4 animate-float">
              <button
                onClick={() => setIsRoomPanelOpen(true)}
                className="bg-stone-800 text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-3 hover:scale-105 transition-transform border-2 border-white/20"
              >
                <ChevronUp size={24} />
                <span className="text-lg">返回房间</span>
                <span className="bg-orange-500 text-xs px-2 py-1 rounded-full">{gameState.players.length}人</span>
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
              onLeave={handleLeaveRoom}
            />
          )}
        </>
      )}

      {/* 3. PLAYING */}
      {isPlayingOrOver && (
        <div className="flex-none w-full h-[360px] relative z-30 pointer-events-none">

          {/* System Limit Bubble - Positioned directly below pot, centered */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md rounded-full pl-2 pr-3 py-1 shadow-sm border border-orange-100 z-40 flex items-center gap-1.5 transition-all pointer-events-auto animate-float">
            <div className="bg-orange-100 p-1 rounded-full">
              <ChefHat size={12} className="text-orange-500" />
            </div>
            <span className={`text-[10px] font-extrabold tracking-wide ${gameState.phase === 'GAME_OVER' ? 'text-red-600' : 'text-stone-600'
              }`}>
              {gameState.phase === 'GAME_OVER'
                ? gameState.systemLimit
                : `${gameState.visibleRange[0]} ~ ${gameState.visibleRange[1]}`
              }
            </span>
          </div>

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
