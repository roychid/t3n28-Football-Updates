// api/fixtures.js - DEBUG VERSION
export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY = "b1d4f776c5msh0a5a6ce81cd9670p1e5ae8jsn169c02186937";
    
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === "YOUR-RAPIDAPI-KEY-HERE") {
      return res.status(500).json({ 
        error: "Please add your real RapidAPI key" 
      });
    }

    const { league, date } = req.query;

    // League mapping
    const leagueMap = {
      "39": "premierleague",
      "140": "laliga", 
      "78": "bundesliga",
      "135": "seriea",
      "61": "ligue1"
    };

    let championship = "premierleague";
    if (league && leagueMap[league]) {
      championship = leagueMap[league];
    }

    // 🔧 FIX: Use CURRENT dates (2026, not 2024!)
    let queryDate = date || new Date().toISOString().split("T")[0];
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const testDates = [
      queryDate,
      today.toISOString().split("T")[0],
      yesterday.toISOString().split("T")[0],
      tomorrow.toISOString().split("T")[0],
      "2026-02-08", // Specific current date
      "2026-02-15"  // Next weekend
    ];

    let fixtures = [];
    let successfulDate = queryDate;
    let debugInfo = {
      attempts: [],
      apiKey: RAPIDAPI_KEY.substring(0, 10) + "...",
      championship: championship
    };

    // Try different dates
    for (const testDate of testDates) {
      try {
        const url = `https://football98.p.rapidapi.com/${championship}/fixtures/?date=${testDate}`;
        
        console.log("🔍 Trying:", url);
        debugInfo.attempts.push({
          date: testDate,
          url: url,
          status: 'attempting'
        });

        const response = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "football98.p.rapidapi.com",
            "Accept": "application/json"
          }
        });

        // 🔧 LOG THE RESPONSE
        console.log(`📡 Response Status: ${response.status}`);
        console.log(`📡 Response OK: ${response.ok}`);
        
        const responseText = await response.text();
        console.log(`📡 Raw Response: ${responseText.substring(0, 500)}...`);
        
        debugInfo.attempts[debugInfo.attempts.length - 1].status = response.status;
        debugInfo.attempts[debugInfo.attempts.length - 1].ok = response.ok;
        debugInfo.attempts[debugInfo.attempts.length - 1].preview = responseText.substring(0, 200);

        if (response.ok) {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseErr) {
            console.error("❌ JSON Parse Error:", parseErr.message);
            debugInfo.attempts[debugInfo.attempts.length - 1].error = "JSON parse failed";
            continue;
          }
          
          // 🔧 LOG THE ACTUAL STRUCTURE
          console.log("📦 Data structure:", JSON.stringify(data, null, 2).substring(0, 500));
          debugInfo.attempts[debugInfo.attempts.length - 1].structure = Object.keys(data);
          
          // Extract fixtures - try all possible structures
          if (Array.isArray(data)) {
            fixtures = data;
            console.log("✅ Found fixtures as direct array");
          } else if (data.response && Array.isArray(data.response)) {
            fixtures = data.response;
            console.log("✅ Found fixtures in data.response");
          } else if (data.data && Array.isArray(data.data)) {
            fixtures = data.data;
            console.log("✅ Found fixtures in data.data");
          } else if (data.fixtures && Array.isArray(data.fixtures)) {
            fixtures = data.fixtures;
            console.log("✅ Found fixtures in data.fixtures");
          } else if (data.matches && Array.isArray(data.matches)) {
            fixtures = data.matches;
            console.log("✅ Found fixtures in data.matches");
          } else {
            console.log("❌ Unknown data structure:", Object.keys(data));
            debugInfo.attempts[debugInfo.attempts.length - 1].error = "Unknown structure: " + Object.keys(data).join(", ");
          }
          
          if (fixtures.length > 0) {
            console.log(`✅ Found ${fixtures.length} fixtures for ${testDate}`);
            successfulDate = testDate;
            debugInfo.attempts[debugInfo.attempts.length - 1].found = fixtures.length;
            break;
          }
        } else {
          console.error(`❌ API Error: ${response.status} - ${responseText}`);
        }
        
      } catch (err) {
        console.error(`❌ Fetch Error for ${testDate}:`, err.message);
        debugInfo.attempts[debugInfo.attempts.length - 1].error = err.message;
        continue;
      }
    }

    // If still no fixtures, create sample data
    if (fixtures.length === 0) {
      console.log("⚠️ No real data found, using sample data");
      debugInfo.usingSampleData = true;
      fixtures = getSampleFixtures(championship, queryDate);
    }

    // Format fixtures
    const formattedFixtures = fixtures.map((f, index) => ({
      fixture: {
        id: f.id || f.fixture_id || `sample_${index}`,
        date: f.date || f.time || f.fixture?.date || new Date(successfulDate).toISOString(),
        status: {
          short: f.status || f.fixture?.status?.short || 
                 (index % 3 === 0 ? "FT" : index % 3 === 1 ? "LIVE" : "NS"),
          long: f.status_long || f.fixture?.status?.long || 
               (f.status === "FT" ? "Match Finished" : 
                f.status === "LIVE" ? "In Play" : "Not Started"),
          elapsed: f.elapsed || f.fixture?.status?.elapsed || 
                  (f.status === "LIVE" ? "65" : null)
        },
        venue: f.venue || f.fixture?.venue?.name || "Stadium"
      },
      league: {
        id: league || "39",
        name: getLeagueName(championship),
        country: getCountry(championship),
        emoji: getEmoji(championship)
      },
      teams: {
        home: {
          id: f.home_team_id || f.teams?.home?.id || null,
          name: f.home || f.home_team || f.teams?.home?.name || getTeamName("home", index),
          logo: f.home_logo || f.teams?.home?.logo || null
        },
        away: {
          id: f.away_team_id || f.teams?.away?.id || null,
          name: f.away || f.away_team || f.teams?.away?.name || getTeamName("away", index),
          logo: f.away_logo || f.teams?.away?.logo || null
        }
      },
      goals: {
        home: f.home_goals ?? f.home_score ?? f.goals?.home ?? f.score?.fulltime?.home ?? 
              (f.status === "FT" ? Math.floor(Math.random() * 4) : null),
        away: f.away_goals ?? f.away_score ?? f.goals?.away ?? f.score?.fulltime?.away ?? 
              (f.status === "FT" ? Math.floor(Math.random() * 4) : null)
      }
    }));

    res.status(200).json({
      success: true,
      date: successfulDate,
      league: championship,
      count: formattedFixtures.length,
      fixtures: formattedFixtures,
      note: fixtures.length > 0 && !debugInfo.usingSampleData ? "Real data" : "Sample data",
      debug: debugInfo  // 🔧 DEBUGGING INFO
    });

  } catch (err) {
    console.error("💥 Fatal Error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });
  }
}

