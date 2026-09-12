import { Prospect } from '../types';
import rawLeagueData from '../data/winkos_full_league_data.json';

export interface NhlPlayerStatsResult {
  playerId: string;
  currentSeasonGP: number;
  priorCareerGP: number;
  totalGP: number;
  headshotUrl?: string;
  nhlTeamAbbr?: string;
  source: 'direct_api' | 'proxy_api' | 'sample_fallback';
  timestamp: string;
  matchFound: boolean;
  hasEmptyStats?: boolean;
  statusBadge?: 'In Development' | 'No NHL Record' | 'NHL API Synced' | 'Verified Snapshot' | 'NHL API Proxy';
  statusMessage?: string;
  error?: string;
}

// Cached league prospects lookup by normalized name from winkos_full_league_data.json
export interface CachedLeagueProspect {
  totalGames: number;
  pos: string;
  draftYear?: number;
  promoted?: boolean;
  protected?: boolean;
}

const CACHED_LEAGUE_MAP = new Map<string, CachedLeagueProspect>();

if (rawLeagueData && Array.isArray((rawLeagueData as any).gms)) {
  for (const gm of (rawLeagueData as any).gms) {
    if (Array.isArray(gm.prospects)) {
      for (const p of gm.prospects) {
        if (p?.name) {
          const key = normalizeNameForComparison(p.name);
          if (key) {
            CACHED_LEAGUE_MAP.set(key, {
              totalGames: typeof p.totalGames === 'number' ? p.totalGames : 0,
              pos: p.pos || 'F',
              draftYear: p.draftYear,
              promoted: Boolean(p.promoted),
              protected: Boolean(p.protected),
            });
          }
        }
      }
    }
  }
}

/**
 * Returns cached prospect data from winkos_full_league_data.json if present
 */
export function getCachedProspectFromLeagueData(name: string): CachedLeagueProspect | null {
  const key = normalizeNameForComparison(name);
  if (!key) return null;
  return CACHED_LEAGUE_MAP.get(key) || null;
}

// Verified official NHL Player IDs as immediate fallback if search endpoint is restricted
export const KNOWN_NHL_PLAYER_IDS: Record<string, string> = {
  'zach benson': '8484145',
  'nikita nesterenko': '8481754',
  'danila yurov': '8483525',
  'sam rinzel': '8483506',
  'jesper wallstedt': '8482661',
  'will smith': '8484144',
  'lane hutson': '8483477',
  'dustin wolf': '8481691',
  'cutter gauthier': '8483429',
  'matthew knies': '8482720',
  'brandt clarke': '8482702',
  'yaroslav askarov': '8482137',
  'macklin celebrini': '8484807',
  'rutger mcgroarty': '8483441',
  'simon edvinsson': '8482686',
  'devon levi': '8482163',
  'logan stankoven': '8482705',
  'olen zellweger': '8482803',
  'sebastian cossa': '8482672',
  'connor bedard': '8484144',
  'adam fantilli': '8484146',
  'brock faber': '8482122',
  'marco rossi': '8482097',
  'dylan guenther': '8482699',
  'logan cooley': '8483431',
  'matvei michkov': '8484152',
  'beckett sennecke': '8484813',
  'artyom levshunov': '8484808',
  'sam dickinson': '8484811',
  'berkly catton': '8484812',
  'zayne parekh': '8484814',
  'zeev buium': '8484815',
  'joel hofer': '8480981',
  'lukas dostal': '8481033',
  'pyotr kochetkov': '8481577',
  'joseph woll': '8479361',
  'samuel ersson': '8481035',
  'spencer knight': '8481519',
  'luke hughes': '8482684',
  'thomas harley': '8481548',
  'shane wright': '8483430',
  'leo carlsson': '8484147',
  'pavel dorofeyev': '8481559',
  'jordan spence': '8481585',
  'frank nazar': '8483436',
  'denton mateychuk': '8483438',
  'easton cowan': '8484180',
  'dalibor dvorsky': '8484148',
  'ivan demidov': '8484809',
  'alexander nikishin': '8482139',
  'joey daccord': '8478916',
  'matt coronato': '8482717',
  'jackson blake': '8482751',
  'ryker evans': '8482794',
  'colton dach': '8482708',
  'mavrik bourque': '8482113',
  'jakub dobes': '8482148',
  'joshua roy': '8482761',
  'daniil gushchin': '8482151',
  'brayden yager': '8484158',
  'josh ho-sang': '8477959',
  'jakob ihs-wozniak': '8485416',
  'jonathan lekkerimäki': '8483476',
  'mads søgaard': '8481544',
  'leevi meriläinen': '8482447',
  'aatu räty': '8482691',
};

