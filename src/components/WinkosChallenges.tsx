import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Moon, Sun, Ticket, Trophy, Target, ShieldCheck, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

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

export default function WinkosChallenges({ gmName, theme = 'dark' }: { gmName: string, theme?: 'light' | 'dark' }) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'challenge' | 'leaderboard' | 'store'>('challenge');
  const [winkoins, setWinkoins] = useState(0);
  const [liveGames, setLiveGames] = useState<Game[]>([]);
  const [currentDateStr, setCurrentDateStr] = useState('');
  
  // Local picks mapped by game_id to the predicted winner team abbreviation
  const [picks, setPicks] = useState<Record<number, string>>({});
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [gmName]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Winkoins
      if (gmName) {
        const { data: gmData } = await supabase
          .from('gms')
          .select('winkoins')
          .eq('name', gmName)
          .single();
        if (gmData) setWinkoins(gmData.winkoins || 0);
      }

      // 2. Fetch NHL API via proxy to avoid CORS
      const res = await fetch(`/api/nhl-proxy?url=${encodeURIComponent('https://api-web.nhle.com/v1/score/now')}`);
      if (!res.ok) throw new Error('Failed to fetch NHL data via proxy');
      const data = await res.json();
      const currDate = data.currentDate;
      setCurrentDateStr(currDate);
      
      const todayGames: Game[] = data.gameWeek?.find((w: any) => w.date === currDate)?.games || [];
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
      
      // 4. Check leaderboard and trigger payouts if all games are complete
      await processLeaderboardAndPayouts(todayGames, currDate);
      
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  const processLeaderboardAndPayouts = async (games: Game[], date: string) => {
    if (games.length === 0) return;
    
    // Fetch all picks for today
    const { data: allPicks } = await supabase
      .from('daily_picks')
      .select('*')
      .eq('pick_date', date);
      
    if (!allPicks) return;

    // Build GM scores
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

    const sortedLeaderboard = Object.entries(gmScores)
      .map(([name, stats]) => ({ gmName: name, ...stats }))
      .sort((a, b) => b.correct - a.correct);
      
    setLeaderboard(sortedLeaderboard);

    // Automation: Payouts
    const allComplete = games.every(g => g.gameState === 'OFF' || g.gameState === 'FINAL');
    if (allComplete && sortedLeaderboard.length > 0) {
      const { data: logs } = await supabase
        .from('winkoin_transactions')
        .select('id')
        .eq('transaction_type', 'challenge_payout')
        .ilike('description', `%${date}%`);

      if (!logs || logs.length === 0) {
        // Execute payouts
        const topScore = sortedLeaderboard[0].correct;
        const firstPlaceGMs = sortedLeaderboard.filter(g => g.correct === topScore).map(g => g.gmName);
        let secondPlaceGMs: string[] = [];
        if (firstPlaceGMs.length === 1 && sortedLeaderboard.length > 1) {
            const secondScore = sortedLeaderboard[1].correct;
            secondPlaceGMs = sortedLeaderboard.filter(g => g.correct === secondScore).map(g => g.gmName);
        }
        
        const payouts: {gm: string, amount: number}[] = [];
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
           // Refresh active user balance if they won
           const { data: updatedGm } = await supabase.from('gms').select('winkoins').eq('name', gmName).single();
           if (updatedGm) setWinkoins(updatedGm.winkoins || 0);
        }
      }
    }
  };

  const handleSavePicks = async () => {
    if (!gmName) return;
    setSaving(true);
    
    const recordsToUpsert = Object.entries(picks).map(([gameId, winnerAbbrev]) => {
      const game = liveGames.find(g => g.id.toString() === gameId);
      return {
        gm_name: gmName,
        pick_date: currentDateStr,
        game_id: Number(gameId),
        home_team: game?.homeTeam.abbrev || '',
        away_team: game?.awayTeam.abbrev || '',
        predicted_winner: winnerAbbrev,
        is_correct: false // will be computed later
      };
    });

    try {
      const { error } = await supabase.from('daily_picks').upsert(recordsToUpsert, { onConflict: 'gm_name,game_id' });
      if (error) throw error;
      alert("Selections saved successfully!");
    } catch (e: any) {
      alert("Error saving selections: " + e.message);
    }
    setSaving(false);
  };

  const handleRedeem = async () => {
    if (!gmName) return;
    if (winkoins < 5000) {
      alert("Not enough Winkoins!");
      return;
    }
    
    if (!window.confirm("Are you sure you want to spend 5,000 Winkoins for an Extra Entry Draft Pick?")) return;

    setRedeeming(true);
    try {
      const newBal = winkoins - 5000;
      await supabase.from('gms').update({ winkoins: newBal }).eq('name', gmName);
      await supabase.from('winkoin_transactions').insert({
          gm_name: gmName,
          amount: -5000,
          transaction_type: 'store_redemption',
          description: 'Redeemed Extra Entry Draft Pick'
      });
      await supabase.from('redemptions').insert({
          gm_name: gmName,
          reward_title: 'Extra Entry Draft Pick',
          cost_winkoins: 5000,
          status: 'pending'
      });
      setWinkoins(newBal);
      alert("Redemption successful! Commish will be notified.");
    } catch (e: any) {
      alert("Error processing redemption: " + e.message);
    }
    setRedeeming(false);
  };

  const handleSelectPick = (gameId: number, teamAbbrev: string, startTimeUTC: string) => {
    if (new Date(startTimeUTC).getTime() <= Date.now()) return; // locked
    setPicks(prev => ({ ...prev, [gameId]: teamAbbrev }));
  };

  return (
    <div className={isLight ? '' : 'dark'}>
      <div className={`min-h-screen font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0f172a] text-slate-100'
      }`}>
        
        {/* Navigation Tabs */}
        <div className={`border-b backdrop-blur-md sticky top-0 z-10 pt-6 pb-4 ${
          isLight ? 'border-slate-200 bg-slate-50/90' : 'border-slate-800/80 bg-[#0f172a]/90'
        }`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className={`text-4xl sm:text-5xl font-black tracking-tight flex items-center gap-3 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <span>Winko's Challenges</span>
              </h1>
              <p className={`text-xs sm:text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Daily Matchup Picks & Winkoins Leaderboard
              </p>
            </div>
          
            <div className="flex overflow-x-auto no-scrollbar gap-2 sm:gap-4 lg:shrink-0">
              <button
              onClick={() => setActiveTab('challenge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'challenge' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>🏒</span> Tonight's Challenge
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'leaderboard' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>🏆</span> Challenge Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'store' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>🎟️</span> Draft Store
            </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 dark:border-slate-700 border-t-emerald-500 mb-4" />
              <p className="font-semibold">Loading data...</p>
            </div>
          ) : (
            <>
              {/* Tab 1: Tonight's Challenge */}
              {activeTab === 'challenge' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black">Tonight's Games</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Pick the winner for each matchup. Selections lock at game start time.</p>
                    </div>
                    {liveGames.length > 0 && (
                      <button
                        onClick={handleSavePicks}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
                      >
                        <ShieldCheck className="h-5 w-5" />
                        {saving ? 'Saving...' : 'Save My Selections'}
                      </button>
                    )}
                  </div>

                  {liveGames.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                      <p className="text-slate-500 font-semibold text-lg">No games scheduled for today.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveGames.map(game => {
                        const isLocked = new Date(game.startTimeUTC).getTime() <= Date.now();
                        const isFinished = game.gameState === 'OFF' || game.gameState === 'FINAL';
                        const selectedWinner = picks[game.id];
                        
                        return (
                          <div key={game.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col relative">
                            {/* Game Header */}
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(game.startTimeUTC).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isFinished ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">FINAL</span>
                              ) : isLocked ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">LIVE / LOCKED</span>
                              ) : (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">OPEN</span>
                              )}
                            </div>

                            {/* Teams */}
                            <div className="p-4 grid grid-cols-2 gap-4">
                              {/* Away Team */}
                              <button
                                onClick={() => handleSelectPick(game.id, game.awayTeam.abbrev, game.startTimeUTC)}
                                disabled={isLocked}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${
                                  selectedWinner === game.awayTeam.abbrev
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'
                                } ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95'}`}
                              >
                                <img src={game.awayTeam.logo} alt={game.awayTeam.abbrev} className="h-12 w-12 object-contain drop-shadow-sm" />
                                <span className="font-black text-lg">{game.awayTeam.abbrev}</span>
                                {isFinished && <span className="text-2xl font-black text-slate-400">{game.awayTeam.score}</span>}
                              </button>
                              
                              {/* Home Team */}
                              <button
                                onClick={() => handleSelectPick(game.id, game.homeTeam.abbrev, game.startTimeUTC)}
                                disabled={isLocked}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${
                                  selectedWinner === game.homeTeam.abbrev
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-transparent'
                                } ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95'}`}
                              >
                                <img src={game.homeTeam.logo} alt={game.homeTeam.abbrev} className="h-12 w-12 object-contain drop-shadow-sm" />
                                <span className="font-black text-lg">{game.homeTeam.abbrev}</span>
                                {isFinished && <span className="text-2xl font-black text-slate-400">{game.homeTeam.score}</span>}
                              </button>
                            </div>
                            
                            {/* VS Badge */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pt-2 pointer-events-none">
                              <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 text-xs font-black px-2 py-1 rounded-md shadow-sm">
                                VS
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Leaderboard */}
              {activeTab === 'leaderboard' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <h2 className="text-2xl font-black">Challenge Leaderboard</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Live ranking based on tonight's picks.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    {leaderboard.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 font-medium">
                        No picks submitted yet today.
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-xs">Rank</th>
                            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-xs w-full">GM Name</th>
                            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-xs text-center">Status</th>
                            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-xs text-right">Correct</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {leaderboard.map((entry, idx) => (
                            <tr key={entry.gmName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <td className="px-6 py-4">
                                {idx === 0 ? (
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black ring-1 ring-amber-500/30">1</span>
                                ) : idx === 1 ? (
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black ring-1 ring-slate-400/30">2</span>
                                ) : (
                                  <span className="flex h-8 w-8 items-center justify-center font-bold text-slate-400">{idx + 1}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-base">{entry.gmName}</td>
                              <td className="px-6 py-4 text-center">
                                {liveGames.every(g => g.gameState === 'OFF' || g.gameState === 'FINAL') ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">Payout Sent</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">Pending</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black border border-emerald-200 dark:border-emerald-500/20">
                                  {entry.correct} <span className="text-emerald-500/60 dark:text-emerald-500/50">/ {entry.total}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Store */}
              {activeTab === 'store' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <h2 className="text-2xl font-black">Draft Store</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Spend your hard-earned Winkoins on premium rewards.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Featured Reward Card */}
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-6 flex-1">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center ring-1 ring-amber-500/30 mb-4 shadow-sm">
                          <Ticket className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-black text-amber-900 dark:text-amber-400 mb-2">Extra Entry Draft Pick</h3>
                        <p className="text-sm text-amber-800/80 dark:text-amber-200/60 leading-relaxed mb-6">
                          Grants 1 extra pick at the tail end of the upcoming Winko Entry Draft. Gain a massive advantage in rebuilding your prospect pool!
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-amber-600 dark:text-amber-400">5,000</span>
                          <span className="text-sm font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-widest">Winkoins</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white dark:bg-slate-900/50 border-t border-amber-100 dark:border-amber-500/20">
                        <button
                          onClick={handleRedeem}
                          disabled={redeeming || winkoins < 5000}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black shadow-sm active:scale-95 transition disabled:opacity-50 disabled:grayscale cursor-pointer"
                        >
                          {redeeming ? 'Processing...' : 'Redeem Extra Pick'}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
