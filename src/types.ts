export type Position = 'F' | 'D' | 'G';

export type PositionGroup = 'Forwards' | 'Defensemen' | 'Goalies';

export interface PositionRule {
  singleSeasonPromote: number;
  cumulativePromote: number;
  protectionMaxGames: number;
  protectionMaxSeasons: number;
}

export interface LeagueRules {
  skaters: PositionRule;
  goalies: PositionRule;
}

export const DEFAULT_LEAGUE_RULES: LeagueRules = {
  skaters: {
    singleSeasonPromote: 40,
    cumulativePromote: 65,
    protectionMaxGames: 200,
    protectionMaxSeasons: 4,
  },
  goalies: {
    singleSeasonPromote: 20,
    cumulativePromote: 30,
    protectionMaxGames: 140,
    protectionMaxSeasons: 4,
  },
};

export interface Prospect {
  id: string;
  name: string;
  position: Position;
  draftYear: number;
  draftRound?: number;
  draftPick?: number;
  nhlTeam: string;
  nhlTeamAbbr: string;
  totalGames: number;
  currentSeasonGP: number;
  priorCareerGP: number; // total NHL GP = priorCareerGP + currentSeasonGP
  promoted: boolean;
  promotionDate?: string;
  isProtected: boolean;
  age?: number;
  photoUrl?: string;
  statusNotes?: string;
  nhlPlayerId?: string;
  apiSyncStatus?: 'idle' | 'syncing' | 'synced' | 'fallback' | 'error' | 'no_record';
  lastSyncedAt?: string;
  syncSource?: 'direct_api' | 'proxy_api' | 'sample_fallback';
  syncErrorMessage?: string;
  syncBadge?: 'In Development' | 'No NHL Record' | 'NHL API Synced' | 'Verified Snapshot' | 'NHL API Proxy';
  hasEmptyStats?: boolean;
  matchFound?: boolean;
}

export interface GeneralManager {
  id: string;
  name: string;
  teamName: string;
  winkoinBalance?: number;
  avatarColor: string;
  avatarInitials: string;
  prospects: Prospect[];
}

export type PositionFilter = 'ALL' | 'F' | 'D' | 'G';
export type StatusFilter = 'ALL' | 'ACTION_REQUIRED' | 'PROMOTED' | 'PROTECTED' | 'DEVELOPING';
export type ViewMode = 'list' | 'card';

export interface ProspectEvaluation {
  totalGP: number;
  seasonLimit: number;
  cumulativeLimit: number;
  protectionMaxGames: number;
  isProtectionEligible: boolean;
  protectionGamesRemaining: number;
  protectionProgress: number;
  isAlreadyPromoted: boolean;
  isMandatoryPromotion: boolean;
  isWatchlist: boolean; // within 5 games of either threshold
  seasonGamesRemaining: number;
  cumulativeGamesRemaining: number;
  seasonProgress: number; // percentage 0-100
  cumulativeProgress: number; // percentage 0-100
  primaryTrigger: 'ALREADY_PROMOTED' | 'SEASON_EXCEEDED' | 'CUMULATIVE_EXCEEDED' | 'SEASON_WATCH' | 'CUMULATIVE_WATCH' | 'SAFE';
  statusLabel: string;
  badgeType: 'mandatory' | 'warning' | 'protected' | 'promoted' | 'safe';
}

