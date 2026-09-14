import os
import time
import requests
import unicodedata

# Supabase Credentials from Environment Variables (with fallbacks)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wltqsayrupcvcrodsjmn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_z3uOEmQzAfN8Pz4F2w5cbw_dgdIYbGJ")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def normalize_text(text):
    if not text:
        return ""
    text = str(text).replace('ø', 'o').replace('Ø', 'O').replace('æ', 'ae').replace('Æ', 'AE')
    nfkd = unicodedata.normalize('NFKD', text)
    clean = "".join([c for c in nfkd if not unicodedata.combining(c)])
    clean = clean.lower().replace('-', ' ').replace("'", "").replace('.', '')
    return " ".join(clean.split())

def extract_candidates_from_result(p):
    candidates = []
    if "name" in p and isinstance(p["name"], str):
        candidates.append(p["name"])
    
    first = p.get("firstName", "")
    if isinstance(first, dict):
        first = first.get("default", "")
    last = p.get("lastName", "")
    if isinstance(last, dict):
        last = last.get("default", "")
        
    if first or last:
        candidates.append(f"{first} {last}")
        candidates.append(f"{last} {first}")
        
    return list(set(candidates)), normalize_text(first), normalize_text(last)

def search_nhl_player_id(player_name):
    if not player_name:
        return None
    
    target_norm = normalize_text(player_name)
    parts = target_norm.split()
    if not parts:
        return None
    
    first_name_target = parts[0]
    last_name_target = parts[-1]
    
    # Generate search queries: Full name, last name, and hyphenated components
    search_queries = [player_name, last_name_target]
    if '-' in player_name:
        for p in player_name.split('-'):
            if len(p.strip()) > 2:
                search_queries.append(p.strip())
    
    seen_queries = set()
    for query in search_queries:
        clean_q = query.strip()
        if not clean_q or clean_q in seen_queries:
            continue
        seen_queries.add(clean_q)
        
        try:
            res = requests.get(
                "https://api-web.nhle.com/v1/search/player",
                params={"query": clean_q},
                timeout=5
            )
            if res.status_code != 200:
                continue
                
            results = res.json()
            if not isinstance(results, list):
                continue
                
            # Pass 1: Exact Normalized Match
            for p in results:
                p_id = p.get("playerId") or p.get("id")
                if not p_id:
                    continue
                candidates, _, _ = extract_candidates_from_result(p)
                for cand in candidates:
                    if normalize_text(cand) == target_norm:
                        return str(p_id)
            
            # Pass 2: Token overlap (First Name & Last Name both present)
            for p in results:
                p_id = p.get("playerId") or p.get("id")
                if not p_id:
                    continue
                candidates, f_norm, l_norm = extract_candidates_from_result(p)
                for cand in candidates:
                    cand_norm = normalize_text(cand)
                    if first_name_target in cand_norm and last_name_target in cand_norm:
                        return str(p_id)
                if f_norm == first_name_target and l_norm == last_name_target:
                    return str(p_id)

        except Exception as e:
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
