import React from 'react';
import { Check, Sparkles, AlertCircle, Plus, Minus, Info } from 'lucide-react';

interface Season25GPMarkersProps {
  count: number;
  max?: number;
  totalGP?: number;
  isPromoted?: boolean;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showSubtext?: boolean;
  showStepper?: boolean;
  onCountChange?: (newCount: number) => void;
  className?: string;
}

export const Season25GPMarkers: React.FC<Season25GPMarkersProps & { prospect?: any }> = ({
  count = 0,
  max = 4,
  totalGP = 0,
  isPromoted = false,
  interactive = false,
  size = 'md',
  showLabel = true,
  showSubtext = false,
  showStepper = false,
  onCountChange,
  className = '',
  prospect,
}) => {
  // Use prospect.season_breakdown if available, otherwise fallback to count
  let effectiveCount = count;
  if (prospect?.season_breakdown) {
    let breakdown = prospect.season_breakdown;
    if (typeof breakdown === 'string') {
      try {
        breakdown = JSON.parse(breakdown);
      } catch (e) {
        console.error("Failed to parse season breakdown", e);
        breakdown = [];
      }
    }
    
    if (Array.isArray(breakdown)) {
      effectiveCount = breakdown.filter((s: any) => s.qualifies).length;
    }
  }
  
  const safeCount = Math.min(max, Math.max(0, effectiveCount));
  const isReached = safeCount >= max;
  const isWatchlist = safeCount === max - 1 && !isReached;
  const isUnder200GP = totalGP < 200;

  const handleMarkerClick = (markerIndex: number) => {
    if (!interactive || !onCountChange) return;
    // markerIndex is 1-based (1, 2, 3, 4)
    if (safeCount === markerIndex) {
      // Toggle off if clicking the last active
      onCountChange(markerIndex - 1);
    } else {
      onCountChange(markerIndex);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCountChange || safeCount >= max) return;
    onCountChange(safeCount + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCountChange || safeCount <= 0) return;
    onCountChange(safeCount - 1);
  };

  // Size styling configuration
  const circleSizeClasses = {
    sm: 'h-4 w-4 text-[9px]',
    md: 'h-6 w-6 text-[10px]',
    lg: 'h-7 w-7 text-xs',
  }[size];

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  }[size];

  // Compact sm mode (e.g. for list items or card headers)
  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={`25+ GP Seasons: ${safeCount} of ${max} hit${isReached ? ' (Mandatory promotion threshold reached before 200 GP)' : ''}`}
      >
        {showLabel && (
          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
            25+ GP:
          </span>
        )}

        <div className="flex items-center gap-1">
          {Array.from({ length: max }).map((_, i) => {
            const markerNum = i + 1;
            const isFilled = markerNum <= safeCount;

            return (
              <button
                key={i}
                type="button"
                disabled={!interactive}
                onClick={() => handleMarkerClick(markerNum)}
                className={`flex items-center justify-center rounded-full transition-all duration-200 ${circleSizeClasses} ${
                  interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
                } ${
                  isFilled
                    ? isReached
                      ? 'bg-rose-700/80 text-rose-100 font-bold border border-rose-600/40 ring-1 ring-rose-500/30'
                      : isWatchlist
                      ? 'bg-amber-700/70 text-amber-100 font-bold border border-amber-600/40 ring-1 ring-amber-500/30'
                      : 'bg-slate-600/70 text-slate-100 font-bold border border-slate-500/40 ring-1 ring-slate-400/30'
                    : 'bg-slate-800/80 border border-slate-700 text-slate-500 font-medium'
                }`}
                aria-label={`Season ${markerNum} 25+ GP: ${isFilled ? 'Reached' : 'Not reached'}`}
              >
                {isFilled ? (
                  <span className="leading-none">{markerNum}</span>
                ) : (
                  <span className="leading-none opacity-60">{markerNum}</span>
                )}
              </button>
            );
          })}
        </div>

        <span
          className={`font-mono text-[10px] font-bold ${
            isReached
              ? 'text-rose-300/90 font-bold'
              : isWatchlist
              ? 'text-amber-300/90'
              : 'text-slate-400'
          }`}
        >
          {safeCount}/{max}
        </span>
      </div>
    );
  }

  // Full/Card mode
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        isReached
          ? 'border-rose-900/40 bg-rose-950/20'
          : isWatchlist
          ? 'border-amber-900/35 bg-amber-950/15'
          : 'border-slate-800 bg-slate-900/60'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-200">
            4 Seasons of 25+ GP
          </span>
          <span
            className="inline-flex text-slate-400 hover:text-slate-300 transition-colors"
            title="League Rule: When a prospect reaches 4 distinct NHL seasons of 25+ GP before reaching 200 GP, it triggers mandatory promotion to the active roster."
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {isReached ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/50 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-800/40">
              <AlertCircle className="h-3 w-3 text-rose-400/80" />
              Prompt to Promote
            </span>
          ) : isWatchlist ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/50 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-800/40">
              <Sparkles className="h-2.5 w-2.5 text-amber-400/80" />
              1 Season Away
            </span>
          ) : (
            <span className="text-[11px] font-mono font-semibold text-slate-400">
              {safeCount} / {max} Hit
            </span>
          )}

          {/* Stepper Buttons for testing/adjusting */}
          {showStepper && onCountChange && (
            <div className="inline-flex items-center rounded-lg bg-slate-800 border border-slate-700 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={safeCount <= 0}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-colors"
                title="Decrease 25+ GP seasons count"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={safeCount >= max}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-colors"
                title="Increase 25+ GP seasons count"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Circle Markers Row */}
      <div className="flex items-center justify-between gap-2 py-1">
        {Array.from({ length: max }).map((_, i) => {
          const markerNum = i + 1;
          const isFilled = markerNum <= safeCount;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => handleMarkerClick(markerNum)}
                className={`flex items-center justify-center rounded-full transition-all duration-300 ${circleSizeClasses} ${
                  interactive
                    ? 'cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400'
                    : 'cursor-default'
                } ${
                  isFilled
                    ? isReached
                      ? 'bg-rose-700/85 text-rose-100 font-bold border border-rose-600/50 ring-1 ring-rose-500/40'
                      : isWatchlist
                      ? 'bg-amber-700/75 text-amber-100 font-bold border border-amber-600/50 ring-1 ring-amber-500/40'
                      : 'bg-slate-600/80 text-slate-100 font-bold border border-slate-500/50 ring-1 ring-slate-400/40'
                    : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
                title={
                  interactive
                    ? `Click to set ${markerNum} seasons with 25+ GP`
                    : `Season ${markerNum}: ${isFilled ? '25+ GP achieved' : 'Not yet reached'}`
                }
              >
                {isFilled ? (
                  isReached ? (
                    <Check className={`${iconSizes} stroke-[3]`} />
                  ) : (
                    <span>{markerNum}</span>
                  )
                ) : (
                  <span className="font-mono">{markerNum}</span>
                )}
              </button>

              <span className="text-[10px] font-medium text-slate-400 truncate max-w-full text-center">
                {isFilled ? '25+ GP' : `Season ${markerNum}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Subtext description / notification */}
      {showSubtext && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          {isReached ? (
            <div className="flex items-center gap-1.5 text-rose-300/90 font-medium">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400/80 shrink-0" />
              <span>
                {isUnder200GP
                  ? 'Hit 4 seasons of 25+ GP before 200 GP. Status requires promotion.'
                  : 'Hit 4 seasons of 25+ GP.'}
              </span>
            </div>
          ) : isWatchlist ? (
            <div className="flex items-center gap-1.5 text-amber-300/90 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
              <span>3 of 4 seasons hit — 1 more season of 25+ GP prompts promotion.</span>
            </div>
          ) : (
            <div className="text-slate-400">
              <span>{max - safeCount} seasons of 25+ GP remaining before promotion prompt.</span>
            </div>
          )}

          {interactive && (
            <span className="text-[10px] text-slate-500 italic shrink-0">
              Click circle to simulate
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const SeasonThresholdMarkers: React.FC<Season25GPMarkersProps & { prospect?: any }> = ({
  count = 0,
  max = 4,
  className = '',
  prospect,
}) => {
  let effectiveCount = count;
  if (prospect?.season_breakdown) {
    let breakdown = prospect.season_breakdown;
    if (typeof breakdown === 'string') {
      try {
        breakdown = JSON.parse(breakdown);
      } catch (e) {
        console.error("Failed to parse season breakdown in SeasonThresholdMarkers", e);
        breakdown = [];
      }
    }
    
    if (Array.isArray(breakdown)) {
      effectiveCount = breakdown.filter((s: any) => s.qualifies).length;
    }
  }
  const safeCount = Math.min(max, Math.max(0, effectiveCount));
  const isReached = safeCount >= max;
  const isWatchlist = safeCount === max - 1;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 ${className}`}
      title={`Seasons with 25+ GP: ${safeCount} of ${max}`}
    >
      <span className="text-[10px] font-semibold text-slate-400 font-mono tracking-tight">25+ GP:</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const filled = i + 1 <= safeCount;
          return (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                filled
                  ? isReached
                    ? 'bg-rose-600/80 ring-1 ring-rose-500/40'
                    : isWatchlist
                    ? 'bg-amber-600/80 ring-1 ring-amber-500/40'
                    : 'bg-slate-500 ring-1 ring-slate-400/40'
                  : 'bg-slate-700/80 border border-slate-600/60'
              }`}
            />
          );
        })}
      </div>
      <span
        className={`text-[10px] font-mono font-bold ${
          isReached ? 'text-rose-300/90' : isWatchlist ? 'text-amber-300/90' : 'text-slate-400'
        }`}
      >
        {safeCount}/{max}
      </span>
    </div>
  );
};

