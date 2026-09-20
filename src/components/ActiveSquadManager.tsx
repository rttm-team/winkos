import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateFantasyPoints, NHL_TEAMS_MAP, INITIAL_GMS, getStoredProspectStatus } from '../data/mockData';
import { proxyImageUrl } from '../lib/utils';
import {
  Shield,
  Users,
  Trophy,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Search,
  Plus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Lock,
  Info,
  X,
  Flame,
  ArrowLeft,
  UserMinus,
  Check,
  GripVertical,
  MoreVertical,
} from 'lucide-react';

// ==========================================
// TYPES & CONSTANTS
// ==========================================

export type SlotCategory = 'Forwards' | 'Defense' | 'Goalies';

// 1. Active Squad (15 Slots Max - Earns Rule 5 Fantasy Points)
export const ACTIVE_FORWARD_SLOTS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'] as const;
export const ACTIVE_DEFENSE_SLOTS = ['D1', 'D2', 'D3', 'D4'] as const;
export const ACTIVE_GOALIE_SLOTS = ['G1', 'G2'] as const;

export const ALL_ACTIVE_SLOTS = [
  ...ACTIVE_FORWARD_SLOTS,
  ...ACTIVE_DEFENSE_SLOTS,
  ...ACTIVE_GOALIE_SLOTS,
] as const;

export type ActiveSlotId = (typeof ALL_ACTIVE_SLOTS)[number];

// 2. Bench Squad (7 Slots Max - 0 Fantasy Points)
export const BENCH_FORWARD_SLOTS = ['BF1', 'BF2', 'BF3'] as const;
export const BENCH_DEFENSE_SLOTS = ['BD1', 'BD2'] as const;
export const BENCH_GOALIE_SLOTS = ['BG1', 'BG2'] as const;

export const ALL_BENCH_SLOTS = [
  ...BENCH_FORWARD_SLOTS,
  ...BENCH_DEFENSE_SLOTS,
  ...BENCH_GOALIE_SLOTS,
] as const;

export type BenchSlotId = (typeof ALL_BENCH_SLOTS)[number];

// Total Main Roster: 22 Slots (15 Active + 7 Bench)
export const ALL_ROSTER_SLOTS = [
  ...ALL_ACTIVE_SLOTS,
  ...ALL_BENCH_SLOTS,
] as const;

export type RosterSlotId = (typeof ALL_ROSTER_SLOTS)[number];

// Legacy aliases for backward compatibility
export const FORWARD_SLOTS = ACTIVE_FORWARD_SLOTS;
export const DEFENSE_SLOTS = ACTIVE_DEFENSE_SLOTS;
export const GOALIE_SLOTS = ACTIVE_GOALIE_SLOTS;

export const PRIMARY_GMS = [
  'Jean',
  'Allan',
  'Glenn',
  'Nate',
  'Sam',
  'Seb',
  'Adam',
  'Kyle',
  'Dan',
  'Evan',
  'Mike',
  'Jon',
] as const;

