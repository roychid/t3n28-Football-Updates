// api/fixtures.js - FIXED VERSION
export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY = "b1d4f776c5msh0a5a6ce81cd9670p1e5ae8jsn169c02186937";
    
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === "YOUR-RAPIDAPI-KEY-HERE") {
      return res.status(500).json({ 
        success: false,
        error: "Please add your real RapidAPI key in api/fixtures.js" 
      });
    }

    const { league, date } = req.query;

    // League mapping
    const leagueMap = {
      "39": "premierleague",
      "140": "laliga", 
      "78": "bundesliga",
      "135": "seriea",
      "61": "ligue1",
      "2": "championsleague",
      "3": "europaleague"
    };

    // Get championship name
    let championship = "premierleague";
    if (league && leagueMap[league]) {
      championship = leagueMap[league];
    }

    // Target date for filtering
    const targetDate = date || new Date().toISOString().split("T")[0];
    
    console.log(`📅 Fetching ${championship} fixtures for ${targetDate}...`);

    // ✅ CORRECT API CALL - No date parameter!
    const url = `https://football98.p.rapidapi.com/${championship}/fixtures/`;
    
    console.log(`🔍 API URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "football98.p.rapidapi.com"
      }
    });

    console.log(`📡 Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      
      // Return sample data on error
      return res.status(200).json({
        success: true,
        date: targetDate,
        league: championship,
        count: 3,
        fixtures: getSampleFixtures(championship, targetDate),
        note: `Sample data (API Error: ${response.status})`
      });
    }

    const data = await response.json();
    console.log(`📦 Response type:`, Array.isArray(data) ? 'Array' : 'Object');
    console.log(`📦 Response keys:`, Object.keys(data));

    // Extract fixtures array
    let allFixtures = [];
    if (Array.isArray(data)) {
      allFixtures = data;
    } else if (data.fixtures && Array.isArray(data.fixtures)) {
      allFixtures = data.fixtures;
    } else if (data.data && Array.isArray(data.data)) {
      allFixtures = data.data;
    } else if (data.response && Array.isArray(data.response)) {
      allFixtures = data.response;
    } else {
      console.error('❌ Unknown response structure:', data);
      return res.status(200).json({
        success: true,
        date: targetDate,
        league: championship,
        count: 3,
        fixtures: getSampleFixtures(championship, targetDate),
        note: 'Sample data (Unknown API response structure)'
      });
    }

    console.log(`✅ Total fixtures received: ${allFixtures.length}`);

    // ✅ FILTER BY DATE ON OUR SIDE
    const filteredFixtures = allFixtures.filter(fixture => {
      // Extract date from fixture
      let fixtureDate = null;
      
      if (fixture.date) {
        fixtureDate = fixture.date.split('T')[0];
      } else if (fixture.time) {
        fixtureDate = fixture.time.split(' ')[0];
      } else if (fixture.fixture && fixture.fixture.date) {
        fixtureDate = fixture.fixture.date.split('T')[0];
      }
      
      // Compare dates
      return fixtureDate === targetDate;
    });

    console.log(`✅ Fixtures for ${targetDate}: ${filteredFixtures.length}`);

    // If no fixtures for this date, try to get any recent fixtures
    let finalFixtures = filteredFixtures;
    if (filteredFixtures.length === 0) {
      // Get fixtures from the last 7 days or next 7 days
      const today = new Date(targetDate);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAhead = new Date(today);
      weekAhead.setDate(weekAhead.getDate() + 7);
      
      finalFixtures = allFixtures.filter(fixture => {
        let fixtureDate = null;
        if (fixture.date) fixtureDate = new Date(fixture.date);
        else if (fixture.time) fixtureDate = new Date(fixture.time);
        else if (fixture.fixture && fixture.fixture.date) fixtureDate = new Date(fixture.fixture.date);
        
        return fixtureDate && fixtureDate >= weekAgo && fixtureDate <= weekAhead;
      });
      
      console.log(`ℹ️  No fixtures for ${targetDate}, showing ${finalFixtures.length} fixtures from nearby dates`);
    }

    // If still no fixtures, use sample data
    if (finalFixtures.length === 0) {
      console.log('⚠️ No fixtures found, using sample data');
      finalFixtures = getSampleFixtures(championship, targetDate);
    }

    // Format fixtures
    const formattedFixtures = finalFixtures.map((f, index) => {
      // Parse the fixture data
      const fixtureData = parseFixture(f, championship, targetDate);
      return fixtureData;
    });

    res.status(200).json({
      success: true,
      date: targetDate,
      league: championship,
      count: formattedFixtures.length,
      fixtures: formattedFixtures,
      note: filteredFixtures.length > 0 ? "Real data" : 
            finalFixtures.length > 3 ? "Nearby dates data" : "Sample data"
    });

  } catch (err) {
    console.error("💥 Fatal Error:", err);
    
    // Return sample data on error
    const targetDate = req.query.date || new Date().toISOString().split("T")[0];
    const championship = req.query.league ? 
      (leagueMap[req.query.league] || "premierleague") : "premierleague";
    
    res.status(200).json({
      success: true,
      date: targetDate,
      league: championship,
      count: 3,
      fixtures: getSampleFixtures(championship, targetDate),
      note: `Sample data (Error: ${err.message})`
    });
  }
}

