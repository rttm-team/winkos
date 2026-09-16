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
  CheckCircle2,
  Plus,
  Minus,
  Calendar,
  Sparkles,
  TrendingUp,
  Loader2,
  Clock,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface ProspectCardProps {
  prospect: Prospect;
  isExpanded?: boolean;
  isAdmin?: boolean;
  onToggleExpand?: () => void;
  onUpdateGP: (prospectId: string, delta: number) => void;
  onToggleProtection: (prospectId: string) => void;
  onTogglePromotion?: (prospectId: string) => void;
  onSyncProspect?: (prospectId: string) => void;
  onEdit?: (prospect: Prospect) => void;
  onDelete?: (prospectId: string) => void;
  onUpdate25PlusSeasons?: (prospectId: string, count: number) => void;
  onToggleStatus: (prospectId: string) => void;
}

export const ProspectCard: React.FC<ProspectCardProps> = ({
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

  const cardExpanded = isExpanded !== undefined ? isExpanded : true;
  const [imgError, setImgError] = useState(false);
  const ev = evaluateProspect(prospect);
  const isGoalie = prospect.position === 'G';
  const isSyncing = prospect.apiSyncStatus === 'syncing';

  // Safeguarded GP metrics and limits ensuring clean display of 0 / 40 (Skaters) or 0 / 20 (Goalies) without NaN
  const safeSeasonGP = Number.isFinite(prospect.currentSeasonGP) ? Math.max(0, prospect.currentSeasonGP) : 0;
  const safeSeasonLimit = isGoalie ? 20 : 40;
  const gp = prospect.total_games ?? prospect.totalGames ?? 0;
  const safeTotalGP = Number.isFinite(ev.totalGP) && ev.totalGP > 0
    ? Math.max(0, ev.totalGP)
    : Math.max(0, gp);
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

  const isTrashed = prospect.status === 'trashed' || prospect.status === 'inactive';

  const isInDevelopment =
    !isTrashed &&
    (prospect.syncBadge === 'In Development' ||
      prospect.hasEmptyStats === true ||
      (safeTotalGP === 0 && safeSeasonGP === 0));

  const isPromotedAndProtected = Boolean(
    prospect.promoted && (prospect.isProtected || (prospect as any).protected)
  );

  // Position colors
  const posBadgeColor =
    prospect.position === 'F'
      ? 'bg-blue-950/40 text-blue-300/90 border-blue-800/40'
      : prospect.position === 'D'
      ? 'bg-indigo-950/40 text-indigo-300/90 border-indigo-800/40'
      : 'bg-emerald-950/40 text-emerald-300/90 border-emerald-800/40';

  // Position full label
  const posFullLabel =
    prospect.position === 'F' ? 'Forward' : prospect.position === 'D' ? 'Defenseman' : 'Goalie';

  return (
    <div
      id={`prospect-card-${prospect.id}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
        isLight
          ? isTrashed
            ? 'border-slate-200 bg-slate-100 opacity-70 hover:opacity-100 shadow-sm text-slate-800'
            : isPromotedAndProtected
            ? 'border-purple-300 bg-gradient-to-b from-purple-50 to-indigo-50/50 shadow-md hover:border-purple-400 text-slate-900'
            : prospect.promoted
            ? 'border-emerald-300 bg-emerald-50/70 shadow-md hover:border-emerald-400 text-slate-900'
            : ev.isMandatoryPromotion
            ? 'border-rose-300 bg-rose-50/70 shadow-md hover:border-rose-400 text-slate-900'
            : ev.isWatchlist
            ? 'border-amber-300 bg-amber-50/70 shadow-md hover:border-amber-400 text-slate-900'
            : 'border-slate-200 bg-white hover:border-slate-300 shadow-md text-slate-900'
          : isTrashed
          ? 'border-slate-800/80 bg-[#151c28]/90 opacity-80 hover:opacity-100 hover:border-slate-700 shadow-sm text-slate-100'
          : isPromotedAndProtected
          ? 'border-purple-800/50 bg-gradient-to-b from-[#181628] to-[#141524] shadow-md shadow-black/20 hover:border-purple-700/60 text-slate-100'
          : prospect.promoted
          ? 'border-emerald-800/40 bg-[#182333] shadow-md shadow-black/20 hover:border-emerald-700/50 text-slate-100'
          : ev.isMandatoryPromotion
          ? 'border-rose-800/50 bg-[#221a22] shadow-md shadow-black/20 hover:border-rose-700/60 text-slate-100'
          : ev.isWatchlist
          ? 'border-amber-800/40 bg-[#222128] shadow-md shadow-black/20 hover:border-amber-700/50 text-slate-100'
          : 'border-slate-700/70 bg-[#1e293b] hover:border-slate-600 shadow-md shadow-slate-950/40 text-slate-100'
      }`}
    >
      {/* Top Highlight Accent Bar */}
      <div
        className={`h-1.5 w-full ${
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
            : 'bg-slate-700'
        }`}
      />

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Top API Sync Status & Timestamp Bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isTrashed ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-950/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-900/50">
                  <Trash2 className="h-3 w-3 text-rose-400" />
                  <span>Tracking Paused (Trashed)</span>
                </span>
              ) : isSyncing ? (
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

              {prospect.nhlPlayerId ? (
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-900/90 text-slate-400 border-slate-800'
                }`}>
                  ID: #{prospect.nhlPlayerId}
                </span>
              ) : (
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  isLight ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-slate-900/60 text-slate-500 border-slate-800/80'
                }`} title="No official NHL ID assigned (Unlisted)">
                  No NHL ID
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
            </div>
          </div>

          {/* Header: Player Name, Photo, Team, Draft Year, Position Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {prospect.photoUrl && !imgError ? (
                <img
                  src={proxyImageUrl(prospect.photoUrl)}
                  alt={prospect.name}
                  referrerPolicy="no-referrer"
                  className={`h-12 w-12 rounded-xl object-cover border bg-slate-800 shrink-0 ${
                    isPromotedAndProtected
                      ? 'border-purple-700/50 shadow-sm'
                      : 'border-slate-700'
                  }`}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-bold ${
                    isPromotedAndProtected
                      ? 'bg-purple-950/60 text-purple-300/90 border-purple-800/40 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {(prospect.name || 'U').split(' ').map((n) => n[0]).join('')}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`text-lg font-black tracking-tight transition-colors ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    } ${
                      isPromotedAndProtected ? (isLight ? 'group-hover:text-purple-700' : 'group-hover:text-purple-300/90') : (isLight ? 'group-hover:text-slate-700' : 'group-hover:text-slate-200')
                    }`}
                  >
                    {prospect.name}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border ${posBadgeColor}`}
                  >
                    {prospect.position} • {posFullLabel}
                  </span>
                </div>

                <div className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                    {prospect.nhlTeam} ({prospect.nhlTeamAbbr})
                  </span>
                  <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className={`h-3.5 w-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span>
                      Draft: <strong className={isLight ? 'text-slate-900' : 'text-slate-200'}>{prospect.draftYear}</strong>
                      {prospect.draftRound && (
                        <span className={`ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          (Rd {prospect.draftRound}, #{prospect.draftPick})
                        </span>
                      )}
                    </span>
                  </span>
                  {prospect.age && (
                    <>
                      <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
                      <span>Age: {prospect.age}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Overflow Menu (Promote, Protect, NHL Sync, Edit, Delete, Trash) */}
            <div className="shrink-0">
              <PlayerActionOverflowMenu
                isAdmin={isAdmin}
                onSync={onSyncProspect ? () => onSyncProspect(prospect.id) : undefined}
                onEdit={onEdit ? () => onEdit(prospect) : undefined}
                onDelete={onDelete ? () => onDelete(prospect.id) : undefined}
                onTogglePromotion={onTogglePromotion ? () => onTogglePromotion(prospect.id) : undefined}
                onToggleProtection={() => onToggleProtection(prospect.id)}
                onToggleStatus={() => onToggleStatus(prospect.id)}
                isPromoted={prospect.promoted}
                isProtected={prospect.isProtected}
                isProtectionEligible={ev.isProtectionEligible}
                isMandatoryPromotion={ev.isMandatoryPromotion}
                status={prospect.status}
                isSyncing={isSyncing}
              />
            </div>
          </div>

          {/* Status Badges Required by Prompt: 'Promote? (Yes/No)' and 'Protected? (Yes/No)' */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {/* Promote? Tag */}
            {isPromotedAndProtected ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-950/50 text-purple-300 border-purple-800/40'
                }`}
                title={`Player is promoted to the active fantasy roster AND protected${prospect.promotionDate ? ` on ${prospect.promotionDate}` : ''}`}
              >
                <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-purple-600' : 'text-purple-400/80'}`} />
                <span>
                  Promoted &amp; Protected {prospect.promotionDate ? `(${prospect.promotionDate})` : '(Active)'}
                </span>
              </div>
            ) : prospect.promoted ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40'
                }`}
                title={`Player has graduated to the active roster${prospect.promotionDate ? ` on ${prospect.promotionDate}` : ''}`}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400/80'}`} />
                <span>
                  Promote? YES {prospect.promotionDate ? `(${prospect.promotionDate})` : '(Active)'}
                </span>
              </div>
            ) : ev.isMandatoryPromotion ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-950/50 text-rose-300 border-rose-800/40'
                }`}
                title="Threshold reached. Player must be promoted to the active fantasy roster."
              >
                <AlertCircle className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-400/80'}`} />
                <span>Promote? YES (Mandatory)</span>
              </div>
            ) : ev.isWatchlist ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                }`}
                title="Within 5 games of threshold. Prepare for upcoming promotion."
              >
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400/80'}`} />
                <span>Promote? IMMINENT (Watchlist)</span>
              </div>
            ) : (
              <div className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-500'}`} />
                <span>Promote? NO (Developing)</span>
              </div>
            )}

            {/* Protected? Tag */}
            {!ev.isProtectionEligible ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                  isLight ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-rose-950/40 text-rose-300 border-rose-900/40'
                }`}
                title={`Exceeded ${ev.protectionMaxGames} NHL games limit. Ineligible for protection.`}
              >
                <ShieldAlert className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-400/80'}`} />
                <span>Protected? NO (Ineligible &gt;{ev.protectionMaxGames} GP)</span>
              </div>
            ) : isPromotedAndProtected ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-950/50 text-purple-300 border-purple-800/40'
                }`}
                title="Player is protected in pool"
              >
                <ShieldCheck className={`h-3.5 w-3.5 ${isLight ? 'text-purple-600' : 'text-purple-400/80'}`} />
                <span>Protected? YES</span>
              </div>
            ) : prospect.isProtected ? (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                  isLight ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-slate-800 text-teal-300/90 border-teal-800/40'
                }`}
                title="Player is protected in pool"
              >
                <ShieldCheck className={`h-3.5 w-3.5 ${isLight ? 'text-teal-600' : 'text-teal-400/80'}`} />
                <span>Protected? YES</span>
              </div>
            ) : (
              <div
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Player is not protected"
              >
                <ShieldAlert className={`h-3.5 w-3.5 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-500'}`} />
                <span>Protected? NO</span>
              </div>
            )}

            {isTrashed && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border shadow-sm ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800/90 text-slate-300 border-slate-700'
                }`}
                title="Player is trashed (tracking paused, log kept in DB)"
              >
                <Trash2 className={`h-3.5 w-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                <span>Trashed</span>
              </div>
            )}

            {/* Compact 4-Season Milestone Indicator */}
            <SeasonThresholdMarkers
              size="sm"
              count={ev.seasons25PlusCount}
              max={ev.seasons25PlusTarget}
              totalGP={safeTotalGP}
              isPromoted={prospect.promoted}
              interactive={false}
              prospect={prospect}
            />

            {/* Overflow Action Menu & Quick Restore Button */}
            <div className="ml-auto flex items-center gap-1.5">
              {isTrashed && onToggleStatus && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(prospect.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400 transition-colors shadow-sm cursor-pointer"
                  title="Restore prospect from Trashed list (resume live tracking)"
                >
                  <RotateCcw className="h-3 w-3 text-emerald-400" />
                  <span>Restore</span>
                </button>
              )}

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

          {/* Total NHL Games Played Display */}
          <div className={`mt-4 rounded-xl p-3.5 border flex items-center justify-between ${
            isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900/80 border-slate-800/80 text-slate-100'
          }`}>
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Total NHL Games Played
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {safeTotalGP}
                </span>
                <span className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>NHL GP</span>
              </div>
            </div>

            <div className={`text-right text-[11px] space-y-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <div>
                Current Season: <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{safeSeasonGP}</strong> GP
              </div>
              <div>
                Prior Career: <strong className={`font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{Number.isFinite(prospect.priorCareerGP) ? Math.max(0, prospect.priorCareerGP) : 0}</strong> GP
              </div>
            </div>
          </div>

          {/* Detailed Progress Bars and Controls (Collapsible) */}
          {cardExpanded && (
            <>
              {/* Rule Threshold Progress Bars */}
              <div className={`mt-4 p-4 rounded-2xl border space-y-4 ${
                isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-900/60 border-slate-800/80 text-slate-100'
              }`}>
            {/* Rule 1: Single-Season Games Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-medium flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  <span>Single-Season GP</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({isGoalie ? 'Goalie Limit: 20' : 'Skater Limit: 40'})</span>
                </span>
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {safeSeasonGP} / {safeSeasonLimit} GP
                </span>
              </div>

              <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeSeasonGP >= safeSeasonLimit
                      ? 'bg-rose-600/85'
                      : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0
                      ? 'bg-amber-600/85'
                      : 'bg-teal-700/80'
                  }`}
                  style={{ width: `${safeSeasonProgress}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {safeSeasonGP >= safeSeasonLimit ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-300/90'}`}>
                      <AlertCircle className={`h-3 w-3 inline ${isLight ? 'text-rose-600' : 'text-rose-400/80'}`} /> Threshold Reached ({safeSeasonGP}/{safeSeasonLimit})
                    </span>
                  ) : safeSeasonRemaining <= 5 && safeSeasonRemaining > 0 ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-amber-700' : 'text-amber-300/90'}`}>
                      <Sparkles className={`h-3 w-3 inline ${isLight ? 'text-amber-600' : 'text-amber-400/80'}`} /> Only {safeSeasonRemaining} GP until promotion
                    </span>
                  ) : (
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      {safeSeasonRemaining} games cushion
                    </span>
                  )}
                </span>
                <span className={`font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  {safeSeasonProgress}%
                </span>
              </div>
            </div>

            {/* Rule 2: Cumulative Games Progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-medium flex items-center gap-1 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  <span>Cumulative Career GP</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({isGoalie ? 'Goalie Limit: 30' : 'Skater Limit: 65'})</span>
                </span>
                <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {safeTotalGP} / {safeCumulativeLimit} GP
                </span>
              </div>

              <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    safeTotalGP >= safeCumulativeLimit
                      ? 'bg-rose-600/85'
                      : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0
                      ? 'bg-amber-600/85'
                      : 'bg-teal-700/80'
                  }`}
                  style={{ width: `${safeCumulativeProgress}%` }}
                />
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {safeTotalGP >= safeCumulativeLimit ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-rose-300/90'}`}>
                      <AlertCircle className={`h-3 w-3 inline ${isLight ? 'text-rose-600' : 'text-rose-400/80'}`} /> Threshold Reached ({safeTotalGP}/{safeCumulativeLimit})
                    </span>
                  ) : safeCumulativeRemaining <= 5 && safeCumulativeRemaining > 0 ? (
                    <span className={`font-semibold flex items-center gap-1 ${isLight ? 'text-amber-700' : 'text-amber-300/90'}`}>
                      <Sparkles className={`h-3 w-3 inline ${isLight ? 'text-amber-600' : 'text-amber-400/80'}`} /> Only {safeCumulativeRemaining} GP until promotion
                    </span>
                  ) : (
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      {safeCumulativeRemaining} games cushion
                    </span>
                  )}
                </span>
                <span className={`font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                  {safeCumulativeProgress}%
                </span>
              </div>
            </div>

            {/* Rule 3: Protection Cap Progress (200 GP for skaters, 140 GP for goalies) */}
            {(prospect.promoted || safeTotalGP >= (isGoalie ? 20 : 40)) && (
              <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-medium flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    <ShieldCheck className={`h-3 w-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} />
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
                      safeTotalGP >= safeProtectionLimit
                        ? 'bg-rose-600/85'
                        : 'bg-slate-600/80'
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
            <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
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
          </div>

          {/* Notes or Status Report */}
          {prospect.statusNotes && (
            <p className={`mt-3.5 text-xs italic border-t pt-2.5 ${isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'}`}>
              "{prospect.statusNotes}"
            </p>
          )}
            </>
          )}
        </div>


      </div>
    </div>
  );
};
