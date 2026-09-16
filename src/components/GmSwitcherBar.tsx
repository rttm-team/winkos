import React, { useState } from 'react';
import { ChevronDown, Crown, Shield, Key, LayoutGrid } from 'lucide-react';
import { GeneralManager } from '../types';

interface GmSwitcherBarProps {
  gms: GeneralManager[];
  selectedGmId: string;
  onSelectGm: (id: string) => void;
  onBackToLanding?: () => void;
}

export const GmSwitcherBar: React.FC<GmSwitcherBarProps> = ({
  gms,
  selectedGmId,
  onSelectGm,
  onBackToLanding,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedGm = gms.find((g) => g.id === selectedGmId) || gms[0];
  const isLight = (() => {
    try {
      return localStorage.getItem('winkos_theme') !== 'dark';
    } catch {
      return true;
    }
  })();

  return (
    <div className={`border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          {/* GM Selector Dropdown */}
          <div className="relative">
            <label htmlFor="gm-selector" className="sr-only">
              Select General Manager
            </label>
            <button
              id="gm-selector"
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-sm cursor-pointer ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-800 hover:border-cyan-600'
                  : 'border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-600'
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${selectedGm.avatarColor} text-[10px] font-bold text-white shadow-inner`}
              >
                {selectedGm.avatarInitials}
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-[10px] font-medium uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>General Manager</span>
                  {(selectedGm.is_commish || selectedGm.name.toLowerCase() === 'adam') && (
                    <Crown className="h-2.5 w-2.5 text-amber-500 dark:text-amber-400 inline" />
                  )}
                </span>
                <span className={`font-semibold leading-tight text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {selectedGm.name}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isLight ? 'text-slate-500' : 'text-slate-400'} ${
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
                <div className={`absolute left-0 mt-2 z-50 w-72 max-h-[50vh] overflow-y-auto rounded-xl border p-1.5 shadow-2xl backdrop-blur-md scrollbar-thin ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-800 scrollbar-thumb-slate-300'
                    : 'border-slate-700 bg-slate-800/95 text-slate-100 scrollbar-thumb-slate-600'
                }`}>
                  <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b mb-1 ${
                    isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-700/60'
                  }`}>
                    Switch General Manager
                  </div>
                  {gms.map((gm) => {
                    const isGmCommish = gm.is_commish || gm.name.toLowerCase() === 'adam';
                    return (
                      <button
                        key={gm.id}
                        onClick={() => {
                          onSelectGm(gm.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                          gm.id === selectedGm.id
                            ? isLight
                              ? 'bg-cyan-50 text-cyan-800 font-semibold border border-cyan-200'
                              : 'bg-cyan-500/15 text-cyan-200 font-semibold'
                            : isLight
                            ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br ${gm.avatarColor} text-[10px] font-bold text-white`}
                          >
                            {gm.avatarInitials}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold leading-none">{gm.name}</span>
                            {isGmCommish && (
                              <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9px] font-bold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                                <Crown className="h-2.5 w-2.5" /> Commish
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-sm cursor-pointer ${
                isLight
                  ? 'border-slate-300 bg-white text-cyan-700 hover:border-cyan-600 hover:bg-slate-50'
                  : 'border-slate-700 bg-slate-900/80 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Prospect Central HQ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
