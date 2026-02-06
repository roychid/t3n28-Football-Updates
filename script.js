// Configuration
const CONFIG = {
    API_KEY: "6d1dc2bda07f1d1768d9ad2d082f00d4", // Replace with your actual API key
    API_BASE: "https://v3.football.api-sports.io",
    LEAGUES: [
        { id: 39, name: "Premier League", country: "England" },
        { id: 140, name: "La Liga", country: "Spain" },
        { id: 78, name: "Bundesliga", country: "Germany" },
        { id: 135, name: "Serie A", country: "Italy" },
        { id: 61, name: "Ligue 1", country: "France" },
        { id: 2, name: "Champions League", country: "Europe" },
        { id: 3, name: "Europa League", country: "Europe" }
    ]
};

// State
let currentGames = [];
let currentDate = new Date().toISOString().split('T')[0];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date
    const today = new Date();
    document.getElementById('dateInput').valueAsDate = today;
    document.getElementById('todayDate').textContent = formatDate(today);
    
    // Load today's games
    loadGames();
    
    // Test API connection
    testAPIConnection();
});

// Format date helper
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Test API Connection
async function testAPIConnection() {
    try {
        const statusElement = document.getElementById('apiStatus');
        statusElement.innerHTML = 'API: 🔄 Testing...';
        
        // Simple API test
        const response = await fetch(`/api/test?key=${CONFIG.API_KEY}`);
        const data = await response.json();
        
        if (data.success) {
            statusElement.innerHTML = 'API: ✅ Connected';
            statusElement.style.color = '#25D366';
        } else {
            statusElement.innerHTML = 'API: ❌ Error';
            statusElement.style.color = '#ff4444';
        }
    } catch (error) {
        document.getElementById('apiStatus').innerHTML = 'API: ❌ Error';
        document.getElementById('apiStatus').style.color = '#ff4444';
    }
}

// Load Games
async function loadGames() {
    const output = document.getElementById('gamesOutput');
    output.innerHTML = '<div class="loading">Loading fixtures...</div>';
    
    const league = document.getElementById('leagueSelect').value;
    const date = document.getElementById('dateInput').value || currentDate;
    
    try {
        const response = await fetch(`/api/fixtures?league=${league}&date=${date}`);
        const data = await response.json();
        
        if (!data.fixtures || data.fixtures.length === 0) {
            output.innerHTML = `
                <div class="no-games">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No fixtures found for this date.</p>
                    <small>Try a different date or league</small>
                </div>
            `;
            updateStats(0, 0, 0);
            return;
        }
        
        currentGames = data.fixtures;
        displayGames(data.fixtures);
        updateStats(data.fixtures.length, 0, 0); // Update with actual counts later
        
    } catch (error) {
        console.error('Error loading games:', error);
        output.innerHTML = `
            <div class="no-games">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading fixtures.</p>
                <small>Check API connection</small>
            </div>
        `;
    }
}

// Load Live Games
async function loadLiveGames() {
    const output = document.getElementById('gamesOutput');
    output.innerHTML = '<div class="loading">Loading live games...</div>';
    
    try {
        const response = await fetch(`/api/fixtures?live=true`);
        const data = await response.json();
        
        if (!data.fixtures || data.fixtures.length === 0) {
            output.innerHTML = `
                <div class="no-games">
                    <i class="fas fa-broadcast-tower"></i>
                    <p>No live games at the moment.</p>
                    <small>Check back later</small>
                </div>
            `;
            return;
        }
        
        currentGames = data.fixtures;
        displayGames(data.fixtures);
        
    } catch (error) {
        console.error('Error loading live games:', error);
        output.innerHTML = `
            <div class="no-games">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading live games.</p>
            </div>
        `;
    }
}

