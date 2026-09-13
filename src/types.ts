export type Position = 'F' | 'D' | 'G';
export type ProspectStatus = 'active' | 'inactive';

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
  status?: ProspectStatus;
  apiSyncStatus?: 'idle' | 'syncing' | 'synced' | 'fallback' | 'error' | 'no_record';
  lastSyncedAt?: string;
  syncSource?: 'direct_api' | 'proxy_api' | 'sample_fallback';
  syncErrorMessage?: string;
  syncBadge?: 'In Development' | 'No NHL Record' | 'NHL API Synced' | 'Verified Snapshot' | 'NHL API Proxy';
  hasEmptyStats?: boolean;
  matchFound?: boolean;
  seasons25PlusGP?: number; // count from 0 to 4 of seasons with 25+ GP
  seasons25PlusHistory?: Array<{ season: string; gp: number; hit: boolean }>;
}

export interface GeneralManager {
  id: string;
  name: string;
  teamName: string;
  winkoinBalance?: number;
  winkoins?: number;
  is_commish?: boolean;
  pin?: string;
  avatarColor: string;
  avatarInitials: string;
  prospects: Prospect[];
}

export type PositionFilter = 'ALL' | 'F' | 'D' | 'G';
export type StatusFilter = 'ALL' | 'ACTION_REQUIRED' | 'WATCHLIST' | 'PROTECTION_WATCH' | 'PROMOTED' | 'DEVELOPING';
export type ViewMode = 'list' | 'card';

