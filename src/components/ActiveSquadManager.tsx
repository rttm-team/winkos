import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateFantasyPoints, NHL_TEAMS_MAP } from '../data/mockData';
import { proxyImageUrl } from '../lib/utils';
import {
  Shield,
  Users,
  Trophy,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Search,
  Filter,
  Plus,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Lock,
  Unlock,
  Info,
  X,
  UserCheck,
  Activity,
  Flame,
  Moon,
  Sun,
  ArrowLeft,
} from 'lucide-react';

// ==========================================
// TYPES & CONSTANTS
// ==========================================

export type SlotCategory = 'Forwards' | 'Defense' | 'Goalies';

export const FORWARD_SLOTS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'] as const;
export const DEFENSE_SLOTS = ['D1', 'D2', 'D3', 'D4'] as const;
export const GOALIE_SLOTS = ['G1', 'G2'] as const;

export const ALL_ACTIVE_SLOTS = [
  ...FORWARD_SLOTS,
  ...DEFENSE_SLOTS,
  ...GOALIE_SLOTS,
] as const;

export type ActiveSlotId = (typeof ALL_ACTIVE_SLOTS)[number];

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
  nhl_id?: number | string | null;
  fantasy_points: number;
  plus_minus: number;
  pim: number;
  shots: number;
  power_play_points: number;
  shorthanded_points: number;
  game_winning_goals: number;
  gm_name: string;
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
  return 'F'; // Center, Left Wing, Right Wing, Forward
}

export function isPositionEligibleForSlot(position: string, slot: string): boolean {
  const norm = normalizePosition(position);
  if (slot.startsWith('F')) return norm === 'F';
  if (slot.startsWith('D')) return norm === 'D';
  if (slot.startsWith('G')) return norm === 'G';
  return false;
}

