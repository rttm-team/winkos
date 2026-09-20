import React, { useState, useEffect, useMemo } from 'react';
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
  Save
} from 'lucide-react';

export interface KeeperSelectionPortalProps {
  gms?: GeneralManager[];
  theme?: 'light' | 'dark';
}

interface KeeperPlayer {
  player_name: string;
  nhl_id: string;
  position: 'F' | 'D' | 'G';
  nhl_team: string;
  slot_position?: string;
  id?: string | number;
  name?: string;
  team?: string;
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

const NHL_PLAYER_DATABASE: KeeperPlayer[] = [
  { player_name: 'Seth Jarvis', nhl_id: '8482103', position: 'F', nhl_team: 'Carolina Hurricanes' },
  { player_name: 'Connor McDavid', nhl_id: '8479318', position: 'F', nhl_team: 'Edmonton Oilers' },
  { player_name: 'Nathan MacKinnon', nhl_id: '8477492', position: 'F', nhl_team: 'Colorado Avalanche' },
  { player_name: 'Auston Matthews', nhl_id: '8479314', position: 'F', nhl_team: 'Toronto Maple Leafs' },
  { player_name: 'Nikita Kucherov', nhl_id: '8476826', position: 'F', nhl_team: 'Tampa Bay Lightning' },
  { player_name: 'Leon Draisaitl', nhl_id: '8477934', position: 'F', nhl_team: 'Edmonton Oilers' },
  { player_name: 'David Pastrnak', nhl_id: '8477956', position: 'F', nhl_team: 'Boston Bruins' },
  { player_name: 'Artemi Panarin', nhl_id: '8478550', position: 'F', nhl_team: 'New York Rangers' },
  { player_name: 'Mikko Rantanen', nhl_id: '8478420', position: 'F', nhl_team: 'Colorado Avalanche' },
  { player_name: 'Cale Makar', nhl_id: '8479397', position: 'D', nhl_team: 'Colorado Avalanche' },
  { player_name: 'Roman Josi', nhl_id: '8474600', position: 'D', nhl_team: 'Nashville Predators' },
  { player_name: 'Adam Fox', nhl_id: '8479323', position: 'D', nhl_team: 'New York Rangers' },
  { player_name: 'Quinn Hughes', nhl_id: '8480829', position: 'D', nhl_team: 'Vancouver Canucks' },
  { player_name: 'Victor Hedman', nhl_id: '8474564', position: 'D', nhl_team: 'Tampa Bay Lightning' },
  { player_name: 'Evan Bouchard', nhl_id: '8480873', position: 'D', nhl_team: 'Edmonton Oilers' },
  { player_name: 'Igor Shesterkin', nhl_id: '8478048', position: 'G', nhl_team: 'New York Rangers' },
  { player_name: 'Connor Hellebuyck', nhl_id: '8477479', position: 'G', nhl_team: 'Winnipeg Jets' },
  { player_name: 'Andrei Vasilevskiy', nhl_id: '8476883', position: 'G', nhl_team: 'Tampa Bay Lightning' },
  { player_name: 'Juuse Saros', nhl_id: '8477424', position: 'G', nhl_team: 'Nashville Predators' },
  { player_name: 'Jack Hughes', nhl_id: '8481559', position: 'F', nhl_team: 'New Jersey Devils' },
  { player_name: 'Kirill Kaprizov', nhl_id: '8478864', position: 'F', nhl_team: 'Minnesota Wild' },
  { player_name: 'Jason Robertson', nhl_id: '8479975', position: 'F', nhl_team: 'Dallas Stars' },
  { player_name: 'Matthew Tkachuk', nhl_id: '8479337', position: 'F', nhl_team: 'Florida Panthers' },
  { player_name: 'Brady Tkachuk', nhl_id: '8480801', position: 'F', nhl_team: 'Ottawa Senators' },
  { player_name: 'Jesper Bratt', nhl_id: '8479420', position: 'F', nhl_team: 'New Jersey Devils' },
  { player_name: 'Rasmus Dahlin', nhl_id: '8480827', position: 'D', nhl_team: 'Buffalo Sabres' },
  { player_name: 'Noah Dobson', nhl_id: '8480867', position: 'D', nhl_team: 'New York Islanders' },
  { player_name: 'Wyatt Johnston', nhl_id: '8482684', position: 'F', nhl_team: 'Dallas Stars' },
  { player_name: 'Macklin Celebrini', nhl_id: '8484144', position: 'F', nhl_team: 'San Jose Sharks' },
  { player_name: 'Matvei Michkov', nhl_id: '8484389', position: 'F', nhl_team: 'Philadelphia Flyers' },
  { player_name: 'Adam Fantilli', nhl_id: '8484166', position: 'F', nhl_team: 'Columbus Blue Jackets' },
  { player_name: 'Logan Stankoven', nhl_id: '8482702', position: 'F', nhl_team: 'Dallas Stars' },
  { player_name: 'Jake Oettinger', nhl_id: '8479979', position: 'G', nhl_team: 'Dallas Stars' },
  { player_name: 'Jeremy Swayman', nhl_id: '8480280', position: 'G', nhl_team: 'Boston Bruins' },
  { player_name: 'Stuart Skinner', nhl_id: '8479973', position: 'G', nhl_team: 'Edmonton Oilers' },
];

export default function KeeperSelectionPortal({ gms, theme = 'dark' }: KeeperSelectionPortalProps) {
  const isLight = theme === 'light';
  const gmList = gms && gms.length > 0 ? gms : DEFAULT_GMS;

  const [selectedGm, setSelectedGm] = useState<string>(gmList[0]?.name || 'Adam');
  const [seasons, setSeasons] = useState<LeagueSeason[]>([
    { season_id: '2026-2027', name: '2026-2027 Season', is_current: true },
    { season_id: '2025-2026', name: '2025-2026 Season', is_current: false }
  ]);
  const [selectedSeason, setSelectedSeason] = useState<string>('2026-2027');

  const [slots, setSlots] = useState<Record<string, KeeperPlayer | null>>({
    F1: null, F2: null, F3: null, F4: null,
    D1: null, D2: null,
    G1: null,
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Player search pool (NHL database + league prospects)
  const [searchablePlayers, setSearchablePlayers] = useState<KeeperPlayer[]>(NHL_PLAYER_DATABASE);

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [activeSlotPosition, setActiveSlotPosition] = useState<'F' | 'D' | 'G'>('F');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch seasons from league_seasons on mount, defaulting to is_current = true
  useEffect(() => {
    async function loadSeasons() {
      try {
        const { data, error } = await supabase
          .from('league_seasons')
          .select('*')
          .order('season_id', { ascending: false });

        if (!error && data && data.length > 0) {
          setSeasons(data);
          const currentSeason = data.find((s: any) => s.is_current) || data[0];
          if (currentSeason) {
            setSelectedSeason(currentSeason.season_id);
          }
        } else {
          // If empty, seed default seasons into league_seasons
          const defaultSeasons = [
            { season_id: '2026-2027', name: '2026-2027 Season', is_current: true },
            { season_id: '2025-2026', name: '2025-2026 Season', is_current: false }
          ];
          await supabase.from('league_seasons').upsert(defaultSeasons, { onConflict: 'season_id' });
          setSeasons(defaultSeasons);
          setSelectedSeason('2026-2027');
        }
      } catch (err) {
        console.error('Error loading league seasons:', err);
      }
    }
    loadSeasons();
  }, []);

  // 2. Load prospects to enhance search catalog
  useEffect(() => {
    async function loadProspectCatalog() {
      try {
        const { data } = await supabase
          .from('prospects')
          .select('player_name, nhl_id, position, team, gm_name');
        
        if (data && data.length > 0) {
          const mapped: KeeperPlayer[] = data.map((p: any) => {
            const rawPos = (p.position || 'F').toUpperCase();
            const cleanPos: 'F' | 'D' | 'G' = rawPos.includes('G') ? 'G' : rawPos.includes('D') ? 'D' : 'F';
            return {
              player_name: p.player_name,
              nhl_id: String(p.nhl_id || ''),
              position: cleanPos,
              nhl_team: p.team || 'NHL Team'
            };
          });

          setSearchablePlayers(prev => {
            const map = new Map<string, KeeperPlayer>();
            mapped.forEach(p => {
              if (p && p.player_name) {
                map.set((p.player_name || '').toLowerCase(), p);
              }
            });
            prev.forEach(p => {
              if (p && p.player_name) {
                const key = (p.player_name || '').toLowerCase();
                if (!map.has(key)) {
                  map.set(key, p);
                }
              }
            });
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('Could not populate prospects into keeper player search pool:', e);
      }
    }
    loadProspectCatalog();
  }, []);

  // 3. Fetch existing keepers directly from active_roster_players
  // SELECT * FROM active_roster_players WHERE season_id = selectedSeason AND gm_name = selectedGM AND is_keeper = true
  useEffect(() => {
    async function loadKeepers() {
      setLoading(true);
      try {
        const defaultSlots: Record<string, KeeperPlayer | null> = {
          F1: null, F2: null, F3: null, F4: null,
          D1: null, D2: null,
          G1: null,
        };

        // Primary query strictly targeting active_roster_players
        let { data, error } = await supabase
          .from('active_roster_players')
          .select('*')
          .eq('season_id', selectedSeason)
          .eq('gm_name', selectedGm)
          .eq('is_keeper', true);

        // Check alternate season format if empty (e.g., 2026-2027 vs 2026-27)
        if ((!data || data.length === 0) && selectedSeason) {
          const altSeason = selectedSeason === '2026-2027' ? '2026-27' : selectedSeason === '2026-27' ? '2026-2027' : null;
          if (altSeason) {
            const { data: altData } = await supabase
              .from('active_roster_players')
              .select('*')
              .eq('season_id', altSeason)
              .eq('gm_name', selectedGm)
              .eq('is_keeper', true);
            if (altData && altData.length > 0) {
              data = altData;
            }
          }
        }

        if (!error && data && data.length > 0) {
          let lockedState = false;
          let subTime: string | null = null;
          const fList: KeeperPlayer[] = [];
          const dList: KeeperPlayer[] = [];
          const gList: KeeperPlayer[] = [];

          data.forEach((row: any) => {
            if (row.is_locked) lockedState = true;
            if (row.submitted_at) subTime = row.submitted_at;

            const rawPos = (row.position || 'F').toUpperCase();
            const cleanPos: 'F' | 'D' | 'G' = rawPos.includes('G') ? 'G' : rawPos.includes('D') ? 'D' : 'F';

            const pObj: KeeperPlayer = {
              player_name: row.player_name || 'Player',
              nhl_id: String(row.nhl_id || ''),
              position: cleanPos,
              nhl_team: row.nhl_team || row.team || 'NHL Team'
            };

            if (row.slot_position && defaultSlots.hasOwnProperty(row.slot_position)) {
              defaultSlots[row.slot_position] = pObj;
            } else {
              if (pObj.position === 'G') gList.push(pObj);
              else if (pObj.position === 'D') dList.push(pObj);
              else fList.push(pObj);
            }
          });

          // Fill any unassigned slots sequentially
          const fKeys = ['F1', 'F2', 'F3', 'F4'];
          const dKeys = ['D1', 'D2'];
          const gKeys = ['G1'];

          fList.forEach(p => {
            const empty = fKeys.find(k => !defaultSlots[k]);
            if (empty) defaultSlots[empty] = p;
          });
          dList.forEach(p => {
            const empty = dKeys.find(k => !defaultSlots[k]);
            if (empty) defaultSlots[empty] = p;
          });
          gList.forEach(p => {
            const empty = gKeys.find(k => !defaultSlots[k]);
            if (empty) defaultSlots[empty] = p;
          });

          setSlots(defaultSlots);
          setIsLocked(lockedState);
          setSubmittedAt(subTime);
        } else {
          // Fallback to local storage
          const localKey = `winko_keepers_${selectedSeason}_${selectedGm}`;
          const stored = localStorage.getItem(localKey) || localStorage.getItem(`winko_keepers_${selectedGm}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const loadedSlots = parsed.slots || (parsed.F1 || parsed.D1 || parsed.G1 ? parsed : defaultSlots);
              setSlots(loadedSlots);
              setIsLocked(Boolean(parsed.is_locked));
              setSubmittedAt(parsed.submitted_at || null);
            } catch (e) {
              setSlots(defaultSlots);
              setIsLocked(false);
              setSubmittedAt(null);
            }
          } else {
            setSlots(defaultSlots);
            setIsLocked(false);
            setSubmittedAt(null);
          }
        }
      } catch (err) {
        console.error('Failed to load keepers from active_roster_players:', err);
      } finally {
        setLoading(false);
      }
    }
    loadKeepers();
  }, [selectedSeason, selectedGm]);

  // Handle slot click
  const handleOpenSearch = (slotKey: string, pos: 'F' | 'D' | 'G') => {
    if (isLocked) {
      showToast('Keepers are locked for this season. Unlock to modify selections.', 'error');
      return;
    }
    setActiveSlotKey(slotKey);
    setActiveSlotPosition(pos);
    setSearchQuery('');
    setIsSearchOpen(true);
  };

  // Select player from modal with strict position validation
  const handleSelectPlayer = (player: KeeperPlayer) => {
    if (!activeSlotKey) return;
    
    // Exact position verification
    if (player.position !== activeSlotPosition) {
      showToast(`Position mismatch! ${player.player_name} is a ${player.position}, but this is a ${activeSlotPosition} slot.`, 'error');
      return;
    }

    setSlots(prev => ({
      ...prev,
      [activeSlotKey]: player
    }));

    setIsSearchOpen(false);
    showToast(`Assigned ${player.player_name} to ${activeSlotKey}!`, 'success');
  };

  // Remove player from slot with immediate database deletion & local storage sync
  const handleRemovePlayer = async (slotKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      showToast('Keepers are locked for this season. Unlock to edit.', 'error');
      return;
    }

    const playerToRemove = slots[slotKey];
    if (!playerToRemove) return;

    // 1. Optimistic state update
    const updatedSlots = {
      ...slots,
      [slotKey]: null
    };
    setSlots(updatedSlots);

    // 2. Synchronize local storage to purge removed keeper immediately
    const localKey = `winko_keepers_${selectedSeason}_${selectedGm}`;
    try {
      const existing = localStorage.getItem(localKey);
      let updatedStoredData: any = { slots: updatedSlots, is_locked: isLocked, submitted_at: submittedAt };
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          updatedStoredData = { ...parsed, slots: updatedSlots };
        } catch (err) {
          // ignore
        }
      }
      localStorage.setItem(localKey, JSON.stringify(updatedStoredData));
      localStorage.setItem(`winko_keepers_${selectedGm}`, JSON.stringify(updatedSlots));
    } catch (lsErr) {
      console.warn('Error updating local storage after keeper removal:', lsErr);
    }

    // 3. User feedback
    const displaySeason = selectedSeason.includes('2026') ? '2026-27' : selectedSeason;
    showToast(`Keeper removed from ${displaySeason} roster 🗑️`, 'info');

    // 4. Execute immediate Supabase delete from active_roster_players
    try {
      // Primary delete matching season_id, gm_name, and player identification
      let deleteQuery = supabase
        .from('active_roster_players')
        .delete()
        .eq('season_id', selectedSeason)
        .eq('gm_name', selectedGm);

      if (playerToRemove.nhl_id && String(playerToRemove.nhl_id).trim() !== '') {
        deleteQuery = deleteQuery.eq('nhl_id', String(playerToRemove.nhl_id));
      } else {
        deleteQuery = deleteQuery.eq('player_name', playerToRemove.player_name);
      }

      const { error } = await deleteQuery;
      if (error) {
        console.warn('Primary keeper deletion error, attempting slot_position fallback:', error.message);
        // Fallback by slot_position
        await supabase
          .from('active_roster_players')
          .delete()
          .eq('season_id', selectedSeason)
          .eq('gm_name', selectedGm)
          .eq('slot_position', slotKey);
      }

      // Also clean up under alternate season format if applicable (e.g., 2026-2027 vs 2026-27)
      const altSeason = selectedSeason === '2026-2027' ? '2026-27' : selectedSeason === '2026-27' ? '2026-2027' : null;
      if (altSeason) {
        let altDelete = supabase
          .from('active_roster_players')
          .delete()
          .eq('season_id', altSeason)
          .eq('gm_name', selectedGm);

        if (playerToRemove.nhl_id && String(playerToRemove.nhl_id).trim() !== '') {
          altDelete = altDelete.eq('nhl_id', String(playerToRemove.nhl_id));
        } else {
          altDelete = altDelete.eq('player_name', playerToRemove.player_name);
        }
        await altDelete;
      }
    } catch (dbErr) {
      console.error('Error executing delete from active_roster_players:', dbErr);
    }
  };

  // Rollover Action: "Copy Keepers from Last Season"
  // Queries active_roster_players WHERE season_id = previousSeason AND is_keeper = true
  const handleCopyLastSeason = async () => {
    if (isLocked) {
      showToast('Keepers are locked for this season. Unlock to copy keepers.', 'error');
      return;
    }

    try {
      // Determine previous season identifier
      const seasonIndex = seasons.findIndex(s => s.season_id === selectedSeason);
      const prevSeason = seasonIndex >= 0 && seasonIndex < seasons.length - 1
        ? seasons[seasonIndex + 1]?.season_id
        : (selectedSeason.startsWith('2026') ? '2025-2026' : '2025-26');

      let { data, error } = await supabase
        .from('active_roster_players')
        .select('*')
        .eq('season_id', prevSeason)
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      // Try alternate format if empty
      if ((!data || data.length === 0) && prevSeason) {
        const altPrev = prevSeason === '2025-2026' ? '2025-26' : prevSeason === '2025-26' ? '2025-2026' : null;
        if (altPrev) {
          const { data: altData } = await supabase
            .from('active_roster_players')
            .select('*')
            .eq('season_id', altPrev)
            .eq('gm_name', selectedGm)
            .eq('is_keeper', true);
          if (altData && altData.length > 0) {
            data = altData;
          }
        }
      }

      if (!error && data && data.length > 0) {
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
            nhl_team: row.nhl_team || row.team || 'NHL Team'
          };

          if (row.slot_position && newSlots.hasOwnProperty(row.slot_position)) {
            newSlots[row.slot_position] = pObj;
          } else {
            if (pObj.position === 'G') gList.push(pObj);
            else if (pObj.position === 'D') dList.push(pObj);
            else fList.push(pObj);
          }
        });

        // Fill slots
        const fKeys = ['F1', 'F2', 'F3', 'F4'];
        const dKeys = ['D1', 'D2'];
        const gKeys = ['G1'];

        fList.forEach(p => {
          const empty = fKeys.find(k => !newSlots[k]);
          if (empty) newSlots[empty] = p;
        });
        dList.forEach(p => {
          const empty = dKeys.find(k => !newSlots[k]);
          if (empty) newSlots[empty] = p;
        });
        gList.forEach(p => {
          const empty = gKeys.find(k => !newSlots[k]);
          if (empty) newSlots[empty] = p;
        });

        setSlots(newSlots);
        setIsLocked(false);
        showToast(`Successfully copied keepers from ${prevSeason}!`, 'success');
      } else {
        // Check localStorage fallback
        const localPrev = localStorage.getItem(`winko_keepers_${prevSeason}_${selectedGm}`) || 
                          localStorage.getItem(`winko_keepers_2025-26_${selectedGm}`);
        if (localPrev) {
          try {
            const parsed = JSON.parse(localPrev);
            const loaded = parsed.slots || parsed;
            setSlots(loaded);
            setIsLocked(false);
            showToast(`Copied saved keepers from ${prevSeason}!`, 'success');
            return;
          } catch (e) {}
        }
        showToast(`No previous keepers found for ${prevSeason}.`, 'info');
      }
    } catch (err) {
      console.error('Error rolling over keepers from active_roster_players:', err);
      showToast('Failed to copy keepers from previous season.', 'error');
    }
  };

  // Save & Lock Execution directly into active_roster_players
  const handleSaveAndLock = async (lockIn: boolean) => {
    setSaving(true);
    const now = new Date().toISOString();

    try {
      const activeSeasonId = selectedSeason || '2026-2027';
      const keepersList: KeeperPlayer[] = [];
      Object.entries(slots).forEach(([slotKey, playerObj]) => {
        const player = playerObj as KeeperPlayer | null;
        if (player) {
          keepersList.push({
            ...player,
            slot_position: slotKey
          });
        }
      });

      const keepers = keepersList;
      const keeperPayload = keepers.map((player, idx) => ({
        season_id: (selectedSeason || '2026-2027').substring(0, 10),
        gm_name: (selectedGm || 'Adam').substring(0, 10),
        nhl_id: Number(player.nhl_id || player.id || 0),
        player_name: player.player_name || player.name || 'Unknown',
        position: (player.position || 'F').substring(0, 10),
        nhl_team: (player.nhl_team || player.team || 'N/A').substring(0, 10),
        is_keeper: true,
        is_locked: lockIn,
        roster_status: 'ACTIVE',
        slot_position: (player.slot_position || (player.position === 'F' ? `F${idx + 1}` : player.position === 'D' ? `D${idx + 1}` : 'G1')).substring(0, 10)
      }));

      console.log('Inserting Keeper Payload to active_roster_players:', keeperPayload);

      // 1. Delete prior keeper rows for this GM & season in active_roster_players to avoid orphaned slots
      const { error: deleteError } = await supabase
        .from('active_roster_players')
        .delete()
        .eq('season_id', selectedSeason || '2026-2027')
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      if (deleteError) {
        console.error('Delete Error:', deleteError);
        alert('Failed to clear old keepers: ' + deleteError.message);
        return;
      }

      // 2. Insert the fresh keeper records into active_roster_players
      const { error: insertError } = await supabase
        .from('active_roster_players')
        .insert(keeperPayload);

      if (insertError) {
        console.error('Insert Error:', insertError);
        alert('Failed to save updated keepers: ' + insertError.message);
        return;
      }

      // 3. Purge stale local storage cache matching winko_keepers_* and winko_roster_*
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('winko_keepers_') || key.startsWith('winko_roster_'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn('Error purging stale cache:', e);
      }

      // Backup to local storage with season-aware key
      const localKey = `winko_keepers_${activeSeasonId}_${selectedGm}`;
      localStorage.setItem(localKey, JSON.stringify({
        slots,
        is_locked: lockIn,
        submitted_at: now
      }));
      localStorage.setItem(`winko_keepers_${selectedGm}`, JSON.stringify(slots));

      setIsLocked(lockIn);
      setSubmittedAt(now);

      showToast('Keepers locked and synchronized to 2026-27 Active Roster! 🚀', 'success');
    } catch (err: any) {
      console.error('Save keepers error in active_roster_players:', err);
      showToast(`Failed to save keepers: ${err?.message || 'Database error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Unlock action for Commissioner or GM
  const handleUnlockKeepers = async () => {
    setSaving(true);
    try {
      await supabase
        .from('active_roster_players')
        .update({ is_locked: false })
        .eq('season_id', selectedSeason)
        .eq('gm_name', selectedGm)
        .eq('is_keeper', true);

      const localKey = `winko_keepers_${selectedSeason}_${selectedGm}`;
      const existing = localStorage.getItem(localKey);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          parsed.is_locked = false;
          localStorage.setItem(localKey, JSON.stringify(parsed));
        } catch (e) {}
      }

      setIsLocked(false);
      showToast('Keepers unlocked for editing.', 'info');
    } catch (err: any) {
      console.error('Error unlocking keepers:', err);
      showToast('Failed to unlock keepers.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered NHL player search results
  const filteredPlayers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return searchablePlayers.filter(p => {
      if (!p || !p.player_name) return false;
      const matchesQuery = !q ||
        (p.player_name || '').toLowerCase().includes(q) ||
        (p.nhl_team || '').toLowerCase().includes(q);
      const matchesPosition = p.position === activeSlotPosition;
      return matchesQuery && matchesPosition;
    });
  }, [searchablePlayers, searchQuery, activeSlotPosition]);

  const filledCount = Object.values(slots).filter(Boolean).length;
  const isReadyToLock = filledCount === 7;

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-bounce ${
            toast.type === 'success'
              ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/90 border-emerald-700 text-emerald-200')
              : toast.type === 'error'
              ? (isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/90 border-rose-700 text-rose-200')
              : (isLight ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-950/90 border-blue-700 text-blue-200')
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        )}

        {/* Header & Controls */}
        <div className={`p-6 rounded-3xl border shadow-lg ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-black/40'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">NHL Keeper Selection Portal</h1>
                  <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Lock in your 7 franchise keepers (4 Forwards, 2 Defensemen, 1 Goalie) directly into the Active Roster.
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2.5 rounded-2xl border font-bold text-sm flex items-center gap-2 shadow-sm ${
                isLocked
                  ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-950/60 border-emerald-800 text-emerald-300')
                  : (isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-950/60 border-amber-800 text-amber-300')
              }`}>
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                <span>{isLocked ? 'Keepers Locked 🔒' : 'Drafting / Unlocked'}</span>
              </div>
            </div>
          </div>

          {/* Selectors Bar */}
          <div className="mt-6 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center border-slate-200 dark:border-slate-800">
            {/* Season Selector */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                League Season
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' 
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  {seasons.map(s => (
                    <option key={s.season_id} value={s.season_id}>
                      {s.name || s.season_id} {s.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GM Selector */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                General Manager
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedGm}
                  onChange={(e) => setSelectedGm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' 
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  {gmList.map(gm => (
                    <option key={gm.id || gm.name} value={gm.name}>
                      {gm.name} ({gm.teamName || `${gm.name}'s Team`})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Progress & Rollover Button */}
            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2 sm:pt-0">
              <button
                onClick={handleCopyLastSeason}
                disabled={isLocked || loading}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                } disabled:opacity-50 cursor-pointer`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Copy Keepers from Last Season</span>
              </button>

              <div className={`px-3 py-2 rounded-xl text-xs font-bold ${
                filledCount === 7 
                  ? (isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800')
                  : (isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-950/60 text-amber-300 border border-amber-800')
              }`}>
                {filledCount} / 7 Keepers
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className={`text-sm font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Loading keepers for {selectedGm}...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 7 Slot Cards Grid */}
            <div className="space-y-6">
              
              {/* Forwards Section (4 slots) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Forward Slots (4 Required)
                  </h3>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {['F1', 'F2', 'F3', 'F4'].filter(k => slots[k]).length} / 4 Assigned
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['F1', 'F2', 'F3', 'F4'].map((slotKey) => renderSlotCard(slotKey, 'F', 'Forward'))}
                </div>
              </div>

              {/* Defense Section (2 slots) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Defenseman Slots (2 Required)
                  </h3>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {['D1', 'D2'].filter(k => slots[k]).length} / 2 Assigned
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['D1', 'D2'].map((slotKey) => renderSlotCard(slotKey, 'D', 'Defenseman'))}
                </div>
              </div>

              {/* Goalie Section (1 slot) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    Goalie Slot (1 Required)
                  </h3>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {['G1'].filter(k => slots[k]).length} / 1 Assigned
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 max-w-sm">
                  {['G1'].map((slotKey) => renderSlotCard(slotKey, 'G', 'Goalie'))}
                </div>
              </div>

            </div>

            {/* Action Footer */}
            <div className={`p-6 rounded-3xl border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}>
              <div>
                <h4 className="font-bold text-base">Active Roster Synchronization</h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isLocked 
                    ? `Keepers locked for ${selectedSeason} (saved on ${submittedAt ? new Date(submittedAt).toLocaleString() : 'submission'}).`
                    : filledCount === 7 
                    ? 'All 7 slots assigned. Ready to lock in and write to active_roster_players.'
                    : `Drafting: ${filledCount} of 7 slots selected. You can save your draft or finish all 7 to lock.`
                  }
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {isLocked ? (
                  <button
                    onClick={handleUnlockKeepers}
                    disabled={saving}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>{saving ? 'Unlocking...' : 'Unlock Keepers (Edit)'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleSaveAndLock(false)}
                      disabled={saving || filledCount === 0}
                      className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      } disabled:opacity-50 cursor-pointer`}
                    >
                      <Save className="h-4 w-4" />
                      <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                    </button>

                    <button
                      onClick={() => handleSaveAndLock(true)}
                      disabled={saving || !isReadyToLock}
                      className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                        isReadyToLock
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer'
                          : 'bg-slate-750 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Lock className="h-4 w-4" />
                      <span>{saving ? 'Locking...' : 'Lock In Final Keepers 🔒'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Player Search Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}>
              {/* Modal Header */}
              <div className="p-6 border-b flex items-center justify-between border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black">Select Keeper for {activeSlotKey} ({activeSlotPosition === 'F' ? 'Forward' : activeSlotPosition === 'D' ? 'Defenseman' : 'Goalie'})</h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Search current NHL & league players by name or team</p>
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-slate-800 text-slate-300'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search player (e.g. Seth Jarvis, Connor McDavid)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className={`text-sm font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No players found matching "{searchQuery}" for position {activeSlotPosition}.</p>
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <div
                      key={`${player.nhl_id}-${player.player_name}`}
                      onClick={() => handleSelectPlayer(player)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isLight
                          ? 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50'
                          : 'border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          player.position === 'F' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          player.position === 'D' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                        }`}>
                          {player.position}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{player.player_name}</h4>
                          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{player.nhl_team} • NHL ID: {player.nhl_id || 'N/A'}</p>
                        </div>
                      </div>

                      <button className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm">
                        Select
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  function renderSlotCard(slotKey: string, pos: 'F' | 'D' | 'G', posLabel: string) {
    const player = slots[slotKey];

    return (
      <div
        key={slotKey}
        onClick={() => !player && handleOpenSearch(slotKey, pos)}
        className={`relative p-5 rounded-3xl border transition-all flex flex-col justify-between min-h-[150px] shadow-sm ${
          player
            ? (isLight ? 'bg-white border-slate-300 shadow-slate-100' : 'bg-slate-900 border-slate-700 shadow-black/30')
            : (isLight ? 'bg-slate-50/80 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-slate-50 cursor-pointer' : 'bg-slate-900/40 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-900/80 cursor-pointer')
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider ${
            slotKey.startsWith('F') ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
            slotKey.startsWith('D') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
            'bg-purple-500/10 text-purple-500 border border-purple-500/20'
          }`}>
            {slotKey} • {posLabel}
          </span>

          {player && !isLocked && (
            <button
              onClick={(e) => handleRemovePlayer(slotKey, e)}
              className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Remove Keeper"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {player ? (
          <div className="mt-4" onClick={() => !isLocked && handleOpenSearch(slotKey, pos)}>
            <div className="cursor-pointer group">
              <h4 className="font-extrabold text-base group-hover:text-indigo-500 transition-colors">{player.player_name}</h4>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{player.nhl_team}</p>
            </div>
            {!isLocked && (
              <button 
                onClick={() => handleOpenSearch(slotKey, pos)}
                className="mt-3 text-[11px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
              >
                <span>Change Player</span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center py-2 text-center">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Select Keeper</span>
          </div>
        )}
      </div>
    );
  }
}

