// src/data/basketballClubs.js
// Real NBA team names, one league (unlike football's 6), since the
// NBA itself is a single unified competition. 30 teams across 2
// conferences, matching real team counts.

export const BASKETBALL_LEAGUES = [
  { id: "nba", name: "NBA" },
];

// Same tiered-rating approach as football's clubs.js, adapted for
// basketball stat categories instead of attack/midfield/defence.
function tierRatings(index, total) {
  const t = index / Math.max(1, total - 1);
  const overall = Math.round(92 - t * 24); // 92 down to ~68
  const wobble = (n) => ((index * 7 + n * 13) % 5) - 2;

  return {
    offense:         Math.max(45, overall + wobble(1)),
    defense:         Math.max(45, overall - 1 + wobble(2)),
    threePoint:      Math.max(45, overall + wobble(3)),
    pace:            Math.max(45, overall - 2 + wobble(4)),
    overall,
    form:            Math.max(45, overall - 4 + wobble(5)),
    homeAdvantage:   4 + (index % 3),
  };
}

function makeLeague(leagueId, names) {
  return names.map((name, i) => ({
    id: `${leagueId}-${i}`,
    name,
    leagueId,
    logo: null,
    ratings: tierRatings(i, names.length),
  }));
}

// Ordered roughly strongest-to-weakest for sensible tiered ratings,
// same convention as football — tweak from Admin later if desired.
const NBA_TEAMS = [
  "Boston Celtics", "Oklahoma City Thunder", "Denver Nuggets", "Minnesota Timberwolves",
  "New York Knicks", "Milwaukee Bucks", "LA Clippers", "Dallas Mavericks",
  "Cleveland Cavaliers", "Phoenix Suns", "New Orleans Pelicans", "Los Angeles Lakers",
  "Indiana Pacers", "Orlando Magic", "Philadelphia 76ers", "Sacramento Kings",
  "Golden State Warriors", "Houston Rockets", "Miami Heat", "Chicago Bulls",
  "Atlanta Hawks", "Utah Jazz", "Memphis Grizzlies", "Brooklyn Nets",
  "Toronto Raptors", "San Antonio Spurs", "Portland Trail Blazers", "Charlotte Hornets",
  "Detroit Pistons", "Washington Wizards",
];

export const BASKETBALL_CLUBS = [
  ...makeLeague("nba", NBA_TEAMS),
];

export const basketballClubs = BASKETBALL_CLUBS;
export default BASKETBALL_CLUBS;
