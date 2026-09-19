import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { INITIAL_GMS, NHL_TEAMS_MAP, getStoredScoringStats, getBaselineScoringStats } from '../data/mockData';
import {
  Trophy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Users,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Flame,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export interface RosterPlayerStats {
  id: string | number;
  player_name: string;
  position: string; // 'F' | 'D' | 'G' | 'LW' | 'C' | 'RW'
  norm_position: 'F' | 'D' | 'G';
  team: string;
  team_abbr: string;
  roster_status: 'ACTIVE' | 'BENCH';
  slot_position: string; // e.g. F1..F9, D1..D4, G1..G2, BF1..BF3, BD1..BD2, BG1..BG2
  gp: number;
  goals: number;
  assists: number;
  points: number;
  plus_minus: number;
  pim: number;
  shots: number;
  gwg: number;
  ppp: number;
  shp: number;
  // Goalie stats
  wins: number;
  shutouts: number;
  saves: number;
  goals_against: number;
  save_pct: number;
  // Calculated Rule 5 Fantasy Points
  fantasy_points: number;
  fantasy_points_per_game: number;
  gm_name: string;
}

export interface ActiveRosterStatsTableProps {
  gmName?: string;
  selectedGm?: string;
  theme?: 'light' | 'dark';
  onSelectGm?: (gmName: string) => void;
  availableGms?: string[];
  onNavigateBack?: () => void;
}

const ALL_ACTIVE_SLOTS = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
  'D1', 'D2', 'D3', 'D4',
  'G1', 'G2',
] as const;

const ALL_BENCH_SLOTS = [
  'BF1', 'BF2', 'BF3',
  'BD1', 'BD2',
  'BG1', 'BG2',
] as const;

const SLOT_ORDER_MAP: Record<string, number> = {
  F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6, F7: 7, F8: 8, F9: 9,
  D1: 10, D2: 11, D3: 12, D4: 13,
  G1: 14, G2: 15,
  BF1: 16, BF2: 17, BF3: 18,
  BD1: 19, BD2: 20,
  BG1: 21, BG2: 22,
};

const LEAGUE_GMS = [
  'Adam', 'Sam', 'Kyle', 'Seb', 'Jean', 'Mike',
  'Allan', 'Dan', 'Evan', 'Nate', 'Glenn', 'Jon',
];

export function normalizePosition(pos: string): 'F' | 'D' | 'G' {
  const upper = (pos || '').trim().toUpperCase();
  if (upper === 'G' || upper === 'GOALIE') return 'G';
  if (upper === 'D' || upper === 'DEFENSE' || upper === 'DEFENSEMAN' || upper === 'DEF') return 'D';
  return 'F';
}

/**
 * Official Rule 5 Fantasy Points calculation
 * Skaters: (G*25) + (A*25) + (SHP*20) + (GWG*20) + (PPP*10) + (+/-*5) + (PIM*3) + (SOG*2)
 * Goalies: (W*40) + (SO*40) + (SV*2) - (GA*15)
 */
export function computeRule5FantasyPoints(player: {
  position: string;
  goals?: number;
  assists?: number;
  shp?: number;
  sh_points?: number;
  shorthanded_points?: number;
  gwg?: number;
  game_winning_goals?: number;
  ppp?: number;
  pp_points?: number;
  power_play_points?: number;
  plus_minus?: number;
  pim?: number;
  penalty_minutes?: number;
  shots?: number;
  shots_on_goal?: number;
  wins?: number;
  shutouts?: number;
  saves?: number;
  goals_against?: number;
}): number {
  const norm = normalizePosition(player.position);
  if (norm === 'G') {
    const w = Number(player.wins ?? 0) || 0;
    const so = Number(player.shutouts ?? 0) || 0;
    const sv = Number(player.saves ?? 0) || 0;
    const ga = Number(player.goals_against ?? 0) || 0;
    return (w * 40) + (so * 40) + (sv * 2) - (ga * 15);
  }

  const g = Number(player.goals ?? 0) || 0;
  const a = Number(player.assists ?? 0) || 0;
  const shp = Number(player.shp ?? player.sh_points ?? player.shorthanded_points ?? 0) || 0;
  const gwg = Number(player.gwg ?? player.game_winning_goals ?? 0) || 0;
  const ppp = Number(player.ppp ?? player.pp_points ?? player.power_play_points ?? 0) || 0;
  const pm = Number(player.plus_minus ?? 0) || 0;
  const pim = Number(player.pim ?? player.penalty_minutes ?? 0) || 0;
  const sog = Number(player.shots ?? player.shots_on_goal ?? 0) || 0;

  return (g * 25) + (a * 25) + (shp * 20) + (gwg * 20) + (ppp * 10) + (pm * 5) + (pim * 3) + (sog * 2);
}

