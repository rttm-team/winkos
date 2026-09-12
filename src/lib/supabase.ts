import { createClient } from '@supabase/supabase-js';
import { GeneralManager, Prospect } from '../types';

const SUPABASE_URL = "https://wltqsayrupcvcrodsjmn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_z3uOEmQzAfN8Pz4F2w5cbw_dgdIYbGJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to convert database row to Prospect
// Handles both snake_case (standard) and camelCase (in case user made it that way)
export const mapProspectRow = (row: any): Prospect => {
  return {
    id: String(row.id),
    name: row.player_name ?? row.name ?? 'Unknown Prospect',
    position: row.position,
    draftYear: row.draft_year ?? row.draftYear,
    draftRound: row.draft_round ?? row.draftRound,
    draftPick: row.draft_pick ?? row.draftPick,
    nhlTeam: row.nhl_team ?? row.nhlTeam,
    nhlTeamAbbr: row.nhl_team_abbr ?? row.nhlTeamAbbr,
    totalGames: row.total_games ?? row.totalGames ?? 0,
    currentSeasonGP: row.current_season_gp ?? row.currentSeasonGP ?? 0,
    priorCareerGP: row.prior_career_gp ?? row.priorCareerGP ?? 0,
    promoted: row.promoted ?? false,
    promotionDate: row.promotion_date ?? row.promotionDate,
    isProtected: row.protected ?? row.is_protected ?? row.isProtected ?? false,
    age: row.age,
    photoUrl: row.photo_url ?? row.photoUrl,
    statusNotes: row.status_notes ?? row.statusNotes,
    nhlPlayerId: row.nhl_player_id ?? row.nhlPlayerId,
    apiSyncStatus: row.api_sync_status ?? row.apiSyncStatus,
    lastSyncedAt: row.last_synced_at ?? row.lastSyncedAt,
    syncSource: row.sync_source ?? row.syncSource,
    syncErrorMessage: row.sync_error_message ?? row.syncErrorMessage,
    syncBadge: row.sync_badge ?? row.syncBadge,
    hasEmptyStats: row.has_empty_stats ?? row.hasEmptyStats,
    matchFound: row.match_found ?? row.matchFound,
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
    // Works whether foreign key is gm_id, gmId, or gm_name
    const gmProspects = (prospectsData || [])
      .filter((p) => p.gm_name === gmRow.name || p.gm_id === gmRow.id || p.gmId === gmRow.id)
      .map(mapProspectRow);

    return {
      id: String(gmRow.id),
      name: gmRow.name ?? 'Unknown GM',
      teamName: gmRow.team_name ?? gmRow.teamName ?? 'Unknown Team',
      winkoinBalance: gmRow.winkoins ?? gmRow.winkoin_balance ?? gmRow.winkoinBalance ?? 0,
      avatarColor: gmRow.avatar_color ?? gmRow.avatarColor ?? 'from-slate-600 to-slate-800',
      avatarInitials: gmRow.avatar_initials ?? gmRow.avatarInitials ?? '??',
      prospects: gmProspects,
    };
  });
};
