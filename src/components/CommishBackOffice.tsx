import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeneralManager } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Sliders,
  Settings2,
  Users,
  Search,
  Plus,
  Minus,
  RotateCcw,
  Trash2,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Calendar,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  Activity,
  History,
  Info
} from 'lucide-react';

export interface LeagueSeasonSettings {
  id?: number | string;
  season_id: string;
  waivers_enabled: boolean;
  max_waiver_pickups: number;
  trade_deadline: string;
  trades_enabled?: boolean;
  rule5_draft_enabled?: boolean;
  auto_sync_scoring?: boolean;
  notes?: string;
  updated_at?: string;
}

export interface GMSeasonTracker {
  id?: number | string;
  season_id: string;
  gm_name: string;
  waiver_pickups_used: number;
  max_waiver_pickups: number;
  updated_at?: string;
}

export interface ActiveRosterPlayer {
  id: number | string;
  season_id?: string;
  gm_name: string;
  player_name: string;
  nhl_id: number | string;
  position: string;
  nhl_team?: string | null;
  team?: string | null;
  slot_position?: string;
  fantasy_points?: number;
  roster_status?: string;
  is_keeper?: boolean;
  is_locked?: boolean;
  gp?: number;
  goals?: number;
  assists?: number;
}

export interface MasterPlayer {
  nhl_id: number | string;
  player_name: string;
  position: string;
  nhl_team?: string | null;
  gp?: number;
  goals?: number;
  assists?: number;
  fantasy_points?: number;
}

