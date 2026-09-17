import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Trophy,
  Users,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Shield,
  ArrowRight,
  Medal,
  Activity,
  Award,
  Sparkles,
  Flame,
} from 'lucide-react';
import { GeneralManager } from '../types';
import {
  getStoredScoringStats,
  getBaselineScoringStats,
  calculateFantasyPoints,
  INITIAL_GMS,
} from '../data/mockData';

export interface GmDraftLeaderboardRow {
  gm_name: string;
  total_prospects: number;
  promoted_count: number;
  hit_rate_pct: number;
  total_nhl_games_produced: number;
  star_players_count?: number;
  total_points?: number;
  total_wins?: number;
  total_fantasy_points?: number;
  goals?: number;
  assists?: number;
  wins?: number;
  shutouts?: number;
  gp?: number;
  winkoins?: number;
}

export interface ProspectRow {
  id: number;
  gm_name: string;
  player_name: string;
  position: 'F' | 'D' | 'G';
  draft_year: number;
  total_games: number;
  max_single_season_gp: number;
  qualifying_seasons: number;
  promoted: boolean;
  protected: boolean;
  nhl_id: number | string | null;
  goals?: number;
  assists?: number;
  points?: number;
  pp_points?: number;
  sh_points?: number;
  gwg?: number;
  plus_minus?: number;
  pim?: number;
  shots?: number;
  wins?: number;
  shutouts?: number;
  saves?: number;
  goals_against?: number;
  save_pct?: number;
  fantasy_points?: number;
}

interface ProspectLandingProps {
  gms: GeneralManager[];
  onSelectGmPool: (gmId: string) => void;
  isAdmin?: boolean;
  theme?: 'light' | 'dark';
}

