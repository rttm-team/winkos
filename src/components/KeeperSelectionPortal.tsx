import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeneralManager } from '../types';
import {
  Shield,
  Search,
  Lock,
  Unlock,
  X,
  Plus,
  Trash2,
  Loader2,
  Users,
  Calendar,
  RotateCw
} from 'lucide-react';

export interface KeeperSelectionPortalProps {
  gms?: GeneralManager[];
  authedGm?: GeneralManager | null;
  theme?: 'light' | 'dark';
}

interface KeeperPlayer {
  player_name: string;
  nhl_id: string;
  position: 'F' | 'D' | 'G';
  nhl_team: string;
  slot_position?: string;
  id?: string | number;
}

interface MasterPlayer {
  nhl_id: number | string;
  player_name: string;
  position: string;
  nhl_team: string;
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

export const KeeperSelectionPortal: React.FC<KeeperSelectionPortalProps> = ({
  gms: initialGms,
  authedGm,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  // Seasons & GM state
  const [seasons, setSeasons] = useState<LeagueSeason[]>([
    { season_id: '2026-2027', name: '2026-2027 (Current)', is_current: true }
  ]);
  const [selectedSeason, setSelectedSeason] = useState<string>('2026-2027');
  const [gmList, setGmList] = useState<any[]>(initialGms || DEFAULT_GMS);
  const [selectedGm, setSelectedGm] = useState<string>(authedGm?.name || 'Adam');

  // Slots state (4 Forwards, 2 Defensemen, 1 Goalie)
  const [slots, setSlots] = useState<Record<string, KeeperPlayer | null>>({
    F1: null,
    F2: null,
    F3: null,
    F4: null,
    D1: null,
    D2: null,
    G1: null,
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Search Modal state & Live Supabase search results
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

  // 1. Fetch seasons & GMs on mount
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
        console.error('Failed loading seasons/GMs:', err);
      }
    }
    loadInitialData();
  }, []);

  // 2. Fetch existing keepers for selected GM and season
  useEffect(() => {
    async function loadKeepers() {
      setLoading(true);
      const defaultSlots: Record<string, KeeperPlayer | null> = {
        F1: null, F2: null, F3: null, F4: null,
        D1: null, D2: null,
        G1: null,
      };

      try {
        let { data, error } = await supabase
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

          // Auto-assign unplaced players into open slots
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
        console.error('Failed to load keepers:', err);
        setSlots(defaultSlots);
      } finally {
        setLoading(false);
      }
    }
    loadKeepers();
  }, [selectedSeason, selectedGm]);

  // 3. Live Server-Side Search against nhl_master_players table in Supabase
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
        .limit(25);

      if (!error && data) {
        // Filter search results according to position slot rules
        const filtered = data.filter((p: any) => {
          const pos = (p.position || '').toUpperCase();
          if (targetPos === 'F') return pos === 'F' || pos === 'C' || pos === 'L' || pos === 'R' || pos.includes('W') || pos.includes('FOR');
          if (targetPos === 'D') return pos === 'D' || pos.includes('D') || pos.includes('DEF');
          if (targetPos === 'G') return pos === 'G' || pos.includes('G') || pos.includes('GOA');
          return true;
        });
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Master player search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Open search modal and trigger initial list
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

  // Handle typing in search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    executeSearch(val, activeSlotPosition);
  };