interface CommishBackOfficeProps {
  gms?: GeneralManager[];
  activeGm?: GeneralManager;
  authedGm?: GeneralManager | null;
  theme?: 'light' | 'dark';
  seasonId?: string;
  onNavigateBack?: () => void;
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

export const CommishBackOffice: React.FC<CommishBackOfficeProps> = ({
  gms = [],
  activeGm,
  authedGm,
  theme = 'dark',
  seasonId = '2026-2027',
  onNavigateBack,
}) => {
  const isLight = theme === 'light';

  // ---------------------------------------------------------------------------
  // 1. Security Gate Validation
  // ---------------------------------------------------------------------------
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Authorized if authenticated GM or active GM is commissioner (is_commish or name is 'Adam')
  const isCommishUser = useMemo(() => {
    if (sessionUnlocked) return true;
    const isAdam =
      (authedGm && authedGm.name.trim().toLowerCase() === 'adam') ||
      (activeGm && activeGm.name.trim().toLowerCase() === 'adam');
    const hasCommishFlag =
      (authedGm && Boolean(authedGm.is_commish)) ||
      (activeGm && Boolean(activeGm.is_commish));
    return Boolean(isAdam || hasCommishFlag);
  }, [authedGm, activeGm, sessionUnlocked]);

  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    // Master commish PIN is 1234 or matching any commish GM's registered PIN
    const trimmed = pinInput.trim();
    const isMaster = trimmed === '1234';
    const matchesCommishGm = gms.some(
      (g) =>
        (g.is_commish || g.name.toLowerCase() === 'adam') &&
        String(g.pin || '1234') === trimmed
    );

    if (isMaster || matchesCommishGm) {
      setSessionUnlocked(true);
      setPinError('');
      showToast('Commissioner clearance verified. Welcome, Commish.', 'success');
    } else {
      setPinError('Invalid Commissioner PIN. Access denied.');
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Toast Notification System
  // ---------------------------------------------------------------------------
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error' | 'warning';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---------------------------------------------------------------------------
  // 3. Season Settings State (`league_season_settings`)
  // ---------------------------------------------------------------------------
  const [seasonSettings, setSeasonSettings] = useState<LeagueSeasonSettings>({
    season_id: seasonId,
    waivers_enabled: true,
    max_waiver_pickups: 3,
    trade_deadline: '2027-03-05',
    trades_enabled: true,
    rule5_draft_enabled: true,
    auto_sync_scoring: true,
    notes: 'Official 2026-2027 Winko\'s Hockey Pool season rules and parameters.',
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch season settings from Supabase
  const fetchSeasonSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('league_season_settings')
        .select('*')
        .in('season_id', [seasonId, '2026-2027', '2026-27'])
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Notice loading league_season_settings:', error.message);
      }

      if (data) {
        setSeasonSettings({
          id: data.id,
          season_id: data.season_id || seasonId,
          waivers_enabled: data.waivers_enabled !== false,
          max_waiver_pickups: data.max_waiver_pickups ?? 3,
          trade_deadline: data.trade_deadline || '2027-03-05',
          trades_enabled: data.trades_enabled !== false,
          rule5_draft_enabled: data.rule5_draft_enabled !== false,
          auto_sync_scoring: data.auto_sync_scoring !== false,
          notes: data.notes || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch season settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  }, [seasonId]);

  // Save season settings to Supabase
  const handleSaveSeasonSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        season_id: seasonId,
        waivers_enabled: seasonSettings.waivers_enabled,
        max_waiver_pickups: Number(seasonSettings.max_waiver_pickups),
        trade_deadline: seasonSettings.trade_deadline,
        trades_enabled: seasonSettings.trades_enabled,
        rule5_draft_enabled: seasonSettings.rule5_draft_enabled,
        auto_sync_scoring: seasonSettings.auto_sync_scoring,
        notes: seasonSettings.notes,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('league_season_settings')
        .upsert(payload, { onConflict: 'season_id' })
        .select();

      if (error) {
        console.warn('Upsert on league_season_settings returned note:', error.message);
        // If table doesn't have unique constraint on season_id, try update or insert
        await supabase.from('league_season_settings').insert([payload]);
      }

      // Keep default max waiver pickups synchronized across all gm_season_tracker rows
      if (seasonSettings.max_waiver_pickups !== undefined) {
        await supabase
          .from('gm_season_tracker')
          .update({ max_waiver_pickups: Number(seasonSettings.max_waiver_pickups) })
          .in('season_id', [seasonId, '2026-2027', '2026-27']);
      }

      // Log to roster_transactions as a Commish Settings update
      await supabase.from('roster_transactions').insert([
        {
          season_id: seasonId,
          gm_name: authedGm?.name || activeGm?.name || 'Commissioner',
          transaction_type: 'COMMISH_SETTINGS_UPDATE',
          timestamp: new Date().toISOString(),
        },
      ]);

      showToast('Season settings saved and propagated successfully!', 'success');
      fetchSeasonSettings();
      fetchGMTrackers();
    } catch (err: any) {
      console.error('Failed to save season settings:', err);
      showToast('Failed to save settings: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. GM Override Grid State (`commish_override_gm_pickups`)
  // ---------------------------------------------------------------------------
  const [trackers, setTrackers] = useState<Record<string, GMSeasonTracker>>({});
  const [loadingTrackers, setLoadingTrackers] = useState(false);
  const [overrideInProgress, setOverrideInProgress] = useState<string | null>(null);

  // List of all 12 GMs
  const allGms = useMemo(() => {
    if (gms && gms.length > 0) return gms;
    return DEFAULT_GMS.map((name, idx) => ({
      id: String(idx + 1),
      name,
      teamName: `${name}'s Team`,
      avatarColor: 'bg-amber-600',
      avatarInitials: name.slice(0, 2).toUpperCase(),
      prospects: [],
    }));
  }, [gms]);

  const fetchGMTrackers = useCallback(async () => {
    setLoadingTrackers(true);
    try {
      const { data, error } = await supabase
        .from('gm_season_tracker')
        .select('*')
        .in('season_id', [seasonId, '2026-2027', '2026-27']);

      if (error) {
        console.warn('Notice querying gm_season_tracker:', error.message);
      }

      const map: Record<string, GMSeasonTracker> = {};
      if (data && data.length > 0) {
        data.forEach((row: any) => {
          map[row.gm_name] = row;
        });
      }

      // Fill in any missing GMs with default 0 / 3
      allGms.forEach((gm) => {
        if (!map[gm.name]) {
          map[gm.name] = {
            season_id: seasonId,
            gm_name: gm.name,
            waiver_pickups_used: 0,
            max_waiver_pickups: seasonSettings.max_waiver_pickups || 3,
          };
        }
      });

      setTrackers(map);
    } catch (err) {
      console.error('Error fetching GM trackers:', err);
    } finally {
      setLoadingTrackers(false);
    }
  }, [seasonId, allGms, seasonSettings.max_waiver_pickups]);

  // Execute pickup count override
  const handleOverridePickups = async (
    gmName: string,
    action: '+1' | '-1' | 'reset' | 'set',
    customVal?: number
  ) => {
    const currentRecord = trackers[gmName] || {
      season_id: seasonId,
      gm_name: gmName,
      waiver_pickups_used: 0,
      max_waiver_pickups: seasonSettings.max_waiver_pickups || 3,
    };

    let newCount = currentRecord.waiver_pickups_used;
    if (action === '+1') {
      newCount = currentRecord.waiver_pickups_used + 1;
    } else if (action === '-1') {
      newCount = Math.max(0, currentRecord.waiver_pickups_used - 1);
    } else if (action === 'reset') {
      newCount = 0;
    } else if (action === 'set' && customVal !== undefined) {
      newCount = Math.max(0, customVal);
    }

    setOverrideInProgress(gmName);

    try {
      // 1. First attempt: call the Supabase RPC function commish_override_gm_pickups
      let rpcSucceeded = false;
      try {
        const { error: rpcError } = await supabase.rpc('commish_override_gm_pickups', {
          p_season_id: seasonId,
          p_gm_name: gmName,
          p_pickups_used: newCount,
        });
        if (!rpcError) {
          rpcSucceeded = true;
        } else {
          // Try alternative parameter casing in case defined as season_id or gm_name
          const { error: altRpcError } = await supabase.rpc('commish_override_gm_pickups', {
            season_id: seasonId,
            gm_name: gmName,
            pickups_used: newCount,
          });
          if (!altRpcError) rpcSucceeded = true;
        }
      } catch (rpcErr) {
        console.log('RPC commish_override_gm_pickups not installed or bypassed:', rpcErr);
      }

      // 2. Direct database upsert/update fallback (ensures 100% reliable execution)
      if (!rpcSucceeded) {
        const { error: dbError } = await supabase
          .from('gm_season_tracker')
          .upsert(
            {
              season_id: seasonId,
              gm_name: gmName,
              waiver_pickups_used: newCount,
              max_waiver_pickups: currentRecord.max_waiver_pickups || seasonSettings.max_waiver_pickups || 3,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'season_id,gm_name' }
          );

        if (dbError) {
          // Fallback update if upsert conflicts
          await supabase
            .from('gm_season_tracker')
            .update({ waiver_pickups_used: newCount })
            .eq('season_id', seasonId)
            .eq('gm_name', gmName);
        }
      }

      // 3. Log audit entry to roster_transactions
      await supabase.from('roster_transactions').insert([
        {
          season_id: seasonId,
          gm_name: gmName,
          transaction_type: 'COMMISH_OVERRIDE',
          pickups_remaining_after: (currentRecord.max_waiver_pickups || 3) - newCount,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Update local state immediately
      setTrackers((prev) => ({
        ...prev,
        [gmName]: {
          ...currentRecord,
          waiver_pickups_used: newCount,
        },
      }));

      showToast(
        `Overrode ${gmName}'s pickups used to ${newCount} / ${currentRecord.max_waiver_pickups || 3}`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to override pickups:', err);
      showToast('Override failed: ' + (err.message || 'Check database connectivity'), 'error');
    } finally {
      setOverrideInProgress(null);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Roster Force Edit State (`active_roster_players` + `nhl_master_players`)
  // ---------------------------------------------------------------------------
  const [selectedForceGm, setSelectedForceGm] = useState<string>(
    authedGm?.name || activeGm?.name || 'Adam'
  );
  const [rosterPlayers, setRosterPlayers] = useState<ActiveRosterPlayer[]>([]);
  const [allProspectIds, setAllProspectIds] = useState<Set<number | string>>(new Set());
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [droppingPlayer, setDroppingPlayer] = useState<ActiveRosterPlayer | null>(null);
  const [dropConfirmOpen, setDropConfirmOpen] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  // Force Add search state
  const [masterQuery, setMasterQuery] = useState('');
  const [masterPosFilter, setMasterPosFilter] = useState<'ALL' | 'F' | 'D' | 'G'>('ALL');
  const [masterPlayers, setMasterPlayers] = useState<MasterPlayer[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [addingPlayerId, setAddingPlayerId] = useState<number | string | null>(null);

  // Fetch active roster for selected GM
  const fetchActiveRoster = useCallback(async (gmName: string) => {
    setLoadingRoster(true);
    try {
      // 1. Fetch active roster players
      const { data: rosterData, error: rosterError } = await supabase
        .from('active_roster_players')
        .select('*')
        .eq('gm_name', gmName)
        .in('season_id', [seasonId, '2026-2027', '2026-27'])
        .order('slot_position', { ascending: true });

      // 2. Fetch prospects to filter them
      const { data: prospectData } = await supabase
        .from('prospects')
        .select('nhl_id, player_name, promoted, protected, is_protected')
        .eq('gm_name', gmName);

      const prospectsMapByNhlId = new Map();
      const prospectsMapByName = new Map();
      (prospectData || []).forEach(p => {
        if (p.nhl_id) prospectsMapByNhlId.set(String(p.nhl_id), p);
        if (p.player_name) prospectsMapByName.set(p.player_name.toLowerCase().trim(), p);
      });
      
      if (rosterError) {
        console.warn('Notice fetching active_roster_players:', rosterError.message);
        setRosterPlayers([]);
      } else {
        // Filter: If it's a prospect, only show if Promoted AND Protected
        const filtered = (rosterData || []).filter(r => {
          const nhlId = String(r.nhl_id);
          const name = (r.player_name || '').toLowerCase().trim();
          
          const prospect = prospectsMapByNhlId.get(nhlId) || prospectsMapByName.get(name);
          
          if (!prospect) return true; // Not a prospect record, keep it (NHL pro or keeper)
          
          const isPromoted = Boolean(prospect.promoted);
          const isProtected = Boolean(prospect.protected || prospect.is_protected);
          
          return isPromoted && isProtected;
        });
        setRosterPlayers(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch active roster:', err);
      setRosterPlayers([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [seasonId]);

  // Fetch all prospects globally to filter Force Add search
  const fetchGlobalProspects = useCallback(async () => {
    try {
      const { data } = await supabase.from('prospects').select('nhl_id');
      if (data) {
        setAllProspectIds(new Set(data.map(p => String(p.nhl_id))));
      }
    } catch (err) {
      console.error('Failed to fetch global prospects:', err);
    }
  }, []);

  // Fetch master players pool for search
  const fetchMasterPlayers = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const { data, error } = await supabase
        .from('nhl_master_players')
        .select('*')
        .order('fantasy_points', { ascending: false })
        .limit(200);

      if (error) {
        console.warn('Notice querying nhl_master_players:', error.message);
        setMasterPlayers([]);
      } else {
        setMasterPlayers(data || []);
      }
    } catch (err) {
      console.error('Failed to load master players:', err);
      setMasterPlayers([]);
    } finally {
      setLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasonSettings();
    fetchGMTrackers();
    fetchMasterPlayers();
    fetchGlobalProspects();
  }, [fetchSeasonSettings, fetchGMTrackers, fetchMasterPlayers, fetchGlobalProspects]);

  useEffect(() => {
    if (selectedForceGm) {
      fetchActiveRoster(selectedForceGm);
    }
  }, [selectedForceGm, fetchActiveRoster]);

  // Execute Force Drop
  const handleExecuteForceDrop = async () => {
    if (!droppingPlayer) return;
    setIsDropping(true);

    try {
      // 1. Delete from active_roster_players
      if (droppingPlayer.id) {
        const { error } = await supabase
          .from('active_roster_players')
          .delete()
          .eq('id', droppingPlayer.id);

        if (error) {
          // Fallback by nhl_id and gm_name
          await supabase
            .from('active_roster_players')
            .delete()
            .eq('nhl_id', droppingPlayer.nhl_id)
            .eq('gm_name', selectedForceGm);
        }
      } else {
        await supabase
          .from('active_roster_players')
          .delete()
          .eq('nhl_id', droppingPlayer.nhl_id)
          .eq('gm_name', selectedForceGm);
      }

      // 2. Log to roster_transactions
      await supabase.from('roster_transactions').insert([
        {
          season_id: seasonId,
          gm_name: selectedForceGm,
          transaction_type: 'COMMISH_FORCE_DROP',
          dropped_player_nhl_id: droppingPlayer.nhl_id,
          dropped_player_name: droppingPlayer.player_name,
          dropped_player_position: droppingPlayer.position,
          timestamp: new Date().toISOString(),
        },
      ]);

      showToast(
        `Force dropped ${droppingPlayer.player_name} from ${selectedForceGm}'s roster.`,
        'success'
      );
      setDropConfirmOpen(false);
      setDroppingPlayer(null);
      fetchActiveRoster(selectedForceGm);
    } catch (err: any) {
      console.error('Failed to force drop player:', err);
      showToast('Force drop failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsDropping(false);
    }
  };

  // Execute Force Add
  const handleExecuteForceAdd = async (player: MasterPlayer) => {
    // Check if player is already on this GM's roster
    const alreadyOnRoster = rosterPlayers.some(
      (r) => String(r.nhl_id) === String(player.nhl_id)
    );
    if (alreadyOnRoster) {
      showToast(`${player.player_name} is already on ${selectedForceGm}'s roster.`, 'warning');
      return;
    }

    setAddingPlayerId(player.nhl_id);

    try {
      // 1. Insert into active_roster_players
      const insertPayload = {
        season_id: seasonId,
        gm_name: selectedForceGm,
        nhl_id: player.nhl_id,
        player_name: player.player_name,
        position: player.position,
        team: player.nhl_team || 'NHL',
        nhl_team: player.nhl_team || 'NHL',
        roster_status: 'ACTIVE',
        slot_position: player.position === 'G' ? 'G1' : player.position === 'D' ? 'D1' : 'F1',
        is_keeper: false,
        fantasy_points: player.fantasy_points || 0,
      };

      const { error: insertError } = await supabase
        .from('active_roster_players')
        .insert([insertPayload]);

      if (insertError) {
        // Fallback upsert
        await supabase.from('active_roster_players').upsert([insertPayload]);
      }

      // 2. Log to roster_transactions
      await supabase.from('roster_transactions').insert([
        {
          season_id: seasonId,
          gm_name: selectedForceGm,
          transaction_type: 'COMMISH_FORCE_ADD',
          added_player_nhl_id: player.nhl_id,
          added_player_name: player.player_name,
          added_player_position: player.position,
          added_player_team: player.nhl_team,
          timestamp: new Date().toISOString(),
        },
      ]);

      showToast(
        `Force added ${player.player_name} to ${selectedForceGm}'s roster!`,
        'success'
      );
      fetchActiveRoster(selectedForceGm);
      setMasterQuery('');
    } catch (err: any) {
      console.error('Failed to force add player:', err);
      showToast('Force add failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setAddingPlayerId(null);
    }
  };

  // Filter master players for search bar
  const filteredMasterPlayers = useMemo(() => {
    if (!masterQuery.trim() && masterPosFilter === 'ALL') {
      return masterPlayers.slice(0, 15);
    }
    const q = masterQuery.toLowerCase().trim();
    return masterPlayers
      .filter((p) => {
        // Filter out global prospects
        if (allProspectIds.has(String(p.nhl_id))) return false;

        const matchesQuery =
          !q ||
          p.player_name.toLowerCase().includes(q) ||
          (p.nhl_team && p.nhl_team.toLowerCase().includes(q)) ||
          String(p.nhl_id).includes(q);

        const pos = (p.position || '').toUpperCase();
        let matchesPos = true;
        if (masterPosFilter === 'F') {
          matchesPos = pos === 'F' || pos === 'C' || pos === 'L' || pos === 'R' || pos === 'LW' || pos === 'RW';
        } else if (masterPosFilter === 'D') {
          matchesPos = pos === 'D';
        } else if (masterPosFilter === 'G') {
          matchesPos = pos === 'G';
        }

        return matchesQuery && matchesPos;
      })
      .slice(0, 20);
  }, [masterPlayers, masterQuery, masterPosFilter]);

  // ---------------------------------------------------------------------------
  // RENDER: Security Gate Access Denied
  // ---------------------------------------------------------------------------
  if (!isCommishUser) {
    return (
      <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}>
        <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl ${
          isLight
            ? 'bg-white border-amber-500/40 shadow-amber-900/10'
            : 'bg-slate-900/90 border-amber-500/30 shadow-black/60'
        }`}>
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-500 mb-5 shadow-inner">
              <ShieldAlert className="h-8 w-8 text-amber-500 animate-pulse" />
            </div>
            
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 mb-3">
              Commissioner Gate
            </span>

            <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Restricted Terminal
            </h2>
            <p className={`text-xs sm:text-sm mt-2 max-w-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              The Commissioner Back Office is reserved exclusively for league administrators. Enter the Commissioner PIN to proceed.
            </p>

            <form onSubmit={handleUnlockWithPin} className="w-full mt-6 space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 text-left ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  Commish Clearance PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="commish-pin-input"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    placeholder="Enter 4-digit PIN..."
                    autoFocus
                    className={`w-full px-4 py-3 rounded-xl text-center text-lg font-black tracking-widest border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                        : 'bg-slate-950 border-amber-500/30 text-amber-300 placeholder:text-slate-600'
                    }`}
                  />
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
                {pinError && (
                  <p className="text-xs font-bold text-rose-500 mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="btn-unlock-commish"
                className="w-full py-3 px-4 rounded-xl font-black text-sm tracking-wider uppercase text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock className="h-4 w-4" />
                <span>Authorize Terminal</span>
              </button>
            </form>

            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className={`mt-4 text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Hub</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Authorized Commissioner Terminal
  // ---------------------------------------------------------------------------
  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-amber-500/40 text-amber-300'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-300'
                : 'bg-slate-900/95 border-sky-500/50 text-sky-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="h-5 w-5 text-sky-400 shrink-0" />}
            <span className="text-xs sm:text-sm font-bold">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Force Drop */}
      {dropConfirmOpen && droppingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
              isLight
                ? 'bg-white border-rose-300 shadow-rose-900/10'
                : 'bg-slate-900 border-amber-500/30 shadow-black/80'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Confirm Force Drop
                </h3>
                <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">
                  Executive Override Action
                </p>
              </div>
            </div>

            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Are you sure you want to forcibly drop{' '}
              <strong className="text-amber-400 font-black">{droppingPlayer.player_name}</strong>{' '}
              ({droppingPlayer.position} - {droppingPlayer.team || droppingPlayer.nhl_team || 'NHL'}) from{' '}
              <strong className="text-white font-black">{selectedForceGm}'s</strong> active roster?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDropConfirmOpen(false);
                  setDroppingPlayer(null);
                }}
                disabled={isDropping}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteForceDrop}
                disabled={isDropping}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isDropping ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isDropping ? 'Dropping...' : 'Execute Force Drop'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="py-8 sm:py-10">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & CONTROL SECTION (Standard Page Divider Style) */}
        {/* ========================================================================= */}
        <section
          id="commish-portal-header"
          className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}
        >
          <div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1
                  className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Commissioner Back Office
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Executive Control</span>
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1.5 max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Administrative portal for Winko's Hockey Pool. Manage season settings, override GM waiver counts, and force edit team rosters under executive discretion.
              </p>
            </div>
          </div>

          {/* Action Tools & Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Season Badge */}
            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold shadow-xs ${
                isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-amber-500/30 text-amber-300'
              }`}
            >
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Season: {seasonId}</span>
            </div>

            {/* Refresh Button */}
            <button
              id="commish-refresh-btn"
              onClick={() => {
                fetchSeasonSettings();
                fetchGMTrackers();
                fetchGlobalProspects();
                if (selectedForceGm) fetchActiveRoster(selectedForceGm);
                showToast('Synchronized commissioner data', 'info');
              }}
              title="Refresh all commissioner state"
              className={`p-2.5 rounded-2xl border shadow-xs transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  : 'bg-slate-900 border-amber-500/30 text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${loadingSettings || loadingTrackers || loadingRoster ? 'animate-spin' : ''}`} />
            </button>

            {/* Return to Hub */}
            {onNavigateBack && (
              <button
                type="button"
                onClick={onNavigateBack}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Hub</span>
              </button>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. SEASON SETTINGS CARD (`league_season_settings`) */}
        {/* ========================================================================= */}
        <section
          id="season-settings-card"
          className={`mb-8 p-6 sm:p-7 rounded-3xl border transition-all ${
            isLight
              ? 'bg-white border-amber-500/30 shadow-md shadow-slate-200/50'
              : 'bg-slate-900/90 border-amber-500/30 shadow-xl shadow-black/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Season Settings & Policies
                </h2>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Controls league-wide waiver operations, pickup caps, and key calendar dates.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-save-season-settings"
              onClick={handleSaveSeasonSettings}
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-md shadow-amber-500/25 active:scale-98 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              {savingSettings ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Toggle Waivers Active */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider block ${
                    isLight ? 'text-slate-700' : 'text-slate-200'
                  }`}>
                    Waiver Wire Access
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Rule 5 free agent claims allowed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSeasonSettings((prev) => ({
                      ...prev,
                      waivers_enabled: !prev.waivers_enabled,
                    }))
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    seasonSettings.waivers_enabled ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      seasonSettings.waivers_enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-2.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  seasonSettings.waivers_enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {seasonSettings.waivers_enabled ? '● Waivers Open' : '○ Waivers Locked'}
                </span>
              </div>
            </div>

            {/* Max Pickups Input */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <label className={`text-xs font-black uppercase tracking-wider block mb-1 ${
                isLight ? 'text-slate-700' : 'text-slate-200'
              }`}>
                Max Pickups Per GM
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Seasonal waiver pickup allotment
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={seasonSettings.max_waiver_pickups}
                  onChange={(e) =>
                    setSeasonSettings((prev) => ({
                      ...prev,
                      max_waiver_pickups: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className={`w-24 px-3 py-1.5 rounded-xl text-center text-base font-black border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-900 border-amber-500/30 text-amber-300'
                  }`}
                />
                <span className="text-xs text-slate-400 font-semibold">pickups / season</span>
              </div>
            </div>

            {/* Trade Deadline Date Picker */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <label className={`text-xs font-black uppercase tracking-wider block mb-1 ${
                isLight ? 'text-slate-700' : 'text-slate-200'
              }`}>
                League Trade Deadline
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Final cutoff for intra-league trades
              </p>
              <input
                type="date"
                value={seasonSettings.trade_deadline}
                onChange={(e) =>
                  setSeasonSettings((prev) => ({
                    ...prev,
                    trade_deadline: e.target.value,
                  }))
                }
                className={`w-full px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-slate-900 border-amber-500/30 text-amber-300'
                }`}
              />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. GM OVERRIDE GRID (`commish_override_gm_pickups`) */}
        {/* ========================================================================= */}
        <section
          id="gm-override-grid"
          className={`mb-8 p-6 sm:p-7 rounded-3xl border transition-all ${
            isLight
              ? 'bg-white border-amber-500/30 shadow-md shadow-slate-200/50'
              : 'bg-slate-900/90 border-amber-500/30 shadow-xl shadow-black/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  GM Waiver Overrides
                </h2>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Adjust or reset individual GM waiver pickups used. Triggers{' '}
                  <code className="text-amber-400 font-mono text-[11px]">commish_override_gm_pickups</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                {allGms.length} GMs Active
              </span>
            </div>
          </div>

          {/* Overrides Table */}
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                }`}>
                  <th className="py-3 px-4">General Manager</th>
                  <th className="py-3 px-4 text-center">Pickups Used</th>
                  <th className="py-3 px-4 text-center">Remaining</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Commission Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {allGms.map((gm) => {
                  const tr = trackers[gm.name] || {
                    season_id: seasonId,
                    gm_name: gm.name,
                    waiver_pickups_used: 0,
                    max_waiver_pickups: seasonSettings.max_waiver_pickups || 3,
                  };
                  const used = tr.waiver_pickups_used ?? 0;
                  const max = tr.max_waiver_pickups || seasonSettings.max_waiver_pickups || 3;
                  const remaining = Math.max(0, max - used);
                  const isMaxed = used >= max;
                  const isPending = overrideInProgress === gm.name;

                  return (
                    <tr
                      key={gm.name}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* GM Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xs ${
                              gm.avatarColor || 'bg-amber-600'
                            }`}
                          >
                            {gm.avatarInitials || gm.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className={`font-black text-sm block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {gm.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {gm.teamName || `${gm.name}'s Team`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pickups Used */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-base font-black ${
                          isMaxed ? 'text-rose-400' : isLight ? 'text-slate-900' : 'text-amber-300'
                        }`}>
                          {used}
                        </span>
                        <span className="text-xs text-slate-500 font-bold"> / {max}</span>
                      </td>

                      {/* Remaining Visual Badges */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {Array.from({ length: max }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-2.5 w-2.5 rounded-full ${
                                i < used
                                  ? 'bg-rose-500 shadow-xs'
                                  : 'bg-emerald-500/80 ring-2 ring-emerald-500/20'
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isMaxed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Limit Reached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {remaining} Left
                          </span>
                        )}
                      </td>

                      {/* Actions (+1 / -1 / Reset) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* +1 Button */}
                          <button
                            type="button"
                            onClick={() => handleOverridePickups(gm.name, '+1')}
                            disabled={isPending}
                            title={`Add 1 pickup to ${gm.name}`}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                            }`}
                          >
                            <Plus className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">+1</span>
                          </button>

                          {/* -1 Button */}
                          <button
                            type="button"
                            onClick={() => handleOverridePickups(gm.name, '-1')}
                            disabled={isPending || used <= 0}
                            title={`Deduct 1 pickup from ${gm.name}`}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 disabled:opacity-40'
                                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 disabled:opacity-40'
                            }`}
                          >
                            <Minus className="h-3.5 w-3.5 text-amber-400" />
                            <span className="hidden sm:inline">-1</span>
                          </button>

                          {/* Reset Button */}
                          <button
                            type="button"
                            onClick={() => handleOverridePickups(gm.name, 'reset')}
                            disabled={isPending || used === 0}
                            title={`Reset ${gm.name}'s pickups to 0`}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isLight
                                ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 disabled:opacity-40'
                                : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300 disabled:opacity-40'
                            }`}
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Reset</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. ROSTER FORCE EDIT (`active_roster_players` + `nhl_master_players`) */}
        {/* ========================================================================= */}
        <section
          id="roster-force-edit"
          className={`p-6 sm:p-7 rounded-3xl border transition-all ${
            isLight
              ? 'bg-white border-amber-500/30 shadow-md shadow-slate-200/50'
              : 'bg-slate-900/90 border-amber-500/30 shadow-xl shadow-black/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Roster Force Edit
                </h2>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Forcibly drop players from or add any NHL player directly onto a GM's active roster.
                </p>
              </div>
            </div>

            {/* GM Selector Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-bold text-slate-400">Target GM:</span>
              <div className="relative">
                <select
                  value={selectedForceGm}
                  onChange={(e) => setSelectedForceGm(e.target.value)}
                  className={`appearance-none pl-3.5 pr-8 py-2 rounded-xl border text-xs font-black shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800'
                      : 'bg-slate-950 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {allGms.map((gm) => (
                    <option key={gm.name} value={gm.name}>
                      {gm.name} ({gm.teamName || `${gm.name}'s Team`})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>

          {/* Dual Panel: Current Roster & Force Add Search */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
            {/* Left Panel: Selected GM's Current Roster (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  <span>Current Active Roster</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {rosterPlayers.length} Players
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => fetchActiveRoster(selectedForceGm)}
                  className="text-xs font-bold text-slate-400 hover:text-amber-400 flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingRoster ? 'animate-spin' : ''}`} />
                  <span>Reload</span>
                </button>
              </div>

              {loadingRoster ? (
                <div className="p-8 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-400 mb-2" />
                  <p className="text-xs text-slate-400">Loading {selectedForceGm}'s roster...</p>
                </div>
              ) : rosterPlayers.length === 0 ? (
                <div className={`p-8 text-center rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}>
                  <Info className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">No active players assigned to {selectedForceGm}.</p>
                  <p className="text-xs text-slate-500 mt-1">Use the search bar on the right to force add players.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rosterPlayers.map((player) => (
                    <div
                      key={player.id || `${player.nhl_id}-${player.player_name}`}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                          : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/80 hover:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          player.position === 'G'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : player.position === 'D'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {player.position}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {player.player_name}
                            </span>
                            {player.is_keeper && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Keeper
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{player.team || player.nhl_team || 'NHL'}</span>
                            <span>•</span>
                            <span>NHL ID: {player.nhl_id}</span>
                            {player.fantasy_points !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-bold">{player.fantasy_points} FPTS</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Force Drop Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDroppingPlayer(player);
                          setDropConfirmOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Force Drop</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel: Force Add Search (`nhl_master_players`) (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}>
                <span>Force Add NHL Player</span>
                <span className="text-[10px] text-slate-400 font-bold">nhl_master_players</span>
              </h3>

              {/* Search Bar & Position Tabs */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    id="master-player-search"
                    value={masterQuery}
                    onChange={(e) => setMasterQuery(e.target.value)}
                    placeholder="Search player name, team, or NHL ID..."
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                        : 'bg-slate-950 border-amber-500/30 text-amber-300 placeholder:text-slate-500'
                    }`}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  {masterQuery && (
                    <button
                      onClick={() => setMasterQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Position Tabs */}
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'F', 'D', 'G'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setMasterPosFilter(pos)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        masterPosFilter === pos
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : isLight
                          ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {pos === 'ALL' ? 'All' : pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Players Search Results */}
              <div className={`p-2 rounded-2xl border max-h-[420px] overflow-y-auto space-y-1.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}>
                {filteredMasterPlayers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No players found matching "{masterQuery}".
                  </div>
                ) : (
                  filteredMasterPlayers.map((player) => {
                    const isAlready = rosterPlayers.some(
                      (r) => String(r.nhl_id) === String(player.nhl_id)
                    );
                    const isAdding = addingPlayerId === player.nhl_id;

                    return (
                      <div
                        key={player.nhl_id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isLight
                            ? 'bg-white border-slate-200 hover:border-amber-500/40'
                            : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-black text-slate-400 w-5">
                            {player.position}
                          </span>
                          <div className="truncate">
                            <span className={`font-black text-xs block truncate ${
                              isLight ? 'text-slate-900' : 'text-slate-200'
                            }`}>
                              {player.player_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {player.nhl_team || 'NHL'} • ID: {player.nhl_id}
                              {player.fantasy_points ? ` • ${player.fantasy_points} FPTS` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Force Add CTA */}
                        <button
                          type="button"
                          onClick={() => handleExecuteForceAdd(player)}
                          disabled={isAlready || isAdding}
                          className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                            isAlready
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          }`}
                        >
                          {isAdding ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : isAlready ? (
                            <span>On Roster</span>
                          ) : (
                            <>
                              <UserPlus className="h-3 w-3" />
                              <span>Force Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CommishBackOffice;
