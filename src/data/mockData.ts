import { GeneralManager, LeagueRules, Prospect } from '../types';
import rawLeagueData from './winkos_full_league_data.json';

// League rules as specified in the primary data source
export const LEAGUE_RULES: LeagueRules = rawLeagueData.leagueRules as LeagueRules;

// GM Metadata styling & team branding
interface GmMeta {
  teamName: string;
  avatarColor: string;
  avatarInitials: string;
}

const GM_METADATA: Record<string, GmMeta> = {
  Adam: {
    teamName: "Adam's Apex Predators",
    avatarColor: 'from-amber-500 to-orange-600',
    avatarInitials: 'AD',
  },
  Allan: {
    teamName: "Allan's Avalanche",
    avatarColor: 'from-blue-500 to-indigo-600',
    avatarInitials: 'AL',
  },
  Dan: {
    teamName: "Dan's Dynamos",
    avatarColor: 'from-emerald-500 to-teal-600',
    avatarInitials: 'DA',
  },
  Evan: {
    teamName: "Evan's Enforcers",
    avatarColor: 'from-violet-500 to-purple-600',
    avatarInitials: 'EV',
  },
  Glenn: {
    teamName: "Glenn's Gladiators",
    avatarColor: 'from-rose-500 to-red-600',
    avatarInitials: 'GL',
  },
  Jean: {
    teamName: "Jean's Juggernauts",
    avatarColor: 'from-cyan-500 to-blue-600',
    avatarInitials: 'JN',
  },
  Jon: {
    teamName: "Jon's Blades",
    avatarColor: 'from-fuchsia-500 to-pink-600',
    avatarInitials: 'JO',
  },
  Kyle: {
    teamName: "Kyle's Krushers",
    avatarColor: 'from-teal-500 to-emerald-600',
    avatarInitials: 'KY',
  },
  Mike: {
    teamName: "Mike's Mavericks",
    avatarColor: 'from-yellow-500 to-amber-600',
    avatarInitials: 'MI',
  },
  Nate: {
    teamName: "Nate's Nightstalkers",
    avatarColor: 'from-sky-500 to-blue-600',
    avatarInitials: 'NA',
  },
  Sam: {
    teamName: "Sam's Snipers",
    avatarColor: 'from-orange-500 to-amber-600',
    avatarInitials: 'SA',
  },
  Seb: {
    teamName: "Seb's Strikers",
    avatarColor: 'from-indigo-500 to-violet-600',
    avatarInitials: 'SE',
  },
};

