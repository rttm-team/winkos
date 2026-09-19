import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  Target, 
  ShieldCheck, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ArrowRightLeft, 
  Ticket,
  Lock, 
  Unlock, 
  AlertCircle, 
  Sparkles,
  Flame,
  Coins,
  Users,
  Check,
  Calendar,
  Gamepad2,
  HelpCircle,
  Activity
} from 'lucide-react';

interface Game {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: { abbrev: string; logo: string; score?: number };
  homeTeam: { abbrev: string; logo: string; score?: number };
}

interface PickRecord {
  id?: number;
  gm_name: string;
  pick_date: string;
  game_id: number;
  home_team: string;
  away_team: string;
  predicted_winner: string;
  is_correct?: boolean;
}

interface OverallLeaderboardEntry {
  gmName: string;
  challengesParticipated: number;
  winkoinsEarned: number;
  currentBalance: number;
}

interface ChallengeGameType {
  id: string;
  title: string;
  icon: string;
  badge: string;
  description: string;
  status: 'active' | 'coming_soon';
}

const CHALLENGE_GAMES: ChallengeGameType[] = [
  {
    id: 'tonights_games',
    title: "Tonight's Games",
    icon: '🏒',
    badge: 'Active Tonight',
    description: 'Pick the winner for all scheduled matchups. All selections lock 10 minutes before first puck drop.',
    status: 'active'
  },
  {
    id: 'goal_scorer_bingo',
    title: 'Goal Scorer Bingo',
    icon: '🎯',
    badge: 'Coming Soon',
    description: 'Pick 4 anytime goal scorers from tonight’s action to hit a bingo payout.',
    status: 'coming_soon'
  },
  {
    id: 'over_under_totals',
    title: 'Over / Under Totals',
    icon: '⚡',
    badge: 'Coming Soon',
    description: 'Predict whether total matchup goals go over or under Vegas game lines.',
    status: 'coming_soon'
  }
];

