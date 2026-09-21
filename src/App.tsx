import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  GeneralManager,
  PositionFilter,
  StatusFilter,
  Prospect,
  ProspectStatus,
  evaluateProspect,
  ViewMode,
  ProspectSortOption,
  sortProspects,
} from './types';
import { INITIAL_GMS, setStoredProspectStatus, setStoredScoringStats, getStoredScoringStats, getBaselineScoringStats, calculateFantasyPoints } from './data/mockData';
import { Header } from './components/Header';
import WinkoHub from './components/WinkoHub';
import { FiltersAndSearch } from './components/FiltersAndSearch';
import { PositionSection } from './components/PositionSection';
import { RulesModal } from './components/RulesModal';
import { AddProspectModal } from './components/AddProspectModal';
import { EditProspectModal } from './components/EditProspectModal';
import WinkosChallenges from './components/WinkosChallenges';
import { ProspectLanding } from './components/ProspectLanding';
import { SeasonsLanding } from './components/SeasonsLanding';
import ActiveSquadManager from './components/ActiveSquadManager';
import KeeperSelectionPortal from './components/KeeperSelectionPortal';
import WaiverWirePortal from './components/WaiverWirePortal';
import SeasonTransactionsFeed from './components/SeasonTransactionsFeed';
import CommishBackOffice from './components/CommishBackOffice';
import { SeasonHub } from './components/SeasonHub';
import { syncProspectWithNhlApi, setStored25PlusSeasons } from './services/nhlApi';
import { supabase, fetchLeagueData, mapProspectRow, addDeletedProspectId } from './lib/supabase';
import {
  UserPlus,
  Shield,
  Layers,
  Sparkles,
  Info,
  Loader2,
  CheckCircle2,
  Activity,
  Trophy,
  Users,
} from 'lucide-react';