export function evaluateProspect(p: Prospect, rules: LeagueRules = DEFAULT_LEAGUE_RULES): ProspectEvaluation {
  const isGoalie = p.position === 'G';
  const posRules = isGoalie ? rules.goalies : rules.skaters;

  const seasonLimit = (posRules && Number.isFinite(posRules.singleSeasonPromote) && posRules.singleSeasonPromote > 0)
    ? posRules.singleSeasonPromote
    : (isGoalie ? 20 : 40);
  const cumulativeLimit = (posRules && Number.isFinite(posRules.cumulativePromote) && posRules.cumulativePromote > 0)
    ? posRules.cumulativePromote
    : (isGoalie ? 30 : 65);
  const protectionMaxGames = (posRules && Number.isFinite(posRules.protectionMaxGames) && posRules.protectionMaxGames > 0)
    ? posRules.protectionMaxGames
    : (isGoalie ? 140 : 200);

  const safeCurrentSeasonGP = Number.isFinite(p.currentSeasonGP) ? Math.max(0, p.currentSeasonGP) : 0;
  const safePriorCareerGP = Number.isFinite(p.priorCareerGP) ? Math.max(0, p.priorCareerGP) : 0;
  const totalGP = Number.isFinite(p.totalGames)
    ? Math.max(0, p.totalGames)
    : (safePriorCareerGP + safeCurrentSeasonGP);

  const isProtectionEligible = totalGP < protectionMaxGames;
  const protectionGamesRemaining = Math.max(0, protectionMaxGames - totalGP);
  const protectionProgress = protectionMaxGames > 0
    ? Math.min(100, Math.max(0, Math.round((totalGP / protectionMaxGames) * 100)))
    : 0;

  const seasonGamesRemaining = Math.max(0, seasonLimit - safeCurrentSeasonGP);
  const cumulativeGamesRemaining = Math.max(0, cumulativeLimit - totalGP);

  const seasonExceeded = safeCurrentSeasonGP >= seasonLimit;
  const cumulativeExceeded = totalGP >= cumulativeLimit;

  // If already promoted
  if (p.promoted) {
    const seasonProgress = seasonLimit > 0
      ? Math.min(100, Math.max(0, Math.round((safeCurrentSeasonGP / seasonLimit) * 100)))
      : 0;
    const cumulativeProgress = cumulativeLimit > 0
      ? Math.min(100, Math.max(0, Math.round((totalGP / cumulativeLimit) * 100)))
      : 0;

    let statusLabel = p.promotionDate ? `Promoted (${p.promotionDate})` : 'Promoted to Active Roster';
    if (!isProtectionEligible) {
      statusLabel += ` • Protection Ineligible (> ${protectionMaxGames} GP)`;
    } else if (p.isProtected) {
      statusLabel += ` • Protected (${protectionGamesRemaining} GP cushion)`;
    }

    return {
      totalGP,
      seasonLimit,
      cumulativeLimit,
      protectionMaxGames,
      isProtectionEligible,
      protectionGamesRemaining,
      protectionProgress,
      isAlreadyPromoted: true,
      isMandatoryPromotion: false,
      isWatchlist: false,
      seasonGamesRemaining: 0,
      cumulativeGamesRemaining: 0,
      seasonProgress,
      cumulativeProgress,
      primaryTrigger: 'ALREADY_PROMOTED',
      statusLabel,
      badgeType: 'promoted',
    };
  }

  // Not promoted yet - check if threshold reached
  const isMandatoryPromotion = seasonExceeded || cumulativeExceeded;

  // Watchlist is within 5 games of threshold, but not yet exceeded
  const seasonWatch = !seasonExceeded && seasonGamesRemaining <= 5 && seasonGamesRemaining > 0;
  const cumulativeWatch = !cumulativeExceeded && cumulativeGamesRemaining <= 5 && cumulativeGamesRemaining > 0;
  const isWatchlist = !isMandatoryPromotion && (seasonWatch || cumulativeWatch);

  let primaryTrigger: ProspectEvaluation['primaryTrigger'] = 'SAFE';
  let statusLabel = totalGP === 0 ? 'In Development (0 NHL GP)' : 'In Development in Prospect Pool';
  let badgeType: ProspectEvaluation['badgeType'] = p.isProtected ? 'protected' : 'safe';

  if (isMandatoryPromotion) {
    badgeType = 'mandatory';
    if (seasonExceeded && cumulativeExceeded) {
      primaryTrigger = 'SEASON_EXCEEDED';
      statusLabel = `Mandatory Promotion: Hit Season (${safeCurrentSeasonGP}/${seasonLimit}) & Career (${totalGP}/${cumulativeLimit})`;
    } else if (seasonExceeded) {
      primaryTrigger = 'SEASON_EXCEEDED';
      statusLabel = `Mandatory Promotion: Hit ${seasonLimit} Single-Season GP (${safeCurrentSeasonGP}/${seasonLimit})`;
    } else {
      primaryTrigger = 'CUMULATIVE_EXCEEDED';
      statusLabel = `Mandatory Promotion: Hit ${cumulativeLimit} Career NHL GP (${totalGP}/${cumulativeLimit})`;
    }
  } else if (isWatchlist) {
    badgeType = 'warning';
    if (seasonWatch && cumulativeWatch) {
      primaryTrigger = 'SEASON_WATCH';
      statusLabel = `Watchlist Alert: ${seasonGamesRemaining} GP to Season & ${cumulativeGamesRemaining} GP to Career Limit`;
    } else if (seasonWatch) {
      primaryTrigger = 'SEASON_WATCH';
      statusLabel = `Watchlist Alert: ${seasonGamesRemaining} GP to Season Threshold (${seasonLimit})`;
    } else {
      primaryTrigger = 'CUMULATIVE_WATCH';
      statusLabel = `Watchlist Alert: ${cumulativeGamesRemaining} GP to Career Threshold (${cumulativeLimit})`;
    }
  } else if (p.isProtected) {
    badgeType = 'protected';
    statusLabel = totalGP === 0 ? 'Roster Protected (In Development, 0 GP)' : 'Roster Protected (Developing)';
  }

  const seasonProgress = seasonLimit > 0
    ? Math.min(100, Math.max(0, Math.round((safeCurrentSeasonGP / seasonLimit) * 100)))
    : 0;
  const cumulativeProgress = cumulativeLimit > 0
    ? Math.min(100, Math.max(0, Math.round((totalGP / cumulativeLimit) * 100)))
    : 0;

  return {
    totalGP,
    seasonLimit,
    cumulativeLimit,
    protectionMaxGames,
    isProtectionEligible,
    protectionGamesRemaining,
    protectionProgress,
    isAlreadyPromoted: false,
    isMandatoryPromotion,
    isWatchlist,
    seasonGamesRemaining,
    cumulativeGamesRemaining,
    seasonProgress,
    cumulativeProgress,
    primaryTrigger,
    statusLabel,
    badgeType,
  };
}
