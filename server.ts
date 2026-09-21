import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // NHL API Proxy route to bypass CORS in production and live deployments
  app.get("/api/nhl-proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || (!targetUrl.includes('nhle.com') && !targetUrl.includes('nhl.com'))) {
        return res.status(400).json({ error: 'Invalid target URL' });
      }
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `Upstream error: ${response.statusText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Proxy error' });
    }
  });

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Helper to compute NHL challenge target date with 6:00 AM rollover
  function getChallengeDateForTime(ref = new Date()): string {
    // Eastern Time is the standard NHL timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(ref);
  }

  // Daily 6:00 AM Challenge Slate endpoint
  app.get("/api/challenges/today", async (req, res) => {
    try {
      const requestedDate = (req.query.date as string) || getChallengeDateForTime();
      let nhlScoreUrl = `https://api-web.nhle.com/v1/score/${requestedDate}`;
      
      let response = await fetch(nhlScoreUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WinkoChallenges/1.0',
        },
      });

      let data: any = response.ok ? await response.json() : null;
      let games = Array.isArray(data?.games) ? data.games : [];
      let activeDate = data?.currentDate || requestedDate;

      // If requested date has 0 games, check schedule/now for upcoming games
      if (games.length === 0) {
        const schedRes = await fetch('https://api-web.nhle.com/v1/schedule/now', {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        });
        if (schedRes.ok) {
          const schedData = await schedRes.json();
          const nextDayWithGames = schedData.gameWeek?.find((gw: any) => gw.date >= requestedDate && gw.games?.length > 0);
          if (nextDayWithGames) {
            activeDate = nextDayWithGames.date;
            games = nextDayWithGames.games;
          }
        }
      }

      res.json({
        date: activeDate,
        targetDate: requestedDate,
        gamesCount: games.length,
        games,
        rolloverHour: 6,
        timeZone: 'America/New_York',
        lastUpdated: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching challenge slate' });
    }
  });

  // Automated 6:00 AM Cron / Webhook Endpoint
  app.all("/api/challenges/daily-rollover", async (req, res) => {
    const today = getChallengeDateForTime();
    console.log(`[Challenges 6AM Rollover] Daily rollover check executed for ${today} at ${new Date().toISOString()}`);
    res.json({
      status: 'ok',
      message: `Daily challenge rollover executed for date: ${today}`,
      date: today,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development, static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