  // Select player from modal
  const handleSelectPlayer = (player: MasterPlayer) => {
    if (!activeSlotKey) return;

    // Prevent selecting the same player twice across different slots
    const isAlreadySelected = (Object.values(slots) as (KeeperPlayer | null)[]).some(
      (slot) => slot && String(slot.nhl_id) === String(player.nhl_id)
    );

    if (isAlreadySelected) {
      showToast(`${player.player_name} is already selected as one of your keepers!`, 'error');
      return;
    }

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

      // Build payload for chosen slots
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

      // Step A: Delete previous standard keeper rows for this GM & season
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

      // Step B: Insert updated keeper rows (if any selected)
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
          : 'Keeper draft progress saved successfully.',
        'success'
      );
    } catch (err: any) {
      console.error('Save error:', err);
      showToast(`Failed to save keepers: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Unlock Keepers
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

  // Copy Keepers from Last Season
  const handleCopyKeepersFromLastSeason = async () => {
    setSaving(true);
    try {
      // Find previous season id, e.g. "2025-2026"
      const [startYr, endYr] = selectedSeason.split('-');
      if (!startYr || !endYr) {
        showToast(`Invalid season structure: ${selectedSeason}`, 'error');
        return;
      }
      const prevSeasonId = (Number(startYr) - 1) + '-' + (Number(endYr) - 1);
      
      const { data, error } = await supabase
        .from('active_roster_players')
        .select('*')
        .eq('season_id', prevSeasonId)
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      if (error) {
        showToast(`Failed to load last season's keepers: ${error.message}`, 'error');
        return;
      }

      if (!data || data.length === 0) {
        showToast(`No keepers found for previous season (${prevSeasonId}).`, 'info');
        return;
      }

      // Map them to the current slots
      const newSlots: Record<string, KeeperPlayer | null> = {
        F1: null, F2: null, F3: null, F4: null,
        D1: null, D2: null,
        G1: null,
      };

      const fList: KeeperPlayer[] = [];
      const dList: KeeperPlayer[] = [];
      const gList: KeeperPlayer[] = [];

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
        } else {
          if (pObj.position === 'G') gList.push(pObj);
          else if (pObj.position === 'D') dList.push(pObj);
          else fList.push(pObj);
        }
      });

      // Auto-assign any that didn't have slots
      const fKeys = ['F1', 'F2', 'F3', 'F4'];
      const dKeys = ['D1', 'D2'];
      const gKeys = ['G1'];

      fList.forEach(p => {
        const freeKey = fKeys.find(k => !newSlots[k]);
        if (freeKey) newSlots[freeKey] = p;
      });
      dList.forEach(p => {
        const freeKey = dKeys.find(k => !newSlots[k]);
        if (freeKey) newSlots[freeKey] = p;
      });
      gList.forEach(p => {
        const freeKey = gKeys.find(k => !newSlots[k]);
        if (freeKey) newSlots[freeKey] = p;
      });

      setSlots(newSlots);
      showToast(`Successfully copied keepers from ${prevSeasonId}!`, 'success');
    } catch (err: any) {
      showToast(`Error copying keepers: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.values(slots).filter(Boolean).length;

  return (
    <div className={`min-h-screen py-8 ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Title Section positioned outside of the card, exactly styled as Prospect Central */}
        <section className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          <div>
            <h1 className={`text-4xl sm:text-5xl font-black tracking-tight uppercase select-none ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <span>Your Keepers</span>
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Lock in your 7 franchise keepers (4 Forwards, 2 Defensemen, 1 Goalie) for the upcoming season.
            </p>
          </div>

          {/* Lock/Unlock Toggle Badge on Right */}
          <div>
            {isLocked ? (
              <button
                onClick={handleUnlockKeepers}
                disabled={saving}
                className={`px-5 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition shadow-sm cursor-pointer ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/40'
                }`}
              >
                <Lock className="h-4 w-4 text-emerald-500" />
                <span>Keepers Locked (Click to Unlock)</span>
              </button>
            ) : (
              <div
                className={`px-5 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 select-none ${
                  isLight
                    ? 'bg-amber-50/55 border-amber-200 text-amber-800'
                    : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                }`}
              >
                <Unlock className="h-4 w-4 text-amber-500" />
                <span>Drafting / Unlocked</span>
              </div>
            )}
          </div>
        </section>

        {/* Elegant Controls Card inspired exactly by image.png */}
        <div className={`p-6 rounded-[24px] border transition-all ${
          isLight 
            ? 'bg-white border-slate-200/85 shadow-sm' 
            : 'bg-slate-900 border-slate-800 shadow-2xl'
        }`}>
          {/* Bottom Row: Controls and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Dynamic GM and Season Context Info */}
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                GM: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{selectedGm}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Season 2026-2027
              </span>
            </div>

            {/* Actions on Right Side */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Copy Keepers Button */}
              <button
                onClick={handleCopyKeepersFromLastSeason}
                disabled={saving || isLocked}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border shadow-sm transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 active:bg-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 active:bg-slate-750'
                } disabled:opacity-45 disabled:cursor-not-allowed`}
              >
                <RotateCw className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
                <span>Copy Keepers from Last Season</span>
              </button>

              {/* Filled Slots Count Badge */}
              <div
                className={`px-4 py-2.5 rounded-xl border text-xs font-black shadow-sm select-none ${
                  filledCount === 7
                    ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300')
                    : (isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/30 border-amber-800/40 text-amber-300')
                }`}
              >
                <span>{filledCount} / 7 Keepers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Slot Grid */}
        {loading ? (
          <div className={`p-12 text-center flex items-center justify-center gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            <span>Loading active roster keepers...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Forwards (4) */}
            <div>
              <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Forward Slots
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {['F1', 'F2', 'F3', 'F4'].map((key) => renderSlotCard(key, 'F', 'Forward'))}
              </div>
            </div>

            {/* Defensemen (2) */}
            <div>
              <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Defenseman Slots
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {['D1', 'D2'].map((key) => renderSlotCard(key, 'D', 'Defenseman'))}
              </div>
            </div>

            {/* Goalie (1) */}
            <div>
              <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Goaltender Slot
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {['G1'].map((key) => renderSlotCard(key, 'G', 'Goaltender'))}
              </div>
            </div>
          </div>
        )}

        {/* Action Footer */}
        {!isLocked && (
          <div className={`flex justify-end gap-3 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => handleSaveAndLock(false)}
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs border transition ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSaveAndLock(true)}
              disabled={saving || filledCount < 7}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition ${
                filledCount === 7
                  ? 'bg-amber-500 hover:bg-amber-600 text-black cursor-pointer'
                  : (isLight ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-800 text-slate-500 cursor-not-allowed')
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Lock Keepers</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Master Player Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-[32px] w-full max-w-xl p-8 space-y-6 shadow-2xl transition ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <h3 className={`font-black text-base sm:text-lg uppercase tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Select {activeSlotPosition === 'F' ? 'Forward' : activeSlotPosition === 'D' ? 'Defenseman' : 'Goaltender'} ({activeSlotKey})
              </h3>
              <button onClick={() => setIsSearchOpen(false)} className={`transition-colors p-1 rounded-lg ${isLight ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search NHL players (e.g., Bratt, McDavid, NJD)..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
                className={`w-full border rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition ${
                  isLight 
                    ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400' 
                    : 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                }`}
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
              {searching ? (
                <div className={`py-12 text-center text-sm flex items-center justify-center gap-2.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                  <span>Searching NHL Master Database...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-12 text-center text-sm font-medium text-slate-400">
                  No {activeSlotPosition} players found matching "{searchQuery}".
                </p>
              ) : (
                searchResults.map((player) => (
                  <div
                    key={player.nhl_id}
                    onClick={() => handleSelectPlayer(player)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 hover:border-emerald-500 shadow-sm'
                        : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500'
                    }`}
                  >
                    <div>
                      <div className={`font-kanit font-bold text-sm sm:text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{player.player_name}</div>
                      <div className={`text-xs mt-1.5 font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {player.position} • {player.nhl_team || 'N/A'} • #{player.nhl_id}
                      </div>
                    </div>
                    <button className="px-4.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer shrink-0">
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
        className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[140px] shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
          player
            ? (isLight 
                ? 'bg-white border-slate-200/80 hover:border-emerald-500 shadow-slate-100' 
                : 'bg-slate-900 border-slate-700/80 hover:border-emerald-500 shadow-black/40')
            : (isLight 
                ? 'bg-slate-50/50 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-white cursor-pointer' 
                : 'bg-slate-900/40 border-dashed border-slate-700 hover:border-emerald-500 hover:bg-slate-900/60 cursor-pointer')
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
            slotKey.startsWith('F') ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
            slotKey.startsWith('D') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
            'bg-purple-500/10 text-purple-500 border border-purple-500/20'
          }`}>
            {slotKey} • {posLabel}
          </span>

          {player && !isLocked && (
            <button
              onClick={(e) => handleRemovePlayer(slotKey, e)}
              className="text-rose-500 hover:text-rose-600 p-1 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {player ? (
          <div className="mt-3">
            <h4 className={`font-kanit font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{player.player_name}</h4>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{player.nhl_team}</p>
            {!isLocked && (
              <button
                onClick={() => handleOpenSearch(slotKey, pos)}
                className="mt-2 text-[10px] font-bold text-amber-500 hover:text-amber-600 hover:underline transition-colors"
              >
                Change Player
              </button>
            )}
          </div>
        ) : (
          <div className={`mt-2 flex items-center justify-center gap-1 text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <Plus className="h-4 w-4 text-amber-500" />
            <span>Select Keeper</span>
          </div>
        )}
      </div>
    );
  }
};

export default KeeperSelectionPortal;