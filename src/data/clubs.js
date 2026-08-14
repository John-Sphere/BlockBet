// src/data/clubs.js
// 36 clubs across 6 leagues, each with ratings used by oddsEngine.js
// to generate ELO-style odds. Ratings are out of 99, loosely reflecting
// real-world club strength as of the 2025/26 season — tweak freely from
// the Admin panel.

export const clubs = [
  // ── Premier League (10) ──────────────────────────────
  { name: "Manchester City", league: "Premier League", country: "England", attack: 90, midfield: 89, defence: 86, goalkeeping: 85, overall: 90, form: 78, homeAdvantage: 8, awayPerformance: 82 },
  { name: "Arsenal", league: "Premier League", country: "England", attack: 87, midfield: 88, defence: 87, goalkeeping: 84, overall: 88, form: 85, homeAdvantage: 7, awayPerformance: 80 },
  { name: "Liverpool", league: "Premier League", country: "England", attack: 88, midfield: 86, defence: 84, goalkeeping: 86, overall: 87, form: 82, homeAdvantage: 9, awayPerformance: 79 },
  { name: "Chelsea", league: "Premier League", country: "England", attack: 83, midfield: 82, defence: 80, goalkeeping: 81, overall: 82, form: 76, homeAdvantage: 6, awayPerformance: 72 },
  { name: "Tottenham Hotspur", league: "Premier League", country: "England", attack: 82, midfield: 80, defence: 76, goalkeeping: 78, overall: 80, form: 74, homeAdvantage: 6, awayPerformance: 70 },
  { name: "Manchester United", league: "Premier League", country: "England", attack: 79, midfield: 78, defence: 76, goalkeeping: 79, overall: 79, form: 68, homeAdvantage: 7, awayPerformance: 68 },
  { name: "Newcastle United", league: "Premier League", country: "England", attack: 80, midfield: 78, defence: 79, goalkeeping: 80, overall: 80, form: 77, homeAdvantage: 8, awayPerformance: 71 },
  { name: "Aston Villa", league: "Premier League", country: "England", attack: 78, midfield: 77, defence: 76, goalkeeping: 77, overall: 78, form: 73, homeAdvantage: 6, awayPerformance: 69 },
  { name: "Brighton & Hove Albion", league: "Premier League", country: "England", attack: 76, midfield: 77, defence: 74, goalkeeping: 75, overall: 76, form: 71, homeAdvantage: 5, awayPerformance: 68 },
  { name: "West Ham United", league: "Premier League", country: "England", attack: 74, midfield: 73, defence: 72, goalkeeping: 74, overall: 74, form: 66, homeAdvantage: 5, awayPerformance: 64 },

  // ── La Liga (6) ───────────────────────────────────────
  { name: "Real Madrid", league: "La Liga", country: "Spain", attack: 91, midfield: 90, defence: 87, goalkeeping: 87, overall: 91, form: 86, homeAdvantage: 9, awayPerformance: 84 },
  { name: "Barcelona", league: "La Liga", country: "Spain", attack: 89, midfield: 88, defence: 82, goalkeeping: 83, overall: 88, form: 84, homeAdvantage: 8, awayPerformance: 79 },
  { name: "Atletico Madrid", league: "La Liga", country: "Spain", attack: 82, midfield: 81, defence: 85, goalkeeping: 84, overall: 84, form: 78, homeAdvantage: 8, awayPerformance: 75 },
  { name: "Real Sociedad", league: "La Liga", country: "Spain", attack: 78, midfield: 79, defence: 76, goalkeeping: 77, overall: 78, form: 72, homeAdvantage: 6, awayPerformance: 68 },
  { name: "Athletic Bilbao", league: "La Liga", country: "Spain", attack: 77, midfield: 78, defence: 77, goalkeeping: 78, overall: 78, form: 74, homeAdvantage: 7, awayPerformance: 67 },
  { name: "Real Betis", league: "La Liga", country: "Spain", attack: 76, midfield: 76, defence: 74, goalkeeping: 75, overall: 76, form: 70, homeAdvantage: 6, awayPerformance: 66 },

  // ── Serie A (6) ───────────────────────────────────────
  { name: "Inter Milan", league: "Serie A", country: "Italy", attack: 87, midfield: 86, defence: 87, goalkeeping: 86, overall: 87, form: 83, homeAdvantage: 8, awayPerformance: 80 },
  { name: "Juventus", league: "Serie A", country: "Italy", attack: 82, midfield: 83, defence: 83, goalkeeping: 83, overall: 83, form: 76, homeAdvantage: 7, awayPerformance: 74 },
  { name: "AC Milan", league: "Serie A", country: "Italy", attack: 81, midfield: 80, defence: 78, goalkeeping: 80, overall: 81, form: 75, homeAdvantage: 7, awayPerformance: 72 },
  { name: "Napoli", league: "Serie A", country: "Italy", attack: 83, midfield: 81, defence: 79, goalkeeping: 80, overall: 82, form: 79, homeAdvantage: 8, awayPerformance: 74 },
  { name: "AS Roma", league: "Serie A", country: "Italy", attack: 78, midfield: 77, defence: 77, goalkeeping: 78, overall: 78, form: 71, homeAdvantage: 6, awayPerformance: 68 },
  { name: "Atalanta", league: "Serie A", country: "Italy", attack: 80, midfield: 79, defence: 76, goalkeeping: 77, overall: 79, form: 77, homeAdvantage: 6, awayPerformance: 71 },

  // ── Bundesliga (5) ────────────────────────────────────
  { name: "Bayern Munich", league: "Bundesliga", country: "Germany", attack: 90, midfield: 88, defence: 85, goalkeeping: 86, overall: 89, form: 84, homeAdvantage: 9, awayPerformance: 82 },
  { name: "Bayer Leverkusen", league: "Bundesliga", country: "Germany", attack: 84, midfield: 83, defence: 81, goalkeeping: 81, overall: 83, form: 79, homeAdvantage: 7, awayPerformance: 75 },
  { name: "Borussia Dortmund", league: "Bundesliga", country: "Germany", attack: 82, midfield: 80, defence: 76, goalkeeping: 78, overall: 80, form: 73, homeAdvantage: 8, awayPerformance: 70 },
  { name: "RB Leipzig", league: "Bundesliga", country: "Germany", attack: 80, midfield: 79, defence: 78, goalkeeping: 79, overall: 80, form: 75, homeAdvantage: 6, awayPerformance: 71 },
  { name: "Eintracht Frankfurt", league: "Bundesliga", country: "Germany", attack: 76, midfield: 75, defence: 73, goalkeeping: 75, overall: 76, form: 70, homeAdvantage: 6, awayPerformance: 66 },

  // ── Ligue 1 (5) ───────────────────────────────────────
  { name: "Paris Saint-Germain", league: "Ligue 1", country: "France", attack: 89, midfield: 87, defence: 84, goalkeeping: 84, overall: 88, form: 85, homeAdvantage: 8, awayPerformance: 81 },
  { name: "AS Monaco", league: "Ligue 1", country: "France", attack: 79, midfield: 78, defence: 75, goalkeeping: 76, overall: 78, form: 74, homeAdvantage: 6, awayPerformance: 69 },
  { name: "Olympique Marseille", league: "Ligue 1", country: "France", attack: 78, midfield: 77, defence: 75, goalkeeping: 76, overall: 77, form: 72, homeAdvantage: 7, awayPerformance: 68 },
  { name: "Lille OSC", league: "Ligue 1", country: "France", attack: 76, midfield: 75, defence: 76, goalkeeping: 77, overall: 76, form: 71, homeAdvantage: 6, awayPerformance: 67 },
  { name: "Lyon", league: "Ligue 1", country: "France", attack: 75, midfield: 74, defence: 72, goalkeeping: 74, overall: 75, form: 68, homeAdvantage: 6, awayPerformance: 65 },

  // ── Saudi Pro League (6) ──────────────────────────────
  { name: "Al Hilal", league: "Saudi Pro League", country: "Saudi Arabia", attack: 84, midfield: 82, defence: 79, goalkeeping: 79, overall: 82, form: 80, homeAdvantage: 8, awayPerformance: 73 },
  { name: "Al Nassr", league: "Saudi Pro League", country: "Saudi Arabia", attack: 83, midfield: 79, defence: 76, goalkeeping: 77, overall: 80, form: 78, homeAdvantage: 8, awayPerformance: 71 },
  { name: "Al Ittihad", league: "Saudi Pro League", country: "Saudi Arabia", attack: 80, midfield: 78, defence: 77, goalkeeping: 78, overall: 79, form: 74, homeAdvantage: 7, awayPerformance: 69 },
  { name: "Al Ahli", league: "Saudi Pro League", country: "Saudi Arabia", attack: 79, midfield: 77, defence: 75, goalkeeping: 76, overall: 78, form: 75, homeAdvantage: 7, awayPerformance: 68 },
  { name: "Al Ettifaq", league: "Saudi Pro League", country: "Saudi Arabia", attack: 73, midfield: 72, defence: 71, goalkeeping: 72, overall: 73, form: 66, homeAdvantage: 6, awayPerformance: 62 },
  { name: "Al Shabab", league: "Saudi Pro League", country: "Saudi Arabia", attack: 72, midfield: 71, defence: 70, goalkeeping: 71, overall: 72, form: 65, homeAdvantage: 6, awayPerformance: 61 },
];

export default clubs;

// Existing files (Admin.jsx, MatchHistory.jsx, matchManager.js,
// fixtureGenerator.js) import { CLUBS, LEAGUES } — aliasing here so
// nothing else in the project needs to change.
export const CLUBS = clubs;

export const LEAGUES = [...new Set(clubs.map((c) => c.league))];
