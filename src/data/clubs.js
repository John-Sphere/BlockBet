// src/data/clubs.js
// 38 clubs across 6 leagues. Shape matches what fixtureGenerator.js,
// matchManager.js, and oddsEngine.js expect:
//   LEAGUES: [{ id, name, flag }]
//   CLUBS:   [{ id, name, leagueId, logo, ratings: {...} }]

export const LEAGUES = [
  { id: "premier-league",    name: "Premier League",    flag: "🏴" },
  { id: "la-liga",           name: "La Liga",           flag: "🇪🇸" },
  { id: "serie-a",           name: "Serie A",           flag: "🇮🇹" },
  { id: "bundesliga",        name: "Bundesliga",        flag: "🇩🇪" },
  { id: "ligue-1",           name: "Ligue 1",           flag: "🇫🇷" },
  { id: "saudi-pro-league",  name: "Saudi Pro League",  flag: "🇸🇦" },
];

function club(id, name, leagueId, ratings) {
  return { id, name, leagueId, logo: null, ratings };
}

export const CLUBS = [
  // ── Premier League (10) ──────────────────────────────
  club("mci", "Manchester City", "premier-league", { attack: 90, midfield: 89, defence: 86, goalkeeping: 85, overall: 90, form: 78, homeAdvantage: 8, awayPerformance: 82 }),
  club("ars", "Arsenal", "premier-league", { attack: 87, midfield: 88, defence: 87, goalkeeping: 84, overall: 88, form: 85, homeAdvantage: 7, awayPerformance: 80 }),
  club("liv", "Liverpool", "premier-league", { attack: 88, midfield: 86, defence: 84, goalkeeping: 86, overall: 87, form: 82, homeAdvantage: 9, awayPerformance: 79 }),
  club("che", "Chelsea", "premier-league", { attack: 83, midfield: 82, defence: 80, goalkeeping: 81, overall: 82, form: 76, homeAdvantage: 6, awayPerformance: 72 }),
  club("tot", "Tottenham Hotspur", "premier-league", { attack: 82, midfield: 80, defence: 76, goalkeeping: 78, overall: 80, form: 74, homeAdvantage: 6, awayPerformance: 70 }),
  club("mun", "Manchester United", "premier-league", { attack: 79, midfield: 78, defence: 76, goalkeeping: 79, overall: 79, form: 68, homeAdvantage: 7, awayPerformance: 68 }),
  club("new", "Newcastle United", "premier-league", { attack: 80, midfield: 78, defence: 79, goalkeeping: 80, overall: 80, form: 77, homeAdvantage: 8, awayPerformance: 71 }),
  club("avl", "Aston Villa", "premier-league", { attack: 78, midfield: 77, defence: 76, goalkeeping: 77, overall: 78, form: 73, homeAdvantage: 6, awayPerformance: 69 }),
  club("bha", "Brighton & Hove Albion", "premier-league", { attack: 76, midfield: 77, defence: 74, goalkeeping: 75, overall: 76, form: 71, homeAdvantage: 5, awayPerformance: 68 }),
  club("whu", "West Ham United", "premier-league", { attack: 74, midfield: 73, defence: 72, goalkeeping: 74, overall: 74, form: 66, homeAdvantage: 5, awayPerformance: 64 }),

  // ── La Liga (6) ───────────────────────────────────────
  club("rma", "Real Madrid", "la-liga", { attack: 91, midfield: 90, defence: 87, goalkeeping: 87, overall: 91, form: 86, homeAdvantage: 9, awayPerformance: 84 }),
  club("bar", "Barcelona", "la-liga", { attack: 89, midfield: 88, defence: 82, goalkeeping: 83, overall: 88, form: 84, homeAdvantage: 8, awayPerformance: 79 }),
  club("atm", "Atletico Madrid", "la-liga", { attack: 82, midfield: 81, defence: 85, goalkeeping: 84, overall: 84, form: 78, homeAdvantage: 8, awayPerformance: 75 }),
  club("rso", "Real Sociedad", "la-liga", { attack: 78, midfield: 79, defence: 76, goalkeeping: 77, overall: 78, form: 72, homeAdvantage: 6, awayPerformance: 68 }),
  club("ath", "Athletic Bilbao", "la-liga", { attack: 77, midfield: 78, defence: 77, goalkeeping: 78, overall: 78, form: 74, homeAdvantage: 7, awayPerformance: 67 }),
  club("bet", "Real Betis", "la-liga", { attack: 76, midfield: 76, defence: 74, goalkeeping: 75, overall: 76, form: 70, homeAdvantage: 6, awayPerformance: 66 }),

  // ── Serie A (6) ───────────────────────────────────────
  club("int", "Inter Milan", "serie-a", { attack: 87, midfield: 86, defence: 87, goalkeeping: 86, overall: 87, form: 83, homeAdvantage: 8, awayPerformance: 80 }),
  club("juv", "Juventus", "serie-a", { attack: 82, midfield: 83, defence: 83, goalkeeping: 83, overall: 83, form: 76, homeAdvantage: 7, awayPerformance: 74 }),
  club("mil", "AC Milan", "serie-a", { attack: 81, midfield: 80, defence: 78, goalkeeping: 80, overall: 81, form: 75, homeAdvantage: 7, awayPerformance: 72 }),
  club("nap", "Napoli", "serie-a", { attack: 83, midfield: 81, defence: 79, goalkeeping: 80, overall: 82, form: 79, homeAdvantage: 8, awayPerformance: 74 }),
  club("rom", "AS Roma", "serie-a", { attack: 78, midfield: 77, defence: 77, goalkeeping: 78, overall: 78, form: 71, homeAdvantage: 6, awayPerformance: 68 }),
  club("ata", "Atalanta", "serie-a", { attack: 80, midfield: 79, defence: 76, goalkeeping: 77, overall: 79, form: 77, homeAdvantage: 6, awayPerformance: 71 }),

  // ── Bundesliga (5) ────────────────────────────────────
  club("bay", "Bayern Munich", "bundesliga", { attack: 90, midfield: 88, defence: 85, goalkeeping: 86, overall: 89, form: 84, homeAdvantage: 9, awayPerformance: 82 }),
  club("b04", "Bayer Leverkusen", "bundesliga", { attack: 84, midfield: 83, defence: 81, goalkeeping: 81, overall: 83, form: 79, homeAdvantage: 7, awayPerformance: 75 }),
  club("bvb", "Borussia Dortmund", "bundesliga", { attack: 82, midfield: 80, defence: 76, goalkeeping: 78, overall: 80, form: 73, homeAdvantage: 8, awayPerformance: 70 }),
  club("rbl", "RB Leipzig", "bundesliga", { attack: 80, midfield: 79, defence: 78, goalkeeping: 79, overall: 80, form: 75, homeAdvantage: 6, awayPerformance: 71 }),
  club("sge", "Eintracht Frankfurt", "bundesliga", { attack: 76, midfield: 75, defence: 73, goalkeeping: 75, overall: 76, form: 70, homeAdvantage: 6, awayPerformance: 66 }),

  // ── Ligue 1 (5) ───────────────────────────────────────
  club("psg", "Paris Saint-Germain", "ligue-1", { attack: 89, midfield: 87, defence: 84, goalkeeping: 84, overall: 88, form: 85, homeAdvantage: 8, awayPerformance: 81 }),
  club("asm", "AS Monaco", "ligue-1", { attack: 79, midfield: 78, defence: 75, goalkeeping: 76, overall: 78, form: 74, homeAdvantage: 6, awayPerformance: 69 }),
  club("om", "Olympique Marseille", "ligue-1", { attack: 78, midfield: 77, defence: 75, goalkeeping: 76, overall: 77, form: 72, homeAdvantage: 7, awayPerformance: 68 }),
  club("lil", "Lille OSC", "ligue-1", { attack: 76, midfield: 75, defence: 76, goalkeeping: 77, overall: 76, form: 71, homeAdvantage: 6, awayPerformance: 67 }),
  club("ol", "Lyon", "ligue-1", { attack: 75, midfield: 74, defence: 72, goalkeeping: 74, overall: 75, form: 68, homeAdvantage: 6, awayPerformance: 65 }),

  // ── Saudi Pro League (6) ──────────────────────────────
  club("hil", "Al Hilal", "saudi-pro-league", { attack: 84, midfield: 82, defence: 79, goalkeeping: 79, overall: 82, form: 80, homeAdvantage: 8, awayPerformance: 73 }),
  club("nas", "Al Nassr", "saudi-pro-league", { attack: 83, midfield: 79, defence: 76, goalkeeping: 77, overall: 80, form: 78, homeAdvantage: 8, awayPerformance: 71 }),
  club("itt", "Al Ittihad", "saudi-pro-league", { attack: 80, midfield: 78, defence: 77, goalkeeping: 78, overall: 79, form: 74, homeAdvantage: 7, awayPerformance: 69 }),
  club("ahl", "Al Ahli", "saudi-pro-league", { attack: 79, midfield: 77, defence: 75, goalkeeping: 76, overall: 78, form: 75, homeAdvantage: 7, awayPerformance: 68 }),
  club("ett", "Al Ettifaq", "saudi-pro-league", { attack: 73, midfield: 72, defence: 71, goalkeeping: 72, overall: 73, form: 66, homeAdvantage: 6, awayPerformance: 62 }),
  club("shb", "Al Shabab", "saudi-pro-league", { attack: 72, midfield: 71, defence: 70, goalkeeping: 71, overall: 72, form: 65, homeAdvantage: 6, awayPerformance: 61 }),
];

export const clubs = CLUBS;
export default CLUBS;
