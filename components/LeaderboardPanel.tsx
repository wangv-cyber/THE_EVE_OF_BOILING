
import React, { useEffect, useState } from 'react';
import { callCloudFunction, platformVibrate } from '../utils/platform';
import { formatCurrency } from '../utils/levelSystem';
import { X, Trophy, Skull, Crown, ChefHat, Loader2 } from 'lucide-react';

interface DB_User {
  _openid: string;
  nickName: string;
  avatarUrl: string;
  stats: {
    totalBounty: number;
    scapegoatCount: number;
    title: string;
  };
}

interface LeaderboardPanelProps {
  onClose: () => void;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'GREED' | 'WANTED'>('GREED');
  const [data, setData] = useState<DB_User[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [me, setMe] = useState<DB_User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await callCloudFunction('getLeaderboard', { type: activeTab });
        setData(res.list);
        setMyRank(res.myRank);
        setMe(res.myData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  const handleTabChange = (tab: 'GREED' | 'WANTED') => {
    if (tab !== activeTab) {
      platformVibrate('light');
      setActiveTab(tab);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm h-[80vh] bg-white shadow-2xl flex flex-col animate-float"
           style={{
             clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', // Base rect
             backgroundImage: 'linear-gradient(#f8f8f8 2px, transparent 2px)',
             backgroundSize: '100% 40px'
           }}>
        
        {/* === HEADER: TAPE & TABS === */}
        <div className="flex-none relative z-10 bg-white border-b-2 border-dashed border-stone-300 pb-2">
           {/* Tape visual */}
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-yellow-200/80 rotate-1 shadow-sm backdrop-blur-sm"></div>
           
           <div className="flex justify-between items-center p-4 pt-6">
              <h2 className="font-black text-2xl uppercase tracking-widest text-stone-800 flex items-center gap-2">
                {activeTab === 'GREED' ? '贪婪之塔' : '通缉名单'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={24} className="text-stone-500" />
              </button>
           </div>

           {/* Tabs */}
           <div className="flex px-4 gap-2">
              <button 
                onClick={() => handleTabChange('GREED')}
                className={`flex-1 py-2 font-black text-xs flex items-center justify-center gap-1 border-2 transition-all
                  ${activeTab === 'GREED' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200 hover:border-stone-400'}
                `}
              >
                <Trophy size={14} /> 财富榜
              </button>
              <button 
                onClick={() => handleTabChange('WANTED')}
                className={`flex-1 py-2 font-black text-xs flex items-center justify-center gap-1 border-2 transition-all
                  ${activeTab === 'WANTED' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-400 border-stone-200 hover:border-stone-400'}
                `}
              >
                <Skull size={14} /> 炸锅榜
              </button>
           </div>
           
           {/* Column Headers */}
           <div className="flex px-4 mt-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
             <span className="w-8 text-center">#</span>
             <span className="flex-1 pl-2">PLAYER</span>
             <span className="w-24 text-right">
                {activeTab === 'GREED' ? 'BOUNTY' : 'BUSTED'}
             </span>
           </div>
        </div>

        {/* === SCROLLABLE LIST === */}
        <div className="flex-1 overflow-y-auto font-mono relative">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center text-stone-300">
               <Loader2 className="animate-spin" size={32} />
             </div>
           ) : (
             <div className="p-2 pb-24">
               {data.map((user, idx) => {
                 const rank = idx + 1;
                 const isTop3 = rank <= 3;
                 
                 return (
                   <div key={user._openid} className={`
                      flex items-center py-3 px-2 mb-1 border-b border-stone-100 text-stone-700
                      ${user._openid === 'user_me' ? 'bg-yellow-50 ring-1 ring-yellow-200' : ''}
                   `}>
                     {/* Rank */}
                     <div className={`w-8 text-center font-black text-lg ${isTop3 ? 'text-orange-500' : 'text-stone-400'}`}>
                        {rank}
                     </div>

                     {/* Avatar & Info */}
                     <div className="flex-1 flex items-center gap-3 pl-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-lg border border-stone-200 shadow-sm shrink-0">
                          {user.avatarUrl}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate">{user.nickName}</span>
                          <span className="text-[10px] text-stone-400 truncate flex items-center gap-1">
                             {activeTab === 'GREED' && <ChefHat size={10}/>}
                             {user.stats.title}
                          </span>
                        </div>
                     </div>

                     {/* Stat Value */}
                     <div className="w-24 text-right font-black text-sm">
                        {activeTab === 'GREED' 
                           ? <span className="text-stone-800">{formatCurrency(user.stats.totalBounty)}</span>
                           : <span className="text-red-500">{user.stats.scapegoatCount} <span className="text-[10px] text-red-300">次</span></span>
                        }
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
        </div>

        {/* === FOOTER: MY RANK (STICKY) === */}
        {me && !loading && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-stone-800 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
             <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">MY RANKING</span>
                <span className="text-[10px] font-bold text-stone-400">NO. {myRank > 100 ? '100+' : myRank}</span>
             </div>
             
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-stone-800 flex items-center justify-center text-xl shrink-0">
                   {me.avatarUrl}
                 </div>
                 <div className="flex-1">
                    <div className="text-sm font-black text-stone-800 flex items-center gap-1">
                       {me.nickName}
                       <span className="bg-stone-800 text-white text-[9px] px-1.5 rounded ml-1">{me.stats.title}</span>
                    </div>
                    <div className="text-xs text-stone-500">
                        {activeTab === 'GREED' 
                          ? `累计赏金: ${formatCurrency(me.stats.totalBounty)}`
                          : `炸锅次数: ${me.stats.scapegoatCount} 次`
                        }
                    </div>
                 </div>
                 <div className="text-2xl font-black text-stone-800 opacity-20">
                    <Crown />
                 </div>
             </div>
          </div>
        )}

        {/* Jagged Bottom Edge */}
        <div 
          className="absolute -bottom-3 left-0 right-0 h-3"
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
    </div>
  );
};