export function getSlotCategory(slot: string): SlotCategory {
  if (slot.startsWith('F')) return 'Forwards';
  if (slot.startsWith('D')) return 'Defense';
  return 'Goalies';
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
  initialGm,
  theme,
  onNavigateBack,
}) => {
  // Theme state (inherits from prop, pool or localStorage, toggleable)
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (theme) return theme === 'light';
    try {
      return localStorage.getItem('winkos_theme') !== 'dark';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (theme) {
      setIsLight(theme === 'light');
    }
  }, [theme]);

  // GM Selector
  const [selectedGm, setSelectedGm] = useState<string>(initialGm || 'Adam');

  useEffect(() => {
    if (initialGm) {
      setSelectedGm(initialGm);
    }
  }, [initialGm]);

  // Roster state
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals & User Interaction state
  const [assignModalSlot, setAssignModalSlot] = useState<ActiveSlotId | null>(null);
  const [swapModalPlayer, setSwapModalPlayer] = useState<SquadPlayer | null>(null);

  // Bench & Farm view controls
  const [benchTab, setBenchTab] = useState<'bench' | 'farm'>('bench');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [posFilter, setPosFilter] = useState<'ALL' | 'F' | 'D' | 'G'>('ALL');

  // Show Toast
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Fetch roster from Supabase
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

        const mapped: SquadPlayer[] = (data || []).map((row: any) => {
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

          const fp = calculateFantasyPoints(rawStats);

          return {
            id: row.id,
            player_name: name,
            position: row.position || 'F',
            team: teamInfo.team,
            team_abbr: teamInfo.abbr,
            roster_status: row.roster_status || (row.promoted ? 'BENCH' : 'PROSPECT_POOL'),
            slot_position: row.slot_position || (row.promoted ? 'BENCH' : 'FARM'),
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
            nhl_id: row.nhl_id,
            fantasy_points: fp,
            plus_minus: rawStats.plus_minus,
            pim: rawStats.pim,
            shots: rawStats.shots,
            power_play_points: rawStats.power_play_points,
            shorthanded_points: rawStats.shorthanded_points,
            game_winning_goals: rawStats.game_winning_goals,
            gm_name: row.gm_name,
          };
        });

        setPlayers(mapped);
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

  // Map of active players by slot position
  const activeSlotMap = useMemo(() => {
    const map = new Map<string, SquadPlayer>();
    players.forEach(p => {
      if (p.roster_status === 'ACTIVE' && p.slot_position) {
        map.set(p.slot_position, p);
      }
    });
    return map;
  }, [players]);

  // Counters
  const forwardCount = useMemo(() => {
    return FORWARD_SLOTS.filter(s => activeSlotMap.has(s)).length;
  }, [activeSlotMap]);

  const defenseCount = useMemo(() => {
    return DEFENSE_SLOTS.filter(s => activeSlotMap.has(s)).length;
  }, [activeSlotMap]);

  const goalieCount = useMemo(() => {
    return GOALIE_SLOTS.filter(s => activeSlotMap.has(s)).length;
  }, [activeSlotMap]);

  const totalActiveCount = forwardCount + defenseCount + goalieCount;

  // Promoted Bench players
  const benchPlayers = useMemo(() => {
    return players.filter(p => p.roster_status === 'BENCH' && p.promoted);
  }, [players]);

  // Farm / Prospect Pool players (non-promoted or explicit farm)
  const farmPlayers = useMemo(() => {
    return players.filter(p => !p.promoted || p.roster_status === 'PROSPECT_POOL');
  }, [players]);

  // Rule 5 Fantasy Points Summary for the 15 active slots
  const activeFantasyStats = useMemo(() => {
    let skaterFP = 0;
    let goalieFP = 0;
    let topPlayer: SquadPlayer | null = null;
    let maxFP = -Infinity;

    activeSlotMap.forEach(player => {
      const norm = normalizePosition(player.position);
      if (norm === 'G') {
        goalieFP += player.fantasy_points;
      } else {
        skaterFP += player.fantasy_points;
      }

      if (player.fantasy_points > maxFP) {
        maxFP = player.fantasy_points;
        topPlayer = player;
      }
    });

    const totalFP = skaterFP + goalieFP;
    const avgFP = totalActiveCount > 0 ? Math.round(totalFP / totalActiveCount) : 0;

    return {
      totalFP,
      skaterFP,
      goalieFP,
      avgFP,
      topPlayer,
    };
  }, [activeSlotMap, totalActiveCount]);

  // ==========================================
  // ROSTER MUTATIONS (Optimistic + Supabase)
  // ==========================================

  // 1. Move Active Player to Bench
  const handleBenchPlayer = async (player: SquadPlayer) => {
    const prevPlayers = [...players];
    const oldSlot = player.slot_position;

    // Optimistic update
    setPlayers(current =>
      current.map(p =>
        p.id === player.id
          ? { ...p, roster_status: 'BENCH', slot_position: 'BENCH' }
          : p
      )
    );
    addToast(`${player.player_name} moved from ${oldSlot} to Bench.`, 'info');

    try {
      const { error } = await supabase
        .from('prospects')
        .update({
          roster_status: 'BENCH',
          slot_position: 'BENCH',
        })
        .eq('id', player.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Bench error:', err);
      setPlayers(prevPlayers);
      addToast(`Error benching player: ${err.message}`, 'error');
    }
  };

  // 2. Assign Bench Player to Slot
  const handleAssignToSlot = async (player: SquadPlayer, targetSlot: ActiveSlotId) => {
    if (!player.promoted) {
      addToast(`${player.player_name} is not promoted! Only promoted prospects can be activated.`, 'error');
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
    const existingOccupant = activeSlotMap.get(targetSlot);

    // Optimistic update
    setPlayers(current =>
      current.map(p => {
        if (p.id === player.id) {
          return { ...p, roster_status: 'ACTIVE', slot_position: targetSlot };
        }
        // If someone was occupying this slot, move them to bench
        if (existingOccupant && p.id === existingOccupant.id) {
          return { ...p, roster_status: 'BENCH', slot_position: 'BENCH' };
        }
        return p;
      })
    );

    setAssignModalSlot(null);
    addToast(`${player.player_name} activated into slot ${targetSlot}!`, 'success');

    try {
      // 1. Update player
      const { error: err1 } = await supabase
        .from('prospects')
        .update({
          roster_status: 'ACTIVE',
          slot_position: targetSlot,
        })
        .eq('id', player.id);

      if (err1) throw err1;

      // 2. If occupant existed, bench them in DB
      if (existingOccupant) {
        const { error: err2 } = await supabase
          .from('prospects')
          .update({
            roster_status: 'BENCH',
            slot_position: 'BENCH',
          })
          .eq('id', existingOccupant.id);

        if (err2) throw err2;
      }
    } catch (err: any) {
      console.error('Slot assign error:', err);
      setPlayers(prevPlayers);
      addToast(`Failed to assign slot: ${err.message}`, 'error');
    }
  };

  // 3. Swap Two Players (Active <-> Bench OR Active <-> Active)
  const handleSwapPlayers = async (playerA: SquadPlayer, playerB: SquadPlayer) => {
    const prevPlayers = [...players];
    setSwapModalPlayer(null);

    // Check position eligibility if one or both are going to active slots
    const slotA = playerA.slot_position;
    const slotB = playerB.slot_position;

    const isSlotAActive = ALL_ACTIVE_SLOTS.includes(slotA as any);
    const isSlotBActive = ALL_ACTIVE_SLOTS.includes(slotB as any);

    if (isSlotAActive && !isPositionEligibleForSlot(playerB.position, slotA)) {
      addToast(`${playerB.player_name} cannot play slot ${slotA}.`, 'error');
      return;
    }
    if (isSlotBActive && !isPositionEligibleForSlot(playerA.position, slotB)) {
      addToast(`${playerA.player_name} cannot play slot ${slotB}.`, 'error');
      return;
    }

    // Determine target states
    const targetStatusA = isSlotBActive ? 'ACTIVE' : 'BENCH';
    const targetSlotA = slotB;

    const targetStatusB = isSlotAActive ? 'ACTIVE' : 'BENCH';
    const targetSlotB = slotA;

    // Optimistic
    setPlayers(current =>
      current.map(p => {
        if (p.id === playerA.id) {
          return { ...p, roster_status: targetStatusA, slot_position: targetSlotA };
        }
        if (p.id === playerB.id) {
          return { ...p, roster_status: targetStatusB, slot_position: targetSlotB };
        }
        return p;
      })
    );

    addToast(`Swapped ${playerA.player_name} with ${playerB.player_name}!`, 'success');

    try {
      const [resA, resB] = await Promise.all([
        supabase
          .from('prospects')
          .update({ roster_status: targetStatusA, slot_position: targetSlotA })
          .eq('id', playerA.id),
        supabase
          .from('prospects')
          .update({ roster_status: targetStatusB, slot_position: targetSlotB })
          .eq('id', playerB.id),
      ]);

      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;
    } catch (err: any) {
      console.error('Swap error:', err);
      setPlayers(prevPlayers);
      addToast(`Swap failed: ${err.message}`, 'error');
    }
  };

  // 4. Auto-Fill Open Lineup Slots with Top Promoted Bench Players
  const handleAutoFill = async () => {
    const emptyForwards = FORWARD_SLOTS.filter(s => !activeSlotMap.has(s));
    const emptyDefense = DEFENSE_SLOTS.filter(s => !activeSlotMap.has(s));
    const emptyGoalies = GOALIE_SLOTS.filter(s => !activeSlotMap.has(s));

    if (emptyForwards.length === 0 && emptyDefense.length === 0 && emptyGoalies.length === 0) {
      addToast('All 15 active slots are already full!', 'info');
      return;
    }

    const availableBench = [...benchPlayers].sort((a, b) => b.fantasy_points - a.fantasy_points);
    const updates: { id: string | number; slot: string; name: string }[] = [];

    // Fill Forwards
    const benchF = availableBench.filter(p => normalizePosition(p.position) === 'F');
    emptyForwards.forEach((slot, idx) => {
      if (benchF[idx]) {
        updates.push({ id: benchF[idx].id, slot, name: benchF[idx].player_name });
      }
    });

    // Fill Defense
    const benchD = availableBench.filter(p => normalizePosition(p.position) === 'D');
    emptyDefense.forEach((slot, idx) => {
      if (benchD[idx]) {
        updates.push({ id: benchD[idx].id, slot, name: benchD[idx].player_name });
      }
    });

    // Fill Goalies
    const benchG = availableBench.filter(p => normalizePosition(p.position) === 'G');
    emptyGoalies.forEach((slot, idx) => {
      if (benchG[idx]) {
        updates.push({ id: benchG[idx].id, slot, name: benchG[idx].player_name });
      }
    });

    if (updates.length === 0) {
      addToast('No eligible promoted bench players available to auto-fill!', 'info');
      return;
    }

    const prevPlayers = [...players];

    // Optimistic
    setPlayers(current =>
      current.map(p => {
        const u = updates.find(item => item.id === p.id);
        if (u) {
          return { ...p, roster_status: 'ACTIVE', slot_position: u.slot };
        }
        return p;
      })
    );

    addToast(`Auto-filled ${updates.length} open slot(s) with top performers!`, 'success');

    try {
      for (const u of updates) {
        await supabase
          .from('prospects')
          .update({ roster_status: 'ACTIVE', slot_position: u.slot })
          .eq('id', u.id);
      }
    } catch (err: any) {
      console.error('Auto fill error:', err);
      setPlayers(prevPlayers);
      addToast(`Auto-fill error: ${err.message}`, 'error');
    }
  };

  // 5. Bench All Active Players
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

  // 6. Promote Farm Prospect to Bench
  const handlePromoteToBench = async (player: SquadPlayer) => {
    const prevPlayers = [...players];

    setPlayers(current =>
      current.map(p =>
        p.id === player.id
          ? { ...p, promoted: true, roster_status: 'BENCH', slot_position: 'BENCH' }
          : p
      )
    );
    addToast(`${player.player_name} promoted! Now eligible for Active Squad.`, 'success');

    try {
      const { error } = await supabase
        .from('prospects')
        .update({
          promoted: true,
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

  // Filtered bench / farm lists
  const filteredSubRoster = useMemo(() => {
    const base = benchTab === 'bench' ? benchPlayers : farmPlayers;
    return base.filter(p => {
      const matchesSearch =
        p.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.team_abbr.toLowerCase().includes(searchQuery.toLowerCase());

      const norm = normalizePosition(p.position);
      const matchesPos = posFilter === 'ALL' || norm === posFilter;

      return matchesSearch && matchesPos;
    });
  }, [benchTab, benchPlayers, farmPlayers, searchQuery, posFilter]);

  // ==========================================
  // RENDER: INDIVIDUAL SLOT CARD
  // ==========================================
  const renderSlotCard = (slot: ActiveSlotId) => {
    const player = activeSlotMap.get(slot);
    const category = getSlotCategory(slot);
    const isGoalie = category === 'Goalies';

    if (!player) {
      // EMPTY SLOT
      return (
        <div
          key={slot}
          className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 border-dashed transition-all duration-200 ${
            isLight
              ? 'bg-slate-50/70 border-slate-300 hover:border-emerald-500/70 hover:bg-emerald-50/20 text-slate-600'
              : 'bg-slate-900/40 border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-950/20 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                isLight
                  ? 'bg-slate-200/80 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-400 border-slate-700/80'
              }`}
            >
              {slot}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Empty {category.slice(0, -1)}
            </span>
          </div>

          <div className="my-5 text-center">
            <p className="text-xs font-medium text-slate-400">Slot Unassigned</p>
          </div>

          <button
            type="button"
            onClick={() => setAssignModalSlot(slot)}
            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-white border border-slate-300 text-slate-800 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 shadow-xs'
                : 'bg-slate-800/80 border border-slate-700 text-slate-200 hover:border-emerald-500 hover:bg-emerald-950/40 hover:text-emerald-300'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-emerald-500" />
            <span>Assign Player</span>
          </button>
        </div>
      );
    }

    // OCCUPIED SLOT CARD (Matching ProspectCard UI Design Language)
    return (
      <div
        key={slot}
        className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 ${
          isLight
            ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md'
            : 'bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 hover:border-slate-700 shadow-md shadow-black/30'
        }`}
      >
        {/* Top bar: Slot pill + NHL Team badge + Fantasy Points Pill */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border tracking-wide ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              }`}
            >
              {slot}
            </span>

            {/* Position Pill */}
            <span
              className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${
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
          </div>

          {/* Rule 5 Fantasy Points */}
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-black border tabular-nums ${
              isLight
                ? 'bg-amber-50 text-amber-900 border-amber-200 shadow-xs'
                : 'bg-amber-950/40 text-amber-300 border-amber-700/40'
            }`}
            title="Rule 5 Fantasy Points"
          >
            <Flame className="h-3 w-3 text-amber-500" />
            <span>{player.fantasy_points} FP</span>
          </div>
        </div>

        {/* Player Info Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar / Headshot */}
          {player.nhl_id ? (
            <img
              src={proxyImageUrl(`https://assets.nhle.com/mugs/nhl/latest/${player.nhl_id}.png`)}
              alt={player.player_name}
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {player.player_name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4
              className={`font-black text-sm truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
              title={player.player_name}
            >
              {player.player_name}
            </h4>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {player.team_abbr}
              </span>
              <span>•</span>
              <span className="truncate">{player.team}</span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {player.total_games} Total NHL GP
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          className={`grid grid-cols-4 gap-1 p-2 rounded-xl border text-center mb-3 text-xs ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
          }`}
        >
          {isGoalie ? (
            <>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">W</div>
                <div className="font-black font-mono mt-0.5 text-emerald-500">{player.wins}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">SO</div>
                <div className="font-black font-mono mt-0.5 text-cyan-500">{player.shutouts}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">SV</div>
                <div className="font-black font-mono mt-0.5">{player.saves}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">SV%</div>
                <div className="font-black font-mono mt-0.5">
                  {formatSavePercentage(player.save_pct)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">G</div>
                <div className="font-black font-mono mt-0.5 text-emerald-500">{player.goals}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">A</div>
                <div className="font-black font-mono mt-0.5 text-cyan-500">{player.assists}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">PTS</div>
                <div className="font-black font-mono mt-0.5 text-amber-500">{player.points}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase text-slate-400">+/-</div>
                <div className="font-black font-mono mt-0.5">{player.plus_minus}</div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons: Bench / Swap */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSwapModalPlayer(player)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="Swap with bench player or another slot"
          >
            <ArrowUpDown className="h-3 w-3 text-cyan-400" />
            <span>Swap</span>
          </button>

          <button
            type="button"
            onClick={() => handleBenchPlayer(player)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                : 'bg-rose-950/30 hover:bg-rose-900/50 border-rose-800/40 text-rose-300'
            }`}
            title="Move player to Bench"
          >
            <ArrowRight className="h-3 w-3" />
            <span>Bench</span>
          </button>
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

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
                  <span className="text-xs font-semibold text-slate-400">Rule 5 Lineup Roster</span>
                </div>
                <h1 className={`text-2xl sm:text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Active Squad Manager
                </h1>
                <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Configure your 15-man active starting lineup (9F, 4D, 2G). Only promoted prospects can occupy
                  active slots to produce Rule 5 Fantasy Points.
                </p>
              </div>

              {/* GM Selector & Utility actions */}
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

                {/* Auto Fill Button */}
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/60 text-emerald-300'
                  }`}
                  title="Auto-fill open slots with highest-scoring promoted bench players"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Auto-Fill Open</span>
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

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLight(prev => !prev)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="Toggle Light / Dark mode"
                >
                  {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
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

            {/* ==========================================
                SLOT COUNTER HEADER & RULE 5 SUMMARY
            ========================================== */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Slot Counter: Forwards */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  forwardCount === 9
                    ? isLight
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-emerald-950/30 border-emerald-700/50'
                    : forwardCount > 9
                    ? isLight
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-rose-950/40 border-rose-700/50'
                    : isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Forwards</div>
                  <div className="text-lg font-black font-mono">
                    <span
                      className={
                        forwardCount === 9
                          ? 'text-emerald-500'
                          : forwardCount > 9
                          ? 'text-rose-500'
                          : isLight
                          ? 'text-slate-800'
                          : 'text-slate-200'
                      }
                    >
                      {forwardCount}
                    </span>{' '}
                    <span className="text-slate-500 text-xs">/ 9 Required</span>
                  </div>
                </div>
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                    forwardCount === 9
                      ? 'bg-emerald-500 text-white'
                      : forwardCount > 9
                      ? 'bg-rose-500 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  F
                </div>
              </div>

              {/* Slot Counter: Defense */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  defenseCount === 4
                    ? isLight
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-emerald-950/30 border-emerald-700/50'
                    : defenseCount > 4
                    ? isLight
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-rose-950/40 border-rose-700/50'
                    : isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Defense</div>
                  <div className="text-lg font-black font-mono">
                    <span
                      className={
                        defenseCount === 4
                          ? 'text-emerald-500'
                          : defenseCount > 4
                          ? 'text-rose-500'
                          : isLight
                          ? 'text-slate-800'
                          : 'text-slate-200'
                      }
                    >
                      {defenseCount}
                    </span>{' '}
                    <span className="text-slate-500 text-xs">/ 4 Required</span>
                  </div>
                </div>
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                    defenseCount === 4
                      ? 'bg-emerald-500 text-white'
                      : defenseCount > 4
                      ? 'bg-rose-500 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  D
                </div>
              </div>

              {/* Slot Counter: Goalies */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  goalieCount === 2
                    ? isLight
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-emerald-950/30 border-emerald-700/50'
                    : goalieCount > 2
                    ? isLight
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-rose-950/40 border-rose-700/50'
                    : isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">Goalies</div>
                  <div className="text-lg font-black font-mono">
                    <span
                      className={
                        goalieCount === 2
                          ? 'text-emerald-500'
                          : goalieCount > 2
                          ? 'text-rose-500'
                          : isLight
                          ? 'text-slate-800'
                          : 'text-slate-200'
                      }
                    >
                      {goalieCount}
                    </span>{' '}
                    <span className="text-slate-500 text-xs">/ 2 Required</span>
                  </div>
                </div>
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                    goalieCount === 2
                      ? 'bg-emerald-500 text-white'
                      : goalieCount > 2
                      ? 'bg-rose-500 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  G
                </div>
              </div>

              {/* Combined Rule 5 Fantasy Points */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isLight
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200 text-amber-950 shadow-xs'
                    : 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-700/50 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Trophy className="h-3 w-3" />
                    <span>Active Rule 5 FP</span>
                  </div>
                  <div className="text-xl font-black font-mono mt-0.5 tracking-tight">
                    {activeFantasyStats.totalFP.toLocaleString()} <span className="text-xs font-bold">PTS</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Skaters: {activeFantasyStats.skaterFP} | Goalies: {activeFantasyStats.goalieFP}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      totalActiveCount === 15
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {totalActiveCount}/15 Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ==========================================
              15 ACTIVE SLOTS GRID
          ========================================== */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-emerald-500 mb-4" />
              <p className="font-semibold text-sm">Loading GM {selectedGm}'s squad...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* SECTION 1: FORWARDS (F1 - F9) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <h3 className={`text-base font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Active Forwards (9 Slots)
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {forwardCount} / 9 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FORWARD_SLOTS.map(slot => renderSlotCard(slot))}
                </div>
              </div>

              {/* SECTION 2: DEFENSE (D1 - D4) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <h3 className={`text-base font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Active Defensemen (4 Slots)
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {defenseCount} / 4 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {DEFENSE_SLOTS.map(slot => renderSlotCard(slot))}
                </div>
              </div>

              {/* SECTION 3: GOALIES (G1 - G2) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                    <h3 className={`text-base font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Active Goalies (2 Slots)
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {goalieCount} / 2 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {GOALIE_SLOTS.map(slot => renderSlotCard(slot))}
                </div>
              </div>

              {/* ==========================================
                  BENCH & FARM ROSTER SECTION
              ========================================== */}
              <div
                className={`p-6 rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 shadow-lg shadow-black/20'
                }`}
              >
                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Reserve Roster & Prospect Pool
                    </h3>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Manage promoted bench reserves and your underlying non-promoted prospect pool.
                    </p>
                  </div>

                  {/* Tabs: Bench vs Farm */}
                  <div
                    className={`inline-flex p-1 rounded-xl border ${
                      isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setBenchTab('bench')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        benchTab === 'bench'
                          ? isLight
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'bg-slate-800 text-emerald-400 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Promoted Bench ({benchPlayers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBenchTab('farm')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        benchTab === 'farm'
                          ? isLight
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'bg-slate-800 text-emerald-400 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Prospect Pool / Farm ({farmPlayers.length})
                    </button>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search players or teams..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border transition-all ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                          : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                      }`}
                    />
                  </div>

                  {/* Position Filter Pills */}
                  <div className="flex items-center gap-1.5">
                    {(['ALL', 'F', 'D', 'G'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPosFilter(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          posFilter === p
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                            : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List Table / Cards */}
                <div className="mt-4 overflow-x-auto">
                  {filteredSubRoster.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <p className="font-semibold">No players match the selected filter.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead
                        className={`border-b text-[10px] font-black uppercase tracking-wider ${
                          isLight
                            ? 'bg-slate-50 text-slate-500 border-slate-200'
                            : 'bg-slate-950/80 text-slate-400 border-slate-800'
                        }`}
                      >
                        <tr>
                          <th className="px-4 py-3">Player</th>
                          <th className="px-4 py-3 text-center">Pos</th>
                          <th className="px-4 py-3">NHL Team</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">NHL GP</th>
                          <th className="px-4 py-3 text-center">Stats</th>
                          <th className="px-4 py-3 text-center">Rule 5 FP</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                        {filteredSubRoster.map(player => {
                          const normPos = normalizePosition(player.position);
                          const isGoalie = normPos === 'G';

                          return (
                            <tr
                              key={player.id}
                              className={`transition-colors ${
                                isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="px-4 py-3 font-bold">
                                <div className="flex items-center gap-2.5">
                                  {player.nhl_id ? (
                                    <img
                                      src={proxyImageUrl(
                                        `https://assets.nhle.com/mugs/nhl/latest/${player.nhl_id}.png`
                                      )}
                                      alt={player.player_name}
                                      referrerPolicy="no-referrer"
                                      className="h-7 w-7 rounded-lg object-cover bg-slate-800 border border-slate-700 shrink-0"
                                      onError={e => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[10px] bg-slate-800 text-slate-400 shrink-0">
                                      {player.player_name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className={`font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                      {player.player_name}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                    normPos === 'F'
                                      ? isLight
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      : normPos === 'D'
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
                              </td>

                              <td className="px-4 py-3 text-slate-400">
                                <span className="font-semibold text-slate-500">{player.team_abbr}</span>{' '}
                                <span className="text-[11px]">({player.team})</span>
                              </td>

                              <td className="px-4 py-3 text-center">
                                {player.promoted ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Eligible Bench
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-full">
                                    <Lock className="h-3 w-3 text-amber-400" />
                                    Farm Prospect
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center font-mono font-bold">
                                {player.total_games}
                              </td>

                              <td className="px-4 py-3 text-center font-mono text-slate-400">
                                {isGoalie
                                  ? `${player.wins}W • ${player.shutouts}SO • ${formatSavePercentage(player.save_pct)}`
                                  : `${player.goals}G • ${player.assists}A • ${player.points}P`}
                              </td>

                              <td className="px-4 py-3 text-center font-mono font-black text-amber-400">
                                {player.fantasy_points} FP
                              </td>

                              <td className="px-4 py-3 text-right">
                                {player.promoted ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Quick Activate button into first open matching slot */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const eligibleSlots = (
                                          normPos === 'F'
                                            ? FORWARD_SLOTS
                                            : normPos === 'D'
                                            ? DEFENSE_SLOTS
                                            : GOALIE_SLOTS
                                        ).filter(s => !activeSlotMap.has(s));

                                        if (eligibleSlots.length > 0) {
                                          handleAssignToSlot(player, eligibleSlots[0]);
                                        } else {
                                          setSwapModalPlayer(player);
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                                        isLight
                                          ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                                          : 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-700/60 text-emerald-300'
                                      }`}
                                    >
                                      Activate
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handlePromoteToBench(player)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                                      isLight
                                        ? 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-800'
                                        : 'bg-purple-950/60 hover:bg-purple-900 border-purple-700/60 text-purple-300'
                                    }`}
                                    title="Promote prospect to allow placement into the Active Squad"
                                  >
                                    Promote
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ==========================================
            MODAL: ASSIGN PLAYER TO EMPTY SLOT
        ========================================== */}
        {assignModalSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
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
                    Select an eligible promoted bench player to fill this slot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignModalSlot(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Eligible Bench Players */}
              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {benchPlayers.filter(p => isPositionEligibleForSlot(p.position, assignModalSlot)).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <p className="font-semibold">No eligible promoted bench players available.</p>
                    <p className="mt-1">
                      Promote players in your Farm Roster to make them eligible for active lineup slots.
                    </p>
                  </div>
                ) : (
                  benchPlayers
                    .filter(p => isPositionEligibleForSlot(p.position, assignModalSlot))
                    .sort((a, b) => b.fantasy_points - a.fantasy_points)
                    .map(player => (
                      <div
                        key={player.id}
                        onClick={() => handleAssignToSlot(player, assignModalSlot)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isLight
                            ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 hover:border-emerald-400'
                            : 'bg-slate-950/70 hover:bg-emerald-950/40 border-slate-800 hover:border-emerald-600/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-xs">
                            <div className="text-sm font-black">{player.player_name}</div>
                            <div className="text-[11px] text-slate-400">
                              {player.team_abbr} • {player.position}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-black text-amber-500">
                            {player.fantasy_points} FP
                          </span>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
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
            MODAL: SWAP PLAYER
        ========================================== */}
        {swapModalPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
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
                    Currently: {swapModalPlayer.slot_position} • Select an eligible player to swap slots with.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSwapModalPlayer(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {/* Available swap candidates: other active players of eligible position OR bench players */}
                {players
                  .filter(p => {
                    if (p.id === swapModalPlayer.id) return false;
                    if (!p.promoted) return false;
                    return normalizePosition(p.position) === normalizePosition(swapModalPlayer.position);
                  })
                  .map(candidate => (
                    <div
                      key={candidate.id}
                      onClick={() => handleSwapPlayers(swapModalPlayer, candidate)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isLight
                          ? 'bg-slate-50 hover:bg-cyan-50 border-slate-200 hover:border-cyan-400'
                          : 'bg-slate-950/70 hover:bg-cyan-950/40 border-slate-800 hover:border-cyan-600/60'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-black">{candidate.player_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {candidate.team_abbr} • {candidate.position} •{' '}
                          <strong className="text-emerald-500 font-mono">
                            {candidate.slot_position}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-amber-500">
                          {candidate.fantasy_points} FP
                        </span>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                        >
                          Swap
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSquadManager;
