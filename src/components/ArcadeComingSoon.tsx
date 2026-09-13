import React from 'react';
import { Calendar, Coins, Trophy, Dice5, Sparkles, ArrowLeft } from 'lucide-react';

export default function ArcadeComingSoon({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-950 p-6 sm:p-12 text-slate-100">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Hub
      </button>

      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-8">
          <Dice5 className="h-12 w-12 text-amber-400 animate-pulse" />
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-6">Winko's Arcade: Coming Soon</h1>
        <p className="text-lg text-slate-400 mb-12">
          Get ready to play! We're bringing a new level of competition to the pool.
        </p>

        <div className="grid gap-6 md:grid-cols-2 text-left mb-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Calendar className="h-8 w-8 text-sky-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Weekly Schedule</h3>
            <p className="text-slate-400">New games launch every:</p>
            <ul className="mt-3 font-semibold text-sky-200">
              <li>Tuesday</li>
              <li>Thursday</li>
              <li>Saturday</li>
              <li>Sunday</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Coins className="h-8 w-8 text-amber-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Earn & Redeem</h3>
            <p className="text-slate-400">
              Rack up <strong>Winkoins</strong> by playing and winning. Redeem them for exclusive prizes like:
            </p>
            <ul className="mt-3 font-semibold text-amber-200">
              <li>Extra entry pick in the draft</li>
              <li>Pool bragging rights</li>
            </ul>
          </div>
        </div>
        
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 px-6 py-3 text-slate-300 font-medium">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Stay tuned for the grand opening!</span>
        </div>
      </div>
    </div>
  );
}