// Helper functions (same as before)
function getLeagueName(championship) {
  const names = {
    'premierleague': 'Premier League',
    'laliga': 'La Liga',
    'bundesliga': 'Bundesliga',
    'seriea': 'Serie A',
    'ligue1': 'Ligue 1'
  };
  return names[championship] || championship;
}

function getCountry(championship) {
  const map = {
    'premierleague': 'England',
    'laliga': 'Spain', 
    'bundesliga': 'Germany',
    'seriea': 'Italy',
    'ligue1': 'France'
  };
  return map[championship] || 'Europe';
}

function getEmoji(championship) {
  const map = {
    'premierleague': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'laliga': '🇪🇸',
    'bundesliga': '🇩🇪',
    'seriea': '🇮🇹', 
    'ligue1': '🇫🇷'
  };
  return map[championship] || '⚽';
}

function getTeamName(type, index) {
  const teams = {
    home: ['Manchester United', 'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Tottenham'],
    away: ['Aston Villa', 'Newcastle', 'West Ham', 'Brighton', 'Brentford', 'Fulham']
  };
  return teams[type][index % teams[type].length];
}

function getSampleFixtures(championship, date) {
  return [
    {
      id: 1,
      home_team: "Manchester United",
      away_team: "Liverpool",
      home_score: 2,
      away_score: 1,
      status: "FT",
      venue: "Old Trafford",
      date: `${date}T15:00:00Z`
    },
    {
      id: 2,
      home_team: "Arsenal",
      away_team: "Manchester City",
      home_score: 3,
      away_score: 3,
      status: "LIVE",
      venue: "Emirates Stadium",
      date: `${date}T17:30:00Z`,
      elapsed: "75"
    },
    {
      id: 3,
      home_team: "Chelsea",
      away_team: "Tottenham",
      home_score: null,
      away_score: null,
      status: "NS",
      venue: "Stamford Bridge",
      date: `${date}T20:00:00Z`
    }
  ];
}
