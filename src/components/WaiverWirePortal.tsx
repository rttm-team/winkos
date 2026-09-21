import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeneralManager } from '../types';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  UserPlus,
  UserMinus,
  RefreshCw,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  ChevronDown,
  Shield,
  Activity,
  Flame,
  HelpCircle,
} from 'lucide-react';

export interface MasterPlayer {
  nhl_id: number | string;
  player_name: string;
  position: string;
  nhl_team: string | null;
  gp: number;
  goals: number;
  assists: number;
  plus_minus: number;
  pim: number;
  sog: number;
  fantasy_points: number;
  wins?: number;
  shutouts?: number;
  saves?: number;
  goals_against?: number;
  updated_at?: string;
}

export interface ActiveRosterPlayer {
  id: number | string;
  gm_name: string;
  player_name: string;
  nhl_id: number | string;
  position: string;
  nhl_team?: string | null;
  slot_position?: string;
  fantasy_points?: number;
  roster_status?: string;
  is_keeper?: boolean;
  is_locked?: boolean;
  gp?: number;
  goals?: number;
  assists?: number;
}

export interface GMSeasonTracker {
  id?: number;
  season_id: string;
  gm_name: string;
  waiver_pickups_used: number;
  max_waiver_pickups: number;
  created_at?: string;
  updated_at?: string;
}

interface WaiverWirePortalProps {
  gms?: GeneralManager[];
  theme?: 'light' | 'dark';
  initialGm?: string;
  onNavigateBack?: () => void;
}

const DEFAULT_GMS = [
  { id: '1', name: 'Adam', teamName: "Adam's Team" },
  { id: '2', name: 'Allan', teamName: "Allan's Team" },
  { id: '3', name: 'Dan', teamName: "Dan's Team" },
  { id: '4', name: 'Evan', teamName: "Evan's Team" },
  { id: '5', name: 'Glenn', teamName: "Glenn's Team" },
  { id: '6', name: 'Jean', teamName: "Jean's Team" },
  { id: '7', name: 'Jon', teamName: "Jon's Team" },
  { id: '8', name: 'Kyle', teamName: "Kyle's Team" },
  { id: '9', name: 'Mike', teamName: "Mike's Team" },
  { id: '10', name: 'Nate', teamName: "Nate's Team" },
  { id: '11', name: 'Sam', teamName: "Sam's Team" },
  { id: '12', name: 'Seb', teamName: "Seb's Team" },
];