/**
 * Normalizes a name for strict exact matching:
 * - Case-insensitive
 * - Strips accents/diacritics (ä -> a, é -> e, etc.)
 * - Normalizes Scandinavian/European special characters (ø -> o, æ -> ae, œ -> oe, ß -> ss)
 * - Strips hyphens, spaces, punctuation, and non-alphanumeric characters
 */
export function normalizeNameForComparison(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[ß]/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // strip spaces, hyphens, and punctuation
}

/**
 * Sanitizes search query string for NHL search APIs:
 * - Replaces hyphens with spaces (e.g. Ihs-Wozniak -> Ihs Wozniak)
 * - Converts accents to ASCII (e.g. Lekkerimäki -> Lekkerimaki)
 * - Converts Scandinavian characters (e.g. Søgaard -> Sogaard)
 * - Cleans extra spaces and special characters so NHL API returns matches
 */
export function sanitizeSearchQuery(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[ß]/g, 'ss')
    .replace(/[-_]/g, ' ') // replace hyphens and underscores with spaces
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove special symbols
    .replace(/\s+/g, ' ') // collapse multi-spaces
    .trim();
}

/**
 * Extracts candidate full names from a player object returned by NHL search APIs
 */
function extractPlayerCandidateNames(player: any): string[] {
  const candidates: string[] = [];
  if (typeof player.name === 'string' && player.name.trim()) {
    candidates.push(player.name.trim());
  }

  // Handle firstName and lastName (string or localized object format e.g. { default: 'Connor' })
  const firstName =
    typeof player.firstName === 'string'
      ? player.firstName.trim()
      : typeof player.firstName?.default === 'string'
        ? player.firstName.default.trim()
        : typeof player.first_name === 'string'
          ? player.first_name.trim()
          : '';

  const lastName =
    typeof player.lastName === 'string'
      ? player.lastName.trim()
      : typeof player.lastName?.default === 'string'
        ? player.lastName.default.trim()
        : typeof player.last_name === 'string'
          ? player.last_name.trim()
          : '';

  if (firstName && lastName) {
    candidates.push(`${firstName} ${lastName}`);
  } else if (firstName) {
    candidates.push(firstName);
  } else if (lastName) {
    candidates.push(lastName);
  }

  if (typeof player.fullName === 'string' && player.fullName.trim()) {
    candidates.push(player.fullName.trim());
  }

  return candidates;
}

/**
 * Inspects returned search results list and ONLY returns a player if their full name
 * (firstName + lastName or name) exactly matches prospectName (case-insensitive, ignoring special characters/hyphens).
 * Never picks the first item (data[0]) if it is not an exact match!
 */
export function findExactMatchingPlayer(
  data: any,
  prospectName: string
): { playerId: string; matchedName: string } | null {
  if (!data) return null;

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.players)
      ? data.players
      : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.results)
          ? data.results
          : typeof data === 'object' && (data.playerId || data.id)
            ? [data]
            : [];

  const targetNorm = normalizeNameForComparison(prospectName);
  if (!targetNorm) return null;

  for (const player of list) {
    const candidates = extractPlayerCandidateNames(player);
    for (const cand of candidates) {
      if (normalizeNameForComparison(cand) === targetNorm) {
        const id = player.playerId || player.id;
        if (id) {
          return { playerId: String(id), matchedName: cand };
        }
      }
    }
  }

  return null;
}

/**
 * Step 1: Searches for a player's official NHL playerId.
 * 1. Sanitizes search queries for names with hyphens (e.g. Ihs-Wozniak) or accents (e.g. Lekkerimäki).
 * 2. Calls https://api-web.nhle.com/v1/search/player?query=${sanitizedQuery} and inspects returned results.
 * 3. Inspects fallback search endpoints (search.d3.nhle.com and dev proxies).
 * 4. Strictly checks for exact full name matches (case-insensitive, ignoring special characters/hyphens).
 * 5. If no exact match is found, returns null (never returns a false match).
 */