export const ProspectLanding: React.FC<ProspectLandingProps> = ({
  gms,
  onSelectGmPool,
  isAdmin = false,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const [leaderboard, setLeaderboard] = useState<GmDraftLeaderboardRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<number | null>(null);

  // Fetch Supabase data: view gm_draft_leaderboard and table prospects
  const fetchData = async () => {
    try {
      setLoading(true);

      const [lbRes, prosRes] = await Promise.all([
        supabase.from('gm_draft_leaderboard').select('*'),
        supabase.from('prospects').select('*'),
      ]);

      if (lbRes.data) {
        // Known authentic 12 GMs
        const leagueGmSet = new Set(
          (gms && gms.length > 0
            ? gms.map((g) => g.name.trim().toLowerCase())
            : ['adam', 'allan', 'dan', 'evan', 'glenn', 'jean', 'jon', 'kyle', 'mike', 'nate', 'sam', 'seb']
          )
        );

        // Only include genuine GMs (filter out any null, orphan, or [DELETED] entries)
        const validLb = lbRes.data.filter(
          (row) =>
            row.gm_name &&
            row.gm_name.trim() !== '' &&
            row.gm_name !== '[DELETED]' &&
            leagueGmSet.has(row.gm_name.trim().toLowerCase())
        );
        // Sort by hit_rate_pct desc, then total_nhl_games_produced desc
        const sortedLb = [...validLb].sort((a, b) => {
          if (b.hit_rate_pct !== a.hit_rate_pct) {
            return b.hit_rate_pct - a.hit_rate_pct;
          }
          return (b.total_nhl_games_produced || 0) - (a.total_nhl_games_produced || 0);
        });
        setLeaderboard(sortedLb);
      }

      if (prosRes.data) {
        const activePros = (prosRes.data as any[])
          .filter((p) => p.player_name !== '[DELETED]' && p.gm_name && p.gm_name.trim() !== '')
          .map((p) => {
            const stored = getStoredScoringStats(String(p.id), p.player_name);
            const baseline = stored || getBaselineScoringStats(p.player_name, p.position, p.total_games || 0);
            const goals = p.goals != null && !isNaN(Number(p.goals)) ? Number(p.goals) : baseline.goals;
            const assists = p.assists != null && !isNaN(Number(p.assists)) ? Number(p.assists) : baseline.assists;
            const points = p.points != null && !isNaN(Number(p.points)) ? Number(p.points) : baseline.points;
            const pp_points = p.pp_points != null && !isNaN(Number(p.pp_points)) ? Number(p.pp_points) : baseline.pp_points;
            const sh_points = p.sh_points != null && !isNaN(Number(p.sh_points)) ? Number(p.sh_points) : baseline.sh_points;
            const gwg = p.gwg != null && !isNaN(Number(p.gwg)) ? Number(p.gwg) : baseline.gwg;
            const plus_minus = p.plus_minus != null && !isNaN(Number(p.plus_minus)) ? Number(p.plus_minus) : baseline.plus_minus;
            const pim = p.pim != null && !isNaN(Number(p.pim)) ? Number(p.pim) : baseline.pim;
            const shots = p.shots != null && !isNaN(Number(p.shots)) ? Number(p.shots) : baseline.shots;
            const wins = p.wins != null && !isNaN(Number(p.wins)) ? Number(p.wins) : baseline.wins;
            const shutouts = p.shutouts != null && !isNaN(Number(p.shutouts)) ? Number(p.shutouts) : baseline.shutouts;
            const saves = p.saves != null && !isNaN(Number(p.saves)) ? Number(p.saves) : baseline.saves;
            const goals_against = p.goals_against != null && !isNaN(Number(p.goals_against)) ? Number(p.goals_against) : baseline.goals_against;
            const save_pct = p.save_pct != null && !isNaN(Number(p.save_pct)) ? Number(p.save_pct) : baseline.save_pct;

            const fantasy_points = calculateFantasyPoints({
              goals,
              assists,
              pp_points,
              sh_points,
              gwg,
              plus_minus,
              pim,
              shots,
              wins,
              shutouts,
              saves,
              goals_against,
            });

            return {
              ...p,
              goals,
              assists,
              points,
              pp_points,
              sh_points,
              gwg,
              plus_minus,
              pim,
              shots,
              wins,
              shutouts,
              saves,
              goals_against,
              save_pct,
              fantasy_points,
            } as ProspectRow;
          });
        setProspects(activePros);
      }
    } catch (err) {
      console.error('Error loading Prospect Central data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick stat cards aggregations
  const quickStats = useMemo(() => {
    const totalCount = prospects.length;
    const promotedCount = prospects.filter((p) => p.promoted).length;

    let avgHitRate = 0;
    if (leaderboard.length > 0) {
      const sum = leaderboard.reduce((acc, row) => acc + (row.hit_rate_pct || 0), 0);
      avgHitRate = Math.round((sum / leaderboard.length) * 10) / 10;
    } else if (totalCount > 0) {
      avgHitRate = Math.round((promotedCount / totalCount) * 1000) / 10;
    }

    return {
      totalCount,
      promotedCount,
      avgHitRate,
    };
  }, [prospects, leaderboard]);

  // Primary Aggregated GM Standings ranked by Rule 5 Total Fantasy Points
  const rankedLeaderboard = useMemo(() => {
    const sourceGms = gms && gms.length > 0 ? gms : INITIAL_GMS;
    const allGmsMap = new Map<
      string,
      {
        gm_name: string;
        teamName: string;
        winkoins: number;
        avatarColor: string;
        avatarInitials: string;
        gmId: string;
        hit_rate_pct: number;
        promoted_count: number;
        total_prospects: number;
      }
    >();

    sourceGms.forEach((gm) => {
      const key = gm.name.trim().toLowerCase();
      allGmsMap.set(key, {
        gm_name: gm.name,
        teamName: gm.teamName || `${gm.name}'s Franchise`,
        winkoins: gm.winkoinBalance ?? gm.winkoins ?? 0,
        avatarColor: gm.avatarColor || 'from-slate-600 to-slate-800',
        avatarInitials: gm.avatarInitials || gm.name.slice(0, 2).toUpperCase(),
        gmId: gm.id,
        hit_rate_pct: 0,
        promoted_count: 0,
        total_prospects: 0,
      });
    });

    (leaderboard || []).forEach((row) => {
      const key = row.gm_name.trim().toLowerCase();
      const existing = allGmsMap.get(key);
      if (existing) {
        existing.hit_rate_pct = row.hit_rate_pct ?? existing.hit_rate_pct;
        existing.promoted_count = row.promoted_count ?? existing.promoted_count;
        existing.total_prospects = row.total_prospects ?? existing.total_prospects;
      } else {
        allGmsMap.set(key, {
          gm_name: row.gm_name,
          teamName: `${row.gm_name}'s Franchise`,
          winkoins: row.winkoins ?? 0,
          avatarColor: 'from-slate-600 to-slate-800',
          avatarInitials: row.gm_name.slice(0, 2).toUpperCase(),
          gmId: `gm-${row.gm_name.toLowerCase()}`,
          hit_rate_pct: row.hit_rate_pct ?? 0,
          promoted_count: row.promoted_count ?? 0,
          total_prospects: row.total_prospects ?? 0,
        });
      }
    });

    // Aggregate prospects per GM
    const gmProspectsMap = new Map<string, Map<string, any>>();

    sourceGms.forEach((gm) => {
      const key = gm.name.trim().toLowerCase();
      const pMap = gmProspectsMap.get(key) || new Map<string, any>();
      (gm.prospects || []).forEach((p) => {
        const pKey = p.name.trim().toLowerCase();
        pMap.set(pKey, {
          name: p.name,
          position: p.position,
          total_games: p.totalGames || p.total_games || 0,
          promoted: p.promoted,
          goals: p.goals,
          assists: p.assists,
          points: p.points,
          pp_points: p.pp_points ?? p.power_play_points,
          sh_points: p.sh_points ?? p.shorthanded_points,
          gwg: p.gwg ?? p.game_winning_goals,
          plus_minus: p.plus_minus,
          pim: p.pim ?? p.penalty_minutes,
          shots: p.shots ?? p.shots_on_goal,
          wins: p.wins,
          shutouts: p.shutouts,
          saves: p.saves,
          goals_against: p.goals_against,
          save_pct: p.save_pct,
          fantasy_points: p.fantasy_points,
        });
      });
      gmProspectsMap.set(key, pMap);
    });

    (prospects || []).forEach((p) => {
      const key = (p.gm_name || '').trim().toLowerCase();
      if (!key) return;
      const pMap = gmProspectsMap.get(key) || new Map<string, any>();
      const pKey = p.player_name.trim().toLowerCase();
      const existing = pMap.get(pKey);
      if (!existing) {
        pMap.set(pKey, {
          name: p.player_name,
          position: p.position,
          total_games: p.total_games || 0,
          promoted: p.promoted,
          goals: p.goals,
          assists: p.assists,
          points: p.points,
          pp_points: p.pp_points,
          sh_points: p.sh_points,
          gwg: p.gwg,
          plus_minus: p.plus_minus,
          pim: p.pim,
          shots: p.shots,
          wins: p.wins,
          shutouts: p.shutouts,
          saves: p.saves,
          goals_against: p.goals_against,
          save_pct: p.save_pct,
          fantasy_points: p.fantasy_points,
        });
      } else {
        pMap.set(pKey, {
          ...existing,
          total_games: Math.max(existing.total_games || 0, p.total_games || 0),
          promoted: existing.promoted || p.promoted,
          goals: p.goals != null ? p.goals : existing.goals,
          assists: p.assists != null ? p.assists : existing.assists,
          pp_points: p.pp_points != null ? p.pp_points : existing.pp_points,
          sh_points: p.sh_points != null ? p.sh_points : existing.sh_points,
          gwg: p.gwg != null ? p.gwg : existing.gwg,
          plus_minus: p.plus_minus != null ? p.plus_minus : existing.plus_minus,
          pim: p.pim != null ? p.pim : existing.pim,
          shots: p.shots != null ? p.shots : existing.shots,
          wins: p.wins != null ? p.wins : existing.wins,
          shutouts: p.shutouts != null ? p.shutouts : existing.shutouts,
          saves: p.saves != null ? p.saves : existing.saves,
          goals_against: p.goals_against != null ? p.goals_against : existing.goals_against,
          fantasy_points: p.fantasy_points != null ? p.fantasy_points : existing.fantasy_points,
        });
      }
      gmProspectsMap.set(key, pMap);
    });

    // 3. For each GM, calculate aggregates
    const result: Array<{
      gm_name: string;
      teamName: string;
      winkoins: number;
      avatarColor: string;
      avatarInitials: string;
      gmId: string;
      total_fantasy_points: number;
      skater_fantasy_points: number;
      goalie_fantasy_points: number;
      skater_points: number;
      goalie_wins: number;
      goals: number;
      assists: number;
      wins: number;
      shutouts: number;
      gp: number;
      promoted_count: number;
      total_prospects: number;
      hit_rate_pct: number;
    }> = [];

    allGmsMap.forEach((gmData, gmKey) => {
      const pMap = gmProspectsMap.get(gmKey) || new Map<string, any>();
      let total_fantasy_points = 0;
      let skater_fantasy_points = 0;
      let goalie_fantasy_points = 0;
      let skater_points = 0;
      let goalie_wins = 0;
      let goals = 0;
      let assists = 0;
      let wins = 0;
      let shutouts = 0;
      let gp = 0;
      let localPromoted = 0;
      let localTotal = 0;

      pMap.forEach((p) => {
        localTotal++;
        if (p.promoted) localPromoted++;

        const pGoals = Number(p.goals ?? 0) || 0;
        const pAssists = Number(p.assists ?? 0) || 0;
        const pPoints = Number(p.points ?? (pGoals + pAssists)) || (pGoals + pAssists);
        const pWins = p.position === 'G' ? (Number(p.wins ?? 0) || 0) : 0;
        const pShutouts = p.position === 'G' ? (Number(p.shutouts ?? 0) || 0) : 0;
        const pGP = Number(p.total_games ?? 0) || 0;

        goals += pGoals;
        assists += pAssists;
        wins += pWins;
        shutouts += pShutouts;
        gp += pGP;

        // Compute Rule 5 points for this prospect
        const prospectFP = calculateFantasyPoints(p);
        total_fantasy_points += prospectFP;

        if (p.position === 'G') {
          goalie_fantasy_points += prospectFP;
          goalie_wins += pWins;
        } else {
          skater_fantasy_points += prospectFP;
          skater_points += pPoints;
        }
      });

      const finalTotalProspects = Math.max(gmData.total_prospects, localTotal);
      const finalPromoted = Math.max(gmData.promoted_count, localPromoted);
      const finalHitRate =
        gmData.hit_rate_pct > 0
          ? gmData.hit_rate_pct
          : finalTotalProspects > 0
          ? Math.round((finalPromoted / finalTotalProspects) * 100)
          : 0;

      result.push({
        ...gmData,
        total_fantasy_points,
        skater_fantasy_points,
        goalie_fantasy_points,
        skater_points,
        goalie_wins,
        goals,
        assists,
        wins,
        shutouts,
        gp,
        promoted_count: finalPromoted,
        total_prospects: finalTotalProspects,
        hit_rate_pct: finalHitRate,
      });
    });

    // 4. Primary Metric & Sorting:
    // Rank GMs by total_fantasy_points in descending order!
    result.sort((a, b) => {
      if (b.total_fantasy_points !== a.total_fantasy_points) {
        return b.total_fantasy_points - a.total_fantasy_points;
      }
      if (b.goals !== a.goals) {
        return b.goals - a.goals;
      }
      return b.gp - a.gp;
    });

    return result;
  }, [gms, leaderboard, prospects]);

  const topGm = rankedLeaderboard.length > 0 ? rankedLeaderboard[0] : null;

  // Handle Promoting player in Supabase
  const handlePromotePlayer = async (prospect: ProspectRow) => {
    try {
      setPromotingId(prospect.id);
      const nowFormatted = new Date().toLocaleDateString('en-US');
      const { error } = await supabase
        .from('prospects')
        .update({
          promoted: true,
          promotion_date: nowFormatted,
        })
        .eq('id', prospect.id);

      if (error) {
        console.error('Error promoting player:', error);
        alert('Could not promote player: ' + error.message);
        return;
      }

      // Optimistically update local prospects state
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? { ...p, promoted: true } : p))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setPromotingId(null);
    }
  };

  // Filter Watchlist Prospects:
  // Skaters (F/D): max_single_season_gp >= 40 OR total_games >= 65
  // Goalies (G): max_single_season_gp >= 20 OR total_games >= 30
  const needsPromotionList = useMemo(() => {
    return prospects.filter((p) => {
      if (p.promoted) return false;

      const pos = (p.position || 'F').toUpperCase();
      const isGoalie = pos === 'G';
      const maxGP = p.max_single_season_gp || 0;
      const totalGP = p.total_games || 0;

      if (isGoalie) {
        return maxGP >= 20 || totalGP >= 30;
      } else {
        return maxGP >= 40 || totalGP >= 65;
      }
    });
  }, [prospects]);

  // Radar prospects (within 10 GP of promotion):
  // Skaters: max_single_season_gp between 30–39 OR total_games between 55–64
  // Goalies: max_single_season_gp between 15–19 OR total_games between 20–29
  const onTheRadarList = useMemo(() => {
    return prospects
      .filter((p) => {
        if (p.promoted) return false;

        const pos = (p.position || 'F').toUpperCase();
        const isGoalie = pos === 'G';
        const maxGP = p.max_single_season_gp || 0;
        const totalGP = p.total_games || 0;

        // Skip if already in needs promotion
        if (isGoalie) {
          if (maxGP >= 20 || totalGP >= 30) return false;
          return (maxGP >= 15 && maxGP <= 19) || (totalGP >= 20 && totalGP <= 29);
        } else {
          if (maxGP >= 40 || totalGP >= 65) return false;
          return (maxGP >= 30 && maxGP <= 39) || (totalGP >= 55 && totalGP <= 64);
        }
      })
      .map((p) => {
        const pos = (p.position || 'F').toUpperCase();
        const isGoalie = pos === 'G';
        const maxLimit = isGoalie ? 20 : 40;
        const totalLimit = isGoalie ? 30 : 65;

        const currentMax = p.max_single_season_gp || 0;
        const currentTotal = p.total_games || 0;

        const maxPercent = Math.min(100, Math.round((currentMax / maxLimit) * 100));
        const totalPercent = Math.min(100, Math.round((currentTotal / totalLimit) * 100));

        // Use the metric that's closer to triggering promotion
        const useSeason = maxPercent >= totalPercent;
        const metricCurrent = useSeason ? currentMax : currentTotal;
        const metricLimit = useSeason ? maxLimit : totalLimit;
        const metricLabel = useSeason ? 'Season GP' : 'Total GP';
        const pct = Math.max(maxPercent, totalPercent);

        return {
          ...p,
          metricCurrent,
          metricLimit,
          metricLabel,
          pct,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [prospects]);

  // Map a gm_name to a GM object to navigate to their pool
  const handleOpenGmPool = (gmName: string) => {
    const match = gms.find(
      (g) => g.name.toLowerCase() === gmName.toLowerCase() || g.teamName.toLowerCase() === gmName.toLowerCase()
    );
    if (match) {
      onSelectGmPool(match.id);
    }
  };

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
    }`}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & CONTROL BAR */}
        {/* ========================================================================= */}
        <section className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          <div>
            <h1 className={`text-4xl sm:text-5xl font-black tracking-tight flex items-center gap-3 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <span>Winko's Draft &amp; Prospect HQ</span>
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              League-wide draft hit rates, star producer leaderboards, and real-time NHL promotion threshold tracking.
            </p>
          </div>
        </section>

        {/* 3 Quick Stat Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Total Prospects Tracked */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
            isLight ? 'border-slate-200 bg-white hover:border-cyan-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Total Prospects Tracked
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {loading ? '...' : quickStats.totalCount.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Across 12 Teams</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Full active prospect rosters in database</span>
            </div>
          </div>

          {/* Card 2: Promoted to NHL */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
            isLight ? 'border-slate-200 bg-white hover:border-emerald-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Promoted to NHL
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {loading ? '...' : quickStats.promotedCount.toLocaleString()}
                  </span>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    ({quickStats.totalCount > 0 ? Math.round((quickStats.promotedCount / quickStats.totalCount) * 100) : 0}% of all)
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Graduated to official Winko active rosters</span>
            </div>
          </div>

          {/* Card 3: Fantasy Points Leader */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
            isLight ? 'border-slate-200 bg-white hover:border-amber-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-amber-500/40 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Fantasy Points Leader
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                    {loading ? '...' : `${(topGm?.total_fantasy_points || 0).toLocaleString()} PTS`}
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                <Trophy className="h-6 w-6" />
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                1st: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>{topGm?.gm_name || '--'}</strong> ({topGm?.goals || 0}G, {topGm?.assists || 0}A, {topGm?.wins || 0}W)
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. MAIN HERO SECTION — GM DRAFTING LEADERBOARD */}
        {/* ========================================================================= */}
        <section className={`rounded-2xl border p-5 sm:p-6 shadow-xl backdrop-blur-sm ${
          isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-800 bg-slate-900/80 text-white'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  GM Drafting Leaderboard
                </h2>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Ranked by Draft Hit Rate % &amp; Total NHL Games Produced. Click &ldquo;View Pool&rdquo; to jump directly to any GM&apos;s prospect pool.
              </p>
            </div>

            {/* Left title and subtitle */}
          </div>

          {/* Sleek Table */}
          <div className={`overflow-x-auto rounded-xl border ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className={`uppercase text-[10px] tracking-wider border-b font-semibold ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950/80 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">Rank</th>
                  <th className="py-3.5 px-4">General Manager</th>
                  <th className="py-3.5 px-4 text-center">Draft Hit Rate</th>
                  <th className="py-3.5 px-4 text-center">Total GP</th>
                  <th className="py-3.5 px-4 text-center">Skaters (FP)</th>
                  <th className="py-3.5 px-4 text-center">Goalies (FP)</th>
                  <th className="py-3.5 px-4 text-center">Rule 5 Total FP</th>
                  <th className="py-3.5 px-4 text-right">Pool</th>
                </tr>
              </thead>
              <tbody className={`font-medium ${isLight ? 'divide-y divide-slate-200 text-slate-800' : 'divide-y divide-slate-800/60 text-slate-200'}`}>
                {rankedLeaderboard.map((row, idx) => {
                  const rank = idx + 1;

                  return (
                    <tr
                      key={row.gm_name}
                      className={`group transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/60'}`}
                    >
                      {/* Rank with Gold, Silver, Bronze icons */}
                      <td className="py-3 px-4 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-sm shadow-amber-500/50">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-slate-950 font-black text-xs shadow-sm">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-amber-100 font-black text-xs shadow-sm">
                            3
                          </span>
                        ) : (
                          <span className={`font-mono text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* GM Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                            {row.gm_name}
                          </span>
                        </div>
                      </td>

                      {/* Draft Hit Rate */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-mono font-black text-sm ${
                              row.hit_rate_pct >= 45
                                ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                                : row.hit_rate_pct >= 40
                                ? isLight ? 'text-cyan-700' : 'text-cyan-300'
                                : isLight ? 'text-slate-700' : 'text-slate-300'
                            }`}
                          >
                            {row.hit_rate_pct}%
                          </span>
                          <div className={`w-16 h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            <div
                              className={`h-full ${
                                row.hit_rate_pct >= 45
                                  ? 'bg-emerald-500'
                                  : row.hit_rate_pct >= 40
                                  ? 'bg-cyan-500'
                                  : 'bg-slate-500'
                              }`}
                              style={{ width: `${Math.min(100, row.hit_rate_pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total GP */}
                      <td className={`py-3 px-4 text-center font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {row.gp.toLocaleString()}
                      </td>

                      {/* Skaters (FP) */}
                      <td className={`py-3 px-4 text-center font-mono font-bold text-cyan-600 dark:text-cyan-400`}>
                        {row.skater_fantasy_points.toLocaleString()} PTS
                      </td>

                      {/* Goalies (FP) */}
                      <td className={`py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400`}>
                        {row.goalie_fantasy_points.toLocaleString()} PTS
                      </td>

                      {/* Rule 5 Total Fantasy Points */}
                      <td className={`py-3 px-4 text-center font-mono font-black text-amber-500 dark:text-amber-400 text-sm`}>
                        {row.total_fantasy_points.toLocaleString()} PTS
                      </td>

                      {/* Quick jump to GM pool */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGmPool(row.gm_name);
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            isLight
                              ? 'border-slate-300 bg-slate-50 text-slate-700 hover:text-cyan-700 hover:bg-slate-100 hover:border-slate-400'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50'
                          }`}
                        >
                          <span>View Pool</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. PROMOTION WATCHLIST GRID (TWO PANEL SECTIONS) */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className={`text-3xl font-black tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>Promotion Watchlist</span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Real-time tracking of non-promoted players approaching or exceeding league promotion criteria.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ----------------------------------------------------------------- */}
            {/* PANEL 1: Action Required: Needs Promotion Card */}
            {/* ----------------------------------------------------------------- */}
            <div className={`rounded-2xl border p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col ${
              isLight ? 'border-red-200 bg-white text-slate-900' : 'border-red-500/30 bg-slate-900/80 text-white'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <span>Action Required: Needs Promotion</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${
                        isLight ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {needsPromotionList.length}
                      </span>
                    </h3>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Skaters: ≥40 Season GP or ≥65 Total GP • Goalies: ≥20 Season GP or ≥30 Total GP
                    </p>
                  </div>
                </div>
              </div>

              {needsPromotionList.length === 0 ? (
                <div className={`flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}>
                  <CheckCircle2 className="h-10 w-10 text-emerald-500/80 mb-2" />
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>All Rosters Compliant</p>
                  <p className={`text-xs max-w-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    No active unpromoted prospects currently exceed the single-season or cumulative GP thresholds.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {needsPromotionList.map((player) => {
                    const isGoalie = (player.position || 'F').toUpperCase() === 'G';
                    const headshotUrl = player.nhl_id
                      ? `https://assets.nhle.com/mrtc/images/headshots/current/168x168/${player.nhl_id}.png`
                      : null;

                    return (
                      <div
                        key={player.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                          isLight ? 'border-red-200 bg-slate-50/80 hover:border-red-300' : 'border-red-500/20 bg-slate-950/60 hover:border-red-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Player Headshot */}
                          <div className={`relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border ${
                            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
                          }`}>
                            {headshotUrl ? (
                              <img
                                src={headshotUrl}
                                alt={player.player_name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling;
                                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`h-full w-full flex items-center justify-center text-xs font-black ${
                                isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'
                              }`}
                              style={{ display: headshotUrl ? 'none' : 'flex' }}
                            >
                              {player.player_name.slice(0, 2).toUpperCase()}
                            </div>
                          </div>

                          {/* Player Details */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                {player.player_name}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-black uppercase border ${
                                  isGoalie
                                    ? isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : player.position === 'D'
                                    ? isLight ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {player.position}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 mt-0.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              <span>GM: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{player.gm_name}</strong></span>
                              <span>•</span>
                              <span>Draft: {player.draft_year}</span>
                            </div>
                            <div className={`mt-1 flex items-center gap-2 text-xs font-mono font-semibold ${isLight ? 'text-red-700' : 'text-red-400'}`}>
                              <span>Max Season GP: {player.max_single_season_gp}</span>
                              <span>•</span>
                              <span>Total GP: {player.total_games}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Promote Player Button */}
                        <div className="shrink-0 sm:self-center">
                          <button
                            type="button"
                            disabled={promotingId === player.id}
                            onClick={() => handlePromotePlayer(player)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-red-600/30 transition cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>
                              {promotingId === player.id ? 'Promoting...' : 'Promote Player'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* PANEL 2: On the Radar: Knocking on the Door Card */}
            {/* ----------------------------------------------------------------- */}
            <div className={`rounded-2xl border p-5 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col ${
              isLight ? 'border-amber-200 bg-white text-slate-900' : 'border-amber-500/30 bg-slate-900/80 text-white'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <span>On the Radar: Knocking on the Door</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${
                        isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {onTheRadarList.length}
                      </span>
                    </h3>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Within 10 GP of reaching promotion trigger (30–39 Season or 55–64 Total GP)
                    </p>
                  </div>
                </div>
              </div>

              {onTheRadarList.length === 0 ? (
                <div className={`flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}>
                  <Activity className="h-10 w-10 text-slate-500 mb-2" />
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>No Players On Immediate Radar</p>
                  <p className={`text-xs max-w-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    No prospects are currently within 10 games of triggering mandatory promotion.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {onTheRadarList.map((player) => {
                    const isGoalie = (player.position || 'F').toUpperCase() === 'G';
                    const headshotUrl = player.nhl_id
                      ? `https://assets.nhle.com/mrtc/images/headshots/current/168x168/${player.nhl_id}.png`
                      : null;

                    return (
                      <div
                        key={player.id}
                        className={`flex flex-col gap-2 rounded-xl border p-3.5 transition-colors ${
                          isLight ? 'border-slate-200 bg-slate-50/80 hover:border-amber-300' : 'border-slate-800 bg-slate-950/60 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {/* Headshot */}
                            <div className={`relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border ${
                              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
                            }`}>
                              {headshotUrl ? (
                                <img
                                  src={headshotUrl}
                                  alt={player.player_name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                className={`h-full w-full flex items-center justify-center text-[10px] font-black ${
                                  isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'
                                }`}
                                style={{ display: headshotUrl ? 'none' : 'flex' }}
                              >
                                {player.player_name.slice(0, 2).toUpperCase()}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                  {player.player_name}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.2 text-[10px] font-black uppercase border ${
                                    isGoalie
                                      ? isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : player.position === 'D'
                                      ? isLight ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                      : isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  }`}
                                >
                                  {player.position}
                                </span>
                              </div>
                              <div className={`flex items-center gap-2 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                <span>GM: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{player.gm_name}</strong></span>
                                <span>•</span>
                                <span>Draft: {player.draft_year}</span>
                              </div>
                            </div>
                          </div>

                          {/* Stat summary */}
                          <div className="text-right">
                            <span className={`font-mono text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                              {player.metricCurrent} / {player.metricLimit} GP
                            </span>
                            <div className={`text-[10px] font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                              {player.pct}%
                            </div>
                          </div>
                        </div>

                        {/* Visual Tailwind Progress Bar */}
                        <div className="mt-1">
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full"
                              style={{ width: `${player.pct}%` }}
                            />
                          </div>
                          <div className={`flex justify-between items-center text-[10px] mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span>{player.metricLabel} Metric</span>
                            <span className={`font-medium ${isLight ? 'text-amber-700' : 'text-amber-400/90'}`}>
                              {player.metricLimit - player.metricCurrent} GP cushion remaining
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
