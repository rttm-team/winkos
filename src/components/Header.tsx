import React from 'react';
import {
  Info,
  Home,
  Users,
  Dice5,
  LayoutGrid,
} from 'lucide-react';

interface HeaderProps {
  onNavigate: (view: 'hub' | 'prospect-central' | 'prospects' | 'arcade') => void;
  onOpenRules: () => void;
  activeView: 'hub' | 'prospect-central' | 'prospects' | 'arcade';
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenRules,
  activeView,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md">
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
            <h1 className="hidden sm:block text-lg font-black tracking-tight text-slate-100 group-hover:text-cyan-300 transition-colors">
              Winko's Hockey Pool
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-3">
            <NavItem icon={Home} label="Hub" onClick={() => onNavigate('hub')} active={activeView === 'hub'} />
            <NavItem icon={LayoutGrid} label="Prospect Central" onClick={() => onNavigate('prospect-central')} active={activeView === 'prospect-central'} />
            <NavItem icon={Users} label="GM Pools" onClick={() => onNavigate('prospects')} active={activeView === 'prospects'} />
            <NavItem icon={Dice5} label="Arcade" onClick={() => onNavigate('arcade')} active={activeView === 'arcade'} />
            <NavItem icon={Info} label="Rules" onClick={onOpenRules} active={false} />
          </nav>
        </div>
      </div>
    </header>
  );
};

const NavItem = ({ icon: Icon, label, onClick, active }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
      active
        ? 'bg-slate-800 text-cyan-300'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
    }`}
  >
    <Icon className="h-4 w-4" />
    <span className="hidden sm:inline">{label}</span>
  </button>
);