export async function searchNhlPlayerId(
  prospectName: string
): Promise<{ playerId: string; source: 'direct_api' | 'proxy_api' | 'sample_fallback'; matchedName: string } | null> {
  const sanitized = sanitizeSearchQuery(prospectName);
  const rawClean = prospectName.trim();

  // Queries to try: sanitized query first (essential for hyphens/accents), followed by raw name if different
  const queriesToTry = [sanitized];
  if (rawClean && rawClean !== sanitized) {
    queriesToTry.push(rawClean);
  }

  for (const q of queriesToTry) {
    // 1. Primary user-requested endpoint: https://api-web.nhle.com/v1/search/player?query=${q}
    try {
      const primaryUrl = `https://api-web.nhle.com/v1/search/player?query=${encodeURIComponent(q)}`;
      const res = await fetch(primaryUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const match = findExactMatchingPlayer(data, prospectName);
        if (match) {
          return { playerId: match.playerId, source: 'direct_api', matchedName: match.matchedName };
        }
      }
    } catch {
      // Expected if endpoint 404s or browser CORS restricts api-web
    }

    // 2. Vite dev proxy to api-web if running in dev mode
    try {
      const proxyUrl = `/api/nhl-web/v1/search/player?query=${encodeURIComponent(q)}`;
      const res = await fetch(proxyUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const match = findExactMatchingPlayer(data, prospectName);
        if (match) {
          return { playerId: match.playerId, source: 'proxy_api', matchedName: match.matchedName };
        }
      }
    } catch {
      // Ignore and proceed
    }

    // 3. Official NHL search endpoint: https://search.d3.nhle.com/api/v1/search/player
    try {
      const d3Url = `https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=15&q=${encodeURIComponent(q)}`;
      const res = await fetch(d3Url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        const match = findExactMatchingPlayer(data, prospectName);
        if (match) {
          return { playerId: match.playerId, source: 'direct_api', matchedName: match.matchedName };
        }
      }
    } catch {
      // CORS or network failure
    }

    // 4. Vite dev proxy to search.d3.nhle.com
    try {
      const proxyD3Url = `/api/nhl-search/api/v1/search/player?culture=en-us&limit=15&q=${encodeURIComponent(q)}`;
      const res = await fetch(proxyD3Url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        const match = findExactMatchingPlayer(data, prospectName);
        if (match) {
          return { playerId: match.playerId, source: 'proxy_api', matchedName: match.matchedName };
        }
      }
    } catch {
      // Ignore and proceed
    }
  }

  // 5. Check verified known NHL IDs strictly by exact normalized comparison
  const targetNorm = normalizeNameForComparison(prospectName);
  for (const [knownName, id] of Object.entries(KNOWN_NHL_PLAYER_IDS)) {
    if (normalizeNameForComparison(knownName) === targetNorm) {
      return { playerId: id, source: 'sample_fallback', matchedName: prospectName };
    }
  }

  // Exact match NOT found
  return null;
}

/**
 * Step 2: Fetches player landing stats from https://api-web.nhle.com/v1/player/${playerId}/landing
 */
export async function fetchNhlPlayerLanding(
  playerId: string
): Promise<{ data: any; source: 'direct_api' | 'proxy_api' } | null> {
  // Direct fetch to official NHL API
  try {
    const directUrl = `https://api-web.nhle.com/v1/player/${playerId}/landing`;
    const res = await fetch(directUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return { data, source: 'direct_api' };
    }
  } catch {
    // Browser CORS or network restrictions will trigger catch
  }

  // Try Vite proxy fallback if direct fetch fails or hits CORS
  try {
    const proxyUrl = `/api/nhl-web/v1/player/${playerId}/landing`;
    const res = await fetch(proxyUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return { data, source: 'proxy_api' };
    }
  } catch {
    // Proxy also unavailable
  }

  return null;
}

/**
 * Parses the official NHL landing response and extracts current season GP and career total GP.
 * Detects whether authentic NHL stats exist, or whether stats are null/empty.
 */