// Known NHL Teams dictionary to enrich cards with authentic club badges
export const NHL_TEAMS_MAP: Record<string, { team: string; abbr: string }> = {
  'pavel dorofeyev': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'zach benson': { team: 'Buffalo Sabres', abbr: 'BUF' },
  'sam rinzel': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'jesper wallstedt': { team: 'Minnesota Wild', abbr: 'MIN' },
  'joel hofer': { team: 'St. Louis Blues', abbr: 'STL' },
  'nikita grebyonkin': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'danila yurov': { team: 'Minnesota Wild', abbr: 'MIN' },
  'nikita tolopilo': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'dalibor dvorsky': { team: 'St. Louis Blues', abbr: 'STL' },
  'ivan demidov': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'lian bichsel': { team: 'Dallas Stars', abbr: 'DAL' },
  'will smith': { team: 'San Jose Sharks', abbr: 'SJS' },
  'gavin brindley': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'maxim shabanov': { team: 'New York Islanders', abbr: 'NYI' },
  'brock faber': { team: 'Minnesota Wild', abbr: 'MIN' },
  'arturs silovs': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'marco rossi': { team: 'Minnesota Wild', abbr: 'MIN' },
  'matt coronato': { team: 'Calgary Flames', abbr: 'CGY' },
  'adam fantilli': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'calum ritchie': { team: 'Colorado Avalanche', abbr: 'COL' },
  'beckett sennecke': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'logan mailloux': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'tom willander': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'matthew schaefer': { team: 'San Jose Sharks', abbr: 'SJS' },
  'samuel ersson': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'ozzy wiesblatt': { team: 'Nashville Predators', abbr: 'NSH' },
  'dylan guenther': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'noah ostlund': { team: 'Buffalo Sabres', abbr: 'BUF' },
  'reid schaefer': { team: 'Nashville Predators', abbr: 'NSH' },
  'zachary bolduc': { team: 'St. Louis Blues', abbr: 'STL' },
  'ryan leonard': { team: 'Washington Capitals', abbr: 'WSH' },
  'axel sandin pellikka': { team: 'Detroit Red Wings', abbr: 'DET' },
  'dustin wolf': { team: 'Calgary Flames', abbr: 'CGY' },
  'jet greaves': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'william eklund': { team: 'San Jose Sharks', abbr: 'SJS' },
  'logan cooley': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'marco kasper': { team: 'Detroit Red Wings', abbr: 'DET' },
  'matthew wood': { team: 'Nashville Predators', abbr: 'NSH' },
  'gabe perreault': { team: 'New York Rangers', abbr: 'NYR' },
  'jackson blake': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'ryker evans': { team: 'Seattle Kraken', abbr: 'SEA' },
  'zeev buium': { team: 'Minnesota Wild', abbr: 'MIN' },
  'joey daccord': { team: 'Seattle Kraken', abbr: 'SEA' },
  'leevi meriläinen': { team: 'Ottawa Senators', abbr: 'OTT' },
  'aatu räty': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'cutter gauthier': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'matthew knies': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'connor bedard': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'mads søgaard': { team: 'Ottawa Senators', abbr: 'OTT' },
  'mads sogaard': { team: 'Ottawa Senators', abbr: 'OTT' },
  'pyotr kochetkov': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'colton dach': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'artyom levshunov': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'joseph woll': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'brandon bussi': { team: 'Boston Bruins', abbr: 'BOS' },
  'mavrik bourque': { team: 'Dallas Stars', abbr: 'DAL' },
  'leo carlsson': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'easton cowan': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'macklin celebrini': { team: 'San Jose Sharks', abbr: 'SJS' },
  'jordan spence': { team: 'Los Angeles Kings', abbr: 'LAK' },
  'sam dickinson': { team: 'San Jose Sharks', abbr: 'SJS' },
  'devon levi': { team: 'Buffalo Sabres', abbr: 'BUF' },
  'matthew savoie': { team: 'Edmonton Oilers', abbr: 'EDM' },
  'oliver moore': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'michael misa': { team: 'San Jose Sharks', abbr: 'SJS' },
  'thomas harley': { team: 'Dallas Stars', abbr: 'DAL' },
  'luke hughes': { team: 'New Jersey Devils', abbr: 'NJD' },
  'denton mateychuk': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'jakub dobes': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'dennis hildeby': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'arseni gritsyuk': { team: 'New Jersey Devils', abbr: 'NJD' },
  'frank nazar': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'nick lardis': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'denver barkey': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'alexander nikishin': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'lukas dostal': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'logan stankoven': { team: 'Dallas Stars', abbr: 'DAL' },
  'shane wright': { team: 'Seattle Kraken', abbr: 'SEA' },
  'liam ohgren': { team: 'Minnesota Wild', abbr: 'MIN' },
  'jimmy snuggerud': { team: 'St. Louis Blues', abbr: 'STL' },
  'matvei michkov': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'berkly catton': { team: 'Seattle Kraken', abbr: 'SEA' },
  'benjamin kindel': { team: 'Calgary Flames', abbr: 'CGY' },
  'simon edvinsson': { team: 'Detroit Red Wings', abbr: 'DET' },
  'olen zellweger': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'brandt clarke': { team: 'Los Angeles Kings', abbr: 'LAK' },
  'lane hutson': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'spencer knight': { team: 'Florida Panthers', abbr: 'FLA' },
  'yaroslav askarov': { team: 'San Jose Sharks', abbr: 'SJS' },
  'josh ho-sang': { team: 'New York Islanders', abbr: 'NYI' },
  'aleksi heponiemi': { team: 'Florida Panthers', abbr: 'FLA' },
  'ivan chekhovich': { team: 'San Jose Sharks', abbr: 'SJS' },
  'nikita nesterenko': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'jacob perreault': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'tristen robins': { team: 'San Jose Sharks', abbr: 'SJS' },
  'lenni hameenaho': { team: 'New Jersey Devils', abbr: 'NJD' },
  'luca cagnoni': { team: 'San Jose Sharks', abbr: 'SJS' },
  'ryan ufko': { team: 'Nashville Predators', abbr: 'NSH' },
  'calle clang': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'niklas kokko': { team: 'Seattle Kraken', abbr: 'SEA' },
  'martin kaut': { team: 'Colorado Avalanche', abbr: 'COL' },
  'sean farrell': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'oskar olausson': { team: 'Colorado Avalanche', abbr: 'COL' },
  'jonathan lekkerimäki': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'owen beck': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'michael brandsegg-nygard': { team: 'Detroit Red Wings', abbr: 'DET' },
  'anton frondell': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'oliver bonk': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'carter yakemchuk': { team: 'Ottawa Senators', abbr: 'OTT' },
  'jakub skarek': { team: 'New York Islanders', abbr: 'NYI' },
  'sebastian cossa': { team: 'Detroit Red Wings', abbr: 'DET' },
  'sergei murashov': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'adam brooks': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'roby jarventie': { team: 'Edmonton Oilers', abbr: 'EDM' },
  'felix unger sorum': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'tristan luneau': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'dmitri simashev': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'zayne parekh': { team: 'Calgary Flames', abbr: 'CGY' },
  'maveric lamoureux': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'olle eriksson ek': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'alexei kolosov': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'eetu makiniemi': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'kole lind': { team: 'Dallas Stars', abbr: 'DAL' },
  'nathan legare': { team: 'New Jersey Devils', abbr: 'NJD' },
  'tristan broz': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'joakim kemell': { team: 'Nashville Predators', abbr: 'NSH' },
  'brad lambert': { team: 'Winnipeg Jets', abbr: 'WPG' },
  'ivan miroshnichenko': { team: 'Washington Capitals', abbr: 'WSH' },
  'luca del bel belluz': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'egor afanasyev': { team: 'San Jose Sharks', abbr: 'SJS' },
  'trey fix-wolansky': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'jan jenik': { team: 'Ottawa Senators', abbr: 'OTT' },
  'nikita chibrikov': { team: 'Winnipeg Jets', abbr: 'WPG' },
  'fabian lysell': { team: 'Boston Bruins', abbr: 'BOS' },
  'nathan gaucher': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'nate danielson': { team: 'Detroit Red Wings', abbr: 'DET' },
  'daniil but': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'brady martin': { team: 'Calgary Flames', abbr: 'CGY' },
  'victor soderstrom': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'hunter brzustewicz': { team: 'Calgary Flames', abbr: 'CGY' },
  'vitali abramov': { team: 'Ottawa Senators', abbr: 'OTT' },
  'dylan sikura': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'cooper marody': { team: 'Edmonton Oilers', abbr: 'EDM' },
  'vasili ponomaryov': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'xavier bourgault': { team: 'Ottawa Senators', abbr: 'OTT' },
  'brennan othmann': { team: 'New York Rangers', abbr: 'NYR' },
  'rutger mcgroarty': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'jett luchanko': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'konsta helenius': { team: 'Buffalo Sabres', abbr: 'BUF' },
  'ilya protas': { team: 'Washington Capitals', abbr: 'WSH' },
  'scott morrow': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'dylan garand': { team: 'New York Rangers', abbr: 'NYR' },
  'akil thomas': { team: 'Los Angeles Kings', abbr: 'LAK' },
  'yegor sokolov': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'lucas johansen': { team: 'Washington Capitals', abbr: 'WSH' },
  'carson lambos': { team: 'Minnesota Wild', abbr: 'MIN' },
  'german rubtsov': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'valentin zykov': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'nolan foote': { team: 'New Jersey Devils', abbr: 'NJD' },
  'samuel poulin': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'brendan brisson': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'zach dean': { team: 'St. Louis Blues', abbr: 'STL' },
  'joshua roy': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'domenick fensore': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'adam engstrom': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'jake livingstone': { team: 'Nashville Predators', abbr: 'NSH' },
  'kasimir kaskisuo': { team: 'Nashville Predators', abbr: 'NSH' },
  'joel blomqvist': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'jacob fowler': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'jaxson stauber': { team: 'Utah Hockey Club', abbr: 'UTA' },
  'grigori denisenko': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'ruslan iskhakov': { team: 'New York Islanders', abbr: 'NYI' },
  'raphael lavoie': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'tyler benson': { team: 'Edmonton Oilers', abbr: 'EDM' },
  'isaac ratcliffe': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'adam beckman': { team: 'Minnesota Wild', abbr: 'MIN' },
  'daniil gushchin': { team: 'San Jose Sharks', abbr: 'SJS' },
  'william dufour': { team: 'New York Islanders', abbr: 'NYI' },
  'adam sykora': { team: 'New York Rangers', abbr: 'NYR' },
  'samuel honzek': { team: 'Calgary Flames', abbr: 'CGY' },
  'brayden yager': { team: 'Winnipeg Jets', abbr: 'WPG' },
  'otto stenberg': { team: 'St. Louis Blues', abbr: 'STL' },
  'james hagens': { team: 'Boston Bruins', abbr: 'BOS' },
  'olli juolevi': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'dmitri samorukov': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'lassi thomson': { team: 'Ottawa Senators', abbr: 'OTT' },
  'mikko lehtonen': { team: 'Toronto Maple Leafs', abbr: 'TOR' },
  'david reinbacher': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'drew commesso': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'thomas bordeleau': { team: 'San Jose Sharks', abbr: 'SJS' },
  'dylan duke': { team: 'Tampa Bay Lightning', abbr: 'TBL' },
  'william stromgren': { team: 'Calgary Flames', abbr: 'CGY' },
  'cameron lund': { team: 'San Jose Sharks', abbr: 'SJS' },
  'sacha boisvert': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'helge grans': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'mattias norlinder': { team: 'Montreal Canadiens', abbr: 'MTL' },
  'seamus casey': { team: 'New Jersey Devils', abbr: 'NJD' },
  'harrison brunicke': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'veini vehvelainen': { team: 'Columbus Blue Jackets', abbr: 'CBJ' },
  'ivan prosvetov': { team: 'Colorado Avalanche', abbr: 'COL' },
  'erik portillo': { team: 'Los Angeles Kings', abbr: 'LAK' },
  'brayden tracey': { team: 'Anaheim Ducks', abbr: 'ANA' },
  'samuel fagemo': { team: 'Los Angeles Kings', abbr: 'LAK' },
  'aleksi saarela': { team: 'Florida Panthers', abbr: 'FLA' },
  'matvei gridin': { team: 'Calgary Flames', abbr: 'CGY' },
  'victor eklund': { team: 'Chicago Blackhawks', abbr: 'CHI' },
  'lukas cormier': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'owen pickering': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'cole hutson': { team: 'Washington Capitals', abbr: 'WSH' },
  'michael dipietro': { team: 'Boston Bruins', abbr: 'BOS' },
  'carl lindbom': { team: 'Vegas Golden Knights', abbr: 'VGK' },
  'ryan suzuki': { team: 'Carolina Hurricanes', abbr: 'CAR' },
  'alexander chmelevski': { team: 'San Jose Sharks', abbr: 'SJS' },
  'isak rosen': { team: 'Buffalo Sabres', abbr: 'BUF' },
  'ville koivunen': { team: 'Pittsburgh Penguins', abbr: 'PIT' },
  'isaac howard': { team: 'Tampa Bay Lightning', abbr: 'TBL' },
  'jani nyman': { team: 'Seattle Kraken', abbr: 'SEA' },
  'igor chernyshov': { team: 'San Jose Sharks', abbr: 'SJS' },
  'porter martone': { team: 'Philadelphia Flyers', abbr: 'PHI' },
  'braeden cootes': { team: 'Calgary Flames', abbr: 'CGY' },
  'cam dineen': { team: 'Arizona Coyotes', abbr: 'ARI' },
  'ryan merkley': { team: 'San Jose Sharks', abbr: 'SJS' },
  'jack rathbone': { team: 'Vancouver Canucks', abbr: 'VAN' },
  'david farrance': { team: 'Nashville Predators', abbr: 'NSH' },
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizePlayerName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Precomputed baseline seasons with 25+ GP for key NHL players
 * Derived directly from official NHL regular season historical records
 */
export const KNOWN_25_PLUS_SEASONS: Record<string, number> = {
  'pavel dorofeyev': 3,
  'zach benson': 3,
  'joel hofer': 3,
  'sam rinzel': 1,
  'nikita nesterenko': 1,
  'danila yurov': 1,
  'lenni hameenaho': 1,
  'jesper wallstedt': 1,
  'brock faber': 3,
  'marco rossi': 3,
  'matt coronato': 2,
  'luke hughes': 3,
  'leo carlsson': 2,
  'will smith': 2,
  'shane wright': 2,
  'dustin wolf': 2,
  'lukas dostal': 3,
  'pyotr kochetkov': 3,
  'samuel ersson': 2,
  'jordan spence': 2,
  'thomas harley': 3,
  'joey daccord': 3,
  'mads søgaard': 1,
  'mads sogaard': 1,
};

export function getBaseline25PlusSeasons(name: string, totalGames: number = 0): number {
  const norm = normalizePlayerName(name);
  if (norm in KNOWN_25_PLUS_SEASONS) {
    return KNOWN_25_PLUS_SEASONS[norm];
  }
  if (totalGames >= 180) return Math.min(4, Math.floor(totalGames / 60));
  if (totalGames >= 110) return Math.min(4, Math.floor(totalGames / 55));
  if (totalGames >= 50) return 1;
  if (totalGames >= 25) return 1;
  return 0;
}

export function getStored25PlusSeasons(prospectId: string, name: string, fallbackGames: number = 0): number {
  if (typeof window !== 'undefined' && window.localStorage) {
    const byId = window.localStorage.getItem(`winkos_25plus_${prospectId}`);
    if (byId !== null && !isNaN(Number(byId))) {
      return Number(byId);
    }
    const norm = normalizePlayerName(name);
    const byName = window.localStorage.getItem(`winkos_25plus_name_${norm}`);
    if (byName !== null && !isNaN(Number(byName))) {
      return Number(byName);
    }
  }
  return getBaseline25PlusSeasons(name, fallbackGames);
}

export function setStored25PlusSeasons(prospectId: string, name: string, count: number): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`winkos_25plus_${prospectId}`, String(count));
      const norm = normalizePlayerName(name);
      if (norm) {
        window.localStorage.setItem(`winkos_25plus_name_${norm}`, String(count));
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }
}

