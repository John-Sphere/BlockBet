// src/data/tennisPlayers.js
// Real ATP player names, single tour (like basketball's single NBA
// league) — individual sport, so "clubs" here means individual
// players. Ordered roughly strongest-to-weakest for sensible tiered
// ratings, same convention as football/basketball.

export const TENNIS_LEAGUES = [
  { id: "atp-tour", name: "ATP Tour" },
];

function tierRatings(index, total) {
  const t = index / Math.max(1, total - 1);
  const overall = Math.round(93 - t * 28); // 93 down to ~65
  const wobble = (n) => ((index * 7 + n * 13) % 5) - 2;

  return {
    serve:    Math.max(45, overall + wobble(1)),
    returnG:  Math.max(45, overall - 1 + wobble(2)), // named returnG, "return" is a reserved-ish word to avoid confusion
    mental:   Math.max(45, overall + wobble(3)),      // clutch performance in tiebreaks/deciding sets
    overall,
    form:     Math.max(45, overall - 4 + wobble(4)),
  };
}

function makePlayers(leagueId, names) {
  return names.map((name, i) => ({
    id: `${leagueId}-${i}`,
    name,
    leagueId,
    logo: null,
    ratings: tierRatings(i, names.length),
  }));
}

const ATP_PLAYERS = [
  "Jannik Sinner", "Carlos Alcaraz", "Novak Djokovic", "Alexander Zverev",
  "Daniil Medvedev", "Andrey Rublev", "Casper Ruud", "Holger Rune",
  "Grigor Dimitrov", "Stefanos Tsitsipas", "Taylor Fritz", "Tommy Paul",
  "Alex de Minaur", "Ben Shelton", "Hubert Hurkacz", "Frances Tiafoe",
  "Ugo Humbert", "Jack Draper", "Karen Khachanov", "Sebastian Korda",
  "Felix Auger-Aliassime", "Adrian Mannarino", "Nicolas Jarry", "Alexander Bublik",
];

export const TENNIS_PLAYERS = [
  ...makePlayers("atp-tour", ATP_PLAYERS),
];

export const tennisPlayers = TENNIS_PLAYERS;
export default TENNIS_PLAYERS;