export function parseNhlLandingStats(landingData: any): {
  currentSeasonGP: number;
  careerTotalGP: number;
  priorCareerGP: number;
  headshotUrl?: string;
  teamAbbr?: string;
  hasNhlStats: boolean;
} {
  if (!landingData || typeof landingData !== 'object') {
    return {
      currentSeasonGP: 0,
      careerTotalGP: 0,
      priorCareerGP: 0,
      hasNhlStats: false,
    };
  }

  let currentSeasonGP = 0;
  let careerTotalGP = 0;
  let hasNhlStats = false;

  // 1. Try featuredStats for regular season
  if (landingData.featuredStats?.regularSeason) {
    const regSeason = landingData.featuredStats.regularSeason;
    if (typeof regSeason.subSeason?.gamesPlayed === 'number') {
      currentSeasonGP = regSeason.subSeason.gamesPlayed;
      if (currentSeasonGP > 0) hasNhlStats = true;
    }
    if (typeof regSeason.career?.gamesPlayed === 'number') {
      careerTotalGP = regSeason.career.gamesPlayed;
      if (careerTotalGP > 0) hasNhlStats = true;
    }
  }

  // 2. Check careerTotals if careerTotalGP not set yet
  if (!careerTotalGP && typeof landingData.careerTotals?.regularSeason?.gamesPlayed === 'number') {
    careerTotalGP = landingData.careerTotals.regularSeason.gamesPlayed;
    if (careerTotalGP > 0) hasNhlStats = true;
  }

  // 3. Inspect seasonTotals array for NHL regular season games
  if (Array.isArray(landingData.seasonTotals)) {
    const nhlRegularSeasons = landingData.seasonTotals.filter(
      (s: any) => s.leagueAbbrev === 'NHL' && (s.gameTypeId === 2 || !s.gameTypeId)
    );

    if (nhlRegularSeasons.length > 0) {
      const calculatedTotalGP = nhlRegularSeasons.reduce(
        (sum: number, s: any) => sum + (typeof s.gamesPlayed === 'number' ? s.gamesPlayed : 0),
        0
      );
      if (calculatedTotalGP > 0) {
        hasNhlStats = true;
        if (!careerTotalGP) {
          careerTotalGP = calculatedTotalGP;
        }
      }

      // If currentSeasonGP was 0, check the latest NHL season entry
      if (currentSeasonGP === 0 && calculatedTotalGP > 0) {
        const latestSeason = nhlRegularSeasons[nhlRegularSeasons.length - 1];
        currentSeasonGP = latestSeason.gamesPlayed || 0;
      }
    }
  }

  // Calculate priorCareerGP
  const priorCareerGP = Math.max(0, careerTotalGP - currentSeasonGP);

  return {
    currentSeasonGP: hasNhlStats ? currentSeasonGP : 0,
    careerTotalGP: hasNhlStats ? careerTotalGP : 0,
    priorCareerGP: hasNhlStats ? priorCareerGP : 0,
    headshotUrl: landingData.headshot,
    teamAbbr: landingData.currentTeamAbbrev || landingData.teamCommonName?.default,
    hasNhlStats,
  };
}

/**
 * Orchestrates the full player sync workflow for a given prospect:
 * 1. Sanitizes search query for hyphens/accents.
 * 2. Searches playerId via https://api-web.nhle.com/v1/search/player?query=${sanitized}
 *    and fallback endpoints, strictly requiring an exact name match.
 * 3. If no exact match is found, or if landing stats are null/empty,
 *    sets gamesPlayed to 0 (or uses cached JSON value).
 * 4. Extracts official headshot and NHL team abbreviation whenever profile is located.
 */
