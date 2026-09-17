import { createClient } from '@supabase/supabase-js';
import { GeneralManager, Prospect } from '../types';
import { NHL_TEAMS_MAP, LEAGUE_RULES, INITIAL_GMS, getStoredProspectStatus, getStoredScoringStats, getBaselineScoringStats, calculateFantasyPoints } from '../data/mockData';
import { getCachedProspectFromLeagueData, getStored25PlusSeasons } from '../services/nhlApi';

const SUPABASE_URL = "https://wltqsayrupcvcrodsjmn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_z3uOEmQzAfN8Pz4F2w5cbw_dgdIYbGJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to convert database row to Prospect
// Handles both snake_case (standard) and camelCase (in case user made it that way)
// Enriches missing fields with fallback JSON data
export const mapProspectRow = (row: any): Prospect => {
  const name = row.player_name ?? row.name ?? 'Unknown Prospect';
  
  // Lookup fallback game counts if missing from DB
  const cachedRecord = getCachedProspectFromLeagueData(name);
  const fallbackTotalGames = cachedRecord?.totalGames ?? 0;
  const isGoalie = (row.position || cachedRecord?.pos) === 'G';
  const singleLimit = isGoalie 
    ? LEAGUE_RULES.goalies.singleSeasonPromote 
    : LEAGUE_RULES.skaters.singleSeasonPromote;

  const totalGames = (row.total_games != null && row.total_games > 0) 
    ? row.total_games 
    : ((row.totalGames != null && row.totalGames > 0) ? row.totalGames : fallbackTotalGames);
  const isPromoted = row.promoted ?? false;

  // Auto-distribute GP if not explicitly saved in DB
  let currentSeasonGP = row.current_season_gp ?? row.currentSeasonGP;
  let priorCareerGP = row.prior_career_gp ?? row.priorCareerGP;

  if (currentSeasonGP == null || priorCareerGP == null) {
    if (totalGames === 0) {
      currentSeasonGP = 0;
      priorCareerGP = 0;
    } else if (isPromoted) {
      currentSeasonGP = Math.min(totalGames, singleLimit);
      priorCareerGP = Math.max(0, totalGames - currentSeasonGP);
    } else {
      currentSeasonGP = Math.min(totalGames, singleLimit - 1);
      priorCareerGP = Math.max(0, totalGames - currentSeasonGP);
    }
  }

  // Lookup fallback NHL Team if missing from DB
  const lowerName = name.toLowerCase();
  const teamInfo = NHL_TEAMS_MAP[lowerName] || { team: 'NHL Prospect', abbr: 'NHL' };

  return {
    id: String(row.id),
    name: name,
    position: row.position || cachedRecord?.pos || 'F',
    draftYear: row.draft_year ?? row.draftYear ?? cachedRecord?.draftYear,
    draftRound: row.draft_round ?? row.draftRound,
    draftPick: row.draft_pick ?? row.draftPick,
    nhlTeam: row.nhl_team ?? row.nhlTeam ?? teamInfo.team,
    nhlTeamAbbr: row.nhl_team_abbr ?? row.nhlTeamAbbr ?? teamInfo.abbr,
    totalGames: totalGames,
    total_games: totalGames,
    currentSeasonGP: currentSeasonGP,
    priorCareerGP: priorCareerGP,
    promoted: isPromoted,
    promotionDate: row.promotion_date ?? row.promotionDate,
    isProtected: row.protected ?? row.is_protected ?? row.isProtected ?? false,
    age: row.age,
    photoUrl: row.photo_url ?? row.photoUrl,
    statusNotes: row.status_notes ?? row.statusNotes,
    gm_name: row.gm_name ?? row.gmName ?? row.gm,
    gmName: row.gm_name ?? row.gmName ?? row.gm,
    status: (row.is_inactive === true || row.inactive === true || row.status === 'trashed' || row.status === 'inactive' || getStoredProspectStatus(String(row.id), name) === 'trashed') ? 'trashed' : 'active',
    nhl_id: row.nhl_id != null ? String(row.nhl_id) : undefined,
    nhlId: row.nhl_id != null ? String(row.nhl_id) : (row.nhlPlayerId != null ? String(row.nhlPlayerId) : undefined),
    nhlPlayerId: row.nhl_id != null ? String(row.nhl_id) : (row.nhl_player_id ?? row.nhlPlayerId),
    hasNoNhlId: row.nhl_id == null && row.nhlPlayerId == null,
    max_single_season_gp: row.max_single_season_gp != null ? Number(row.max_single_season_gp) : undefined,
    maxSingleSeasonGP: row.max_single_season_gp != null ? Number(row.max_single_season_gp) : undefined,
    apiSyncStatus: row.api_sync_status ?? row.apiSyncStatus ?? 'idle',
    lastSyncedAt: row.last_synced_at ?? row.lastSyncedAt,
    syncSource: row.sync_source ?? row.syncSource,
    syncErrorMessage: row.sync_error_message ?? row.syncErrorMessage,
    syncBadge: row.sync_badge ?? row.syncBadge,
    hasEmptyStats: row.has_empty_stats ?? row.hasEmptyStats,
    matchFound: row.match_found ?? row.matchFound,
    qualifying_seasons: (() => {
      let parsed: any[] = [];
      if (row.season_breakdown) {
        if (typeof row.season_breakdown === 'string') {
          try { parsed = JSON.parse(row.season_breakdown); } catch { parsed = []; }
        } else if (Array.isArray(row.season_breakdown)) {
          parsed = row.season_breakdown;
        }
      }
      const breakdownHits = parsed.length > 0
        ? parsed.filter((s: any) => s.qualifies === true || s.hit === true).length
        : undefined;
      return (row.qualifying_seasons != null && !isNaN(Number(row.qualifying_seasons)))
        ? Number(row.qualifying_seasons)
        : (breakdownHits ?? getStored25PlusSeasons(String(row.id), name, totalGames));
    })(),
    qualifyingSeasons: (() => {
      let parsed: any[] = [];
      if (row.season_breakdown) {
        if (typeof row.season_breakdown === 'string') {
          try { parsed = JSON.parse(row.season_breakdown); } catch { parsed = []; }
        } else if (Array.isArray(row.season_breakdown)) {
          parsed = row.season_breakdown;
        }
      }
      const breakdownHits = parsed.length > 0
        ? parsed.filter((s: any) => s.qualifies === true || s.hit === true).length
        : undefined;
      return (row.qualifying_seasons != null && !isNaN(Number(row.qualifying_seasons)))
        ? Number(row.qualifying_seasons)
        : (breakdownHits ?? getStored25PlusSeasons(String(row.id), name, totalGames));
    })(),
    seasons25PlusGP: (() => {
      let parsed: any[] = [];
      if (row.season_breakdown) {
        if (typeof row.season_breakdown === 'string') {
          try { parsed = JSON.parse(row.season_breakdown); } catch { parsed = []; }
        } else if (Array.isArray(row.season_breakdown)) {
          parsed = row.season_breakdown;
        }
      }
      const breakdownHits = parsed.length > 0
        ? parsed.filter((s: any) => s.qualifies === true || s.hit === true).length
        : undefined;
      return (row.qualifying_seasons != null && !isNaN(Number(row.qualifying_seasons)))
        ? Number(row.qualifying_seasons)
        : (breakdownHits ?? getStored25PlusSeasons(String(row.id), name, totalGames));
    })(),
    season_breakdown: typeof row.season_breakdown === 'string'
      ? (() => { try { return JSON.parse(row.season_breakdown); } catch { return []; } })()
      : (Array.isArray(row.season_breakdown) ? row.season_breakdown : []),
    seasons25PlusHistory: (() => {
      let parsed: any[] = [];
      if (row.season_breakdown) {
        if (typeof row.season_breakdown === 'string') {
          try { parsed = JSON.parse(row.season_breakdown); } catch { parsed = []; }
        } else if (Array.isArray(row.season_breakdown)) {
          parsed = row.season_breakdown;
        }
      }
      return parsed.map((s: any) => ({
        season: String(s.season || ''),
        gp: Number(s.gp || 0),
        hit: Boolean(s.qualifies ?? s.hit),
      }));
    })(),
    goals: (() => {
      if (row.goals != null && !isNaN(Number(row.goals))) return Number(row.goals);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.goals !== undefined) return stored.goals;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).goals;
    })(),
    assists: (() => {
      if (row.assists != null && !isNaN(Number(row.assists))) return Number(row.assists);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.assists !== undefined) return stored.assists;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).assists;
    })(),
    points: (() => {
      if (row.points != null && !isNaN(Number(row.points))) return Number(row.points);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.points !== undefined) return stored.points;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).points;
    })(),
    pp_points: (() => {
      if (row.pp_points != null && !isNaN(Number(row.pp_points))) return Number(row.pp_points);
      if (row.power_play_points != null && !isNaN(Number(row.power_play_points))) return Number(row.power_play_points);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.pp_points !== undefined) return stored.pp_points;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).pp_points ?? 0;
    })(),
    sh_points: (() => {
      if (row.sh_points != null && !isNaN(Number(row.sh_points))) return Number(row.sh_points);
      if (row.shorthanded_points != null && !isNaN(Number(row.shorthanded_points))) return Number(row.shorthanded_points);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.sh_points !== undefined) return stored.sh_points;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).sh_points ?? 0;
    })(),
    gwg: (() => {
      if (row.gwg != null && !isNaN(Number(row.gwg))) return Number(row.gwg);
      if (row.game_winning_goals != null && !isNaN(Number(row.game_winning_goals))) return Number(row.game_winning_goals);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.gwg !== undefined) return stored.gwg;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).gwg ?? 0;
    })(),
    plus_minus: (() => {
      if (row.plus_minus != null && !isNaN(Number(row.plus_minus))) return Number(row.plus_minus);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.plus_minus !== undefined) return stored.plus_minus;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).plus_minus ?? 0;
    })(),
    pim: (() => {
      if (row.pim != null && !isNaN(Number(row.pim))) return Number(row.pim);
      if (row.penalty_minutes != null && !isNaN(Number(row.penalty_minutes))) return Number(row.penalty_minutes);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.pim !== undefined) return stored.pim;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).pim ?? 0;
    })(),
    shots: (() => {
      if (row.shots != null && !isNaN(Number(row.shots))) return Number(row.shots);
      if (row.shots_on_goal != null && !isNaN(Number(row.shots_on_goal))) return Number(row.shots_on_goal);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.shots !== undefined) return stored.shots;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).shots ?? 0;
    })(),
    wins: (() => {
      if (row.wins != null && !isNaN(Number(row.wins))) return Number(row.wins);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.wins !== undefined) return stored.wins;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).wins;
    })(),
    shutouts: (() => {
      if (row.shutouts != null && !isNaN(Number(row.shutouts))) return Number(row.shutouts);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.shutouts !== undefined) return stored.shutouts;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).shutouts ?? 0;
    })(),
    saves: (() => {
      if (row.saves != null && !isNaN(Number(row.saves))) return Number(row.saves);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.saves !== undefined) return stored.saves;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).saves ?? 0;
    })(),
    goals_against: (() => {
      if (row.goals_against != null && !isNaN(Number(row.goals_against))) return Number(row.goals_against);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.goals_against !== undefined) return stored.goals_against;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).goals_against ?? 0;
    })(),
    save_pct: (() => {
      if (row.save_pct != null && !isNaN(Number(row.save_pct))) return Number(row.save_pct);
      if (row.savePct != null && !isNaN(Number(row.savePct))) return Number(row.savePct);
      const stored = getStoredScoringStats(String(row.id), name);
      if (stored?.save_pct !== undefined) return stored.save_pct;
      return getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames).save_pct;
    })(),
    fantasy_points: (() => {
      if (row.fantasy_points != null && !isNaN(Number(row.fantasy_points))) return Number(row.fantasy_points);
      const stored = getStoredScoringStats(String(row.id), name);
      const baseline = getBaselineScoringStats(name, row.position || (isGoalie ? 'G' : 'F'), totalGames);
      const resolved = {
        goals: row.goals ?? stored?.goals ?? baseline.goals,
        assists: row.assists ?? stored?.assists ?? baseline.assists,
        pp_points: row.pp_points ?? stored?.pp_points ?? baseline.pp_points,
        sh_points: row.sh_points ?? stored?.sh_points ?? baseline.sh_points,
        gwg: row.gwg ?? stored?.gwg ?? baseline.gwg,
        plus_minus: row.plus_minus ?? stored?.plus_minus ?? baseline.plus_minus,
        pim: row.pim ?? stored?.pim ?? baseline.pim,
        shots: row.shots ?? stored?.shots ?? baseline.shots,
        wins: row.wins ?? stored?.wins ?? baseline.wins,
        shutouts: row.shutouts ?? stored?.shutouts ?? baseline.shutouts,
        saves: row.saves ?? stored?.saves ?? baseline.saves,
        goals_against: row.goals_against ?? stored?.goals_against ?? baseline.goals_against,
      };
      return calculateFantasyPoints(resolved);
    })(),
  };
};

