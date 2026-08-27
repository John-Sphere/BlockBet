// src/data/dartsPlayers.js
// Real PDC player names, single tour — individual sport, same
// convention as tennis's player pool.

export const DARTS_LEAGUES = [
  { id: "pdc-tour", name: "PDC Tour" },
];

function tierRatings(index, total) {
  const t = index / Math.max(1, total - 1);
  const overall = Math.round(94 - t * 26); // 94 down to ~68

  return {
    scoring:     Math.max(45, overall + ((index * 7) % 5) - 2),   // 3-dart scoring average
    checkout:    Math.max(45, overall - 2 + ((index * 11) % 5) - 2), // finishing ability
    consistency: Math.max(45, overall - 1 + ((index * 13) % 5) - 2),
    overall,
    form:        Math.max(45, overall - 4 + ((index * 17) % 5) - 2),
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

const PDC_PLAYERS = [
  "Luke Humphries", "Luke Littler", "Michael van Gerwen", "Michael Smith",
  "Gerwyn Price", "Rob Cross", "Nathan Aspinall", "Stephen Bunting",
  "Josh Rock", "Danny Noppert", "Dave Chisnall", "Ross Smith",
  "James Wade", "Chris Dobey", "Dimitri Van den Bergh", "Ryan Searle",
  "Gary Anderson", "Jonny Clayton", "Peter Wright", "Dirk van Duijvenbode",
];

export const DARTS_PLAYERS = [
  ...makePlayers("pdc-tour", PDC_PLAYERS),
];

export const dartsPlayers = DARTS_PLAYERS;
export default DARTS_PLAYERS;
