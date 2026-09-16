import { createClient } from '@supabase/supabase-js';
import { GeneralManager, Prospect } from '../types';
import { NHL_TEAMS_MAP, LEAGUE_RULES, INITIAL_GMS, getStoredProspectStatus } from '../data/mockData';
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
  };
};

export const fetchLeagueData = async (): Promise<GeneralManager[]> => {
  const { data: gmsData, error: gmsError } = await supabase.from('gms').select('*');
  const { data: prospectsData, error: prospectsError } = await supabase.from('prospects').select('*');

  if (gmsError) console.error("Error fetching gms:", gmsError);
  if (prospectsError) console.error("Error fetching prospects:", prospectsError);

  if (!gmsData) return [];

  return gmsData.map((gmRow) => {
    // Find all prospects belonging to this GM
    // Works whether foreign key is gm_id, gmId, gm_name, or name match
    const gmNameClean = String(gmRow.name || '').trim().toLowerCase();
    const gmIdStr = String(gmRow.id ?? '').trim();

    let gmProspects = (prospectsData || [])
      .filter((p) => {
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