// Display Games
function displayGames(games) {
    const output = document.getElementById('gamesOutput');
    const countElement = document.getElementById('gamesCount');
    
    countElement.textContent = `${games.length} games`;
    
    if (games.length === 0) {
        output.innerHTML = '<div class="no-games">No games found</div>';
        return;
    }
    
    let html = '';
    let liveCount = 0;
    let completedCount = 0;
    
    games.forEach(game => {
        const matchTime = new Date(game.fixture.date);
        const now = new Date();
        const isLive = matchTime <= now && game.fixture.status.short !== 'FT';
        const isCompleted = game.fixture.status.short === 'FT';
        
        if (isLive) liveCount++;
        if (isCompleted) completedCount++;
        
        const homeForm = generateTeamForm([], game.teams.home.id);
        const awayForm = generateTeamForm([], game.teams.away.id);
        const homeStats = generateTeamStats([], game.teams.home.id);
        const awayStats = generateTeamStats([], game.teams.away.id);
        const analysis = analyzeMatch(homeStats, awayStats, homeForm, awayForm);
        
        html += `
            <div class="game-card ${isLive ? 'live' : ''}">
                <div class="game-header">
                    <div class="league">
                        ${game.league.name}
                        ${isLive ? ' 🔴 LIVE' : ''}
                    </div>
                    <div class="time">
                        ${matchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                <div class="teams">
                    <div class="team">
                        <div class="team-name">${game.teams.home.name}</div>
                        <div class="form">${homeForm.map(r => `<span class="form-box ${r}">${r}</span>`).join('')}</div>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team">
                        <div class="team-name">${game.teams.away.name}</div>
                        <div class="form">${awayForm.map(r => `<span class="form-box ${r}">${r}</span>`).join('')}</div>
                    </div>
                </div>
                ${game.goals ? `
                    <div class="score">
                        <div class="score-home">${game.goals.home || 0}</div>
                        <div class="score-divider">-</div>
                        <div class="score-away">${game.goals.away || 0}</div>
                    </div>
                ` : ''}
                <div class="stats">
                    <div class="stat">
                        <div class="stat-label">Goals/Game</div>
                        <div class="stat-value">
                            <span class="stat-home">${homeStats.goalsScored}</span>
                            <span class="stat-away">${awayStats.goalsScored}</span>
                        </div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Conceded/Game</div>
                        <div class="stat-value">
                            <span class="stat-home">${homeStats.goalsConceded}</span>
                            <span class="stat-away">${awayStats.goalsConceded}</span>
                        </div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">
                            <span class="stat-home">${homeStats.winRate}%</span>
                            <span class="stat-away">${awayStats.winRate}%</span>
                        </div>
                    </div>
                </div>
                <div class="advice">
                    <div class="advice-title">
                        <i class="fas fa-robot"></i> AI PREDICTION
                    </div>
                    <div class="advice-text">${analysis.advice}</div>
                    <div>
                        <span class="recommendation">${analysis.recommendation}</span>
                        <span class="confidence">Confidence: ${analysis.confidence}%</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    output.innerHTML = html;
    updateStats(games.length, liveCount, completedCount);
}

// Update Statistics
function updateStats(total, live, completed) {
    document.getElementById('totalMatches').textContent = total;
    document.getElementById('liveMatches').textContent = live;
    document.getElementById('completedMatches').textContent = completed;
}

// Generate Team Form (Mock - Replace with real data)
function generateTeamForm(matches, teamId) {
    if (!matches || matches.length === 0) {
        return Array.from({ length: 5 }, () => ['W', 'D', 'L'][Math.floor(Math.random() * 3)]);
    }
    return matches.slice(0, 5).map(m => {
        const homeWin = m.goals.home > m.goals.away;
        const awayWin = m.goals.away > m.goals.home;
        if (m.teams.home.id === teamId) return homeWin ? 'W' : awayWin ? 'L' : 'D';
        return awayWin ? 'W' : homeWin ? 'L' : 'D';
    });
}

// Generate Team Stats (Mock - Replace with real data)
function generateTeamStats(matches, teamId) {
    if (!matches || matches.length === 0) {
        return {
            goalsScored: (Math.random() * 2 + 1).toFixed(1),
            goalsConceded: (Math.random() * 1.5).toFixed(1),
            winRate: Math.floor(Math.random() * 30 + 40),
            btts: Math.floor(Math.random() * 30 + 40)
        };
    }
    
    let gf = 0, ga = 0, wins = 0;
    matches.forEach(m => {
        let g = 0, a = 0;
        if (m.teams.home.id === teamId) {
            g = m.goals.home || 0;
            a = m.goals.away || 0;
        } else {
            g = m.goals.away || 0;
            a = m.goals.home || 0;
        }
        gf += g;
        ga += a;
        if (g > a) wins++;
    });
    
    const games = matches.length;
    return {
        goalsScored: (gf / games).toFixed(1),
        goalsConceded: (ga / games).toFixed(1),
        winRate: Math.round((wins / games) * 100),
        btts: 50
    };
}

// Analyze Match
function analyzeMatch(homeStats, awayStats, homeForm, awayForm) {
    const homeScore = homeForm.filter(r => r === 'W').length * 3 + homeForm.filter(r => r === 'D').length;
    const awayScore = awayForm.filter(r => r === 'W').length * 3 + awayForm.filter(r => r === 'D').length;
    const homeStrength = homeScore + homeStats.winRate * 0.5;
    const awayStrength = awayScore + awayStats.winRate * 0.5;
    
    let advice = [];
    let recommendation = "";
    let confidence = 0;
    
    if (homeStrength > awayStrength + 5) {
        recommendation = "HOME WIN";
        confidence = Math.min(85, 60 + (homeStrength - awayStrength));
        advice.push("Strong home advantage and better recent form.");
    } else if (awayStrength > homeStrength + 5) {
        recommendation = "AWAY WIN";
        confidence = Math.min(85, 60 + (awayStrength - homeStrength));
        advice.push("Away team showing strong form and consistency.");
    } else {
        recommendation = "DRAW";
        confidence = 65;
        advice.push("Evenly matched teams with similar form.");
    }
    
    // Add BTTS prediction
    const bttsProbability = (parseInt(homeStats.btts) + parseInt(awayStats.btts)) / 2;
    if (bttsProbability > 60) {
        advice.push("Both teams likely to score.");
    }
    
    return {
        recommendation,
        confidence: Math.round(confidence),
        advice: advice.join(' ')
    };
}

// Generate WhatsApp Update
async function generateWhatsAppUpdate() {
    const output = document.getElementById('whatsappOutput');
    output.innerHTML = '<div class="loading">Generating WhatsApp update...</div>';
    
    try {
        const date = document.getElementById('dateInput').value || currentDate;
        const response = await fetch(`/api/whatsapp-updates?date=${date}`);
        const data = await response.json();
        
        if (!data.success) {
            output.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error generating update: ${data.error}</p>
                </div>
            `;
            return;
        }
        
        let message = data.message || "No message generated";
        output.innerHTML = `<div class="whatsapp-message">${formatWhatsAppMessage(message)}</div>`;
        updateMessageStats(message);
        
        // Show success toast
        showToast('WhatsApp update generated successfully!');
        
    } catch (error) {
        console.error('Error generating update:', error);
        output.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error generating update. Please try again.</p>
            </div>
        `;
    }
}

// Generate Preview
function generatePreview() {
    const output = document.getElementById('whatsappOutput');
    const games = currentGames.slice(0, 3); // Preview with 3 games
    
    if (games.length === 0) {
        showToast('No games loaded. Load games first.');
        return;
    }
    
    const message = createPreviewMessage(games);
    output.innerHTML = `<div class="whatsapp-message">${formatWhatsAppMessage(message)}</div>`;
    updateMessageStats(message);
    showToast('Preview generated successfully!');
}

// Format WhatsApp Message with emojis
function formatWhatsAppMessage(text) {
    return text
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/⚽/g, '⚽')
        .replace(/🔥/g, '🔥')
        .replace(/📅/g, '📅')
        .replace(/🏆/g, '🏆')
        .replace(/⭐/g, '⭐')
        .replace(/🎯/g, '🎯')
        .replace(/🔴/g, '🔴')
        .replace(/🔵/g, '🔵');
}

// Update Message Statistics
function updateMessageStats(message) {
    const charCount = message.length;
    const lineCount = message.split('\n').length;
    const wordCount = message.split(/\s+/).length;
    
    document.getElementById('messageStats').textContent = 
        `${charCount} chars • ${lineCount} lines • ${wordCount} words`;
}

// Copy to Clipboard
async function copyToClipboard() {
    const output = document.getElementById('whatsappOutput');
    const message = output.innerText;
    
    if (!message || message.includes('Your WhatsApp message')) {
        showToast('No message to copy!', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(message);
        showToast('Message copied to clipboard!');
        
        // Highlight copy button
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> COPIED!';
        copyBtn.style.background = '#1da851';
        
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="far fa-copy"></i> COPY TO CLIPBOARD';
            copyBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy. Please try again.', 'error');
    }
}

// Clear Output
function clearOutput() {
    const output = document.getElementById('whatsappOutput');
    output.innerHTML = `
        <div class="placeholder">
            <i class="fab fa-whatsapp"></i>
            <p>Your WhatsApp message will appear here</p>
            <small>Click "GENERATE DAILY UPDATE" to start</small>
        </div>
    `;
    document.getElementById('messageStats').textContent = '0 chars';
}

// Test on WhatsApp
function testOnWhatsApp() {
    const output = document.getElementById('whatsappOutput');
    const message = output.innerText;
    
    if (!message || message.includes('Your WhatsApp message')) {
        showToast('No message to test!', 'error');
        return;
    }
    
    // Create WhatsApp share URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open in new tab
    window.open(whatsappUrl, '_blank');
    showToast('Opened in WhatsApp. Send to your channel!');
}

// Use Template
function useTemplate(type) {
    let template = '';
    
    switch(type) {
        case 'morning':
            template = `⚽ *FOOTBALL DAILY BRIEFING* ⚽\n\n`;
            template += `📅 ${formatDate(new Date())}\n\n`;
            template += `Good morning football fans! Here's what's happening today:\n\n`;
            template += `🔥 *TOP FIXTURES TODAY*\n`;
            template += `• Team A vs Team B (20:00)\n`;
            template += `• Team C vs Team D (22:00)\n\n`;
            template += `🏆 *LEAGUES IN ACTION*\n`;
            template += `• Premier League\n`;
            template += `• La Liga\n`;
            template += `• Serie A\n\n`;
            template += `📊 *ONE TO WATCH*\n`;
            template += `Player Name is on fire with 5 goals in 3 games!\n\n`;
            template += `#Football #DailyUpdate #Matchday`;
            break;
            
        case 'results':
            template = `📊 *MATCH RESULTS UPDATE* 📊\n\n`;
            template += `Here are the latest results:\n\n`;
            template += `🏴󠁧󠁢󠁥󠁮󠁧󠁿 *PREMIER LEAGUE*\n`;
            template += `Team A 2-1 Team B\n`;
            template += `⭐ MOTM: Player Name\n\n`;
            template += `🇪🇸 *LA LIGA*\n`;
            template += `Team C 3-2 Team D\n`;
            template += `🔥 Comeback win!\n\n`;
            template += `🇩🇪 *BUNDESLIGA*\n`;
            template += `Team E 0-0 Team F\n`;
            template += `⚔️ Stalemate\n\n`;
            template += `#Results #Football #Scores`;
            break;
            
        case 'preview':
            template = `🔮 *WEEKEND PREVIEW* 🔮\n\n`;
            template += `Big weekend ahead! Key matches:\n\n`;
            template += `⚔️ *THE DERBY*\n`;
            template += `Team A vs Team B\n`;
            template += `Sunday, 16:30\n`;
            template += `Form: WWLWD vs LDWWW\n\n`;
            template += `🏆 *TITLE SHOWDOWN*\n`;
            template += `Team C vs Team D\n`;
            template += `Saturday, 19:45\n`;
            template += `1st vs 2nd - 2 points gap!\n\n`;
            template += `🔴 *RELEGATION BATTLE*\n`;
            template += `Team E vs Team F\n`;
            template += `Both fighting to stay up\n\n`;
            template += `#WeekendPreview #Football #Fixtures`;
            break;
            
        case 'live':
            template = `🔴 *LIVE MATCH UPDATE* 🔴\n\n`;
            template += `Team A 1-0 Team B\n`;
            template += `⚽ 23' - Player Name\n\n`;
            template += `Team C 2-1 Team D\n`;
            template += `⚽ 12' - Player 1\n`;
            template += `⚽ 34' - Player 2\n`;
            template += `⚽ 45+1' - Player 3\n\n`;
            template += `More updates coming soon!\n\n`;
            template += `#LiveFootball #Soccer #LiveScore`;
            break;
    }
    
    const output = document.getElementById('whatsappOutput');
    output.innerHTML = `<div class="whatsapp-message">${formatWhatsAppMessage(template)}</div>`;
    updateMessageStats(template);
    showToast('Template loaded! Customize as needed.');
}

