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

# Known/Verified NHL IDs for quick lookup
KNOWN_NHL_PLAYER_IDS = {
    'zach benson': 8484145, 'nikita nesterenko': 8481754, 'danila yurov': 8483525, 
    'sam rinzel': 8483506, 'jesper wallstedt': 8482661, 'will smith': 8484144, 
    'lane hutson': 8483477, 'dustin wolf': 8481691, 'cutter gauthier': 8483429, 
    'matthew knies': 8482720, 'brandt clarke': 8482702, 'yaroslav askarov': 8482137, 
    'macklin celebrini': 8484807, 'rutger mcgroarty': 8483441, 'simon edvinsson': 8482686, 
    'devon levi': 8482163, 'logan stankoven': 8482705, 'olen zellweger': 8482803, 
    'sebastian cossa': 8482672, 'connor bedard': 8484144, 'adam fantilli': 8484146, 
    'brock faber': 8482122, 'marco rossi': 8482097, 'dylan guenther': 8482699, 
    'logan cooley': 8483431, 'matvei michkov': 8484152, 'beckett sennecke': 8484813, 
    'artyom levshunov': 8484808, 'sam dickinson': 8484811, 'berkly catton': 8484812, 
    'zayne parekh': 8484814, 'zeev buium': 8484815, 'joel hofer': 8480981, 
    'lukas dostal': 8481033, 'pyotr kochetkov': 8481577, 'joseph woll': 8479361, 
    'samuel ersson': 8481035, 'spencer knight': 8481519, 'luke hughes': 8482684, 
    'thomas harley': 8481548, 'shane wright': 8483430, 'leo carlsson': 8484147, 
    'pavel dorofeyev': 8481604, 'jordan spence': 8481585, 'frank nazar': 8483436, 
    'denton mateychuk': 8483438, 'easton cowan': 8484180, 'dalibor dvorsky': 8484148, 
    'ivan demidov': 8484809, 'alexander nikishin': 8482139, 'joey daccord': 8478916, 
    'matt coronato': 8482717, 'jackson blake': 8482751, 'ryker evans': 8482794, 
    'colton dach': 8482708, 'mavrik bourque': 8482113, 'jakub dobes': 8482148, 
    'joshua roy': 8482761, 'daniil gushchin': 8482151, 'brayden yager': 8484158, 
    'josh ho-sang': 8477959, 'jakob ihs-wozniak': 8485416, 'jonathan lekkerimaki': 8483476, 
    'mads sogaard': 8481544, 'leevi merilainen': 8482447, 'aatu raty': 8482691, 
    'vitali kravtsov': 8480838, 'trey fix-wolansky': 8481084, 'egor afanasyev': 8481601,
    'jan jenik': 8481068, 'fabian lysell': 8482690, 'tyler boucher': 8482711,
    'noah ostlund': 8483495, 'nathan gaucher': 8483501, 'reid schaefer': 8483500,
    'zachary bolduc': 8482714, 'nate danielson': 8484149, 'quentin musty': 8484159,
    'daniil but': 8484143, 'ryan leonard': 8484156, 'victor soderstrom': 8481580,
    'corson ceulemans': 8482713, 'ozzy wiesblatt': 8482108, 'francesco pinelli': 8482725
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
        
    return list(set(candidates))

def search_nhl_player_id(player_name):
    if not player_name:
        return None
    
    target_norm = normalize_text(player_name)
    if not target_norm:
        return None

    # Check known dictionary first
    if target_norm in KNOWN_NHL_PLAYER_IDS:
        return str(KNOWN_NHL_PLAYER_IDS[target_norm])

    parts = target_norm.split()
    first_name_target = parts[0]
    last_name_target = parts[-1]
    
    # 1. Primary NHL Database Search (search.d3.nhle.com) - includes ALL draftees & prospects
    d3_url = f"https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=15&q={last_name_target}"
    try:
        res = requests.get(d3_url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            results = data if isinstance(data, list) else data.get("data", [])
            for p in results:
                p_id = p.get("playerId") or p.get("id")
                if not p_id:
                    continue
                cand_names = extract_candidates_from_result(p)
                for cand in cand_names:
                    cand_norm = normalize_text(cand)
                    if cand_norm == target_norm:
                        return str(p_id)
                    if first_name_target in cand_norm and last_name_target in cand_norm:
                        return str(p_id)
    except Exception:
        pass

    # 2. Secondary Web API Search (api-web.nhle.com) - active NHL roster search
    web_url = f"https://api-web.nhle.com/v1/search/player?query={last_name_target}"
    try:
        res = requests.get(web_url, timeout=5)
        if res.status_code == 200:
            results = res.json()
            if isinstance(results, list):
                for p in results:
                    p_id = p.get("playerId") or p.get("id")
                    if not p_id:
                        continue
                    cand_names = extract_candidates_from_result(p)
                    for cand in cand_names:
                        cand_norm = normalize_text(cand)
                        if cand_norm == target_norm:
                            return str(p_id)
                        if first_name_target in cand_norm and last_name_target in cand_norm:
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
    skipped_count = 0
    
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
            print(f"ℹ️ Unlinked Prospect (0 GP / No NHL profile yet): {name}")
            skipped_count += 1
            
        time.sleep(0.05)

    print(f"\n🎉 Process finished! Linked {found_count} new players in Supabase ({skipped_count} prospects remain unlinked until they debut).")

if __name__ == "__main__":
    main()