export function getStoredProspectStatus(prospectId: string, name: string): 'active' | 'trashed' | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const byId = window.localStorage.getItem(`winkos_status_${prospectId}`);
      if (byId === 'trashed' || byId === 'active') {
        return byId as 'active' | 'trashed';
      }
      const norm = normalizePlayerName(name);
      if (norm) {
        const byName = window.localStorage.getItem(`winkos_status_name_${norm}`);
        if (byName === 'trashed' || byName === 'active') {
          return byName as 'active' | 'trashed';
        }
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }
  return null;
}

export function setStoredProspectStatus(prospectId: string, name: string, status: 'active' | 'trashed'): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`winkos_status_${prospectId}`, status);
      const norm = normalizePlayerName(name);
      if (norm) {
        window.localStorage.setItem(`winkos_status_name_${norm}`, status);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }
}

/**
 * Transforms raw league data from winkos_full_league_data.json into the GeneralManager model
 */
export const INITIAL_GMS: GeneralManager[] = rawLeagueData.gms.map((gm) => {
  const meta = GM_METADATA[gm.name] || {
    teamName: `${gm.name}'s Franchise`,
    avatarColor: 'from-slate-600 to-slate-800',
    avatarInitials: gm.name.slice(0, 2).toUpperCase(),
  };

  const prospects: Prospect[] = gm.prospects.map((p) => {
    const lowerName = p.name.toLowerCase();
    const teamInfo = NHL_TEAMS_MAP[lowerName] || { team: 'NHL Prospect', abbr: 'NHL' };
    const isGoalie = p.pos === 'G';
    const singleLimit = isGoalie
      ? LEAGUE_RULES.goalies.singleSeasonPromote
      : LEAGUE_RULES.skaters.singleSeasonPromote;

    // Distribute total games into currentSeasonGP and priorCareerGP logically
    let currentSeasonGP = 0;
    let priorCareerGP = 0;

    if (p.totalGames === 0) {
      currentSeasonGP = 0;
      priorCareerGP = 0;
    } else if (p.promoted) {
      currentSeasonGP = Math.min(p.totalGames, singleLimit);
      priorCareerGP = Math.max(0, p.totalGames - currentSeasonGP);
    } else {
      currentSeasonGP = Math.min(p.totalGames, singleLimit - 1);
      priorCareerGP = Math.max(0, p.totalGames - currentSeasonGP);
    }

    const prospectId = `p-${gm.name.toLowerCase()}-${slugify(p.name)}`;
    const seasons25PlusGP = getStored25PlusSeasons(prospectId, p.name, p.totalGames);
    const storedStatus = getStoredProspectStatus(prospectId, p.name);

    const prospectObj: Prospect = {
      id: prospectId,
      name: p.name,
      position: p.pos as 'F' | 'D' | 'G',
      draftYear: p.draftYear,
      totalGames: p.totalGames,
      currentSeasonGP,
      priorCareerGP,
      promoted: Boolean(p.promoted),
      promotionDate: p.promotionDate,
      isProtected: Boolean(p.protected),
      status: storedStatus || 'active',
      nhlTeam: teamInfo.team,
      nhlTeamAbbr: teamInfo.abbr,
      apiSyncStatus: 'idle',
      seasons25PlusGP,
    };

    return prospectObj;
  });

  return {
    id: `gm-${gm.name.toLowerCase()}`,
    name: gm.name,
    teamName: meta.teamName,
    winkoinBalance: gm.winkoins,
    avatarColor: meta.avatarColor,
    avatarInitials: meta.avatarInitials,
    is_commish: gm.name.toLowerCase() === 'adam',
    pin: gm.name.toLowerCase() === 'adam' ? '1234' : '0000',
    prospects,
  };
});