const STORED_DELETED_KEY = 'winko_deleted_prospect_ids_v1';

export const getDeletedProspectIds = (): Set<string> => {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(STORED_DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
};

export const addDeletedProspectId = (id: string | number) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getDeletedProspectIds();
    current.add(String(id));
    window.localStorage.setItem(STORED_DELETED_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn("Failed to save deleted prospect id to localStorage", e);
  }
};

export const fetchLeagueData = async (): Promise<GeneralManager[]> => {
  const { data: gmsData, error: gmsError } = await supabase.from('gms').select('*');
  const { data: prospectsData, error: prospectsError } = await supabase.from('prospects').select('*');

  if (gmsError) console.error("Error fetching gms:", gmsError);
  if (prospectsError) console.error("Error fetching prospects:", prospectsError);

  if (!gmsData) return [];

  const deletedIds = getDeletedProspectIds();

  return gmsData.map((gmRow) => {
    // Find all prospects belonging to this GM
    // Works whether foreign key is gm_id, gmId, gm_name, or name match
    const gmNameClean = String(gmRow.name || '').trim().toLowerCase();
    const gmIdStr = String(gmRow.id ?? '').trim();

    let gmProspects = (prospectsData || [])
      .filter((p) => {
        const idStr = String(p.id ?? '');
        if (deletedIds.has(idStr)) return false;
        if (p.player_name === '[DELETED]') return false;
        const pGmName = String(p.gm_name || p.gmName || p.gm || '').trim().toLowerCase();
        const pGmId = String(p.gm_id ?? p.gmId ?? '').trim();
        return (
          (pGmName && pGmName === gmNameClean) ||
          (pGmId && pGmId === gmIdStr)
        );
      })
      .map(mapProspectRow);

    // If Supabase table did not have prospects populated for this GM,
    // seamlessly provide the GM's authentic prospects from the primary league dataset
    if (gmProspects.length === 0) {
      const fallbackGm = INITIAL_GMS.find(
        (g) => g.name.toLowerCase() === gmNameClean || g.id === gmIdStr || g.id === `gm-${gmNameClean}`
      );
      if (fallbackGm && fallbackGm.prospects.length > 0) {
        gmProspects = fallbackGm.prospects;
      }
    }

    return {
      id: String(gmRow.id),
      name: gmRow.name ?? 'Unknown GM',
      teamName: gmRow.team_name ?? gmRow.teamName ?? 'Unknown Team',
      winkoinBalance: gmRow.winkoins ?? gmRow.winkoin_balance ?? gmRow.winkoinBalance ?? 0,
      winkoins: gmRow.winkoins ?? gmRow.winkoin_balance ?? gmRow.winkoinBalance ?? 0,
      is_commish: gmRow.is_commish === true || gmRow.isCommish === true || String(gmRow.name || '').trim().toLowerCase() === 'adam',
      pin: gmRow.pin != null ? String(gmRow.pin) : (String(gmRow.name || '').trim().toLowerCase() === 'adam' ? '1234' : '0000'),
      avatarColor: gmRow.avatar_color ?? gmRow.avatarColor ?? 'from-slate-600 to-slate-800',
      avatarInitials: gmRow.avatar_initials ?? gmRow.avatarInitials ?? '??',
      prospects: gmProspects,
    };
  });
};