export default function App() {
  const [gms, setGms] = useState<GeneralManager[]>(INITIAL_GMS);
  const [selectedGmId, setSelectedGmId] = useState<string>('gm-adam');
  const [authedGmId, setAuthedGmId] = useState<string | null>(null);
  const [view, setView] = useState<'hub' | 'season' | 'seasons' | 'keepers' | 'waivers' | 'transactions' | 'prospect-central' | 'prospects' | 'arcade' | 'active-squad' | 'commish'>('hub');
  const [selectedSeason, setSelectedSeason] = useState<string>('2026-27');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortOption, setSortOption] = useState<ProspectSortOption>('urgency');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [globalLastUpdated, setGlobalLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('winkos_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('winkos_theme', next);
    } catch {}
  };

  const isLight = theme === 'light';

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }

    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
    }
  }, [theme]);

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

  // GM Leaderboard for active GM stats calculation
  const gmLeaderboard = useMemo(() => {
    const list = gms.map((gm) => {
      let pts = 0;
      let goals = 0;
      let assists = 0;
      let wins = 0;
      let promoted = 0;
      gm.prospects.forEach((p) => {
        const stored = getStoredScoringStats(String(p.id), p.name);
        const baseline = stored || getBaselineScoringStats(p.name, p.position, p.gp || 0);
        const pGoals = p.goals != null && !isNaN(Number(p.goals)) ? Number(p.goals) : baseline.goals;
        const pAssists = p.assists != null && !isNaN(Number(p.assists)) ? Number(p.assists) : baseline.assists;
        const pPpPoints = p.pp_points != null && !isNaN(Number(p.pp_points)) ? Number(p.pp_points) : baseline.pp_points;
        const pShPoints = p.sh_points != null && !isNaN(Number(p.sh_points)) ? Number(p.sh_points) : baseline.sh_points;
        const pGwg = p.gwg != null && !isNaN(Number(p.gwg)) ? Number(p.gwg) : baseline.gwg;
        const pPlusMinus = p.plus_minus != null && !isNaN(Number(p.plus_minus)) ? Number(p.plus_minus) : baseline.plus_minus;
        const pPim = p.pim != null && !isNaN(Number(p.pim)) ? Number(p.pim) : baseline.pim;
        const pShots = p.shots != null && !isNaN(Number(p.shots)) ? Number(p.shots) : baseline.shots;
        const pWins = p.wins != null && !isNaN(Number(p.wins)) ? Number(p.wins) : baseline.wins;
        const pShutouts = p.shutouts != null && !isNaN(Number(p.shutouts)) ? Number(p.shutouts) : baseline.shutouts;
        const pSaves = p.saves != null && !isNaN(Number(p.saves)) ? Number(p.saves) : baseline.saves;
        const pGoalsAgainst = p.goals_against != null && !isNaN(Number(p.goals_against)) ? Number(p.goals_against) : baseline.goals_against;

        const prospectFP = calculateFantasyPoints({
          goals: pGoals,
          assists: pAssists,
          pp_points: pPpPoints,
          sh_points: pShPoints,
          gwg: pGwg,
          plus_minus: pPlusMinus,
          pim: pPim,
          shots: pShots,
          wins: pWins,
          shutouts: pShutouts,
          saves: pSaves,
          goals_against: pGoalsAgainst,
        });

        pts += prospectFP;
        goals += pGoals;
        assists += pAssists;
        if (p.position === 'G') wins += pWins;
        if (p.promoted) promoted++;
      });
      return {
        id: gm.id,
        name: gm.name,
        teamName: gm.teamName,
        total_fantasy_points: pts,
        goals,
        assists,
        wins,
        total_prospects: gm.prospects.length,
        promoted_count: promoted,
      };
    });
    list.sort((a, b) => b.total_fantasy_points - a.total_fantasy_points || b.goals - a.goals);
    return list;
  }, [gms]);

  const activeGmStats = useMemo(() => {
    const found = gmLeaderboard.find((g) => g.id === activeGm.id);
    const rank = gmLeaderboard.findIndex((g) => g.id === activeGm.id) + 1;
    const totalP = found?.total_prospects || activeGm.prospects.length;
    const promotedP = found?.promoted_count || activeGm.prospects.filter((p) => p.promoted).length;
    return {
      total_prospects: totalP,
      promoted_count: promotedP,
      hit_rate: totalP > 0 ? Math.round((promotedP / totalP) * 100) : 0,
      total_fantasy_points: found?.total_fantasy_points || activeGm.prospects.reduce((s, p) => s + calculateFantasyPoints(p), 0),
      goals: found?.goals || activeGm.prospects.reduce((s, p) => s + Number(p.goals || 0), 0),
      assists: found?.assists || activeGm.prospects.reduce((s, p) => s + Number(p.assists || 0), 0),
      wins: found?.wins || activeGm.prospects.reduce((s, p) => s + (p.position === 'G' ? Number(p.wins || 0) : 0), 0),
      rank: rank || 1,
    };
  }, [gmLeaderboard, activeGm]);

  // The GM currently authenticated via PIN (null until they unlock)
  const authedGm = useMemo(
    () => (authedGmId ? gms.find((g) => g.id === authedGmId) ?? null : null),
    [gms, authedGmId]
  );

  // Determine whether current user / GM has Admin access based on authenticated GM or active GM is_commish flag
  const isAdmin = useMemo(() => {
    return Boolean(
      (authedGm && (authedGm.is_commish || authedGm.name.toLowerCase() === 'adam')) ||
      activeGm.is_commish ||
      activeGm.name.toLowerCase() === 'adam'
    );
  }, [authedGm, activeGm]);

  // Validate a GM's PIN, unlock the hub, and persist the session locally.
  const handleAuthenticate = useCallback(
    (gmId: string, pin: string): boolean => {
      const gm = gms.find((g) => g.id === gmId);
      if (!gm) return false;
      if (String(gm.pin ?? '') !== String(pin ?? '')) return false;
      setAuthedGmId(gm.id);
      setSelectedGmId(gm.id);
      setView('season'); // Jump straight to Season Hub
      try {
        localStorage.setItem('winkos_active_gm', gm.id);
      } catch {
        /* localStorage may be unavailable (private mode) */
      }
      return true;
    },
    [gms]
  );

  // Clear the session and return to the locked hub.
  const handleLogout = useCallback(() => {
    setAuthedGmId(null);
    setView('hub');
    try {
      localStorage.removeItem('winkos_active_gm');
    } catch {
      /* no-op */
    }
  }, []);

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
    if (!isAdmin) {
      alert('Only the Commissioner can perform this action.');
      return;
    }
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

    // Sync with bench
    await syncProspectToBench(
      { ...prospect, promoted: nextPromoted },
      activeGm.name
    );
  };

  // Handle toggle protection
  const handleToggleProtection = async (prospectId: string) => {
    if (!isAdmin) {
      alert('Only the Commissioner can perform this action.');
      return;
    }
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

    // Sync with bench
    await syncProspectToBench(
      { ...prospect, isProtected: nextProtected },
      activeGm.name
    );
  };

  const syncProspectToBench = async (prospect: any, gmName: string) => {
    const isPromProt = prospect.promoted && prospect.isProtected;
    const currentSeason = '2026-27'; // Default season for new additions
    
    if (isPromProt) {
      // Find open bench slot
      const { data: currentBench } = await supabase
        .from('active_roster_players')
        .select('slot_position')
        .eq('gm_name', gmName)
        .eq('roster_status', 'BENCH')
        .in('season_id', [currentSeason, '2026-2027']);
      
      const usedSlots = currentBench?.map(r => r.slot_position) || [];
      const pos = (prospect.position || 'F').toUpperCase();
      let targetSlot = 'BENCH';

      if (pos === 'F') targetSlot = ['BF1', 'BF2', 'BF3'].find(s => !usedSlots.includes(s)) || 'BENCH';
      else if (pos === 'D') targetSlot = ['BD1', 'BD2'].find(s => !usedSlots.includes(s)) || 'BENCH';
      else if (pos === 'G') targetSlot = ['BG1', 'BG2'].find(s => !usedSlots.includes(s)) || 'BENCH';

      // Upsert into active_roster_players for the current season
      // We try to match by name, gm, and season to avoid duplicates across seasons
      await supabase.from('active_roster_players').upsert({
        season_id: currentSeason,
        gm_name: gmName,
        player_name: prospect.player_name,
        position: prospect.position || 'F',
        roster_status: 'BENCH',
        slot_position: targetSlot,
        gp: prospect.total_games || 0,
      }, { onConflict: 'player_name,gm_name,season_id' });
    } else {
      // Remove from bench specifically for this GM and name
      // We keep it broad on season to ensure we clean up any demoted records
      await supabase.from('active_roster_players')
        .delete()
        .eq('gm_name', gmName)
        .eq('player_name', prospect.player_name)
        .eq('roster_status', 'BENCH');
    }
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

    // Save 25+ GP count to local storage cache if available
    const seasonsCount = result.seasons25PlusGP !== undefined 
      ? result.seasons25PlusGP 
      : (currentProspect.seasons25PlusGP ?? 0);
    setStored25PlusSeasons(prospectId, currentProspect.name, seasonsCount);

    // 3. Update state with fresh data and auto re-evaluate rules
    const maxSingleSeason = result.max_single_season_gp ?? result.maxSingleSeasonGP ?? currentProspect.max_single_season_gp ?? currentProspect.maxSingleSeasonGP;
    const qualSeasons = result.qualifying_seasons ?? result.qualifyingSeasons ?? seasonsCount;

    setGms((prevGms) =>
      prevGms.map((gm) => ({
        ...gm,
        prospects: gm.prospects.map((p) => {
          if (p.id !== prospectId) return p;
          const displayGP = result.totalGP ?? p.total_games ?? p.totalGames ?? 0;
          return {
            ...p,
            totalGames: displayGP,
            total_games: displayGP,
            max_single_season_gp: maxSingleSeason,
            maxSingleSeasonGP: maxSingleSeason,
            qualifying_seasons: qualSeasons,
            currentSeasonGP: result.currentSeasonGP,
            priorCareerGP: result.priorCareerGP,
            nhl_id: result.playerId || p.nhl_id,
            nhlId: result.playerId || p.nhlId,
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
            seasons25PlusGP: seasonsCount,
            seasons25PlusHistory: result.seasons25PlusHistory ?? p.seasons25PlusHistory,
            season_breakdown: result.season_breakdown ?? p.season_breakdown,
            goals: result.goals ?? p.goals,
            assists: result.assists ?? p.assists,
            points: result.points ?? p.points,
            wins: result.wins ?? p.wins,
            save_pct: result.save_pct ?? p.save_pct,
          };
        }),
      }))
    );

    // Keep scoring stats in localStorage sync
    if (result.goals !== undefined || result.assists !== undefined || result.wins !== undefined || result.points !== undefined) {
      setStoredScoringStats(String(prospectId), currentProspect.name, {
        goals: result.goals,
        assists: result.assists,
        points: result.points,
        wins: result.wins,
        save_pct: result.save_pct,
      });
    }

    // Persist new fields to Supabase
    try {
      const dbId = !isNaN(Number(prospectId)) ? Number(prospectId) : prospectId;
      const parsedNhlId = result.playerId && !isNaN(Number(result.playerId))
        ? Number(result.playerId)
        : (currentProspect.nhl_id && !isNaN(Number(currentProspect.nhl_id)) ? Number(currentProspect.nhl_id) : null);

      const updatePayload: Record<string, any> = {
        total_games: result.totalGP ?? currentProspect.total_games ?? currentProspect.totalGames ?? 0,
        max_single_season_gp: maxSingleSeason ?? 0,
        qualifying_seasons: qualSeasons,
        season_breakdown: result.season_breakdown ?? [],
      };
      if (parsedNhlId !== null) {
        updatePayload.nhl_id = parsedNhlId;
      }
      if (result.goals !== undefined) updatePayload.goals = result.goals;
      if (result.assists !== undefined) updatePayload.assists = result.assists;
      if (result.points !== undefined) updatePayload.points = result.points;
      if (result.wins !== undefined) updatePayload.wins = result.wins;
      if (result.shutouts !== undefined) updatePayload.shutouts = result.shutouts;
      if (result.saves !== undefined) updatePayload.saves = result.saves;
      if (result.goals_against !== undefined) updatePayload.goals_against = result.goals_against;
      if (result.save_pct !== undefined) updatePayload.save_pct = result.save_pct;
      if (result.pim !== undefined) updatePayload.pim = result.pim;
      if (result.plus_minus !== undefined) updatePayload.plus_minus = result.plus_minus;
      if (result.power_play_points !== undefined) updatePayload.power_play_points = result.power_play_points;
      if (result.shorthanded_points !== undefined) updatePayload.shorthanded_points = result.shorthanded_points;
      if (result.game_winning_goals !== undefined) updatePayload.game_winning_goals = result.game_winning_goals;
      if (result.shots !== undefined) updatePayload.shots = result.shots;

      console.log(`[Supabase] Syncing prospect #${dbId} (${currentProspect.name}):`, updatePayload);
      const { data, error: syncDbErr } = await supabase.from('prospects')
        .update(updatePayload)
        .eq('id', dbId)
        .select();

      if (syncDbErr) {
        console.error("Error updating synced stats in Supabase:", syncDbErr);
      } else {
        console.log(`[Supabase] Synced stats successfully saved for prospect #${dbId}:`, data);
      }
    } catch (e) {
      console.error("Failed to persist synced stats to Supabase:", e);
    }

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

      // Save each prospect's 25+ count to cache
      for (const resObj of results) {
        const p = activeGm.prospects.find(item => item.id === resObj.prospectId);
        if (p && resObj.result.seasons25PlusGP !== undefined) {
          setStored25PlusSeasons(p.id, p.name, resObj.result.seasons25PlusGP);
        }
      }

      setGms((prevGms) =>
        prevGms.map((gm) => {
          if (gm.id !== activeGm.id) return gm;
          return {
            ...gm,
            prospects: gm.prospects.map((p) => {
              const resObj = results.find((r) => r.prospectId === p.id);
              if (!resObj) return p;
              const { result } = resObj;
              const seasonsCount = result.seasons25PlusGP !== undefined 
                ? result.seasons25PlusGP 
                : (p.seasons25PlusGP ?? 0);
              const maxSingleSeason = result.max_single_season_gp ?? result.maxSingleSeasonGP ?? p.max_single_season_gp ?? p.maxSingleSeasonGP;
              const qualSeasons = result.qualifying_seasons ?? result.qualifyingSeasons ?? seasonsCount;
              const displayGP = result.totalGP ?? p.total_games ?? p.totalGames ?? 0;
              return {
                ...p,
                totalGames: displayGP,
                total_games: displayGP,
                max_single_season_gp: maxSingleSeason,
                maxSingleSeasonGP: maxSingleSeason,
                qualifying_seasons: qualSeasons,
                currentSeasonGP: result.currentSeasonGP,
                priorCareerGP: result.priorCareerGP,
                nhl_id: result.playerId || p.nhl_id,
                nhlId: result.playerId || p.nhlId,
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
                seasons25PlusGP: seasonsCount,
                seasons25PlusHistory: result.seasons25PlusHistory ?? p.seasons25PlusHistory,
                season_breakdown: result.season_breakdown ?? p.season_breakdown,
                goals: result.goals ?? p.goals,
                assists: result.assists ?? p.assists,
                points: result.points ?? p.points,
                wins: result.wins ?? p.wins,
                save_pct: result.save_pct ?? p.save_pct,
              };
            }),
          };
        })
      );

      // Persist new fields to Supabase
      for (const resObj of results) {
        try {
          const p = activeGm.prospects.find(item => item.id === resObj.prospectId);
          const maxSingleSeason = resObj.result.max_single_season_gp ?? resObj.result.maxSingleSeasonGP ?? p?.max_single_season_gp ?? 0;
          const qualSeasons = resObj.result.qualifying_seasons ?? resObj.result.qualifyingSeasons ?? resObj.result.seasons25PlusGP ?? 0;
          const dbId = !isNaN(Number(resObj.prospectId)) ? Number(resObj.prospectId) : resObj.prospectId;
          const parsedNhlId = resObj.result.playerId && !isNaN(Number(resObj.result.playerId))
            ? Number(resObj.result.playerId)
            : (p?.nhl_id && !isNaN(Number(p.nhl_id)) ? Number(p.nhl_id) : null);

          // Keep localStorage cache in sync
          if (p?.name) {
            setStored25PlusSeasons(resObj.prospectId, p.name, qualSeasons);
            if (resObj.result.goals !== undefined || resObj.result.assists !== undefined || resObj.result.wins !== undefined || resObj.result.points !== undefined) {
              setStoredScoringStats(String(resObj.prospectId), p.name, {
                goals: resObj.result.goals,
                assists: resObj.result.assists,
                points: resObj.result.points,
                wins: resObj.result.wins,
                save_pct: resObj.result.save_pct,
              });
            }
          }

          const updatePayload: Record<string, any> = {
            total_games: resObj.result.totalGP ?? p?.total_games ?? p?.totalGames ?? 0,
            max_single_season_gp: maxSingleSeason,
            qualifying_seasons: qualSeasons,
            season_breakdown: resObj.result.season_breakdown ?? [],
          };
          if (parsedNhlId !== null) {
            updatePayload.nhl_id = parsedNhlId;
          }
          if (resObj.result.goals !== undefined) updatePayload.goals = resObj.result.goals;
          if (resObj.result.assists !== undefined) updatePayload.assists = resObj.result.assists;
          if (resObj.result.points !== undefined) updatePayload.points = resObj.result.points;
          if (resObj.result.wins !== undefined) updatePayload.wins = resObj.result.wins;
          if (resObj.result.shutouts !== undefined) updatePayload.shutouts = resObj.result.shutouts;
          if (resObj.result.saves !== undefined) updatePayload.saves = resObj.result.saves;
          if (resObj.result.goals_against !== undefined) updatePayload.goals_against = resObj.result.goals_against;
          if (resObj.result.save_pct !== undefined) updatePayload.save_pct = resObj.result.save_pct;
          if (resObj.result.pim !== undefined) updatePayload.pim = resObj.result.pim;
          if (resObj.result.plus_minus !== undefined) updatePayload.plus_minus = resObj.result.plus_minus;
          if (resObj.result.power_play_points !== undefined) updatePayload.power_play_points = resObj.result.power_play_points;
          if (resObj.result.shorthanded_points !== undefined) updatePayload.shorthanded_points = resObj.result.shorthanded_points;
          if (resObj.result.game_winning_goals !== undefined) updatePayload.game_winning_goals = resObj.result.game_winning_goals;
          if (resObj.result.shots !== undefined) updatePayload.shots = resObj.result.shots;
          await supabase.from('prospects')
            .update(updatePayload)
            .eq('id', dbId);
        } catch (err) {
          console.error("Error persisting batch sync to Supabase:", err);
        }
      }

      setGlobalLastUpdated(timestamp);
    } finally {
      setIsSyncingAll(false);
    }
  }, [activeGm]);

  // Handle adding a new prospect
  const handleAddProspect = async (newProspectData: Partial<Prospect>) => {
    // We do NOT optimistically update here to avoid ID mismatch duplicates 
    // with the real-time subscription. We await the DB insert and let the 
    // postgres_changes event populate the new row, OR we update immediately 
    // with the returned DB ID.
    const targetGmName = newProspectData.gm_name || newProspectData.gmName || activeGm.name;
    const isTrashed = newProspectData.status === 'trashed' || newProspectData.status === 'inactive';
    const rawNhlId = newProspectData.nhl_id ?? newProspectData.nhlId ?? newProspectData.nhlPlayerId;
    const isExplicitNoNhlId = Boolean(newProspectData.hasNoNhlId || rawNhlId === null || rawNhlId === '');
    const numNhlId = (!isExplicitNoNhlId && rawNhlId && !isNaN(Number(rawNhlId))) ? Number(rawNhlId) : null;
    const currentGP = Number(newProspectData.currentSeasonGP) || 0;
    const priorGP = Number(newProspectData.priorCareerGP) || 0;
    const totalGames = currentGP + priorGP;
    const qualSeasons = newProspectData.seasons25PlusGP ?? newProspectData.qualifyingSeasons ?? 0;

    // Build payload containing ONLY actual columns existing in Supabase prospects table:
    // id, gm_name, player_name, position, draft_year, promoted, protected, promotion_date,
    // is_inactive, nhl_id, total_games, qualifying_seasons, max_single_season_gp, season_breakdown
    const insertPayload: Record<string, any> = {
      gm_name: targetGmName,
      player_name: newProspectData.name?.trim(),
      position: newProspectData.position || 'F',
      draft_year: Number(newProspectData.draftYear) || 2024,
      promoted: Boolean(newProspectData.promoted),
      promotion_date: newProspectData.promotionDate || null,
      protected: Boolean(newProspectData.isProtected),
      is_inactive: isTrashed,
      nhl_id: numNhlId,
      total_games: totalGames,
      qualifying_seasons: qualSeasons,
      max_single_season_gp: currentGP,
      season_breakdown: [],
    };

    console.log("Inserting new prospect into Supabase:", insertPayload);
    let { data, error } = await supabase.from('prospects').insert([insertPayload]).select();

    if (error) {
      console.warn("Retrying insert without optional columns:", error);
      const retryPayload = { ...insertPayload };
      if (error.message?.includes('is_inactive') || error.details?.includes('is_inactive')) {
        delete retryPayload.is_inactive;
      }
      if (error.message?.includes('qualifying_seasons') || error.details?.includes('qualifying_seasons')) {
        delete retryPayload.qualifying_seasons;
      }
      if (error.message?.includes('season_breakdown') || error.details?.includes('season_breakdown')) {
        delete retryPayload.season_breakdown;
      }
      const retryRes = await supabase.from('prospects').insert([retryPayload]).select();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error("Error adding prospect to Supabase:", error);
      alert(`Error adding prospect: ${error.message || 'Please check database connection.'}`);
      return;
    }

    if (data && data.length > 0) {
      const mappedProspect = mapProspectRow(data[0]);
      const enrichedProspect: Prospect = {
        ...mappedProspect,
        nhlTeam: newProspectData.nhlTeam || mappedProspect.nhlTeam,
        nhlTeamAbbr: newProspectData.nhlTeamAbbr || mappedProspect.nhlTeamAbbr,
        draftRound: newProspectData.draftRound || 1,
        draftPick: newProspectData.draftPick || 1,
        currentSeasonGP: currentGP,
        priorCareerGP: priorGP,
        statusNotes: newProspectData.statusNotes,
      };

      setGms((prevGms) =>
        prevGms.map((gm) => {
          if (gm.name.trim().toLowerCase() !== targetGmName.trim().toLowerCase()) return gm;
          if (gm.prospects.some(p => p.id === enrichedProspect.id)) return gm;
          
          return {
            ...gm,
            prospects: [enrichedProspect, ...gm.prospects],
          };
        })
      );
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const handleOpenEdit = (prospect: Prospect) => {
    if (!isAdmin) {
      alert('Only the Commissioner can perform this action.');
      return;
    }
    setEditingProspect(prospect);
    setIsEditModalOpen(true);
  };

  const handleEditProspect = async (prospectId: string, updatedData: Partial<Prospect>) => {
    const isStatusOnly = Object.keys(updatedData).every(k => k === 'status');
    if (!isStatusOnly && !isAdmin) {
      alert('Only the Commissioner can perform this action.');
      return;
    }
    const isTrashed = updatedData.status === 'trashed' || updatedData.status === 'inactive';
    const newGmName = updatedData.gm_name || updatedData.gmName;

    // 1. Optimistically update local React state FIRST for instant UI and counter response across all GMs
    setGms((prevGms) => {
      // Find current prospect to determine if GM changed
      let oldGmName = '';
      let targetProspect: Prospect | undefined;

      for (const gm of prevGms) {
        const found = gm.prospects.find((p) => p.id === prospectId);
        if (found) {
          oldGmName = gm.name;
          targetProspect = found;
          break;
        }
      }

      if (!targetProspect) return prevGms;

      const isExplicitNoNhlId = Boolean(
        updatedData.hasNoNhlId ||
        updatedData.nhl_id === null ||
        updatedData.nhlId === null ||
        updatedData.nhlPlayerId === null
      );

      const newTotalGames = updatedData.totalGames !== undefined ? updatedData.totalGames : targetProspect.totalGames;
      const updatedProspect: Prospect = {
        ...targetProspect,
        ...updatedData,
        nhl_id: isExplicitNoNhlId ? undefined : (updatedData.nhl_id ?? targetProspect.nhl_id),
        nhlId: isExplicitNoNhlId ? undefined : (updatedData.nhlId ?? targetProspect.nhlId),
        nhlPlayerId: isExplicitNoNhlId ? undefined : (updatedData.nhlPlayerId ?? targetProspect.nhlPlayerId),
        hasNoNhlId: isExplicitNoNhlId ? true : (updatedData.nhl_id ? false : targetProspect.hasNoNhlId),
        totalGames: newTotalGames,
        total_games: newTotalGames,
        gm_name: newGmName || targetProspect.gm_name || oldGmName,
        gmName: newGmName || targetProspect.gmName || oldGmName,
      };

      // Check if GM changed
      const gmChanged = Boolean(newGmName && oldGmName && newGmName.trim().toLowerCase() !== oldGmName.trim().toLowerCase());

      if (gmChanged) {
        return prevGms.map((gm) => {
          // Remove from old GM
          if (gm.name.trim().toLowerCase() === oldGmName.trim().toLowerCase()) {
            return {
              ...gm,
              prospects: gm.prospects.filter((p) => p.id !== prospectId),
            };
          }
          // Add to new GM
          if (gm.name.trim().toLowerCase() === newGmName!.trim().toLowerCase()) {
            return {
              ...gm,
              prospects: [...gm.prospects.filter((p) => p.id !== prospectId), updatedProspect],
            };
          }
          return gm;
        });
      }

      // Same GM: update in place
      return prevGms.map((gm) => ({
        ...gm,
        prospects: gm.prospects.map((p) => (p.id === prospectId ? updatedProspect : p)),
      }));
    });

    // Save status to local storage cache for instant persistence
    if (updatedData.status !== undefined) {
      let targetName = '';
      for (const gm of gms) {
        const found = gm.prospects.find(p => p.id === prospectId);
        if (found) { targetName = found.name; break; }
      }
      setStoredProspectStatus(prospectId, targetName, isTrashed ? 'trashed' : 'active');
    }

    // 2. Persist to Supabase asynchronously with fallback handling
    try {
      const dbId = !isNaN(Number(prospectId)) ? Number(prospectId) : prospectId;
      const updatePayload: Record<string, any> = {};

      if (newGmName) {
        updatePayload.gm_name = newGmName;
      }
      if (updatedData.name !== undefined) {
        updatePayload.player_name = updatedData.name;
      }
      if (updatedData.position !== undefined) updatePayload.position = updatedData.position;
      if (updatedData.draftYear !== undefined) updatePayload.draft_year = updatedData.draftYear;
      if (updatedData.totalGames !== undefined) {
        updatePayload.total_games = updatedData.totalGames;
      }
      if (updatedData.isProtected !== undefined) updatePayload.protected = updatedData.isProtected;

      if (updatedData.status !== undefined) {
        updatePayload.is_inactive = isTrashed;
      }

      if (
        updatedData.hasNoNhlId ||
        updatedData.nhl_id === null ||
        updatedData.nhlId === null ||
        updatedData.nhlPlayerId === null
      ) {
        updatePayload.nhl_id = null;
      } else if (updatedData.nhl_id !== undefined || updatedData.nhlId !== undefined || updatedData.nhlPlayerId !== undefined) {
        const rawNhlId = updatedData.nhl_id ?? updatedData.nhlId ?? updatedData.nhlPlayerId;
        const numId = rawNhlId && !isNaN(Number(rawNhlId)) ? Number(rawNhlId) : null;
        updatePayload.nhl_id = numId;
      }

      if (updatedData.max_single_season_gp !== undefined || updatedData.maxSingleSeasonGP !== undefined) {
        updatePayload.max_single_season_gp = updatedData.max_single_season_gp ?? updatedData.maxSingleSeasonGP;
      }

      const qual = updatedData.qualifying_seasons ?? updatedData.qualifyingSeasons ?? updatedData.seasons25PlusGP;
      if (qual !== undefined) {
        updatePayload.qualifying_seasons = qual;
      }

      if (updatedData.season_breakdown !== undefined) {
        if (typeof updatedData.season_breakdown === 'string') {
          try {
            updatePayload.season_breakdown = JSON.parse(updatedData.season_breakdown);
          } catch {
            updatePayload.season_breakdown = [];
          }
        } else if (Array.isArray(updatedData.season_breakdown)) {
          updatePayload.season_breakdown = updatedData.season_breakdown;
        }
      }

      console.log("Updating Supabase prospect id:", dbId, updatePayload);
      const { data, error } = await supabase.from('prospects').update(updatePayload).eq('id', dbId).select();
      if (error) {
        console.warn("Retrying update with fallback columns:", error);
        const retryPayload = { ...updatePayload };
        if (error.message?.includes('is_inactive') || error.details?.includes('is_inactive')) {
          delete retryPayload.is_inactive;
        }
        const retryRes = await supabase.from('prospects').update(retryPayload).eq('id', dbId).select();
        if (retryRes.error) {
          console.error("Supabase update failed on retry:", retryRes.error);
        } else {
          console.log("Supabase update succeeded on retry:", retryRes.data);
        }
      } else {
        console.log("Supabase update succeeded:", data);
      }
    } catch (err) {
      console.error("Error editing prospect in Supabase:", err);
    }
  };

  const handleToggleStatus = (prospectId: string) => {
    const prospect = activeGm.prospects.find((p) => p.id === prospectId);
    if (!prospect) return;
    const isCurrentlyTrashed = prospect.status === 'trashed' || prospect.status === 'inactive';
    const newStatus: ProspectStatus = isCurrentlyTrashed ? 'active' : 'trashed';
    handleEditProspect(prospectId, { status: newStatus });
  };

  const handleUpdate25PlusSeasons = useCallback((prospectId: string, count: number) => {
    if (!isAdmin) {
      alert('Only the Commissioner can perform this action.');
      return;
    }
    const target = activeGm.prospects.find((p) => p.id === prospectId);
    if (target) {
      setStored25PlusSeasons(prospectId, target.name, count);
    }
    handleEditProspect(prospectId, { seasons25PlusGP: count, qualifying_seasons: count });
  }, [activeGm, isAdmin]);

  const handleDeleteProspect = async (prospectId: string) => {
    if (!isAdmin) {
      alert('Only the Commissioner can perform this action.');
      return;
    }
    if (!window.confirm("Are you sure you want to delete this prospect from the pool?")) return;

    // 1. Optimistically remove from React state across all GMs immediately
    setGms((prevGms) =>
      prevGms.map((gm) => ({
        ...gm,
        prospects: gm.prospects.filter((p) => p.id !== prospectId),
      }))
    );

    // 2. Mark in local storage deleted cache immediately so refresh will never resurrect
    addDeletedProspectId(prospectId);

    // 3. Persist deletion to Supabase
    try {
      const dbId = !isNaN(Number(prospectId)) ? Number(prospectId) : prospectId;

      // Attempt hard database DELETE
      const deleteRes = await supabase
        .from('prospects')
        .delete()
        .eq('id', dbId)
        .select();

      const didHardDelete = Boolean(deleteRes.data && deleteRes.data.length > 0);

      if (!didHardDelete) {
        console.warn("Direct DELETE affected 0 rows (Supabase RLS policy). Applying persistent disassociation fallback:", dbId);
        // Supabase RLS allows UPDATE for anon: disassociate from GM and mark inactive
        const updateRes = await supabase
          .from('prospects')
          .update({
            gm_name: null,
            is_inactive: true,
            player_name: '[DELETED]',
          })
          .eq('id', dbId)
          .select();

        if (updateRes.error) {
          console.error("Failed to disassociate prospect in Supabase:", updateRes.error);
        } else {
          console.log("Successfully disassociated deleted prospect in Supabase:", updateRes.data);
        }
      } else {
        console.log("Successfully hard-deleted prospect from Supabase:", deleteRes.data);
      }
    } catch (err) {
      console.error("Error deleting prospect from database:", err);
    }
  };

  // Compute counts for active GM
  const counts = useMemo(() => {
    const all = activeGm.prospects.length;
    let f = 0;
    let d = 0;
    let g = 0;
    let promotedProtectedCount = 0;
    let actionRequired = 0;
    let watchlistCount = 0;
    let protectionWatchCount = 0;
    let promoted = 0;
    let developing = 0;
    let trashed = 0;

    activeGm.prospects.forEach((p) => {
      const isTrashed = p.status === 'trashed' || p.status === 'inactive';
      if (isTrashed) {
        trashed++;
      }

      if (p.position === 'F') f++;
      if (p.position === 'D') d++;
      if (p.position === 'G') g++;

      // Workflow alerts should only reflect active prospects (not trashed)
      if (!isTrashed) {
        const ev = evaluateProspect(p);
        const isPromProt = Boolean(p.promoted && (p.isProtected || (p as any).protected));
        if (isPromProt) {
          promotedProtectedCount++;
        }
        if (ev.isMandatoryPromotion) {
          actionRequired++;
        }
        if (ev.isWatchlist) {
          watchlistCount++;
        }
        if (ev.isProtectionWatchlist) {
          protectionWatchCount++;
        }
        if (p.promoted) {
          promoted++;
        }
        if (!p.promoted && !ev.isMandatoryPromotion && !ev.isWatchlist && !ev.isProtectionWatchlist) {
          developing++;
        }
      }
    });

    return {
      all,
      f,
      d,
      g,
      promotedProtected: promotedProtectedCount,
      actionRequired,
      watchlist: watchlistCount,
      protectionWatch: protectionWatchCount,
      promoted,
      developing,
      trashed,
    };
  }, [activeGm.prospects]);

  // Filtered and sorted prospects
  const filteredProspects = useMemo(() => {
    const filtered = activeGm.prospects.filter((p) => {
      // Position filter
      if (positionFilter !== 'ALL' && p.position !== positionFilter) {
        return false;
      }

      const isTrashed = p.status === 'trashed' || p.status === 'inactive';

      // Status filter
      if (statusFilter === 'TRASHED') {
        return isTrashed;
      }

      // If filtering by any other specific status, exclude trashed prospects
      if (statusFilter !== 'ALL' && isTrashed) {
        return false;
      }

      if (statusFilter === 'PROMOTED_PROTECTED') {
        const isPromProt = Boolean(p.promoted && (p.isProtected || (p as any).protected));
        if (!isPromProt) return false;
      }

      const ev = evaluateProspect(p);
      if (statusFilter === 'ACTION_REQUIRED' && !ev.isMandatoryPromotion) {
        return false;
      }
      if (statusFilter === 'WATCHLIST' && !ev.isWatchlist) {
        return false;
      }
      if (statusFilter === 'PROTECTION_WATCH' && !ev.isProtectionWatchlist) {
        return false;
      }
      if (statusFilter === 'PROMOTED' && !p.promoted) {
        return false;
      }
      if (statusFilter === 'DEVELOPING' && (p.promoted || ev.isMandatoryPromotion || ev.isWatchlist || ev.isProtectionWatchlist)) {
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

    return sortProspects(filtered, sortOption);
  }, [activeGm.prospects, positionFilter, statusFilter, searchQuery, sortOption]);

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
      <div className={`min-h-screen font-sans antialiased flex flex-col items-center justify-center space-y-4 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
      }`}>
        <img
          src="/putin_spin.png"
          alt="Loading..."
          className="h-24 w-24 rounded-full object-cover border-4 border-cyan-500/80 shadow-2xl animate-spin"
          style={{ animationDuration: '3s' }}
        />
        <p className={`font-semibold tracking-wider text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>LOADING WINKO'S HOCKEY POOL...</p>
      </div>
    );
  }

  if (!activeGm) {
    return (
      <div className={`min-h-screen font-sans antialiased flex flex-col items-center justify-center space-y-4 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
      }`}>
        <Activity className={`h-10 w-10 mb-2 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
        <h2 className={`text-xl font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>No Teams Found</h2>
        <p className={`max-w-sm text-center ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Your Supabase database is connected but no GMs were found in the "gms" table.</p>
      </div>
    );
  }

  // If nobody is authenticated, show the PIN gate only
  if (!authedGm) {
    return (
      <WinkoHub
        gms={gms}
        activeGm={null}
        onAuthenticate={handleAuthenticate}
        onLogout={handleLogout}
        onNavigate={() => {}}
        theme={theme}
        onToggleTheme={toggleTheme}
        gmLeaderboard={gmLeaderboard}
        activeGmStats={activeGmStats}
      />
    );
  }

  // Once authenticated, render the global layout
  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
    }`}>
      <Header
        onNavigate={(target) => {
          setView(target);
          if ((target === 'prospects' || target === 'prospect-central') && !authedGmId) setView('hub'); // Force hub if not authed
        }}
        onOpenRules={() => setIsRulesModalOpen(true)}
        activeView={view}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeGm={authedGm}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        gms={gms}
        selectedGmId={selectedGmId}
        onSelectGm={(id) => {
          setSelectedGmId(id);
          setPositionFilter('ALL');
          setStatusFilter('ALL');
          setSearchQuery('');
        }}
      />

      {view === 'hub' && (
        <WinkoHub
          gms={gms}
          activeGm={authedGm}
          onAuthenticate={handleAuthenticate}
          onLogout={handleLogout}
          onNavigate={(target: 'seasons' | 'prospect-central' | 'prospects' | 'arcade') => {
            if (target === 'seasons' || target === 'arcade') {
              setView('season');
            } else {
              setView(target);
            }
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
          gmLeaderboard={gms.map(gm => ({ ...gm, total_fantasy_points: 0, goals: 0, assists: 0, wins: 0 }))}
          activeGmStats={{ rank: '--', total_fantasy_points: 0 }}
        />
      )}

      {view === 'season' && (
        <SeasonHub gms={gms} theme={theme} authedGm={authedGm} defaultTab="roster" />
      )}

      {view === 'seasons' && (
        <SeasonHub gms={gms} theme={theme} authedGm={authedGm} defaultTab="standings" />
      )}

      {view === 'keepers' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <KeeperSelectionPortal gms={gms} authedGm={authedGm} theme={theme} />
        </div>
      )}

      {view === 'waivers' && (
        <SeasonHub gms={gms} theme={theme} authedGm={authedGm} defaultTab="waivers" />
      )}

      {view === 'transactions' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SeasonTransactionsFeed
            gms={gms}
            theme={theme}
            seasonId="2026-2027"
            onNavigateToWaivers={() => setView('waivers')}
          />
        </div>
      )}

      {view === 'arcade' && (
        <SeasonHub gms={gms} theme={theme} authedGm={authedGm} defaultTab="challenges" />
      )}

      {view === 'active-squad' && (
        <SeasonHub gms={gms} theme={theme} authedGm={authedGm} defaultTab="roster" />
      )}

      {view === 'commish' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CommishBackOffice
            gms={gms}
            activeGm={activeGm}
            authedGm={authedGm}
            theme={theme}
            seasonId="2026-2027"
            onNavigateBack={() => setView('hub')}
          />
        </div>
      )}

      {view === 'prospect-central' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ProspectLanding
            gms={gms}
            isAdmin={isAdmin}
            theme={theme}
            onSelectGmPool={(gmId) => {
              setSelectedGmId(gmId);
              setPositionFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
              setView('prospects');
            }}
            onNavigateToMyProspects={() => {
              if (authedGmId) {
                setSelectedGmId(authedGmId);
              } else if (gms.length > 0) {
                setSelectedGmId(gms[0].id);
              }
              setPositionFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
              setView('prospects');
            }}
          />
        </div>
      )}

      {view === 'prospects' && (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Action Toolbar above filters */}
        <div className={`mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-6 ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          <div>
            <h1 className={`text-4xl sm:text-5xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              {activeGm.name}'s Prospect Pool
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
            >
              <UserPlus className="h-5 w-5" />
              <span>Add Prospect</span>
            </button>
          </div>
        </div>

        {/* 3 GM-Specific Stat Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          {/* Card 1: Total Prospects on Roster */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
            isLight ? 'border-slate-200 bg-white hover:border-cyan-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {activeGm.name}'s Prospects
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {activeGmStats.total_prospects}
                  </span>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Active Roster</span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Total prospects tracked in manager pool</span>
            </div>
          </div>

          {/* Card 2: Promoted / Graduated */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
            isLight ? 'border-slate-200 bg-white hover:border-emerald-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {activeGm.name}'s Graduated
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {activeGmStats.promoted_count}
                  </span>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    ({activeGmStats.hit_rate}% hit rate)
                  </span>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Promoted to official Winko active roster</span>
            </div>
          </div>

          {/* Card 3: Rule 5 Fantasy Points & Rank */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
            isLight ? 'border-slate-200 bg-white hover:border-amber-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-amber-500/40 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {activeGm.name}'s Fantasy Score
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                    {activeGmStats.total_fantasy_points.toLocaleString()} PTS
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Rank #{activeGmStats.rank}
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
                Stats: {activeGmStats.goals}G, {activeGmStats.assists}A, {activeGmStats.wins}W
              </span>
            </div>
          </div>
        </section>

        {/* 4. Filters & Search */}
        <FiltersAndSearch
          positionFilter={positionFilter}
          setPositionFilter={setPositionFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortOption={sortOption}
          setSortOption={setSortOption}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          counts={counts}
          onResetFilters={() => {
            setPositionFilter('ALL');
            setStatusFilter('ALL');
            setSortOption('urgency');
            setSearchQuery('');
          }}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onToggleExpandAll={handleToggleExpandAll}
          allExpanded={allExpanded}
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
                setSortOption('urgency');
                setSearchQuery('');
              }}
              className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
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
                isAdmin={isAdmin}
                onToggleExpandProspect={handleToggleExpandProspect}
                onSetExpandedProspects={setExpandedProspectIds}
                onUpdateGP={handleUpdateGP}
                onToggleProtection={handleToggleProtection}
                onTogglePromotion={handleTogglePromotion}
                onSyncProspect={handleSyncProspect}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProspect}
                onUpdate25PlusSeasons={handleUpdate25PlusSeasons}
                onToggleStatus={handleToggleStatus}
              />
            )}

            {/* Show Defensemen if position is ALL or D */}
            {(positionFilter === 'ALL' || positionFilter === 'D') && (
              <PositionSection
                title="Defensemen"
                prospects={defensemen}
                viewMode={viewMode}
                expandedProspectIds={expandedProspectIds}
                isAdmin={isAdmin}
                onToggleExpandProspect={handleToggleExpandProspect}
                onSetExpandedProspects={setExpandedProspectIds}
                onUpdateGP={handleUpdateGP}
                onToggleProtection={handleToggleProtection}
                onTogglePromotion={handleTogglePromotion}
                onSyncProspect={handleSyncProspect}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProspect}
                onUpdate25PlusSeasons={handleUpdate25PlusSeasons}
                onToggleStatus={handleToggleStatus}
              />
            )}

            {/* Show Goalies if position is ALL or G */}
            {(positionFilter === 'ALL' || positionFilter === 'G') && (
              <PositionSection
                title="Goalies"
                prospects={goalies}
                viewMode={viewMode}
                expandedProspectIds={expandedProspectIds}
                isAdmin={isAdmin}
                onToggleExpandProspect={handleToggleExpandProspect}
                onSetExpandedProspects={setExpandedProspectIds}
                onUpdateGP={handleUpdateGP}
                onToggleProtection={handleToggleProtection}
                onTogglePromotion={handleTogglePromotion}
                onSyncProspect={handleSyncProspect}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteProspect}
                onUpdate25PlusSeasons={handleUpdate25PlusSeasons}
                onToggleStatus={handleToggleStatus}
              />
            )}
          </div>
        )}

        {/* Quick Footer Info / Rule Guide Banner */}
        <div className={`mt-12 rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isLight ? 'border-slate-200 bg-white text-slate-700 shadow-md' : 'border-slate-800 bg-[#1e293b]/80 text-slate-400 shadow-xl'
        }`}>
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className={`text-sm font-bold ${isLight ? 'text-slate-900 font-bold' : 'text-slate-200 font-bold'}`}>
                Winko's Hockey Pool • Prospect Eligibility System
              </div>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Skaters: 40 single-season / 65 cumulative GP • Goalies: 20 single-season / 30 cumulative GP
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsRulesModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors shrink-0 ${
              isLight
                ? 'border-slate-300 bg-slate-50 text-slate-700 hover:text-cyan-700 hover:bg-slate-100'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-600'
            }`}
          >
            <Info className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Read League Constitution</span>
          </button>
        </div>
      </main>
      )}

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
        availableGms={gms}
        theme={theme}
      />

      <EditProspectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onEdit={handleEditProspect}
        prospect={editingProspect}
        gmName={activeGm.name}
        availableGms={gms}
        theme={theme}
      />
    </div>
  );
}