export default function WinkosChallenges({ gmName, theme = 'dark' }: { gmName: string, theme?: 'light' | 'dark' }) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'challenge' | 'leaderboard' | 'store'>('challenge');
  const [selectedGameType, setSelectedGameType] = useState<string>('tonights_games');
  
  const [winkoins, setWinkoins] = useState(0);
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [currentDateStr, setCurrentDateStr] = useState('');
  
  // Local picks mapped by game_id to the predicted winner team abbreviation
  const [picks, setPicks] = useState<Record<number, string>>({});
  
  // Tonight's live leaderboard
  const [tonightLeaderboard, setTonightLeaderboard] = useState<any[]>([]);
  
  // Overall all-time challenge leaderboard
  const [overallLeaderboard, setOverallLeaderboard] = useState<OverallLeaderboardEntry[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live ticking second clock for countdown timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchInitialData();
    // Auto-refresh scores & schedule every 60 seconds
    const interval = setInterval(() => {
      fetchInitialData();
    }, 60000);
    return () => clearInterval(interval);
  }, [gmName]);

  // Lockout calculation: 10 minutes before the first scheduled puck drop of the day
  const earliestGameTime = useMemo(() => {
    if (!liveGames || liveGames.length === 0) return 0;
    return Math.min(...liveGames.map(g => new Date(g.startTimeUTC).getTime()));
  }, [liveGames]);

  const lockoutDeadline = useMemo(() => {
    if (earliestGameTime === 0) return 0;
    return earliestGameTime - 10 * 60 * 1000; // 10 minutes before first game
  }, [earliestGameTime]);

  const isLockedOut = useMemo(() => {
    if (lockoutDeadline === 0) return false;
    return now >= lockoutDeadline;
  }, [now, lockoutDeadline]);

  const timeRemainingMs = useMemo(() => {
    if (lockoutDeadline === 0) return 0;
    return Math.max(0, lockoutDeadline - now);
  }, [lockoutDeadline, now]);

  const formattedCountdown = useMemo(() => {
    if (timeRemainingMs <= 0) return '00m 00s';
    const totalSeconds = Math.floor(timeRemainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }, [timeRemainingMs]);

  // Pick completeness tracking
  const totalGamesCount = liveGames.length;
  const selectedPicksCount = useMemo(() => {
    return Object.keys(picks).filter(id => {
      const gId = Number(id);
      return liveGames.some(g => g.id === gId) && !!picks[gId];
    }).length;
  }, [picks, liveGames]);

  const isCompleteBallot = totalGamesCount > 0 && selectedPicksCount === totalGamesCount;

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Winkoins for current GM
      if (gmName) {
        const { data: gmData } = await supabase
          .from('gms')
          .select('winkoins')
          .eq('name', gmName)
          .single();
        if (gmData) setWinkoins(gmData.winkoins || 0);
      }

      // 2. Fetch live official NHL schedule & score feed
      let currDate = new Date().toISOString().split('T')[0];
      let todayGames: Game[] = [];

      try {
        const res = await fetch(`/api/nhl-proxy?url=${encodeURIComponent('https://api-web.nhle.com/v1/score/now')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.currentDate) currDate = data.currentDate;
          if (Array.isArray(data.games) && data.games.length > 0) {
            todayGames = data.games.map((g: any) => {
              const awayAbbrev = g.awayTeam?.abbrev || '';
              const homeAbbrev = g.homeTeam?.abbrev || '';
              return {
                id: g.id,
                startTimeUTC: g.startTimeUTC,
                gameState: g.gameState,
                awayTeam: {
                  abbrev: awayAbbrev,
                  logo: g.awayTeam?.logo || `https://assets.nhle.com/logos/nhl/svg/${awayAbbrev}_light.svg`,
                  score: g.awayTeam?.score
                },
                homeTeam: {
                  abbrev: homeAbbrev,
                  logo: g.homeTeam?.logo || `https://assets.nhle.com/logos/nhl/svg/${homeAbbrev}_light.svg`,
                  score: g.homeTeam?.score
                }
              };
            });
          }
        }
      } catch (err) {
        console.warn("NHL proxy call notice:", err);
      }
      setCurrentDateStr(currDate);
      setLiveGames(todayGames);

      // 3. Fetch User's Daily Picks
      if (gmName) {
        const { data: userPicks } = await supabase
          .from('daily_picks')
          .select('*')
          .eq('gm_name', gmName)
          .eq('pick_date', currDate);
          
        if (userPicks) {
          const mappedPicks: Record<number, string> = {};
          userPicks.forEach((p: PickRecord) => {
            mappedPicks[p.game_id] = p.predicted_winner;
          });
          setPicks(mappedPicks);
        }
      }
      
      // 4. Process Tonight's Leaderboard
      await processTonightLeaderboard(todayGames, currDate);

      // 5. Process Overall Challenge Leaderboard
      await fetchOverallLeaderboard();
      
    } catch (err) {
      console.error("Error fetching challenge data:", err);
    }
    setLoading(false);
  };

  const processTonightLeaderboard = async (games: Game[], date: string) => {
    if (games.length === 0) return;
    
    const { data: allPicks } = await supabase
      .from('daily_picks')
      .select('*')
      .eq('pick_date', date);
      
    if (!allPicks) return;

    const gmScores: Record<string, { correct: number; total: number }> = {};
    const uniqueGMs = Array.from(new Set(allPicks.map(p => p.gm_name)));
    uniqueGMs.forEach(gm => gmScores[gm] = { correct: 0, total: 0 });

    allPicks.forEach(pick => {
      gmScores[pick.gm_name].total += 1;
      const game = games.find(g => g.id === pick.game_id);
      if (game && (game.gameState === 'OFF' || game.gameState === 'FINAL')) {
        const awayScore = game.awayTeam.score || 0;
        const homeScore = game.homeTeam.score || 0;
        const winner = awayScore > homeScore ? game.awayTeam.abbrev : game.homeTeam.abbrev;
        if (pick.predicted_winner === winner) {
          gmScores[pick.gm_name].correct += 1;
        }
      }
    });

    // Only GMs who selected a winner for EVERY game on the slate qualify to participate
    const sortedLeaderboard = Object.entries(gmScores)
      .filter(([_, stats]) => games.length > 0 && stats.total === games.length)
      .map(([name, stats]) => ({ gmName: name, ...stats }))
      .sort((a, b) => b.correct - a.correct);
      
    setTonightLeaderboard(sortedLeaderboard);

    // Automated Payout Execution if all games are complete
    const allComplete = games.every(g => g.gameState === 'OFF' || g.gameState === 'FINAL');
    if (allComplete && sortedLeaderboard.length > 0) {
      const { data: logs } = await supabase
        .from('winkoin_transactions')
        .select('id')
        .eq('transaction_type', 'challenge_payout')
        .ilike('description', `%${date}%`);

      if (!logs || logs.length === 0) {
        const topScore = sortedLeaderboard[0].correct;
        const firstPlaceGMs = sortedLeaderboard.filter(g => g.correct === topScore).map(g => g.gmName);
        let secondPlaceGMs: string[] = [];
        if (firstPlaceGMs.length === 1 && sortedLeaderboard.length > 1) {
          const secondScore = sortedLeaderboard[1].correct;
          secondPlaceGMs = sortedLeaderboard.filter(g => g.correct === secondScore).map(g => g.gmName);
        }
        
        const payouts: { gm: string; amount: number }[] = [];
        if (firstPlaceGMs.length === 1) {
          payouts.push({ gm: firstPlaceGMs[0], amount: 100 });
          if (secondPlaceGMs.length === 1) {
            payouts.push({ gm: secondPlaceGMs[0], amount: 50 });
          } else if (secondPlaceGMs.length === 2) {
            secondPlaceGMs.forEach(gm => payouts.push({ gm, amount: 25 }));
          }
        } else if (firstPlaceGMs.length === 2) {
          firstPlaceGMs.forEach(gm => payouts.push({ gm, amount: 75 }));
        } else if (firstPlaceGMs.length >= 3) {
          firstPlaceGMs.forEach(gm => payouts.push({ gm, amount: 50 }));
        }

        for (const p of payouts) {
          const { data: gmData } = await supabase.from('gms').select('winkoins').eq('name', p.gm).single();
          const current = gmData?.winkoins || 0;
          await supabase.from('gms').update({ winkoins: current + p.amount }).eq('name', p.gm);
          await supabase.from('winkoin_transactions').insert({
            gm_name: p.gm,
            amount: p.amount,
            transaction_type: 'challenge_payout',
            description: `Challenge Payout for ${date}`
          });
        }
        
        if (payouts.find(p => p.gm === gmName)) {
          const { data: updatedGm } = await supabase.from('gms').select('winkoins').eq('name', gmName).single();
          if (updatedGm) setWinkoins(updatedGm.winkoins || 0);
        }
      }
    }
  };

  const fetchOverallLeaderboard = async () => {
    try {
      const [gmsRes, picksRes, txsRes] = await Promise.all([
        supabase.from('gms').select('name, winkoins'),
        supabase.from('daily_picks').select('gm_name, pick_date'),
        supabase.from('winkoin_transactions').select('*').eq('transaction_type', 'challenge_payout')
      ]);

      const gms = gmsRes.data || [];
      const picks = picksRes.data || [];
      const txs = txsRes.data || [];

      const gmMap: Record<string, { gmName: string; currentBalance: number; participated: Set<string>; earnings: number }> = {};
      
      // Initialize with all league GMs
      gms.forEach((g: any) => {
        gmMap[g.name] = {
          gmName: g.name,
          currentBalance: g.winkoins || 0,
          participated: new Set<string>(),
          earnings: 0
        };
      });

      // Count unique challenge days entered as challenges participated
      picks.forEach((p: any) => {
        if (!gmMap[p.gm_name]) {
          gmMap[p.gm_name] = {
            gmName: p.gm_name,
            currentBalance: 0,
            participated: new Set<string>(),
            earnings: 0
          };
        }
        if (p.pick_date) {
          gmMap[p.gm_name].participated.add(p.pick_date);
        }
      });

      // Sum career challenge prize payouts
      txs.forEach((t: any) => {
        if (!gmMap[t.gm_name]) {
          gmMap[t.gm_name] = {
            gmName: t.gm_name,
            currentBalance: 0,
            participated: new Set<string>(),
            earnings: 0
          };
        }
        if (t.amount && t.amount > 0) {
          gmMap[t.gm_name].earnings += Number(t.amount);
        }
      });

      const list: OverallLeaderboardEntry[] = Object.values(gmMap).map(g => ({
        gmName: g.gmName,
        currentBalance: g.currentBalance,
        challengesParticipated: g.participated.size,
        winkoinsEarned: g.earnings
      })).sort((a, b) => {
        if (b.winkoinsEarned !== a.winkoinsEarned) {
          return b.winkoinsEarned - a.winkoinsEarned;
        }
        if (b.challengesParticipated !== a.challengesParticipated) {
          return b.challengesParticipated - a.challengesParticipated;
        }
        return a.gmName.localeCompare(b.gmName);
      });

      setOverallLeaderboard(list);
    } catch (err) {
      console.error("Error fetching overall leaderboard:", err);
    }
  };

  const handleSelectPick = (gameId: number, teamAbbrev: string) => {
    // Prevent modifying picks after the 10-minute pre-puck drop lockout deadline
    if (isLockedOut) {
      setSaveFeedback({
        text: 'Picks are locked! Cutoff passed 10 minutes before the first game.',
        type: 'error'
      });
      return;
    }
    setPicks(prev => ({ ...prev, [gameId]: teamAbbrev }));
    if (saveFeedback?.type === 'error') {
      setSaveFeedback(null);
    }
  };

  const handleSavePicks = async () => {
    if (!gmName) return;
    
    // 1. Lockout Check
    if (isLockedOut) {
      setSaveFeedback({
        text: 'Picks are locked! Submissions closed 10 minutes before the first game.',
        type: 'error'
      });
      return;
    }

    // 2. Complete Ballot Check: MUST pick every game on the slate
    if (!isCompleteBallot) {
      setSaveFeedback({
        text: `Please select a winner for all ${totalGamesCount} games before saving (${selectedPicksCount}/${totalGamesCount} picked).`,
        type: 'error'
      });
      return;
    }

    setSaving(true);
    setSaveFeedback(null);
    
    const recordsToUpsert = Object.entries(picks).map(([gameId, winnerAbbrev]) => {
      const game = liveGames.find(g => g.id.toString() === gameId);
      return {
        gm_name: gmName,
        pick_date: currentDateStr,
        game_id: Number(gameId),
        home_team: game?.homeTeam.abbrev || '',
        away_team: game?.awayTeam.abbrev || '',
        predicted_winner: winnerAbbrev,
        is_correct: false
      };
    });

    try {
      const { error } = await supabase
        .from('daily_picks')
        .upsert(recordsToUpsert, { onConflict: 'gm_name,game_id' });
      if (error) throw error;
      
      setSaveFeedback({
        text: `All ${totalGamesCount} picks saved! You can change them until 10m before puck drop.`,
        type: 'success'
      });

      // Refresh tonights leaderboard & overall stats
      await processTonightLeaderboard(liveGames, currentDateStr);
      await fetchOverallLeaderboard();
    } catch (e: any) {
      setSaveFeedback({
        text: "Error saving selections: " + e.message,
        type: 'error'
      });
    }
    setSaving(false);
  };

  const handleRedeemReward = async (rewardTitle: string, cost: number, description: string) => {
    if (!gmName) return;
    if (winkoins < cost) {
      alert("Not enough Winkoins!");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to spend ${cost.toLocaleString()} Winkoins for ${rewardTitle}?`)) return;

    setRedeeming(true);
    try {
      const newBal = winkoins - cost;
      await supabase.from('gms').update({ winkoins: newBal }).eq('name', gmName);
      await supabase.from('winkoin_transactions').insert({
        gm_name: gmName,
        amount: -cost,
        transaction_type: 'store_redemption',
        description: description
      });
      await supabase.from('redemptions').insert({
        gm_name: gmName,
        reward_title: rewardTitle,
        cost_winkoins: cost,
        status: 'pending'
      });
      setWinkoins(newBal);
      alert("Redemption successful! Commish will be notified.");
    } catch (e: any) {
      alert("Error processing redemption: " + e.message);
    }
    setRedeeming(false);
  };

  // Overall leaderboard statistics
  const topEarner = overallLeaderboard.length > 0 ? overallLeaderboard[0] : null;
  const totalLeagueEarnings = useMemo(() => {
    return overallLeaderboard.reduce((sum, g) => sum + (g.winkoinsEarned || 0), 0);
  }, [overallLeaderboard]);

  const activeParticipantsCount = useMemo(() => {
    return overallLeaderboard.filter(g => g.challengesParticipated > 0).length;
  }, [overallLeaderboard]);

  return (
    <div className={isLight ? '' : 'dark'}>
      <div className={`min-h-screen font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
      }`}>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {/* Main Top Header Block */}
          <div className={`mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b pb-6 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}>
            <div>
              <div className="flex items-center gap-3">
                <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight flex items-center gap-3 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  <span>Winko's Challenges</span>
                </h1>
              </div>
              <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Compete in daily hockey challenges, win Winkoins, and claim pool supremacy.
              </p>
            </div>
          
            {/* Primary Navigation Tabs (Segmented Control Track) */}
            <div className="flex overflow-x-auto no-scrollbar lg:shrink-0">
              <div className={`inline-flex items-center p-1 rounded-xl border transition-colors ${
                isLight
                  ? 'bg-slate-200/80 border-slate-300/70'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <button
                  type="button"
                  id="tab-tonights-challenges"
                  onClick={() => setActiveTab('challenge')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all select-none touch-manipulation cursor-pointer ${
                    activeTab === 'challenge'
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <span>🏒</span> Tonight's Challenges
                </button>
                
                <button
                  type="button"
                  id="tab-overall-leaderboard"
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all select-none touch-manipulation cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <span>🏆</span> Leaderboard
                </button>
                
                <button
                  type="button"
                  id="tab-draft-store"
                  onClick={() => setActiveTab('store')}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all select-none touch-manipulation cursor-pointer ${
                    activeTab === 'store'
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <span>🎟️</span> Shop
                  {winkoins > 0 && (
                    <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-black ${
                      activeTab === 'store'
                        ? isLight
                          ? 'bg-amber-100 text-amber-900 border border-amber-300/80'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isLight
                          ? 'bg-slate-300/70 text-slate-700'
                          : 'bg-slate-800/80 text-slate-400'
                    }`}>
                      {winkoins.toLocaleString()} 🪙
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-emerald-500 mb-4" />
                <p className="font-semibold">Loading challenge arena...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: TONIGHT'S CHALLENGES (Extensible Multi-Challenge Hub) */}
                {activeTab === 'challenge' && (
                  <div className="space-y-6">
                    
                    {/* Challenge Game Selector: Shows Tonight's Games & upcoming challenge types */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-900/90 border-slate-800/90 shadow-lg shadow-black/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Gamepad2 className={`h-4 w-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        <span className={`text-xs font-black uppercase tracking-wider ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                          Available Challenges Tonight
                        </span>
                      </div>

                      {/* Extensible Games List */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {CHALLENGE_GAMES.map(game => {
                          const isSelected = selectedGameType === game.id;
                          return (
                            <button
                              key={game.id}
                              type="button"
                              onClick={() => setSelectedGameType(game.id)}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors select-none touch-manipulation cursor-pointer ${
                                isSelected
                                  ? isLight
                                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/30'
                                    : 'border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950/20 ring-1 ring-emerald-400/30'
                                  : isLight
                                    ? 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-600'
                                    : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/50 text-slate-400'
                              }`}
                            >
                              <div className="text-2xl pt-0.5">{game.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-black text-sm tracking-tight truncate ${
                                    isSelected
                                      ? isLight ? 'text-emerald-950' : 'text-white'
                                      : isLight ? 'text-slate-800' : 'text-slate-200'
                                  }`}>
                                    {game.title}
                                  </span>
                                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${
                                    game.status === 'active'
                                      ? isLight
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : isLight
                                        ? 'bg-slate-200 text-slate-600 border-slate-300'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    {game.badge}
                                  </span>
                                </div>
                                <p className={`text-xs mt-1 line-clamp-2 ${
                                  isLight ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                  {game.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Challenge Mode: Tonight's Games (Dual Column) */}
                    {selectedGameType === 'tonights_games' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* LEFT COLUMN: Matchup Selections & Pick Controls (7 Cols on desktop) */}
                        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                          
                          {/* Pick'em Header Card */}
                          <div className={`p-5 rounded-2xl border ${
                            isLight
                              ? 'bg-white border-slate-200 shadow-xs'
                              : 'bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 border-slate-800/90 shadow-lg shadow-black/30'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  Tonight's Games
                                </h2>
                                <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                  Pick every winner on the slate to participate. Selections close 10m before first puck drop.
                                </p>
                              </div>
                            </div>

                            {/* Lockout Banner & Countdown Timer */}
                            <div className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isLockedOut
                                ? isLight
                                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                                : isLight
                                  ? 'bg-slate-50/90 border-slate-200 text-slate-800'
                                  : 'bg-slate-900/60 border-slate-800/80 text-slate-200'
                            }`}>
                              <div className="flex items-center gap-2.5">
                                {isLockedOut ? (
                                  <Lock className="h-5 w-5 text-rose-500 shrink-0" />
                                ) : (
                                  <Clock className={`h-5 w-5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-400'}`} />
                                )}
                                <div>
                                  <div className="text-xs font-black uppercase tracking-wider">
                                    {isLockedOut ? 'Selections Locked for Tonight' : 'Lockout Countdown'}
                                  </div>
                                  <div className={`text-[11px] ${
                                    isLockedOut 
                                      ? isLight ? 'text-rose-700' : 'text-rose-400' 
                                      : isLight ? 'text-slate-500' : 'text-slate-400'
                                  }`}>
                                    {isLockedOut 
                                      ? 'Locked 10 minutes prior to first game puck drop.' 
                                      : 'You may modify picks freely until 10m before first game.'}
                                  </div>
                                </div>
                              </div>

                              {!isLockedOut && (
                                <div className={`flex items-center gap-2 self-start sm:self-auto font-mono text-base font-black tabular-nums tracking-wider px-3 py-1.5 rounded-lg border ${
                                  isLight
                                    ? 'bg-white border-slate-200 text-slate-900 shadow-xs'
                                    : 'bg-slate-950/90 border-slate-700/80 text-white'
                                }`}>
                                  <span>{formattedCountdown}</span>
                                </div>
                              )}
                            </div>

                            {/* Save Button & Validation Messages */}
                            <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="text-xs">
                                {!isCompleteBallot && !isLockedOut && (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    Select a winner for every game to participate ({selectedPicksCount}/{totalGamesCount} picked)
                                  </span>
                                )}
                                {isCompleteBallot && !isLockedOut && !saveFeedback && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    All matchups selected! Click "Save My Selections" to participate.
                                  </span>
                                )}
                                {saveFeedback && (
                                  <span className={`font-semibold flex items-center gap-1.5 ${
                                    saveFeedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                                  }`}>
                                    {saveFeedback.type === 'success' ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    {saveFeedback.text}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                id="btn-save-picks"
                                onClick={handleSavePicks}
                                disabled={saving || isLockedOut || !isCompleteBallot}
                                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-colors select-none touch-manipulation ${
                                  isLockedOut
                                    ? isLight
                                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : !isCompleteBallot
                                      ? isLight
                                        ? 'bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed opacity-60 shadow-none'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60 shadow-none'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 cursor-pointer active:opacity-85'
                                }`}
                              >
                                {isLockedOut ? (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    <span>Picks Locked</span>
                                  </>
                                ) : !isCompleteBallot ? (
                                  <>
                                    <Lock className="h-4 w-4 opacity-60" />
                                    <span>Select All Games to Save ({selectedPicksCount}/{totalGamesCount})</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{saving ? 'Saving...' : 'Save My Selections'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Matchups Cards List */}
                          {liveGames.length === 0 ? (
                            <div className={`p-12 text-center rounded-2xl border border-dashed ${
                              isLight
                                ? 'border-slate-300 bg-white text-slate-500'
                                : 'border-slate-800 bg-slate-900/50 text-slate-400'
                            }`}>
                              <p className="font-semibold text-lg">No games scheduled for today.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {liveGames.map(game => {
                                const isFinished = game.gameState === 'OFF' || game.gameState === 'FINAL';
                                const isLive = game.gameState === 'LIVE';
                                const selectedWinner = picks[game.id];

                                const awayScore = game.awayTeam.score;
                                const homeScore = game.homeTeam.score;
                                const hasScore = awayScore !== undefined && homeScore !== undefined;
                                const winningTeam = hasScore && isFinished
                                  ? awayScore > homeScore
                                    ? game.awayTeam.abbrev
                                    : homeScore > awayScore
                                      ? game.homeTeam.abbrev
                                      : null
                                  : null;
                                const userPickWon = isFinished && selectedWinner && winningTeam && selectedWinner === winningTeam;
                                const userPickLost = isFinished && selectedWinner && winningTeam && selectedWinner !== winningTeam;

                                return (
                                  <div
                                    key={game.id}
                                    className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col relative ${
                                      isLight
                                        ? 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
                                        : 'border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 shadow-md shadow-black/30 hover:border-slate-700/80'
                                    }`}
                                  >
                                    {/* Game Header Bar */}
                                    <div
                                      className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
                                        isLight
                                          ? 'bg-slate-50/90 border-slate-100 text-slate-600'
                                          : 'bg-slate-950/80 border-slate-800/80 text-slate-400'
                                      }`}
                                    >
                                      <span className="font-bold flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        {new Date(game.startTimeUTC).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>

                                      {isFinished ? (
                                        <span className={`font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                                          isLight
                                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                                            : 'bg-slate-800/90 text-slate-300 border-slate-700/60'
                                        }`}>
                                          FINAL
                                        </span>
                                      ) : isLive ? (
                                        <span className="inline-flex items-center gap-1.5 font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                          <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                                          </span>
                                          LIVE
                                        </span>
                                      ) : isLockedOut ? (
                                        <span className="inline-flex items-center gap-1 font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                          <Lock className="h-2.5 w-2.5" /> LOCKED
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                          OPEN FOR PICKS
                                        </span>
                                      )}
                                    </div>

                                    {/* Teams Selection Area */}
                                    <div className="p-3 sm:p-4 grid grid-cols-2 gap-3 relative">
                                      {/* Away Team Pick Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleSelectPick(game.id, game.awayTeam.abbrev)}
                                        disabled={isLockedOut}
                                        className={`group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-colors duration-150 select-none touch-manipulation ${
                                          selectedWinner === game.awayTeam.abbrev
                                            ? isLight
                                              ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/20'
                                              : 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_24px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/40'
                                            : isLight
                                              ? 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 active:bg-slate-100'
                                              : 'border-slate-800/80 hover:border-slate-700 bg-slate-800/30 hover:bg-slate-800/70 active:bg-slate-800/80'
                                        } ${isLockedOut ? 'cursor-not-allowed opacity-90' : 'cursor-pointer active:opacity-85'}`}
                                      >
                                        {selectedWinner === game.awayTeam.abbrev && (
                                          <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-sm">
                                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" /> PICK
                                          </span>
                                        )}

                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center p-2 transition-transform duration-200 group-hover:scale-105 ${
                                          isLight
                                            ? 'bg-white shadow-xs ring-1 ring-slate-200'
                                            : 'bg-slate-950/80 shadow-inner ring-1 ring-white/10'
                                        }`}>
                                          <img src={game.awayTeam.logo} alt={game.awayTeam.abbrev} className="h-8 w-8 object-contain drop-shadow-md" />
                                        </div>

                                        <span className={`font-black text-base tracking-wide transition-colors ${
                                          selectedWinner === game.awayTeam.abbrev
                                            ? isLight ? 'text-emerald-800' : 'text-emerald-300'
                                            : isLight ? 'text-slate-800' : 'text-slate-100'
                                        }`}>
                                          {game.awayTeam.abbrev}
                                        </span>

                                        {(isFinished || isLive || game.awayTeam.score !== undefined) && (
                                          <span className={`text-xl font-black tabular-nums ${
                                            hasScore && awayScore !== undefined && homeScore !== undefined && awayScore > homeScore
                                              ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                                              : isLight ? 'text-slate-400' : 'text-slate-500'
                                          }`}>
                                            {game.awayTeam.score ?? 0}
                                          </span>
                                        )}
                                      </button>

                                      {/* Home Team Pick Button */}
                                      <button
                                        type="button"
                                        onClick={() => handleSelectPick(game.id, game.homeTeam.abbrev)}
                                        disabled={isLockedOut}
                                        className={`group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-colors duration-150 select-none touch-manipulation ${
                                          selectedWinner === game.homeTeam.abbrev
                                            ? isLight
                                              ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/20'
                                              : 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_24px_rgba(16,185,129,0.18)] ring-1 ring-emerald-400/40'
                                            : isLight
                                              ? 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 active:bg-slate-100'
                                              : 'border-slate-800/80 hover:border-slate-700 bg-slate-800/30 hover:bg-slate-800/70 active:bg-slate-800/80'
                                        } ${isLockedOut ? 'cursor-not-allowed opacity-90' : 'cursor-pointer active:opacity-85'}`}
                                      >
                                        {selectedWinner === game.homeTeam.abbrev && (
                                          <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-sm">
                                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" /> PICK
                                          </span>
                                        )}

                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center p-2 transition-transform duration-200 group-hover:scale-105 ${
                                          isLight
                                            ? 'bg-white shadow-xs ring-1 ring-slate-200'
                                            : 'bg-slate-950/80 shadow-inner ring-1 ring-white/10'
                                        }`}>
                                          <img src={game.homeTeam.logo} alt={game.homeTeam.abbrev} className="h-8 w-8 object-contain drop-shadow-md" />
                                        </div>

                                        <span className={`font-black text-base tracking-wide transition-colors ${
                                          selectedWinner === game.homeTeam.abbrev
                                            ? isLight ? 'text-emerald-800' : 'text-emerald-300'
                                            : isLight ? 'text-slate-800' : 'text-slate-100'
                                        }`}>
                                          {game.homeTeam.abbrev}
                                        </span>

                                        {(isFinished || isLive || game.homeTeam.score !== undefined) && (
                                          <span className={`text-xl font-black tabular-nums ${
                                            hasScore && awayScore !== undefined && homeScore !== undefined && homeScore > awayScore
                                              ? isLight ? 'text-emerald-600' : 'text-emerald-400'
                                              : isLight ? 'text-slate-400' : 'text-slate-500'
                                          }`}>
                                            {game.homeTeam.score ?? 0}
                                          </span>
                                        )}
                                      </button>

                                      {/* Center VS Badge */}
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                                        <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md border ${
                                          isLight
                                            ? 'bg-white text-slate-500 border-slate-200'
                                            : 'bg-slate-900 text-slate-400 border-slate-700/80'
                                        }`}>
                                          VS
                                        </div>
                                      </div>
                                    </div>

                                    {/* Card Footer: Pick Summary */}
                                    <div className={`px-4 py-2 border-t flex items-center justify-between text-xs ${
                                      selectedWinner
                                        ? isLight
                                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                                          : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                                        : isLight
                                          ? 'bg-slate-50/40 border-slate-100 text-slate-400'
                                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                                    }`}>
                                      {selectedWinner ? (
                                        <div className="flex items-center gap-1.5 font-medium">
                                          <span className="text-slate-500 dark:text-slate-400">Your Pick:</span>
                                          <span className={`font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                            {selectedWinner}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-amber-500 font-medium">
                                          {isLockedOut ? 'No pick submitted (locked)' : '⚠️ Pick required'}
                                        </span>
                                      )}

                                      {isFinished && selectedWinner && (
                                        <div>
                                          {userPickWon ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                              <Trophy className="h-3 w-3" /> Won (+1)
                                            </span>
                                          ) : userPickLost ? (
                                            <span className="font-medium text-slate-500 text-[11px]">
                                              Incorrect
                                            </span>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Tonight's Games Leaderboard (5 Cols on desktop) */}
                        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
                          
                          {/* Tonight's Live Leaderboard Container */}
                          <div className={`rounded-2xl border transition-all overflow-hidden sticky top-6 ${
                            isLight
                              ? 'border-slate-200 bg-white shadow-xs'
                              : 'border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 shadow-xl shadow-black/40'
                          }`}>
                            
                            {/* Board Header */}
                            <div className={`p-5 border-b ${
                              isLight ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-950/60'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                      Tonight's Leaderboard
                                    </h3>
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                  </div>
                                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Live standings for tonight's game picks.
                                  </p>
                                </div>

                                {tonightLeaderboard.length > 0 && (
                                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                                      : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                                  }`}>
                                    {tonightLeaderboard.length} GMs In
                                  </span>
                                )}
                              </div>

                              {/* Tonight's Payout Rules Card */}
                              <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs ${
                                isLight
                                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Coins className="h-4 w-4 text-amber-500" />
                                  <span className="font-bold">Tonight's Payout:</span>
                                </div>
                                <div className="flex items-center gap-3 font-black">
                                  <span>🥇 100 🪙</span>
                                  <span>🥈 50 🪙</span>
                                </div>
                              </div>
                            </div>

                            {/* Rankings Table */}
                            {tonightLeaderboard.length === 0 ? (
                              <div className={`p-8 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                <p className="font-semibold">No picks submitted yet today.</p>
                                <p className="text-xs mt-1">Make your picks on the left to get on the board!</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                  <thead className={`border-b text-[10px] font-black uppercase tracking-wider ${
                                    isLight
                                      ? 'bg-slate-50 text-slate-500 border-slate-100'
                                      : 'bg-slate-950/80 text-slate-400 border-slate-800/80'
                                  }`}>
                                    <tr>
                                      <th className="px-4 py-3">Rank</th>
                                      <th className="px-4 py-3">GM</th>
                                      <th className="px-4 py-3 text-center">Status</th>
                                      <th className="px-4 py-3 text-right">Correct</th>
                                    </tr>
                                  </thead>
                                  <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/70'}`}>
                                    {tonightLeaderboard.map((entry, idx) => {
                                      const isCurrentUser = entry.gmName.trim().toLowerCase() === gmName.trim().toLowerCase();
                                      const allGamesDone = liveGames.every(g => g.gameState === 'OFF' || g.gameState === 'FINAL');

                                      return (
                                        <tr
                                          key={entry.gmName}
                                          className={`transition-colors ${
                                            isCurrentUser
                                              ? isLight
                                                ? 'bg-emerald-50/60 font-bold'
                                                : 'bg-emerald-950/20 font-bold'
                                              : isLight
                                                ? 'hover:bg-slate-50'
                                                : 'hover:bg-slate-800/30'
                                          }`}
                                        >
                                          <td className="px-4 py-3 text-xs">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-xs font-bold truncate max-w-[120px] ${
                                                isCurrentUser
                                                  ? isLight ? 'text-emerald-900' : 'text-emerald-300'
                                                  : isLight ? 'text-slate-800' : 'text-slate-200'
                                              }`}>
                                                {entry.gmName}
                                              </span>
                                              {isCurrentUser && (
                                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded ${
                                                  isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                                                }`}>
                                                  YOU
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {allGamesDone ? (
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                                              }`}>
                                                Paid
                                              </span>
                                            ) : (
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
                                              }`}>
                                                Live
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-0.5 rounded-lg text-xs font-black tabular-nums ${
                                              isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-slate-200'
                                            }`}>
                                              {entry.correct} <span className="opacity-50">/ {entry.total}</span>
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Upcoming Challenge Game Placeholder (Extensible architecture) */
                      <div className={`p-10 text-center rounded-2xl border ${
                        isLight
                          ? 'border-slate-200 bg-white shadow-xs'
                          : 'border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20'
                      }`}>
                        <div className="text-4xl mb-3">
                          {CHALLENGE_GAMES.find(g => g.id === selectedGameType)?.icon}
                        </div>
                        <h3 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {CHALLENGE_GAMES.find(g => g.id === selectedGameType)?.title}
                        </h3>
                        <p className={`text-sm mt-2 max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {CHALLENGE_GAMES.find(g => g.id === selectedGameType)?.description}
                        </p>
                        <div className="mt-6">
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
                            isLight
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Launching Soon in Winko's Arcade
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: OVERALL CHALLENGE LEADERBOARD */}
                {activeTab === 'leaderboard' && (
                  <div className="space-y-6">
                    
                    {/* Header Block */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className={`text-2xl sm:text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Challenge Leaderboard
                        </h2>
                        <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          All-time rankings across all league challenges. Track total Winkoins won and participation.
                        </p>
                      </div>
                    </div>

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Stat 1: Top GM / Challenge Leader */}
                      <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
                        isLight ? 'border-slate-200 bg-white hover:border-amber-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-amber-500/40 text-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              Challenge Leader
                            </p>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className={`text-3xl font-black font-mono truncate ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                                {topEarner ? topEarner.gmName : '—'}
                              </span>
                              {topEarner && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                  Rank #1
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                            <Trophy className="h-6 w-6" />
                          </div>
                        </div>
                        <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">
                            {topEarner ? `${topEarner.winkoinsEarned.toLocaleString()} Winkoins Earned` : 'No earnings yet'}
                          </span>
                        </div>
                      </div>

                      {/* Stat 2: Total Winkoins Awarded */}
                      <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
                        isLight ? 'border-slate-200 bg-white hover:border-emerald-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 text-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              Total Winkoins Awarded
                            </p>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className={`text-3xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                {totalLeagueEarnings.toLocaleString()}
                              </span>
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                                🪙 Winkoins
                              </span>
                            </div>
                          </div>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                            <Coins className="h-6 w-6" />
                          </div>
                        </div>
                        <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">Paid out across all completed challenges</span>
                        </div>
                      </div>

                      {/* Stat 3: League Participation */}
                      <div className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm shadow-md transition ${
                        isLight ? 'border-slate-200 bg-white hover:border-cyan-400 text-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 text-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <p className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                              League Participation
                            </p>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className={`text-3xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {activeParticipantsCount}
                              </span>
                              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 shrink-0">
                                of {overallLeaderboard.length} GMs ({overallLeaderboard.length > 0 ? Math.round((activeParticipantsCount / overallLeaderboard.length) * 100) : 0}%)
                              </span>
                            </div>
                          </div>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30">
                            <Users className="h-6 w-6" />
                          </div>
                        </div>
                        <div className={`mt-4 flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <Activity className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span className="truncate">Have competed in challenge events</span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Standings Table: Only GM Name, Challenges Participated, and Winkoins Earned */}
                    <div className={`rounded-2xl border transition-all overflow-hidden ${
                      isLight
                        ? 'border-slate-200 bg-white shadow-xs'
                        : 'border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 shadow-xl shadow-black/40'
                    }`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className={`border-b text-xs font-black uppercase tracking-wider ${
                            isLight
                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                              : 'bg-slate-950/80 text-slate-400 border-slate-800/80'
                          }`}>
                            <tr>
                              <th className="px-6 py-4 w-16">Rank</th>
                              <th className="px-6 py-4">GM Name</th>
                              <th className="px-6 py-4 text-center">Challenges Participated</th>
                              <th className="px-6 py-4 text-right">Winkoins Earned</th>
                              <th className="px-6 py-4 text-right">Current Balance</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/70'}`}>
                            {overallLeaderboard.map((entry, idx) => {
                              const isCurrentUser = entry.gmName.trim().toLowerCase() === gmName.trim().toLowerCase();
                              return (
                                <tr
                                  key={entry.gmName}
                                  className={`transition-colors ${
                                    isCurrentUser
                                      ? isLight
                                        ? 'bg-emerald-50/70 font-semibold'
                                        : 'bg-emerald-950/20 font-semibold'
                                      : isLight
                                        ? 'hover:bg-slate-50/80'
                                        : 'hover:bg-slate-800/40'
                                  }`}
                                >
                                  <td className="px-6 py-4">
                                    {idx === 0 ? (
                                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-black ring-1 ring-amber-500/40 shadow-xs">
                                        🥇
                                      </span>
                                    ) : idx === 1 ? (
                                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-500/15 text-slate-300 font-black ring-1 ring-slate-400/40 shadow-xs">
                                        🥈
                                      </span>
                                    ) : idx === 2 ? (
                                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-700/15 text-amber-600 dark:text-amber-500 font-black ring-1 ring-amber-600/40 shadow-xs">
                                        🥉
                                      </span>
                                    ) : (
                                      <span className={`flex h-8 w-8 items-center justify-center font-bold text-sm ${
                                        isLight ? 'text-slate-400' : 'text-slate-500'
                                      }`}>
                                        {idx + 1}
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-base font-bold ${
                                        isCurrentUser
                                          ? isLight ? 'text-emerald-900 font-black' : 'text-emerald-300 font-black'
                                          : isLight ? 'text-slate-800' : 'text-slate-100'
                                      }`}>
                                        {entry.gmName}
                                      </span>
                                      {isCurrentUser && (
                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                                          isLight
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        }`}>
                                          You
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tabular-nums border ${
                                      entry.challengesParticipated > 0
                                        ? isLight
                                          ? 'bg-slate-100 text-slate-800 border-slate-200'
                                          : 'bg-slate-800/80 text-slate-200 border-slate-700/60'
                                        : isLight
                                          ? 'bg-slate-50 text-slate-400 border-slate-200'
                                          : 'bg-slate-900 text-slate-500 border-slate-800'
                                    }`}>
                                      <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                                      {entry.challengesParticipated} {entry.challengesParticipated === 1 ? 'Challenge' : 'Challenges'}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4 text-right">
                                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-sm border tabular-nums ${
                                      entry.winkoinsEarned > 0
                                        ? isLight
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 shadow-inner'
                                        : isLight
                                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                                          : 'bg-slate-800/50 text-slate-500 border-slate-700/40'
                                    }`}>
                                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                                      {entry.winkoinsEarned.toLocaleString()} 🪙
                                    </span>
                                  </td>

                                  <td className="px-6 py-4 text-right">
                                    <span className={`text-xs font-bold tabular-nums ${
                                      isLight ? 'text-slate-600' : 'text-slate-400'
                                    }`}>
                                      {entry.currentBalance.toLocaleString()} WK
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: DRAFT STORE */}
                {activeTab === 'store' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-black">Draft Store</h2>
                        <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Spend your hard-earned Winkoins on premium roster rewards.
                        </p>
                      </div>

                      <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border self-start sm:self-auto ${
                        isLight
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900 shadow-xs'
                          : 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/30 text-amber-300 shadow-lg shadow-black/30'
                      }`}>
                        <span className="text-base">🪙</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500/80">Your Balance</span>
                          <span className="text-base font-black tabular-nums">{winkoins.toLocaleString()} WK</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Reward Card: Extra Draft Pick */}
                      <div className={`group rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                        isLight
                          ? 'border-amber-200 bg-amber-50/70 shadow-sm hover:border-amber-300'
                          : 'border-amber-500/30 bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 shadow-xl shadow-black/40 hover:border-amber-500/50'
                      }`}>
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ring-1 transition-transform group-hover:scale-105 shadow-sm ${
                              isLight
                                ? 'bg-amber-100 text-amber-700 ring-amber-300'
                                : 'bg-amber-500/15 text-amber-400 ring-amber-500/40 shadow-inner'
                            }`}>
                              <Ticket className="h-6 w-6" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              isLight
                                ? 'bg-amber-200/60 text-amber-900 border-amber-300'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}>
                              Draft Asset
                            </span>
                          </div>

                          <h3 className={`text-xl font-black mb-2 tracking-tight ${
                            isLight ? 'text-amber-950' : 'text-slate-100 group-hover:text-amber-300 transition-colors'
                          }`}>
                            Extra Entry Draft Pick
                          </h3>
                          <p className={`text-sm leading-relaxed mb-6 flex-1 ${
                            isLight ? 'text-amber-900/80' : 'text-slate-300/80'
                          }`}>
                            Grants 1 extra pick at the tail end of the upcoming Winko Entry Draft. Gain a massive advantage in rebuilding your prospect pool!
                          </p>

                          <div className="pt-4 border-t border-amber-500/15 flex items-baseline gap-2">
                            <span className={`text-3xl font-black tracking-tight tabular-nums ${
                              isLight ? 'text-amber-700' : 'text-amber-400'
                            }`}>
                              5,000
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-widest ${
                              isLight ? 'text-amber-800/70' : 'text-amber-400/70'
                            }`}>
                              Winkoins
                            </span>
                          </div>
                        </div>
                        
                        <div className={`p-4 border-t ${
                          isLight
                            ? 'bg-white/90 border-amber-100'
                            : 'bg-slate-950/80 border-slate-800/80 backdrop-blur-sm'
                        }`}>
                          <button
                            type="button"
                            onClick={() => handleRedeemReward('Extra Entry Draft Pick', 5000, 'Redeemed Extra Entry Draft Pick')}
                            disabled={redeeming || winkoins < 5000}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm shadow-md transition-colors select-none touch-manipulation active:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed ${
                              isLight
                                ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20'
                                : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/20 ring-1 ring-amber-300/50'
                            }`}
                          >
                            {redeeming ? 'Processing...' : 'Redeem Extra Pick'}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Reward Card: Extra Waiver Claim */}
                      <div className={`group rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                        isLight
                          ? 'border-blue-200 bg-blue-50/70 shadow-sm hover:border-blue-300'
                          : 'border-blue-500/30 bg-gradient-to-b from-blue-950/30 via-slate-900 to-slate-950 shadow-xl shadow-black/40 hover:border-blue-500/50'
                      }`}>
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ring-1 transition-transform group-hover:scale-105 shadow-sm ${
                              isLight
                                ? 'bg-blue-100 text-blue-700 ring-blue-300'
                                : 'bg-blue-500/15 text-blue-400 ring-blue-500/40 shadow-inner'
                            }`}>
                              <ArrowRightLeft className="h-6 w-6" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              isLight
                                ? 'bg-blue-200/60 text-blue-900 border-blue-300'
                                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            }`}>
                              In-Season Perk
                            </span>
                          </div>

                          <h3 className={`text-xl font-black mb-2 tracking-tight ${
                            isLight ? 'text-blue-950' : 'text-slate-100 group-hover:text-blue-300 transition-colors'
                          }`}>
                            Extra Waiver Claim
                          </h3>
                          <p className={`text-sm leading-relaxed mb-6 flex-1 ${
                            isLight ? 'text-blue-900/80' : 'text-slate-300/80'
                          }`}>
                            Grants 1 extra waiver claim during the regular season. Expires at the end of the season.
                          </p>

                          <div className="pt-4 border-t border-blue-500/15 flex items-baseline gap-2">
                            <span className={`text-3xl font-black tracking-tight tabular-nums ${
                              isLight ? 'text-blue-700' : 'text-blue-400'
                            }`}>
                              2,500
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-widest ${
                              isLight ? 'text-blue-800/70' : 'text-blue-400/70'
                            }`}>
                              Winkoins
                            </span>
                          </div>
                        </div>
                        
                        <div className={`p-4 border-t ${
                          isLight
                            ? 'bg-white/90 border-blue-100'
                            : 'bg-slate-950/80 border-slate-800/80 backdrop-blur-sm'
                        }`}>
                          <button
                            type="button"
                            onClick={() => handleRedeemReward('Extra Waiver Claim', 2500, 'Redeemed Extra Waiver Claim')}
                            disabled={redeeming || winkoins < 2500}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm shadow-md transition-colors select-none touch-manipulation active:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed ${
                              isLight
                                ? 'bg-blue-500 hover:bg-blue-400 text-blue-950 shadow-blue-500/20'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-slate-950 shadow-blue-500/20 ring-1 ring-blue-300/50'
                            }`}
                          >
                            {redeeming ? 'Processing...' : 'Redeem Waiver Claim'}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
