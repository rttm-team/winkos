import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GeneralManager, PositionFilter, StatusFilter, Prospect, evaluateProspect, ViewMode } from './types';
import { INITIAL_GMS } from './data/mockData';
import { Header } from './components/Header';
import { WatchlistBanner } from './components/WatchlistBanner';
import { FiltersAndSearch } from './components/FiltersAndSearch';
import { PositionSection } from './components/PositionSection';
import { RulesModal } from './components/RulesModal';
import { AddProspectModal } from './components/AddProspectModal';
import { EditProspectModal } from './components/EditProspectModal';
import { syncProspectWithNhlApi } from './services/nhlApi';
import { supabase, fetchLeagueData, mapProspectRow } from './lib/supabase';
import {
  UserPlus,
  Shield,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Activity,
} from 'lucide-react';

export default function App() {
  const [gms, setGms] = useState<GeneralManager[]>(INITIAL_GMS);
  const [selectedGmId, setSelectedGmId] = useState<string>('gm-adam');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [globalLastUpdated, setGlobalLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch live data & Subscribe
  useEffect(() => {
    async function loadData() {
      const data = await fetchLeagueData();
      if (data && data.length > 0) {
        setGms(data);
        if (data[0] && !data.find(g => g.id === selectedGmId)) {
          setSelectedGmId(data[0].id);
        }
      }
      setIsLoading(false);
    }
    loadData();

    // 2. Listen for live updates on prospects
    const channel = supabase
      .channel('public:prospects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, (payload) => {
        setGms((prevGms) => {
          // Find the GM this prospect belongs to
          const payloadNew = payload.new as Record<string, any>;
          const mappedProspect = mapProspectRow(payloadNew);

          return prevGms.map(gm => {
            if (gm.id !== String(payloadNew.gm_id) && gm.id !== payloadNew.gmId && gm.name !== payloadNew.gm_name) {
              // If it's not this GM, just ensure the prospect isn't here (in case it moved)
              return { ...gm, prospects: gm.prospects.filter(p => p.id !== mappedProspect.id) };
            }
            // It belongs to this GM
            const exists = gm.prospects.some(p => p.id === mappedProspect.id);
            if (exists) {
              return {
                ...gm,
                prospects: gm.prospects.map(p => p.id === mappedProspect.id ? mappedProspect : p)
              };
            }
            return {
              ...gm,
              prospects: [...gm.prospects, mappedProspect]
            };
          });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGmId]);

  // Active GM
  const activeGm = useMemo(() => {
    return gms.find((g) => g.id === selectedGmId) || gms[0];
  }, [gms, selectedGmId]);

  // Handle GP update simulation (+1 or -1)
  const handleUpdateGP = async (prospectId: string, delta: number) => {
    const prospect = activeGm.prospects.find((p) => p.id === prospectId);
    if (!prospect) return;

    const newSeasonGP = Math.max(0, prospect.currentSeasonGP + delta);
    const currentTotal = prospect.totalGames !== undefined ? prospect.totalGames : (prospect.priorCareerGP + prospect.currentSeasonGP);
    const newTotal = Math.max(0, currentTotal + delta);

    setGms((prevGms) =>
      prevGms.map((gm) => {
        if (gm.id !== activeGm.id) return gm;
        return {
          ...gm,
          prospects: gm.prospects.map((p) => {
            if (p.id !== prospectId) return p;
            return {
              ...p,
              currentSeasonGP: newSeasonGP,
              totalGames: newTotal,
            };
          }),
        };
      })
    );

    await supabase.from('prospects')
      .update({ current_season_gp: newSeasonGP, total_games: newTotal })
      .eq('id', prospectId);
  };

  // Handle toggle promotion to active roster
  const handleTogglePromotion = async (prospectId: string) => {
    const prospect = activeGm.prospects.find((p) => p.id === prospectId);
    if (!prospect) return;

    const nextPromoted = !prospect.promoted;
    const newDate = nextPromoted
      ? (prospect.promotionDate || new Date().toLocaleDateString('en-US'))
      : null;

    setGms((prevGms) =>
      prevGms.map((gm) => {
        if (gm.id !== activeGm.id) return gm;
        return {
          ...gm,
          prospects: gm.prospects.map((p) => {
            if (p.id !== prospectId) return p;
            return {
              ...p,
              promoted: nextPromoted,
              promotionDate: newDate ?? undefined,
            };
          }),
        };
      })
    );

    await supabase.from('prospects')
      .update({ promoted: nextPromoted, promotion_date: newDate })
      .eq('id', prospectId);
  };

  // Handle toggle protection
  const handleToggleProtection = async (prospectId: string) => {
    const prospect = activeGm.prospects.find((p) => p.id === prospectId);
    if (!prospect) return;

    const nextProtected = !prospect.isProtected;

    setGms((prevGms) =>
      prevGms.map((gm) => {
        if (gm.id !== activeGm.id) return gm;
        return {
          ...gm,
          prospects: gm.prospects.map((p) => {
            if (p.id !== prospectId) return p;
            return {
              ...p,
              isProtected: nextProtected,
            };
          }),
        };
      })
    );

    await supabase.from('prospects')
      .update({ protected: nextProtected })
      .eq('id', prospectId);
  };

  // Handle syncing a single prospect with NHL API
  const handleSyncProspect = useCallback(async (prospectId: string) => {
    // 1. Mark as syncing
    setGms((prevGms) =>
      prevGms.map((gm) => ({
        ...gm,
        prospects: gm.prospects.map((p) =>
          p.id === prospectId ? { ...p, apiSyncStatus: 'syncing' } : p
        ),
      }))
    );

    // Find prospect record
    const currentProspect = activeGm.prospects.find((p) => p.id === prospectId);
    if (!currentProspect) return;

    // 2. Fetch fresh stats via NHL API service
    const result = await syncProspectWithNhlApi(currentProspect);

    // 3. Update state with fresh data and auto re-evaluate rules
    setGms((prevGms) =>
      prevGms.map((gm) => ({
        ...gm,
        prospects: gm.prospects.map((p) => {
          if (p.id !== prospectId) return p;
          return {
            ...p,
            totalGames: result.totalGP,
            currentSeasonGP: result.currentSeasonGP,
            priorCareerGP: result.priorCareerGP,
            nhlPlayerId: result.playerId || p.nhlPlayerId,
            nhlTeamAbbr: result.nhlTeamAbbr || p.nhlTeamAbbr,
            photoUrl: result.headshotUrl || p.photoUrl,
            lastSyncedAt: result.timestamp,
            syncSource: result.source,
            apiSyncStatus: result.matchFound ? (result.source === 'sample_fallback' ? 'fallback' : 'synced') : 'no_record',
            syncBadge: result.statusBadge,
            hasEmptyStats: result.hasEmptyStats,
            matchFound: result.matchFound,
            statusNotes: result.statusMessage || p.statusNotes,
            syncErrorMessage: result.error,
          };
        }),
      }))
    );

    setGlobalLastUpdated(result.timestamp);
  }, [activeGm.prospects]);

  // Handle syncing all prospects for the active GM
  const handleSyncAllProspects = useCallback(async () => {
    setIsSyncingAll(true);

    try {
      // Run sync across active GM's prospects
      const promises = activeGm.prospects.map(async (p) => {
        const result = await syncProspectWithNhlApi(p);
        return { prospectId: p.id, result };
      });

      const results = await Promise.all(promises);

      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setGms((prevGms) =>
        prevGms.map((gm) => {
          if (gm.id !== activeGm.id) return gm;
          return {
            ...gm,
            prospects: gm.prospects.map((p) => {
              const resObj = results.find((r) => r.prospectId === p.id);
              if (!resObj) return p;
              const { result } = resObj;
              return {
                ...p,
                totalGames: result.totalGP,
                currentSeasonGP: result.currentSeasonGP,
                priorCareerGP: result.priorCareerGP,
                nhlPlayerId: result.playerId || p.nhlPlayerId,
                nhlTeamAbbr: result.nhlTeamAbbr || p.nhlTeamAbbr,
                photoUrl: result.headshotUrl || p.photoUrl,
                lastSyncedAt: result.timestamp,
                syncSource: result.source,
                apiSyncStatus: result.matchFound ? (result.source === 'sample_fallback' ? 'fallback' : 'synced') : 'no_record',
                syncBadge: result.statusBadge,
                hasEmptyStats: result.hasEmptyStats,
                matchFound: result.matchFound,
                statusNotes: result.statusMessage || p.statusNotes,
                syncErrorMessage: result.error,
              };
            }),
          };
        })
      );

      setGlobalLastUpdated(timestamp);
    } finally {
      setIsSyncingAll(false);
    }
  }, [activeGm]);

  // Handle adding a new prospect
  const handleAddProspect = async (newProspectData: Omit<Prospect, 'id'>) => {
    // We do NOT optimistically update here to avoid ID mismatch duplicates 
    // with the real-time subscription. We await the DB insert and let the 
    // postgres_changes event populate the new row, OR we update immediately 
    // with the returned DB ID.
    const { data, error } = await supabase.from('prospects').insert([{
      gm_name: activeGm.name,
      player_name: newProspectData.name,
      position: newProspectData.position,
      draft_year: newProspectData.draftYear,
      draft_round: newProspectData.draftRound,
      draft_pick: newProspectData.draftPick,
      nhl_team: newProspectData.nhlTeam,
      nhl_team_abbr: newProspectData.nhlTeamAbbr,
      total_games: newProspectData.totalGames,
      current_season_gp: newProspectData.currentSeasonGP,
      prior_career_gp: newProspectData.priorCareerGP,
      promoted: newProspectData.promoted,
      promotion_date: newProspectData.promotionDate,
      protected: newProspectData.isProtected,
      age: newProspectData.age,
      photo_url: newProspectData.photoUrl,
      status_notes: newProspectData.statusNotes,
      nhl_player_id: newProspectData.nhlPlayerId,
    }]).select();

    if (error) {
      console.error("Error adding prospect:", error);
      return;
    }

    if (data && data.length > 0) {
      const mappedProspect = mapProspectRow(data[0]);
      setGms((prevGms) =>
        prevGms.map((gm) => {
          if (gm.id !== activeGm.id) return gm;
          if (gm.prospects.some(p => p.id === mappedProspect.id)) return gm;
          
          return {
            ...gm,
            prospects: [mappedProspect, ...gm.prospects],
          };
        })
      );
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const handleOpenEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setIsEditModalOpen(true);
  };

  const handleEditProspect = async (prospectId: string, updatedData: Partial<Prospect>) => {
    const { error } = await supabase.from('prospects').update({
      player_name: updatedData.name,
      position: updatedData.position,
      draft_year: updatedData.draftYear,
      draft_round: updatedData.draftRound,
      draft_pick: updatedData.draftPick,
      nhl_team: updatedData.nhlTeam,
      nhl_team_abbr: updatedData.nhlTeamAbbr,
      total_games: updatedData.totalGames,
      current_season_gp: updatedData.currentSeasonGP,
      prior_career_gp: updatedData.priorCareerGP,
      protected: updatedData.isProtected,
      status_notes: updatedData.statusNotes,
    }).eq('id', prospectId);

    if (error) {
      console.error("Error editing prospect:", error);
      return;
    }

    setGms((prevGms) =>
      prevGms.map((gm) => {
        if (gm.id !== activeGm.id) return gm;
        return {
          ...gm,
          prospects: gm.prospects.map((p) => {
            if (p.id !== prospectId) return p;
            return {
              ...p,
              ...updatedData,
            };
          }),
        };
      })
    );
  };

  const handleDeleteProspect = async (prospectId: string) => {
    if (!window.confirm("Are you sure you want to delete this prospect from the pool?")) return;

    const { error } = await supabase.from('prospects').delete().eq('id', prospectId);

    if (error) {
      console.error("Error deleting prospect:", error);
      return;
    }

    setGms((prevGms) =>
      prevGms.map((gm) => {
        if (gm.id !== activeGm.id) return gm;
        return {
          ...gm,
          prospects: gm.prospects.filter((p) => p.id !== prospectId),
        };
      })
    );
  };

  // Compute counts for active GM
  const counts = useMemo(() => {
    const all = activeGm.prospects.length;
    let f = 0;
    let d = 0;
    let g = 0;
    let actionRequired = 0;
    let promoted = 0;
    let protectedCount = 0;
    let developing = 0;

    activeGm.prospects.forEach((p) => {
      if (p.position === 'F') f++;
      if (p.position === 'D') d++;
      if (p.position === 'G') g++;

      const ev = evaluateProspect(p);
      if (ev.isMandatoryPromotion || ev.isWatchlist) {
        actionRequired++;
      }
      if (p.promoted || ev.isMandatoryPromotion) {
        promoted++;
      }
      if (p.isProtected) {
        protectedCount++;
      }
      if (!p.promoted && !ev.isMandatoryPromotion && !ev.isWatchlist && !p.isProtected) {
        developing++;
      }
    });

    return {
      all,
      f,
      d,
      g,
      actionRequired,
      promoted,
      protected: protectedCount,
      developing,
    };
  }, [activeGm.prospects]);

  // Filtered prospects
  const filteredProspects = useMemo(() => {
    return activeGm.prospects.filter((p) => {
      // Position filter
      if (positionFilter !== 'ALL' && p.position !== positionFilter) {
        return false;
      }

      // Status filter
      const ev = evaluateProspect(p);
      if (statusFilter === 'ACTION_REQUIRED' && !ev.isMandatoryPromotion && !ev.isWatchlist) {
        return false;
      }
      if (statusFilter === 'PROMOTED' && !(p.promoted || ev.isMandatoryPromotion)) {
        return false;
      }
      if (statusFilter === 'PROTECTED' && !p.isProtected) {
        return false;
      }
      if (statusFilter === 'DEVELOPING' && (p.promoted || ev.isMandatoryPromotion || ev.isWatchlist || p.isProtected)) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesTeam = p.nhlTeam.toLowerCase().includes(query) || p.nhlTeamAbbr.toLowerCase().includes(query);
        const matchesYear = p.draftYear.toString().includes(query);
        const matchesPos = p.position.toLowerCase() === query;

        if (!matchesName && !matchesTeam && !matchesYear && !matchesPos) {
          return false;
        }
      }

      return true;
    });
  }, [activeGm.prospects, positionFilter, statusFilter, searchQuery]);

  // Group by position (Forwards, Defensemen, Goalies)
  const forwards = useMemo(
    () => filteredProspects.filter((p) => p.position === 'F'),
    [filteredProspects]
  );
  const defensemen = useMemo(
    () => filteredProspects.filter((p) => p.position === 'D'),
    [filteredProspects]
  );
  const goalies = useMemo(
    () => filteredProspects.filter((p) => p.position === 'G'),
    [filteredProspects]
  );

  // View Mode: 'list' (default) vs 'card'
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  // Expanded prospect IDs set for accordion expand/collapse
  const [expandedProspectIds, setExpandedProspectIds] = useState<Set<string>>(new Set());

  const handleToggleExpandProspect = useCallback((prospectId: string) => {
    setExpandedProspectIds((prev) => {
      const next = new Set(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
      } else {
        next.add(prospectId);
      }
      return next;
    });
  }, []);

  const allExpanded = useMemo(() => {
    return (
      filteredProspects.length > 0 &&
      filteredProspects.every((p) => expandedProspectIds.has(p.id))
    );
  }, [filteredProspects, expandedProspectIds]);

  const handleToggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedProspectIds(new Set());
    } else {
      setExpandedProspectIds(new Set(filteredProspects.map((p) => p.id)));
    }
  }, [allExpanded, filteredProspects]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans antialiased flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        <p className="text-slate-400 font-medium">Connecting to Supabase...</p>
      </div>
    );
  }

  if (!activeGm) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans antialiased flex flex-col items-center justify-center space-y-4">
        <Activity className="h-10 w-10 text-slate-600 mb-2" />
        <h2 className="text-xl font-bold text-slate-300">No Teams Found</h2>
        <p className="text-slate-500 max-w-sm text-center">Your Supabase database is connected but no GMs were found in the "gms" table.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. GM Selector Header & NHL API live status */}
      <Header
        gms={gms}
        selectedGmId={selectedGmId}
        onSelectGm={(id) => {
          setSelectedGmId(id);
          // Reset filters on GM switch so user sees full roster
          setPositionFilter('ALL');
          setStatusFilter('ALL');
          setSearchQuery('');
        }}
        onOpenRules={() => setIsRulesModalOpen(true)}
        mandatoryCount={counts.promoted}
        watchlistCount={counts.actionRequired - counts.promoted}
        protectedCount={counts.protected}
        isSyncingAll={isSyncingAll}
        globalLastUpdated={globalLastUpdated}
        onSyncAll={handleSyncAllProspects}
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 2. Promotion Watchlist Banner */}
        <WatchlistBanner
          prospects={activeGm.prospects}
          onSelectProspect={(id) => {
            const el = document.getElementById(`prospect-card-${id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-cyan-400');
              setTimeout(() => {
                el.classList.remove('ring-2', 'ring-cyan-400');
              }, 2000);
            }
          }}
          onFilterActionRequired={() => {
            setStatusFilter('ACTION_REQUIRED');
            setPositionFilter('ALL');
          }}
        />

        {/* Action Toolbar above filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
              {activeGm.name}'s Prospect Pool
            </h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              {filteredProspects.length} of {activeGm.prospects.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAllProspects}
              disabled={isSyncingAll}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-1.5 text-xs font-bold text-cyan-300 transition-colors shadow-sm disabled:opacity-50"
              title="Sync all prospects with official NHL stats"
            >
              {isSyncingAll ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                  <span>Syncing NHL API...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Sync NHL Stats</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition-colors shadow-sm shadow-cyan-500/20"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Prospect</span>
            </button>
          </div>
        </div>

        {/* Real-time NHL API Sync Status Notification Bar */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="text-slate-300">
              <span className="font-semibold text-slate-200">Official NHL API Sync: </span>
              <span className="text-slate-400">
                Cards query <code className="text-[11px] text-cyan-300 font-mono bg-slate-800 px-1 py-0.5 rounded">api-web.nhle.com</code> for live games played & career totals. 40/65 skater and 20/30 goalie rules re-evaluate automatically.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSyncingAll ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-950/80 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-700/60 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                <span>Syncing with NHL API...</span>
              </span>
            ) : globalLastUpdated ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Last Updated: <strong className="text-white font-mono">{globalLastUpdated}</strong></span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-700">
                <span>Auto-syncing on card load</span>
              </span>
            )}
          </div>
        </div>

        {/* 4. Filters & Search */}
        <FiltersAndSearch
          positionFilter={positionFilter}
          setPositionFilter={setPositionFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          counts={counts}
          onResetFilters={() => {
            setPositionFilter('ALL');
            setStatusFilter('ALL');
            setSearchQuery('');
          }}
          viewMode={viewMode}
          setViewMode={setViewMode}
          allExpanded={allExpanded}
          onToggleExpandAll={handleToggleExpandAll}
        />

        {/* 3. Prospect Roster (List View Default or Card Grid, Grouped by Position) */}
        {filteredProspects.length === 0 ? (
          <div className="my-12 rounded-2xl border border-slate-800 bg-[#1e293b]/60 p-8 text-center max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-3 border border-slate-700">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Prospects Found</h3>
            <p className="mt-1 text-xs text-slate-400">
              No players match your active position, status, or search filters.
            </p>
            <button
              onClick={() => {
                setPositionFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show Forwards if position is ALL or F */}
            {(positionFilter === 'ALL' || positionFilter === 'F') && (
              <PositionSection
                title="Forwards"
                prospects={forwards}
                viewMode={viewMode}
                expandedProspectIds={expandedProspectIds}
                onToggleExpandProspect={handleToggleExpandProspect}
                onSetExpandedProspects={setExpandedProspectIds}
                onUpdateGP={handleUpdateGP}
                onToggleProtection={handleToggleProtection}
                onTogglePromotion={handleTogglePromotion}
                onSyncProspect={handleSyncProspect}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProspect}
              />
            )}

            {/* Show Defensemen if position is ALL or D */}
            {(positionFilter === 'ALL' || positionFilter === 'D') && (
              <PositionSection
                title="Defensemen"
                prospects={defensemen}
                viewMode={viewMode}
                expandedProspectIds={expandedProspectIds}
                onToggleExpandProspect={handleToggleExpandProspect}
                onSetExpandedProspects={setExpandedProspectIds}
                onUpdateGP={handleUpdateGP}
                onToggleProtection={handleToggleProtection}
                onTogglePromotion={handleTogglePromotion}
                onSyncProspect={handleSyncProspect}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProspect}
              />
            )}

            {/* Show Goalies if position is ALL or G */}
            {(positionFilter === 'ALL' || positionFilter === 'G') && (
              <PositionSection
                title="Goalies"
                prospects={goalies}
                viewMode={viewMode}
                expandedProspectIds={expandedProspectIds}
                onToggleExpandProspect={handleToggleExpandProspect}
                onSetExpandedProspects={setExpandedProspectIds}
                onUpdateGP={handleUpdateGP}
                onToggleProtection={handleToggleProtection}
                onTogglePromotion={handleTogglePromotion}
                onSyncProspect={handleSyncProspect}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProspect}
              />
            )}
          </div>
        )}

        {/* Quick Footer Info / Rule Guide Banner */}
        <div className="mt-12 rounded-2xl border border-slate-800 bg-[#1e293b]/80 p-5 sm:p-6 text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">
                Winko's Hockey Pool • Prospect Eligibility System
              </div>
              <div className="text-xs text-slate-400">
                Skaters: 40 single-season / 65 cumulative GP • Goalies: 20 single-season / 30 cumulative GP
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:border-slate-600 transition-colors shrink-0"
          >
            <Info className="h-3.5 w-3.5 text-cyan-400" />
            <span>Read League Constitution</span>
          </button>
        </div>
      </main>

      {/* Modals */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      <AddProspectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProspect}
        gmName={activeGm.name}
      />

      <EditProspectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onEdit={handleEditProspect}
        prospect={editingProspect}
        gmName={activeGm.name}
      />
    </div>
  );
}
