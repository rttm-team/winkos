import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeneralManager } from '../types';
import {
  Shield,
  Users,
  Search,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Calendar,
  Save,
  Database,
  UserPlus
} from 'lucide-react';

export interface NHLKeeperSelectorProps {
  gms?: GeneralManager[];
  authedGm?: GeneralManager | null;
  theme?: 'light' | 'dark';
}

interface KeeperPlayer {
  player_name: string;
  nhl_id: string | number;
  position: 'F' | 'D' | 'G';
  nhl_team: string;
  slot_position?: string;
}

interface MasterPlayer {
  nhl_id: number | string;
  player_name: string;
  position: string;
  nhl_team?: string | null;
  fantasy_points?: number;
}

interface LeagueSeason {
  season_id: string;
  name?: string;
  is_current?: boolean;
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

export function NHLKeeperSelector({ gms: initialGms, authedGm, theme = 'dark' }: NHLKeeperSelectorProps) {
  const isLight = theme === 'light';

  // Seasons & GM State
  const [seasons, setSeasons] = useState<LeagueSeason[]>([
    { season_id: '2026-2027', name: '2026-2027 (Current)', is_current: true }
  ]);
  const [selectedSeason, setSelectedSeason] = useState<string>('2026-2027');
  const [gmList, setGmList] = useState<any[]>(initialGms || DEFAULT_GMS);
  const [selectedGm, setSelectedGm] = useState<string>(authedGm?.name || 'Adam');

  // Keeper Slots State (4 Forwards, 2 Defensemen, 1 Goalie)
  const [slots, setSlots] = useState<Record<string, KeeperPlayer | null>>({
    F1: null, F2: null, F3: null, F4: null,
    D1: null, D2: null,
    G1: null,
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Search Modal & Live Database Query State
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [activeSlotPosition, setActiveSlotPosition] = useState<'F' | 'D' | 'G'>('F');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MasterPlayer[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch seasons and GMs on component mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: seasonsData } = await supabase
          .from('league_seasons')
          .select('*')
          .order('season_id', { ascending: false });

        if (seasonsData && seasonsData.length > 0) {
          setSeasons(seasonsData);
          const current = seasonsData.find((s) => s.is_current);
          if (current) setSelectedSeason(current.season_id);
        }

        const { data: gmsData } = await supabase.from('gms').select('*').order('name');
        if (gmsData && gmsData.length > 0) {
          setGmList(gmsData);
        }
      } catch (err) {
        console.error('Failed loading initial seasons/GMs:', err);
      }
    }
    loadInitialData();
  }, []);

  // 2. Fetch existing keepers from active_roster_players
  useEffect(() => {
    async function loadKeepers() {
      setLoading(true);
      const defaultSlots: Record<string, KeeperPlayer | null> = {
        F1: null, F2: null, F3: null, F4: null,
        D1: null, D2: null,
        G1: null,
      };

      try {
        const { data, error } = await supabase
          .from('active_roster_players')
          .select('*')
          .eq('season_id', selectedSeason)
          .eq('gm_name', selectedGm)
          .eq('is_keeper', true);

        if (!error && data && data.length > 0) {
          let lockedState = false;
          let subTime: string | null = null;
          const fList: KeeperPlayer[] = [];
          const dList: KeeperPlayer[] = [];
          const gList: KeeperPlayer[] = [];

          data.forEach((row: any) => {
            if (row.is_locked) lockedState = true;
            if (row.updated_at) subTime = row.updated_at;

            const rawPos = (row.position || 'F').toUpperCase();
            const cleanPos: 'F' | 'D' | 'G' = rawPos.includes('G') ? 'G' : rawPos.includes('D') ? 'D' : 'F';

            const pObj: KeeperPlayer = {
              player_name: row.player_name || 'Player',
              nhl_id: String(row.nhl_id || ''),
              position: cleanPos,
              nhl_team: row.nhl_team || 'N/A',
              slot_position: row.slot_position
            };

            if (row.slot_position && defaultSlots.hasOwnProperty(row.slot_position)) {
              defaultSlots[row.slot_position] = pObj;
            } else {
              if (pObj.position === 'G') gList.push(pObj);
              else if (pObj.position === 'D') dList.push(pObj);
              else fList.push(pObj);
            }
          });

          // Fill open slots sequentially
          const fKeys = ['F1', 'F2', 'F3', 'F4'];
          const dKeys = ['D1', 'D2'];
          const gKeys = ['G1'];

          fList.forEach((p) => {
            const empty = fKeys.find((k) => !defaultSlots[k]);
            if (empty) defaultSlots[empty] = p;
          });
          dList.forEach((p) => {
            const empty = dKeys.find((k) => !defaultSlots[k]);
            if (empty) defaultSlots[empty] = p;
          });
          gList.forEach((p) => {
            const empty = gKeys.find((k) => !defaultSlots[k]);
            if (empty) defaultSlots[empty] = p;
          });

          setSlots(defaultSlots);
          setIsLocked(lockedState);
          setSubmittedAt(subTime);
        } else {
          setSlots(defaultSlots);
          setIsLocked(false);
          setSubmittedAt(null);
        }
      } catch (err) {
        console.error('Error loading keepers:', err);
        setSlots(defaultSlots);
      } finally {
        setLoading(false);
      }
    }
    loadKeepers();
  }, [selectedSeason, selectedGm]);

  // 3. Live Server-Side Search against nhl_master_players with Deduplication
  const executeSearch = useCallback(async (query: string, targetPos: 'F' | 'D' | 'G') => {
    setSearching(true);
    try {
      let dbQuery = supabase
        .from('nhl_master_players')
        .select('nhl_id, player_name, position, nhl_team, fantasy_points');

      if (query && query.trim().length > 0) {
        dbQuery = dbQuery.ilike('player_name', `%${query.trim()}%`);
      }

      const { data, error } = await dbQuery
        .order('fantasy_points', { ascending: false })
        .limit(30);

      if (!error && data) {
        // Deduplicate returned players by nhl_id
        const uniqueMap = new Map<string, MasterPlayer>();
        data.forEach((p: any) => {
          const key = String(p.nhl_id || p.player_name);
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, p);
          }
        });
        const uniqueData = Array.from(uniqueMap.values());

        // Filter by slot position rules
        const filtered = uniqueData.filter((p) => {
          const pos = (p.position || '').toUpperCase();
          if (targetPos === 'F') return pos === 'F' || pos === 'C' || pos === 'L' || pos === 'R' || pos.includes('W') || pos.includes('FOR');
          if (targetPos === 'D') return pos === 'D' || pos.includes('D') || pos.includes('DEF');
          if (targetPos === 'G') return pos === 'G' || pos.includes('G') || pos.includes('GOA');
          return true;
        });

        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Master player search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Open search modal and perform initial search
  const handleOpenSearch = (slotKey: string, pos: 'F' | 'D' | 'G') => {
    if (isLocked) {
      showToast('Keepers are locked. Unlock to modify selections.', 'error');
      return;
    }
    setActiveSlotKey(slotKey);
    setActiveSlotPosition(pos);
    setSearchQuery('');
    setIsSearchOpen(true);
    executeSearch('', pos);
  };

  // Handle typing in search bar
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    executeSearch(val, activeSlotPosition);
  };

  // Select player from search modal
  const handleSelectPlayer = (player: MasterPlayer) => {
    if (!activeSlotKey) return;

    const rawPos = (player.position || activeSlotPosition).toUpperCase();
    const cleanPos: 'F' | 'D' | 'G' = rawPos.includes('G') ? 'G' : rawPos.includes('D') ? 'D' : 'F';

    const keeperObj: KeeperPlayer = {
      player_name: player.player_name,
      nhl_id: String(player.nhl_id),
      position: cleanPos,
      nhl_team: player.nhl_team || 'N/A',
      slot_position: activeSlotKey
    };

    setSlots((prev) => ({
      ...prev,
      [activeSlotKey]: keeperObj
    }));

    setIsSearchOpen(false);
    showToast(`Assigned ${player.player_name} to ${activeSlotKey}!`, 'success');
  };

  // Remove player from slot
  const handleRemovePlayer = (slotKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    setSlots((prev) => ({ ...prev, [slotKey]: null }));
  };

  // 4. Save & Lock Keepers cleanly into active_roster_players
  const handleSaveAndLock = async (lockIn: boolean) => {
    setSaving(true);
    const now = new Date().toISOString();

    try {
      const activeSeasonId = selectedSeason || '2026-2027';

      const keeperPayload: any[] = [];
      Object.entries(slots).forEach(([slotKey, playerVal]) => {
        const playerObj = playerVal as KeeperPlayer | null;
        if (playerObj) {
          keeperPayload.push({
            season_id: activeSeasonId,
            gm_name: selectedGm,
            nhl_id: Number(playerObj.nhl_id || 0),
            player_name: playerObj.player_name,
            position: playerObj.position,
            nhl_team: playerObj.nhl_team || 'N/A',
            is_keeper: true,
            is_locked: lockIn,
            roster_status: 'ACTIVE',
            slot_position: slotKey
          });
        }
      });

      // Step A: Delete previous keeper selections for this GM and season
      const { error: delError } = await supabase
        .from('active_roster_players')
        .delete()
        .eq('season_id', activeSeasonId)
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      if (delError) {
        showToast(`Delete Error: ${delError.message}`, 'error');
        return;
      }

      // Step B: Insert newly chosen keeper rows
      if (keeperPayload.length > 0) {
        const { error: insError } = await supabase
          .from('active_roster_players')
          .insert(keeperPayload);

        if (insError) {
          showToast(`Insert Error: ${insError.message}`, 'error');
          return;
        }
      }

      setIsLocked(lockIn);
      setSubmittedAt(now);
      showToast(
        lockIn
          ? 'Keepers officially locked and saved to active roster! 🚀'
          : 'Keeper draft progress saved.',
        'success'
      );
    } catch (err: any) {
      console.error('Save error:', err);
      showToast(`Save failed: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Copy keepers from previous season
  const handleCopyLastSeason = async () => {
    if (isLocked) {
      showToast('Keepers are locked. Unlock to copy keepers.', 'error');
      return;
    }

    try {
      const prevSeason = '2025-2026';
      const { data, error } = await supabase
        .from('active_roster_players')
        .select('*')
        .eq('season_id', prevSeason)
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      if (!error && data && data.length > 0) {
        const newSlots: Record<string, KeeperPlayer | null> = {
          F1: null, F2: null, F3: null, F4: null,
          D1: null, D2: null,
          G1: null,
        };

        data.forEach((row: any) => {
          const rawPos = (row.position || 'F').toUpperCase();
          const cleanPos: 'F' | 'D' | 'G' = rawPos.includes('G') ? 'G' : rawPos.includes('D') ? 'D' : 'F';
          const pObj: KeeperPlayer = {
            player_name: row.player_name || 'Player',
            nhl_id: String(row.nhl_id || ''),
            position: cleanPos,
            nhl_team: row.nhl_team || 'N/A',
            slot_position: row.slot_position
          };

          if (row.slot_position && newSlots.hasOwnProperty(row.slot_position)) {
            newSlots[row.slot_position] = pObj;
          }
        });

        setSlots(newSlots);
        showToast(`Successfully copied keepers from ${prevSeason}!`, 'success');
      } else {
        showToast(`No previous keepers found for ${prevSeason}.`, 'info');
      }
    } catch (err) {
      showToast('Failed to copy previous keepers.', 'error');
    }
  };

  // Unlock keepers action
  const handleUnlockKeepers = async () => {
    setSaving(true);
    try {
      await supabase
        .from('active_roster_players')
        .update({ is_locked: false })
        .eq('season_id', selectedSeason)
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      setIsLocked(false);
      showToast('Keepers unlocked for editing.', 'info');
    } catch (err) {
      showToast('Failed to unlock keepers.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.values(slots).filter(Boolean).length;

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border font-semibold ${
          toast.type === 'error' ? 'bg-rose-900/90 text-rose-200 border-rose-700' :
          toast.type === 'info' ? 'bg-blue-900/90 text-blue-200 border-blue-700' :
          'bg-emerald-900/90 text-emerald-200 border-emerald-700'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-wider">
                Keeper Lock Portal
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> 7 Slots Required
              </span>
            </div>
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              NHL Keepers Management
            </h1>
            <p className={`text-sm mt-1 max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Designate your 7 official franchise keepers (4 Forwards, 2 Defensemen, 1 Goalie). All selections synchronize cleanly with active roster standings.
            </p>
          </div>

          {/* Selectors Bar */}
          <div className="flex items-center gap-3">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none"
            >
              {seasons.map((s) => (
                <option key={s.season_id} value={s.season_id}>
                  {s.season_id}
                </option>
              ))}
            </select>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-sm ${
              isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
            }`}>
              <Users className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">GM:</span>
              <select
                value={selectedGm}
                onChange={(e) => setSelectedGm(e.target.value)}
                className="bg-transparent font-black text-sm outline-none cursor-pointer pr-2 text-amber-400"
              >
                {gmList.map((gm) => (
                  <option key={gm.id || gm.name} value={gm.name} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                    {gm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 font-mono font-black">
              {filledCount}/7
            </div>
            <div>
              <div className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {filledCount === 7 ? 'Roster Fully Locked & Ready!' : `${7 - filledCount} Keeper Slots Remaining`}
              </div>
              <div className="text-xs text-slate-500">
                Strict position matching enforced for all 7 slots.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyLastSeason}
              disabled={isLocked}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isLight 
                  ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Copy Keepers from Previous Season</span>
            </button>

            {isLocked ? (
              <button
                type="button"
                onClick={handleUnlockKeepers}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg"
              >
                <Unlock className="h-4 w-4" />
                <span>Unlock Keepers</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveAndLock(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
                >
                  <Save className="h-4 w-4 inline mr-1" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndLock(true)}
                  disabled={saving || filledCount < 7}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 ${
                    filledCount === 7
                      ? 'bg-amber-500 hover:bg-amber-600 text-black cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span>Lock Keepers</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Position Slots Grid UI */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-400 mb-3" />
            <p className="text-sm font-bold text-slate-400">Loading Keepers from Supabase...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Forwards (4) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">Forward Slots (4 Required)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {['F1', 'F2', 'F3', 'F4'].map((key) => renderSlotCard(key, 'F', 'Forward'))}
              </div>
            </div>

            {/* Defensemen (2) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">Defenseman Slots (2 Required)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['D1', 'D2'].map((key) => renderSlotCard(key, 'D', 'Defenseman'))}
              </div>
            </div>

            {/* Goalie (1) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Goaltender Slot (1 Required)</h3>
              <div className="grid grid-cols-1 gap-4 max-w-sm">
                {['G1'].map((key) => renderSlotCard(key, 'G', 'Goaltender'))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Master Player Search Modal (Queries nhl_master_players exclusively) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-400">
                  <Database className="h-3 w-3" />
                  nhl_master_players
                </div>
                <h3 className="text-base font-extrabold text-slate-100">
                  Select {activeSlotPosition === 'F' ? 'Forward' : activeSlotPosition === 'D' ? 'Defenseman' : 'Goaltender'} ({activeSlotKey})
                </h3>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search NHL players (e.g. Bratt, McDavid, NJD)..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {searching ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  <span>Querying nhl_master_players...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  No {activeSlotPosition} players found matching "{searchQuery}".
                </p>
              ) : (
                searchResults.map((player) => (
                  <div
                    key={player.nhl_id}
                    onClick={() => handleSelectPlayer(player)}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-slate-100">{player.player_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {player.position} • {player.nhl_team || 'N/A'} • #{player.nhl_id}
                      </div>
                    </div>
                    <button className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-black text-[11px]">
                      + Select
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderSlotCard(slotKey: string, pos: 'F' | 'D' | 'G', posLabel: string) {
    const player = slots[slotKey];
    return (
      <div
        key={slotKey}
        onClick={() => !player && handleOpenSearch(slotKey, pos)}
        className={`p-5 rounded-3xl border transition-all flex flex-col justify-between min-h-[140px] ${
          player
            ? 'bg-slate-900 border-slate-700'
            : 'bg-slate-900/40 border-dashed border-slate-700 hover:border-amber-500 cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
            slotKey.startsWith('F') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            slotKey.startsWith('D') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}>
            {slotKey} • {posLabel}
          </span>

          {player && !isLocked && (
            <button
              onClick={(e) => handleRemovePlayer(slotKey, e)}
              className="text-rose-400 hover:text-rose-300 p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {player ? (
          <div className="mt-3">
            <h4 className="font-extrabold text-sm text-slate-100">{player.player_name}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{player.nhl_team}</p>
            {!isLocked && (
              <button
                onClick={() => handleOpenSearch(slotKey, pos)}
                className="mt-2 text-[10px] font-bold text-amber-400 hover:underline"
              >
                Change Player
              </button>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-1 text-slate-400 text-xs font-bold">
            <Plus className="h-4 w-4 text-amber-400" />
            <span>Select Keeper</span>
          </div>
        )}
      </div>
    );
  }
}

export default NHLKeeperSelector;