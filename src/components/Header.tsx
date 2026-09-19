import React, { useState, useRef, useEffect } from 'react';
import {
  Info,
  Home,
  Users,
  Dice5,
  LayoutGrid,
  Sun,
  Moon,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';
import logoLight from '../assets/images/winkos-logo-light.png';
import logoDark from '../assets/images/winkos-logo-dark.png';

interface HeaderProps {
  onNavigate: (view: 'hub' | 'prospect-central' | 'prospects' | 'arcade' | 'active-squad') => void;
  onOpenRules: () => void;
  activeView: 'hub' | 'prospect-central' | 'prospects' | 'arcade' | 'active-squad' | string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeGm?: any;
  // new props for settings
  onLogout?: () => void;
  isAdmin?: boolean;
  gms?: any[];
  selectedGmId?: string;
  onSelectGm?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenRules,
  activeView,
  theme,
  onToggleTheme,
  activeGm,
  onLogout,
  isAdmin,
  gms = [],
  selectedGmId,
  onSelectGm,
}) => {
  const isLight = theme === 'light';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  return (
    <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-md ${
      isLight
        ? 'border-slate-200 bg-white/90 text-slate-800'
        : 'border-slate-800/80 bg-slate-900/95 text-slate-100'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3.5">
          {/* Logo & League Branding */}
          <div
            onClick={() => onNavigate('hub')}
            className="flex items-center cursor-pointer group"
          >
            <img 
              src={isLight ? logoLight : logoDark} 
              alt="Winko's Hockey Pool" 
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Navigation & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavItem icon={Home} label="Hub" onClick={() => onNavigate('hub')} active={activeView === 'hub'} theme={theme} />
              <NavItem icon={LayoutGrid} label="Prospect Central" onClick={() => onNavigate('prospect-central')} active={activeView === 'prospect-central'} theme={theme} />
              <NavItem icon={Users} label="GM Pools" onClick={() => onNavigate('prospects')} active={activeView === 'prospects'} theme={theme} />
              <NavItem icon={Dice5} label="Challenges" onClick={() => onNavigate('arcade')} active={activeView === 'arcade'} theme={theme} />
              {isAdmin && (
                <button
                  id="nav-commish-squad-btn"
                  onClick={() => onNavigate('active-squad')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeView === 'active-squad'
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 shadow-xs'
                        : 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-700/80 shadow-xs'
                      : isLight
                      ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 border border-dashed border-emerald-300/80'
                      : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40 border border-dashed border-emerald-700/60'
                  }`}
                  title="Commissioner Test: Active Squad Manager"
                >
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="hidden sm:inline">Squads</span>
                  <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 leading-none">
                    Commish
                  </span>
                </button>
              )}
              <NavItem icon={Info} label="Rules" onClick={onOpenRules} active={false} theme={theme} />
            </nav>
            
            {activeGm && activeGm.winkoins !== undefined && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm ml-2 hidden sm:flex">
                <span>🪙</span>
                <span>{(activeGm.winkoins || 0).toLocaleString()} WK</span>
              </div>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`p-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center border shadow-sm ${
                  isLight
                    ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                } ${settingsOpen ? (isLight ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-white') : ''}`}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {settingsOpen && (
                <div className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl origin-top-right z-50 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-100'
                }`}>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        onToggleTheme();
                        setSettingsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                        isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    </button>

                    {isAdmin && (
                      <div className="px-1 py-1">
                        <div className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Commish Tools
                        </div>
                        <button
                          id="settings-commish-squads-btn"
                          onClick={() => {
                            onNavigate('active-squad');
                            setSettingsOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors mb-2 cursor-pointer ${
                            isLight
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700/50'
                          }`}
                        >
                          <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Active Squad Manager (Test)</span>
                        </button>

                        {gms.length > 0 && onSelectGm && (
                          <>
                            <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              View As GM
                            </div>
                            <div className="relative mt-1">
                              <select
                                value={selectedGmId}
                                onChange={(e) => {
                                  onSelectGm(e.target.value);
                                  setSettingsOpen(false);
                                }}
                                className={`w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                                  isLight 
                                    ? 'border-slate-300 bg-slate-50 text-slate-800' 
                                    : 'border-slate-600 bg-slate-900 text-slate-200'
                                }`}
                              >
                                {gms.map((gm) => (
                                  <option key={gm.id} value={gm.id}>
                                    {gm.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {onLogout && (
                      <>
                        <div className={`my-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700'}`} />
                        <button
                          onClick={() => {
                            onLogout();
                            setSettingsOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                            isLight ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-400/10'
                          }`}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const NavItem = ({ icon: Icon, label, onClick, active, theme }: any) => {
  const isLight = theme === 'light';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
        active
          ? isLight
            ? 'bg-slate-200 text-cyan-700 font-bold'
            : 'bg-slate-800 text-cyan-300 font-bold'
          : isLight
          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
