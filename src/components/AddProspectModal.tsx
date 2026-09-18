import React, { useState, useEffect } from 'react';
import { Position, Prospect, GeneralManager } from '../types';
import { X, UserPlus, ExternalLink, UserCheck } from 'lucide-react';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (prospect: Partial<Prospect>) => void;
  gmName: string;
  availableGms?: GeneralManager[];
  theme?: 'light' | 'dark';
}

const DEFAULT_GM_LIST: { id: string; name: string; teamName?: string }[] = [
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

export const AddProspectModal: React.FC<AddProspectModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  gmName,
  availableGms,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const [selectedGm, setSelectedGm] = useState(gmName || 'Adam');
  const [name, setName] = useState('');
  const [nhlId, setNhlId] = useState('');
  const [noNhlId, setNoNhlId] = useState<boolean>(false);
  const [position, setPosition] = useState<Position>('F');
  const [nhlTeam, setNhlTeam] = useState('');
  const [nhlTeamAbbr, setNhlTeamAbbr] = useState('');
  const [draftYear, setDraftYear] = useState<number>(() => new Date().getFullYear());
  const [draftRound, setDraftRound] = useState<number>(1);
  const [draftPick, setDraftPick] = useState<number>(1);
  const [currentSeasonGP, setCurrentSeasonGP] = useState<number>(0);
  const [priorCareerGP, setPriorCareerGP] = useState<number>(0);
  const [seasons25PlusGP, setSeasons25PlusGP] = useState<number>(0);
  const [isProtected, setIsProtected] = useState<boolean>(false);
  const [isTrashed, setIsTrashed] = useState<boolean>(false);
  const [statusNotes, setStatusNotes] = useState('');

  const gmList = availableGms && availableGms.length > 0 ? availableGms : DEFAULT_GM_LIST;

  useEffect(() => {
    if (isOpen) {
      setSelectedGm(gmName || 'Adam');
    }
  }, [isOpen, gmName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalNhlId = !noNhlId && nhlId.trim() ? nhlId.trim() : null;
    const currentGP = Number(currentSeasonGP) || 0;
    const priorGP = Number(priorCareerGP) || 0;
    const totalGP = currentGP + priorGP;

    onAdd({
      name: name.trim(),
      position,
      nhlTeam: nhlTeam.trim() || 'Unassigned',
      nhlTeamAbbr: (nhlTeamAbbr.trim() || (nhlTeam.trim() ? nhlTeam.trim().substring(0, 3) : 'NHL')).toUpperCase(),
      draftYear: Number(draftYear) || new Date().getFullYear(),
      draftRound: Number(draftRound) || 1,
      draftPick: Number(draftPick) || 1,
      currentSeasonGP: currentGP,
      priorCareerGP: priorGP,
      totalGames: totalGP,
      total_games: totalGP,
      seasons25PlusGP: Number(seasons25PlusGP) || 0,
      qualifying_seasons: Number(seasons25PlusGP) || 0,
      isProtected,
      status: isTrashed ? 'trashed' : 'active',
      statusNotes: statusNotes.trim() || undefined,
      nhl_id: finalNhlId ?? undefined,
      nhlId: finalNhlId ?? undefined,
      nhlPlayerId: finalNhlId ?? undefined,
      hasNoNhlId: Boolean(noNhlId || !finalNhlId),
      gm_name: selectedGm,
      gmName: selectedGm,
    });

    // Reset fields on successful submit
    setName('');
    setNhlId('');
    setNoNhlId(false);
    setPosition('F');
    setNhlTeam('');
    setNhlTeamAbbr('');
    setDraftYear(new Date().getFullYear());
    setDraftRound(1);
    setDraftPick(1);
    setCurrentSeasonGP(0);
    setPriorCareerGP(0);
    setSeasons25PlusGP(0);
    setIsProtected(false);
    setIsTrashed(false);
    setStatusNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto transition-colors ${
          isLight
            ? 'border-slate-200 bg-white text-slate-800'
            : 'border-slate-700 bg-slate-900 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between border-b pb-4 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                isLight
                  ? 'border-cyan-200 bg-cyan-50 text-cyan-600'
                  : 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
              }`}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2
                className={`text-lg font-black tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Add Prospect to Roster
              </h2>
              <p
                className={`text-xs ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Assigning to GM{' '}
                <span
                  className={`font-semibold ${
                    isLight ? 'text-cyan-700' : 'text-cyan-300'
                  }`}
                >
                  {selectedGm || gmName}
                </span>
                's minor league pool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${
              isLight
                ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* GM Selection Dropdown */}
          <div
            className={`rounded-xl border p-3.5 space-y-1.5 ${
              isLight
                ? 'border-amber-200/90 bg-amber-50/70'
                : 'border-amber-800/40 bg-amber-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <label
                className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
                  isLight ? 'text-amber-900' : 'text-amber-300/90'
                }`}
              >
                <UserCheck
                  className={`h-4 w-4 ${
                    isLight ? 'text-amber-600' : 'text-amber-400/80'
                  }`}
                />
                <span>Assigned General Manager (GM)</span>
              </label>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                  isLight
                    ? 'border-amber-200 bg-amber-100/70 text-amber-800'
                    : 'border-amber-800/60 bg-amber-950/50 text-amber-400/90'
                }`}
              >
                DB: gm_name
              </span>
            </div>
            <select
              value={selectedGm}
              onChange={(e) => setSelectedGm(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 cursor-pointer transition-colors ${
                isLight
                  ? 'border-amber-300 bg-white text-slate-800 focus:border-amber-500 focus:ring-amber-500'
                  : 'border-amber-800/50 bg-slate-800 text-white focus:border-amber-700 focus:ring-amber-700'
              }`}
            >
              {gmList.map((gm) => (
                <option key={gm.id || gm.name} value={gm.name}>
                  {gm.name} {gm.teamName ? `— ${gm.teamName}` : ''}
                </option>
              ))}
            </select>
            <p
              className={`text-[11px] ${
                isLight ? 'text-amber-800/80' : 'text-amber-200/60'
              }`}
            >
              Select the GM whose prospect pool this player will be added to.
            </p>
          </div>

          {/* Player Name & NHL Player ID (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Player Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Macklin Celebrini"
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white'
                    : 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="add-prospect-nhl-id"
                  className={`block font-semibold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  NHL Player ID{' '}
                  <span
                    className={`font-mono text-[10px] font-normal ${
                      isLight ? 'text-cyan-700' : 'text-cyan-400'
                    }`}
                  >
                    (DB: nhl_id)
                  </span>
                </label>
                {nhlId && !noNhlId ? (
                  <a
                    href={`https://api-web.nhle.com/v1/player/${nhlId}/landing`}
                    target="_blank"
                    rel="noreferrer"
                    className={`text-[10px] underline inline-flex items-center gap-0.5 ${
                      isLight
                        ? 'text-cyan-700 hover:text-cyan-800'
                        : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                    title="Inspect live NHL API data in new tab"
                  >
                    <span>Test API</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>

              <input
                id="add-prospect-nhl-id"
                type="text"
                value={noNhlId ? '' : nhlId}
                disabled={noNhlId}
                placeholder={
                  noNhlId
                    ? 'No NHL ID (Unlisted/Draft Prospect)'
                    : 'e.g. 8484144'
                }
                onChange={(e) => {
                  setNhlId(e.target.value);
                  if (e.target.value.trim()) {
                    setNoNhlId(false);
                  }
                }}
                className={`w-full rounded-xl border px-3 py-2 text-sm font-mono transition-colors ${
                  noNhlId
                    ? isLight
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed italic placeholder:text-slate-400'
                      : 'border-slate-800 bg-slate-950/70 text-slate-500 cursor-not-allowed italic placeholder:text-slate-600'
                    : isLight
                    ? 'border-slate-300 bg-slate-50 text-cyan-800 focus:bg-white focus:border-cyan-600 focus:outline-none placeholder:text-slate-400'
                    : 'border-slate-700 bg-slate-800 text-cyan-300 focus:border-cyan-500 focus:outline-none placeholder:text-slate-600'
                }`}
              />

              {/* "No NHL ID" Checkbox */}
              <div
                className={`mt-2 flex items-center justify-between rounded-lg p-2 border transition-colors ${
                  isLight
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-700/60 bg-slate-800/50'
                }`}
              >
                <label
                  htmlFor="add-checkbox-no-nhl-id"
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    id="add-checkbox-no-nhl-id"
                    type="checkbox"
                    checked={noNhlId}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNoNhlId(checked);
                      if (checked) {
                        setNhlId('');
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-400 bg-slate-100 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
                  />
                  <span
                    className={`text-xs font-semibold ${
                      noNhlId
                        ? isLight
                          ? 'text-amber-800'
                          : 'text-amber-300'
                        : isLight
                        ? 'text-slate-700'
                        : 'text-slate-300'
                    }`}
                  >
                    No NHL ID
                  </span>
                </label>
                {noNhlId ? (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                      isLight
                        ? 'border-amber-200 bg-amber-100 text-amber-800'
                        : 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                    }`}
                  >
                    Keeps DB nhl_id empty (NULL)
                  </span>
                ) : (
                  <span
                    className={`text-[10px] ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Check if unlisted / no NHL API ID
                  </span>
                )}
              </div>

              <p
                className={`mt-1 text-[10px] ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Direct Supabase DB column{' '}
                <code
                  className={`font-mono ${
                    isLight ? 'text-cyan-700' : 'text-cyan-300'
                  }`}
                >
                  nhl_id
                </code>{' '}
                for live NHL stats sync.
              </p>
            </div>
          </div>

          {/* Position & NHL Team (2 cols) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Position *
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-500'
                }`}
              >
                <option value="F">Forward (F)</option>
                <option value="D">Defenseman (D)</option>
                <option value="G">Goalie (G)</option>
              </select>
            </div>

            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                NHL Team
              </label>
              <input
                type="text"
                placeholder="e.g. San Jose Sharks"
                value={nhlTeam}
                onChange={(e) => setNhlTeam(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500'
                }`}
              />
            </div>
          </div>

          {/* Draft Year, Draft Round, Draft Pick (3 cols) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Draft Year
              </label>
              <input
                type="number"
                value={draftYear}
                onChange={(e) => setDraftYear(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-500'
                }`}
              />
            </div>
            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Draft Round
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={draftRound}
                onChange={(e) => setDraftRound(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-500'
                }`}
              />
            </div>
            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Overall Pick
              </label>
              <input
                type="number"
                min="1"
                max="224"
                value={draftPick}
                onChange={(e) => setDraftPick(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-500'
                }`}
              />
            </div>
          </div>

          {/* Current Season GP & Prior Career GP (2 cols) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Current Season GP
              </label>
              <input
                type="number"
                min="0"
                value={currentSeasonGP}
                onChange={(e) => setCurrentSeasonGP(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-500'
                }`}
              />
            </div>

            <div>
              <label
                className={`block font-semibold mb-1 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Prior Career NHL GP
              </label>
              <input
                type="number"
                min="0"
                value={priorCareerGP}
                onChange={(e) => setPriorCareerGP(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-cyan-600'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-500'
                }`}
              />
            </div>
          </div>

          {/* 4 Seasons of 25+ GP Milestone Tracker */}
          <div
            className={`rounded-xl border p-3.5 space-y-2 ${
              isLight
                ? 'border-slate-200 bg-slate-50/70'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <label
                className={`block text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                Seasons with 25+ NHL GP
              </label>
              <span
                className={`font-mono text-xs font-bold ${
                  isLight ? 'text-cyan-700' : 'text-cyan-400'
                }`}
              >
                {seasons25PlusGP} / 4 Seasons
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((count) => {
                const isSelected = seasons25PlusGP === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSeasons25PlusGP(count)}
                    className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? count >= 4
                          ? isLight
                            ? 'border-rose-300 bg-rose-50 text-rose-700 ring-1 ring-rose-400'
                            : 'border-rose-800/60 bg-rose-950/40 text-rose-300 ring-1 ring-rose-800/50'
                          : count === 3
                          ? isLight
                            ? 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-400'
                            : 'border-amber-800/60 bg-amber-950/40 text-amber-300 ring-1 ring-amber-800/50'
                          : isLight
                          ? 'border-cyan-300 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-400'
                          : 'border-slate-600 bg-slate-800 text-slate-200 ring-1 ring-slate-600'
                        : isLight
                        ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span>{count}</span>
                    <span className="text-[9px] font-sans font-normal opacity-75">
                      {count === 4 ? 'Promote' : count === 0 ? 'None' : `${count} yr`}
                    </span>
                  </button>
                );
              })}
            </div>

            <p
              className={`text-[11px] leading-tight ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Tracks seasons with 25+ GP (0 to 4). When 4 seasons are reached before 200 total GP, the player status changes to prompt for promotion.
            </p>
          </div>

          {/* Checkboxes: Protect & Trashed */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="add-protected-check"
              checked={isProtected}
              onChange={(e) => setIsProtected(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
            />
            <label
              htmlFor="add-protected-check"
              className={`font-semibold cursor-pointer select-none ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              Protect prospect (Protected? YES)
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="add-trashed-check"
              checked={isTrashed}
              onChange={(e) => setIsTrashed(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
            />
            <label
              htmlFor="add-trashed-check"
              className={`font-semibold cursor-pointer select-none ${
                isLight ? 'text-rose-700' : 'text-rose-300/90'
              }`}
            >
              Mark as Trashed (stop tracking games played; keeps DB record)
            </label>
          </div>

          {/* Scouting Notes */}
          <div>
            <label
              className={`block font-semibold mb-1 ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              Scouting Notes
            </label>
            <input
              type="text"
              placeholder="e.g. 1st overall draft selection, elite playmaking forward"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-colors ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-cyan-600'
                  : 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* Action buttons */}
          <div
            className={`mt-6 flex justify-end gap-2 border-t pt-4 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                isLight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
            >
              <UserPlus className="h-5 w-5" />
              <span>Add Prospect to Roster</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
