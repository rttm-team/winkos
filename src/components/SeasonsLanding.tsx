import React, { useState } from 'react';
import { 
  Trophy, 
  Users, 
  ArrowRight, 
  Crown,
  LayoutDashboard,
  Calendar,
  ChevronRight,
  TrendingUp,
  History,
  Info,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ActiveRosterStatsTable from './ActiveRosterStatsTable';

interface SeasonsLandingProps {
  theme: 'light' | 'dark';
  gms: any[];
  onManageTeam: () => void;
}

const SEASONS = [
  {
    id: '2026-27',
    label: '2026-27 Season',
    status: 'Active',
    startDate: 'Oct 2026',
    endDate: 'Jun 2027',
    description: 'The current active fantasy hockey season. Compete for the Winko Cup!',
    isCurrent: true,
  },
  {
    id: '2025-26',
    label: '2025-26 Season',
    status: 'Archived',
    startDate: 'Oct 2025',
    endDate: 'Jun 2026',
    description: 'Historical data and final standings for the previous season.',
    isCurrent: false,
  }
];

export const SeasonsLanding: React.FC<SeasonsLandingProps> = ({
  theme,
  gms,
  onManageTeam,
}) => {
  const isLight = theme === 'light';
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [viewingRosterGm, setViewingRosterGm] = useState<string | null>(null);

  if (viewingRosterGm) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <ActiveRosterStatsTable
          selectedGm={viewingRosterGm}
          theme={theme}
          availableGms={gms.map(g => g.name)}
          onSelectGm={(gm) => setViewingRosterGm(gm)}
          onNavigateBack={() => setViewingRosterGm(null)}
        />
      </div>
    );
  }

  const getLeaderboardForSeason = (seasonId: string) => {
    if (seasonId === '2026-27') {
      // 2026-27 is 0 for now as requested
      return gms.map(gm => ({
        id: gm.id,
        name: gm.name,
        teamName: gm.teamName,
        total_fantasy_points: 0,
        goals: 0,
        assists: 0,
        wins: 0,
      }));
    }

    // Mock data for archived season 2025-26
    return gms.map((gm, idx) => ({
      id: gm.id,
      name: gm.name,
      teamName: gm.teamName,
      total_fantasy_points: 1240 - (idx * 42),
      goals: 182 - (idx * 12),
      assists: 310 - (idx * 24),
      wins: 24 - (idx % 3),
    })).sort((a, b) => b.total_fantasy_points - a.total_fantasy_points);
  };

  const currentLeaderboard = selectedSeasonId ? getLeaderboardForSeason(selectedSeasonId) : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!selectedSeasonId ? (
        <>
          {/* Standard Header Style */}
          <section className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}>
            <div>
              <h1 className={`text-4xl sm:text-5xl font-black tracking-tight flex items-center gap-3 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <span>Explore the Seasons</span>
              </h1>
              <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Track standings, manage your roster, and view historical performance across Winko's Hockey Pool seasons.
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SEASONS.map((season) => (
            <motion.div
              key={season.id}
              whileHover={{ y: -4 }}
              className={`group relative overflow-hidden rounded-2xl border transition-all cursor-pointer ${
                isLight 
                  ? 'bg-white border-slate-200 hover:border-cyan-300 hover:shadow-xl shadow-sm' 
                  : 'bg-slate-900 border-slate-800 hover:border-cyan-500/50 hover:shadow-2xl shadow-lg'
              }`}
              onClick={() => setSelectedSeasonId(season.id)}
            >
              {season.isCurrent && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Active
                  </span>
                </div>
              )}

              <div className="p-8">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${
                  isLight ? 'bg-slate-100 text-slate-600 group-hover:bg-cyan-50 group-hover:text-cyan-600' : 'bg-slate-800 text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-400'
                }`}>
                  {season.isCurrent ? <Calendar className="h-6 w-6" /> : <History className="h-6 w-6" />}
                </div>
                
                <h3 className={`text-2xl font-black mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {season.label}
                </h3>
                <p className={`text-sm mb-6 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {season.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Duration</span>
                    <span className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {season.startDate} - {season.endDate}
                    </span>
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border transition-all ${
                    isLight ? 'border-slate-200 text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900' : 'border-slate-700 text-slate-500 group-hover:bg-white group-hover:text-slate-950 group-hover:border-white'
                  }`}>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </>
    ) : (
        <div className="space-y-6">
          {/* Standard Header Style for Individual Season */}
          <section className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setSelectedSeasonId(null)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Seasons
                </button>
                {SEASONS.find(s => s.id === selectedSeasonId)?.isCurrent && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
              <h1 className={`text-4xl sm:text-5xl font-black tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {SEASONS.find(s => s.id === selectedSeasonId)?.label}
              </h1>
              <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {SEASONS.find(s => s.id === selectedSeasonId)?.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onManageTeam}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <LayoutDashboard className="h-4 w-4" />
                Manage My Team
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Leaderboard Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className={`rounded-3xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} overflow-hidden`}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Season Leaderboard
                      </h2>
                      <p className="text-xs text-slate-500">Overall fantasy points ranking</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 text-slate-500' : 'bg-slate-800/50 text-slate-400'}`}>
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">General Manager</th>
                        <th className="px-6 py-4 text-right">Points</th>
                        <th className="px-6 py-4 text-right">W-G-A</th>
                        <th className="px-6 py-4 text-right">Roster</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentLeaderboard.map((gm, idx) => (
                        <tr 
                          key={gm.id} 
                          onClick={() => setViewingRosterGm(gm.name)}
                          className={`group transition-colors cursor-pointer ${isLight ? 'hover:bg-slate-100/80' : 'hover:bg-slate-800/50'}`}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              {idx === 0 ? (
                                <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                                  <Crown className="h-4 w-4" />
                                </div>
                              ) : (
                                <span className={`text-sm font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                  #{idx + 1}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <div className={`text-sm font-black group-hover:text-cyan-500 transition-colors ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {gm.teamName}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Users className="h-3 w-3" />
                                {gm.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-base font-black text-cyan-500">
                              {gm.total_fantasy_points.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 block">FP</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className={`text-xs font-mono font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              {gm.wins}W • {gm.goals}G • {gm.assists}A
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right" onClick={(e) => { e.stopPropagation(); setViewingRosterGm(gm.name); }}>
                            <button
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isLight
                                  ? 'bg-slate-100 text-slate-700 hover:bg-cyan-600 hover:text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-cyan-500 hover:text-slate-950'
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Roster
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Stats Summary Sidebar */}
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-lg'}`}>
                <h3 className={`text-sm font-black uppercase tracking-wider mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Season Stats
                </h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-slate-800/50'}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">League Avg</span>
                    </div>
                    <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {Math.round(currentLeaderboard.reduce((acc, curr) => acc + curr.total_fantasy_points, 0) / (currentLeaderboard.length || 1)).toLocaleString()}
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-slate-800/50'}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <Users className="h-4 w-4 text-cyan-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total GMs</span>
                    </div>
                    <div className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {currentLeaderboard.length}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={onManageTeam}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-950 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Go to Team Manager
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-xl shadow-cyan-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Season Note</span>
                </div>
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  The 2026-27 season is currently in the "Regular Season" phase. Roster moves are unrestricted until the trade deadline.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
