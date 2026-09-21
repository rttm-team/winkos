import React, { useState } from 'react';
import { 
  Users, 
  Trophy, 
  ArrowRightLeft, 
  Dice5, 
  ShieldCheck,
  Calendar,
  Sparkles,
  History
} from 'lucide-react';
import ActiveSquadManager from './ActiveSquadManager';
import { SeasonsLanding } from './SeasonsLanding';
import WaiverWirePortal from './WaiverWirePortal';
import WinkosChallenges from './WinkosChallenges';
import SeasonTransactionsFeed from './SeasonTransactionsFeed';

interface SeasonHubProps {
  gms: any[];
  theme: 'light' | 'dark';
  authedGm: any;
  defaultTab?: 'roster' | 'standings' | 'waivers' | 'challenges' | 'transactions';
}

export const SeasonHub: React.FC<SeasonHubProps> = ({
  gms,
  theme,
  authedGm,
  defaultTab = 'roster',
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'roster' | 'standings' | 'waivers' | 'challenges' | 'transactions'>(defaultTab);

  const activeGmName = authedGm?.name || gms[0]?.name || 'Adam';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Season Hub Header Bar with Tabs */}
      <div className={`border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                  2026-27 Active Season
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Season Hub
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Manage your active roster, track pool standings, claim waivers, and view the transaction log.
              </p>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'roster'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Active Roster</span>
            </button>

            <button
              onClick={() => setActiveTab('standings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'standings'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Pool Standings</span>
            </button>

            <button
              onClick={() => setActiveTab('waivers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'waivers'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span>Waiver Wire</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Transactions</span>
            </button>

            <button
              onClick={() => setActiveTab('challenges')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'challenges'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Dice5 className="h-4 w-4" />
              <span>Challenges</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {activeTab === 'roster' && (
          <div className="animate-in fade-in duration-300">
            <ActiveSquadManager
              initialGm={activeGmName}
              theme={theme}
              onNavigateBack={() => {}}
            />
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="animate-in fade-in duration-300">
            <SeasonsLanding
              theme={theme}
              gms={gms}
              onManageTeam={() => setActiveTab('roster')}
            />
          </div>
        )}

        {activeTab === 'waivers' && (
          <div className="animate-in fade-in duration-300">
            <WaiverWirePortal
              gms={gms}
              theme={theme}
              initialGm={activeGmName}
              onNavigateBack={() => {}}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="animate-in fade-in duration-300">
            <SeasonTransactionsFeed
              gms={gms}
              theme={theme}
              seasonId="2026-2027"
              onNavigateToWaivers={() => setActiveTab('waivers')}
            />
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="animate-in fade-in duration-300">
            <WinkosChallenges
              gmName={activeGmName}
              theme={theme}
            />
          </div>
        )}
      </div>
    </div>
  );
};