export type ProspectSortOption =
  | 'urgency'
  | 'seasonGPDesc'
  | 'careerGPDesc'
  | 'seasons25PlusDesc'
  | 'nameAsc'
  | 'nameDesc'
  | 'draftYearDesc';

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
  isProtectionWatchlist: boolean; // within 15 games of protection expiration limit
  seasonGamesRemaining: number;
  cumulativeGamesRemaining: number;
  seasonProgress: number; // percentage 0-100
  cumulativeProgress: number; // percentage 0-100
  primaryTrigger: 'ALREADY_PROMOTED' | 'SEASON_EXCEEDED' | 'CUMULATIVE_EXCEEDED' | 'FOUR_SEASONS_25_GP' | 'SEASON_WATCH' | 'CUMULATIVE_WATCH' | 'FOUR_SEASONS_WATCH' | 'SAFE';
  statusLabel: string;
  badgeType: 'mandatory' | 'warning' | 'protected' | 'promoted' | 'safe';
  // 4 seasons of 25+ GP threshold metrics
  seasons25PlusCount: number;
  seasons25PlusTarget: number;
  isFourSeasonsExceeded: boolean;
  isFourSeasonsWatchlist: boolean;
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

  // 4 Seasons of 25+ GP Rule: Count from 0 to 4
  const base25Count = Number.isFinite(p.seasons25PlusGP)
    ? p.seasons25PlusGP!
    : (safeCurrentSeasonGP >= 25 ? 1 : 0);
  const seasons25PlusCount = Math.min(4, Math.max(0, base25Count));
  const seasons25PlusTarget = 4;
  const isFourSeasonsExceeded = seasons25PlusCount >= seasons25PlusTarget && totalGP < protectionMaxGames;
  const isFourSeasonsWatchlist = !isFourSeasonsExceeded && seasons25PlusCount === 3 && totalGP < protectionMaxGames;

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

    const isProtectionWatchlist = isProtectionEligible && protectionGamesRemaining <= 15 && protectionGamesRemaining > 0;

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
      isProtectionWatchlist,
      seasonGamesRemaining: 0,
      cumulativeGamesRemaining: 0,
      seasonProgress,
      cumulativeProgress,
      primaryTrigger: 'ALREADY_PROMOTED',
      statusLabel,
      badgeType: 'promoted',
      seasons25PlusCount,
      seasons25PlusTarget,
      isFourSeasonsExceeded: false,
      isFourSeasonsWatchlist: false,
    };
  }

  // Not promoted yet - check if threshold reached
  // Rule: when 4 seasons of 25+ GP are hit before 200 GP, prompt to promote them
  const isMandatoryPromotion = seasonExceeded || cumulativeExceeded || isFourSeasonsExceeded;

  // Watchlist is within 5 games of threshold, or 3 of 4 seasons hit
  const seasonWatch = !seasonExceeded && seasonGamesRemaining <= 5 && seasonGamesRemaining > 0;
  const cumulativeWatch = !cumulativeExceeded && cumulativeGamesRemaining <= 5 && cumulativeGamesRemaining > 0;
  const isWatchlist = !isMandatoryPromotion && (seasonWatch || cumulativeWatch || isFourSeasonsWatchlist);

  let primaryTrigger: ProspectEvaluation['primaryTrigger'] = 'SAFE';
  let statusLabel = totalGP === 0 ? 'In Development (0 NHL GP)' : 'In Development in Prospect Pool';
  let badgeType: ProspectEvaluation['badgeType'] = p.isProtected ? 'protected' : 'safe';

  if (isMandatoryPromotion) {
    badgeType = 'mandatory';
    if (isFourSeasonsExceeded) {
      primaryTrigger = 'FOUR_SEASONS_25_GP';
      statusLabel = `Mandatory Promotion: Hit 4 Seasons of 25+ GP (${seasons25PlusCount}/${seasons25PlusTarget}) before ${protectionMaxGames} GP`;
    } else if (seasonExceeded && cumulativeExceeded) {
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
    if (isFourSeasonsWatchlist) {
      primaryTrigger = 'FOUR_SEASONS_WATCH';
      statusLabel = `Watchlist Alert: 3/4 Seasons of 25+ GP Hit (1 Season to Promotion Threshold)`;
    } else if (seasonWatch && cumulativeWatch) {
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

  const isProtectionWatchlist = isProtectionEligible && protectionGamesRemaining <= 15 && protectionGamesRemaining > 0;

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
    isProtectionWatchlist,
    seasonGamesRemaining,
    cumulativeGamesRemaining,
    seasonProgress,
    cumulativeProgress,
    primaryTrigger,
    statusLabel,
    badgeType,
    seasons25PlusCount,
    seasons25PlusTarget,
    isFourSeasonsExceeded,
    isFourSeasonsWatchlist,
  };
}

export function sortProspects(
  prospects: Prospect[],
  sortOption: ProspectSortOption,
  rules: LeagueRules = DEFAULT_LEAGUE_RULES
): Prospect[] {
  return [...prospects].sort((a, b) => {
    // Always put inactive last, regardless of sort option
    const statusA = a.status === 'inactive' ? 1 : 0;
    const statusB = b.status === 'inactive' ? 1 : 0;
    if (statusA !== statusB) return statusA - statusB;

    switch (sortOption) {
      case 'urgency': {
        const evA = evaluateProspect(a, rules);
        const evB = evaluateProspect(b, rules);

        const getUrgencyScore = (p: Prospect, ev: ProspectEvaluation): number => {
          if (ev.isMandatoryPromotion) return 1;
          if (ev.isWatchlist) return 2;
          if (ev.isProtectionWatchlist) return 3;
          if (!p.promoted) return 4;
          return 5;
        };

        const scoreA = getUrgencyScore(a, evA);
        const scoreB = getUrgencyScore(b, evB);

        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }

        // Intra-tier tiebreakers:
        if (scoreA === 1) {
          // Mandatory promotion: highest total GP first
          return evB.totalGP - evA.totalGP;
        }
        if (scoreA === 2) {
          // Watchlist: lowest games remaining to promotion
          const remA = Math.min(evA.seasonGamesRemaining || 99, evA.cumulativeGamesRemaining || 99);
          const remB = Math.min(evB.seasonGamesRemaining || 99, evB.cumulativeGamesRemaining || 99);
          if (remA !== remB) return remA - remB;
          return evB.totalGP - evA.totalGP;
        }
        if (scoreA === 3) {
          // Protection watchlist: lowest protection games remaining
          return evA.protectionGamesRemaining - evB.protectionGamesRemaining;
        }
        // Developing or Promoted: higher total GP first, then alphabetical
        if (evB.totalGP !== evA.totalGP) {
          return evB.totalGP - evA.totalGP;
        }
        return a.name.localeCompare(b.name);
      }

      case 'seasonGPDesc': {
        const gpA = Number.isFinite(a.currentSeasonGP) ? a.currentSeasonGP : 0;
        const gpB = Number.isFinite(b.currentSeasonGP) ? b.currentSeasonGP : 0;
        if (gpB !== gpA) return gpB - gpA;
        const totalA = Number.isFinite(a.totalGames) ? a.totalGames : 0;
        const totalB = Number.isFinite(b.totalGames) ? b.totalGames : 0;
        if (totalB !== totalA) return totalB - totalA;
        return a.name.localeCompare(b.name);
      }

      case 'careerGPDesc': {
        const totalA = Number.isFinite(a.totalGames) ? a.totalGames : 0;
        const totalB = Number.isFinite(b.totalGames) ? b.totalGames : 0;
        if (totalB !== totalA) return totalB - totalA;
        const gpA = Number.isFinite(a.currentSeasonGP) ? a.currentSeasonGP : 0;
        const gpB = Number.isFinite(b.currentSeasonGP) ? b.currentSeasonGP : 0;
        if (gpB !== gpA) return gpB - gpA;
        return a.name.localeCompare(b.name);
      }

      case 'seasons25PlusDesc': {
        const sA = Number.isFinite(a.seasons25PlusGP) ? a.seasons25PlusGP! : (a.currentSeasonGP >= 25 ? 1 : 0);
        const sB = Number.isFinite(b.seasons25PlusGP) ? b.seasons25PlusGP! : (b.currentSeasonGP >= 25 ? 1 : 0);
        if (sB !== sA) return sB - sA;
        const totalA = Number.isFinite(a.totalGames) ? a.totalGames : 0;
        const totalB = Number.isFinite(b.totalGames) ? b.totalGames : 0;
        if (totalB !== totalA) return totalB - totalA;
        return a.name.localeCompare(b.name);
      }

      case 'nameAsc': {
        return a.name.localeCompare(b.name);
      }

      case 'nameDesc': {
        return b.name.localeCompare(a.name);
      }

      case 'draftYearDesc': {
        const yearA = a.draftYear || 0;
        const yearB = b.draftYear || 0;
        if (yearB !== yearA) return yearB - yearA;
        // Same year: earlier round / pick first
        const roundA = a.draftRound || 99;
        const roundB = b.draftRound || 99;
        if (roundA !== roundB) return roundA - roundB;
        const pickA = a.draftPick || 999;
        const pickB = b.draftPick || 999;
        if (pickA !== pickB) return pickA - pickB;
        return a.name.localeCompare(b.name);
      }

      default:
        return 0;
    }
  });
}

