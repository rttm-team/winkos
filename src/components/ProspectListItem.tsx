import React, { useState } from 'react';
import { Prospect, evaluateProspect } from '../types';
import { proxyImageUrl } from '../lib/utils';
import { Season25GPMarkers, SeasonThresholdMarkers } from './Season25GPMarkers';
import { PlayerActionOverflowMenu } from './PlayerActionOverflowMenu';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Loader2,
  Clock,
  Check,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface ProspectListItemProps {
  prospect: Prospect;
  isExpanded: boolean;
  isAdmin?: boolean;
  onToggleExpand: () => void;
  onUpdateGP: (prospectId: string, delta: number) => void;
  onToggleProtection: (prospectId: string) => void;
  onTogglePromotion?: (prospectId: string) => void;
  onSyncProspect?: (prospectId: string) => void;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => void;
  onUpdate25PlusSeasons?: (prospectId: string, count: number) => void;
  onToggleStatus: (prospectId: string) => void;
}

export const ProspectListItem: React.FC<ProspectListItemProps> = ({
  prospect,
  isExpanded,
  isAdmin = false,
  onToggleExpand,
  onUpdateGP,
  onToggleProtection,
  onTogglePromotion,
  onSyncProspect,
  onEdit,
  onDelete,
  onUpdate25PlusSeasons,
  onToggleStatus,
}) => {
  const isLight = (() => {
    try {
      return localStorage.getItem('winkos_theme') !== 'dark';
    } catch {
      return true;
    }
  })();

  const [imgError, setImgError] = useState(false);
  const ev = evaluateProspect(prospect);
  const isGoalie = prospect.position === 'G';
  const isSyncing = prospect.apiSyncStatus === 'syncing';

  // Safe GP numbers and limits ensuring clean 0 / 40 (Skaters) or 0 / 20 (Goalies)
  const safeSeasonGP = Number.isFinite(prospect.currentSeasonGP) ? Math.max(0, prospect.currentSeasonGP) : 0;
  const safeSeasonLimit = isGoalie ? 20 : 40;
  const gp = prospect.total_games ?? prospect.totalGames ?? 0;
  const safeTotalGP = Number.isFinite(ev.totalGP) && ev.totalGP > 0
    ? Math.max(0, ev.totalGP)
    : Math.max(0, gp);
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

  // NHL Scoring stats (with fallback to 0 or .000 if missing or null)
  const safeGoals = typeof prospect.goals === 'number' && !isNaN(prospect.goals) ? prospect.goals : 0;
  const safeAssists = typeof prospect.assists === 'number' && !isNaN(prospect.assists) ? prospect.assists : 0;
  const safePoints = typeof prospect.points === 'number' && !isNaN(prospect.points)
    ? prospect.points
    : (prospect.goals != null || prospect.assists != null ? safeGoals + safeAssists : 0);
  const safeWins = typeof prospect.wins === 'number' && !isNaN(prospect.wins) ? prospect.wins : 0;

  const formatSavePct = (val?: number | null): string => {
    if (val == null || isNaN(Number(val)) || Number(val) === 0) {
      return '.000';
    }
    const num = Number(val) > 1 ? Number(val) / 100 : Number(val);
    const fixed = num.toFixed(3);
    return fixed.startsWith('0') ? fixed.substring(1) : fixed;
  };
  const safeSavePct = formatSavePct(prospect.save_pct);

  // Subtle badge conditions
  const isNoNhlRecord =
    prospect.syncBadge === 'No NHL Record' ||
    prospect.apiSyncStatus === 'no_record' ||
    (!prospect.nhlPlayerId && prospect.apiSyncStatus === 'fallback') ||
    prospect.matchFound === false;

  const isTrashed = prospect.status === 'trashed' || prospect.status === 'inactive';

  const isInDevelopment =
    !isTrashed &&
    (prospect.syncBadge === 'In Development' ||
      prospect.hasEmptyStats === true ||
      (safeTotalGP === 0 && safeSeasonGP === 0));

  const isPromotedAndProtected = Boolean(
    prospect.promoted && (prospect.isProtected || (prospect as any).protected)
  );

  // Position badge styling
  const posBadgeColor =
    prospect.position === 'F'
      ? 'bg-blue-950/40 text-blue-300/90 border-blue-800/40'
      : prospect.position === 'D'
      ? 'bg-indigo-950/40 text-indigo-300/90 border-indigo-800/40'
      : 'bg-emerald-950/40 text-emerald-300/90 border-emerald-800/40';

  const posFullLabel =
    prospect.position === 'F' ? 'Forward' : prospect.position === 'D' ? 'Defenseman' : 'Goalie';

  return (
    <div
      id={`prospect-list-item-${prospect.id}`}
      className={`group rounded-xl border transition-all duration-200 overflow-hidden ${
        isLight
          ? isTrashed
            ? 'border-slate-200 bg-slate-100 opacity-70 hover:opacity-100 shadow-sm text-slate-800'
            : isPromotedAndProtected
            ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50/50 shadow-sm hover:border-purple-400 text-slate-900'
            : prospect.promoted
            ? 'border-emerald-300 bg-emerald-50/70 shadow-sm hover:border-emerald-400 text-slate-900'
            : ev.isMandatoryPromotion
            ? 'border-rose-300 bg-rose-50/70 shadow-sm hover:border-rose-400 text-slate-900'
            : ev.isWatchlist
            ? 'border-amber-300 bg-amber-50/70 shadow-sm hover:border-amber-400 text-slate-900'
            : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm text-slate-900'
          : isTrashed
          ? 'border-slate-800/80 bg-[#151c28]/90 opacity-80 hover:opacity-100 hover:border-slate-700 shadow-sm text-slate-100'
          : isPromotedAndProtected
          ? 'border-purple-800/50 bg-gradient-to-r from-[#181628] to-[#141524] shadow-sm hover:border-purple-700/60 text-slate-100'
          : prospect.promoted
          ? 'border-emerald-800/40 bg-[#182333] shadow-sm hover:border-emerald-700/50 text-slate-100'
          : ev.isMandatoryPromotion
          ? 'border-rose-800/50 bg-[#221a22] shadow-sm hover:border-rose-700/60 text-slate-100'
          : ev.isWatchlist
          ? 'border-amber-800/40 bg-[#222128] shadow-sm hover:border-amber-700/50 text-slate-100'
          : 'border-slate-800 bg-[#1e293b]/90 hover:border-slate-700 shadow-sm text-slate-100'
      }`}
    >
      {/* Top Accent Stripe */}
      <div
        className={`h-1 w-full ${
          isTrashed
            ? 'bg-slate-700/40'
            : isPromotedAndProtected
            ? 'bg-gradient-to-r from-purple-800/80 via-indigo-800/70 to-purple-800/80'
            : prospect.promoted
            ? 'bg-gradient-to-r from-emerald-800/80 via-teal-800/70 to-emerald-800/80'
            : ev.isMandatoryPromotion
            ? 'bg-gradient-to-r from-rose-800/80 via-red-800/70 to-rose-800/80'
            : ev.isWatchlist
            ? 'bg-gradient-to-r from-amber-700/80 via-amber-800/70 to-amber-700/80'
            : prospect.isProtected
            ? 'bg-gradient-to-r from-slate-600/70 to-teal-800/60'
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
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-cyan-700 hover:border-slate-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-slate-600'
            }`}
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronDown className={`h-4 w-4 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
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
                className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border bg-slate-800 ${
                  isPromotedAndProtected
                    ? 'border-purple-500/70 shadow-sm shadow-purple-950/50'
                    : 'border-slate-700'
                }`}
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border text-sm font-bold ${
                  isPromotedAndProtected
                    ? 'bg-purple-950/70 text-purple-300 border-purple-500/60 shadow-sm shadow-purple-950/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
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
                className={`font-bold text-sm sm:text-base truncate cursor-pointer transition-colors ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                } ${
                  isPromotedAndProtected ? (isLight ? 'hover:text-purple-700' : 'hover:text-purple-300') : (isLight ? 'hover:text-cyan-700' : 'hover:text-cyan-300')
                }`}
              >
                {prospect.name}
              </span>

              <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold font-mono shrink-0 border ${
                isLight ? 'bg-slate-100 text-cyan-800 border-slate-300' : 'bg-slate-800 text-cyan-300 border-slate-700'
              }`}>
                {prospect.nhlTeamAbbr}
              </span>

              <span className={`text-[11px] shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {prospect.draftYear} Draft
                {prospect.age ? ` • Age ${prospect.age}` : ''}
              </span>

              {/* NHL Scoring Stats badge in list header */}
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono border shrink-0 ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {isGoalie ? (
                  <>
                    <span>{safeWins} W</span>
                    <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>•</span>
                    <strong className={`font-bold ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>
                      {safeSavePct} SV%
                    </strong>
                  </>
                ) : (
                  <>
                    <span>{safeGoals}G</span>
                    <span className="mx-0.5"> </span>
                    <span>{safeAssists}A</span>
                    <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>•</span>
                    <strong className={`font-bold ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>
                      {safePoints} PTS
                    </strong>
                  </>
                )}
              </span>
            </div>

            {/* Badges Row */}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
              {isPromotedAndProtected ? (
                <span className="inline-flex items-center gap-1 rounded bg-purple-950/60 px-1.5 py-0.5 font-medium text-purple-300/90 border border-purple-800/40">
                  <ShieldCheck className="h-2.5 w-2.5 text-purple-400/80" />
                  Promoted &amp; Protected
                </span>
              ) : prospect.promoted ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-1.5 py-0.5 font-medium text-emerald-300/90 border border-emerald-800/40">
                  <Check className="h-2.5 w-2.5 text-emerald-400/80" />
                  Promoted
                </span>
              ) : ev.isMandatoryPromotion ? (
                <span className="inline-flex items-center gap-1 rounded bg-rose-950/60 px-1.5 py-0.5 font-medium text-rose-300/90 border border-rose-800/40">
                  <AlertCircle className="h-2.5 w-2.5 text-rose-400/80" />
                  Mandatory Promotion
                </span>
              ) : ev.isWatchlist ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 px-1.5 py-0.5 font-medium text-amber-300/90 border border-amber-800/40">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400/80" />
                  Watchlist ({ev.seasonGamesRemaining} GP Left)
                </span>
              ) : null}

              {!isPromotedAndProtected && prospect.isProtected && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-medium text-teal-300/90 border border-teal-800/40">
                  <ShieldCheck className="h-2.5 w-2.5 text-teal-400/80" />
                  Protected
                </span>
              )}

              {isTrashed && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800/90 px-1.5 py-0.5 font-medium text-slate-300 border border-slate-700 shadow-sm">
                  <Trash2 className="h-2.5 w-2.5 text-slate-400" />
                  Trashed
                </span>
              )}

              {isInDevelopment && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-400 border border-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
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
            <div className={`flex justify-between mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <span>Season GP</span>
              <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {safeSeasonGP} / {safeSeasonLimit}
              </span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
              <div
                className={`h-full rounded-full ${
                  safeSeasonGP >= safeSeasonLimit
                    ? 'bg-rose-600/75'
                    : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0
                    ? 'bg-amber-600/75'
                    : 'bg-teal-700/70'
                }`}
                style={{ width: `${safeSeasonProgress}%` }}
              />
            </div>
          </div>

          {/* Cumulative GP mini gauge */}
          <div className="w-32 sm:w-36 text-[11px]">
            <div className={`flex justify-between mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <span>Career GP</span>
              <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {safeTotalGP} / {safeCumulativeLimit}
              </span>
            </div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
              <div
                className={`h-full rounded-full ${
                  safeTotalGP >= safeCumulativeLimit
                    ? 'bg-rose-600/75'
                    : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0
                    ? 'bg-amber-600/75'
                    : 'bg-teal-700/70'
                }`}
                style={{ width: `${safeCumulativeProgress}%` }}
              />
            </div>
          </div>

          {/* 4-Season 25+ GP Milestone Indicator */}
          <div className="hidden sm:block">
            <SeasonThresholdMarkers
              size="sm"
              count={ev.seasons25PlusCount}
              max={ev.seasons25PlusTarget}
              totalGP={safeTotalGP}
              isPromoted={prospect.promoted}
              interactive={false}
              prospect={prospect}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center pl-11 lg:pl-0">
          {isTrashed && onToggleStatus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(prospect.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300/90 hover:bg-emerald-900/40 hover:border-emerald-700/60 transition-colors shadow-sm"
              title="Restore prospect from Trashed list (resume live tracking)"
            >
              <RotateCcw className="h-3 w-3 text-emerald-400/80" />
              <span>Restore</span>
            </button>
          )}

          {/* Action Overflow Menu (Promote, Protect, Refresh, Edit, Delete, Trash) */}
          {(onSyncProspect || onEdit || onDelete || onTogglePromotion || onToggleProtection || onToggleStatus) && (
            <PlayerActionOverflowMenu
              isAdmin={isAdmin}
              onSync={onSyncProspect ? () => onSyncProspect(prospect.id) : undefined}
              onEdit={onEdit ? () => onEdit(prospect) : undefined}
              onDelete={onDelete ? () => onDelete(prospect.id) : undefined}
              onTogglePromotion={onTogglePromotion ? () => onTogglePromotion(prospect.id) : undefined}
              onToggleProtection={onToggleProtection ? () => onToggleProtection(prospect.id) : undefined}
              isPromoted={prospect.promoted}
              isProtected={prospect.isProtected}
              isProtectionEligible={ev.isProtectionEligible}
              isMandatoryPromotion={ev.isMandatoryPromotion}
              status={prospect.status}
              onToggleStatus={() => onToggleStatus(prospect.id)}
              isSyncing={isSyncing}
            />
          )}
        </div>
      </div>

      {/* Expanded Subpanel Details */}
      {isExpanded && (
        <div className={`border-t p-4 sm:p-5 space-y-4 ${isLight ? 'border-slate-200 bg-white text-slate-900 shadow-sm' : 'border-slate-800 bg-slate-900/80 text-slate-100'}`}>
          {/* Trashed Prospect Banner */}
          {isTrashed && (
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl p-3 text-xs border ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center gap-2">
                <Trash2 className={`h-4 w-4 shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
                <span>
                  <strong className={isLight ? 'text-slate-900' : 'text-slate-100'}>Trashed Prospect:</strong> Live NHL games tracking is stopped. Player record is safely preserved in database.
                </span>
              </div>
              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(prospect.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white font-medium px-2.5 py-1 text-xs transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Tracking
                </button>
              )}
            </div>
          )}

          {/* Top metadata & Sync details bar */}
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b text-xs ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              {prospect.nhlPlayerId ? (
                <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800/90 text-slate-300 border-slate-700'}`}>
                  NHL Player ID: #{prospect.nhlPlayerId}
                </span>
              ) : (
                <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${isLight ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-slate-800/60 text-slate-400 border-slate-700/60'}`} title="No official NHL ID assigned (Unlisted)">
                  No NHL ID
                </span>
              )}
              {prospect.syncSource && (
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  Source: <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{prospect.syncSource}</strong>
                </span>
              )}
            </div>

            {prospect.lastSyncedAt && (
              <div className={`flex items-center gap-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Clock className="h-3 w-3 text-slate-500" />
                <span>Last Updated: <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{prospect.lastSyncedAt}</strong></span>
              </div>
            )}
          </div>

          {/* Simulation & GP breakdown box */}
          <div className={`rounded-xl p-3 sm:p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#1e293b] border-slate-800 text-slate-100'
          }`}>
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Total NHL Games Played
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-3xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {safeTotalGP}
                </span>
                <span className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>NHL GP</span>
                <span className={`text-xs pl-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  (Season: <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{safeSeasonGP}</strong> + Prior: <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{Number.isFinite(prospect.priorCareerGP) ? Math.max(0, prospect.priorCareerGP) : 0}</strong>)
                </span>
              </div>
            </div>

            {/* Right-aligned scoring stats block */}
            <div className="text-left sm:text-right flex flex-col items-start sm:items-end justify-center">
              {isGoalie ? (
                <div className={`text-xs sm:text-sm font-mono tracking-tight flex items-center justify-end ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span>{safeWins} W</span>
                  <span className={`mx-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>•</span>
                  <strong className={`font-bold ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>
                    {safeSavePct} SV%
                  </strong>
                </div>
              ) : (
                <div className={`text-xs sm:text-sm font-mono tracking-tight flex items-center justify-end ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span>{safeGoals}G</span>
                  <span className="mx-1.5"> </span>
                  <span>{safeAssists}A</span>
                  <span className={`mx-2 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>•</span>
                  <strong className={`font-bold ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>
                    {safePoints} PTS
                  </strong>
                </div>
              )}

              <div className={`text-[10px] sm:text-[11px] mt-1 space-x-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Current: <strong className={`font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{safeSeasonGP}</strong> GP</span>
                <span>•</span>
                <span>Prior: <strong className={`font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{Number.isFinite(prospect.priorCareerGP) ? Math.max(0, prospect.priorCareerGP) : 0}</strong> GP</span>
              </div>
            </div>
          </div>

          {/* Rule Threshold Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rule 1: Single-Season GP */}
            <div className={`rounded-xl p-3.5 border ${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#1e293b] border-slate-800 text-slate-100'}`}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Single-Season GP <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({isGoalie ? 'Limit: 20' : 'Limit: 40'})</span>
                </span>
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {safeSeasonGP} / {safeSeasonLimit} GP
                </span>
              </div>

              <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeSeasonGP >= safeSeasonLimit
                      ? 'bg-rose-600/75'
                      : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0
                      ? 'bg-amber-600/75'
                      : 'bg-teal-700/70'
                  }`}
                  style={{ width: `${safeSeasonProgress}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {safeSeasonGP >= safeSeasonLimit ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-300/90'}`}>
                      <AlertCircle className="h-3 w-3 inline text-rose-500" /> Threshold Reached
                    </span>
                  ) : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0 ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-amber-700' : 'text-amber-300/90'}`}>
                      <Sparkles className="h-3 w-3 inline text-amber-500" /> {safeSeasonRemaining} GP until promotion
                    </span>
                  ) : (
                    <span>{safeSeasonRemaining} games cushion</span>
                  )}
                </span>
                <span className={`font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{safeSeasonProgress}%</span>
              </div>
            </div>

            {/* Rule 2: Cumulative Career GP */}
            <div className={`rounded-xl p-3.5 border ${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#1e293b] border-slate-800 text-slate-100'}`}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  Cumulative Career GP <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({isGoalie ? 'Limit: 30' : 'Limit: 65'})</span>
                </span>
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {safeTotalGP} / {safeCumulativeLimit} GP
                </span>
              </div>

              <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeTotalGP >= safeCumulativeLimit
                      ? 'bg-rose-600/75'
                      : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0
                      ? 'bg-amber-600/75'
                      : 'bg-teal-700/70'
                  }`}
                  style={{ width: `${safeCumulativeProgress}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {safeTotalGP >= safeCumulativeLimit ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-300/90'}`}>
                      <AlertCircle className="h-3 w-3 inline text-rose-500" /> Threshold Reached
                    </span>
                  ) : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0 ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-amber-700' : 'text-amber-300/90'}`}>
                      <Sparkles className="h-3 w-3 inline text-amber-500" /> {safeCumulativeRemaining} GP until promotion
                    </span>
                  ) : (
                    <span>{safeCumulativeRemaining} games cushion</span>
                  )}
                </span>
                <span className={`font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{safeCumulativeProgress}%</span>
              </div>
            </div>
          </div>

          {/* Rule 3: Protection Cap Limit */}
          {(prospect.promoted || safeTotalGP >= (isGoalie ? 20 : 40)) && (
            <div className={`rounded-xl p-3.5 border ${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-[#1e293b] border-slate-800 text-slate-100'}`}>
              <div className={`flex items-center justify-between text-xs mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                <span className={`font-medium flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  <ShieldCheck className={`h-3.5 w-3.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
                  <span>Protection Cap Limit</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({isGoalie ? 'Goalie: 140 GP' : 'Skater: 200 GP'})</span>
                </span>
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>
                  {safeTotalGP} / {safeProtectionLimit} GP
                </span>
              </div>

              <div className={`relative h-1.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeTotalGP >= safeProtectionLimit ? 'bg-rose-600/75' : 'bg-slate-600/70'
                  }`}
                  style={{ width: `${safeProtectionProgress}%` }}
                />
              </div>

              <div className={`mt-1 flex items-center justify-between text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>
                  {safeTotalGP >= safeProtectionLimit ? (
                    <span className={`font-semibold ${isLight ? 'text-rose-700' : 'text-rose-300/90'}`}>Ineligible: exceeded {safeProtectionLimit} GP limit</span>
                  ) : (
                    <span>{safeProtectionRemaining} GP cushion remaining</span>
                  )}
                </span>
                <span className="font-mono">{safeProtectionProgress}%</span>
              </div>
            </div>
          )}

          {/* Rule 4: 4 Seasons of 25+ GP Milestone Tracker */}
          <div className={`rounded-xl p-3.5 border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1e293b] border-slate-800'}`}>
            <Season25GPMarkers
              count={ev.seasons25PlusCount}
              max={ev.seasons25PlusTarget}
              totalGP={safeTotalGP}
              isPromoted={prospect.promoted}
              showSubtext={true}
              showStepper={isAdmin}
              interactive={isAdmin}
              onCountChange={isAdmin ? (newCount) => onUpdate25PlusSeasons?.(prospect.id, newCount) : undefined}
              prospect={prospect}
            />
          </div>

          {/* Notes or Status Report */}
          {prospect.statusNotes && (
            <p className={`text-xs italic p-2.5 rounded-lg border ${isLight ? 'text-slate-700 bg-slate-50 border-slate-200' : 'text-slate-400 bg-slate-800/40 border-slate-800'}`}>
              "{prospect.statusNotes}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};
