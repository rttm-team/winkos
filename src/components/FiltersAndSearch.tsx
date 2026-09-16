import React from 'react';
import { PositionFilter, StatusFilter, ViewMode, ProspectSortOption } from '../types';
import {
  Search,
  SlidersHorizontal,
  X,
  AlertTriangle,
  ShieldCheck,
  Layers,
  List,
  LayoutGrid,
  ArrowUpDown,
} from 'lucide-react';

interface FiltersAndSearchProps {
  positionFilter: PositionFilter;
  setPositionFilter: (pos: PositionFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  sortOption: ProspectSortOption;
  setSortOption: (sort: ProspectSortOption) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  counts: {
    all: number;
    f: number;
    d: number;
    g: number;
    promotedProtected?: number;
    actionRequired: number;
    watchlist: number;
    protectionWatch: number;
    promoted: number;
    developing: number;
    trashed: number;
  };
  onResetFilters: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const FiltersAndSearch: React.FC<FiltersAndSearchProps> = ({
  positionFilter,
  setPositionFilter,
  statusFilter,
  setStatusFilter,
  sortOption,
  setSortOption,
  searchQuery,
  setSearchQuery,
  counts,
  onResetFilters,
  viewMode,
  setViewMode,
}) => {
  const hasActiveFilters =
    positionFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    searchQuery.trim() !== '' ||
    sortOption !== 'urgency';

  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
      {/* Search Input & Action Bar with View Mode and Expand/Collapse */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="prospect-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prospect name, NHL team (BUF, MIN...), draft year..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/90 py-3 pl-11 pr-11 text-sm text-slate-100 placeholder-slate-400 focus:border-cyan-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View Switcher (List vs Card) & Expand/Collapse All */}
        <div className="flex items-center gap-2.5 shrink-0 justify-between md:justify-end">
          {/* List vs Card Toggle */}
          <div className="inline-flex items-center rounded-xl border border-slate-700/80 bg-slate-800/90 p-1 shadow-sm">
            <button
              type="button"
              id="view-toggle-list"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to List View (Default)"
            >
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>

            <button
              type="button"
              id="view-toggle-card"
              onClick={() => setViewMode('card')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                viewMode === 'card'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          {/* Reset Filters button if any are applied */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              title="Clear active filters"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selects & Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Position Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Position:</span>
            </span>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as PositionFilter)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 py-2 text-xs font-bold text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="ALL">All Positions ({counts.all})</option>
              <option value="F">Forwards ({counts.f})</option>
              <option value="D">Defensemen ({counts.d})</option>
              <option value="G">Goalies ({counts.g})</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
              <span>Status:</span>
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 py-2 text-xs font-bold text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PROMOTED_PROTECTED">Promoted &amp; Protected ({counts.promotedProtected ?? 0})</option>
              <option value="ACTION_REQUIRED">Action Required ({counts.actionRequired})</option>
              <option value="WATCHLIST">Watchlist ({counts.watchlist})</option>
              <option value="PROMOTED">Promoted ({counts.promoted})</option>
              <option value="PROTECTION_WATCH">Protection Watch ({counts.protectionWatch})</option>
              <option value="TRASHED">Trashed ({counts.trashed})</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-emerald-400" />
              <span>Sort:</span>
            </span>
            <select
              id="prospect-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as ProspectSortOption)}
              className="rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 py-2 text-xs font-bold text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
            >
              <option value="urgency">Default Priority (Promoted+Protected → Needs Promotion → Watchlist → Promoted → In Development)</option>
              <option value="seasonGPDesc">Season GP (High to Low)</option>
              <option value="careerGPDesc">Career GP (High to Low)</option>
              <option value="seasons25PlusDesc">25+ GP Seasons (3/4 → 0/4)</option>
              <option value="nameAsc">Name (A → Z)</option>
              <option value="nameDesc">Name (Z → A)</option>
              <option value="draftYearDesc">Draft Class (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Reset Filters button if any active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors w-full lg:w-auto"
            title="Clear active filters"
          >
            <X className="h-3.5 w-3.5" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
