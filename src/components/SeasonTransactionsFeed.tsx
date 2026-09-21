import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeneralManager } from '../types';
import {
  ArrowRightLeft,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  User,
  Shield,
  Clock,
  CheckCircle2,
  X,
  ChevronDown,
  Sparkles,
  Layers,
  Zap,
  ArrowUpRight,
  UserMinus,
  UserPlus,
  HelpCircle,
} from 'lucide-react';

export interface RosterTransaction {
  id: number | string;
  season_id: string;
  gm_name: string;
  transaction_type: string;
  added_player_nhl_id?: number | string | null;
  added_player_name?: string | null;
  added_player_position?: string | null;
  added_player_team?: string | null;
  dropped_player_nhl_id?: number | string | null;
  dropped_player_name?: string | null;
  dropped_player_position?: string | null;
  pickups_remaining_after?: number | null;
  timestamp?: string | null;
}

interface SeasonTransactionsFeedProps {
  gms?: GeneralManager[];
  theme?: 'light' | 'dark';
  seasonId?: string;
  onNavigateToWaivers?: () => void;
}

const DEFAULT_GMS = [
  'Adam',
  'Allan',
  'Dan',
  'Evan',
  'Glenn',
  'Jean',
  'Jon',
  'Kyle',
  'Mike',
  'Nate',
  'Sam',
  'Seb',
];

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export default function SeasonTransactionsFeed({
  gms,
  theme = 'dark',
  seasonId = '2026-2027',
  onNavigateToWaivers,
}: SeasonTransactionsFeedProps) {
  const isLight = theme === 'light';
  const gmNames = useMemo(() => {
    if (gms && gms.length > 0) {
      return Array.from(new Set(gms.map((g) => g.name))).sort();
    }
    return DEFAULT_GMS;
  }, [gms]);

  // Data State
  const [transactions, setTransactions] = useState<RosterTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [newTxAlert, setNewTxAlert] = useState<string | null>(null);

  // Filters State
  const [selectedGmFilter, setSelectedGmFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'WAIVER' | 'TRADE' | 'COMMISH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch initial transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('roster_transactions')
        .select('*')
        .in('season_id', [seasonId, '2026-2027', '2026-27'])
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching roster transactions:', error);
      } else {
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channelName = `roster_transactions_${seasonId}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'roster_transactions',
        },
        (payload) => {
          const newTx = payload.new as RosterTransaction;
          if (
            newTx &&
            (!newTx.season_id ||
              newTx.season_id === seasonId ||
              newTx.season_id === '2026-2027' ||
              newTx.season_id === '2026-27')
          ) {
            setTransactions((prev) => {
              // Avoid duplicates
              if (prev.some((t) => t.id === newTx.id)) return prev;
              return [newTx, ...prev];
            });

            // Flash toast notification
            const gm = newTx.gm_name || 'A franchise';
            const added = newTx.added_player_name || 'a player';
            setNewTxAlert(`⚡ New activity: ${gm} claimed ${added}!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [seasonId]);

  // Auto-dismiss real-time banner
  useEffect(() => {
    if (newTxAlert) {
      const timer = setTimeout(() => setNewTxAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [newTxAlert]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // GM Filter
      if (selectedGmFilter !== 'ALL' && tx?.gm_name !== selectedGmFilter) {
        return false;
      }

      // Type Filter
      if (selectedTypeFilter !== 'ALL') {
        const typeUpper = (tx?.transaction_type || '').toUpperCase();
        if (selectedTypeFilter === 'WAIVER') {
          if (!typeUpper.includes('WAIVER')) return false;
        } else if (selectedTypeFilter === 'TRADE') {
          if (!typeUpper.includes('TRADE')) return false;
        } else if (selectedTypeFilter === 'COMMISH') {
          if (!typeUpper.includes('COMMISH') && !typeUpper.includes('ADMIN')) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAdded = (tx?.added_player_name || '').toLowerCase().includes(q);
        const matchesDropped = (tx?.dropped_player_name || '').toLowerCase().includes(q);
        const matchesGm = (tx?.gm_name || '').toLowerCase().includes(q);
        const matchesTeam = (tx?.added_player_team || '').toLowerCase().includes(q);
        if (!matchesAdded && !matchesDropped && !matchesGm && !matchesTeam) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedGmFilter, selectedTypeFilter, searchQuery]);

  return (
    <div
      id="season-transactions-feed-portal"
      className={`min-h-screen py-6 sm:py-8 transition-colors ${
        isLight ? 'bg-transparent text-slate-900' : 'bg-transparent text-slate-100'
      }`}
    >
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Realtime Alert Banner */}
        {newTxAlert && (
          <div
            id="realtime-tx-toast"
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400/30 animate-in fade-in slide-in-from-top-4"
          >
            <Zap className="h-5 w-5 text-emerald-200 animate-bounce shrink-0" />
            <span className="text-sm font-black tracking-wide">{newTxAlert}</span>
            <button
              onClick={() => setNewTxAlert(null)}
              className="ml-2 p-1 hover:opacity-80 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. TOP HEADER & STATUS BAR (Same style with divider as other pages) */}
        {/* ========================================================================= */}
        <section
          id="transactions-page-header"
          className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}
        >
          <div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  2026-27 League Transaction Log
                </h2>
                {/* Live pulsing status indicator */}
                <div
                  id="live-status-pill"
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
                    isLight
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>Live Activity Feed</span>
                </div>
              </div>
              <p className={`text-xs sm:text-sm mt-1.5 max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Real-time audited transaction history for all Rule 5 waiver claims, trades, and roster additions.
              </p>
            </div>
          </div>

          {/* Primary CTA Buttons (Using green as the primary CTA) */}
          <div className="flex flex-wrap items-center gap-3">
            {onNavigateToWaivers && (
              <button
                id="navigate-waiver-wire-cta"
                onClick={onNavigateToWaivers}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <span>Make Waiver Claim</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}

            <button
              id="refresh-transactions-feed-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. FILTER CONTROLS BAR */}
        {/* ========================================================================= */}
        <section
          id="transactions-filter-bar"
          className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {/* Search Bar Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="transactions-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by player, GM, or team..."
              className={`w-full pl-10 pr-9 py-2.5 rounded-2xl border text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  : 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500'
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by GM Dropdown */}
            <div className="relative">
              <select
                id="filter-gm-dropdown"
                value={selectedGmFilter}
                onChange={(e) => setSelectedGmFilter(e.target.value)}
                className={`appearance-none pl-3.5 pr-9 py-2 rounded-2xl border text-xs font-bold shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900'
                }`}
              >
                <option value="ALL">All GMs</option>
                {gmNames.map((name) => (
                  <option key={name} value={name}>
                    GM: {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
            </div>

            {/* Filter by Type Tabs */}
            <div
              id="filter-type-tabs"
              className={`flex items-center p-1 rounded-2xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              {(
                [
                  { id: 'ALL', label: 'All Moves' },
                  { id: 'WAIVER', label: 'Waiver Claims' },
                  { id: 'TRADE', label: 'Trades' },
                  { id: 'COMMISH', label: 'Commish Edits' },
                ] as const
              ).map((tab) => {
                const active = selectedTypeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`filter-type-${tab.id.toLowerCase()}`}
                    onClick={() => setSelectedTypeFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-md scale-105'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Count Bar */}
        <div
          className={`flex items-center justify-between text-xs font-bold px-2 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span>
            Showing <strong className={isLight ? 'text-slate-900' : 'text-white'}>{filteredTransactions.length}</strong>{' '}
            transaction{filteredTransactions.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <Clock className={`h-3 w-3 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span>Updated in real-time</span>
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 3. TRANSACTION ACTIVITY CARDS FEED */}
        {/* ========================================================================= */}
        <div id="transactions-feed-list" className="space-y-4">
          {loading ? (
            /* 4. Loading State Skeleton Loader Pulses */
            <div id="transactions-skeleton-loader" className="space-y-4">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border animate-pulse space-y-4 shadow-sm ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-24 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                      <div className={`h-6 w-32 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                    </div>
                    <div className={`h-5 w-20 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`h-20 rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-slate-800/60'}`} />
                    <div className={`h-20 rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-slate-800/60'}`} />
                  </div>
                  <div className={`h-4 w-48 rounded-xl ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            /* 4. Empty State UI */
            <div
              id="transactions-empty-state"
              className={`p-12 sm:p-16 rounded-3xl border text-center space-y-4 shadow-xl ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="h-8 w-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-black">
                  No transactions recorded for the 2026-27 season yet.
                </h3>
                <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  First waiver pickup is waiting! Once GMs submit Rule 5 waiver claims, trades, or squad updates, they
                  will appear here instantly.
                </p>
              </div>

              {onNavigateToWaivers && (
                <button
                  id="empty-state-waiver-cta-btn"
                  onClick={onNavigateToWaivers}
                  className="mt-4 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
                >
                  Go to Waiver Wire Portal
                </button>
              )}
            </div>
          ) : (
            /* Real Activity Cards */
            filteredTransactions.map((tx) => {
              const typeUpper = (tx?.transaction_type || '').toUpperCase();
              const isWaiver = typeUpper.includes('WAIVER');
              const isTrade = typeUpper.includes('TRADE');

              const addedPos = tx?.added_player_position || 'F';
              const droppedPos = tx?.dropped_player_position || 'F';

              const posColor = (pos: string) => {
                const clean = pos.toUpperCase();
                if (isLight) {
                  if (clean === 'D') return 'bg-purple-100 text-purple-800 border-purple-200';
                  if (clean === 'G') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  return 'bg-blue-100 text-blue-800 border-blue-200';
                }
                if (clean === 'D') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
                if (clean === 'G') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
              };

              const remainingPickups =
                tx?.pickups_remaining_after !== undefined && tx?.pickups_remaining_after !== null
                  ? tx.pickups_remaining_after
                  : 3;

              return (
                <div
                  key={String(tx?.id)}
                  id={`transaction-card-${tx?.id}`}
                  className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-all duration-200 group ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:shadow-2xl'
                      : 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700 hover:shadow-2xl'
                  }`}
                >
                  {/* 1. Transaction Header */}
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 ${
                      isLight ? 'border-slate-100' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* GM Name Badge */}
                      <span
                        className={`px-3 py-1 rounded-xl border font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm ${
                          isLight
                            ? 'bg-slate-100 border-slate-200 text-slate-800'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <User className={`h-3.5 w-3.5 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} />
                        <span>{tx?.gm_name || 'General Manager'}</span>
                      </span>

                      {/* Transaction Type Tag */}
                      {isWaiver ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                            isLight
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          WAIVER ADD/DROP
                        </span>
                      ) : isTrade ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                            isLight
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          }`}
                        >
                          TRADE
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                            isLight
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          COMMISH EDIT
                        </span>
                      )}
                    </div>

                    {/* Formatted Relative Timestamp */}
                    <div
                      className={`flex items-center gap-1.5 text-xs font-semibold ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <Clock className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span title={tx?.timestamp || ''}>{formatRelativeTime(tx?.timestamp)}</span>
                    </div>
                  </div>

                  {/* 2. Added & Dropped Players Side-by-Side Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Player Added (Green Block) */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-inner ${
                        isLight
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <UserPlus className={`h-3.5 w-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isLight ? 'text-emerald-700' : 'text-emerald-400'
                            }`}
                          >
                            + ADDED
                          </span>
                        </div>
                        <h4
                          className={`font-kanit font-medium text-base truncate ${
                            isLight ? 'text-slate-900' : 'text-slate-100'
                          }`}
                        >
                          {tx?.added_player_name || 'Unknown Player'}
                        </h4>
                        <div className="flex items-center gap-2 pt-0.5">
                          {tx?.added_player_team && (
                            <span
                              className={`text-[11px] font-bold uppercase ${
                                isLight ? 'text-emerald-700' : 'text-emerald-300/80'
                              }`}
                            >
                              {tx?.added_player_team}
                            </span>
                          )}
                          {tx?.added_player_nhl_id && (
                            <span
                              className={`text-[10px] font-mono ${
                                isLight ? 'text-emerald-700/60' : 'text-emerald-400/60'
                              }`}
                            >
                              ID: {tx?.added_player_nhl_id}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Position Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border uppercase shrink-0 ${posColor(
                          addedPos
                        )}`}
                      >
                        {addedPos}
                      </span>
                    </div>

                    {/* Player Dropped (Red Block) */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-inner ${
                        isLight
                          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                          : 'bg-rose-950/40 border-rose-800/60 text-rose-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <UserMinus className={`h-3.5 w-3.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isLight ? 'text-rose-700' : 'text-rose-400'
                            }`}
                          >
                            - DROPPED
                          </span>
                        </div>
                        <h4
                          className={`font-kanit font-medium text-base truncate ${
                            isLight ? 'text-slate-900' : 'text-slate-100'
                          }`}
                        >
                          {tx?.dropped_player_name || 'No player dropped'}
                        </h4>
                        <div className="flex items-center gap-2 pt-0.5">
                          {tx?.dropped_player_nhl_id && (
                            <span
                              className={`text-[10px] font-mono ${
                                isLight ? 'text-rose-700/60' : 'text-rose-400/60'
                              }`}
                            >
                              ID: {tx?.dropped_player_nhl_id}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Position Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border uppercase shrink-0 ${posColor(
                          droppedPos
                        )}`}
                      >
                        {droppedPos}
                      </span>
                    </div>
                  </div>

                  {/* 3. Transaction Footer: Remaining Waiver Pickups Badge */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div
                      className={`flex items-center gap-2 font-bold ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      <Shield className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span>
                        Waiver Pickups Remaining:{' '}
                        <strong
                          className={`font-mono ${
                            isLight ? 'text-emerald-700' : 'text-emerald-400'
                          }`}
                        >
                          {remainingPickups} / 3
                        </strong>
                      </span>
                    </div>

                    {/* Visual indicator dots */}
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((dotIdx) => {
                        const isRemaining = dotIdx < remainingPickups;
                        return (
                          <span
                            key={dotIdx}
                            className={`inline-block h-2 w-2 rounded-full ${
                              isRemaining
                                ? 'bg-emerald-500'
                                : isLight
                                ? 'bg-slate-300'
                                : 'bg-rose-500/70'
                            }`}
                            title={isRemaining ? 'Pickup Available' : 'Pickup Used'}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
