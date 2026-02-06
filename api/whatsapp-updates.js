// api/whatsapp-updates.js
export default async function handler(req, res) {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    if (!RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY environment variable");

    // Define top championships
    const topChampionships = [
      "premierleague",
      "laliga",
      "bundesliga",
      "seriea",
      "ligue1",
      "championsleague"
    ];

    const today = new Date().toISOString().split("T")[0];

    const allMatches = [];

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

        if (Array.isArray(data) && data.length > 0) {
          // Map Football98 fixtures to your format
          data.forEach(match => {
            // Some fields may be missing; default to placeholders
            allMatches.push({
              league: champ.charAt(0).toUpperCase() + champ.slice(1),
              time: match.time || "TBD",
              home: match.home || "Unknown",
              away: match.away || "Unknown",
              homeGoals: match.home_goals ?? null,
              awayGoals: match.away_goals ?? null,
              status: match.status || "NS",
              venue: match.venue || "TBD",
              round: match.round || "N/A"
            });
          });
        }
      } catch (err) {
        console.error(`Error fetching ${champ}:`, err.message);
      }
    }

    // Group matches by league
    const matchesByLeague = {};
    allMatches.forEach(match => {
      if (!matchesByLeague[match.league]) matchesByLeague[match.league] = [];
      matchesByLeague[match.league].push(match);
    });

    const completedMatches = allMatches.filter(m =>
      ["FT", "AET", "PEN"].includes(m.status)
    );
    const upcomingMatches = allMatches.filter(m =>
      ["NS", "TBD"].includes(m.status)
    );
    const liveMatches = allMatches.filter(m =>
      ["LIVE", "HT", "1H", "2H"].includes(m.status)
    );

    const whatsappMessages = generateWhatsAppMessages({
      matchesByLeague,
      completedMatches,
      upcomingMatches,
      liveMatches,
      today
    });

    res.status(200).json({
      success: true,
      messages: whatsappMessages,
      stats: {
        totalMatches: allMatches.length,
        completed: completedMatches.length,
        upcoming: upcomingMatches.length,
        live: liveMatches.length
      }
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// WhatsApp message generator (kept mostly unchanged)
function generateWhatsAppMessages(data) {
  const { matchesByLeague, completedMatches, upcomingMatches, liveMatches, today } = data;
  
  const messages = [];

  // 1. HEADLINE
  let headline = `⚽ *FOOTBALL DAILY UPDATE* ⚽\n`;
  headline += `📅 ${new Date(today).toDateString()}\n\n`;
  messages.push({ type: "headline", content: headline });

  // 2. LIVE MATCHES
  if (liveMatches.length > 0) {
    let liveMsg = `🔥 *LIVE NOW* 🔥\n\n`;
    liveMatches.forEach(match => {
      liveMsg += `⚡ ${match.home} ${match.homeGoals ?? 0}-${match.awayGoals ?? 0} ${match.away}\n`;
      liveMsg += `📍 ${match.league} | ${match.time}\n\n`;
    });
    messages.push({ type: "live", content: liveMsg });
  }

  // 3. COMPLETED MATCH RESULTS
  if (completedMatches.length > 0) {
    let resultsMsg = `✅ *TODAY'S RESULTS*\n\n`;
    const completedByLeague = {};
    completedMatches.forEach(match => {
      if (!completedByLeague[match.league]) completedByLeague[match.league] = [];
      completedByLeague[match.league].push(match);
    });
    Object.entries(completedByLeague).forEach(([league, matches]) => {
      resultsMsg += `🏆 *${league}*\n`;
      matches.forEach(match => {
        const result = `${match.homeGoals}-${match.awayGoals}`;
        const winner = match.homeGoals > match.awayGoals ? match.home : 
                      match.awayGoals > match.homeGoals ? match.away : "Draw";
        resultsMsg += `• ${match.home} ${result} ${match.away}\n  ⭐ ${winner}\n`;
      });
      resultsMsg += `\n`;
    });
    messages.push({ type: "results", content: resultsMsg });
  }

  // 4. UPCOMING FIXTURES
  if (upcomingMatches.length > 0) {
    let fixturesMsg = `📋 *UPCOMING FIXTURES*\n\n`;
    Object.entries(matchesByLeague).forEach(([league, matches]) => {
      const upcomingInLeague = matches.filter(m => ["NS", "TBD"].includes(m.status));
      if (upcomingInLeague.length > 0) {
        fixturesMsg += `🏆 *${league}*\n`;
        const byTime = {};
        upcomingInLeague.forEach(match => {
          if (!byTime[match.time]) byTime[match.time] = [];
          byTime[match.time].push(match);
        });
        Object.entries(byTime).forEach(([time, timeMatches]) => {
          fixturesMsg += `🕒 ${time}\n`;
          timeMatches.forEach(match => {
            fixturesMsg += `• ${match.home} vs ${match.away}\n`;
          });
          fixturesMsg += `\n`;
        });
      }
    });
    messages.push({ type: "fixtures", content: fixturesMsg });
  }

  // 5. HIGHLIGHT MATCH
  if (completedMatches.length > 0) {
    const highScoringMatch = completedMatches.reduce((max, match) => {
      const totalGoals = (match.homeGoals ?? 0) + (match.awayGoals ?? 0);
      const maxGoals = (max.homeGoals ?? 0) + (max.awayGoals ?? 0);
      return totalGoals > maxGoals ? match : max;
    }, completedMatches[0]);
    if (highScoringMatch) {
      const highlightMsg = `🌟 *MATCH OF THE DAY* 🌟\n\n` +
                           `⚽ ${highScoringMatch.home} ${highScoringMatch.homeGoals}-${highScoringMatch.awayGoals} ${highScoringMatch.away}\n` +
                           `🏆 ${highScoringMatch.league}\n` +
                           `🎯 Total Goals: ${(highScoringMatch.homeGoals ?? 0) + (highScoringMatch.awayGoals ?? 0)}\n\n` +
                           `What a thriller! 🔥`;
      messages.push({ type: "highlight", content: highlightMsg });
    }
  }

  return messages;
}
