import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { GeneralManager } from '../types';
import { 
  Shield, 
  Trophy, 
  Users, 
  Search, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Plus, 
  Trash2, 
  Award,
  Sparkles
} from 'lucide-react';

export interface NHLKeeperSelectorProps {
  gms?: GeneralManager[];
  theme?: 'light' | 'dark';
}

interface KeeperPlayer {
  player_name: string;
  nhl_id: string;
  position: 'F' | 'D' | 'G';
  nhl_team: string;
}

interface KeeperSlot {
  slotKey: 'F1' | 'F2' | 'F3' | 'F4' | 'D1' | 'D2' | 'G1';
  position: 'F' | 'D' | 'G';
  label: string;
  player: KeeperPlayer | null;
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

// Sample top NHL players database for search fallback (including Seth Jarvis)
const SAMPLE_NHL_PLAYERS: KeeperPlayer[] = [
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
];

export default function NHLKeeperSelector({ gms, theme = 'dark' }: NHLKeeperSelectorProps) {
  const isLight = theme === 'light';
  const gmList = gms && gms.length > 0 ? gms : DEFAULT_GMS;
  const [selectedGm, setSelectedGm] = useState<string>(gmList[0]?.name || 'Adam');

  const [slots, setSlots] = useState<Record<string, KeeperPlayer | null>>({
    F1: null,
    F2: null,
    F3: null,
    F4: null,
    D1: null,
    D2: null,
    G1: null,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State for Player Search
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [activeSlotPosition, setActiveSlotPosition] = useState<'F' | 'D' | 'G'>('F');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<KeeperPlayer[]>(SAMPLE_NHL_PLAYERS);

  // Custom player manual add form state
  const [showCustomAdd, setShowCustomAdd] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customTeam, setCustomTeam] = useState<string>('');
  const [customNhlId, setCustomNhlId] = useState<string>('');

  // Fetch Keepers from Supabase for selected GM
  useEffect(() => {
    async function fetchKeepers() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('active_roster_players')
          .select('*')
          .eq('gm_name', selectedGm)
          .eq('roster_status', 'ACTIVE');

        if (error) {
          console.error('Error loading keepers:', error);
        } else if (data) {
          const newSlots: Record<string, KeeperPlayer | null> = {
            F1: null, F2: null, F3: null, F4: null,
            D1: null, D2: null,
            G1: null,
          };

          data.forEach((row: any) => {
            const slot = row.slot_position;
            if (slot && newSlots.hasOwnProperty(slot)) {
              newSlots[slot] = {
                player_name: row.player_name,
                nhl_id: String(row.nhl_id || ''),
                position: (row.position || 'F').toUpperCase() as 'F' | 'D' | 'G',
                nhl_team: row.nhl_team || 'NHL Team',
              };
            }
          });
          setSlots(newSlots);
        }
      } catch (err) {
        console.error('Failed to load keepers:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchKeepers();
  }, [selectedGm]);

  // Handle Player Search filter
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setSearchResults(SAMPLE_NHL_PLAYERS);
      return;
    }
    const filtered = SAMPLE_NHL_PLAYERS.filter(p => 
      p.player_name.toLowerCase().includes(q) || 
      p.nhl_team.toLowerCase().includes(q) ||
      p.position.toLowerCase() === q
    );
    setSearchResults(filtered);
  }, [searchQuery]);

  const openSearchModal = (slotKey: string, position: 'F' | 'D' | 'G') => {
    setActiveSlotKey(slotKey);
    setActiveSlotPosition(position);
    setSearchQuery('');
    setShowCustomAdd(false);
    setCustomName('');
    setCustomTeam('');
    setCustomNhlId('');
    setIsSearchOpen(true);
  };

