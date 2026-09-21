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
    "Prefer": "resolution=merge-duplicates"
}

# All 32 active NHL team tri-codes
NHL_TEAMS = [
    'ANA', 'BOS', 'BUF', 'CAR', 'CBJ', 'CGY', 'CHI', 'COL', 
    'DAL', 'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NJD', 
    'NSH', 'NYI', 'NYR', 'OTT', 'PHI', 'PIT', 'SJE', 'SEA', 
    'STL', 'TBL', 'TOR', 'UTA', 'VAN', 'VGK', 'WPG', 'WSH'
]

def format_season_for_nhl_api(season_id="2026-2027"):
    """Converts season strings like '2026-2027' into integer 20262027."""
    clean = str(season_id).replace("-", "").strip()
    if len(clean) == 6:
        return int(f"{clean[:4]}20{clean[4:]}")
    if len(clean) == 8:
        return int(clean)
    return 20262027

def calculate_rule_5_points(position, stats):
    """Calculates Winko's Rule 5 Fantasy Points."""
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

def fetch_player_season_stats(nhl_id, target_season_int, position):
    """Fetches single-season stats for a player from the NHL Landing API."""
    api_url = f"https://api-web.nhle.com/v1/player/{nhl_id}/landing"
    stats = {
        "gp": 0, "goals": 0, "assists": 0, "plus_minus": 0, "pim": 0,
        "sog": 0, "game_winning_goals": 0, "power_play_points": 0,
        "shorthanded_points": 0, "wins": 0, "goals_against": 0,
        "saves": 0, "shutouts": 0, "fantasy_points": 0
    }
    
    try:
        res = requests.get(api_url, timeout=10)
        if res.status_code != 200:
            return stats

        data = res.json()
        season_totals = data.get("seasonTotals", [])

        # Filter for target season, NHL regular season games
        matching_entries = [
            st for st in season_totals
            if st.get("leagueAbbrev") == "NHL"
            and st.get("gameTypeId") == 2
            and st.get("season") == target_season_int
        ]

        pos_upper = str(position).upper()
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

        stats["fantasy_points"] = calculate_rule_5_points(position, stats)
    except Exception as e:
        print(f"⚠️ Warning fetching stats for NHL ID {nhl_id}: {str(e)}")

    return stats

def seed_master_players():
    print("🚀 Starting NHL Master Players Pool Seeding...")
    if not SUPABASE_KEY:
        print("❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required.")
        return

    target_season_int = format_season_for_nhl_api("2026-2027")
    all_players = []

    # 1. Fetch rosters across all 32 NHL teams
    for team in NHL_TEAMS:
        print(f"📥 Fetching roster for {team}...")
        roster_url = f"https://api-web.nhle.com/v1/roster/{team}/current"
        try:
            res = requests.get(roster_url, timeout=10)
            if res.status_code != 200:
                print(f"⚠️ Could not fetch roster for {team}")
                continue

            roster_data = res.json()
            # Combine forwards, defensemen, and goalies
            groups = [
                (roster_data.get("forwards", []), "F"),
                (roster_data.get("defensemen", []), "D"),
                (roster_data.get("goalies", []), "G")
            ]

            for players_list, pos_type in groups:
                for p in players_list:
                    nhl_id = p.get("id")
                    first_name = p.get("firstName", {}).get("default", "")
                    last_name = p.get("lastName", {}).get("default", "")
                    full_name = f"{first_name} {last_name}".strip()
                    pos_code = p.get("positionCode", pos_type)

                    all_players.append({
                        "nhl_id": nhl_id,
                        "player_name": full_name,
                        "position": pos_code,
                        "nhl_team": team
                    })
        except Exception as e:
            print(f"⚠️ Error fetching roster for {team}: {str(e)}")
        time.sleep(0.1)

    print(f"\n✅ Total active NHL players collected: {len(all_players)}")
    print("⏳ Fetching stats and upserting into Supabase 'nhl_master_players'...")

    # 2. Fetch stats and upsert into Supabase
    records_to_upsert = []
    for idx, player in enumerate(all_players, 1):
        nhl_id = player["nhl_id"]
        pos = player["position"]
        stats = fetch_player_season_stats(nhl_id, target_season_int, pos)

        record = {
            "nhl_id": nhl_id,
            "player_name": player["player_name"],
            "position": pos,
            "nhl_team": player["nhl_team"],
            "gp": stats["gp"],
            "goals": stats["goals"],
            "assists": stats["assists"],
            "plus_minus": stats["plus_minus"],
            "pim": stats["pim"],
            "sog": stats["sog"],
            "fantasy_points": stats["fantasy_points"]
        }
        records_to_upsert.append(record)

        if idx % 20 == 0 or idx == len(all_players):
            # Batch upsert into Supabase
            upsert_url = f"{SUPABASE_URL}/rest/v1/nhl_master_players"
            batch_res = requests.post(upsert_url, headers=HEADERS, json=records_to_upsert)
            if batch_res.status_code in (200, 201, 204):
                print(f"  [Batch {idx}/{len(all_players)}] Upserted successfully.")
            else:
                print(f"  ❌ Batch error: {batch_res.status_code} - {batch_res.text}")
            records_to_upsert = []

        time.sleep(0.1)

    print("\n🎉 Master Players Pool seeding finished successfully!")

if __name__ == "__main__":
    seed_master_players()
