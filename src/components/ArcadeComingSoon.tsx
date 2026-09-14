import React from 'react';
import {
  Calendar,
  Coins,
  Trophy,
  Dice5,
  Sparkles,
  ArrowLeft,
  Flame,
  Target,
  Gamepad2,
  Gift,
  Clock,
  Zap,
} from 'lucide-react';

interface ArcadeComingSoonProps {
  onBack: () => void;
}

export default function ArcadeComingSoon({ onBack }: ArcadeComingSoonProps) {
  const scheduleDays = [
    { day: 'Tuesday', label: 'Trivia Tuesday', desc: 'NHL history & pool trivia challenge' },
    { day: 'Thursday', label: 'Over/Under Thursday', desc: 'Predict tonight’s game totals & spreads' },
    { day: 'Saturday', label: 'Shootout Saturday', desc: 'Head-to-head quick pick showdown' },
    { day: 'Sunday', label: 'Hat Trick Sunday', desc: 'High-stakes 3-goalie bonus match' },
  ];

  const upcomingGames = [
    {
      title: 'Puck Drop Trivia',
      category: 'Trivia & Lore',
      icon: Target,
      launch: 'Tuesdays',
      reward: 'Up to 250 Winkoins',
      desc: 'Speed trivia testing your knowledge on NHL prospects, draft records, and pool lore.',
      accent: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    },
    {
      title: 'Over/Under Predictor',
      category: 'Stat Predictions',
      icon: Zap,
      launch: 'Thursdays',
      reward: 'Up to 500 Winkoins',
      desc: 'Lock in predictions on NHL prospect ice-time, shots, and game totals before puck drop.',
      accent: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    },
    {
      title: 'Shootout Showdown',
      category: 'Mini Action',
      icon: Gamepad2,
      launch: 'Saturdays',
      reward: 'Up to 750 Winkoins',
      desc: 'Climb the weekend leaderboard in our arcade mini-game simulation against rival GMs.',
      accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    },
    {
      title: 'Hat Trick Challenge',
      category: 'High Stakes',
      icon: Flame,
      launch: 'Sundays',
      reward: 'Up to 1,000 Winkoins',
      desc: 'Pick 3 breakout prospects playing each Sunday for massive multiplier rewards.',
      accent: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    },
  ];

  const prizes = [
    {
      title: 'Extra Entry Pick in the Draft',
      cost: '5,000 Winkoins',
      desc: 'Unlock an additional prospect slot or compensatory round selection in the next annual pool draft.',
      badge: 'Most Popular',
    },
    {
      title: 'Waiver Wire Priority Boost',
      cost: '2,500 Winkoins',
      desc: 'Jump to the front of the waiver claim order for contested prospect claims.',
      badge: 'Strategic',
    },
    {
      title: 'Pool Commish Trophy & Title',
      cost: '1,500 Winkoins',
      desc: 'Exclusive custom badge and permanent bragging rights on the league leaderboard.',
      badge: 'Cosmetic',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:px-8 text-slate-100 selection:bg-amber-500/30">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Bar */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Hub</span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Arcade Launching Soon
          </span>
        </div>

        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto pt-4 pb-12">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 mb-6 shadow-lg shadow-amber-500/10">
            <Dice5 className="h-12 w-12 text-amber-400 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Winko&apos;s Arcade
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            A weekly mini-game arena built for the pool. Play on game days, rack up Winkoins, and redeem your stack for real draft advantages.
          </p>
        </div>

        {/* 2 Core Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          {/* Weekly Schedule */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Weekly Schedule</h2>
                <p className="text-xs text-slate-400">4 Game Drops Every Week</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Games launch automatically on designated NHL game nights:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scheduleDays.map((item) => (
                <div
                  key={item.day}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-400 uppercase tracking-wide">{item.day}</span>
                    <Clock className="h-3 w-3 text-slate-500" />
                  </div>
                  <div className="text-sm font-bold text-slate-100 mt-1">{item.label}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Earn & Redeem */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Earn &amp; Redeem Winkoins</h2>
                <p className="text-xs text-slate-400">Competitive Fantasy Rewards</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Stack <strong className="text-amber-300">Winkoins</strong> for victories, top scores, and perfect streak predictions.
            </p>
            <div className="space-y-2.5">
              {prizes.map((p) => (
                <div
                  key={p.title}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">{p.title}</span>
                      <span className="rounded bg-amber-400/15 px-1.5 py-0.2 text-[10px] font-extrabold uppercase text-amber-300 border border-amber-400/30">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-amber-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                    {p.cost}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Games Coming Soon Section */}
        <div className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-amber-400 border border-slate-700">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-100">
                Games Coming Soon
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              4 Mini-Games in Active Development
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingGames.map((game) => {
              const Icon = game.icon;
              return (
                <div
                  key={game.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${game.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                        {game.launch}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {game.category}
                    </div>
                    <h3 className="text-base font-black text-white mt-1">
                      {game.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {game.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Rewards:</span>
                    <span className="font-extrabold text-amber-300 flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {game.reward}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center py-6 border-t border-slate-800/80">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-6 py-2.5 text-xs text-slate-300 font-medium">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Stay tuned for the grand opening during this season&apos;s fantasy playoffs!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
