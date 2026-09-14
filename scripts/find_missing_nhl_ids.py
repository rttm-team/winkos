import os
import time
import requests
import unicodedata

# Supabase Credentials from Environment Variables
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wltqsayrupcvcrodsjmn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_z3uOEmQzAfN8Pz4F2w5cbw_dgdIYbGJ")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def remove_accents(input_str):
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def search_nhl_player_id(player_name):
    clean_name = remove_accents(player_name).replace('-', ' ')
    search_url = f"https://api-web.nhle.com/v1/search/player?query={clean_name}"
    try:
        res = requests.get(search_url, timeout=5)
        if res.status_code == 200:
            results = res.json()
            if isinstance(results, list):
                for p in results:
                    name_candidates = []
                    if "name" in p and isinstance(p["name"], str):
                        name_candidates.append(p["name"])
                    first = p.get("firstName", "")
                    if isinstance(first, dict):
                        first = first.get("default", "")
                    last = p.get("lastName", "")
                    if isinstance(last, dict):
                        last = last.get("default", "")
                    full = f"{first} {last}".strip()
                    if full:
                        name_candidates.append(full)
                    
                    for cand in name_candidates:
                        if remove_accents(cand.lower()).replace('-', ' ') == remove_accents(player_name.lower()).replace('-', ' '):
                            p_id = p.get("playerId") or p.get("id")
                            if p_id:
                                return str(p_id)
    except Exception:
        pass
    return None

def main():
    print("🔍 Fetching prospects missing nhl_id from Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/prospects?select=*&nhl_id=is.null"
    res = requests.get(url, headers=HEADERS)
    if res.status_code != 200:
        print(f"Error fetching prospects: {res.text}")
        return
    
    prospects = res.json()
    print(f"Found {len(prospects)} prospects without nhl_id.\n")
    
    found_count = 0
    for p in prospects:
        name = p.get("player_name") or p.get("name")
        p_id = p.get("id")
        if not name:
            continue
        
        nhl_id = search_nhl_player_id(name)
        if nhl_id:
            update_url = f"{SUPABASE_URL}/rest/v1/prospects?id=eq.{p_id}"
            patch_res = requests.patch(update_url, headers=HEADERS, json={"nhl_id": int(nhl_id)})
            if patch_res.status_code in (200, 204):
                print(f"✅ Matched & Updated {name} -> NHL ID: {nhl_id}")
                found_count += 1
            else:
                print(f"⚠️ Found ID {nhl_id} for {name}, but Supabase update failed: {patch_res.text}")
        else:
            print(f"❌ No exact NHL match found for: {name}")
            
        time.sleep(0.1)

    print(f"\n🎉 Process finished! Linked {found_count} new players in Supabase.")

if __name__ == "__main__":
    main()
