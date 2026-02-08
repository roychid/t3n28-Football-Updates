// api/fixtures.js
export default async function handler(req, res) {
  try {
    // YOUR RapidAPI Key - PUT IT HERE
    const RAPIDAPI_KEY = "YOUR_RAPIDAPI_KEY_HERE"; // ← PUT YOUR KEY
    
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === "b1d4f776c5msh0a5a6ce81cd9670p1e5ae8jsn169c02186937") {
      return res.status(500).json({ error: "Please add your RapidAPI key in api/fixtures.js" });
    }

    const { league, date } = req.query;

    // Map league IDs to championship names
    const leagueMap = {
      "39": "premierleague",
      "140": "laliga", 
      "78": "bundesliga",
      "135": "seriea",
      "61": "ligue1",
      "94": "primeiraliga",
      "88": "eredivisie",
      "203": "superlig",
      "144": "jupilerproleague",
      "2": "championsleague",
      "3": "europaleague",
      "848": "conferenceleague",
      "45": "facup",
      "48": "eflcup",
      "81": "dfbpokal"
    };

    // Get championship name
    let championship = "premierleague";
    if (league && leagueMap[league]) {
      championship = leagueMap[league];
    }

    // Use provided date or today
    const queryDate = date || new Date().toISOString().split("T")[0];
    
    // Build URL
    const url = `https://football98.p.rapidapi.com/${championship}/fixtures/?date=${queryDate}`;

    console.log("Fetching:", url);

    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "football98.p.rapidapi.com",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Check different response formats
    let fixtures = [];
    
    if (Array.isArray(data)) {
      fixtures = data;
    } else if (data.response && Array.isArray(data.response)) {
      fixtures = data.response;
    } else if (typeof data === 'object' && data !== null) {
      // Try to find any array in the response
      for (const key in data) {
        if (Array.isArray(data[key])) {
          fixtures = data[key];
          break;
        }
      }
    }

    // Format fixtures consistently
    const formattedFixtures = fixtures.map(f => ({
      fixture: {
        id: f.id || Math.random().toString(36).substr(2, 9),
        date: f.date || f.time || new Date().toISOString(),
        status: {
          short: f.status || "NS",
          long: f.status_long || "Not Started",
          elapsed: f.elapsed
        },
        venue: f.venue || "TBD"
      },
      league: {
        id: league || "39",
        name: championship.charAt(0).toUpperCase() + championship.slice(1),
        country: getCountry(championship),
        logo: getEmoji(championship)
      },
      teams: {
        home: {
          id: null,
          name: f.home || f.home_team || "Home Team",
          logo: null
        },
        away: {
          id: null,
          name: f.away || f.away_team || "Away Team", 
          logo: null
        }
      },
      goals: {
        home: f.home_goals || f.home_score || null,
        away: f.away_goals || f.away_score || null
      },
      score: {
        fulltime: {
          home: f.home_goals || null,
          away: f.away_goals || null
        }
      }
    }));

    res.status(200).json({
      success: true,
      date: queryDate,
      league: championship,
      count: formattedFixtures.length,
      fixtures: formattedFixtures
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

function getCountry(championship) {
  const map = {
    'premierleague': 'England',
    'laliga': 'Spain', 
    'bundesliga': 'Germany',
    'seriea': 'Italy',
    'ligue1': 'France',
    'primeiraliga': 'Portugal',
    'eredivisie': 'Netherlands',
    'superlig': 'Turkey',
    'jupilerproleague': 'Belgium',
    'championsleague': 'Europe',
    'europaleague': 'Europe',
    'facup': 'England',
    'dfbpokal': 'Germany'
  };
  return map[championship] || 'Europe';
}

function getEmoji(championship) {
  const map = {
    'premierleague': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'laliga': '🇪🇸',
    'bundesliga': '🇩🇪',
    'seriea': '🇮🇹', 
    'ligue1': '🇫🇷',
    'primeiraliga': '🇵🇹',
    'eredivisie': '🇳🇱',
    'superlig': '🇹🇷',
    'jupilerproleague': '🇧🇪',
    'championsleague': '🏆',
    'europaleague': '🏆',
    'facup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'dfbpokal': '🇩🇪'
  };
  return map[championship] || '⚽';
}