export default function WaiverWirePortal({
  gms,
  theme = 'dark',
  initialGm,
  onNavigateBack,
}: WaiverWirePortalProps) {
  const isLight = theme === 'light';
  const gmList = gms && gms.length > 0 ? gms : DEFAULT_GMS;

  // Selected State
  const [selectedGM, setSelectedGM] = useState<string>(
    initialGm || gmList[0]?.name || 'Adam'
  );
  const [selectedSeason] = useState<string>('2026-2027');

  // Tracker State
  const [tracker, setTracker] = useState<GMSeasonTracker | null>(null);
  const [loadingTracker, setLoadingTracker] = useState<boolean>(true);

  // Available Players State
  const [allMasterPlayers, setAllMasterPlayers] = useState<MasterPlayer[]>([]);
  const [takenNhlIds, setTakenNhlIds] = useState<Set<string>>(new Set());
  const [loadingPlayers, setLoadingPlayers] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'F' | 'D' | 'G'>('ALL');
  const [sortBy, setSortBy] = useState<'fantasy_points' | 'goals' | 'assists' | 'sog' | 'plus_minus' | 'gp'>('fantasy_points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State for Add / Drop
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedAddPlayer, setSelectedAddPlayer] = useState<MasterPlayer | null>(null);
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<ActiveRosterPlayer | null>(null);
  const [gmRosterPlayers, setGmRosterPlayers] = useState<ActiveRosterPlayer[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);
  const [submittingClaim, setSubmittingClaim] = useState<boolean>(false);

  // Toast & Alert Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [alertPopup, setAlertPopup] = useState<{ title: string; message: string; type: 'error' | 'warning' | 'info' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // 1. Fetch GM Season Tracker
  const fetchGMTracker = useCallback(async (gmName: string) => {
    setLoadingTracker(true);
    try {
      const { data, error } = await supabase
        .from('gm_season_tracker')
        .select('*')
        .eq('season_id', selectedSeason)
        .eq('gm_name', gmName)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading GM waiver tracker:', error);
      }

      if (data) {
        setTracker(data);
      } else {
        // If no record exists yet, create or provide default
        const fallbackTracker: GMSeasonTracker = {
          season_id: selectedSeason,
          gm_name: gmName,
          waiver_pickups_used: 0,
          max_waiver_pickups: 3,
        };
        setTracker(fallbackTracker);

        // Attempt upsert in background
        supabase.from('gm_season_tracker').upsert([fallbackTracker], { onConflict: 'season_id,gm_name' }).then();
      }
    } catch (err) {
      console.error('Failed to fetch tracker:', err);
    } finally {
      setLoadingTracker(false);
    }
  }, [selectedSeason]);

  // 2. Fetch Master Players and Taken Player IDs (active roster + prospects)
  const fetchPlayersAndTakenPool = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      // Parallel queries: master players, 2026-27 active rosters, prospects
      const [masterRes, rosterRes, prospectRes] = await Promise.all([
        supabase.from('nhl_master_players').select('*'),
        supabase
          .from('active_roster_players')
          .select('nhl_id, player_name, season_id')
          .in('season_id', ['2026-2027', '2026-27']),
        supabase.from('prospects').select('nhl_id, player_name'),
      ]);

      const takenSet = new Set<string>();

      // Record taken IDs from active rosters
      if (rosterRes.data) {
        rosterRes.data.forEach((r: any) => {
          if (r.nhl_id != null && String(r.nhl_id).trim() !== '' && String(r.nhl_id) !== '0') {
            takenSet.add(String(r.nhl_id).trim());
          }
        });
      }

      // Record taken IDs from prospects
      if (prospectRes.data) {
        prospectRes.data.forEach((p: any) => {
          if (p.nhl_id != null && String(p.nhl_id).trim() !== '' && String(p.nhl_id) !== '0') {
            takenSet.add(String(p.nhl_id).trim());
          }
        });
      }

      setTakenNhlIds(takenSet);

      if (masterRes.data && masterRes.data.length > 0) {
        setAllMasterPlayers(masterRes.data);
      } else {
        setAllMasterPlayers([]);
      }
    } catch (err) {
      console.error('Error loading waiver pool:', err);
      showToast('Failed to load waiver wire players', 'error');
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  // 3. Fetch GM Active Roster for the Add/Drop Modal
  const fetchGMRoster = useCallback(async (gmName: string) => {
    setLoadingRoster(true);
    try {
      const { data, error } = await supabase
        .from('active_roster_players')
        .select('*')
        .eq('gm_name', gmName)
        .in('season_id', ['2026-2027', '2026-27'])
        .order('slot_position', { ascending: true });

      if (error) {
        console.error('Error loading GM roster:', error);
        setGmRosterPlayers([]);
      } else {
        setGmRosterPlayers(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch GM roster:', err);
      setGmRosterPlayers([]);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  // Initial & GM change load
  useEffect(() => {
    fetchGMTracker(selectedGM);
  }, [selectedGM, fetchGMTracker]);

  useEffect(() => {
    fetchPlayersAndTakenPool();
  }, [fetchPlayersAndTakenPool]);

  // Available Players (Excluding any nhl_id present in active_roster_players or prospects)
  const availablePlayers = useMemo(() => {
    return allMasterPlayers.filter((p) => {
      const idStr = String(p.nhl_id).trim();
      return !takenNhlIds.has(idStr);
    });
  }, [allMasterPlayers, takenNhlIds]);

  // Filtered & Sorted Available Players
  const filteredAndSortedPlayers = useMemo(() => {
    let result = [...availablePlayers];

    // Search query filter (Player Name or NHL Team)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.player_name.toLowerCase().includes(q) ||
          (p.nhl_team && p.nhl_team.toLowerCase().includes(q))
      );
    }

    // Position filter tab
    if (positionFilter !== 'ALL') {
      if (positionFilter === 'F') {
        result = result.filter((p) => ['F', 'C', 'LW', 'RW'].includes(p.position.toUpperCase()));
      } else if (positionFilter === 'D') {
        result = result.filter((p) => p.position.toUpperCase() === 'D');
      } else if (positionFilter === 'G') {
        result = result.filter((p) => p.position.toUpperCase() === 'G');
      }
    }

    // Sort order
    result.sort((a, b) => {
      let valA = (a as any)[sortBy] ?? 0;
      let valB = (b as any)[sortBy] ?? 0;

      if (typeof valA === 'string') valA = Number(valA) || 0;
      if (typeof valB === 'string') valB = Number(valB) || 0;

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [availablePlayers, searchQuery, positionFilter, sortBy, sortOrder]);

  // Lazy Loading Pagination State
  const [visibleCount, setVisibleCount] = useState<number>(30);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, positionFilter, sortBy, sortOrder]);

  const displayedPlayers = useMemo(() => {
    return filteredAndSortedPlayers.slice(0, visibleCount);
  }, [filteredAndSortedPlayers, visibleCount]);

  // Pickups calculations
  const maxPickups = tracker?.max_waiver_pickups ?? 3;
  const pickupsUsed = tracker?.waiver_pickups_used ?? 0;
  const pickupsRemaining = Math.max(0, maxPickups - pickupsUsed);
  const isLimitReached = pickupsUsed >= maxPickups;

  // Open Claim Modal
  const handleOpenClaimModal = (player: MasterPlayer) => {
    if (isLimitReached) {
      setAlertPopup({
        title: 'Waiver Limit Reached',
        message: `Waiver Pickup Limit Reached for 2026-27 (${pickupsUsed} / ${maxPickups} used). You cannot submit additional waiver claims this season.`,
        type: 'warning',
      });
      return;
    }

    setSelectedAddPlayer(player);
    setSelectedDropPlayer(null);
    setIsModalOpen(true);
    fetchGMRoster(selectedGM);
  };

  // Execute Waiver Add/Drop Transaction
  const handleConfirmWaiverClaim = async () => {
    if (!selectedAddPlayer) {
      showToast('No player selected to add', 'error');
      return;
    }

    if (!selectedDropPlayer) {
      showToast('Please select a player to drop', 'error');
      return;
    }

    if (isLimitReached) {
      setIsModalOpen(false);
      setAlertPopup({
        title: 'Limit Reached',
        message: 'Waiver Pickup Limit Reached for 2026-27. No remaining pickups.',
        type: 'error',
      });
      return;
    }

    setSubmittingClaim(true);

    try {
      const dropSlot =
        selectedDropPlayer.slot_position ||
        (selectedDropPlayer.position === 'F' ? 'F1' : selectedDropPlayer.position === 'D' ? 'D1' : 'G1');

      const { data, error } = await supabase.rpc('execute_waiver_add_drop', {
        p_season_id: selectedSeason || '2026-2027',
        p_gm_name: selectedGM,
        p_add_nhl_id: Number(selectedAddPlayer.nhl_id),
        p_add_name: selectedAddPlayer.player_name,
        p_add_position: selectedAddPlayer.position,
        p_add_team: selectedAddPlayer.nhl_team || 'NHL',
        p_drop_nhl_id: Number(selectedDropPlayer.nhl_id || 0),
        p_drop_name: selectedDropPlayer.player_name,
        p_drop_position: selectedDropPlayer.position,
        p_drop_slot_position: dropSlot,
      });

      if (error) {
        console.error('RPC execute_waiver_add_drop error:', error);
        setAlertPopup({
          title: 'Waiver Claim Failed',
          message: error.message || 'The waiver claim could not be processed. Please try again.',
          type: 'error',
        });
        return;
      }

      // Check return payload for custom error or status
      if (data && data.status === 'ERROR') {
        setAlertPopup({
          title: 'Waiver Claim Error',
          message: data.message || 'An error occurred while executing the waiver claim.',
          type: 'error',
        });
        return;
      }

      // Success!
      showToast('Waiver Claim Successful! 🏒', 'success');
      setIsModalOpen(false);
      setSelectedAddPlayer(null);
      setSelectedDropPlayer(null);

      // Invalidate roster caches so Squad & Bench Manager and active rosters show the new addition immediately
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('winko_roster_') || key.startsWith('winko_keepers_'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {}

      // Refresh GM Counter and Available Players
      await Promise.all([
        fetchGMTracker(selectedGM),
        fetchPlayersAndTakenPool(),
      ]);
    } catch (err: any) {
      console.error('Unexpected error during waiver claim:', err);
      setAlertPopup({
        title: 'Transaction Error',
        message: err.message || 'An unexpected error occurred. Please contact the commissioner.',
        type: 'error',
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div
      id="waiver-wire-portal"
      className={`py-6 sm:py-8 transition-colors ${
        isLight ? 'bg-transparent text-slate-900' : 'bg-transparent text-slate-100'
      }`}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        {/* ========================================================================= */}
        {/* TOAST ALERT */}
        {/* ========================================================================= */}
        {toast && (
          <div
            id="waiver-toast"
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              toast.type === 'success'
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-500/20'
                  : 'bg-emerald-950/95 border-emerald-600 text-emerald-200 shadow-black/60'
                : toast.type === 'error'
                ? isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-rose-500/20'
                  : 'bg-rose-950/95 border-rose-600 text-rose-200 shadow-black/60'
                : isLight
                ? 'bg-blue-50 border-blue-300 text-blue-900'
                : 'bg-blue-950/95 border-blue-600 text-blue-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
            )}
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:opacity-75 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ALERT MODAL / POPUP */}
        {/* ========================================================================= */}
        {alertPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl ${
                    alertPopup.type === 'error'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : alertPopup.type === 'warning'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                  }`}
                >
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black">{alertPopup.title}</h3>
                  <p className="text-xs text-slate-400">Rule 5 Waiver Wire Notice</p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                {alertPopup.message}
              </div>

              <div className="flex justify-end">
                <button
                  id="waiver-alert-dismiss-btn"
                  onClick={() => setAlertPopup(null)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                    isLight
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================
            PAGE TITLE OUTSIDE CARD (Aligned with other tabs)
        ========================================================== */}
        <div className="flex flex-col gap-4 border-b pb-6 border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Waiver Wire
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Pickups Remaining badge */}
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${
                  isLimitReached
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                }`}
              >
                {isLimitReached ? '0 Pickups Remaining' : `${pickupsRemaining} Pickup${pickupsRemaining === 1 ? '' : 's'} Remaining`}
              </span>

              {/* Refresh Button */}
              <button
                id="refresh-waiver-pool-btn"
                onClick={() => {
                  fetchGMTracker(selectedGM);
                  fetchPlayersAndTakenPool();
                  showToast('Refreshed waiver wire pool', 'info');
                }}
                title="Refresh waiver wire pool"
                className={`p-2.5 rounded-2xl border shadow-sm transition-colors ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loadingPlayers || loadingTracker ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Warning badge if 3 pickups used */}
          {isLimitReached && (
            <div
              id="waiver-limit-reached-badge"
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 font-black text-xs sm:text-sm shadow-sm animate-pulse w-fit"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Waiver Pickup Limit Reached for 2026-27</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. AVAILABLE PLAYERS TABLE (WAIVER WIRE POOL) */}
        {/* ========================================================================= */}
        <section
          id="waiver-pool-section"
          className={`rounded-3xl border shadow-xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {/* Controls Bar: Search, Position Filter Tabs & Sort Dropdown */}
          <div
            className={`p-4 sm:p-6 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            {/* Search Bar Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="waiver-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search available player or NHL team..."
                className={`w-full pl-10 pr-9 py-2.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 shadow-inner'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Position Filter Tabs & Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Position Filter Tabs */}
              <div
                id="position-filter-tabs"
                className={`flex items-center p-1 rounded-2xl border ${
                  isLight ? 'bg-slate-200/60 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                {(['ALL', 'F', 'D', 'G'] as const).map((pos) => {
                  const label =
                    pos === 'ALL'
                      ? 'All'
                      : pos === 'F'
                      ? 'Forwards'
                      : pos === 'D'
                      ? 'Defense'
                      : 'Goalies';
                  const active = positionFilter === pos;
                  return (
                    <button
                      key={pos}
                      id={`filter-tab-${pos.toLowerCase()}`}
                      onClick={() => setPositionFilter(pos)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        active
                          ? 'bg-emerald-600 text-white shadow-md scale-105'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  id="waiver-sort-dropdown"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`appearance-none pl-3.5 pr-8 py-2 rounded-2xl border text-xs font-bold shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <option value="fantasy_points">Highest Fantasy Points</option>
                  <option value="goals">Most Goals</option>
                  <option value="assists">Most Assists</option>
                  <option value="sog">Most SOG</option>
                  <option value="plus_minus">Highest +/-</option>
                  <option value="gp">Games Played</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
              </div>

              {/* Sort Order Toggle */}
              <button
                id="sort-order-toggle-btn"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                title={`Sort ${sortOrder === 'desc' ? 'Descending' : 'Ascending'}`}
                className={`px-3 py-2 rounded-2xl border text-xs font-bold transition-colors ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
              </button>
            </div>
          </div>

          {/* Table Header Info Bar */}
          <div
            className={`px-6 py-3 border-b flex items-center justify-between text-xs font-bold ${
              isLight ? 'bg-slate-100/70 border-slate-200 text-slate-600' : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>
                Showing{' '}
                <strong className={isLight ? 'text-slate-900' : 'text-white'}>
                  {filteredAndSortedPlayers.length}
                </strong>{' '}
                free agents available on the waiver wire
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] text-slate-500">
              * Excludes all 2026-27 active roster players and protected prospects
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table id="waiver-players-table" className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] font-black uppercase tracking-wider ${
                    isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <th className="py-3.5 px-4 sm:px-6">Player Name</th>
                  <th className="py-3.5 px-3 text-center">Pos</th>
                  <th className="py-3.5 px-3 text-right">GP</th>
                  <th className="py-3.5 px-3 text-right">G / W</th>
                  <th className="py-3.5 px-3 text-right">A / GA</th>
                  <th className="py-3.5 px-3 text-right">+/- / SV</th>
                  <th className="py-3.5 px-3 text-right">PIM / SO</th>
                  <th className="py-3.5 px-3 text-right">SOG</th>
                  <th className="py-3.5 px-4 text-right">Rule 5 FPts</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {loadingPlayers ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
                        <p className="text-sm font-bold text-slate-400">Loading available waiver players...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <HelpCircle className="h-10 w-10 text-slate-400 mx-auto" />
                        <h4 className="text-base font-black">No Available Players Found</h4>
                        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {searchQuery
                            ? `No players matched your search "${searchQuery}". Try clearing your filters.`
                            : 'All players in the database are currently claimed or protected in active rosters.'}
                        </p>
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setPositionFilter('ALL');
                            }}
                            className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedPlayers.map((player) => {
                    const isGoalie = player.position.toUpperCase() === 'G';
                    const posColor =
                      player.position === 'F' || player.position === 'C' || player.position === 'LW' || player.position === 'RW'
                        ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                        : player.position === 'D'
                        ? 'bg-purple-500/15 text-purple-500 border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

                    return (
                      <tr
                        key={String(player.nhl_id)}
                        className={`transition-colors hover:bg-amber-500/5 ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Player Name with NHL Team Badge */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className={`font-kanit font-medium text-base truncate hover:text-amber-500 transition-colors ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                {player.player_name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {player.nhl_team && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                      isLight
                                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                                        : 'bg-slate-800 border-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {player.nhl_team}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  ID: {player.nhl_id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Position Badge */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${posColor}`}
                          >
                            {player.position}
                          </span>
                        </td>

                        {/* GP */}
                        <td className="py-3.5 px-3 text-right font-mono text-xs font-semibold">
                          {player.gp || 0}
                        </td>

                        {/* G or W */}
                        <td className="py-3.5 px-3 text-right font-mono text-xs">
                          {isGoalie ? player.wins ?? player.goals ?? 0 : player.goals ?? 0}
                        </td>

                        {/* A or GA */}
                        <td className="py-3.5 px-3 text-right font-mono text-xs">
                          {isGoalie ? player.goals_against ?? player.assists ?? 0 : player.assists ?? 0}
                        </td>

                        {/* +/- or SV */}
                        <td className="py-3.5 px-3 text-right font-mono text-xs">
                          {isGoalie ? (
                            player.saves ?? player.plus_minus ?? 0
                          ) : (
                            <span
                              className={
                                (player.plus_minus || 0) > 0
                                  ? 'text-emerald-500 font-bold'
                                  : (player.plus_minus || 0) < 0
                                  ? 'text-rose-500 font-bold'
                                  : ''
                              }
                            >
                              {(player.plus_minus || 0) > 0 ? `+${player.plus_minus}` : player.plus_minus || 0}
                            </span>
                          )}
                        </td>

                        {/* PIM or SO */}
                        <td className="py-3.5 px-3 text-right font-mono text-xs">
                          {isGoalie ? player.shutouts ?? player.pim ?? 0 : player.pim ?? 0}
                        </td>

                        {/* SOG */}
                        <td className="py-3.5 px-3 text-right font-mono text-xs">
                          {player.sog || 0}
                        </td>

                        {/* Rule 5 FPts (highlighted in bold amber text) */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-amber-500 dark:text-amber-400 font-black font-mono text-sm sm:text-base">
                            {(player.fantasy_points || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Action: Claim Player Button */}
                        <td className="py-3.5 px-4 sm:px-6 text-center">
                          <button
                            id={`claim-player-btn-${player.nhl_id}`}
                            disabled={isLimitReached}
                            onClick={() => handleOpenClaimModal(player)}
                            title={
                              isLimitReached
                                ? 'Waiver pickup limit reached for 2026-27 (0 remaining)'
                                : `Claim ${player.player_name}`
                            }
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 mx-auto ${
                              isLimitReached
                                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400 border border-slate-700'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 active:scale-95'
                            }`}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Claim Player</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Lazy Loading / Load More Bar */}
        </section>

    {/* ========================================================================= */}
    {/* 3. INTERACTIVE ADD / DROP SELECTION MODAL */}
    {/* ========================================================================= */}
        {isModalOpen && selectedAddPlayer && (
          <div
            id="waiver-claim-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {/* Modal Header */}
              <div
                className={`px-6 py-5 border-b flex items-center justify-between ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">
                      Claim {selectedAddPlayer.player_name} ({selectedAddPlayer.position})
                    </h3>
                    <p className="text-xs text-slate-400">
                      GM: <strong className="text-amber-500">{selectedGM}</strong> • Season 2026-2027
                    </p>
                  </div>
                </div>

                <button
                  id="close-claim-modal-btn"
                  onClick={() => {
                    if (!submittingClaim) {
                      setIsModalOpen(false);
                      setSelectedAddPlayer(null);
                      setSelectedDropPlayer(null);
                    }
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body: Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Step 1: Select Player to Drop Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                      <span>Step 1: Select Player to Drop</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30">
                        Required
                      </span>
                    </h4>
                    <span className="text-xs text-slate-400 font-bold">
                      {gmRosterPlayers.length} Roster Players
                    </span>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Choose exactly 1 player from your active roster to drop. The incoming player will take their roster slot.
                  </p>
                </div>

                {/* Radio Button List of GM Roster Players */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {loadingRoster ? (
                    <div className="py-8 text-center">
                      <RefreshCw className="h-6 w-6 text-amber-500 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-400 mt-2">Loading active roster...</p>
                    </div>
                  ) : gmRosterPlayers.length === 0 ? (
                    <div
                      className={`p-4 rounded-2xl border text-center space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <AlertCircle className="h-6 w-6 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold">No active roster players found for {selectedGM}.</p>
                      <p className="text-[11px] text-slate-400">
                        Make sure your franchise has keepers locked or active roster players seeded for 2026-2027.
                      </p>
                    </div>
                  ) : (
                    gmRosterPlayers.map((player) => {
                      const isSelected = selectedDropPlayer?.id === player.id;
                      const posColor =
                        player.position === 'F'
                          ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                          : player.position === 'D'
                          ? 'bg-purple-500/15 text-purple-500 border-purple-500/30'
                          : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

                      return (
                        <label
                          key={String(player.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30 shadow-md'
                              : isLight
                              ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <input
                              type="radio"
                              name="drop-player-radio"
                              checked={isSelected}
                              onChange={() => setSelectedDropPlayer(player)}
                              className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-kanit font-medium text-base truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                  {player.player_name}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${posColor}`}>
                                  {player.position}
                                </span>
                                {player.slot_position && (
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                                  }`}>
                                    {player.slot_position}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {player.nhl_team || 'NHL'} • NHL ID: {player.nhl_id}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black font-mono text-amber-500">
                              {(player.fantasy_points || 0).toLocaleString()} FPts
                            </span>
                            <p className="text-[10px] text-slate-400">Rule 5</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Step 2: Confirm Transaction Summary Card */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-amber-500">
                    Step 2: Confirm Transaction
                  </h4>

                  <div
                    className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-bold">
                      {/* Adding Player */}
                      <div className={`flex items-center gap-2 w-full sm:w-auto p-2.5 rounded-xl border transition-colors ${
                        isLight
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        <span className="text-base">🟢</span>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${
                            isLight ? 'text-emerald-700 font-bold' : 'text-emerald-500'
                          }`}>
                            Adding
                          </span>
                          <span className={`text-xs sm:text-sm font-extrabold ${
                            isLight ? 'text-emerald-950' : 'text-emerald-300'
                          }`}>
                            {selectedAddPlayer.player_name} ({selectedAddPlayer.position} - {selectedAddPlayer.nhl_team || 'NHL'})
                          </span>
                        </div>
                      </div>

                      <ArrowRightLeft className={`h-5 w-5 shrink-0 rotate-90 sm:rotate-0 ${
                        isLight ? 'text-slate-400' : 'text-slate-500'
                      }`} />

                      {/* Dropping Player */}
                      <div
                        className={`flex items-center gap-2 w-full sm:w-auto p-2.5 rounded-xl border transition-colors ${
                          selectedDropPlayer
                            ? isLight
                              ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : isLight
                            ? 'bg-slate-100 border-slate-200 text-slate-500'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <span className="text-base">🔴</span>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${
                            isLight ? 'text-rose-700 font-bold' : 'text-rose-500'
                          }`}>
                            Dropping
                          </span>
                          <span className={`text-xs sm:text-sm font-extrabold ${
                            selectedDropPlayer ? (isLight ? 'text-rose-950' : 'text-rose-300') : ''
                          }`}>
                            {selectedDropPlayer ? (
                              `${selectedDropPlayer.player_name} (${selectedDropPlayer.position})`
                            ) : (
                              <span className={`italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Select a player above</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warning text */}
                    <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs font-semibold ${
                      isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
                      <span>
                        This transaction will use 1 of your remaining{' '}
                        <strong className={isLight ? 'text-amber-950 font-black' : 'text-white'}>{pickupsRemaining}</strong> waiver pickups. This action is irreversible.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <button
                  id="cancel-waiver-claim-btn"
                  disabled={submittingClaim}
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedAddPlayer(null);
                    setSelectedDropPlayer(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                    isLight
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Cancel
                </button>

                <button
                  id="confirm-waiver-claim-btn"
                  disabled={!selectedDropPlayer || submittingClaim}
                  onClick={handleConfirmWaiverClaim}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg ${
                    !selectedDropPlayer || submittingClaim
                      ? 'opacity-40 cursor-not-allowed bg-slate-700 text-slate-400'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 active:scale-95'
                  }`}
                >
                  {submittingClaim ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing Claim...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Waiver Claim</span>
                      <span>🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
