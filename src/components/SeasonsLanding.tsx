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
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>('2026-27');
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

  // Mock mini-leaderboards for positions (using same ranking for now, but conceptually distinct)
  const forwardLeaders = [...currentLeaderboard].sort((a, b) => b.total_fantasy_points - a.total_fantasy_points).slice(0, 5);
  const defenseLeaders = [...currentLeaderboard].sort((a, b) => b.total_fantasy_points - a.total_fantasy_points).slice(0, 5);
  const goalieLeaders = [...currentLeaderboard].sort((a, b) => b.total_fantasy_points - a.total_fantasy_points).slice(0, 5);

  const MiniLeaderboard = ({ title, data, icon: Icon, accentColor }: { title: string, data: any[], icon: any, accentColor: string }) => (
    <div className={`rounded-2xl border transition-all overflow-hidden h-full ${
      isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-800/90 bg-slate-900/40 backdrop-blur-sm shadow-xl shadow-black/20'
    }`}>
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg ${accentColor} bg-opacity-10 text-opacity-100`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
        {data.map((entry, idx) => (
          <div key={entry.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-[10px] font-black tabular-nums w-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {entry.teamName}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{entry.name}</div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className="text-xs font-black text-cyan-500 tabular-nums">
                {entry.total_fantasy_points.toLocaleString()}
              </span>
              <span className="text-[9px] font-bold text-slate-500 block">FP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {!selectedSeasonId ? (
        <>
          {/* Standard Header Style */}
          <section className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => setSelectedSeasonId('2026-27')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Back to Current Standings
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                  Winko's Hockey Pool
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Historical Archive
                </span>
              </div>
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Explore the Seasons
              </h1>
              <p className={`text-xs sm:text-sm mt-1.5 max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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
          {/* Individual Season Standings View */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {selectedSeasonId !== '2026-27' && (
                    <button
                      onClick={() => setSelectedSeasonId(null)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                      Archive
                    </button>
                  )}
                </div>
                <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  Pool Standings
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedSeasonId === '2026-27' && (
                  <button
                    onClick={() => setSelectedSeasonId(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                      isLight 
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    Season Archive
                  </button>
                )}
                <button
                  onClick={onManageTeam}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Manage Team
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {/* Primary Leaderboard Table */}
            <div className={`rounded-3xl border transition-all overflow-hidden ${
              isLight
                ? 'border-slate-200 bg-white shadow-xs'
                : 'border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 shadow-xl shadow-black/40'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className={`border-b text-xs font-black uppercase tracking-wider ${
                    isLight
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800/80'
                  }`}>
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">Rank</th>
                      <th className="px-6 py-4">General Manager / Team</th>
                      <th className="px-6 py-4 text-right">Fantasy Points</th>
                      <th className="px-6 py-4 text-right w-40">Roster</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/70'}`}>
                    {currentLeaderboard.map((gm, idx) => (
                      <tr
                        key={gm.id}
                        onClick={() => setViewingRosterGm(gm.name)}
                        className={`transition-colors group cursor-pointer ${
                          isLight ? 'hover:bg-slate-50/80' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-6 py-3.5 text-center">
                          {idx === 0 ? (
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 font-black ring-1 ring-amber-500/40 shadow-sm">
                              <Crown className="h-4 w-4" />
                            </div>
                          ) : (
                            <span className={`text-sm font-black tabular-nums ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                              {idx + 1}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-3.5">
                          <div className="flex flex-col">
                            <span className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white group-hover:text-cyan-400 transition-colors'}`}>
                              {gm.teamName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wide">
                              {gm.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <span className="text-lg font-black text-cyan-500 tabular-nums">
                            {gm.total_fantasy_points.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewingRosterGm(gm.name); }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              isLight
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-white hover:text-slate-950'
                            }`}
                          >
                            <LayoutDashboard className="h-3 w-3" />
                            View Roster
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Positional Mini-Leaderboards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MiniLeaderboard 
                title="Forward Leaders" 
                data={forwardLeaders} 
                icon={TrendingUp} 
                accentColor="bg-blue-500 text-blue-500"
              />
              <MiniLeaderboard 
                title="Defense Leaders" 
                data={defenseLeaders} 
                icon={Crown} 
                accentColor="bg-amber-500 text-amber-500"
              />
              <MiniLeaderboard 
                title="Goalie Leaders" 
                data={goalieLeaders} 
                icon={Trophy} 
                accentColor="bg-purple-500 text-purple-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
