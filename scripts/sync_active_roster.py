import os
import time
import requests

# Supabase Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wltqsayrupcvcrodsjmn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def format_season_for_nhl_api(season_id):
    """
    Converts season strings like '2026-2027' or '2026-27' into 8-digit integer 20262027.
    """
    if not season_id:
        return 20262027
    clean = str(season_id).replace("-", "").strip()
    if len(clean) == 6:  # e.g., '202627' -> '20262027'
        return int(f"{clean[:4]}20{clean[4:]}")
    if len(clean) == 8:  # e.g., '20262027'
        return int(clean)
    return 20262027

def calculate_rule_5_points(position, stats):
    """
    Calculates Rule 5 Fantasy Points:
    Skaters: (G*25) + (A*25) + (+/-*5) + (PIM*3) + (SOG*2) + (GWG*20) + (PPP*10) + (SHP*20)
    Goalies: (W*40) + (GA*-15) + (SV*2) + (SO*40)
    """
    pos = str(position).upper() if position else 'F'
    if pos == 'G':
        return (
            (stats.get('wins', 0) * 40) +
            (stats.get('goals_against', 0) * -15) +
            (stats.get('saves', 0) * 2) +
            (stats.get('shutouts', 0) * 40)
        )
    else:
        return (
            (stats.get('goals', 0) * 25) +
            (stats.get('assists', 0) * 25) +
            (stats.get('plus_minus', 0) * 5) +
            (stats.get('pim', 0) * 3) +
            (stats.get('sog', 0) * 2) +
            (stats.get('game_winning_goals', 0) * 20) +
            (stats.get('power_play_points', 0) * 10) +
            (stats.get('shorthanded_points', 0) * 20)
        )

def sync_player_season_stats(player):
    row_id = player.get("id")
    nhl_id = player.get("nhl_id")
    name = player.get("player_name", "Unknown Player")
    season_id = player.get("season_id", "2026-2027")
    position = player.get("position", "F")

    if not nhl_id:
        print(f"⚠️ Skipping {name}: Missing nhl_id")
        return

    target_season_int = format_season_for_nhl_api(season_id)
    api_url = f"https://api-web.nhle.com/v1/player/{nhl_id}/landing"

    try:
        res = requests.get(api_url, timeout=10)
        if res.status_code != 200:
            print(f"⚠️ Could not fetch NHL API stats for {name} (ID: {nhl_id}, Status: {res.status_code})")
            return

        data = res.json()
        season_totals = data.get("seasonTotals", [])

        # Filter for NHL regular season games for the matching season_id
        matching_entries = [
            st for st in season_totals
            if st.get("leagueAbbrev") == "NHL"
            and st.get("gameTypeId") == 2
            and st.get("season") == target_season_int
        ]

        stats = {
            "gp": 0,
            "goals": 0,
            "assists": 0,
            "plus_minus": 0,
            "pim": 0,
            "sog": 0,
            "game_winning_goals": 0,
            "power_play_points": 0,
            "shorthanded_points": 0,
            "wins": 0,
            "goals_against": 0,
            "saves": 0,
            "shutouts": 0
        }

        pos_upper = str(position).upper()

        # Aggregate stats across multiple team stints within the same season
        for entry in matching_entries:
            stats["gp"] += entry.get("gamesPlayed", 0)
            if pos_upper == 'G':
                stats["wins"] += entry.get("wins", 0)
                stats["goals_against"] += entry.get("goalsAgainst", 0)
                stats["saves"] += entry.get("saves", 0)
                stats["shutouts"] += entry.get("shutouts", 0)
            else:
                stats["goals"] += entry.get("goals", 0)
                stats["assists"] += entry.get("assists", 0)
                stats["plus_minus"] += entry.get("plusMinus", 0)
                stats["pim"] += entry.get("pim", 0)
                stats["sog"] += entry.get("shots", 0)
                stats["game_winning_goals"] += entry.get("gameWinningGoals", 0)
                stats["power_play_points"] += entry.get("powerPlayGoals", 0) + entry.get("powerPlayAssists", 0)
                stats["shorthanded_points"] += entry.get("shorthandedGoals", 0) + entry.get("shorthandedAssists", 0)

        fpts = calculate_rule_5_points(position, stats)
        stats["fantasy_points"] = fpts

        # Update Supabase active_roster_players record
        patch_url = f"{SUPABASE_URL}/rest/v1/active_roster_players?id=eq.{row_id}"
        patch_res = requests.patch(patch_url, headers=HEADERS, json=stats)

        if patch_res.status_code in (200, 204):
            print(f"✅ Synced {name} ({season_id}): {stats['gp']} GP, {fpts} FPts")
        else:
            print(f"❌ Failed to update {name}: {patch_res.status_code} - {patch_res.text}")

    except Exception as e:
        print(f"⚠️ Exception syncing {name}: {str(e)}")

def main():
    print("🚀 Starting Winko's Active Roster Dedicated Stats Sync...")

    if not SUPABASE_KEY:
        print("❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required.")
        return

    # Fetch active roster players with an assigned nhl_id
    fetch_url = f"{SUPABASE_URL}/rest/v1/active_roster_players?select=*&nhl_id=not.is.null"
    try:
        res = requests.get(fetch_url, headers=HEADERS)
        if res.status_code != 200:
            print(f"❌ Failed to fetch active_roster_players: {res.status_code} {res.text}")
            return

        players = res.json()
        print(f"Found {len(players)} active roster players to sync.\n")

        for idx, player in enumerate(players, 1):
            print(f"[{idx}/{len(players)}]", end=" ")
            sync_player_season_stats(player)
            time.sleep(0.15)  # Rate limiting respect for NHL API

        print("\n🎉 Active Roster Sync completed successfully!")

    except Exception as e:
        print(f"❌ Fatal error during sync execution: {str(e)}")

if __name__ == "__main__":
    main()
