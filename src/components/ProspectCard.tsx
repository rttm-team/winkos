import React, { useEffect } from 'react';
import { Prospect, evaluateProspect } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  Calendar,
  Sparkles,
  TrendingUp,
  Loader2,
  RefreshCw,
  Clock,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ProspectCardProps {
  prospect: Prospect;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onUpdateGP: (prospectId: string, delta: number) => void;
  onToggleProtection: (prospectId: string) => void;
  onTogglePromotion?: (prospectId: string) => void;
  onSyncProspect?: (prospectId: string) => void;
}

export const ProspectCard: React.FC<ProspectCardProps> = ({
  prospect,
  isExpanded,
  onToggleExpand,
  onUpdateGP,
  onToggleProtection,
  onTogglePromotion,
  onSyncProspect,
}) => {
  const cardExpanded = isExpanded !== undefined ? isExpanded : true;
  const ev = evaluateProspect(prospect);
  const isGoalie = prospect.position === 'G';
  const isSyncing = prospect.apiSyncStatus === 'syncing';

  // Safeguarded GP metrics and limits ensuring clean display of 0 / 40 (Skaters) or 0 / 20 (Goalies) without NaN
  const safeSeasonGP = Number.isFinite(prospect.currentSeasonGP) ? Math.max(0, prospect.currentSeasonGP) : 0;
  const safeSeasonLimit = isGoalie ? 20 : 40;
  const safeTotalGP = Number.isFinite(ev.totalGP)
    ? Math.max(0, ev.totalGP)
    : (Number.isFinite(prospect.totalGames) ? Math.max(0, prospect.totalGames) : 0);
  const safeCumulativeLimit = isGoalie ? 30 : 65;
  const safeProtectionLimit = isGoalie ? 140 : 200;

  const safeSeasonProgress = safeSeasonLimit > 0
    ? Math.min(100, Math.max(0, Math.round((safeSeasonGP / safeSeasonLimit) * 100)))
    : 0;
  const safeCumulativeProgress = safeCumulativeLimit > 0
    ? Math.min(100, Math.max(0, Math.round((safeTotalGP / safeCumulativeLimit) * 100)))
    : 0;
  const safeProtectionProgress = safeProtectionLimit > 0
    ? Math.min(100, Math.max(0, Math.round((safeTotalGP / safeProtectionLimit) * 100)))
    : 0;

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

  // Requirement 1: When a prospect card loads, trigger the API sync flow
  useEffect(() => {
    if (!prospect.lastSyncedAt && prospect.apiSyncStatus !== 'syncing' && onSyncProspect) {
      onSyncProspect(prospect.id);
    }
  }, [prospect.id]);

  // Position colors
  const posBadgeColor =
    prospect.position === 'F'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      : prospect.position === 'D'
      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  // Position full label
  const posFullLabel =
    prospect.position === 'F' ? 'Forward' : prospect.position === 'D' ? 'Defenseman' : 'Goalie';

  return (
    <div
      id={`prospect-card-${prospect.id}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
        prospect.promoted
          ? 'border-emerald-500/40 bg-[#1e293b] shadow-md shadow-slate-950/40 hover:border-emerald-500/60'
          : ev.isMandatoryPromotion
          ? 'border-red-500/60 bg-[#1e293b] shadow-lg shadow-red-950/40 hover:border-red-400'
          : ev.isWatchlist
          ? 'border-amber-500/50 bg-[#1e293b] shadow-lg shadow-amber-950/30 hover:border-amber-400'
          : 'border-slate-700/70 bg-[#1e293b] hover:border-slate-600 shadow-md shadow-slate-950/40'
      }`}
    >
      {/* Top Highlight Accent Bar */}
      <div
        className={`h-1.5 w-full ${
          prospect.promoted
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
            : ev.isMandatoryPromotion
            ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse'
            : ev.isWatchlist
            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500'
            : prospect.isProtected
            ? 'bg-gradient-to-r from-cyan-500 to-emerald-500'
            : 'bg-slate-700'
        }`}
      />

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top API Sync Status & Timestamp Bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isSyncing ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-950/80 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-700/60 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                  <span>Syncing with NHL API...</span>
                </span>
              ) : (
                <>
                  {/* Subtle Badge: In Development */}
                  {isInDevelopment && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/90 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/80"
                      title="Prospect currently in development (0 NHL regular season games played)"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                      In Development
                    </span>
                  )}

                  {/* Subtle Badge: No NHL Record */}
                  {isNoNhlRecord && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-800/90 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/80"
                      title="No official NHL regular season record located on the NHL API"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                      No NHL Record
                    </span>
                  )}

                  {/* Active Synced Badge if authentic live stats are active */}
                  {!isInDevelopment && !isNoNhlRecord && (
                    prospect.syncSource === 'direct_api' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        NHL API Synced
                      </span>
                    ) : prospect.syncSource === 'proxy_api' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-700/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                        NHL API Proxy
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700"
                        title="Official NHL API was queried; verified roster snapshot active"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                        Verified Snapshot
                      </span>
                    )
                  )}
                </>
              )}

              {prospect.nhlPlayerId && (
                <span className="font-mono text-[10px] text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  ID: #{prospect.nhlPlayerId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {prospect.lastSyncedAt && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400"
                  title="Last synchronization with NHL data source"
                >
                  <Clock className="h-2.5 w-2.5 text-slate-500" />
                  <span>Last Updated: <strong className="text-slate-300 font-mono">{prospect.lastSyncedAt}</strong></span>
                </span>
              )}

              {/* Single Prospect Manual Sync Button */}
              {onSyncProspect && (
                <button
                  type="button"
                  onClick={() => onSyncProspect(prospect.id)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-cyan-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                  title="Re-query NHL API for this player"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              )}
            </div>
          </div>

          {/* Header: Player Name, Photo, Team, Draft Year, Position Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {prospect.photoUrl ? (
                <img
                  src={prospect.photoUrl}
                  alt={prospect.name}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-base font-black text-cyan-400 border border-slate-700">
                  {prospect.name.split(' ').map((n) => n[0]).join('')}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black tracking-tight text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {prospect.name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${posBadgeColor}`}
                  >
                    {prospect.position} • {posFullLabel}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                    {prospect.nhlTeam} ({prospect.nhlTeamAbbr})
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Draft: <strong className="text-slate-200">{prospect.draftYear}</strong>
                      {prospect.draftRound && (
                        <span className="text-slate-400 ml-1">
                          (Rd {prospect.draftRound}, #{prospect.draftPick})
                        </span>
                      )}
                    </span>
                  </span>
                  {prospect.age && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span>Age: {prospect.age}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Badges Required by Prompt: 'Promote? (Yes/No)' and 'Protected? (Yes/No)' */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {/* Promote? Tag */}
            {prospect.promoted ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300 border border-emerald-500/50 shadow-sm"
                title={`Player has graduated to the active roster${prospect.promotionDate ? ` on ${prospect.promotionDate}` : ''}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>
                  Promote? YES {prospect.promotionDate ? `(${prospect.promotionDate})` : '(Active)'}
                </span>
              </div>
            ) : ev.isMandatoryPromotion ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-black text-red-300 border border-red-500/50 shadow-sm animate-pulse"
                title="Threshold reached. Player must be promoted to the active fantasy roster."
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span>Promote? YES (Mandatory)</span>
              </div>
            ) : ev.isWatchlist ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-300 border border-amber-500/50 shadow-sm"
                title="Within 5 games of threshold. Prepare for upcoming promotion."
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 stroke-[2.5]" />
                <span>Promote? IMMINENT (Watchlist)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>Promote? NO (Developing)</span>
              </div>
            )}

            {/* Protected? Tag (Clickable toggle) */}
            {!ev.isProtectionEligible ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-800/40 px-2.5 py-1 text-xs font-semibold"
                title={`Exceeded ${ev.protectionMaxGames} NHL games limit. Ineligible for protection.`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span>Protected? NO (Ineligible &gt;{ev.protectionMaxGames} GP)</span>
              </div>
            ) : (
              <button
                onClick={() => onToggleProtection(prospect.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                  prospect.isProtected
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                }`}
                title="Click to toggle protected status"
              >
                {prospect.isProtected ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Protected? YES</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
                    <span>Protected? NO</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Promotion toggle button */}
            {onTogglePromotion && (
              <button
                onClick={() => onTogglePromotion(prospect.id)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border transition-colors ${
                  prospect.promoted
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : ev.isMandatoryPromotion
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-md shadow-red-600/30 font-black'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/40 hover:bg-emerald-900/50'
                }`}
                title={prospect.promoted ? 'Return player to prospect pool' : 'Promote to active fantasy roster'}
              >
                <Check className="h-3 w-3" />
                <span>{prospect.promoted ? 'Demote' : 'Promote'}</span>
              </button>
            )}

            {/* Expand / Collapse Details Button */}
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors ml-auto"
                title={cardExpanded ? 'Collapse details' : 'Expand details'}
              >
                <span>{cardExpanded ? 'Less' : 'Details'}</span>
                {cardExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Total NHL Games Played Display */}
          <div className="mt-4 rounded-xl bg-slate-900/80 p-3 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Total NHL Games Played
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black font-mono text-slate-100">
                  {safeTotalGP}
                </span>
                <span className="text-xs text-slate-400 font-medium">NHL GP</span>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <div>
                Current Season: <strong className="text-slate-200 font-mono">{safeSeasonGP}</strong> GP
              </div>
              <div>
                Prior Career: <strong className="text-slate-200 font-mono">{Number.isFinite(prospect.priorCareerGP) ? Math.max(0, prospect.priorCareerGP) : 0}</strong> GP
              </div>
            </div>
          </div>

          {/* Detailed Progress Bars and Controls (Collapsible) */}
          {cardExpanded && (
            <>
              {/* Rule Threshold Progress Bars */}
              <div className="mt-4 space-y-3.5">
            {/* Rule 1: Single-Season Games Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <span>Single-Season GP</span>
                  <span className="text-[10px] text-slate-400">({isGoalie ? 'Goalie Limit: 20' : 'Skater Limit: 40'})</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {safeSeasonGP} / {safeSeasonLimit} GP
                </span>
              </div>

              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeSeasonGP >= safeSeasonLimit
                      ? 'bg-red-500 shadow-sm shadow-red-500/50'
                      : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0
                      ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-sm shadow-cyan-500/20'
                  }`}
                  style={{ width: `${safeSeasonProgress}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {safeSeasonGP >= safeSeasonLimit ? (
                    <span className="font-bold text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" /> Threshold Reached ({safeSeasonGP}/{safeSeasonLimit})
                    </span>
                  ) : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0 ? (
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 inline" /> Only {safeSeasonRemaining} GP until promotion
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {safeSeasonRemaining} games cushion
                    </span>
                  )}
                </span>
                <span className="font-mono font-semibold text-slate-400">
                  {safeSeasonProgress}%
                </span>
              </div>
            </div>

            {/* Rule 2: Cumulative Games Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <span>Cumulative Career GP</span>
                  <span className="text-[10px] text-slate-400">({isGoalie ? 'Goalie Limit: 30' : 'Skater Limit: 65'})</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {safeTotalGP} / {safeCumulativeLimit} GP
                </span>
              </div>

              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeTotalGP >= safeCumulativeLimit
                      ? 'bg-red-500 shadow-sm shadow-red-500/50'
                      : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0
                      ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-sm shadow-cyan-500/20'
                  }`}
                  style={{ width: `${safeCumulativeProgress}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {safeTotalGP >= safeCumulativeLimit ? (
                    <span className="font-bold text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 inline" /> Threshold Reached ({safeTotalGP}/{safeCumulativeLimit})
                    </span>
                  ) : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0 ? (
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 inline" /> Only {safeCumulativeRemaining} GP until promotion
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {safeCumulativeRemaining} games cushion
                    </span>
                  )}
                </span>
                <span className="font-mono font-semibold text-slate-400">
                  {safeCumulativeProgress}%
                </span>
              </div>
            </div>

            {/* Rule 3: Protection Cap Progress (200 GP for skaters, 140 GP for goalies) */}
            {(prospect.promoted || safeTotalGP >= (isGoalie ? 20 : 40)) && (
              <div className="pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-cyan-400" />
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
                      safeTotalGP >= safeProtectionLimit
                        ? 'bg-red-500 shadow-sm shadow-red-500/50'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-400'
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
          </div>

          {/* Notes or Status Report */}
          {prospect.statusNotes && (
            <p className="mt-3.5 text-xs text-slate-400 italic border-t border-slate-800 pt-2.5">
              "{prospect.statusNotes}"
            </p>
          )}
            </>
          )}
        </div>

        {/* Interactive Simulation Controls */}
        {cardExpanded && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-cyan-400" />
              <span>Simulate GP:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateGP(prospect.id, -1)}
                disabled={prospect.currentSeasonGP <= 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Decrease Season GP by 1"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center font-mono text-xs font-bold text-slate-200">
                {prospect.currentSeasonGP}
              </span>
              <button
                onClick={() => onUpdateGP(prospect.id, 1)}
                className="flex h-7 items-center gap-1 px-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 font-semibold text-xs transition-colors shadow-sm"
                title="Add 1 GP to simulate next game and test promotion trigger"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+1 GP</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
