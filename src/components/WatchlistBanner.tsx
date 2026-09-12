import React from 'react';
import { Prospect, evaluateProspect } from '../types';
import { AlertCircle, AlertTriangle, ChevronRight, Bell, Sparkles, Shield } from 'lucide-react';

interface WatchlistBannerProps {
  prospects: Prospect[];
  onSelectProspect?: (prospectId: string) => void;
  onFilterActionRequired?: () => void;
}

export const WatchlistBanner: React.FC<WatchlistBannerProps> = ({
  prospects,
  onSelectProspect,
  onFilterActionRequired,
}) => {
  // Evaluate all prospects for active GM
  const items = prospects
    .map((p) => ({
      prospect: p,
      eval: evaluateProspect(p),
    }))
    .filter(({ eval: ev }) => ev.isMandatoryPromotion || ev.isWatchlist);

  if (items.length === 0) {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-emerald-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-200">
              Roster Threshold Clear
            </div>
            <div className="text-xs text-emerald-400/90">
              All prospects have a comfortable games-played buffer. No mandatory promotions pending.
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-emerald-300">
          All Safe
        </span>
      </div>
    );
  }

  const mandatoryItems = items.filter(({ eval: ev }) => ev.isMandatoryPromotion);
  const watchItems = items.filter(({ eval: ev }) => ev.isWatchlist);

  return (
    <div
      id="promotion-watchlist-banner"
      className="mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl shadow-slate-950/50"
    >
      {/* Banner Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-700/60 bg-slate-800/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                Promotion Watchlist Banner
              </h2>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-extrabold text-red-300 border border-red-500/40">
                {items.length} {items.length === 1 ? 'Alert' : 'Alerts'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Mandatory active roster call-ups & prospects within 5 games of threshold
            </p>
          </div>
        </div>

        {onFilterActionRequired && (
          <button
            onClick={onFilterActionRequired}
            className="mt-2 sm:mt-0 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>Filter Roster by Alerts</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Banner Items Grid */}
      <div className="divide-y divide-slate-800/80 p-2 sm:p-3">
        {items.map(({ prospect, eval: ev }) => {
          const isMandatory = ev.isMandatoryPromotion;
          const isGoalie = prospect.position === 'G';

          return (
            <div
              key={prospect.id}
              onClick={() => onSelectProspect?.(prospect.id)}
              className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl transition-all cursor-pointer ${
                isMandatory
                  ? 'bg-red-950/25 hover:bg-red-950/40 border border-red-800/40 my-1'
                  : 'bg-amber-950/20 hover:bg-amber-950/35 border border-amber-800/30 my-1'
              }`}
            >
              {/* Player Identity & Alert Tag */}
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-md ${
                    isMandatory
                      ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-red-500/20'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {isMandatory ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {prospect.name}
                    </span>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                      {prospect.position} • {prospect.nhlTeamAbbr}
                    </span>
                    {isMandatory ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300 border border-red-500/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping"></span>
                        MANDATORY PROMOTION
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/40">
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        WITHIN 5 GAMES
                      </span>
                    )}
                    {prospect.isProtected && (
                      <span className="rounded-md bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-800/60">
                        Protected
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-300">
                    {isMandatory ? (
                      <span className="font-semibold text-red-200">
                        {prospect.currentSeasonGP >= ev.seasonLimit && ev.totalGP >= ev.cumulativeLimit
                          ? `Crossed BOTH thresholds: ${prospect.currentSeasonGP}/${ev.seasonLimit} Season GP & ${ev.totalGP}/${ev.cumulativeLimit} Career GP!`
                          : prospect.currentSeasonGP >= ev.seasonLimit
                          ? `Hit the ${ev.seasonLimit}-game single-season threshold (${prospect.currentSeasonGP} GP played)! Must be promoted to active roster.`
                          : `Surpassed the ${ev.cumulativeLimit}-game career threshold (${ev.totalGP} GP played)! Must be promoted.`}
                      </span>
                    ) : (
                      <span className="text-amber-200">
                        {ev.seasonGamesRemaining <= 5 && ev.seasonGamesRemaining > 0 && ev.cumulativeGamesRemaining <= 5 && ev.cumulativeGamesRemaining > 0
                          ? `⚠️ Critical: Only ${ev.seasonGamesRemaining} GP until Season limit (${ev.seasonLimit}) AND ${ev.cumulativeGamesRemaining} GP until Career limit (${ev.cumulativeLimit})!`
                          : ev.seasonGamesRemaining <= 5 && ev.seasonGamesRemaining > 0
                          ? `Only ${ev.seasonGamesRemaining} game${ev.seasonGamesRemaining === 1 ? '' : 's'} away from the ${ev.seasonLimit}-game season threshold (${prospect.currentSeasonGP}/${ev.seasonLimit} GP).`
                          : `Only ${ev.cumulativeGamesRemaining} game${ev.cumulativeGamesRemaining === 1 ? '' : 's'} away from the ${ev.cumulativeLimit}-game career threshold (${ev.totalGP}/${ev.cumulativeLimit} GP).`}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress Gauges Preview */}
              <div className="flex items-center gap-3 sm:self-center shrink-0 pl-12 sm:pl-0">
                {(() => {
                  const safeSeasonGP = Number.isFinite(prospect.currentSeasonGP) ? Math.max(0, prospect.currentSeasonGP) : 0;
                  const safeSeasonLimit = isGoalie ? 20 : 40;
                  const safeTotalGP = Number.isFinite(ev.totalGP) ? Math.max(0, ev.totalGP) : (Number.isFinite(prospect.totalGames) ? Math.max(0, prospect.totalGames) : 0);
                  const safeCumulativeLimit = isGoalie ? 30 : 65;
                  const safeSeasonPercent = safeSeasonLimit > 0 ? Math.min(100, Math.max(0, Math.round((safeSeasonGP / safeSeasonLimit) * 100))) : 0;
                  const safeCumulativePercent = safeCumulativeLimit > 0 ? Math.min(100, Math.max(0, Math.round((safeTotalGP / safeCumulativeLimit) * 100))) : 0;

                  return (
                    <div className="flex flex-col gap-1 w-44 sm:w-48 text-[11px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Season GP</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {safeSeasonGP} / {safeSeasonLimit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            safeSeasonGP >= safeSeasonLimit
                              ? 'bg-red-500'
                              : ev.seasonGamesRemaining <= 5
                              ? 'bg-amber-400'
                              : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          }`}
                          style={{ width: `${safeSeasonPercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-slate-400 pt-0.5">
                        <span>Career GP</span>
                        <span className="font-mono font-semibold text-slate-200">
                          {safeTotalGP} / {safeCumulativeLimit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            safeTotalGP >= safeCumulativeLimit
                              ? 'bg-red-500'
                              : ev.cumulativeGamesRemaining <= 5
                              ? 'bg-amber-400'
                              : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          }`}
                          style={{ width: `${safeCumulativePercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                <ChevronRight className="hidden sm:block h-5 w-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
