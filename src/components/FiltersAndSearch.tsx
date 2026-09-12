import React from 'react';
import { PositionFilter, StatusFilter } from '../types';
import { Search, SlidersHorizontal, X, AlertTriangle, ShieldCheck, CheckCircle2, Layers } from 'lucide-react';

interface FiltersAndSearchProps {
  positionFilter: PositionFilter;
  setPositionFilter: (pos: PositionFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    all: number;
    f: number;
    d: number;
    g: number;
    actionRequired: number;
    promoted: number;
    protected: number;
    developing: number;
  };
  onResetFilters: () => void;
}

export const FiltersAndSearch: React.FC<FiltersAndSearchProps> = ({
  positionFilter,
  setPositionFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  counts,
  onResetFilters,
}) => {
  const hasActiveFilters =
    positionFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="mb-6 space-y-3">
      {/* Search Input & Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="prospect-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospect name, NHL team (BUF, MIN...), draft year..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-400 focus:border-cyan-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Reset Filters button if any are applied */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Filter Tabs: Position & Status */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-1">
        {/* Position Filter (All, F, D, G) */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Position:</span>
          </span>

          <button
            onClick={() => setPositionFilter('ALL')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              positionFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            All <span className="text-[10px] opacity-80 font-mono ml-0.5">({counts.all})</span>
          </button>

          <button
            onClick={() => setPositionFilter('F')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              positionFilter === 'F'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            Forwards <span className="text-[10px] opacity-80 font-mono ml-0.5">({counts.f})</span>
          </button>

          <button
            onClick={() => setPositionFilter('D')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              positionFilter === 'D'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            Defensemen <span className="text-[10px] opacity-80 font-mono ml-0.5">({counts.d})</span>
          </button>

          <button
            onClick={() => setPositionFilter('G')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              positionFilter === 'G'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            Goalies <span className="text-[10px] opacity-80 font-mono ml-0.5">({counts.g})</span>
          </button>
        </div>

        {/* Status Filter (Action Required / Promoted / Protected) */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
            <span>Status:</span>
          </span>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-200 text-slate-900 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            All Status
          </button>

          <button
            onClick={() => setStatusFilter('ACTION_REQUIRED')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === 'ACTION_REQUIRED'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 border border-amber-800/40'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Action Required</span>
            <span className="font-mono text-[10px] ml-0.5">({counts.actionRequired})</span>
          </button>

          <button
            onClick={() => setStatusFilter('PROMOTED')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === 'PROMOTED'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                : 'bg-red-950/40 text-red-300 hover:bg-red-950/60 border border-red-800/40'
            }`}
          >
            <span>Promoted (Mandatory)</span>
            <span className="font-mono text-[10px] ml-0.5">({counts.promoted})</span>
          </button>

          <button
            onClick={() => setStatusFilter('PROTECTED')}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
              statusFilter === 'PROTECTED'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60 border border-emerald-800/40'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Protected</span>
            <span className="font-mono text-[10px] ml-0.5">({counts.protected})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
