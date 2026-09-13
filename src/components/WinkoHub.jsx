import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Zap,
  ChevronDown,
  Coins,
  Settings,
  Users,
  Search,
  Filter,
  RadioTower,
  ArrowRight,
  Trophy,
  Dice5,
  Lock,
  Crown,
  ShieldCheck,
} from 'lucide-react';

/**
 * WinkoHub - Landing page for Winko's Hockey Pool.
 *
 * Props:
 *  - gms: Array<{ id, name, winkoins, is_commish }>
 *  - activeGm: the currently selected GM object
 *  - onSelectGm: (gmId) => void
 *  - onNavigate: (viewName: 'prospects' | 'arcade') => void
 */
export default function WinkoHub({
  gms = [],
  activeGm,
  onSelectGm = () => {},
  onNavigate = () => {},
}) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);

  // Fall back to the first GM if no active GM was provided.
  const currentGm = activeGm || gms[0] || null;

  // Assume the arcade's daily game is live for demo purposes.
  const isArcadeLive = true;

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function handleClickOutside(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setIsSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Top 3 GMs by Winkoins for the arcade leaderboard preview.
  const leaderboard = useMemo(() => {
    return [...gms]
      .sort((a, b) => (b.winkoins ?? 0) - (a.winkoins ?? 0))
      .slice(0, 3);
  }, [gms]);

  const handleSelect = (gmId) => {
    onSelectGm(gmId);
    setIsSwitcherOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-sky-500/30">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* ============================= HEADER ============================= */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/25">
              <HockeyMark className="h-7 w-7 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                Winko&apos;s Hockey Pool Hub
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Fantasy Pool Command Center
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* GM Switcher */}
            <div ref={switcherRef} className="relative">
              <button
                type="button"
                onClick={() => setIsSwitcherOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={isSwitcherOpen}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-500/60 hover:bg-slate-800"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <span className="max-w-[10rem] truncate">
                  {currentGm ? currentGm.name : 'Select GM'}
                </span>
                {currentGm?.is_commish && (
                  <span className="hidden items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 sm:flex">
                    <Crown className="h-3 w-3" />
                    Commish
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    isSwitcherOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isSwitcherOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 z-20 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl shadow-black/50"
                >
                  {gms.map((gm) => {
                    const isActive = currentGm && gm.id === currentGm.id;
                    return (
                      <li key={gm.id} role="option" aria-selected={isActive}>
                        <button
                          type="button"
                          onClick={() => handleSelect(gm.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                            isActive
                              ? 'bg-sky-500/15 text-sky-200'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="truncate font-medium">{gm.name}</span>
                            {gm.is_commish && (
                              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300">
                            <Coins className="h-3 w-3" />
                            {gm.winkoins ?? 0}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Live Winkoin balance */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-300">
              <Coins className="h-4 w-4" />
              {(currentGm?.winkoins ?? 0).toLocaleString()} Winkoins
            </div>

            {/* Commish tools */}
            {currentGm?.is_commish && (
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-300 transition hover:bg-purple-500/20"
              >
                <Settings className="h-4 w-4" />
                Commish Tools
              </button>
            )}
          </div>
        </header>

        {/* ============================= HERO ============================= */}
        <div className="py-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Welcome back{currentGm ? `, ${currentGm.name.split(' ')[0]}` : ''}
          </p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">
            Run your roster. Rack up Winkoins.
          </h2>
          <p className="mt-2 max-w-xl text-slate-400">
            Track live NHL promotions and jump into the daily arcade — all from one command center.
          </p>
        </div>

        {/* ============================= FEATURE CARDS ============================= */}
        <main className="grid flex-1 grid-cols-1 gap-6 pb-10 lg:grid-cols-2">
          {/* CARD 1 — Prospect Central */}
          <section className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-500/50 hover:bg-slate-900">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-500/10 blur-2xl transition group-hover:bg-sky-500/20" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Prospect Central</h3>
                <p className="text-sm text-slate-400">
                  Roster Management &amp; Live NHL Rule Tracking
                </p>
              </div>
            </div>

            {/* Promotion progress bars */}
            <div className="relative mt-6 space-y-4">
              <ProgressRow
                label="Skater Promotions"
                value={72}
                accent="sky"
                caption="18 / 25 tracked to threshold"
              />
              <ProgressRow
                label="Goalie Promotions"
                value={45}
                accent="amber"
                caption="9 / 20 tracked to threshold"
              />
            </div>

            {/* Feature chips */}
            <ul className="relative mt-6 flex flex-wrap gap-2">
              <FeatureChip icon={Search} label="Search prospects" />
              <FeatureChip icon={Filter} label="Position filters" />
              <FeatureChip icon={RadioTower} label="Real-time sync" />
            </ul>

            <div className="relative mt-auto pt-6">
              <button
                type="button"
                onClick={() => onNavigate('prospects')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
              >
                Open Prospect Central
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* CARD 2 — Winko's Arcade */}
          <section className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-amber-400/50 hover:bg-slate-900">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl transition group-hover:bg-amber-500/20" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <Dice5 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Winko&apos;s Arcade</h3>
                <p className="text-sm text-slate-400">
                  Daily Mini-Games &amp; Winkoins Leaderboard
                </p>
              </div>
            </div>

            {/* Status badge */}
            <div className="relative mt-6">
              {isArcadeLive ? (
                <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-bold text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Today&apos;s Game is Live!
                  <Dice5 className="h-4 w-4" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm font-bold text-slate-400">
                  <Lock className="h-4 w-4" />
                  Locker Room Closed
                </span>
              )}
            </div>

            {/* Top 3 leaderboard preview */}
            <div className="relative mt-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Trophy className="h-4 w-4 text-amber-400" />
                Top GMs
              </div>
              <ul className="space-y-2">
                {leaderboard.map((gm, index) => (
                  <li
                    key={gm.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                  >
                    <span className="flex items-center gap-3">
                      <RankBadge rank={index + 1} />
                      <span className="text-sm font-semibold text-slate-200">
                        {gm.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-amber-300">
                      <Coins className="h-3.5 w-3.5" />
                      {(gm.winkoins ?? 0).toLocaleString()}
                    </span>
                  </li>
                ))}
                {leaderboard.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-sm text-slate-500">
                    No GMs on the board yet.
                  </li>
                )}
              </ul>
            </div>

            <div className="relative mt-auto pt-6">
              <button
                type="button"
                onClick={() => onNavigate('arcade')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
              >
                Enter Arcade
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------- Sub-components ---------------------------- */

function ProgressRow({ label, value, caption, accent = 'sky' }) {
  const barColor = accent === 'amber' ? 'bg-amber-400' : 'bg-sky-500';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="font-bold text-slate-400">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </div>
  );
}

function FeatureChip({ icon: Icon, label }) {
  return (
    <li className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-xs font-medium text-slate-300">
      <Icon className="h-3.5 w-3.5 text-sky-400" />
      {label}
    </li>
  );
}

function RankBadge({ rank }) {
  const styles = {
    1: 'bg-amber-400/20 text-amber-300 ring-amber-400/40',
    2: 'bg-slate-400/20 text-slate-200 ring-slate-400/40',
    3: 'bg-orange-500/20 text-orange-300 ring-orange-500/40',
  };
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ring-1 ${
        styles[rank] || 'bg-slate-700 text-slate-300 ring-slate-600'
      }`}
    >
      {rank}
    </span>
  );
}

/* Simple hockey stick + puck mark rendered with lucide's Zap fallback styling. */
function HockeyMark({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 4v9c0 1.5 1 2.5 2.5 2.5H17"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="19" cy="17.5" rx="3" ry="1.6" fill="currentColor" />
    </svg>
  );
}