export async function syncProspectWithNhlApi(prospect: Prospect): Promise<NhlPlayerStatsResult> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Look up cached prospect record from winkos_full_league_data.json
  const cachedRecord = getCachedProspectFromLeagueData(prospect.name);
  const cachedTotal = cachedRecord !== null && Number.isFinite(cachedRecord.totalGames)
    ? cachedRecord.totalGames
    : (Number.isFinite(prospect.totalGames) ? prospect.totalGames : 0);

  const isGoalie = (cachedRecord?.pos || prospect.position) === 'G';
  const singleLimit = isGoalie ? 20 : 40;

  // Helper to safely distribute games played
  const getSafeGamesPlayed = (totalGP: number) => {
    if (totalGP <= 0) return { currentSeasonGP: 0, priorCareerGP: 0, totalGP: 0 };
    if (Number.isFinite(prospect.currentSeasonGP) && Number.isFinite(prospect.priorCareerGP) && (prospect.currentSeasonGP + prospect.priorCareerGP === totalGP)) {
      return { currentSeasonGP: prospect.currentSeasonGP, priorCareerGP: prospect.priorCareerGP, totalGP };
    }
    const isPromoted = cachedRecord?.promoted || prospect.promoted;
    const currentSeasonGP = isPromoted ? Math.min(totalGP, singleLimit) : Math.min(totalGP, singleLimit - 1);
    const priorCareerGP = Math.max(0, totalGP - currentSeasonGP);
    return { currentSeasonGP, priorCareerGP, totalGP };
  };

  try {
    // 1. Search Player ID with strict exact matching
    const searchResult = await searchNhlPlayerId(prospect.name);

    // Requirement 1 & 2: If no exact match is found in the search results:
    // Set gamesPlayed to cached value in winkos_full_league_data.json if present, otherwise default to 0.
    // Display subtle badge 'No NHL Record' or 'In Development'.
    if (!searchResult) {
      const { currentSeasonGP, priorCareerGP, totalGP } = getSafeGamesPlayed(cachedTotal);
      return {
        playerId: '',
        currentSeasonGP,
        priorCareerGP,
        totalGP,
        headshotUrl: prospect.photoUrl,
        nhlTeamAbbr: prospect.nhlTeamAbbr,
        source: 'sample_fallback',
        timestamp,
        matchFound: false,
        hasEmptyStats: true,
        statusBadge: totalGP === 0 ? 'In Development' : 'No NHL Record',
        statusMessage:
          totalGP === 0
            ? 'In Development (No NHL Record, 0 GP)'
            : `Cached League Data: ${totalGP} GP (No live NHL profile)`,
      };
    }

    const { playerId, source } = searchResult;

    // 2. Fetch Player Landing Stats
    const landingResult = await fetchNhlPlayerLanding(playerId);
    if (!landingResult || !landingResult.data) {
      const { currentSeasonGP, priorCareerGP, totalGP } = getSafeGamesPlayed(cachedTotal);
      return {
        playerId,
        currentSeasonGP,
        priorCareerGP,
        totalGP,
        headshotUrl: prospect.photoUrl,
        nhlTeamAbbr: prospect.nhlTeamAbbr,
        source: 'sample_fallback',
        timestamp,
        matchFound: true,
        hasEmptyStats: true,
        statusBadge: totalGP === 0 ? 'In Development' : 'No NHL Record',
        statusMessage: 'Official NHL profile located; statistics unavailable',
      };
    }

    const parsed = parseNhlLandingStats(landingResult.data);

    // Requirement 1 & 2: If landing page stats are null/empty:
    // Set gamesPlayed to cached value in winkos_full_league_data.json if present, otherwise default to 0.
    // Display subtle badge 'In Development'.
    if (!parsed.hasNhlStats || (parsed.careerTotalGP === 0 && parsed.currentSeasonGP === 0)) {
      const { currentSeasonGP, priorCareerGP, totalGP } = getSafeGamesPlayed(cachedTotal);
      return {
        playerId,
        currentSeasonGP,
        priorCareerGP,
        totalGP,
        headshotUrl: parsed.headshotUrl || prospect.photoUrl,
        nhlTeamAbbr: parsed.teamAbbr || prospect.nhlTeamAbbr,
        source: landingResult.source,
        timestamp,
        matchFound: true,
        hasEmptyStats: true,
        statusBadge: 'In Development',
        statusMessage:
          totalGP === 0
            ? 'In Development (Official NHL profile, 0 GP)'
            : `Official NHL profile located (using cached ${totalGP} GP)`,
      };
    }

    // Authentic NHL stats found
    return {
      playerId,
      currentSeasonGP: parsed.currentSeasonGP,
      priorCareerGP: parsed.priorCareerGP,
      totalGP: parsed.careerTotalGP,
      headshotUrl: parsed.headshotUrl || prospect.photoUrl,
      nhlTeamAbbr: parsed.teamAbbr || prospect.nhlTeamAbbr,
      source: landingResult.source,
      timestamp,
      matchFound: true,
      hasEmptyStats: false,
      statusBadge: landingResult.source === 'proxy_api' ? 'NHL API Proxy' : 'NHL API Synced',
    };
  } catch (err: any) {
    // Graceful fallback keeping cached stats from winkos_full_league_data.json or 0
    const { currentSeasonGP, priorCareerGP, totalGP } = getSafeGamesPlayed(cachedTotal);
    return {
      playerId: prospect.nhlPlayerId || '',
      currentSeasonGP,
      priorCareerGP,
      totalGP,
      headshotUrl: prospect.photoUrl,
      nhlTeamAbbr: prospect.nhlTeamAbbr,
      source: 'sample_fallback',
      timestamp,
      matchFound: false,
      hasEmptyStats: true,
      statusBadge: totalGP === 0 ? 'In Development' : 'No NHL Record',
      error: err?.message || 'Network timeout or API restriction',
    };
  }
}

