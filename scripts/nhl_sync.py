import os
import time
import requests

# 1. Supabase Credentials (from Environment Variables, with default fallbacks)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wltqsayrupcvcrodsjmn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_z3uOEmQzAfN8Pz4F2w5cbw_dgdIYbGJ")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY credentials.")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def fetch_prospects_with_nhl_ids():
    """Fetch all prospects from Supabase that have an nhl_id set."""
    url = f"{SUPABASE_URL}/rest/v1/prospects?select=*&nhl_id=not.is.null"
    res = requests.get(url, headers=HEADERS)
    if res.status_code != 200:
        print(f"❌ Failed to fetch prospects from Supabase: {res.text}")
        return []
    return res.json()

def sync_player_stats(prospect):
    nhl_id = prospect.get("nhl_id")
    player_id = prospect.get("id")
    name = prospect.get("player_name", "Unknown Player")
    position = prospect.get("position", "F")
    
    # Direct fetch to official NHL API
    api_url = f"https://api-web.nhle.com/v1/player/{nhl_id}/landing"
    
    try:
        res = requests.get(api_url, timeout=10)
        if res.status_code != 200:
            print(f"⚠️ Could not fetch NHL stats for {name} (ID: {nhl_id}). HTTP {res.status_code}")
            return
        
        data = res.json()
        career_totals = data.get("careerTotals", {}).get("regularSeason", {})
        total_gp = career_totals.get("gamesPlayed", 0)
        
        # Parse season totals for multi-season rules
        season_totals = data.get("seasonTotals", [])
        max_single_season_gp = 0
        qualifying_seasons = 0
        season_breakdown = []
        
        is_goalie = (position == "G")
        qualifying_threshold = 15 if is_goalie else 25
        
        # Aggregate GP by season (regular season only)
        seasons_map = {}
        for st in season_totals:
            if st.get("gameTypeId") == 2:  # 2 = Regular Season
                s_id = str(st.get("season"))
                gp = st.get("gamesPlayed", 0)
                seasons_map[s_id] = seasons_map.get(s_id, 0) + gp
        
        for season_id, gp in seasons_map.items():
            if gp > max_single_season_gp:
                max_single_season_gp = gp
            
            qualifies = (gp >= qualifying_threshold)
            if qualifies:
                qualifying_seasons += 1
                
            season_breakdown.append({"season": season_id, "gp": gp, "qualifies": qualifies})
            
        # Evaluate Rule Thresholds
        single_season_promo_limit = 20 if is_goalie else 40
        career_promo_limit = 30 if is_goalie else 65
        protection_gp_limit = 140 if is_goalie else 200
        
        should_promote = (max_single_season_gp >= single_season_promo_limit) or (total_gp >= career_promo_limit)
        loses_protection = (total_gp >= protection_gp_limit) or (qualifying_seasons >= 4)
        
        # Prepare payload for Supabase
        update_payload = {
            "total_games": total_gp,
            "max_single_season_gp": max_single_season_gp,
            "qualifying_seasons": qualifying_seasons,
            "season_breakdown": season_breakdown,
            "promoted": True if should_promote else prospect.get("promoted", False),
            "protected": False if loses_protection else prospect.get("protected", True)
        }
        
        # Update row in Supabase
        update_url = f"{SUPABASE_URL}/rest/v1/prospects?id=eq.{player_id}"
        patch_res = requests.patch(update_url, headers=HEADERS, json=update_payload)
        
        if patch_res.status_code in (200, 204):
            print(f"✅ Synced {name}: {total_gp} GP (Max Season: {max_single_season_gp}, Qual Seasons: {qualifying_seasons})")
        else:
            print(f"❌ Failed to update Supabase for {name}: {patch_res.text}")
            
    except Exception as e:
        print(f"⚠️ Error syncing {name}: {str(e)}")

def main():
    print("🚀 Starting Winko's NHL Stats Automated Sync...")
    prospects = fetch_prospects_with_nhl_ids()
    print(f"Found {len(prospects)} prospects with linked NHL IDs.")
    
    for prospect in prospects:
        sync_player_stats(prospect)
        time.sleep(0.15)  # Polite delay to avoid API rate limits
        
    print("🎉 Sync completed successfully!")

if __name__ == "__main__":
    main()
