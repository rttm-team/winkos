import React, { useState, useEffect } from 'react';
import { Prospect, evaluateProspect } from '../types';
import { proxyImageUrl } from '../lib/utils';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Loader2,
  RefreshCw,
  Clock,
  Check,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  ExternalLink,
  Edit3,
  Trash2,
} from 'lucide-react';

interface ProspectListItemProps {
  prospect: Prospect;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateGP: (prospectId: string, delta: number) => void;
  onToggleProtection: (prospectId: string) => void;
  onTogglePromotion?: (prospectId: string) => void;
  onSyncProspect?: (prospectId: string) => void;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => void;
}

export const ProspectListItem: React.FC<ProspectListItemProps> = ({
  prospect,
  isExpanded,
  onToggleExpand,
  onUpdateGP,
  onToggleProtection,
  onTogglePromotion,
  onSyncProspect,
  onEdit,
  onDelete,
}) => {
  const [imgError, setImgError] = useState(false);
  const ev = evaluateProspect(prospect);
  const isGoalie = prospect.position === 'G';
  const isSyncing = prospect.apiSyncStatus === 'syncing';

  // Safe GP numbers and limits ensuring clean 0 / 40 (Skaters) or 0 / 20 (Goalies)
  const safeSeasonGP = Number.isFinite(prospect.currentSeasonGP) ? Math.max(0, prospect.currentSeasonGP) : 0;
  const safeSeasonLimit = isGoalie ? 20 : 40;
  const safeTotalGP = Number.isFinite(ev.totalGP)
    ? Math.max(0, ev.totalGP)
    : Number.isFinite(prospect.totalGames)
    ? Math.max(0, prospect.totalGames)
    : 0;
  const safeCumulativeLimit = isGoalie ? 30 : 65;
  const safeProtectionLimit = isGoalie ? 140 : 200;

  const safeSeasonProgress =
    safeSeasonLimit > 0 ? Math.min(100, Math.max(0, Math.round((safeSeasonGP / safeSeasonLimit) * 100))) : 0;
  const safeCumulativeProgress =
    safeCumulativeLimit > 0 ? Math.min(100, Math.max(0, Math.round((safeTotalGP / safeCumulativeLimit) * 100))) : 0;
  const safeProtectionProgress =
    safeProtectionLimit > 0 ? Math.min(100, Math.max(0, Math.round((safeTotalGP / safeProtectionLimit) * 100))) : 0;

  const safeSeasonRemaining = Math.max(0, safeSeasonLimit - safeSeasonGP);
  const safeCumulativeRemaining = Math.max(0, safeCumulativeLimit - safeTotalGP);
  const safeProtectionRemaining = Math.max(0, safeProtectionLimit - safeTotalGP);

  // Subtle badge conditions
  const isNoNhlRecord =
    prospect.syncBadge === 'No NHL Record' ||
    prospect.apiSyncStatus === 'no_record' ||
    (!prospect.nhlPlayerId && prospect.apiSyncStatus === 'fallback') ||
    prospect.matchFound === false;

  const isInDevelopment =
    prospect.syncBadge === 'In Development' ||
    prospect.hasEmptyStats === true ||
    (safeTotalGP === 0 && safeSeasonGP === 0);

  // Auto-sync when loaded if un-synced
  useEffect(() => {
    if (!prospect.lastSyncedAt && prospect.apiSyncStatus !== 'syncing' && onSyncProspect) {
      onSyncProspect(prospect.id);
    }
  }, [prospect.id]);

  // Position badge styling
  const posBadgeColor =
    prospect.position === 'F'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      : prospect.position === 'D'
      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  const posFullLabel =
    prospect.position === 'F' ? 'Forward' : prospect.position === 'D' ? 'Defenseman' : 'Goalie';

  return (
    <div
      id={`prospect-list-item-${prospect.id}`}
      className={`group rounded-xl border transition-all duration-200 overflow-hidden ${
        prospect.promoted
          ? 'border-emerald-500/40 bg-[#1e293b] shadow-md shadow-slate-950/40 hover:border-emerald-500/60'
          : ev.isMandatoryPromotion
          ? 'border-red-500/60 bg-[#1e293b] shadow-md shadow-red-950/40 hover:border-red-400'
          : ev.isWatchlist
          ? 'border-amber-500/50 bg-[#1e293b] shadow-md shadow-amber-950/30 hover:border-amber-400'
          : 'border-slate-800 bg-[#1e293b]/90 hover:border-slate-700 shadow-sm'
      }`}
    >
      {/* Top Accent Stripe */}
      <div
        className={`h-1 w-full ${
          prospect.promoted
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
            : ev.isMandatoryPromotion
            ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse'
            : ev.isWatchlist
            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
            : prospect.isProtected
            ? 'bg-gradient-to-r from-cyan-500 to-emerald-500'
            : 'bg-slate-700/60'
        }`}
      />

      {/* Main Collapsed / Header Row */}
      <div className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Expand toggle, Player Headshot/Avatar, Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-slate-600 transition-colors"
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-cyan-400" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Player Photo or Avatar Initials */}
          <div className="relative shrink-0">
            {prospect.photoUrl && !imgError ? (
              <img
                src={proxyImageUrl(prospect.photoUrl)}
                alt={prospect.name}
                referrerPolicy="no-referrer"
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-slate-700 bg-slate-800"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-slate-800 font-bold text-slate-300 border border-slate-700 text-sm">
                {(prospect.name || 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
            )}
            <span
              className={`absolute -bottom-1 -right-1 rounded-md px-1 py-0.2 text-[9px] font-black border uppercase ${posBadgeColor}`}
              title={posFullLabel}
            >
              {prospect.position}
            </span>
          </div>

          {/* Player Name, Team, Draft Year, Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={onToggleExpand}
                className="font-bold text-sm sm:text-base text-slate-100 truncate cursor-pointer hover:text-cyan-300 transition-colors"
              >
                {prospect.name}
              </span>

              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-300 border border-slate-700 font-mono shrink-0">
                {prospect.nhlTeamAbbr}
              </span>

              <span className="text-[11px] text-slate-400 shrink-0">
                {prospect.draftYear} Draft
                {prospect.age ? ` • Age ${prospect.age}` : ''}
              </span>
            </div>

            {/* Badges Row */}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
              {prospect.promoted ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 font-bold text-emerald-300 border border-emerald-700/60">
                  <Check className="h-2.5 w-2.5" />
                  Promoted
                </span>
              ) : ev.isMandatoryPromotion ? (
                <span className="inline-flex items-center gap-1 rounded bg-red-950/90 px-1.5 py-0.5 font-bold text-red-300 border border-red-700/80 animate-pulse">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Mandatory Promotion
                </span>
              ) : ev.isWatchlist ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 px-1.5 py-0.5 font-bold text-amber-300 border border-amber-700/60">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Watchlist ({ev.seasonGamesRemaining} GP Left)
                </span>
              ) : null}

              {prospect.isProtected && (
                <span className="inline-flex items-center gap-1 rounded bg-cyan-950/80 px-1.5 py-0.5 font-bold text-cyan-300 border border-cyan-700/60">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Protected
                </span>
              )}

              {isInDevelopment && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-300 border border-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  In Development
                </span>
              )}

              {isNoNhlRecord && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-300 border border-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  No NHL Record
                </span>
              )}

              {isSyncing && (
                <span className="inline-flex items-center gap-1 rounded bg-cyan-950/80 px-1.5 py-0.5 font-semibold text-cyan-300 border border-cyan-700/60 animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  Syncing
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Miniature Progress Bars */}
        <div className="flex flex-row sm:flex-row items-center gap-3 sm:gap-4 shrink-0 pl-11 lg:pl-0">
          {/* Season GP mini gauge */}
          <div className="w-32 sm:w-36 text-[11px]">
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Season GP</span>
              <span className="font-mono font-bold text-slate-200">
                {safeSeasonGP} / {safeSeasonLimit}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  safeSeasonGP >= safeSeasonLimit
                    ? 'bg-red-500'
                    : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                }`}
                style={{ width: `${safeSeasonProgress}%` }}
              />
            </div>
          </div>

          {/* Cumulative GP mini gauge */}
          <div className="w-32 sm:w-36 text-[11px]">
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>Career GP</span>
              <span className="font-mono font-bold text-slate-200">
                {safeTotalGP} / {safeCumulativeLimit}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  safeTotalGP >= safeCumulativeLimit
                    ? 'bg-red-500'
                    : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                }`}
                style={{ width: `${safeCumulativeProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center pl-11 lg:pl-0">
          {/* Protection Toggle */}
          <button
            type="button"
            onClick={() => onToggleProtection(prospect.id)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
              prospect.isProtected
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
            }`}
            title="Toggle protected status"
          >
            {prospect.isProtected ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Protected</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Protect</span>
              </>
            )}
          </button>

          {/* Promotion Toggle */}
          {onTogglePromotion && (
            <button
              type="button"
              onClick={() => onTogglePromotion(prospect.id)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors ${
                prospect.promoted
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : ev.isMandatoryPromotion
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-sm shadow-red-600/30'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/40 hover:bg-emerald-900/50'
              }`}
              title={prospect.promoted ? 'Return player to prospect pool' : 'Promote to active fantasy roster'}
            >
              <Check className="h-3 w-3" />
              <span>{prospect.promoted ? 'Demote' : 'Promote'}</span>
            </button>
          )}

          {/* Manual Sync */}
          {onSyncProspect && (
            <button
              type="button"
              onClick={() => onSyncProspect(prospect.id)}
              disabled={isSyncing}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-slate-600 transition-colors disabled:opacity-40"
              title="Sync with NHL API"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}

          {/* Edit Button */}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(prospect)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
              title="Edit prospect details"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(prospect.id)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
              title="Delete prospect from pool"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Expand Details Trigger */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
          >
            <span>{isExpanded ? 'Less' : 'Details'}</span>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Subpanel Details */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-900/80 p-4 sm:p-5 space-y-4">
          {/* Top metadata & Sync details bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {prospect.nhlPlayerId && (
                <span className="font-mono text-[11px] text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                  NHL Player ID: #{prospect.nhlPlayerId}
                </span>
              )}
              {prospect.syncSource && (
                <span className="text-slate-400">
                  Source: <strong className="text-slate-300 font-mono">{prospect.syncSource}</strong>
                </span>
              )}
            </div>

            {prospect.lastSyncedAt && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3 text-slate-500" />
                <span>Last Updated: <strong className="text-slate-300 font-mono">{prospect.lastSyncedAt}</strong></span>
              </div>
            )}
          </div>

          {/* Simulation & GP breakdown box */}
          <div className="rounded-xl bg-[#1e293b] p-3 sm:p-4 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total NHL Games Played
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black font-mono text-slate-100">
                  {safeTotalGP}
                </span>
                <span className="text-xs text-slate-400 font-medium">NHL GP</span>
                <span className="text-xs text-slate-400 pl-2">
                  (Season: <strong className="text-slate-200 font-mono">{safeSeasonGP}</strong> + Prior: <strong className="text-slate-200 font-mono">{Number.isFinite(prospect.priorCareerGP) ? Math.max(0, prospect.priorCareerGP) : 0}</strong>)
                </span>
              </div>
            </div>

            {/* Simulation controls (- / + GP) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400">Test Simulation:</span>
              <div className="inline-flex items-center rounded-lg bg-slate-800 border border-slate-700 p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => onUpdateGP(prospect.id, -5)}
                  disabled={safeSeasonGP < 5}
                  className="rounded px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-colors"
                  title="Subtract 5 simulated games"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateGP(prospect.id, -1)}
                  disabled={safeSeasonGP <= 0}
                  className="rounded px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-colors"
                  title="Subtract 1 simulated game"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <div className="px-2 font-mono text-xs font-bold text-cyan-400">
                  {safeSeasonGP} GP
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateGP(prospect.id, 1)}
                  className="rounded px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  title="Add 1 simulated game"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateGP(prospect.id, 5)}
                  className="rounded px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  title="Add 5 simulated games"
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* Rule Threshold Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rule 1: Single-Season GP */}
            <div className="rounded-xl bg-[#1e293b] p-3.5 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">
                  Single-Season GP <span className="text-[10px] text-slate-400">({isGoalie ? 'Limit: 20' : 'Limit: 40'})</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {safeSeasonGP} / {safeSeasonLimit} GP
                </span>
              </div>

              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeSeasonGP >= safeSeasonLimit
                      ? 'bg-red-500'
                      : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  }`}
                  style={{ width: `${safeSeasonProgress}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {safeSeasonGP >= safeSeasonLimit ? (
                    <span className="font-bold text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" /> Threshold Reached
                    </span>
                  ) : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0 ? (
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 inline" /> {safeSeasonRemaining} GP until promotion
                    </span>
                  ) : (
                    <span>{safeSeasonRemaining} games cushion</span>
                  )}
                </span>
                <span className="font-mono font-semibold text-slate-400">{safeSeasonProgress}%</span>
              </div>
            </div>

            {/* Rule 2: Cumulative Career GP */}
            <div className="rounded-xl bg-[#1e293b] p-3.5 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">
                  Cumulative Career GP <span className="text-[10px] text-slate-400">({isGoalie ? 'Limit: 30' : 'Limit: 65'})</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {safeTotalGP} / {safeCumulativeLimit} GP
                </span>
              </div>

              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeTotalGP >= safeCumulativeLimit
                      ? 'bg-red-500'
                      : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  }`}
                  style={{ width: `${safeCumulativeProgress}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {safeTotalGP >= safeCumulativeLimit ? (
                    <span className="font-bold text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" /> Threshold Reached
                    </span>
                  ) : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0 ? (
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 inline" /> {safeCumulativeRemaining} GP until promotion
                    </span>
                  ) : (
                    <span>{safeCumulativeRemaining} games cushion</span>
                  )}
                </span>
                <span className="font-mono font-semibold text-slate-400">{safeCumulativeProgress}%</span>
              </div>
            </div>
          </div>

          {/* Rule 3: Protection Cap Limit */}
          {(prospect.promoted || safeTotalGP >= (isGoalie ? 20 : 40)) && (
            <div className="rounded-xl bg-[#1e293b] p-3.5 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Protection Cap Limit</span>
                  <span className="text-[10px] text-slate-400">({isGoalie ? 'Goalie: 140 GP' : 'Skater: 200 GP'})</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-300">
                  {safeTotalGP} / {safeProtectionLimit} GP
                </span>
              </div>

              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeTotalGP >= safeProtectionLimit ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                  }`}
                  style={{ width: `${safeProtectionProgress}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {safeTotalGP >= safeProtectionLimit ? (
                    <span className="text-red-400 font-bold">Ineligible: exceeded {safeProtectionLimit} GP limit</span>
                  ) : (
                    <span>{safeProtectionRemaining} GP cushion remaining</span>
                  )}
                </span>
                <span className="font-mono">{safeProtectionProgress}%</span>
              </div>
            </div>
          )}

          {/* Notes or Status Report */}
          {prospect.statusNotes && (
            <p className="text-xs text-slate-400 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
              "{prospect.statusNotes}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};
