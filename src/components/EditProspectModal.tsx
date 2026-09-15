import React, { useState, useEffect } from 'react';
import { Position, Prospect } from '../types';
import { X, Edit3, ExternalLink } from 'lucide-react';

interface EditProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (prospectId: string, updatedData: Partial<Prospect>) => void;
  prospect: Prospect | null;
  gmName: string;
}

export const EditProspectModal: React.FC<EditProspectModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  prospect,
  gmName,
}) => {
  const [name, setName] = useState('');
  const [nhlId, setNhlId] = useState('');
  const [position, setPosition] = useState<Position>('F');
  const [nhlTeam, setNhlTeam] = useState('');
  const [nhlTeamAbbr, setNhlTeamAbbr] = useState('');
  const [draftYear, setDraftYear] = useState<number>(2023);
  const [draftRound, setDraftRound] = useState<number>(1);
  const [draftPick, setDraftPick] = useState<number>(1);
  const [currentSeasonGP, setCurrentSeasonGP] = useState<number>(0);
  const [priorCareerGP, setPriorCareerGP] = useState<number>(0);
  const [seasons25PlusGP, setSeasons25PlusGP] = useState<number>(0);
  const [isProtected, setIsProtected] = useState<boolean>(false);
  const [isTrashed, setIsTrashed] = useState<boolean>(false);
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (prospect) {
      setName(prospect.name || '');
      const rawNhlId = prospect.nhl_id ?? prospect.nhlId ?? prospect.nhlPlayerId ?? '';
      setNhlId(rawNhlId ? String(rawNhlId) : '');
      setPosition(prospect.position || 'F');
      setNhlTeam(prospect.nhlTeam || '');
      setNhlTeamAbbr(prospect.nhlTeamAbbr || '');
      setDraftYear(prospect.draftYear || 2023);
      setDraftRound(prospect.draftRound || 1);
      setDraftPick(prospect.draftPick || 1);
      setCurrentSeasonGP(prospect.currentSeasonGP || 0);
      setPriorCareerGP(prospect.priorCareerGP || 0);
      setSeasons25PlusGP(prospect.seasons25PlusGP || 0);
      setIsProtected(prospect.isProtected || false);
      setIsTrashed(prospect.status === 'trashed' || prospect.status === 'inactive');
      setStatusNotes(prospect.statusNotes || '');
    }
  }, [prospect]);

  if (!isOpen || !prospect) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onEdit(prospect.id, {
      name: name.trim(),
      position,
      nhlTeam: nhlTeam.trim() || 'Unassigned',
      nhlTeamAbbr: (nhlTeamAbbr.trim() || nhlTeam.substring(0, 3)).toUpperCase() || 'NHL',
      draftYear: Number(draftYear) || 2024,
      draftRound: Number(draftRound) || 1,
      draftPick: Number(draftPick) || 1,
      currentSeasonGP: Number(currentSeasonGP) || 0,
      priorCareerGP: Number(priorCareerGP) || 0,
      seasons25PlusGP: Number(seasons25PlusGP) || 0,
      isProtected,
      status: isTrashed ? 'trashed' : 'active',
      statusNotes: statusNotes.trim() || undefined,
      nhl_id: nhlId.trim() || undefined,
      nhlId: nhlId.trim() || undefined,
      nhlPlayerId: nhlId.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Edit Prospect Details
              </h2>
              <p className="text-xs text-slate-400">
                Updating record for GM {gmName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Player Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-300">
                  NHL Player ID <span className="text-cyan-400 font-mono text-[10px] font-normal">(DB: nhl_id)</span>
                </label>
                {nhlId ? (
                  <a
                    href={`https://api-web.nhle.com/v1/player/${nhlId}/landing`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-0.5"
                    title="Inspect live NHL API data in new tab"
                  >
                    <span>Test API</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>
              <input
                type="text"
                value={nhlId}
                placeholder="e.g. 8481692"
                onChange={(e) => setNhlId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Direct Supabase DB column <code className="font-mono text-cyan-300">nhl_id</code> for live NHL stats sync.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Position *</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="F">Forward (F)</option>
                <option value="D">Defenseman (D)</option>
                <option value="G">Goalie (G)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">NHL Team</label>
              <input
                type="text"
                value={nhlTeam}
                onChange={(e) => setNhlTeam(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Draft Year</label>
              <input
                type="number"
                value={draftYear}
                onChange={(e) => setDraftYear(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Draft Round</label>
              <input
                type="number"
                min="1"
                max="7"
                value={draftRound}
                onChange={(e) => setDraftRound(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Overall Pick</label>
              <input
                type="number"
                min="1"
                value={draftPick}
                onChange={(e) => setDraftPick(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Current Season GP
              </label>
              <input
                type="number"
                min="0"
                value={currentSeasonGP}
                onChange={(e) => setCurrentSeasonGP(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Prior Career NHL GP
              </label>
              <input
                type="number"
                min="0"
                value={priorCareerGP}
                onChange={(e) => setPriorCareerGP(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 4 Seasons of 25+ GP Milestone Tracker */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Seasons with 25+ NHL GP
              </label>
              <span className="font-mono text-xs font-bold text-cyan-400">
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
                    className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? count >= 4
                          ? 'border-red-500 bg-red-500/20 text-red-300 ring-1 ring-red-500/50'
                          : count === 3
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                          : 'border-cyan-500 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span>{count}</span>
                    <span className="text-[9px] font-sans font-normal opacity-70">
                      {count === 4 ? 'Promote' : count === 0 ? 'None' : `${count} yr`}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Tracks seasons with 25+ GP (0 to 4). When 4 seasons are reached before 200 total GP, the player status changes to prompt for promotion.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-protected-check"
              checked={isProtected}
              onChange={(e) => setIsProtected(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="edit-protected-check" className="font-semibold text-slate-300 cursor-pointer">
              Protect prospect (Protected? YES)
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-trashed-check"
              checked={isTrashed}
              onChange={(e) => setIsTrashed(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="edit-trashed-check" className="font-semibold text-rose-300/90 cursor-pointer">
              Mark as Trashed (stop tracking games played; keeps DB record)
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Scouting Notes</label>
            <input
              type="text"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 transition-colors shadow-md shadow-amber-500/20"
            >
              <Edit3 className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