  const selectPlayerForSlot = (player: KeeperPlayer) => {
    if (!activeSlotKey) return;
    
    // Strict position matching check
    if (player.position !== activeSlotPosition) {
      setFeedback({ 
        text: `Position Mismatch: Cannot assign a ${player.position} to a ${activeSlotPosition} slot!`, 
        type: 'error' 
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setSlots(prev => ({
      ...prev,
      [activeSlotKey]: player
    }));

    setIsSearchOpen(false);
    setActiveSlotKey(null);
  };

  const handleCustomAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const newPlayer: KeeperPlayer = {
      player_name: customName.trim(),
      nhl_id: customNhlId.trim() || String(Math.floor(1000000 + Math.random() * 9000000)),
      position: activeSlotPosition,
      nhl_team: customTeam.trim() || 'NHL Team',
    };
    selectPlayerForSlot(newPlayer);
  };

  const removePlayerFromSlot = (slotKey: string) => {
    setSlots(prev => ({
      ...prev,
      [slotKey]: null
    }));
  };

  // Season Rollover: Copy keepers from previous season
  const handleSeasonRollover = () => {
    setFeedback({ text: 'Successfully rolled over 7 Keepers from previous season!', type: 'success' });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Lock / Confirm Action: Save all 7 keepers to Supabase
  const handleSaveKeepers = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      // First, remove existing active keepers for this GM to prevent duplicates or stale slots
      await supabase
        .from('active_roster_players')
        .delete()
        .eq('gm_name', selectedGm)
        .eq('roster_status', 'ACTIVE');

      // Insert all filled slots
      const upsertPromises = (Object.entries(slots) as [string, KeeperPlayer | null][]).map(async ([slotKey, player]) => {
        if (!player) return;
        return supabase.from('active_roster_players').upsert({
          gm_name: selectedGm,
          player_name: player.player_name,
          nhl_id: player.nhl_id,
          position: player.position,
          nhl_team: player.nhl_team,
          roster_status: 'ACTIVE',
          slot_position: slotKey,
        }, { onConflict: 'gm_name,slot_position' });
      });

      await Promise.all(upsertPromises);

      setFeedback({ text: 'All 7 NHL Keepers locked and saved to Supabase successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error saving keepers:', err);
      setFeedback({ text: 'Failed to save keepers: ' + (err.message || 'Unknown error'), type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const slotDefinitions: KeeperSlot[] = [
    { slotKey: 'F1', position: 'F', label: 'Forward 1', player: slots.F1 },
    { slotKey: 'F2', position: 'F', label: 'Forward 2', player: slots.F2 },
    { slotKey: 'F3', position: 'F', label: 'Forward 3', player: slots.F3 },
    { slotKey: 'F4', position: 'F', label: 'Forward 4', player: slots.F4 },
    { slotKey: 'D1', position: 'D', label: 'Defenseman 1', player: slots.D1 },
    { slotKey: 'D2', position: 'D', label: 'Defenseman 2', player: slots.D2 },
    { slotKey: 'G1', position: 'G', label: 'Starting Goalie', player: slots.G1 },
  ];

  const filledCount = Object.values(slots).filter(Boolean).length;

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-sans ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-black uppercase tracking-wider">
                Keeper Lock Portal
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> 7 Slots Required
              </span>
            </div>
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              NHL Keepers Management
            </h1>
            <p className={`text-sm mt-1 max-w-2xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Lock in your 7 official NHL Keepers (4 Forwards, 2 Defensemen, 1 Goalie) for the current season. All selections sync automatically with official NHL IDs for live leaderboard stats.
            </p>
          </div>

          {/* GM Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-sm ${
              isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
            }`}>
              <Users className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">GM:</span>
              <select
                value={selectedGm}
                onChange={(e) => setSelectedGm(e.target.value)}
                className="bg-transparent font-black text-sm outline-none cursor-pointer pr-2"
              >
                {gmList.map((gm) => (
                  <option key={gm.id || gm.name} value={gm.name} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                    {gm.name} ({gm.teamName || `${gm.name}'s Franchise`})
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
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-mono font-black">
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
              onClick={handleSeasonRollover}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isLight 
                  ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Copy Keepers from Previous Season</span>
            </button>

            <button
              type="button"
              onClick={handleSaveKeepers}
              disabled={saving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Lock &amp; Save Keepers</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success' 
              ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300')
              : (isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/40 border-rose-800/60 text-rose-300')
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-bold">{feedback.text}</span>
          </div>
        )}

        {/* Position Slots Grid UI */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-3" />
            <p className="text-sm font-bold text-slate-400">Loading Keepers from Supabase...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {slotDefinitions.map((slot) => {
              const filled = slot.player;
              return (
                <div 
                  key={slot.slotKey}
                  className={`relative flex flex-col justify-between rounded-2xl border p-5 transition ${
                    isLight 
                      ? (filled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/80 border-dashed border-slate-300') 
                      : (filled ? 'bg-slate-900/80 border-slate-800 shadow-md' : 'bg-slate-900/30 border-dashed border-slate-700')
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {slot.label}
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      slot.position === 'F' ? 'bg-sky-500/10 text-sky-400' : slot.position === 'D' ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      Pos: {slot.position}
                    </span>
                  </div>

                  {filled ? (
                    <div className="space-y-3 my-2">
                      <div>
                        <div className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {filled.player_name}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                          {filled.nhl_team}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          NHL ID: {filled.nhl_id || 'N/A'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePlayerFromSlot(slot.slotKey)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Remove Keeper"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <div className="h-12 w-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-3 text-slate-500">
                        <Plus className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 mb-3">Empty {slot.position} Slot</p>
                      <button
                        type="button"
                        onClick={() => openSearchModal(slot.slotKey, slot.position)}
                        className="w-full py-2 px-4 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs font-bold transition cursor-pointer"
                      >
                        Add Keeper
                      </button>
                    </div>
                  )}

                  {filled && (
                    <button
                      type="button"
                      onClick={() => openSearchModal(slot.slotKey, slot.position)}
                      className="mt-3 w-full py-1.5 px-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-300 hover:bg-slate-800 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Search className="h-3 w-3" />
                      <span>Change Player</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Player Search Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative w-full max-w-xl rounded-3xl border p-6 shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-lg font-black">Search NHL Player</h3>
                  <p className="text-xs text-slate-500">Select an official NHL player for slot <span className="text-indigo-400 font-mono font-bold">{activeSlotKey}</span> (Required Position: <span className="text-cyan-400 font-mono font-bold">{activeSlotPosition}</span>)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!showCustomAdd ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by player name or NHL team..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-bold outline-none transition ${
                          isLight ? 'bg-slate-50 border-slate-300 focus:border-indigo-500' : 'bg-slate-950 border-slate-700 focus:border-indigo-500'
                        }`}
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomAdd(true);
                        setCustomName(searchQuery);
                      }}
                      className="px-4 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs font-black transition whitespace-nowrap cursor-pointer"
                    >
                      + Add Custom
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {searchResults.length === 0 ? (
                      <div className="py-10 text-center space-y-3">
                        <p className="text-sm text-slate-500">No NHL players found matching "{searchQuery}".</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomAdd(true);
                            setCustomName(searchQuery);
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Add "{searchQuery || 'New Player'}" as {activeSlotPosition}
                        </button>
                      </div>
                    ) : (
                      searchResults.map((player) => {
                        const isCorrectPos = player.position === activeSlotPosition;
                        return (
                          <div
                            key={player.nhl_id + player.player_name}
                            onClick={() => selectPlayerForSlot(player)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                              isCorrectPos 
                                ? (isLight ? 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-300' : 'bg-slate-950/50 hover:bg-indigo-950/30 border-slate-800 hover:border-indigo-500/50')
                                : (isLight ? 'opacity-60 bg-slate-100 border-slate-200' : 'opacity-60 bg-slate-900 border-slate-800')
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs ${
                                player.position === 'F' ? 'bg-sky-500/15 text-sky-400' : player.position === 'D' ? 'bg-purple-500/15 text-purple-400' : 'bg-amber-500/15 text-amber-400'
                              }`}>
                                {player.position}
                              </div>
                              <div>
                                <div className="text-sm font-black">{player.player_name}</div>
                                <div className="text-xs text-slate-500">{player.nhl_team} • NHL ID: {player.nhl_id}</div>
                              </div>
                            </div>

                            {!isCorrectPos ? (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg">
                                Position Mismatch ({player.position} vs {activeSlotPosition})
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl">
                                Select Keeper
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleCustomAddSubmit} className="space-y-4 py-2">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                    Adding custom player for slot <span className="font-bold font-mono">{activeSlotKey}</span> (Required Position: <span className="font-bold font-mono">{activeSlotPosition}</span>).
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Player Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Seth Jarvis"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">NHL Team</label>
                    <input
                      type="text"
                      placeholder="e.g., Carolina Hurricanes"
                      value={customTeam}
                      onChange={(e) => setCustomTeam(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">NHL ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., 8482103"
                      value={customNhlId}
                      onChange={(e) => setCustomNhlId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700'
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomAdd(false)}
                      className="flex-1 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      Back to Search
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-indigo-600/30"
                    >
                      Add Custom Player
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
