import os
import time
import requests
from datetime import datetime, timedelta, timezone

# Supabase Credentials
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wltqsayrupcvcrodsjmn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

WIN_REWARD_WINKOINS = 50  # Winkoins awarded per correct game prediction

def get_target_dates():
    """Returns (yesterday_str, today_str) in YYYY-MM-DD format based on UTC."""
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%Y-%m-%d")
    yesterday_str = (now_utc - timedelta(days=1)).strftime("%Y-%m-%d")
    return yesterday_str, today_str

def fetch_nhl_games_for_date(date_str):
    """Fetches NHL game scores and schedules from official NHL API for a given YYYY-MM-DD date."""
    url = f"https://api-web.nhle.com/v1/score/{date_str}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            return res.json().get("games", [])
        else:
            print(f"⚠️ NHL API returned status {res.status_code} for date {date_str}")
            return []
    except Exception as e:
        print(f"⚠️ Error fetching NHL API for date {date_str}: {str(e)}")
        return []

def settle_yesterday_predictions(yesterday_str):
    """Resolves pending game predictions for yesterday's completed NHL games and awards Winkoins."""
    print(f"\n🏒 1. Settling Yesterday's Game Predictions ({yesterday_str})...")
    
    games = fetch_nhl_games_for_date(yesterday_str)
    if not games:
        print(f"ℹ️ No NHL games found for {yesterday_str}.")
        return

    # Map completed games: game_id -> winning_team_abbrev
    completed_outcomes = {}
    for game in games:
        game_id = str(game.get("id"))
        game_state = game.get("gameState", "")
        
        # Check if game is finished (OFF, FINAL, CRIT)
        if game_state in ("OFF", "FINAL", "OVER"):
            home_team = game.get("homeTeam", {})
            away_team = game.get("awayTeam", {})
            home_score = home_team.get("score", 0)
            away_score = away_team.get("score", 0)

            if home_score > away_score:
                winner = home_team.get("abbrev")
            elif away_score > home_score:
                winner = away_team.get("abbrev")
            else:
                winner = "TIE"

            completed_outcomes[game_id] = {
                "winner": winner,
                "home_team": home_team.get("abbrev"),
                "away_team": away_team.get("abbrev"),
                "home_score": home_score,
                "away_score": away_score
            }

    print(f"Found {len(completed_outcomes)} completed games from yesterday.")

    if not completed_outcomes or not SUPABASE_KEY:
        return

    # Fetch pending predictions from Supabase (status = 'PENDING')
    pred_url = f"{SUPABASE_URL}/rest/v1/daily_predictions?select=*&status=eq.PENDING"
    try:
        res = requests.get(pred_url, headers=HEADERS)
        if res.status_code != 200:
            print(f"ℹ️ Could not query daily_predictions table ({res.status_code}). Skipping settlement.")
            return

        predictions = res.json()
        if not predictions:
            print("ℹ️ No pending predictions found to settle.")
            return

        print(f"Processing {len(predictions)} pending predictions...")

        for pred in predictions:
            pred_id = pred.get("id")
            game_id = str(pred.get("game_id"))
            gm_name = pred.get("gm_name")
            picked_team = pred.get("predicted_winner")

            if game_id in completed_outcomes:
                outcome = completed_outcomes[game_id]
                winner = outcome["winner"]

                if picked_team == winner:
                    # Prediction WON!
                    new_status = "WON"
                    print(f"🎉 {gm_name} correctly predicted {picked_team}! (+{WIN_REWARD_WINKOINS} Winkoins)")

                    # 1. Update GM Winkoin balance
                    gm_url = f"{SUPABASE_URL}/rest/v1/gms?name=eq.{gm_name}&select=winkoins"
                    gm_res = requests.get(gm_url, headers=HEADERS)
                    if gm_res.status_code == 200 and gm_res.json():
                        curr_winkoins = gm_res.json()[0].get("winkoins", 0) or 0
                        new_winkoins = curr_winkoins + WIN_REWARD_WINKOINS

                        # Patch gms table
                        patch_gm_url = f"{SUPABASE_URL}/rest/v1/gms?name=eq.{gm_name}"
                        requests.patch(patch_gm_url, headers=HEADERS, json={"winkoins": new_winkoins})

                    # 2. Log Winkoin Transaction
                    tx_url = f"{SUPABASE_URL}/rest/v1/winkoin_transactions"
                    tx_data = {
                        "gm_name": gm_name,
                        "amount": WIN_REWARD_WINKOINS,
                        "transaction_type": "game_reward",
                        "description": f"Correct prediction: {picked_team} won against {outcome['away_team'] if winner == outcome['home_team'] else outcome['home_team']}"
                    }
                    requests.post(tx_url, headers=HEADERS, json=tx_data)

                else:
                    # Prediction LOST
                    new_status = "LOST"
                    print(f"❌ {gm_name} predicted {picked_team}, but {winner} won.")

                # Update prediction status in Supabase
                patch_pred_url = f"{SUPABASE_URL}/rest/v1/daily_predictions?id=eq.{pred_id}"
                requests.patch(patch_pred_url, headers=HEADERS, json={"status": new_status, "actual_winner": winner})

    except Exception as e:
        print(f"⚠️ Error settling predictions: {str(e)}")

def sync_today_games(today_str):
    """Fetches today's slate of NHL games and updates daily_games table in Supabase for GM challenges."""
    print(f"\n📅 2. Syncing Today's NHL Game Schedule ({today_str})...")

    games = fetch_nhl_games_for_date(today_str)
    if not games:
        print(f"ℹ️ No NHL games scheduled for today ({today_str}).")
        return

    print(f"Found {len(games)} games scheduled for today.")

    if not SUPABASE_KEY:
        print("⚠️ SUPABASE_KEY missing; skipping database insertion.")
        return

    formatted_games = []
    for game in games:
        home_team = game.get("homeTeam", {})
        away_team = game.get("awayTeam", {})
        
        formatted_games.append({
            "game_id": game.get("id"),
            "game_date": today_str,
            "home_team": home_team.get("abbrev"),
            "away_team": away_team.get("abbrev"),
            "home_team_name": home_team.get("commonName", {}).get("default", home_team.get("abbrev")),
            "away_team_name": away_team.get("commonName", {}).get("default", away_team.get("abbrev")),
            "start_time": game.get("startTimeUTC"),
            "status": game.get("gameState", "FUT")
        })

    # Upsert into daily_games table in Supabase
    upsert_headers = dict(HEADERS)
    upsert_headers["Prefer"] = "resolution=merge-duplicates"
    
    url = f"{SUPABASE_URL}/rest/v1/daily_games"
    try:
        res = requests.post(url, headers=upsert_headers, json=formatted_games)
        if res.status_code in (200, 201, 204):
            print(f"✅ Successfully synced {len(formatted_games)} daily games into Supabase!")
        else:
            print(f"⚠️ Supabase upsert returned {res.status_code}: {res.text}")
    except Exception as e:
        print(f"⚠️ Exception syncing today's games: {str(e)}")

def main():
    print("🚀 Starting Winko's Daily Challenges & Schedule Sync...")
    yesterday_str, today_str = get_target_dates()

    # Step 1: Settle yesterday's completed game predictions
    settle_yesterday_predictions(yesterday_str)

    # Step 2: Load today's game schedule for GM predictions
    sync_today_games(today_str)

    print("\n🎉 Daily Challenges Sync completed successfully!")

if __name__ == "__main__":
    main()
