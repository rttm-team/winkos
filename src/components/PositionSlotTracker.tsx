import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Zap, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface PositionSlotTrackerProps {
  selectedGM: string;
  seasonId?: string;
  theme?: 'light' | 'dark';
}

interface SummaryData {
  season_id: string;
  gm_name: string;
  forwards_gp_used: number;
  forwards_gp_max: number;
  forwards_gp_remaining: number;
  defense_gp_used: number;
  defense_gp_max: number;
  defense_gp_remaining: number;
  goalies_gp_used: number;
  goalies_gp_max: number;
  goalies_gp_remaining: number;
  total_gp_used: number;
  total_gp_max: number;
  total_gp_remaining: number;
}

interface CappedSlotData {
  id: number;
  season_id: string;
  gm_name: string;
  player_name: string;
  slot_position: string;
  position: string;
  nhl_team: string;
  raw_gp: number;
  effective_gp: number;
  slot_games_remaining: number;
  raw_fantasy_points: number;
  effective_fantasy_points: number;
}

export default function PositionSlotTracker({
  selectedGM,
  seasonId = '2026-2027',
  theme = 'dark',
}: PositionSlotTrackerProps) {
  const isLight = theme === 'light';
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [cappedSlots, setCappedSlots] = useState<CappedSlotData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!selectedGM) return;
      setLoading(true);
      try {
        const [summaryRes, cappedRes] = await Promise.all([
          supabase
            .from('v_gm_position_caps_summary')
            .select('*')
            .eq('season_id', seasonId)
            .eq('gm_name', selectedGM)
            .maybeSingle(),
          supabase
            .from('v_active_roster_capped')
            .select('*')
            .eq('season_id', seasonId)
            .eq('gm_name', selectedGM),
        ]);

        if (isMounted) {
          if (summaryRes.data) {
            setSummary(summaryRes.data);
          } else {
            // Fallback default if view returns empty
            setSummary({
              season_id: seasonId,
              gm_name: selectedGM,
              forwards_gp_used: 0,
              forwards_gp_max: 738,
              forwards_gp_remaining: 738,
              defense_gp_used: 0,
              defense_gp_max: 328,
              defense_gp_remaining: 328,
              goalies_gp_used: 0,
              goalies_gp_max: 164,
              goalies_gp_remaining: 164,
              total_gp_used: 0,
              total_gp_max: 1230,
              total_gp_remaining: 1230,
            });
          }
          if (cappedRes.data) {
            setCappedSlots(cappedRes.data);
          }
        }
      } catch (err) {
        console.error('Error fetching Position Slot Tracker data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedGM, seasonId]);

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} animate-pulse`}>
        <div className="h-6 bg-slate-700/20 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-700/20 rounded-xl"></div>
          <div className="h-28 bg-slate-700/20 rounded-xl"></div>
          <div className="h-28 bg-slate-700/20 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const fUsed = summary?.forwards_gp_used ?? 0;
  const fMax = summary?.forwards_gp_max ?? 738;
  const fRem = summary?.forwards_gp_remaining ?? 738;
  const fPct = Math.min(100, Math.round((fUsed / fMax) * 100));

  const dUsed = summary?.defense_gp_used ?? 0;
  const dMax = summary?.defense_gp_max ?? 328;
  const dRem = summary?.defense_gp_remaining ?? 328;
  const dPct = Math.min(100, Math.round((dUsed / dMax) * 100));

  const gUsed = summary?.goalies_gp_used ?? 0;
  const gMax = summary?.goalies_gp_max ?? 164;
  const gRem = summary?.goalies_gp_remaining ?? 164;
  const gPct = Math.min(100, Math.round((gUsed / gMax) * 100));

  const totalUsed = summary?.total_gp_used ?? (fUsed + dUsed + gUsed);
  const totalMax = summary?.total_gp_max ?? 1230;
  const totalPct = Math.min(100, Math.round((totalUsed / totalMax) * 100));

  return (
    <div
      id="position-slot-tracker"
      className={`rounded-2xl border p-5 sm:p-6 shadow-xl transition-all ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
          : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/40'
      }`}
    >
      {/* Header & Overall Roster Meter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="h-3 w-3" />
              Rule 5 Caps Active
            </span>
            <span className="text-xs text-slate-400">Season {seasonId}</span>
          </div>
          <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            2026-27 Active Roster Games Tracker (82 GP Cap / Slot)
          </h2>
        </div>

        {/* Overall Total GP Counter */}
        <div className={`p-3 rounded-xl border flex items-center gap-4 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'}`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Roster GP</div>
            <div className="text-lg font-black font-mono text-emerald-400">
              {totalUsed} <span className="text-xs font-normal text-slate-400">/ {totalMax} GP</span>
            </div>
          </div>
          <div className="w-24 sm:w-32 bg-slate-700/30 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Position Group Meters (Side-by-Side Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Forwards Card (F1-F9) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400">Forwards (9 Slots)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                738 Max GP
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-2xl font-black font-mono text-white">{fUsed} <span className="text-xs text-slate-400">/ {fMax} GP</span></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${fRem > 100 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'}`}>
                {fRem} Plays Left
              </span>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-700/40 rounded-full h-2.5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${fPct > 90 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`}
                style={{ width: `${fPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Defense Card (D1-D4) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400">Defensemen (4 Slots)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20">
                328 Max GP
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-2xl font-black font-mono text-white">{dUsed} <span className="text-xs text-slate-400">/ {dMax} GP</span></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${dRem > 50 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'}`}>
                {dRem} Plays Left
              </span>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-700/40 rounded-full h-2.5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${dPct > 90 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-purple-600 to-indigo-400'}`}
                style={{ width: `${dPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Goalies Card (G1-G2) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">Goalies (2 Slots)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                164 Max GP
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-2xl font-black font-mono text-white">{gUsed} <span className="text-xs text-slate-400">/ {gMax} GP</span></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${gRem > 30 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'}`}>
                {gRem} Plays Left
              </span>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-700/40 rounded-full h-2.5 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${gPct > 90 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
                style={{ width: `${gPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
