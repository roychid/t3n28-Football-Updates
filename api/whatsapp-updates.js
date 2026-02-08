// api/whatsapp-updates.js
export default async function handler(req, res) {
  try {
    // YOUR RapidAPI Key - PUT IT HERE
    const RAPIDAPI_KEY = "YOUR_RAPIDAPI_KEY_HERE"; // ← PUT YOUR KEY (SAME AS ABOVE)
    
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === "YOUR_RAPIDAPI_KEY_HERE") {
      return res.status(500).json({ error: "Please add your RapidAPI key in api/whatsapp-updates.js" });
    }

    // Top championships
    const championships = [
      { id: "premierleague", name: "Premier League", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
      { id: "laliga", name: "La Liga", emoji: "🇪🇸" },
      { id: "bundesliga", name: "Bundesliga", emoji: "🇩🇪" },
      { id: "seriea", name: "Serie A", emoji: "🇮🇹" },
      { id: "ligue1", name: "Ligue 1", emoji: "🇫🇷" },
      { id: "championsleague", name: "Champions League", emoji: "🏆" }
    ];

    const today = new Date().toISOString().split("T")[0];
    const allMatches = [];

    // Fetch matches for each championship
    for (const champ of championships) {
      try {
        console.log(`Fetching ${champ.name}...`);
        
        const url = `https://football98.p.rapidapi.com/${champ.id}/fixtures/?date=${today}`;
        
        const response = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "football98.p.rapidapi.com",
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          console.warn(`Failed ${champ.name}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        // Extract fixtures
        let fixtures = [];
        if (Array.isArray(data)) {
          fixtures = data;
        } else if (data.response && Array.isArray(data.response)) {
          fixtures = data.response;
        }
        
        // Format matches
        fixtures.forEach(match => {
          allMatches.push({
            id: match.id || Math.random().toString(36).substr(2, 9),
            league: champ.name,
            leagueEmoji: champ.emoji,
            date: match.date || match.time || today,
            time: match.time ? match.time.split(' ')[1] : "TBD",
            home: match.home || match.home_team || "Home Team",
            away: match.away || match.away_team || "Away Team",
            homeGoals: match.home_goals || match.home_score || null,
            awayGoals: match.away_goals || match.away_score || null,
            status: match.status || "NS",
            venue: match.venue || "TBD",
            round: match.round || "N/A"
          });
        });

      } catch (err) {
        console.error(`Error ${champ.name}:`, err.message);
        continue;
      }
    }

    // Generate WhatsApp messages
    const messages = generateWhatsAppMessages(allMatches, today);
    
    res.status(200).json({
      success: true,
      date: today,
      matches: allMatches,
      messages: messages,
      stats: {
        total: allMatches.length,
        live: allMatches.filter(m => m.status === "LIVE").length,
        completed: allMatches.filter(m => m.status === "FT").length,
        upcoming: allMatches.filter(m => m.status === "NS").length
      }
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
}

function generateWhatsAppMessages(matches, date) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let message = `⚽ *FOOTBALL UPDATE - ${formattedDate.toUpperCase()}* ⚽\n\n`;
  
  // Live matches
  const liveMatches = matches.filter(m => m.status === "LIVE");
  if (liveMatches.length > 0) {
    message += `🔴 *LIVE NOW*\n`;
    liveMatches.forEach(match => {
      message += `${match.leagueEmoji} ${match.home} ${match.homeGoals || 0}-${match.awayGoals || 0} ${match.away}\n`;
    });
    message += `\n`;
  }

  // Results
  const completedMatches = matches.filter(m => m.status === "FT");
  if (completedMatches.length > 0) {
    message += `✅ *RESULTS*\n`;
    
    // Group by league
    const byLeague = {};
    completedMatches.forEach(match => {
      if (!byLeague[match.league]) byLeague[match.league] = [];
      byLeague[match.league].push(match);
    });
    
    Object.entries(byLeague).forEach(([league, leagueMatches]) => {
      message += `${leagueMatches[0].leagueEmoji} *${league}*\n`;
      leagueMatches.forEach(match => {
        message += `• ${match.home} ${match.homeGoals}-${match.awayGoals} ${match.away}\n`;
      });
      message += `\n`;
    });
  }

  // Upcoming
  const upcomingMatches = matches.filter(m => m.status === "NS");
  if (upcomingMatches.length > 0) {
    message += `📅 *UPCOMING*\n`;
    upcomingMatches.slice(0, 5).forEach(match => { // Limit to 5
      message += `🕒 ${match.time} - ${match.home} vs ${match.away}\n`;
    });
    message += `\n`;
  }

  // Stats
  message += `📊 *STATS*\n`;
  message += `• Total Matches: ${matches.length}\n`;
  message += `• Live Now: ${liveMatches.length}\n`;
  message += `• Results: ${completedMatches.length}\n`;
  message += `• Upcoming: ${upcomingMatches.length}\n\n`;

  message += `_Stay tuned for more updates!_ ⚽\n`;
  message += `#Football #Matchday #Sports`;

  return [{
    type: "full",
    content: message
  }];
}
