import React, { useState, useEffect } from 'react';
import { Position, Prospect } from '../types';
import { X, Edit3 } from 'lucide-react';

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
  const [position, setPosition] = useState<Position>('F');
  const [nhlTeam, setNhlTeam] = useState('');
  const [nhlTeamAbbr, setNhlTeamAbbr] = useState('');
  const [draftYear, setDraftYear] = useState<number>(2023);
  const [draftRound, setDraftRound] = useState<number>(1);
  const [draftPick, setDraftPick] = useState<number>(1);
  const [currentSeasonGP, setCurrentSeasonGP] = useState<number>(0);
  const [priorCareerGP, setPriorCareerGP] = useState<number>(0);
  const [isProtected, setIsProtected] = useState<boolean>(false);
  const [statusNotes, setStatusNotes] = useState('');

  useEffect(() => {
    if (prospect) {
      setName(prospect.name || '');
      setPosition(prospect.position || 'F');
      setNhlTeam(prospect.nhlTeam || '');
      setNhlTeamAbbr(prospect.nhlTeamAbbr || '');
      setDraftYear(prospect.draftYear || 2023);
      setDraftRound(prospect.draftRound || 1);
      setDraftPick(prospect.draftPick || 1);
      setCurrentSeasonGP(prospect.currentSeasonGP || 0);
      setPriorCareerGP(prospect.priorCareerGP || 0);
      setIsProtected(prospect.isProtected || false);
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
      isProtected,
      statusNotes: statusNotes.trim() || undefined,
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-protected-check"
              checked={isProtected}
              onChange={(e) => setIsProtected(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="edit-protected-check" className="font-semibold text-slate-300 cursor-pointer">
              Protect prospect (Protected? YES)
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