// Parse a single fixture from API response
function parseFixture(f, championship, defaultDate) {
  // Extract date
  let fixtureDate = defaultDate;
  if (f.date) {
    fixtureDate = f.date.split('T')[0];
  } else if (f.time) {
    fixtureDate = f.time.split(' ')[0];
  } else if (f.fixture && f.fixture.date) {
    fixtureDate = f.fixture.date.split('T')[0];
  }

  // Extract status
  let status = "NS";
  let statusLong = "Not Started";
  let elapsed = null;

  if (f.status) {
    status = f.status;
  } else if (f.fixture && f.fixture.status) {
    status = f.fixture.status.short || f.fixture.status;
  }

  if (status === "FT" || status === "Finished") {
    statusLong = "Match Finished";
  } else if (status === "LIVE" || status === "1H" || status === "2H") {
    statusLong = "In Play";
    status = "LIVE";
    elapsed = f.elapsed || f.minute || "45";
  } else if (status === "NS" || status === "Not Started") {
    statusLong = "Not Started";
    status = "NS";
  }

  // Extract teams
  let homeTeam = "Home Team";
  let awayTeam = "Away Team";

  if (f.home && f.away) {
    homeTeam = f.home;
    awayTeam = f.away;
  } else if (f.home_team && f.away_team) {
    homeTeam = f.home_team;
    awayTeam = f.away_team;
  } else if (f.teams && f.teams.home && f.teams.away) {
    homeTeam = f.teams.home.name || f.teams.home;
    awayTeam = f.teams.away.name || f.teams.away;
  }

  // Extract scores
  let homeGoals = null;
  let awayGoals = null;

  if (status === "FT" || status === "LIVE") {
    if (f.home_score !== undefined && f.away_score !== undefined) {
      homeGoals = f.home_score;
      awayGoals = f.away_score;
    } else if (f.home_goals !== undefined && f.away_goals !== undefined) {
      homeGoals = f.home_goals;
      awayGoals = f.away_goals;
    } else if (f.goals && f.goals.home !== undefined) {
      homeGoals = f.goals.home;
      awayGoals = f.goals.away;
    } else if (f.score && f.score.fulltime) {
      homeGoals = f.score.fulltime.home;
      awayGoals = f.score.fulltime.away;
    }
  }

  return {
    fixture: {
      id: f.id || f.fixture_id || Math.random().toString(36).substr(2, 9),
      date: fixtureDate + 'T15:00:00Z',
      status: {
        short: status,
        long: statusLong,
        elapsed: elapsed
      },
      venue: f.venue || f.stadium || "Stadium"
    },
    league: {
      id: getLeagueId(championship),
      name: getLeagueName(championship),
      country: getCountry(championship),
      emoji: getEmoji(championship)
    },
    teams: {
      home: {
        id: null,
        name: homeTeam,
        logo: null
      },
      away: {
        id: null,
        name: awayTeam,
        logo: null
      }
    },
    goals: {
      home: homeGoals,
      away: awayGoals
    }
  };
}

// Helper functions
function getLeagueId(championship) {
  const map = {
    'premierleague': '39',
    'laliga': '140',
    'bundesliga': '78',
    'seriea': '135',
    'ligue1': '61',
    'championsleague': '2',
    'europaleague': '3'
  };
  return map[championship] || '39';
}

function getLeagueName(championship) {
  const names = {
    'premierleague': 'Premier League',
    'laliga': 'La Liga',
    'bundesliga': 'Bundesliga',
    'seriea': 'Serie A',
    'ligue1': 'Ligue 1',
    'championsleague': 'Champions League',
    'europaleague': 'Europa League'
  };
  return names[championship] || championship;
}

function getCountry(championship) {
  const map = {
    'premierleague': 'England',
    'laliga': 'Spain', 
    'bundesliga': 'Germany',
    'seriea': 'Italy',
    'ligue1': 'France',
    'championsleague': 'Europe',
    'europaleague': 'Europe'
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
    'championsleague': '🏆',
    'europaleague': '🏆'
  };
  return map[championship] || '⚽';
}

function getSampleFixtures(championship, date) {
  const teams = getSampleTeams(championship);
  
  return [
    {
      id: 1,
      home: teams[0],
      away: teams[1],
      home_score: 2,
      away_score: 1,
      status: "FT",
      venue: "Stadium 1",
      date: `${date}T15:00:00Z`
    },
    {
      id: 2,
      home: teams[2],
      away: teams[3],
      home_score: 1,
      away_score: 1,
      status: "LIVE",
      venue: "Stadium 2",
      date: `${date}T17:30:00Z`,
      elapsed: "65"
    },
    {
      id: 3,
      home: teams[4],
      away: teams[5],
      status: "NS",
      venue: "Stadium 3",
      date: `${date}T20:00:00Z`
    }
  ].map(f => parseFixture(f, championship, date));
}

function getSampleTeams(championship) {
  const teams = {
    'premierleague': ['Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Manchester City', 'Tottenham'],
    'laliga': ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Valencia', 'Real Betis'],
    'bundesliga': ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Union Berlin', 'Freiburg'],
    'seriea': ['Inter Milan', 'AC Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio'],
    'ligue1': ['PSG', 'Marseille', 'Monaco', 'Lyon', 'Lille', 'Nice']
  };
  return teams[championship] || teams['premierleague'];
}