// Create Preview Message
function createPreviewMessage(games) {
    let message = `⚽ *MATCH PREVIEW* ⚽\n\n`;
    message += `📅 ${formatDate(new Date())}\n\n`;
    
    games.forEach((game, index) => {
        if (index < 3) { // Limit to 3 games for preview
            const time = new Date(game.fixture.date).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            message += `🏆 ${game.league.name}\n`;
            message += `• ${game.teams.home.name} vs ${game.teams.away.name}\n`;
            message += `  🕒 ${time}\n`;
            message += `  📍 ${game.fixture.venue?.name || 'TBD'}\n\n`;
        }
    });
    
    message += `#MatchPreview #Football #Fixtures`;
    return message;
}

// Show Toast Notification
function showToast(text, type = 'success') {
    const toast = document.getElementById('toast');
    const message = document.getElementById('toastMessage');
    
    message.textContent = text;
    toast.className = 'toast';
    toast.classList.add('show');
    
    if (type === 'error') {
        toast.style.background = '#ff4444';
    } else {
        toast.style.background = '#25D366';
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal Functions
function openModal() {
    document.getElementById('templatesModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('templatesModal').style.display = 'none';
}

// Load Templates
function loadTemplates() {
    const templates = [
        {
            icon: 'fas fa-sun',
            title: 'Morning Update',
            description: 'Start-of-day briefing',
            type: 'morning'
        },
        {
            icon: 'fas fa-poll',
            title: 'Results Summary',
            description: 'Match results roundup',
            type: 'results'
        },
        {
            icon: 'fas fa-binoculars',
            title: 'Match Preview',
            description: 'Upcoming fixtures preview',
            type: 'preview'
        },
        {
            icon: 'fas fa-broadcast-tower',
            title: 'Live Update',
            description: 'Live match updates',
            type: 'live'
        },
        {
            icon: 'fas fa-star',
            title: 'Player Spotlight',
            description: 'Featured player performance',
            type: 'player'
        },
        {
            icon: 'fas fa-trophy',
            title: 'League Table',
            description: 'Current standings update',
            type: 'table'
        }
    ];
    
    const templateList = document.getElementById('templateList');
    templateList.innerHTML = '';
    
    templates.forEach(template => {
        const div = document.createElement('div');
        div.className = 'template-item';
        div.innerHTML = `
            <i class="${template.icon}"></i>
            <h4>${template.title}</h4>
            <p>${template.description}</p>
        `;
        div.onclick = () => {
            useTemplate(template.type);
            closeModal();
        };
        templateList.appendChild(div);
    });
}

// Initialize templates
loadTemplates();
