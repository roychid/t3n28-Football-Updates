// api/fixtures.js
export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = "football98.p.rapidapi.com";

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ error: "RapidAPI key not configured" });
    }

    const { league, date } = req.query;

    // Default date = today
    const queryDate = date || new Date().toISOString().split("T")[0];

    // Base URL (you can adjust championship based on league id mapping)
    let championship = "premierleague"; // default
    const leagueMap = {
      "39": "premierleague",
      "140": "laliga",
      "78": "bundesliga",
      "135": "seriea",
      "61": "ligue1",
      "2": "championsleague"
      // Add more leagues as needed
    };
    if (league && leagueMap[league]) {
      championship = leagueMap[league];
    }

    const url = `https://${RAPIDAPI_HOST}/${championship}/fixtures/`;

    // RapidAPI expects GET parameters as part of the URL
    const params = new URLSearchParams();
    params.append("date", queryDate);

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`RapidAPI request failed: ${response.status} ${text}`);
    }

    const data = await response.json();

    if (!data || !data.response) {
      return res.status(200).json({ fixtures: [] });
    }

    // Map fixtures to a simple format
    const fixtures = data.response.map(f => ({
      fixture: f.fixture,
      league: f.league,
      teams: f.teams,
      goals: f.goals,
      score: f.score,
      events: f.events,
      lineups: f.lineups,
      statistics: f.statistics
    }));

    res.status(200).json({ fixtures });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({
      error: "API error",
      details: err.message
    });
  }
}