export interface SquadPlayer {
  id: string | number;
  player_name: string;
  position: string;
  team: string;
  team_abbr: string;
  roster_status: 'ACTIVE' | 'BENCH' | 'PROSPECT_POOL';
  slot_position: string;
  goals: number;
  assists: number;
  points: number;
  wins: number;
  shutouts: number;
  saves: number;
  goals_against: number;
  save_pct: number;
  total_games: number;
  promoted: boolean;
  isProtected?: boolean;
  status?: string;
  nhl_id?: number | string | null;
  fantasy_points: number;
  plus_minus: number;
  pim: number;
  shots: number;
  power_play_points: number;
  shorthanded_points: number;
  game_winning_goals: number;
  gm_name: string;
  goals_2026_27: number;
  assists_2026_27: number;
  points_2026_27: number;
  plus_minus_2026_27: number;
  pim_2026_27: number;
  shots_2026_27: number;
  power_play_points_2026_27: number;
  shorthanded_points_2026_27: number;
  game_winning_goals_2026_27: number;
  wins_2026_27: number;
  shutouts_2026_27: number;
  saves_2026_27: number;
  goals_against_2026_27: number;
  save_pct_2026_27: number;
  total_games_2026_27: number;
  fantasy_points_2026_27: number;
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function normalizePosition(pos?: string): 'F' | 'D' | 'G' {
  if (!pos) return 'F';
  const clean = pos.trim().toUpperCase();
  if (clean === 'D' || clean === 'DEF' || clean.includes('DEFENSE')) return 'D';
  if (clean === 'G' || clean === 'GOALIE') return 'G';
  return 'F';
}

export function isBenchSlot(slot: string): boolean {
  return slot.startsWith('BF') || slot.startsWith('BD') || slot.startsWith('BG') || slot.toUpperCase() === 'BENCH';
}

export function getSlotCategory(slot: string): SlotCategory {
  if (slot.startsWith('BF') || (slot.startsWith('F') && !slot.startsWith('BD') && !slot.startsWith('BG'))) {
    return 'Forwards';
  }
  if (slot.startsWith('BD') || slot.startsWith('D')) {
    return 'Defense';
  }
  return 'Goalies';
}

export function isPositionEligibleForSlot(position: string, slot: string): boolean {
  const norm = normalizePosition(position);
  const cat = getSlotCategory(slot);
  if (cat === 'Forwards') return norm === 'F';
  if (cat === 'Defense') return norm === 'D';
  if (cat === 'Goalies') return norm === 'G';
  return false;
}

export function formatSavePercentage(val?: number | null): string {
  if (val == null || isNaN(Number(val)) || Number(val) === 0) return '.000';
  const num = Number(val) > 1 ? Number(val) / 100 : Number(val);
  const fixed = num.toFixed(3);
  return fixed.startsWith('0') ? fixed.substring(1) : fixed;
}

// ==========================================
// COMPONENT
// ==========================================

export interface ActiveSquadManagerProps {
  initialGm?: string;
  theme?: 'light' | 'dark';
  onNavigateBack?: () => void;
}

export const ActiveSquadManager: React.FC<ActiveSquadManagerProps> = ({
  initialGm = 'Adam',
  theme = 'dark',
  onNavigateBack,
}) => {
  const isLight = theme === 'light';

  // Selected GM
  const [selectedGm, setSelectedGm] = useState<string>(() => {
    const match = PRIMARY_GMS.find(g => g.toLowerCase() === (initialGm || '').toLowerCase());
    return match || 'Adam';
  });

  useEffect(() => {
    if (initialGm) {
      const match = PRIMARY_GMS.find(g => g.toLowerCase() === initialGm.toLowerCase());
      if (match) setSelectedGm(match);
    }
  }, [initialGm]);

  // Roster state
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [assignModalSlot, setAssignModalSlot] = useState<RosterSlotId | null>(null);
  const [swapModalPlayer, setSwapModalPlayer] = useState<SquadPlayer | null>(null);

  // Search & Filter for Unassigned Reserves & Farm
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [posFilter, setPosFilter] = useState<'ALL' | 'F' | 'D' | 'G'>('ALL');
  const [showFarmSection, setShowFarmSection] = useState<boolean>(false);

  // Drag and drop state
  const [draggedPlayer, setDraggedPlayer] = useState<SquadPlayer | null>(null);
  const [draggedSourceSlot, setDraggedSourceSlot] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // View Mode: Lineup Builder vs Rule 5 Stats Table
  // (Removed managerTab state)

  // Show Toast
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Helper: Detailed Stats Display
  const PlayerStats: React.FC<{ player: SquadPlayer }> = ({ player }) => {
    const isGoalie = normalizePosition(player.position) === 'G';
    return (
      <div className="flex items-center gap-3 text-[10px] font-mono whitespace-nowrap overflow-x-auto">
        <span className="font-bold text-amber-500">{player.fantasy_points_2026_27} FP</span>
        <span className="text-slate-500">{player.total_games_2026_27} GP</span>
        {isGoalie ? (
          <>
            <span className="text-emerald-500">{player.wins_2026_27} W</span>
            <span className="text-cyan-500">{player.shutouts_2026_27} SO</span>
            <span className="text-slate-400">{formatSavePercentage(player.save_pct_2026_27)} SV%</span>
            <span className="text-slate-400">{player.goals_against_2026_27} GA</span>
            <span className="text-slate-400">{player.saves_2026_27} SV</span>
          </>
        ) : (
          <>
            <span className="text-emerald-500">{player.goals_2026_27} G</span>
            <span className="text-cyan-500">{player.assists_2026_27} A</span>
            <span className="text-amber-500">{player.points_2026_27} PTS</span>
            <span className="text-slate-400">{player.plus_minus_2026_27} +/-</span>
            <span className="text-slate-400">{player.pim_2026_27} PIM</span>
            <span className="text-slate-400">{player.shots_2026_27} SOG</span>
            <span className="text-slate-400">{player.power_play_points_2026_27} PPP</span>
            <span className="text-slate-400">{player.shorthanded_points_2026_27} SHP</span>
            <span className="text-slate-400">{player.game_winning_goals_2026_27} GWG</span>
          </>
        )}
      </div>
    );
  };

  // Action Menu Component
  const PlayerActionMenu: React.FC<{ player: SquadPlayer }> = ({ player }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
          <MoreVertical className="h-5 w-5" />
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg z-50 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setIsOpen(false);
                if (player.roster_status === 'BENCH') {
                  handleActivatePlayer(player);
                } else {
                  handleBenchPlayer(player);
                }
              }}
              className="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {player.roster_status === 'BENCH' ? 'Activate' : 'Bench'}
            </button>
            <button
              onClick={() => { setIsOpen(false); setSwapModalPlayer(player); }}
              className="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Swap
            </button>
            <button
              onClick={() => { setIsOpen(false); handleUnassignSlot(player); }}
              className="block w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-500"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  };

  // Fetch roster from Supabase (with fallback to INITIAL_GMS)
  const loadGmRoster = useCallback(
    async (gm: string, silent = false) => {
      if (!silent) setLoading(true);
      else setIsSyncing(true);

      try {
        const { data, error } = await supabase
          .from('prospects')
          .select('*')
          .eq('gm_name', gm);

        if (error) throw error;

        let rawRows = data;
        // Fallback to INITIAL_GMS if Supabase returns 0 records for this GM
        if (!rawRows || rawRows.length === 0) {
          const gmObj = INITIAL_GMS.find(g => g.name.toLowerCase() === gm.toLowerCase());
          if (gmObj && gmObj.prospects) {
            rawRows = gmObj.prospects.map(p => ({
              id: p.id,
              name: p.name,
              player_name: p.name,
              position: p.position,
              nhl_team: p.nhlTeam,
              nhl_team_abbr: p.nhlTeamAbbr,
              promoted: p.promoted,
              protected: p.isProtected,
              status: p.status,
              goals: p.goals,
              assists: p.assists,
              points: p.points,
              total_games: p.totalGames,
              gm_name: gm,
            }));
          }
        }

        const mapped: SquadPlayer[] = (rawRows || []).map((row: any) => {
          const name = row.player_name || row.name || 'Unknown Prospect';
          const lowerName = name.toLowerCase();
          const teamInfo = NHL_TEAMS_MAP[lowerName] || {
            team: row.nhl_team || 'NHL Team',
            abbr: row.nhl_team_abbr || 'NHL',
          };

          const rawStats = {
            goals: row.goals ?? 0,
            assists: row.assists ?? 0,
            wins: row.wins ?? 0,
            shutouts: row.shutouts ?? 0,
            saves: row.saves ?? 0,
            goals_against: row.goals_against ?? 0,
            plus_minus: row.plus_minus ?? 0,
            pim: row.pim ?? 0,
            shots: row.shots ?? 0,
            power_play_points: row.power_play_points ?? 0,
            shorthanded_points: row.shorthanded_points ?? 0,
            game_winning_goals: row.game_winning_goals ?? 0,
          };

          const rawStats2026_27 = {
            goals: row.goals_2026_27 ?? 0,
            assists: row.assists_2026_27 ?? 0,
            wins: row.wins_2026_27 ?? 0,
            shutouts: row.shutouts_2026_27 ?? 0,
            saves: row.saves_2026_27 ?? 0,
            goals_against: row.goals_against_2026_27 ?? 0,
            plus_minus: row.plus_minus_2026_27 ?? 0,
            pim: row.pim_2026_27 ?? 0,
            shots: row.shots_2026_27 ?? 0,
            power_play_points: row.power_play_points_2026_27 ?? 0,
            shorthanded_points: row.shorthanded_points_2026_27 ?? 0,
            game_winning_goals: row.game_winning_goals_2026_27 ?? 0,
          };

          const fp = calculateFantasyPoints(rawStats);
          const fp2026_27 = calculateFantasyPoints(rawStats2026_27);
          const isProt = Boolean(row.protected ?? row.is_protected ?? row.isProtected ?? false);
          const isTrashed = Boolean(
            row.is_inactive === true ||
            row.inactive === true ||
            row.status === 'trashed' ||
            row.status === 'inactive' ||
            getStoredProspectStatus(String(row.id), name) === 'trashed'
          );

          // Standardize initial roster status & slot
          let defaultStatus: 'ACTIVE' | 'BENCH' | 'PROSPECT_POOL' = 'PROSPECT_POOL';
          let defaultSlot: string = 'FARM';

          if (row.roster_status) {
            defaultStatus = row.roster_status;
            defaultSlot = row.slot_position || (defaultStatus === 'ACTIVE' ? 'F1' : 'BENCH');
          } else if (row.promoted) {
            defaultStatus = 'BENCH';
            defaultSlot = 'BENCH';
          }

          return {
            id: row.id,
            player_name: name,
            position: row.position || 'F',
            team: teamInfo.team,
            team_abbr: teamInfo.abbr,
            roster_status: defaultStatus,
            slot_position: defaultSlot,
            goals: rawStats.goals,
            assists: rawStats.assists,
            points: rawStats.goals + rawStats.assists,
            wins: rawStats.wins,
            shutouts: rawStats.shutouts,
            saves: rawStats.saves,
            goals_against: rawStats.goals_against,
            save_pct: row.save_pct ?? 0,
            total_games: row.total_games ?? 0,
            promoted: Boolean(row.promoted),
            isProtected: isProt,
            status: isTrashed ? 'trashed' : 'active',
            nhl_id: row.nhl_id,
            fantasy_points: fp,
            plus_minus: rawStats.plus_minus,
            pim: rawStats.pim,
            shots: rawStats.shots,
            power_play_points: rawStats.power_play_points,
            shorthanded_points: rawStats.shorthanded_points,
            game_winning_goals: rawStats.game_winning_goals,
            goals_2026_27: rawStats2026_27.goals,
            assists_2026_27: rawStats2026_27.assists,
            points_2026_27: rawStats2026_27.goals + rawStats2026_27.assists,
            plus_minus_2026_27: rawStats2026_27.plus_minus,
            pim_2026_27: rawStats2026_27.pim,
            shots_2026_27: rawStats2026_27.shots,
            power_play_points_2026_27: rawStats2026_27.power_play_points,
            shorthanded_points_2026_27: rawStats2026_27.shorthanded_points,
            game_winning_goals_2026_27: rawStats2026_27.game_winning_goals,
            wins_2026_27: rawStats2026_27.wins,
            shutouts_2026_27: rawStats2026_27.shutouts,
            saves_2026_27: rawStats2026_27.saves,
            goals_against_2026_27: rawStats2026_27.goals_against,
            save_pct_2026_27: row.save_pct_2026_27 ?? 0,
            total_games_2026_27: row.total_games_2026_27 ?? 0,
            fantasy_points_2026_27: fp2026_27,
            gm_name: row.gm_name || gm,
          };
        });

        let keeperRecords: any[] = [];
        const { data: keeperData } = await supabase
          .from('active_roster_players')
          .select('*')
          .eq('gm_name', gm)
          .eq('roster_status', 'KEEPER');

        if (keeperData && keeperData.length > 0) {
          keeperRecords = keeperData;
        } else {
          // Fallback to localStorage
          try {
            const localStored = localStorage.getItem(`winko_keepers_${gm}`);
            if (localStored) {
              const parsedSlots = JSON.parse(localStored);
              Object.entries(parsedSlots).forEach(([slotKey, player]: [string, any]) => {
                if (player) {
                  keeperRecords.push({
                    player_name: player.player_name,
                    nhl_id: player.nhl_id,
                    position: player.position,
                    nhl_team: player.nhl_team,
                    slot_position: slotKey,
                    gm_name: gm,
                    roster_status: 'ACTIVE'
                  });
                }
              });
            }
          } catch (e) {
            console.error('Error reading local keepers:', e);
          }
        }

        if (keeperRecords.length > 0) {
          keeperRecords.forEach((kRow: any) => {
            const kName = kRow.player_name;
            const existingIndex = mapped.findIndex(m => m.player_name.toLowerCase() === kName.toLowerCase());
            if (existingIndex >= 0) {
              mapped[existingIndex].roster_status = 'ACTIVE';
              mapped[existingIndex].slot_position = kRow.slot_position;
              if (kRow.nhl_id) mapped[existingIndex].nhl_id = kRow.nhl_id;
              if (kRow.nhl_team) mapped[existingIndex].team = kRow.nhl_team;
            } else {
              mapped.push({
                id: kRow.id || `keeper-${kName}`,
                player_name: kName,
                position: kRow.position || 'F',
                team: kRow.nhl_team || 'NHL Team',
                team_abbr: 'NHL',
                roster_status: 'ACTIVE',
                slot_position: kRow.slot_position || 'F1',
                goals: 0, assists: 0, points: 0, wins: 0, shutouts: 0, saves: 0, goals_against: 0, save_pct: 0, total_games: 0,
                promoted: true,
                isProtected: true,
                status: 'active',
                nhl_id: kRow.nhl_id,
                fantasy_points: 0,
                plus_minus: 0, pim: 0, shots: 0, power_play_points: 0, shorthanded_points: 0, game_winning_goals: 0,
                gm_name: gm,
                goals_2026_27: 0, assists_2026_27: 0, points_2026_27: 0, plus_minus_2026_27: 0, pim_2026_27: 0, shots_2026_27: 0, power_play_points_2026_27: 0, shorthanded_points_2026_27: 0, game_winning_goals_2026_27: 0, wins_2026_27: 0, shutouts_2026_27: 0, saves_2026_27: 0, goals_against_2026_27: 0, save_pct_2026_27: 0, total_games_2026_27: 0, fantasy_points_2026_27: 0,
              });
            }
          });
        }

        // Filter out any players that have completely moved on / trashed
        const activePlayersList = mapped.filter(p => p.status !== 'trashed');
        setPlayers(activePlayersList);
      } catch (err: any) {
        console.error('Error fetching GM roster:', err);
        addToast(`Failed to load ${gm}'s roster: ${err.message || 'Network error'}`, 'error');
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    loadGmRoster(selectedGm);
  }, [selectedGm, loadGmRoster]);

  // ==========================================
  // ROSTER MAPPINGS & COUNTERS
  // ==========================================

  // Filter 1: Main Roster Eligible Players (Promoted & Protected drafted players)
  // Per instructions: "Prospects should only be available on their active squad if they are Promoted and Protected."
  const rosterEligiblePlayers = useMemo(() => {
    return players.filter(p => p.promoted && p.isProtected && p.status !== 'trashed');
  }, [players]);

  // Filter 3: Farm / Prospect Pool (Non-promoted or Non-protected prospects)
  // Per instructions: "Non-promoted or non-protected prospects stay in the PROSPECT_POOL / FARM section."
  const farmPlayers = useMemo(() => {
    return players.filter(p => (!p.promoted || !p.isProtected) && p.status !== 'trashed');
  }, [players]);

  // Map of active players by slot position (F1-F9, D1-D4, G1-G2)
  const activeSlotMap = useMemo(() => {
    const map = new Map<ActiveSlotId, SquadPlayer>();
    rosterEligiblePlayers.forEach(p => {
      if (p.roster_status === 'ACTIVE' && ALL_ACTIVE_SLOTS.includes(p.slot_position as ActiveSlotId)) {
        map.set(p.slot_position as ActiveSlotId, p);
      }
    });
    return map;
  }, [rosterEligiblePlayers]);

  // Map of bench players by bench slot position (BF1-BF3, BD1-BD2, BG1-BG2)
  const benchSlotMap = useMemo(() => {
    const map = new Map<BenchSlotId, SquadPlayer>();
    const unmappedBench: SquadPlayer[] = [];

    rosterEligiblePlayers.forEach(p => {
      if (p.roster_status === 'BENCH') {
        if (ALL_BENCH_SLOTS.includes(p.slot_position as BenchSlotId)) {
          map.set(p.slot_position as BenchSlotId, p);
        } else {
          unmappedBench.push(p);
        }
      }
    });

    // Auto-map unslotted bench players to open bench slots of matching position
    unmappedBench.forEach(p => {
      const norm = normalizePosition(p.position);
      const slots = norm === 'F' ? BENCH_FORWARD_SLOTS : norm === 'D' ? BENCH_DEFENSE_SLOTS : BENCH_GOALIE_SLOTS;
      const openSlot = slots.find(s => !map.has(s));
      if (openSlot) {
        map.set(openSlot, p);
      }
    });

    return map;
  }, [rosterEligiblePlayers]);

  // Active Slot Counters
  const activeFCount = useMemo(() => ACTIVE_FORWARD_SLOTS.filter(s => activeSlotMap.has(s)).length, [activeSlotMap]);
  const activeDCount = useMemo(() => ACTIVE_DEFENSE_SLOTS.filter(s => activeSlotMap.has(s)).length, [activeSlotMap]);
  const activeGCount = useMemo(() => ACTIVE_GOALIE_SLOTS.filter(s => activeSlotMap.has(s)).length, [activeSlotMap]);
  const totalActiveCount = activeFCount + activeDCount + activeGCount;

  // Bench Slot Counters
  const benchFCount = useMemo(() => BENCH_FORWARD_SLOTS.filter(s => benchSlotMap.has(s)).length, [benchSlotMap]);
  const benchDCount = useMemo(() => BENCH_DEFENSE_SLOTS.filter(s => benchSlotMap.has(s)).length, [benchSlotMap]);
  const benchGCount = useMemo(() => BENCH_GOALIE_SLOTS.filter(s => benchSlotMap.has(s)).length, [benchSlotMap]);
  const totalBenchCount = benchFCount + benchDCount + benchGCount;

  // Total Main Roster (22 Slots Max)
  const totalMainRosterCount = totalActiveCount + totalBenchCount;

  // Filter 2: Unassigned Bench Reserves (Promoted & Protected players not currently in Active or Bench slots)
  const unassignedBenchPlayers = useMemo(() => {
    const assignedIds = new Set<string | number>();
    activeSlotMap.forEach(p => assignedIds.add(p.id));
    benchSlotMap.forEach(p => assignedIds.add(p.id));
    return rosterEligiblePlayers.filter(p => !assignedIds.has(p.id));
  }, [rosterEligiblePlayers, activeSlotMap, benchSlotMap]);

  // Rule 5 Fantasy Points Summary (Earned ONLY by the 15 Active Slots)
  // Per instructions: "Points in the 2026-27 season should be 0 for now"
  const activeFantasyStats = useMemo(() => {
    return {
      totalFP: 0,
      skaterFP: 0,
      goalieFP: 0,
      avgFP: 0,
      topPlayer: null as SquadPlayer | null,
    };
  }, []);

  // ==========================================
  // ROSTER MUTATIONS & SWAP ENGINE
  // ==========================================

  // 1. Swap or Move Player into Target Slot
  const handleSwapToSlot = async (player: SquadPlayer, targetSlot: RosterSlotId) => {
    if (!player.promoted || !player.isProtected) {
      const reason = !player.promoted ? "not promoted" : "not protected";
      addToast(`${player.player_name} is ${reason}! Only promoted and protected players can occupy Active or Bench slots.`, 'error');
      return;
    }

    if (!isPositionEligibleForSlot(player.position, targetSlot)) {
      addToast(
        `Position Mismatch: ${player.player_name} (${player.position}) is not eligible for ${targetSlot} (${getSlotCategory(targetSlot)}).`,
        'error'
      );
      return;
    }

    const prevPlayers = [...players];
    const sourceSlot = player.slot_position;
    const isTargetBench = isBenchSlot(targetSlot);
    const targetStatus: 'ACTIVE' | 'BENCH' = isTargetBench ? 'BENCH' : 'ACTIVE';

    // Find if target slot has an occupant
    const occupant = players.find(
      p => p.slot_position === targetSlot && (isTargetBench ? p.roster_status === 'BENCH' : p.roster_status === 'ACTIVE')
    );

    // Optimistic state update
    setPlayers(current =>
      current.map(p => {
        if (p.id === player.id) {
          return { ...p, roster_status: targetStatus, slot_position: targetSlot };
        }
        if (occupant && p.id === occupant.id) {
          // If sourceSlot was a valid slot, swap occupant into sourceSlot; otherwise bench them
          const isSourceActive = ALL_ACTIVE_SLOTS.includes(sourceSlot as any);
          const isSourceBench = ALL_BENCH_SLOTS.includes(sourceSlot as any);
          const returnStatus = isSourceActive ? 'ACTIVE' : 'BENCH';
          const returnSlot = isSourceActive || isSourceBench ? sourceSlot : 'BENCH';
          return { ...p, roster_status: returnStatus, slot_position: returnSlot };
        }
        return p;
      })
    );

    setSwapModalPlayer(null);
    setAssignModalSlot(null);

    const swapMessage = occupant
      ? `Swapped ${player.player_name} (${targetSlot}) with ${occupant.player_name} (${sourceSlot}).`
      : `Moved ${player.player_name} into slot ${targetSlot}!`;
    addToast(swapMessage, 'success');

    try {
      const syncKeeperMovement = (playerName: string, slot: string, status: string) => {
        try {
          const key = `winko_keepers_${selectedGm}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            const slots = JSON.parse(stored);
            let existingSlot: string | null = null;
            let playerData: any = null;
            for (const [sKey, p] of Object.entries(slots)) {
              if (p && (p as any).player_name.toLowerCase() === playerName.toLowerCase()) {
                existingSlot = sKey;
                playerData = p;
                break;
              }
            }
            if (existingSlot) {
              slots[existingSlot] = null;
            }
            if (ALL_ACTIVE_SLOTS.includes(slot as any) && playerData) {
              slots[slot] = playerData;
            }
            localStorage.setItem(key, JSON.stringify(slots));
          }
        } catch (e) {
          console.error('Error syncing keeper movement:', e);
        }
      };

      syncKeeperMovement(player.player_name, targetSlot, targetStatus);
      const isSourceActive = ALL_ACTIVE_SLOTS.includes(sourceSlot as any);
      const isSourceBench = ALL_BENCH_SLOTS.includes(sourceSlot as any);
      const returnStatus = isSourceActive ? 'ACTIVE' : 'BENCH';
      const returnSlot = isSourceActive || isSourceBench ? sourceSlot : 'BENCH';

      if (occupant) {
        syncKeeperMovement(occupant.player_name, returnSlot, returnStatus);
      }

      const updatePlayerProspect = supabase
        .from('prospects')
        .update({ roster_status: targetStatus, slot_position: targetSlot })
        .eq('id', player.id);

      const updatePlayerActiveRoster = supabase
        .from('active_roster_players')
        .update({ roster_status: targetStatus, slot_position: targetSlot })
        .eq('gm_name', selectedGm)
        .eq('player_name', player.player_name);

      const updateOccupantProspect = occupant
        ? supabase
            .from('prospects')
            .update({ roster_status: returnStatus, slot_position: returnSlot })
            .eq('id', occupant.id)
        : Promise.resolve({ error: null });

      const updateOccupantActiveRoster = occupant
        ? supabase
            .from('active_roster_players')
            .update({ roster_status: returnStatus, slot_position: returnSlot })
            .eq('gm_name', selectedGm)
            .eq('player_name', occupant.player_name)
        : Promise.resolve({ error: null });

      const [resA, resB, resC, resD] = await Promise.all([
        updatePlayerProspect,
        updatePlayerActiveRoster,
        updateOccupantProspect,
        updateOccupantActiveRoster,
      ]);
      if (resA.error && resB.error) {
        // If neither exists in DB (e.g. pure local keeper), don't throw
      }
    } catch (err: any) {
      console.error('Roster movement error:', err);
      setPlayers(prevPlayers);
      addToast(`Movement failed: ${err.message}`, 'error');
    }
  };

  // 2. Quick Bench: Move an Active player to the first open Bench slot or open Swap
  const handleBenchPlayer = async (player: SquadPlayer) => {
    const norm = normalizePosition(player.position);
    const targetSlots = norm === 'F' ? BENCH_FORWARD_SLOTS : norm === 'D' ? BENCH_DEFENSE_SLOTS : BENCH_GOALIE_SLOTS;
    const openBenchSlot = targetSlots.find(s => !benchSlotMap.has(s));

    if (openBenchSlot) {
      await handleSwapToSlot(player, openBenchSlot);
    } else {
      setSwapModalPlayer(player);
      addToast(
        `All ${norm === 'F' ? '3 Forward' : '2'} Bench slots are occupied. Choose a bench slot to swap with.`,
        'info'
      );
    }
  };

  // 3. Quick Activate: Move a Bench player to the first open Active slot or open Swap
  const handleActivatePlayer = async (player: SquadPlayer) => {
    const norm = normalizePosition(player.position);
    const targetSlots = norm === 'F' ? ACTIVE_FORWARD_SLOTS : norm === 'D' ? ACTIVE_DEFENSE_SLOTS : ACTIVE_GOALIE_SLOTS;
    const openActiveSlot = targetSlots.find(s => !activeSlotMap.has(s));

    if (openActiveSlot) {
      await handleSwapToSlot(player, openActiveSlot);
    } else {
      setSwapModalPlayer(player);
      addToast(
        `All ${norm === 'F' ? '9 Forward' : norm === 'D' ? '4 Defense' : '2 Goalie'} Active slots are occupied. Choose an active slot to swap with.`,
        'info'
      );
    }
  };

  // 4. Remove player from slot back to unassigned reserves
  const handleUnassignSlot = async (player: SquadPlayer) => {
    const prevPlayers = [...players];
    const oldSlot = player.slot_position;

    setPlayers(current =>
      current.map(p =>
        p.id === player.id
          ? { ...p, roster_status: 'BENCH', slot_position: 'BENCH' }
          : p
      )
    );

    addToast(`${player.player_name} removed from ${oldSlot} to reserves.`, 'info');

    try {
      try {
        const key = `winko_keepers_${selectedGm}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const slots = JSON.parse(stored);
          for (const [sKey, p] of Object.entries(slots)) {
            if (p && (p as any).player_name.toLowerCase() === player.player_name.toLowerCase()) {
              slots[sKey] = null;
              break;
            }
          }
          localStorage.setItem(key, JSON.stringify(slots));
        }
      } catch (e) {}

      await Promise.all([
        supabase
          .from('prospects')
          .update({ roster_status: 'BENCH', slot_position: 'BENCH' })
          .eq('id', player.id),
        supabase
          .from('active_roster_players')
          .update({ roster_status: 'BENCH', slot_position: 'BENCH' })
          .eq('gm_name', selectedGm)
          .eq('player_name', player.player_name)
      ]);
    } catch (err: any) {
      console.error('Unassign error:', err);
      setPlayers(prevPlayers);
      addToast(`Error unassigning slot: ${err.message}`, 'error');
    }
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, player: SquadPlayer, sourceSlot?: string) => {
    setDraggedPlayer(player);
    setDraggedSourceSlot(sourceSlot || player.slot_position || null);
    e.dataTransfer.setData('text/plain', String(player.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetSlot: RosterSlotId) => {
    e.preventDefault();

    // Auto-scroll logic when dragging near viewport edges
    const scrollThreshold = 100;
    const scrollSpeed = 15;
    if (e.clientY < scrollThreshold) {
      window.scrollBy(0, -scrollSpeed);
    } else if (e.clientY > window.innerHeight - scrollThreshold) {
      window.scrollBy(0, scrollSpeed);
    }

    if (!draggedPlayer) return;
    const isEligible = isPositionEligibleForSlot(draggedPlayer.position, targetSlot);
    if (isEligible) {
      e.dataTransfer.dropEffect = 'move';
      if (dragOverSlot !== targetSlot) {
        setDragOverSlot(targetSlot);
      }
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetSlot: RosterSlotId) => {
    e.preventDefault();
    if (dragOverSlot === targetSlot) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetSlot: RosterSlotId) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedPlayer) return;

    const isEligible = isPositionEligibleForSlot(draggedPlayer.position, targetSlot);
    if (!isEligible) {
      addToast(
        `${draggedPlayer.player_name} (${draggedPlayer.position}) cannot be placed in ${targetSlot} (${getSlotCategory(targetSlot)}).`,
        'error'
      );
      setDraggedPlayer(null);
      setDraggedSourceSlot(null);
      return;
    }

    // Dropped onto the exact same slot they are already in
    const isTargetBench = isBenchSlot(targetSlot);
    if (
      draggedPlayer.slot_position === targetSlot &&
      (isTargetBench ? draggedPlayer.roster_status === 'BENCH' : draggedPlayer.roster_status === 'ACTIVE')
    ) {
      setDraggedPlayer(null);
      setDraggedSourceSlot(null);
      return;
    }

    const playerToMove = draggedPlayer;
    setDraggedPlayer(null);
    setDraggedSourceSlot(null);

    await handleSwapToSlot(playerToMove, targetSlot);
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDraggedSourceSlot(null);
    setDragOverSlot(null);
  };

  const handleDropToReserve = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedPlayer) return;
    const playerToMove = draggedPlayer;
    setDraggedPlayer(null);
    setDraggedSourceSlot(null);
    await handleUnassignSlot(playerToMove);
  };

  // 5. Auto-Optimize Roster across 15 Active and 7 Bench slots
  const handleAutoOptimizeRoster = async () => {
    const candidates = [...rosterEligiblePlayers].sort((a, b) => b.fantasy_points - a.fantasy_points);
    const candF = candidates.filter(p => normalizePosition(p.position) === 'F');
    const candD = candidates.filter(p => normalizePosition(p.position) === 'D');
    const candG = candidates.filter(p => normalizePosition(p.position) === 'G');

    const assignments: { id: string | number; slot: string; status: 'ACTIVE' | 'BENCH'; name: string }[] = [];

    // 1. Assign 9 Active Forwards (F1 to F9)
    ACTIVE_FORWARD_SLOTS.forEach((slot, i) => {
      if (candF[i]) assignments.push({ id: candF[i].id, slot, status: 'ACTIVE', name: candF[i].player_name });
    });

    // 2. Assign 4 Active Defense (D1 to D4)
    ACTIVE_DEFENSE_SLOTS.forEach((slot, i) => {
      if (candD[i]) assignments.push({ id: candD[i].id, slot, status: 'ACTIVE', name: candD[i].player_name });
    });

    // 3. Assign 2 Active Goalies (G1 to G2)
    ACTIVE_GOALIE_SLOTS.forEach((slot, i) => {
      if (candG[i]) assignments.push({ id: candG[i].id, slot, status: 'ACTIVE', name: candG[i].player_name });
    });

    // 4. Assign 3 Bench Forwards (BF1 to BF3) from remaining forwards
    BENCH_FORWARD_SLOTS.forEach((slot, i) => {
      const cand = candF[ACTIVE_FORWARD_SLOTS.length + i];
      if (cand) assignments.push({ id: cand.id, slot, status: 'BENCH', name: cand.player_name });
    });

    // 5. Assign 2 Bench Defense (BD1 to BD2) from remaining defense
    BENCH_DEFENSE_SLOTS.forEach((slot, i) => {
      const cand = candD[ACTIVE_DEFENSE_SLOTS.length + i];
      if (cand) assignments.push({ id: cand.id, slot, status: 'BENCH', name: cand.player_name });
    });

    // 6. Assign 2 Bench Goalies (BG1 to BG2) from remaining goalies
    BENCH_GOALIE_SLOTS.forEach((slot, i) => {
      const cand = candG[ACTIVE_GOALIE_SLOTS.length + i];
      if (cand) assignments.push({ id: cand.id, slot, status: 'BENCH', name: cand.player_name });
    });

    if (assignments.length === 0) {
      addToast('No promoted & protected players available to optimize roster.', 'info');
      return;
    }

    const prevPlayers = [...players];
    setPlayers(current =>
      current.map(p => {
        const a = assignments.find(item => item.id === p.id);
        if (a) {
          return { ...p, roster_status: a.status, slot_position: a.slot };
        }
        return p;
      })
    );

    addToast(`Auto-optimized ${assignments.length} slots across 15 Active and 7 Bench!`, 'success');

    try {
      for (const a of assignments) {
        await supabase
          .from('prospects')
          .update({ roster_status: a.status, slot_position: a.slot })
          .eq('id', a.id);
      }
    } catch (err: any) {
      console.error('Optimize error:', err);
      setPlayers(prevPlayers);
      addToast(`Optimization error: ${err.message}`, 'error');
    }
  };

  // 6. Bench All Active Players
  const handleBenchAll = async () => {
    if (totalActiveCount === 0) return;
    if (!window.confirm(`Are you sure you want to bench all ${totalActiveCount} active players?`)) return;

    const prevPlayers = [...players];

    setPlayers(current =>
      current.map(p =>
        p.roster_status === 'ACTIVE'
          ? { ...p, roster_status: 'BENCH', slot_position: 'BENCH' }
          : p
      )
    );
    addToast('All active players have been moved to the bench.', 'info');

    try {
      const activeIds = players.filter(p => p.roster_status === 'ACTIVE').map(p => p.id);
      for (const id of activeIds) {
        await supabase
          .from('prospects')
          .update({ roster_status: 'BENCH', slot_position: 'BENCH' })
          .eq('id', id);
      }
    } catch (err: any) {
      console.error('Bench all error:', err);
      setPlayers(prevPlayers);
      addToast(`Failed to clear lineup: ${err.message}`, 'error');
    }
  };

  // 7. Promote Farm Prospect to Roster
  const handlePromoteFarmProspect = async (player: SquadPlayer) => {
    const prevPlayers = [...players];

    setPlayers(current =>
      current.map(p =>
        p.id === player.id
          ? { ...p, promoted: true, isProtected: true, roster_status: 'BENCH', slot_position: 'BENCH' }
          : p
      )
    );
    addToast(`${player.player_name} promoted! Now eligible for Bench & Active slots.`, 'success');

    try {
      const { error } = await supabase
        .from('prospects')
        .update({
          promoted: true,
          protected: true,
          roster_status: 'BENCH',
          slot_position: 'BENCH',
          promotion_date: new Date().toISOString(),
        })
        .eq('id', player.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Promotion error:', err);
      setPlayers(prevPlayers);
      addToast(`Promotion failed: ${err.message}`, 'error');
    }
  };

  // ==========================================
  // RENDER: ACTIVE SQUAD SLOT CARD (F1-F9, D1-D4, G1-G2)
  // ==========================================
  const renderActivePlayerRow = (slot: ActiveSlotId, player?: SquadPlayer) => {
    const category = getSlotCategory(slot);
    const isGoalie = category === 'Goalies';
    const isSlotHovered = dragOverSlot === slot;
    const isSlotEligible = draggedPlayer ? isPositionEligibleForSlot(draggedPlayer.position, slot) : false;
    const isBeingDragged = !!(draggedPlayer && player && draggedPlayer.id === player.id);

    if (!player) {
      // EMPTY ACTIVE SLOT ROW
      return (
        <div
          key={slot}
          onDragOver={e => handleDragOver(e, slot)}
          onDragLeave={e => handleDragLeave(e, slot)}
          onDrop={e => handleDrop(e, slot)}
          className={`px-4 py-3 flex items-center justify-between gap-3 transition-all ${
            isSlotHovered && isSlotEligible
              ? isLight
                ? 'bg-emerald-100 border-2 border-emerald-500 ring-2 ring-emerald-400/40 text-emerald-950 scale-[1.008]'
                : 'bg-emerald-950/80 border-2 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-200 scale-[1.008]'
              : isSlotHovered && !isSlotEligible
              ? 'bg-rose-950/40 border-2 border-rose-500/60 text-rose-300 opacity-80 cursor-not-allowed'
              : draggedPlayer && isSlotEligible
              ? isLight
                ? 'bg-emerald-50/50 border border-dashed border-emerald-400/60 text-slate-700'
                : 'bg-emerald-950/20 border border-dashed border-emerald-700/60 text-emerald-300'
              : isLight
              ? 'bg-slate-50/70 hover:bg-slate-100/80 text-slate-600'
              : 'bg-slate-900/40 hover:bg-slate-900/70 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                isLight
                  ? 'bg-slate-200/80 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {slot}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Empty Active {category.slice(0, -1)} Slot
            </span>
            <span className="text-[10px] text-emerald-500/80 font-mono hidden sm:inline">
              {draggedPlayer && isSlotEligible ? '← Drop player here to activate' : '(Earns Rule 5 FP when filled)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAssignModalSlot(slot)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-emerald-50 border-slate-300 hover:border-emerald-400 text-slate-700 hover:text-emerald-800 shadow-xs'
                : 'bg-slate-800 hover:bg-emerald-950/40 border-slate-700 hover:border-emerald-700/60 text-slate-200 hover:text-emerald-300'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-emerald-500" />
            <span>Assign Player</span>
          </button>
        </div>
      );
    }

    // OCCUPIED ACTIVE PLAYER ROW
    return (
      <div
        key={slot}
        draggable={true}
        onDragStart={e => handleDragStart(e, player, slot)}
        onDragEnd={handleDragEnd}
        onDragOver={e => handleDragOver(e, slot)}
        onDragLeave={e => handleDragLeave(e, slot)}
        onDrop={e => handleDrop(e, slot)}
        className={`px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-grab active:cursor-grabbing ${
          isBeingDragged
            ? 'opacity-40 border-2 border-dashed border-cyan-400 bg-cyan-950/20'
            : isSlotHovered && isSlotEligible
            ? isLight
              ? 'bg-emerald-100 border-2 border-emerald-500 ring-2 ring-emerald-400/40 text-emerald-950 scale-[1.008]'
              : 'bg-emerald-950/80 border-2 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-200 scale-[1.008]'
            : isSlotHovered && !isSlotEligible
            ? 'bg-rose-950/40 border-2 border-rose-500/60 text-rose-300 opacity-80 cursor-not-allowed'
            : draggedPlayer && isSlotEligible
            ? isLight
              ? 'bg-emerald-50/40 border border-dashed border-emerald-300'
              : 'bg-emerald-950/20 border border-dashed border-emerald-700/60'
            : isLight
            ? 'bg-white hover:bg-slate-50/80 text-slate-900'
            : 'bg-slate-900/60 hover:bg-slate-900/90 text-white'
        }`}
      >
        {/* Left: Drag Handle + Slot + Avatar + Name + Position + Team */}
        <div className="flex items-center gap-3 min-w-0">
          <GripVertical
            className="h-4 w-4 text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
            title="Drag to swap or reorder"
          />

          <span
            className={`font-mono text-xs font-black px-2 py-1 rounded-md border shrink-0 ${
              isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
            }`}
          >
            {slot}
          </span>

          {/* Headshot / avatar */}
          {player.nhl_id ? (
            <img
              src={proxyImageUrl(`https://assets.nhle.com/mugs/nhl/latest/${player.nhl_id}.png`)}
              alt={player.player_name}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {player.player_name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-black text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {player.player_name}
              </h4>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
                  normalizePosition(player.position) === 'F'
                    ? isLight
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : normalizePosition(player.position) === 'D'
                    ? isLight
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : isLight
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}
              >
                {player.position}
              </span>

              {/* Fantasy Points Badge */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  isLight
                    ? 'bg-amber-50 text-amber-900 border-amber-200 shadow-xs'
                    : 'bg-amber-950/50 text-amber-300 border-amber-700/50'
                }`}
              >
                <Flame className="h-2.5 w-2.5 text-amber-500" />
                <span>{player.fantasy_points} FP</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {player.team_abbr}
              </span>
              <span>•</span>
              <span className="truncate max-w-[140px] sm:max-w-none">{player.team}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{player.total_games} GP</span>
            </div>
          </div>
        </div>

        {/* Middle & Right: Stats + Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {/* Detailed Stats */}
          <PlayerStats player={player} />

          {/* Action Menu */}
          <PlayerActionMenu player={player} />
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: BENCH PLAYER LIST ROW (BF1-BF3, BD1-BD2, BG1-BG2)
  // Clean List Layout - High performance list
  // ==========================================
  const renderBenchPlayerRow = (slot: BenchSlotId, player?: SquadPlayer) => {
    const category = getSlotCategory(slot);
    const isGoalie = category === 'Goalies';
    const isSlotHovered = dragOverSlot === slot;
    const isSlotEligible = draggedPlayer ? isPositionEligibleForSlot(draggedPlayer.position, slot) : false;
    const isBeingDragged = !!(draggedPlayer && player && draggedPlayer.id === player.id);

    if (!player) {
      // EMPTY BENCH SLOT ROW
      return (
        <div
          key={slot}
          onDragOver={e => handleDragOver(e, slot)}
          onDragLeave={e => handleDragLeave(e, slot)}
          onDrop={e => handleDrop(e, slot)}
          className={`px-4 py-3 flex items-center justify-between gap-3 transition-all ${
            isSlotHovered && isSlotEligible
              ? isLight
                ? 'bg-amber-100 border-2 border-amber-500 ring-2 ring-amber-400/40 text-amber-950 scale-[1.008]'
                : 'bg-amber-950/80 border-2 border-amber-500 ring-2 ring-amber-500/40 text-amber-200 scale-[1.008]'
              : isSlotHovered && !isSlotEligible
              ? 'bg-rose-950/40 border-2 border-rose-500/60 text-rose-300 opacity-80 cursor-not-allowed'
              : draggedPlayer && isSlotEligible
              ? isLight
                ? 'bg-amber-50/50 border border-dashed border-amber-400/60 text-slate-700'
                : 'bg-amber-950/20 border border-dashed border-amber-700/60 text-amber-300'
              : isLight
              ? 'bg-slate-50/60 hover:bg-slate-100/80 text-slate-600'
              : 'bg-slate-900/40 hover:bg-slate-900/70 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                isLight
                  ? 'bg-slate-200/70 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {slot}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Empty Bench {category.slice(0, -1)} Slot
            </span>
            <span className="text-[10px] text-amber-500/70 font-mono hidden sm:inline">
              {draggedPlayer && isSlotEligible ? '← Drop player here to bench' : '(0 FP on Bench)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAssignModalSlot(slot)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-amber-50 border-slate-300 hover:border-amber-400 text-slate-700 hover:text-amber-800 shadow-xs'
                : 'bg-slate-800 hover:bg-amber-950/40 border-slate-700 hover:border-amber-700/60 text-slate-200 hover:text-amber-300'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-amber-500" />
            <span>Assign Player</span>
          </button>
        </div>
      );
    }

    // OCCUPIED BENCH PLAYER ROW
    return (
      <div
        key={slot}
        draggable={true}
        onDragStart={e => handleDragStart(e, player, slot)}
        onDragEnd={handleDragEnd}
        onDragOver={e => handleDragOver(e, slot)}
        onDragLeave={e => handleDragLeave(e, slot)}
        onDrop={e => handleDrop(e, slot)}
        className={`px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-grab active:cursor-grabbing ${
          isBeingDragged
            ? 'opacity-40 border-2 border-dashed border-cyan-400 bg-cyan-950/20'
            : isSlotHovered && isSlotEligible
            ? isLight
              ? 'bg-amber-100 border-2 border-amber-500 ring-2 ring-amber-400/40 text-amber-950 scale-[1.008]'
              : 'bg-amber-950/80 border-2 border-amber-500 ring-2 ring-amber-500/40 text-amber-200 scale-[1.008]'
            : isSlotHovered && !isSlotEligible
            ? 'bg-rose-950/40 border-2 border-rose-500/60 text-rose-300 opacity-80 cursor-not-allowed'
            : draggedPlayer && isSlotEligible
            ? isLight
              ? 'bg-amber-50/40 border border-dashed border-amber-300'
              : 'bg-amber-950/20 border border-dashed border-amber-700/60'
            : isLight
            ? 'bg-white hover:bg-slate-50/80 text-slate-900'
            : 'bg-slate-900/60 hover:bg-slate-900/90 text-white'
        }`}
      >
        {/* Left: Drag Handle + Slot + Avatar + Name + Position + Team */}
        <div className="flex items-center gap-3 min-w-0">
          <GripVertical
            className="h-4 w-4 text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
            title="Drag to swap or reorder"
          />

          <span
            className={`font-mono text-xs font-black px-2 py-1 rounded-md border shrink-0 ${
              isLight
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60'
            }`}
          >
            {slot}
          </span>

          {/* Headshot / avatar */}
          {player.nhl_id ? (
            <img
              src={proxyImageUrl(`https://assets.nhle.com/mugs/nhl/latest/${player.nhl_id}.png`)}
              alt={player.player_name}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {player.player_name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className={`font-black text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {player.player_name}
              </h4>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
                  normalizePosition(player.position) === 'F'
                    ? isLight
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : normalizePosition(player.position) === 'D'
                    ? isLight
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : isLight
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                }`}
              >
                {player.position}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border hidden sm:inline ${
                  isLight
                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                0 FP • BENCH
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {player.team_abbr}
              </span>
              <span>•</span>
              <span className="truncate max-w-[140px] sm:max-w-none">{player.team}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{player.total_games} GP</span>
            </div>
          </div>
        </div>

        {/* Middle & Right: Stats + Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {/* Detailed Stats */}
          <PlayerStats player={player} />

          {/* Action Menu */}
          <PlayerActionMenu player={player} />
        </div>
      </div>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <div className={isLight ? '' : 'dark'}>
      <div
        className={`min-h-screen font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 ${
          isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
        }`}
      >
        {/* TOAST SYSTEM */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 transition-all ${
                t.type === 'error'
                  ? 'bg-rose-950 border-rose-700 text-rose-100'
                  : t.type === 'info'
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-emerald-950 border-emerald-700 text-emerald-100'
              }`}
            >
              {t.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              ) : t.type === 'info' ? (
                <Info className="h-4 w-4 text-cyan-400 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-semibold">{t.text}</span>
            </div>
          ))}
        </div>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          {/* ==========================================
              TOP HEADER & CONTROLS
          ========================================== */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-slate-800 shadow-lg shadow-black/30'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                {onNavigateBack && (
                  <button
                    type="button"
                    onClick={onNavigateBack}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer mb-2.5 ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Hub</span>
                  </button>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-6 w-6 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                    Winko's Hockey Pool
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    22-Player Main Roster
                  </span>
                </div>
                <h1 className={`text-2xl sm:text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Squad & Bench Manager
                </h1>
                <p className={`text-xs sm:text-sm mt-1 max-w-3xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Official roster structure: <strong>15 Active slots</strong> (9F, 4D, 2G earning Rule 5 FP) and{' '}
                  <strong>7 Bench slots</strong> (3BF, 2BD, 2BG earning 0 FP). Unlimited swaps permitted during the season.
                </p>
              </div>

              {/* GM Selector & Quick actions */}
              <div className="flex flex-wrap items-center gap-3">
                {/* GM Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GM:</span>
                  <div className="relative">
                    <select
                      value={selectedGm}
                      onChange={e => setSelectedGm(e.target.value)}
                      className={`appearance-none pl-3.5 pr-9 py-2 rounded-xl text-sm font-black border cursor-pointer transition-all ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-300 text-slate-900'
                          : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-white'
                      }`}
                    >
                      {PRIMARY_GMS.map(gm => (
                        <option key={gm} value={gm}>
                          GM {gm}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                  </div>
                </div>

                {/* Auto Optimize Button */}
                <button
                  type="button"
                  onClick={handleAutoOptimizeRoster}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/60 text-emerald-300'
                  }`}
                  title="Auto-fill top scorers into Active and next into Bench slots"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Auto-Optimize</span>
                </button>

                {/* Clear / Bench All */}
                <button
                  type="button"
                  onClick={handleBenchAll}
                  disabled={totalActiveCount === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="Move all active players to bench"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Bench All</span>
                </button>

                {/* Refresh sync */}
                <button
                  type="button"
                  onClick={() => loadGmRoster(selectedGm, true)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="Reload roster from database"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-emerald-500' : 'text-slate-400'}`} />
                </button>
              </div>
            </div>

            {/* Overall Roster Breakdown Banner */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-2 ${
                    totalMainRosterCount === 22
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Total Main Roster: <strong>{totalMainRosterCount} / 22</strong></span>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  Active: <strong className="text-emerald-400">{totalActiveCount}/15</strong> • Bench: <strong className="text-amber-400">{totalBenchCount}/7</strong>
                </div>
              </div>

              {/* Rule 5 Fantasy Points Total */}
              <div className="flex items-center gap-2">
                <div
                  className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono ${
                    isLight
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-amber-950/40 border-amber-700/50 text-amber-200'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-black">Active Rule 5 FP:</span>
                  <span className="text-sm font-black">{activeFantasyStats.totalFP.toLocaleString()} PTS</span>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-emerald-500 mb-4" />
              <p className="font-semibold text-sm">Loading GM {selectedGm}&apos;s roster...</p>
            </div>
          ) : (
            <>
              {/* ==========================================
                  SECTION 1: ACTIVE SQUAD (15 SLOTS MAX)
                  Earns Rule 5 Fantasy Points
              ========================================== */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 shadow-lg shadow-black/20'
                }`}
              >
                {/* Active Squad Header with Slot Counters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                        1. Active Squad (15 Slots Max)
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-bold text-amber-500">Earns Rule 5 Fantasy Points</span>
                    </div>
                    <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Active Starting Lineup
                    </h2>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Only promoted players in these 15 active slots produce fantasy points for your GM total.
                    </p>
                  </div>

                  {/* Active Slot Counter Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Active F */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                        activeFCount === 9
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      <span>Active F: <strong className={activeFCount === 9 ? 'text-emerald-400' : 'text-white'}>{activeFCount}</strong>/9</span>
                    </div>

                    {/* Active D */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                        activeDCount === 4
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span>Active D: <strong className={activeDCount === 4 ? 'text-emerald-400' : 'text-white'}>{activeDCount}</strong>/4</span>
                    </div>

                    {/* Active G */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                        activeGCount === 2
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>Active G: <strong className={activeGCount === 2 ? 'text-emerald-400' : 'text-white'}>{activeGCount}</strong>/2</span>
                    </div>

                    {/* Total Active */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-black ${
                        totalActiveCount === 15
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-xs'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      Total Active: {totalActiveCount} / 15
                    </div>
                  </div>
                </div>

                {/* ACTIVE SLOTS LIST VIEW (Clean List Layout with Drag & Drop) */}
                <div className="mt-6 space-y-6">
                  {/* Active Forwards (F1 to F9) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          Active Forwards (9 Slots: F1 - F9)
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {activeFCount} / 9 Filled
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      {ACTIVE_FORWARD_SLOTS.map(slot => renderActivePlayerRow(slot, activeSlotMap.get(slot)))}
                    </div>
                  </div>

                  {/* Bench Forwards (BF1 to BF3) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          Bench Forwards (3 Slots: BF1 - BF3)
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {benchFCount} / 3 Filled
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      {BENCH_FORWARD_SLOTS.map(slot => renderBenchPlayerRow(slot, benchSlotMap.get(slot)))}
                    </div>
                  </div>

                  {/* Active Defense (D1 to D4) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          Active Defensemen (4 Slots: D1 - D4)
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {activeDCount} / 4 Filled
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      {ACTIVE_DEFENSE_SLOTS.map(slot => renderActivePlayerRow(slot, activeSlotMap.get(slot)))}
                    </div>
                  </div>

                  {/* Bench Defense (BD1 to BD2) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          Bench Defensemen (2 Slots: BD1 - BD2)
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {benchDCount} / 2 Filled
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      {BENCH_DEFENSE_SLOTS.map(slot => renderBenchPlayerRow(slot, benchSlotMap.get(slot)))}
                    </div>
                  </div>

                  {/* Active Goalies (G1 to G2) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-400" />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          Active Goalies (2 Slots: G1 - G2)
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {activeGCount} / 2 Filled
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      {ACTIVE_GOALIE_SLOTS.map(slot => renderActivePlayerRow(slot, activeSlotMap.get(slot)))}
                    </div>
                  </div>

                  {/* Bench Goalies (BG1 to BG2) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-400" />
                        <h3 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          Bench Goalies (2 Slots: BG1 - BG2)
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {benchGCount} / 2 Filled
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                      {BENCH_GOALIE_SLOTS.map(slot => renderBenchPlayerRow(slot, benchSlotMap.get(slot)))}
                    </div>
                  </div>
                </div>
              </div>


                {/* UNASSIGNED RESERVES (If GM has additional drafted/promoted & protected players waiting for slots) */}
                {unassignedBenchPlayers.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Unassigned Reserves ({unassignedBenchPlayers.length})
                        </h4>
                        <p className="text-xs text-slate-400">
                          Drafted and Promoted &amp; Protected players waiting to be placed into Active or Bench slots.
                        </p>
                      </div>
                    </div>

                    <div
                      onDragOver={e => {
                        if (draggedSourceSlot) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }
                      }}
                      onDrop={handleDropToReserve}
                      className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
                    >
                      {unassignedBenchPlayers.map(player => {
                        const norm = normalizePosition(player.position);
                        const openActSlot = (norm === 'F' ? ACTIVE_FORWARD_SLOTS : norm === 'D' ? ACTIVE_DEFENSE_SLOTS : ACTIVE_GOALIE_SLOTS).find(s => !activeSlotMap.has(s));
                        const openBchSlot = (norm === 'F' ? BENCH_FORWARD_SLOTS : norm === 'D' ? BENCH_DEFENSE_SLOTS : BENCH_GOALIE_SLOTS).find(s => !benchSlotMap.has(s));
                        const isBeingDragged = draggedPlayer?.id === player.id;

                        return (
                          <div
                            key={player.id}
                            draggable={true}
                            onDragStart={e => handleDragStart(e, player, null)}
                            onDragEnd={handleDragEnd}
                            className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-grab active:cursor-grabbing transition-all ${
                              isBeingDragged
                                ? 'opacity-40 border-2 border-dashed border-cyan-400 bg-cyan-950/20'
                                : isLight
                                ? 'bg-slate-50/60 hover:bg-slate-100/80 text-slate-900'
                                : 'bg-slate-950/60 hover:bg-slate-900/80 text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <GripVertical
                                className="h-4 w-4 text-slate-400 hover:text-slate-200 cursor-grab active:cursor-grabbing shrink-0"
                                title="Drag player into Active or Bench slot"
                              />

                              <span className={`text-[10px] font-black px-2 py-0.5 rounded border shrink-0 ${
                                norm === 'F' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : norm === 'D' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}>
                                {player.position}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{player.player_name}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {player.team_abbr} • {player.team} • {player.fantasy_points} FP
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {openActSlot ? (
                                <button
                                  type="button"
                                  onClick={() => handleSwapToSlot(player, openActSlot)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  title={`Activate into open ${openActSlot}`}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                  <span>Activate ({openActSlot})</span>
                                </button>
                              ) : openBchSlot ? (
                                <button
                                  type="button"
                                  onClick={() => handleSwapToSlot(player, openBchSlot)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  title={`Place in bench ${openBchSlot}`}
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Bench ({openBchSlot})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSwapModalPlayer(player)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <ArrowUpDown className="h-3 w-3 text-cyan-400" />
                                  <span>Swap In</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              {/* ==========================================
                  SECTION 3: PROSPECT POOL / FARM
                  Non-promoted developing prospects
              ========================================== */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800 shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                        3. Prospect Pool / Farm
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-400">In Development</span>
                    </div>
                    <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Prospect Pool / Farm ({farmPlayers.length})
                    </h3>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Non-promoted or non-protected prospects stay in the Farm section. They cannot occupy Active or Bench slots until they are both promoted and protected.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFarmSection(prev => !prev)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    }`}
                  >
                    {showFarmSection ? 'Hide Farm Prospects' : `View Farm Prospects (${farmPlayers.length})`}
                  </button>
                </div>

                {showFarmSection && (
                  <div className="mt-4">
                    {farmPlayers.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <p className="font-semibold">No developing prospects in the farm pool.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {farmPlayers.map(prospect => (
                          <div
                            key={prospect.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800/90'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs truncate text-slate-200">
                                  {prospect.player_name}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  {prospect.position}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {prospect.team_abbr} • {prospect.total_games} NHL GP • {prospect.promoted ? 'Promoted (Unprotected)' : 'In Development'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handlePromoteFarmProspect(prospect)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all cursor-pointer shrink-0"
                              title={prospect.promoted ? "Protect prospect to make eligible for roster" : "Promote prospect to make eligible for Bench & Active roster"}
                            >
                              {prospect.promoted ? 'Protect' : 'Promote'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* ==========================================
            MODAL: ASSIGN PLAYER TO EMPTY SLOT
        ========================================== */}
        {assignModalSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div
              className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Plus className="h-5 w-5 text-emerald-500" />
                    <span>Assign to Slot {assignModalSlot}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select an eligible promoted {getSlotCategory(assignModalSlot).toLowerCase()} to occupy this slot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalSlot(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Eligible Players List */}
              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {rosterEligiblePlayers.filter(p => isPositionEligibleForSlot(p.position, assignModalSlot)).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <p className="font-semibold">No eligible promoted {getSlotCategory(assignModalSlot).toLowerCase()} available.</p>
                    <p className="mt-1">
                      Promote developing prospects in your Farm Pool to make them eligible.
                    </p>
                  </div>
                ) : (
                  rosterEligiblePlayers
                    .filter(p => isPositionEligibleForSlot(p.position, assignModalSlot))
                    .sort((a, b) => b.fantasy_points - a.fantasy_points)
                    .map(player => (
                      <div
                        key={player.id}
                        onClick={() => handleSwapToSlot(player, assignModalSlot)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isLight
                            ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-400'
                            : 'bg-slate-950/70 hover:bg-emerald-950/40 border-slate-800 hover:border-emerald-600/60'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-black">{player.player_name}</div>
                          <div className="text-[11px] text-slate-400">
                            {player.team_abbr} • {player.position} •{' '}
                            <span className="text-amber-400 font-mono font-bold">
                              {player.slot_position ? `Currently in ${player.slot_position}` : 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-black text-amber-500">
                            {player.fantasy_points} FP
                          </span>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL: UNLIMITED SWAP ENGINE
            Swap between Bench and Active slots
        ========================================== */}
        {swapModalPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div
              className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl transition-all ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5 text-cyan-400" />
                    <span>Swap {swapModalPlayer.player_name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Currently in <strong className="text-emerald-400 font-mono">{swapModalPlayer.slot_position}</strong> ({swapModalPlayer.position}) • Swap with any eligible slot below:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSwapModalPlayer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-96 overflow-y-auto space-y-4">
                {/* 1. Eligible Active Slots */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Active Starting Slots (Earns Rule 5 FP)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {(normalizePosition(swapModalPlayer.position) === 'F'
                      ? ACTIVE_FORWARD_SLOTS
                      : normalizePosition(swapModalPlayer.position) === 'D'
                      ? ACTIVE_DEFENSE_SLOTS
                      : ACTIVE_GOALIE_SLOTS
                    ).map(slot => {
                      const occupant = activeSlotMap.get(slot);
                      const isCurrent = swapModalPlayer.slot_position === slot;

                      return (
                        <div
                          key={slot}
                          onClick={() => {
                            if (!isCurrent) handleSwapToSlot(swapModalPlayer, slot);
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            isCurrent
                              ? 'bg-slate-800/40 border-slate-700/50 opacity-60 cursor-default'
                              : isLight
                              ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-400 cursor-pointer'
                              : 'bg-slate-950/70 hover:bg-emerald-950/40 border-slate-800 hover:border-emerald-600/60 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                              {slot}
                            </span>
                            {occupant ? (
                              <div>
                                <span className="font-bold text-xs">{occupant.player_name}</span>
                                <span className="text-[11px] text-slate-400 ml-1.5">
                                  ({occupant.team_abbr} • {occupant.fantasy_points} FP)
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Empty Slot (Move directly)</span>
                            )}
                          </div>

                          {!isCurrent && (
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            >
                              {occupant ? 'Swap' : 'Move In'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Eligible Bench Slots */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Bench Reserve Slots (0 FP)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {(normalizePosition(swapModalPlayer.position) === 'F'
                      ? BENCH_FORWARD_SLOTS
                      : normalizePosition(swapModalPlayer.position) === 'D'
                      ? BENCH_DEFENSE_SLOTS
                      : BENCH_GOALIE_SLOTS
                    ).map(slot => {
                      const occupant = benchSlotMap.get(slot);
                      const isCurrent = swapModalPlayer.slot_position === slot;

                      return (
                        <div
                          key={slot}
                          onClick={() => {
                            if (!isCurrent) handleSwapToSlot(swapModalPlayer, slot);
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            isCurrent
                              ? 'bg-slate-800/40 border-slate-700/50 opacity-60 cursor-default'
                              : isLight
                              ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-400 cursor-pointer'
                              : 'bg-slate-950/70 hover:bg-amber-950/40 border-slate-800 hover:border-amber-600/60 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                              {slot}
                            </span>
                            {occupant ? (
                              <div>
                                <span className="font-bold text-xs">{occupant.player_name}</span>
                                <span className="text-[11px] text-slate-400 ml-1.5">
                                  ({occupant.team_abbr} • 0 FP Bench)
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Empty Bench Slot</span>
                            )}
                          </div>

                          {!isCurrent && (
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 font-black cursor-pointer"
                            >
                              {occupant ? 'Swap' : 'Place on Bench'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSquadManager;
