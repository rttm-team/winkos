import React from 'react';
import {
  Info,
  Home,
  Users,
  Dice5,
  LayoutGrid,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: 'hub' | 'prospect-central' | 'prospects' | 'arcade') => void;
  onOpenRules: () => void;
  activeView: 'hub' | 'prospect-central' | 'prospects' | 'arcade';
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenRules,
  activeView,
  theme,
  onToggleTheme,
}) => {
  const isLight = theme === 'light';

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
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <span className="text-lg font-black tracking-tight text-white">W</span>
            </div>
            <h1 className={`hidden sm:block text-lg font-black tracking-tight transition-colors ${
              isLight ? 'text-slate-900 group-hover:text-cyan-600' : 'text-slate-100 group-hover:text-cyan-300'
            }`}>
              Winko's Hockey Pool
            </h1>
          </div>

          {/* Navigation & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavItem icon={Home} label="Hub" onClick={() => onNavigate('hub')} active={activeView === 'hub'} theme={theme} />
              <NavItem icon={LayoutGrid} label="Prospect Central" onClick={() => onNavigate('prospect-central')} active={activeView === 'prospect-central'} theme={theme} />
              <NavItem icon={Users} label="GM Pools" onClick={() => onNavigate('prospects')} active={activeView === 'prospects'} theme={theme} />
              <NavItem icon={Dice5} label="Arcade" onClick={() => onNavigate('arcade')} active={activeView === 'arcade'} theme={theme} />
              <NavItem icon={Info} label="Rules" onClick={onOpenRules} active={false} theme={theme} />
            </nav>

            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center border shadow-sm ${
                isLight
                  ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  : 'border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
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
