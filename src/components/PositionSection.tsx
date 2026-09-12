import React from 'react';
import { Prospect, PositionGroup, evaluateProspect } from '../types';
import { ProspectCard } from './ProspectCard';
import { Shield, Target, Flame, AlertCircle } from 'lucide-react';

interface PositionSectionProps {
  title: PositionGroup;
  prospects: Prospect[];
  onUpdateGP: (prospectId: string, delta: number) => void;
  onToggleProtection: (prospectId: string) => void;
  onTogglePromotion?: (prospectId: string) => void;
  onSyncProspect?: (prospectId: string) => void;
}

export const PositionSection: React.FC<PositionSectionProps> = ({
  title,
  prospects,
  onUpdateGP,
  onToggleProtection,
  onTogglePromotion,
  onSyncProspect,
}) => {
  if (prospects.length === 0) {
    return null;
  }

  // Calculate alerts in this position group
  const mandatoryCount = prospects.filter((p) => evaluateProspect(p).isMandatoryPromotion).length;
  const watchCount = prospects.filter((p) => evaluateProspect(p).isWatchlist).length;

  const getPositionIcon = () => {
    switch (title) {
      case 'Forwards':
        return <Target className="h-4 w-4 text-blue-400" />;
      case 'Defensemen':
        return <Shield className="h-4 w-4 text-indigo-400" />;
      case 'Goalies':
        return <Flame className="h-4 w-4 text-emerald-400" />;
    }
  };

  const getRulesHint = () => {
    switch (title) {
      case 'Forwards':
      case 'Defensemen':
        return 'Skaters: 40 Single-Season GP or 65 Cumulative GP';
      case 'Goalies':
        return 'Goalies: 20 Single-Season GP or 30 Cumulative GP';
    }
  };

  return (
    <section className="mb-8" id={`section-${title.toLowerCase()}`}>
      {/* Section Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
            {getPositionIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-100">
                {title}
              </h2>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300 font-mono border border-slate-700">
                {prospects.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{getRulesHint()}</p>
          </div>
        </div>

        {/* Section alerts pill */}
        <div className="flex items-center gap-1.5 text-xs">
          {mandatoryCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-950/70 border border-red-800/60 px-2 py-0.5 font-bold text-red-300">
              <AlertCircle className="h-3 w-3 text-red-400" />
              <span>{mandatoryCount} Mandatory</span>
            </span>
          )}
          {watchCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 font-bold text-amber-300">
              <span>{watchCount} On Watch</span>
            </span>
          )}
        </div>
      </div>

      {/* Roster Cards Grid (Mobile First: 1 col on mobile, 2 col on tablet, 3 col on large desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prospects.map((prospect) => (
          <ProspectCard
            key={prospect.id}
            prospect={prospect}
            onUpdateGP={onUpdateGP}
            onToggleProtection={onToggleProtection}
            onTogglePromotion={onTogglePromotion}
            onSyncProspect={onSyncProspect}
          />
        ))}
      </div>
    </section>
  );
};
