
import React, { useState, useRef } from 'react';
import { GameState, Player } from '../types';
import { PlayerCard } from './PlayerCard';
import { Share2, Play, Copy, Users, X, Check, Trash2, Lock, LogOut } from 'lucide-react';
import { platformAlert, platformVibrate, callCloudFunction } from '../utils/platform';
import { ROOM_CONFIG } from '../constants';

interface RoomPanelProps {
  gameState: GameState;
  onStart: () => void;
  onUpdateProfile: (name?: string, avatar?: string) => void;
  onClose: () => void; // Minimize
  onDisband: () => void; // Delete Room
  onKick: (id: string) => void; // Kick Player
  onLeave: () => void; // NEW: Leave Room (Guest)
}

export const RoomPanel: React.FC<RoomPanelProps> = ({ gameState, onStart, onUpdateProfile, onClose, onDisband, onKick, onLeave }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [tempName, setTempName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const players = gameState.players;
  const user = players.find(p => p.id === 'user');
  const isHost = gameState.isHost;
  
  // Rule Check: Can we start?
  const canStart = players.length >= ROOM_CONFIG.MIN_PLAYERS;

  const handleShare = () => {
    platformVibrate('light');
    // In WeChat, this would open share menu. In Web, we mock it.
    platformAlert('邀请好友', `转发给好友或群聊:\n\n【沸腾之夜】房间号: ${gameState.roomCode}\n邀你一起吃火锅！`);
  };

  const openEdit = () => {
    if (user) {
        setTempName(user.name);
        setShowEdit(true);
        platformVibrate('light');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create local preview URL (Simulating Cloud File ID)
      const url = URL.createObjectURL(file);
      onUpdateProfile(undefined, url);
      platformVibrate('heavy');
    }
  };

  const saveName = () => {
    if (tempName.trim()) {
        onUpdateProfile(tempName.trim(), undefined);
        setShowEdit(false);
        platformVibrate('light');
    }
  };

  return (
    <>
    {/* 1. Backdrop (Click to Minimize/Close) */}
    <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
    ></div>

    {/* 2. The Drawer Panel */}
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-t-[2.5rem] p-6 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-out border-t border-white/50 animate-float-up">
      
      {/* Drawer Handle */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-stone-200 rounded-full"></div>

      {/* Room Header Info */}
      <div className="flex justify-between items-start mb-6 mt-2">
        <div>
          <h2 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            房间 {gameState.roomCode}
          </h2>
          <p className="text-stone-400 text-xs font-bold mt-1 flex items-center gap-1">
            <Users size={12}/> {players.length} / {ROOM_CONFIG.MAX_PLAYERS} 人入座
          </p>
        </div>
        
        <button 
          onClick={handleShare}
          className="bg-[#78C753] text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:brightness-110 transition-colors shadow-sm"
        >
          <Share2 size={16} /> 邀请
        </button>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-y-4 justify-items-center mb-28 max-h-[40vh] overflow-y-auto p-1 custom-scrollbar">
         {players.map(p => (
           <PlayerCard 
             key={p.id} 
             player={p} 
             isRevealed={true} 
             variant="waiting" 
             onEditProfile={openEdit}
             canKick={isHost && p.id !== 'user'} // Only host can kick others
             onKick={() => onKick(p.id)}
           />
         ))}
         {/* Empty Seats Visuals */}
         {Array.from({ length: Math.max(0, ROOM_CONFIG.MAX_PLAYERS - players.length) }).map((_, i) => (
             <div key={`empty-${i}`} className="w-20 h-20 rounded-full border-2 border-stone-100 border-dashed flex items-center justify-center opacity-50">
                <div className="w-16 h-16 rounded-full bg-stone-50"></div>
             </div>
         ))}
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
        {/* Disband (Host) or Leave (Guest) Button */}
        <div className="flex justify-center mb-3">
            {isHost ? (
                 <button 
                    onClick={onDisband}
                    className="text-stone-400 text-xs font-bold flex items-center gap-1 hover:text-red-500 transition-colors px-2 py-1 rounded"
                 >
                    <Trash2 size={12} /> 解散房间
                 </button>
            ) : (
                 <button 
                    onClick={onLeave}
                    className="text-stone-400 text-xs font-bold flex items-center gap-1 hover:text-red-500 transition-colors px-2 py-1 rounded"
                 >
                    <LogOut size={12} /> 离开房间
                 </button>
            )}
        </div>

        {/* Start Button */}
        {gameState.isHost ? (
            <button 
                onClick={canStart ? onStart : undefined}
                disabled={!canStart}
                className={`
                    w-full text-xl font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all
                    ${canStart 
                        ? 'bg-stone-800 text-white clay-btn' 
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'}
                `}
            >
                {canStart ? (
                    <>
                      <Play fill="currentColor" /> 开涮!
                    </>
                ) : (
                    <>
                       <Users size={20} className="opacity-50"/> 
                       <span className="text-lg">还差 {ROOM_CONFIG.MIN_PLAYERS - players.length} 人</span>
                    </>
                )}
            </button>
        ) : (
            <div className="w-full bg-stone-100 text-stone-400 text-lg font-bold py-4 rounded-2xl text-center flex items-center justify-center gap-2">
               <span className="animate-pulse">⏳</span> 等待房主开始...
            </div>
        )}
      </div>
    </div>

    {/* EDIT PROFILE MODAL */}
    {showEdit && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:w-80 sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl animate-float">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-lg text-stone-800">修改资料</h3>
                    <button onClick={() => setShowEdit(false)} className="p-2 bg-stone-100 rounded-full"><X size={16}/></button>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-4">
                        <div 
                           onClick={() => fileInputRef.current?.click()}
                           className="w-20 h-20 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center cursor-pointer relative overflow-hidden group"
                        >
                             {user?.isImageAvatar ? (
                                 <img src={user.avatar} className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-3xl">{user?.avatar}</span>
                             )}
                             <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">修改</div>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-stone-700 mb-1">更换头像</p>
                            <p className="text-xs text-stone-400">点击左侧圆形，选择微信头像上传。</p>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleAvatarUpload} 
                            className="hidden" 
                            accept="image/*"
                        />
                    </div>

                    {/* Name Section */}
                    <div>
                        <label className="text-xs font-bold text-stone-400 mb-2 block uppercase">昵称</label>
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={tempName} 
                              onChange={(e) => setTempName(e.target.value)}
                              className="flex-1 bg-stone-100 rounded-xl px-4 py-3 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-orange-200"
                              placeholder="输入新昵称"
                              maxLength={ROOM_CONFIG.MAX_NAME_LENGTH}
                           />
                           <button onClick={saveName} className="bg-stone-800 text-white rounded-xl px-4 flex items-center justify-center">
                              <Check />
                           </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};
