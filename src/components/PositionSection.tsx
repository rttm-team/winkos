import React from 'react';
import { Prospect, PositionGroup, evaluateProspect, ViewMode } from '../types';
import { ProspectCard } from './ProspectCard';
import { ProspectListItem } from './ProspectListItem';
import { Shield, Target, Flame, AlertCircle, ChevronsUpDown, ChevronsDownUp, ShieldCheck } from 'lucide-react';

interface PositionSectionProps {
  title: PositionGroup;
  prospects: Prospect[];
  viewMode: ViewMode;
  expandedProspectIds: Set<string>;
  onToggleExpandProspect: (prospectId: string) => void;
  onSetExpandedProspects?: (updater: (prev: Set<string>) => Set<string>) => void;
  onUpdateGP: (prospectId: string, delta: number) => void;
  onToggleProtection: (prospectId: string) => void;
  onTogglePromotion?: (prospectId: string) => void;
  onSyncProspect?: (prospectId: string) => void;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => void;
  onUpdate25PlusSeasons?: (prospectId: string, count: number) => void;
  onToggleStatus: (prospectId: string) => void;
  isAdmin?: boolean;
}

export const PositionSection: React.FC<PositionSectionProps> = ({
  title,
  prospects,
  viewMode,
  expandedProspectIds,
  onToggleExpandProspect,
  onSetExpandedProspects,
  onUpdateGP,
  onToggleProtection,
  onTogglePromotion,
  onSyncProspect,
  onEdit,
  onDelete,
  onUpdate25PlusSeasons,
  onToggleStatus,
  isAdmin = false,
}) => {
  const isLight = (() => {
    try {
      return localStorage.getItem('winkos_theme') !== 'dark';
    } catch {
      return true;
    }
  })();

  if (prospects.length === 0) {
    return null;
  }

  // Calculate alerts in this position group
  const promotedProtectedCount = prospects.filter((p) => p.promoted && (p.isProtected || (p as any).protected)).length;
  const mandatoryCount = prospects.filter((p) => evaluateProspect(p).isMandatoryPromotion).length;
  const watchCount = prospects.filter((p) => evaluateProspect(p).isWatchlist).length;

  // Check if all in this section are expanded
  const allSectionExpanded = prospects.length > 0 && prospects.every((p) => expandedProspectIds.has(p.id));

  const handleToggleSection = () => {
    if (!onSetExpandedProspects) return;
    onSetExpandedProspects((prev) => {
      const next = new Set(prev);
      if (allSectionExpanded) {
        prospects.forEach((p) => next.delete(p.id));
      } else {
        prospects.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const getPositionIcon = () => {
    switch (title) {
      case 'Forwards':
        return <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'Defensemen':
        return <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Goalies':
        return <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
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
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-700'
          }`}>
            {getPositionIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base sm:text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {title}
              </h2>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {prospects.length}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{getRulesHint()}</p>
          </div>
        </div>

        {/* Section Actions: Alerts Pill + Expand/Collapse Section Toggle */}
        <div className="flex items-center gap-2 text-xs">
          {promotedProtectedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 font-medium text-purple-300/90">
              <ShieldCheck className="h-3 w-3 text-purple-400/80" />
              <span>{promotedProtectedCount} Promoted &amp; Protected</span>
            </span>
          )}
          {mandatoryCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-950/50 border border-rose-800/40 px-2 py-0.5 font-medium text-rose-300/90">
              <AlertCircle className="h-3 w-3 text-rose-400/80" />
              <span>{mandatoryCount} Mandatory</span>
            </span>
          )}
          {watchCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 font-medium text-amber-300/90">
              <span>{watchCount} On Watch</span>
            </span>
          )}

          {onSetExpandedProspects && (
            <button
              type="button"
              onClick={handleToggleSection}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/90 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors ml-1"
              title={allSectionExpanded ? `Collapse all ${title}` : `Expand all ${title}`}
            >
              {allSectionExpanded ? (
                <ChevronsDownUp className="h-3.5 w-3.5 text-cyan-400" />
              ) : (
                <ChevronsUpDown className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span className="hidden sm:inline">
                {allSectionExpanded ? 'Collapse All' : 'Expand All'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Roster Display: List View (default) or Card Grid View */}
      {viewMode === 'list' ? (
        <div className="space-y-2.5">
          {prospects.map((prospect) => (
            <ProspectListItem
              key={prospect.id}
              prospect={prospect}
              isExpanded={expandedProspectIds.has(prospect.id)}
              isAdmin={isAdmin}
              onToggleExpand={() => onToggleExpandProspect(prospect.id)}
              onUpdateGP={onUpdateGP}
              onToggleProtection={onToggleProtection}
              onTogglePromotion={onTogglePromotion}
              onSyncProspect={onSyncProspect}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate25PlusSeasons={onUpdate25PlusSeasons}
              onToggleStatus={() => onToggleStatus(prospect.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prospects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              isExpanded={expandedProspectIds.has(prospect.id)}
              isAdmin={isAdmin}
              onToggleExpand={() => onToggleExpandProspect(prospect.id)}
              onUpdateGP={onUpdateGP}
              onToggleProtection={onToggleProtection}
              onTogglePromotion={onTogglePromotion}
              onSyncProspect={onSyncProspect}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate25PlusSeasons={onUpdate25PlusSeasons}
              onToggleStatus={() => onToggleStatus(prospect.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
