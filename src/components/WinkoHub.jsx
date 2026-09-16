import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
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
  LockKeyhole,
  Sparkles,
  Crown,
  ShieldCheck,
  LogOut,
  X,
  Delete,
  Sun,
  Moon,
} from 'lucide-react';
import { evaluateProspect } from '../types';

/**
 * WinkoHub - Landing page + PIN auth gate for Winko's Hockey Pool.
 *
 * Props:
 *  - gms: Array<{ id, name, winkoins, is_commish, pin }>
 *  - activeGm: the currently authenticated GM object, or null when locked
 *  - onAuthenticate: (gmId, pin) => boolean  validates the PIN, unlocks, persists session
 *  - onLogout: () => void  clears the session
 *  - onNavigate: (viewName: 'prospects' | 'arcade') => void
 */
export default function WinkoHub({
  gms = [],
  activeGm = null,
  onAuthenticate = () => false,
  onLogout = () => {},
  onNavigate = (_target = 'prospects') => {},
  theme = 'light',
  onToggleTheme = () => {},
}) {
  const isLight = theme === 'light';
  // GM chosen in the locked state whose PIN modal is open (null = no modal).
  const [pinTarget, setPinTarget] = useState(null);

  // The arcade isn't launched yet — show a "coming soon" treatment.
  const isArcadeComingSoon = true;

  // Auto-login: if a saved session matches a valid GM, unlock without a PIN.
  const resumeAttempted = useRef(false);
  useEffect(() => {
    if (activeGm) return; // already unlocked
    if (resumeAttempted.current) return;
    let storedId = null;
    try {
      storedId = localStorage.getItem('winkos_active_gm');
    } catch {
      storedId = null;
    }
    if (!storedId) return;
    const match = gms.find((g) => String(g.id) === String(storedId));
    if (match) {
      resumeAttempted.current = true;
      onAuthenticate(match.id, match.pin);
    }
  }, [gms, activeGm, onAuthenticate]);

  // Top 3 GMs by Winkoins for the arcade leaderboard preview.
  const leaderboard = useMemo(() => {
    return [...gms]
      .sort((a, b) => (b.winkoins ?? 0) - (a.winkoins ?? 0))
      .slice(0, 3);
  }, [gms]);

  const isLocked = !activeGm;

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-sky-500/30 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* ============================= HEADER ============================= */}
        <header className={`flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-center lg:justify-between ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/25">
              <HockeyMark className="h-7 w-7 text-slate-950" />
            </div>
            <div>
              <h1 className={`text-xl font-extrabold tracking-tight sm:text-2xl ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Winko&apos;s Hockey Pool Hub
              </h1>
              <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Fantasy Pool Command Center
              </p>
            </div>
          </div>

          {/* Controls & Theme Toggle */}
          <div className="flex items-center gap-3">
            {!isLocked && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Active GM identity */}
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  isLight ? 'border-slate-200 bg-white text-slate-800 shadow-sm' : 'border-slate-700 bg-slate-900 text-slate-100'
                }`}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <span className="max-w-[10rem] truncate">{activeGm.name}</span>
                  {activeGm.is_commish && (
                    <span className="hidden items-center gap-1 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300 sm:flex">
                      <Crown className="h-3 w-3" />
                      Commish
                    </span>
                  )}
                </div>

                {/* Winkoin balance */}
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                  <Coins className="h-4 w-4" />
                  {(activeGm.winkoins ?? 0).toLocaleString()} Winkoins
                </div>

                {/* PIN Verified badge */}
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  PIN Verified
                </div>

                {/* Commish admin */}
                {activeGm.is_commish && (
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 transition hover:bg-purple-500/20"
                  >
                    <Settings className="h-4 w-4" />
                    Commish Admin
                  </button>
                )}

                {/* Switch GM / Lock */}
                <button
                  type="button"
                  onClick={onLogout}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-slate-50 hover:text-rose-600 shadow-sm'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-500/50 hover:bg-slate-800 hover:text-rose-300'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  Switch GM / Lock
                </button>
              </div>
            )}

            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center border shadow-sm ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  : 'border-slate-700 bg-slate-900 text-amber-300 hover:bg-slate-800'
              }`}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {isLocked ? (
          /* ===================== LOCKED / UNAUTHENTICATED ===================== */
          <LockedView
            gms={gms}
            leaderboard={leaderboard}
            isArcadeComingSoon={isArcadeComingSoon}
            onPick={(gm) => setPinTarget(gm)}
            onNavigate={onNavigate}
            isLight={isLight}
          />
        ) : (
          /* ===================== UNLOCKED / AUTHENTICATED ===================== */
          <UnlockedView
            activeGm={activeGm}
            leaderboard={leaderboard}
            isArcadeComingSoon={isArcadeComingSoon}
            onNavigate={onNavigate}
            isLight={isLight}
          />
        )}
      </div>

      {/* PIN entry modal */}
      {pinTarget && (
        <PinModal
          gm={pinTarget}
          onClose={() => setPinTarget(null)}
          onSubmit={(pin) => {
            const ok = onAuthenticate(pinTarget.id, pin);
            if (ok) setPinTarget(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------- Locked view ---------------------------- */

function LockedView({ gms, leaderboard, isArcadeComingSoon, onPick, onNavigate, isLight }) {
  return (
    <>
      {/* Hero */}
      <div className="py-8 text-center sm:py-12">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
          isLight ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
        }`}>
          <LockKeyhole className="h-3.5 w-3.5" />
          Secure GM Access
        </span>
        <h2 className={`mx-auto mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          Welcome to Winko&apos;s Hockey Pool
        </h2>
        <p className={`mx-auto mt-3 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Select your team and enter your 4-digit PIN to manage your roster and
          stack Winkoins.
        </p>
      </div>

      {/* Team selector */}
      <section>
        <div className={`mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
          <Users className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          Choose Your Team
        </div>
        {gms.length === 0 ? (
          <div className={`rounded-2xl border border-dashed px-4 py-10 text-center text-sm ${isLight ? 'border-slate-300 bg-white text-slate-600 shadow-sm' : 'border-slate-800 text-slate-500'}`}>
            No GMs found yet.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gms.map((gm) => (
              <li key={gm.id}>
                <button
                  type="button"
                  onClick={() => onPick(gm)}
                  className={`group flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                    isLight
                      ? 'border-slate-200 bg-white shadow-sm hover:border-sky-400 hover:bg-sky-50/50'
                      : 'border-slate-800 bg-slate-900/60 hover:border-sky-500/50 hover:bg-slate-900'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      isLight ? 'bg-sky-100 text-sky-700' : 'bg-sky-500/15 text-sky-300'
                    }`}>
                      {initialsFor(gm.name)}
                    </span>
                    <span className="min-w-0">
                      <span className={`flex items-center gap-1 truncate font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {gm.name}
                        {gm.is_commish && (
                          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                        )}
                      </span>
                    </span>
                  </span>
                  <Lock className={`h-4 w-4 shrink-0 transition ${isLight ? 'text-slate-400 group-hover:text-sky-600' : 'text-slate-500 group-hover:text-sky-300'}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Locked feature tiles */}
      <main className="mt-8 grid flex-1 grid-cols-1 gap-6 pb-10 lg:grid-cols-2">
        <LockedTile
          title="Prospect Central"
          subtitle="Roster Management & Live NHL Rule Tracking"
          icon={ShieldCheck}
          accent="sky"
          isLight={isLight}
        />
        <LockedTile
          title="Winko's Arcade"
          subtitle="Daily Mini-Games & Winkoins Leaderboard"
          icon={Dice5}
          accent="amber"
          badge={isArcadeComingSoon ? 'Coming Soon' : null}
          isLight={isLight}
        >
          <div className="mt-4">
            <button
              type="button"
              onClick={() => onNavigate('arcade')}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:from-amber-400 hover:to-amber-300 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Dice5 className="h-4 w-4" />
              <span>Arcade Coming Soon — View Info</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </button>
            <div className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              Top GMs
            </div>
            <LeaderboardList leaderboard={leaderboard} isLight={isLight} />
          </div>
        </LockedTile>
      </main>
    </>
  );
}

function LockedTile({ title, subtitle, icon: Icon, accent = 'sky', badge, children, isLight }) {
  const ring = accent === 'amber'
    ? isLight ? 'ring-amber-300 bg-amber-50 text-amber-700' : 'ring-amber-400/30 bg-amber-400/15 text-amber-300'
    : isLight ? 'ring-sky-300 bg-sky-50 text-sky-700' : 'ring-sky-500/30 bg-sky-500/15 text-sky-300';
  return (
    <section className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 ${
      isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-800 bg-slate-900/60'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${ring}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className={`flex items-center gap-2 text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {title}
            {badge && (
              <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isLight ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
              }`}>
                <Sparkles className="h-3 w-3" />
                {badge}
              </span>
            )}
          </h3>
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{subtitle}</p>
        </div>
      </div>

      {children}

      {/* Lock overlay */}
      <div className={`mt-6 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center ${
        isLight ? 'border-slate-300 bg-slate-50 text-slate-700' : 'border-slate-700 bg-slate-950/50 text-slate-300'
      }`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'}`}>
          <Lock className="h-5 w-5" />
        </div>
        <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Select Team &amp; Enter PIN</p>
        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Unlock the hub to access this section.</p>
      </div>
    </section>
  );
}

/* ---------------------------- Unlocked view ---------------------------- */

function UnlockedView({ activeGm, leaderboard, isArcadeComingSoon, onNavigate, isLight }) {
  const firstName = activeGm?.name ? activeGm.name.split(' ')[0] : '';
  
  const stats = useMemo(() => {
    const prospects = activeGm?.prospects || [];
    // Only track active players (exclude trashed and inactive)
    const activeProspects = prospects.filter(p => p.status !== 'trashed' && p.status !== 'inactive');
    const skaters = activeProspects.filter(p => p.position === 'F' || p.position === 'D');
    const goalies = activeProspects.filter(p => p.position === 'G');

    const evaluate = (list) => {
      if (!list || list.length === 0) {
        return { count: 0, tracked: 0, progress: 0 };
      }
      let trackedCount = 0;
      let totalProgress = 0;
      list.forEach(p => {
        const ev = evaluateProspect(p);
        // Tracked if promoted, mandatory promotion, or watchlist
        if (p.promoted || ev.isMandatoryPromotion || ev.isWatchlist) {
          trackedCount++;
        }
        // Player's actual progress towards single season, cumulative, or 4x25 GP promotion threshold
        const playerProgress = p.promoted
          ? 100
          : Math.min(100, Math.max(ev.seasonProgress || 0, ev.cumulativeProgress || 0, ((ev.seasons25PlusCount || 0) / 4) * 100));
        totalProgress += playerProgress;
      });
      return {
        count: list.length,
        tracked: trackedCount,
        progress: Math.round(totalProgress / list.length)
      };
    };

    const skaterStats = evaluate(skaters);
    const goalieStats = evaluate(goalies);

    return {
      skaterPercent: skaterStats.progress,
      skaterCaption: skaterStats.count > 0 ? `${skaterStats.tracked} of ${skaterStats.count} tracked to threshold` : 'No active skaters',
      goaliePercent: goalieStats.progress,
      goalieCaption: goalieStats.count > 0 ? `${goalieStats.tracked} of ${goalieStats.count} tracked to threshold` : 'No active goalies',
    };
  }, [activeGm]);

  return (
    <>
      {/* Hero */}
      <div className="py-8 sm:py-10">
        <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
          Welcome back{firstName ? `, ${firstName}` : ''}
        </p>
        <h2 className={`mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Run your roster. Rack up Winkoins.
        </h2>
        <p className={`mt-2 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Track live NHL promotions and jump into the daily arcade — all from one
          command center.
        </p>
      </div>

      {/* Feature cards */}
      <main className="grid flex-1 grid-cols-1 gap-6 pb-10 lg:grid-cols-2">
        {/* CARD 1 — Prospect Central */}
        <section className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition ${
          isLight
            ? 'border-slate-200 bg-white shadow-sm hover:border-sky-300 hover:shadow-md'
            : 'border-slate-800 bg-slate-900/60 hover:border-sky-500/50 hover:bg-slate-900'
        }`}>
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-500/10 blur-2xl transition group-hover:bg-sky-500/20" />

          <div className="relative flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${
              isLight ? 'bg-sky-50 text-sky-700 ring-sky-300' : 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Prospect Central</h3>
              <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Roster Management &amp; Live NHL Rule Tracking
              </p>
            </div>
          </div>

          <div className="relative mt-6 space-y-4">
            <ProgressRow
              label="Skater Promotions"
              value={stats.skaterPercent}
              accent="sky"
              caption={stats.skaterCaption}
              isLight={isLight}
            />
            <ProgressRow
              label="Goalie Promotions"
              value={stats.goaliePercent}
              accent="amber"
              caption={stats.goalieCaption}
              isLight={isLight}
            />
          </div>

          <ul className="relative mt-6 flex flex-wrap gap-2">
            <FeatureChip icon={Search} label="Search prospects" isLight={isLight} />
            <FeatureChip icon={Filter} label="Position filters" isLight={isLight} />
            <FeatureChip icon={RadioTower} label="Real-time sync" isLight={isLight} />
          </ul>

          <div className="relative mt-auto pt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('prospect-central')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 cursor-pointer shadow-md shadow-sky-500/20"
            >
              <span>Prospect Central HQ</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('prospects')}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition cursor-pointer ${
                isLight
                  ? 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>My Prospect Pool</span>
            </button>
          </div>
        </section>

        {/* CARD 2 — Winko's Arcade */}
        <section className={`group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition ${
          isLight
            ? 'border-slate-200 bg-white shadow-sm hover:border-amber-300 hover:shadow-md'
            : 'border-slate-800 bg-slate-900/60 hover:border-amber-400/50 hover:bg-slate-900'
        }`}>
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl transition group-hover:bg-amber-500/20" />

          <div className="relative flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${
              isLight ? 'bg-amber-50 text-amber-700 ring-amber-300' : 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
            }`}>
              <Dice5 className="h-6 w-6" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Winko&apos;s Arcade</h3>
              <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Daily Mini-Games &amp; Winkoins Leaderboard
              </p>
            </div>
          </div>

          <div className="relative mt-6">
            {isArcadeComingSoon ? (
              <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold ${
                isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
              }`}>
                <Sparkles className="h-4 w-4" />
                Coming Soon
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm font-bold text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Today&apos;s Game is Live!
                <Dice5 className="h-4 w-4" />
              </span>
            )}
          </div>

          <div className="relative mt-6">
            <div className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              <Trophy className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              Top GMs
            </div>
            <LeaderboardList leaderboard={leaderboard} isLight={isLight} />
          </div>

          <div className="relative mt-auto pt-6">
            <button
              type="button"
              onClick={() => onNavigate('arcade')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 cursor-pointer shadow-md"
            >
              <Dice5 className="h-4 w-4" />
              <span>Arcade Coming Soon — View Info</span>
            </button>
            <p className={`mt-2 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              Daily mini-games drop soon — keep stacking Winkoins.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

/* ---------------------------- PIN modal ---------------------------- */

function PinModal({ gm, onClose, onSubmit }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setDigit = (idx, val) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    if (clean && idx < 3) {
      inputsRef.current[idx + 1]?.focus();
    }
    if (next.every((d) => d !== '')) {
      const pinStr = next.join('');
      const ok = onSubmit(pinStr);
      if (!ok) {
        setError('Incorrect PIN. Try again.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setDigits(['', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        next[idx - 1] = '';
        setDigits(next);
        inputsRef.current[idx - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!text) return;
    const next = ['', '', '', ''];
    for (let i = 0; i < text.length; i++) {
      next[i] = text[i];
    }
    setDigits(next);
    if (text.length === 4) {
      const ok = onSubmit(text);
      if (!ok) {
        setError('Incorrect PIN. Try again.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setDigits(['', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } else {
      inputsRef.current[Math.min(text.length, 3)]?.focus();
    }
  };

  const submit = () => {
    const pinStr = digits.join('');
    if (pinStr.length < 4) {
      setError('Please enter a 4-digit PIN.');
      return;
    }
    const ok = onSubmit(pinStr);
    if (!ok) {
      setError('Incorrect PIN. Try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setDigits(['', '', '', '']);
      inputsRef.current[0]?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border bg-slate-900 p-6 text-slate-100 shadow-2xl transition-all ${
          shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Enter GM PIN</h3>
              <p className="text-sm text-slate-400">{gm.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Digit inputs */}
        <div className="mt-6 flex justify-center gap-3" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`PIN digit ${i + 1}`}
              className={`h-14 w-12 rounded-xl border bg-slate-950 text-center text-2xl font-black text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 ${
                error ? 'border-rose-500/70' : 'border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-3 text-center text-sm font-semibold text-rose-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4" />
          Unlock Hub
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 transition hover:text-slate-200 cursor-pointer"
        >
          <Delete className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------- Shared sub-components ---------------------------- */

function LeaderboardList({ leaderboard, isLight }) {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className={`rounded-lg border border-dashed px-3 py-4 text-center text-sm ${isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'}`}>
        No GMs on the board yet.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {leaderboard.map((gm, index) => (
        <li
          key={gm.id}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            isLight ? 'border-slate-200 bg-slate-50 shadow-sm' : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <span className="flex items-center gap-3">
            <RankBadge rank={index + 1} />
            <span className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{gm.name}</span>
          </span>
          <span className={`flex items-center gap-1 text-sm font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
            <Coins className="h-3.5 w-3.5" />
            {(gm.winkoins ?? 0).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProgressRow({ label, value, caption, accent = 'sky', isLight }) {
  const barColor = accent === 'amber' ? 'bg-amber-500 dark:bg-amber-400' : 'bg-sky-500 dark:bg-sky-400';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{label}</span>
        <span className={`font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{value}%</span>
      </div>
      <div className={`h-2 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {caption && <p className={`mt-1 text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{caption}</p>}
    </div>
  );
}

function FeatureChip({ icon: Icon, label, isLight }) {
  return (
    <li className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
      isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-800 bg-slate-950/40 text-slate-300'
    }`}>
      <Icon className={`h-3.5 w-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
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

/* Derive up-to-2-char initials from a GM name. */
function initialsFor(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* Simple hockey stick + puck mark. */
function HockeyMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
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