type FilterTab = 'all' | 'active' | 'bench';
type SortField =
  | 'slot'
  | 'player_name'
  | 'fpts'
  | 'fpg'
  | 'gp'
  | 'goals'
  | 'assists'
  | 'plus_minus'
  | 'pim'
  | 'shots'
  | 'gwg'
  | 'ppp'
  | 'shp';

export const ActiveRosterStatsTable: React.FC<ActiveRosterStatsTableProps> = ({
  gmName,
  selectedGm,
  theme,
  onSelectGm,
  availableGms = LEAGUE_GMS,
  onNavigateBack,
}) => {
  const activeGm = gmName || selectedGm || 'Adam';
  const [currentGm, setCurrentGm] = useState<string>(activeGm);
  const [players, setPlayers] = useState<RosterPlayerStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('slot');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Detect theme from prop or document
  const isLight = useMemo(() => {
    if (theme) return theme === 'light';
    if (typeof document !== 'undefined') {
      return !document.documentElement.classList.contains('dark');
    }
    return false;
  }, [theme]);

  // Keep currentGm synchronized if parent prop changes
  useEffect(() => {
    if (activeGm && activeGm !== currentGm) {
      setCurrentGm(activeGm);
    }
  }, [activeGm]);

  // Fetch roster stats from Supabase
  const loadRosterStats = useCallback(async (gm: string) => {
    setLoading(true);
    try {
      // 1. Primary: query active_roster_players table filtered by selected gm_name
      const { data: rosterTableData, error: rosterTableError } = await supabase
        .from('active_roster_players')
        .select('*')
        .eq('gm_name', gm);

      let rows: any[] = [];

      if (!rosterTableError && rosterTableData && rosterTableData.length > 0) {
        rows = rosterTableData;
      } else {
        // 2. Seamless fallback to prospects table for 22 main roster players (promoted / active / bench)
        const { data: prospectsData, error: prospectsError } = await supabase
          .from('prospects')
          .select('*')
          .eq('gm_name', gm);

        if (!prospectsError && prospectsData && prospectsData.length > 0) {
          // Filter for promoted/protected or explicit active/bench status
          // NOT farm prospects
          const mainRosterProspects = prospectsData.filter((p: any) => {
            if (p.is_inactive || p.player_name === '[DELETED]') return false;
            if (p.roster_status === 'ACTIVE' || p.roster_status === 'BENCH') return true;
            if (p.promoted || p.protected || p.is_protected) return true;
            if (p.slot_position && p.slot_position !== 'FARM') return true;
            return false;
          });

          if (mainRosterProspects.length > 0) {
            rows = mainRosterProspects;
          }
        }

        // 3. Fallback to INITIAL_GMS if DB is completely unpopulated for this GM
        if (rows.length === 0) {
          const gmObj = INITIAL_GMS.find(g => g.name.toLowerCase() === gm.toLowerCase());
          if (gmObj && gmObj.prospects) {
            rows = gmObj.prospects
              .filter(p => p.status !== 'trashed' && (p.promoted || p.isProtected))
              .map(p => ({
                id: p.id,
                player_name: p.name,
                position: p.position,
                nhl_team: p.nhlTeam,
                nhl_team_abbr: p.nhlTeamAbbr,
                promoted: p.promoted,
                protected: p.isProtected,
                goals: p.goals,
                assists: p.assists,
                total_games: p.totalGames,
                gm_name: gm,
              }));
          }
        }
      }

      // Format and ensure 22 Main Roster players are correctly slotted into Active (15) and Bench (7)
      // Group by position
      const parsedPlayers: RosterPlayerStats[] = rows.map((r: any, idx: number) => {
        const name = r.player_name || r.name || `Player ${idx + 1}`;
        const lowerName = name.toLowerCase();
        const teamInfo = NHL_TEAMS_MAP[lowerName] || {
          team: r.nhl_team || r.team || 'NHL Team',
          abbr: r.nhl_team_abbr || r.team_abbr || 'NHL',
        };

        const pos = r.position || 'F';
        const normPos = normalizePosition(pos);
        const stored = getStoredScoringStats(String(r.id), name);
        const baseline = getBaselineScoringStats(name, normPos, r.total_games || r.gp || 0);

        const goals = Number(r.goals ?? stored?.goals ?? baseline.goals ?? 0);
        const assists = Number(r.assists ?? stored?.assists ?? baseline.assists ?? 0);
        const points = goals + assists;
        const plusMinus = Number(r.plus_minus ?? stored?.plus_minus ?? baseline.plus_minus ?? 0);
        const pim = Number(r.pim ?? r.penalty_minutes ?? stored?.pim ?? baseline.pim ?? 0);
        const shots = Number(r.shots ?? r.shots_on_goal ?? stored?.shots ?? baseline.shots ?? 0);
        const gwg = Number(r.gwg ?? r.game_winning_goals ?? stored?.gwg ?? baseline.gwg ?? 0);
        const ppp = Number(r.ppp ?? r.pp_points ?? r.power_play_points ?? stored?.pp_points ?? baseline.pp_points ?? 0);
        const shp = Number(r.shp ?? r.sh_points ?? r.shorthanded_points ?? stored?.sh_points ?? baseline.sh_points ?? 0);

        const wins = Number(r.wins ?? stored?.wins ?? baseline.wins ?? 0);
        const shutouts = Number(r.shutouts ?? stored?.shutouts ?? baseline.shutouts ?? 0);
        const saves = Number(r.saves ?? stored?.saves ?? baseline.saves ?? 0);
        const goalsAgainst = Number(r.goals_against ?? stored?.goals_against ?? baseline.goals_against ?? 0);
        const savePct = Number(r.save_pct ?? stored?.save_pct ?? baseline.save_pct ?? 0);

        const gp = Number(r.gp ?? r.total_games ?? r.totalGames ?? 0);

        const rule5FP = computeRule5FantasyPoints({
          position: normPos,
          goals,
          assists,
          shp,
          gwg,
          ppp,
          plus_minus: plusMinus,
          pim,
          shots,
          wins,
          shutouts,
          saves,
          goals_against: goalsAgainst,
        });

        const fpg = gp > 0 ? Number((rule5FP / gp).toFixed(1)) : 0;

        // Default roster status and slot
        let rosterStatus: 'ACTIVE' | 'BENCH' = 'ACTIVE';
        let slotPos = r.slot_position || '';

        if (r.roster_status === 'BENCH' || (slotPos && slotPos.startsWith('B'))) {
          rosterStatus = 'BENCH';
        }

        return {
          id: r.id || `roster-${idx}`,
          player_name: name,
          position: pos,
          norm_position: normPos,
          team: teamInfo.team,
          team_abbr: teamInfo.abbr,
          roster_status: rosterStatus,
          slot_position: slotPos,
          gp,
          goals,
          assists,
          points,
          plus_minus: plusMinus,
          pim,
          shots,
          gwg,
          ppp,
          shp,
          wins,
          shutouts,
          saves,
          goals_against: goalsAgainst,
          save_pct: savePct,
          fantasy_points: rule5FP,
          fantasy_points_per_game: fpg,
          gm_name: gm,
        };
      });

      // Ensure proper slots (F1-F9, D1-D4, G1-G2, BF1-BF3, BD1-BD2, BG1-BG2)
      // If slots are not populated or duplicate, auto-assign according to Winko's 22-man roster structure:
      const slottedPlayers = assignRosterSlots(parsedPlayers);
      setPlayers(slottedPlayers);
    } catch (err) {
      console.error('Failed to load active roster player stats:', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadRosterStats(currentGm);
  }, [currentGm, loadRosterStats]);

  // Helper to ensure 22 slots are cleanly mapped:
  // 15 Active: 9 F, 4 D, 2 G
  // 7 Bench: 3 BF, 2 BD, 2 BG
  function assignRosterSlots(roster: RosterPlayerStats[]): RosterPlayerStats[] {
    const fSlots = [...ALL_ACTIVE_SLOTS.filter(s => s.startsWith('F'))];
    const dSlots = [...ALL_ACTIVE_SLOTS.filter(s => s.startsWith('D'))];
    const gSlots = [...ALL_ACTIVE_SLOTS.filter(s => s.startsWith('G'))];

    const bfSlots = [...ALL_BENCH_SLOTS.filter(s => s.startsWith('BF'))];
    const bdSlots = [...ALL_BENCH_SLOTS.filter(s => s.startsWith('BD'))];
    const bgSlots = [...ALL_BENCH_SLOTS.filter(s => s.startsWith('BG'))];

    const usedSlots = new Set<string>();
    const assigned: RosterPlayerStats[] = [];
    const unassigned: RosterPlayerStats[] = [];

    // First pass: keep explicitly assigned valid slots
    roster.forEach(p => {
      const slot = p.slot_position;
      if (
        slot &&
        (ALL_ACTIVE_SLOTS.includes(slot as any) || ALL_BENCH_SLOTS.includes(slot as any)) &&
        !usedSlots.has(slot)
      ) {
        usedSlots.add(slot);
        assigned.push({
          ...p,
          roster_status: slot.startsWith('B') ? 'BENCH' : 'ACTIVE',
          slot_position: slot,
        });
      } else {
        unassigned.push(p);
      }
    });

    // Second pass: fill open slots with unassigned players
    unassigned.forEach(p => {
      let targetSlot = '';
      if (p.norm_position === 'F') {
        targetSlot = fSlots.find(s => !usedSlots.has(s)) || bfSlots.find(s => !usedSlots.has(s)) || '';
      } else if (p.norm_position === 'D') {
        targetSlot = dSlots.find(s => !usedSlots.has(s)) || bdSlots.find(s => !usedSlots.has(s)) || '';
      } else {
        targetSlot = gSlots.find(s => !usedSlots.has(s)) || bgSlots.find(s => !usedSlots.has(s)) || '';
      }

      if (targetSlot) {
        usedSlots.add(targetSlot);
        assigned.push({
          ...p,
          slot_position: targetSlot,
          roster_status: targetSlot.startsWith('B') ? 'BENCH' : 'ACTIVE',
        });
      } else {
        assigned.push({
          ...p,
          slot_position: p.slot_position || 'BENCH',
          roster_status: 'BENCH',
        });
      }
    });

    return assigned;
  }

  // Summary Metrics
  const activeSquadPlayers = useMemo(() => {
    return players.filter(p => p.roster_status === 'ACTIVE' || ALL_ACTIVE_SLOTS.includes(p.slot_position as any));
  }, [players]);

  const benchSquadPlayers = useMemo(() => {
    return players.filter(p => p.roster_status === 'BENCH' || ALL_BENCH_SLOTS.includes(p.slot_position as any));
  }, [players]);

  const totalActiveFP = useMemo(() => {
    return activeSquadPlayers.reduce((sum, p) => sum + p.fantasy_points, 0);
  }, [activeSquadPlayers]);

  const totalBenchFP = useMemo(() => {
    return benchSquadPlayers.reduce((sum, p) => sum + p.fantasy_points, 0);
  }, [benchSquadPlayers]);

  const activeAvgFPG = useMemo(() => {
    if (activeSquadPlayers.length === 0) return '0.0';
    const totalGP = activeSquadPlayers.reduce((sum, p) => sum + p.gp, 0);
    if (totalGP === 0) return '0.0';
    return (totalActiveFP / totalGP).toFixed(1);
  }, [activeSquadPlayers, totalActiveFP]);

  // Tab Filtering
  const tabFilteredPlayers = useMemo(() => {
    if (filterTab === 'active') return activeSquadPlayers;
    if (filterTab === 'bench') return benchSquadPlayers;
    return players;
  }, [filterTab, players, activeSquadPlayers, benchSquadPlayers]);

  // Search Filtering
  const searchedPlayers = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredPlayers;
    const q = searchQuery.toLowerCase().trim();
    return tabFilteredPlayers.filter(p =>
      p.player_name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q) ||
      p.team_abbr.toLowerCase().includes(q) ||
      p.slot_position.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q)
    );
  }, [tabFilteredPlayers, searchQuery]);

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default to descending for numeric stats, ascending for text/slot
      setSortDirection(field === 'slot' || field === 'player_name' ? 'asc' : 'desc');
    }
  };

  // Sorted list
  const sortedPlayers = useMemo(() => {
    const list = [...searchedPlayers];
    const multiplier = sortDirection === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortField === 'slot') {
        const orderA = SLOT_ORDER_MAP[a.slot_position] || 99;
        const orderB = SLOT_ORDER_MAP[b.slot_position] || 99;
        return (orderA - orderB) * multiplier;
      }
      if (sortField === 'player_name') {
        return a.player_name.localeCompare(b.player_name) * multiplier;
      }
      if (sortField === 'fpts') {
        return (a.fantasy_points - b.fantasy_points) * multiplier;
      }
      if (sortField === 'fpg') {
        return (a.fantasy_points_per_game - b.fantasy_points_per_game) * multiplier;
      }
      if (sortField === 'gp') {
        return (a.gp - b.gp) * multiplier;
      }
      if (sortField === 'goals') {
        return (a.goals - b.goals) * multiplier;
      }
      if (sortField === 'assists') {
        return (a.assists - b.assists) * multiplier;
      }
      if (sortField === 'plus_minus') {
        return (a.plus_minus - b.plus_minus) * multiplier;
      }
      if (sortField === 'pim') {
        return (a.pim - b.pim) * multiplier;
      }
      if (sortField === 'shots') {
        return (a.shots - b.shots) * multiplier;
      }
      if (sortField === 'gwg') {
        return (a.gwg - b.gwg) * multiplier;
      }
      if (sortField === 'ppp') {
        return (a.ppp - b.ppp) * multiplier;
      }
      if (sortField === 'shp') {
        return (a.shp - b.shp) * multiplier;
      }
      return 0;
    });

    return list;
  }, [searchedPlayers, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-cyan-400 font-bold" />
    ) : (
      <ArrowDown className="h-3 w-3 text-cyan-400 font-bold" />
    );
  };

  const getSlotBadgeStyle = (slot: string) => {
    const isBench = slot.startsWith('B');
    if (slot.includes('F')) {
      return isBench
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        : 'bg-blue-600 text-white border-blue-500 shadow-xs';
    }
    if (slot.includes('D')) {
      return isBench
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-xs';
    }
    if (slot.includes('G')) {
      return isBench
        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        : 'bg-purple-600 text-white border-purple-500 shadow-xs';
    }
    return 'bg-slate-700 text-slate-200 border-slate-600';
  };

  return (
    <div
      id="active-roster-stats-container"
      className={`min-h-screen transition-colors ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b1120] text-slate-100'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* ==========================================
            SUMMARY HEADER (Total Active Squad FP)
        ========================================== */}
        <div
          id="active-roster-summary-header"
          className={`rounded-2xl border p-5 sm:p-6 transition-all ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 shadow-xl backdrop-blur-md'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* GM & Team Title */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Shield className="h-3 w-3" />
                  Official 22-Man Roster
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-400">Rule 5 Scoring</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {currentGm}&apos;s Active Roster Stats
                </h1>

                {/* GM Selector Dropdown */}
                <div className="relative inline-block">
                  <select
                    id="gm-roster-stats-select"
                    value={currentGm}
                    onChange={e => {
                      const newGm = e.target.value;
                      setCurrentGm(newGm);
                      if (onSelectGm) onSelectGm(newGm);
                    }}
                    className={`text-xs font-bold rounded-xl border px-3 py-1.5 cursor-pointer appearance-none pr-8 transition-colors ${
                      isLight
                        ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {availableGms.map(gm => (
                      <option key={gm} value={gm}>
                        GM {gm}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                </div>

                {onNavigateBack && (
                  <button
                    type="button"
                    onClick={onNavigateBack}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                      isLight
                        ? 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                        : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    Back to Hub
                  </button>
                )}
              </div>

              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} max-w-2xl`}>
                Official Rule 5 Fantasy scoring metrics for {currentGm}&apos;s 22 main roster players (15 Active Starting Lineup slots + 7 Bench slots).
              </p>
            </div>

            {/* Metric Cards Banner */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              {/* Active Squad FP (The Key Metric) */}
              <div
                id="summary-active-squad-fpts"
                className={`flex-1 sm:flex-none p-4 rounded-xl border transition-all ${
                  isLight
                    ? 'bg-emerald-50/80 border-emerald-200/80 text-slate-900'
                    : 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/30 text-white shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                    Active Squad FPts
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    15 Slots
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                  {totalActiveFP.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1">FP</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Avg: <strong className="text-emerald-500">{activeAvgFPG}</strong> FP/Game
                </div>
              </div>

              {/* Bench Squad FP */}
              <div
                id="summary-bench-squad-fpts"
                className={`flex-1 sm:flex-none p-4 rounded-xl border transition-all ${
                  isLight
                    ? 'bg-amber-50/70 border-amber-200 text-slate-900'
                    : 'bg-slate-900/90 border-slate-800 text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    Bench Production
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
                    7 Slots
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
                  {totalBenchFP.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1">FP</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Reserves (0 Standings Pts)
                </div>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                id="btn-refresh-roster-stats"
                onClick={() => {
                  setIsSyncing(true);
                  loadRosterStats(currentGm);
                }}
                disabled={isSyncing}
                className={`p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="Refresh Roster Stats"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            ROSTER CONTROLS: Tabs & Search
        ========================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div
            id="roster-filter-tabs"
            className={`flex items-center p-1 rounded-xl border self-start ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              type="button"
              id="tab-all-roster"
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'all'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-slate-800 text-cyan-400 shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>All Roster</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterTab === 'all'
                  ? isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-700 text-cyan-300'
                  : isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
              }`}>
                {players.length}
              </span>
            </button>

            <button
              type="button"
              id="tab-active-squad"
              onClick={() => setFilterTab('active')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'active'
                  ? isLight
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'bg-slate-800 text-emerald-400 shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-emerald-500" />
              <span>Active Squad</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterTab === 'active'
                  ? isLight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950 text-emerald-300'
                  : isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
              }`}>
                {activeSquadPlayers.length}
              </span>
            </button>

            <button
              type="button"
              id="tab-bench-squad"
              onClick={() => setFilterTab('bench')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'bench'
                  ? isLight
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'bg-slate-800 text-amber-400 shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              <span>Bench</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterTab === 'bench'
                  ? isLight ? 'bg-amber-50 text-amber-700' : 'bg-amber-950 text-amber-300'
                  : isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
              }`}>
                {benchSquadPlayers.length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              id="roster-stats-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search player, team, or slot..."
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border transition-colors outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
                  : 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500'
              }`}
            />
          </div>
        </div>

        {/* ==========================================
            MAIN STATS TABLE
        ========================================== */}
        <div
          id="active-roster-stats-table-wrapper"
          className={`rounded-2xl border overflow-hidden shadow-md transition-all ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-cyan-400" />
              <p className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Querying active roster players for {currentGm}...
              </p>
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Layers className="h-8 w-8 mx-auto text-slate-500" />
              <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                No Players Found
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? `No roster players match "${searchQuery}".`
                  : `No active or bench players registered for GM ${currentGm}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-black uppercase tracking-wider select-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    {/* Pos (Slot) */}
                    <th
                      onClick={() => handleSort('slot')}
                      className="px-3.5 py-3 cursor-pointer hover:text-cyan-400 transition-colors shrink-0"
                    >
                      <div className="flex items-center gap-1">
                        <span>Pos</span>
                        {renderSortIcon('slot')}
                      </div>
                    </th>

                    {/* Player / Team */}
                    <th
                      onClick={() => handleSort('player_name')}
                      className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition-colors min-w-[180px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Player / Team</span>
                        {renderSortIcon('player_name')}
                      </div>
                    </th>

                    {/* FPts (Rule 5 Fantasy Points) */}
                    <th
                      onClick={() => handleSort('fpts')}
                      className="px-3.5 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>FPts</span>
                        {renderSortIcon('fpts')}
                      </div>
                    </th>

                    {/* FP/G */}
                    <th
                      onClick={() => handleSort('fpg')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>FP/G</span>
                        {renderSortIcon('fpg')}
                      </div>
                    </th>

                    {/* GP */}
                    <th
                      onClick={() => handleSort('gp')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>GP</span>
                        {renderSortIcon('gp')}
                      </div>
                    </th>

                    {/* G */}
                    <th
                      onClick={() => handleSort('goals')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>G</span>
                        {renderSortIcon('goals')}
                      </div>
                    </th>

                    {/* A */}
                    <th
                      onClick={() => handleSort('assists')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>A</span>
                        {renderSortIcon('assists')}
                      </div>
                    </th>

                    {/* +/- */}
                    <th
                      onClick={() => handleSort('plus_minus')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>+/-</span>
                        {renderSortIcon('plus_minus')}
                      </div>
                    </th>

                    {/* PIM */}
                    <th
                      onClick={() => handleSort('pim')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>PIM</span>
                        {renderSortIcon('pim')}
                      </div>
                    </th>

                    {/* SOG */}
                    <th
                      onClick={() => handleSort('shots')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>SOG</span>
                        {renderSortIcon('shots')}
                      </div>
                    </th>

                    {/* GWG */}
                    <th
                      onClick={() => handleSort('gwg')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>GWG</span>
                        {renderSortIcon('gwg')}
                      </div>
                    </th>

                    {/* PPP */}
                    <th
                      onClick={() => handleSort('ppp')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>PPP</span>
                        {renderSortIcon('ppp')}
                      </div>
                    </th>

                    {/* SHP */}
                    <th
                      onClick={() => handleSort('shp')}
                      className="px-3 py-3 cursor-pointer hover:text-cyan-400 transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>SHP</span>
                        {renderSortIcon('shp')}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                  {sortedPlayers.map(player => {
                    const isBench = player.roster_status === 'BENCH' || player.slot_position.startsWith('B');
                    const isGoalie = player.norm_position === 'G';

                    return (
                      <tr
                        key={player.id}
                        id={`roster-row-${player.id}`}
                        className={`transition-colors ${
                          isLight
                            ? 'hover:bg-slate-50/90 text-slate-800'
                            : 'hover:bg-slate-800/50 text-slate-200'
                        }`}
                      >
                        {/* Slot Position Tag */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center font-mono font-black text-[11px] px-2.5 py-0.5 rounded-lg border ${getSlotBadgeStyle(
                              player.slot_position
                            )}`}
                            title={isBench ? `Bench slot: ${player.slot_position}` : `Active starting lineup: ${player.slot_position}`}
                          >
                            {player.slot_position}
                          </span>
                        </td>

                        {/* Player / Team */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {player.player_name}
                                </span>
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                                    player.norm_position === 'F'
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      : player.norm_position === 'D'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  }`}
                                >
                                  {player.position}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono font-bold text-slate-400">
                                  {player.team_abbr}
                                </span>
                                <span>•</span>
                                <span className="truncate max-w-[130px]">{player.team}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* FPts (Rule 5 Fantasy Points) */}
                        <td className="px-3.5 py-3 whitespace-nowrap text-right font-mono">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              isBench
                                ? isLight
                                  ? 'text-amber-800 bg-amber-50'
                                  : 'text-amber-300 bg-amber-950/50'
                                : isLight
                                ? 'text-emerald-800 bg-emerald-50'
                                : 'text-emerald-300 bg-emerald-950/50'
                            }`}
                          >
                            {player.fantasy_points.toLocaleString()}
                          </span>
                        </td>

                        {/* FP/G */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono font-bold text-slate-400">
                          {player.fantasy_points_per_game.toFixed(1)}
                        </td>

                        {/* GP */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono">
                          {player.gp}
                        </td>

                        {/* G (or W for goalies) */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono font-semibold">
                          {isGoalie ? (
                            <span title={`${player.wins} Wins`}>{player.wins}W</span>
                          ) : (
                            player.goals
                          )}
                        </td>

                        {/* A (or SO for goalies) */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono font-semibold">
                          {isGoalie ? (
                            <span title={`${player.shutouts} Shutouts`}>{player.shutouts}SO</span>
                          ) : (
                            player.assists
                          )}
                        </td>

                        {/* +/- (or SV% for goalies) */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono">
                          {isGoalie ? (
                            <span className="text-slate-400 text-[11px]" title={`Save Pct: ${player.save_pct}`}>
                              {player.save_pct ? player.save_pct.toFixed(3) : '.000'}
                            </span>
                          ) : player.plus_minus > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              +{player.plus_minus}
                            </span>
                          ) : player.plus_minus < 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              {player.plus_minus}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* PIM (or Saves for goalies) */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono text-slate-400">
                          {isGoalie ? (
                            <span title={`${player.saves} Saves`}>{player.saves}SV</span>
                          ) : (
                            player.pim
                          )}
                        </td>

                        {/* SOG (or GA for goalies) */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono text-slate-400">
                          {isGoalie ? (
                            <span title={`${player.goals_against} Goals Against`}>{player.goals_against}GA</span>
                          ) : (
                            player.shots
                          )}
                        </td>

                        {/* GWG */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono">
                          {player.gwg > 0 ? (
                            <span className="font-bold text-amber-500">{player.gwg}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* PPP */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono">
                          {player.ppp > 0 ? (
                            <span className="font-bold text-cyan-500">{player.ppp}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* SHP */}
                        <td className="px-3 py-3 whitespace-nowrap text-right font-mono">
                          {player.shp > 0 ? (
                            <span className="font-black text-rose-500">{player.shp}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer breakdown notes */}
          <div
            className={`p-4 border-t text-[11px] flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>
                <strong>Rule 5 Skater Points:</strong> G(25) + A(25) + SHP(20) + GWG(20) + PPP(10) + +/-(5) + PIM(3) + SOG(2)
              </span>
            </div>
            <div>
              <span>
                <strong>Goalie Points:</strong> W(40) + SO(40) + SV(2) - GA(15)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveRosterStatsTable;
