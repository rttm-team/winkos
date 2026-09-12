import React from 'react';
import { X, Shield, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Winko's Hockey Pool Prospect Constitution
              </h2>
              <p className="text-xs text-slate-400">
                Official rules for prospect eligibility, mandatory promotions & roster protection
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

        {/* Content */}
        <div className="mt-5 space-y-5 text-sm">
          {/* Skater Rules */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-base mb-2">
              <span>🏒 Skater Promotion Rules (Forwards & Defensemen)</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              A skater prospect forfeits prospect status and triggers mandatory active roster promotion upon hitting <strong>EITHER</strong> milestone:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pl-2">
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>
                  <strong>Single-Season Threshold:</strong> 40 regular season NHL games in a single campaign.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>
                  <strong>Cumulative Career Threshold:</strong> 65 total career regular season NHL games played.
                </span>
              </li>
            </ul>
          </div>

          {/* Goalie Rules */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-base mb-2">
              <span>🥅 Goalie Promotion Rules</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Goalies develop at a different pace. A netminder triggers mandatory active roster promotion upon hitting <strong>EITHER</strong> milestone:
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pl-2">
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  <strong>Single-Season Threshold:</strong> 20 regular season NHL appearances/starts.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  <strong>Cumulative Career Threshold:</strong> 30 total career regular season NHL games played.
                </span>
              </li>
            </ul>
          </div>

          {/* Watchlist Banner Policy */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-base mb-2">
              <AlertTriangle className="h-4 w-4 stroke-[2.5]" />
              <span>5-Game Watchlist Alert Policy</span>
            </div>
            <p className="text-xs text-slate-300">
              Whenever a prospect is within <strong>5 games or fewer</strong> of either threshold (e.g., 35-39 games for skaters, 15-19 games for goalies), they enter the high-priority Promotion Watchlist banner. GMs must prepare roster slots or risk penalty.
            </p>
          </div>

          {/* Roster Protection Rules */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-base mb-2">
              <Shield className="h-4 w-4" />
              <span>Roster Protection Rules</span>
            </div>
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                GMs can designate prospects or active players with <strong>Protected Status</strong> subject to league protection ceilings:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li><strong>Skaters (F/D):</strong> Maximum of <strong>200 NHL games</strong> or <strong>4 seasons</strong> before losing protection eligibility.</li>
                <li><strong>Goalies (G):</strong> Maximum of <strong>140 NHL games</strong> or <strong>4 seasons</strong> before losing protection eligibility.</li>
                <li>Players exceeding these limits are ineligible for protection tags and must remain on the open active roster.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 transition-colors shadow-md shadow-cyan-500/20"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
