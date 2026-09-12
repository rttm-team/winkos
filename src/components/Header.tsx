import React, { useState } from 'react';
import { GeneralManager } from '../types';
import {
  ChevronDown,
  Trophy,
  ShieldCheck,
  AlertCircle,
  Info,
  Sparkles,
  Loader2,
  RefreshCw,
  Clock,
  Radio,
} from 'lucide-react';

interface HeaderProps {
  gms: GeneralManager[];
  selectedGmId: string;
  onSelectGm: (id: string) => void;
  onOpenRules: () => void;
  mandatoryCount: number;
  watchlistCount: number;
  protectedCount: number;
  isSyncingAll?: boolean;
  globalLastUpdated?: string;
  onSyncAll?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gms,
  selectedGmId,
  onSelectGm,
  onOpenRules,
  mandatoryCount,
  watchlistCount,
  protectedCount,
  isSyncingAll,
  globalLastUpdated,
  onSyncAll,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedGm = gms.find((g) => g.id === selectedGmId) || gms[0];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo & League Branding */}
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
                <span className="text-xl font-black tracking-tight text-white">W</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                  🏒
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-100">
                    Winko's Hockey Pool
                  </h1>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-cyan-950/80 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-800/60">
                    Prospect Central
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Active Roster Thresholds & Roster Protection
                </p>
              </div>
            </div>

            {/* Rules Button on Mobile */}
            <button
              onClick={onOpenRules}
              id="mobile-rules-btn"
              className="sm:hidden flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors p-1.5 rounded-lg border border-slate-800 bg-slate-800/60"
              title="League Rules"
            >
              <Info className="h-4 w-4 text-cyan-400" />
              <span>Rules</span>
            </button>
          </div>

          {/* Controls: GM Selector + NHL API Sync Button */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3.5">
            {/* Sync with NHL API Button */}
            {onSyncAll && (
              <button
                type="button"
                onClick={onSyncAll}
                disabled={isSyncingAll}
                id="sync-all-nhl-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400/50 text-xs font-semibold text-cyan-300 transition-all shadow-sm disabled:opacity-50"
                title="Fetch live games played stats from official NHL API"
              >
                {isSyncingAll ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span className="hidden xs:inline">Syncing with NHL API...</span>
                    <span className="xs:hidden">Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Sync NHL API</span>
                  </>
                )}
              </button>
            )}

            {/* Rules Button on Desktop */}
            <button
              onClick={onOpenRules}
              id="desktop-rules-btn"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-colors shadow-sm"
            >
              <Info className="h-3.5 w-3.5 text-cyan-400" />
              <span>Rules</span>
            </button>

            {/* GM Selector Dropdown */}
            <div className="relative">
              <label htmlFor="gm-selector" className="sr-only">
                Select General Manager
              </label>
              <button
                id="gm-selector"
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 sm:py-2 text-left text-sm text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-sm"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${selectedGm.avatarColor} text-xs font-bold text-white shadow-inner`}
                >
                  {selectedGm.avatarInitials}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    General Manager
                  </span>
                  <span className="font-semibold text-slate-100 leading-tight">
                    {selectedGm.name}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({(selectedGm.teamName || '').split(' ')[0]})
                    </span>
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-72 max-h-[75vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800/95 p-1.5 shadow-2xl backdrop-blur-md scrollbar-thin scrollbar-thumb-slate-600">
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/60 mb-1">
                      Switch General Manager
                    </div>
                    {gms.map((gm) => (
                      <button
                        key={gm.id}
                        onClick={() => {
                          onSelectGm(gm.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                          gm.id === selectedGm.id
                            ? 'bg-cyan-500/15 text-cyan-200 font-semibold'
                            : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${gm.avatarColor} text-[10px] font-bold text-white`}
                          >
                            {gm.avatarInitials}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-none">{gm.name}</div>
                            <div className="text-[10px] text-slate-400">{gm.teamName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/60">
                            {gm.prospects.length} prospects
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Summary Pill Strip for active GM + Real-time Sync status */}
        <div className="flex items-center justify-between gap-2 pb-2.5 overflow-x-auto text-xs scrollbar-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-300 border border-slate-700/60 whitespace-nowrap">
              <Trophy className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-slate-400">Team:</span>
              <span className="font-semibold text-slate-200">{selectedGm.teamName}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-300 border border-slate-700/60 whitespace-nowrap">
              <span className="text-slate-400">Prospects:</span>
              <span className="font-bold text-slate-100">{selectedGm.prospects.length}</span>
            </div>

            {mandatoryCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-red-950/70 border border-red-800/60 px-2.5 py-1 text-red-300 whitespace-nowrap animate-pulse">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <span>Mandatory Promotion:</span>
                <span className="font-black text-red-200">{mandatoryCount}</span>
              </div>
            )}

            {watchlistCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-md bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 text-amber-300 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>On Watch (≤5 GP):</span>
                <span className="font-bold text-amber-200">{watchlistCount}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 text-emerald-300 whitespace-nowrap">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Protected:</span>
              <span className="font-bold text-emerald-200">{protectedCount}</span>
            </div>
          </div>

          {/* Sync status and timestamp badge in header */}
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            {isSyncingAll ? (
              <div className="flex items-center gap-1.5 rounded-md bg-cyan-950/80 border border-cyan-700/70 px-2.5 py-1 text-xs font-semibold text-cyan-300 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                <span>Syncing with NHL API...</span>
              </div>
            ) : globalLastUpdated ? (
              <div className="flex items-center gap-1.5 rounded-md bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 text-xs text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Last Updated: <strong className="text-slate-100 font-mono">{globalLastUpdated}</strong></span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
