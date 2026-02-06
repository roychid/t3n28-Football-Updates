export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY environment variable");

    const { championship, date, team } = req.query;

    // List of default championships if none specified
    const topChampionships = championship
      ? [championship.toLowerCase()]
      : ["premierleague", "laliga", "bundesliga", "seriea", "ligue1", "championsleague"];

    const targetDate = date || new Date().toISOString().split("T")[0];

    const allFixtures = [];

    for (const champ of topChampionships) {
      try {
        const url = `https://football98.p.rapidapi.com/${champ}/fixtures/`;

        const response = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "football98.p.rapidapi.com"
          }
        });

        const data = await response.json();

        if (Array.isArray(data)) {
          data.forEach(match => {
            // Filter by date if available
            if (match.date && match.date.startsWith(targetDate)) {
              // Filter by team if provided
              if (!team || (match.home && match.home.toLowerCase().includes(team.toLowerCase())) || (match.away && match.away.toLowerCase().includes(team.toLowerCase()))) {
                allFixtures.push({
                  fixture: {
                    id: match.id || null,
                    date: match.date || null,
                    venue: match.venue || "TBD"
                  },
                  league: {
                    id: null, // Football98 does not provide numeric IDs
                    name: champ.charAt(0).toUpperCase() + champ.slice(1),
                  },
                  teams: {
                    home: { name: match.home || "Unknown" },
                    away: { name: match.away || "Unknown" }
                  },
                  goals: {
                    home: match.home_goals ?? null,
                    away: match.away_goals ?? null
                  },
                  score: {
                    fulltime: `${match.home_goals ?? 0}-${match.away_goals ?? 0}`
                  },
                  status: match.status || "NS"
                });
              }
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching ${champ}:`, err.message);
      }
    }

    res.status(200).json({ fixtures: allFixtures });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
