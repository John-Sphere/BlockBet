/**
 * BLOCKBET Fixture Generator
 *
 * Generates non-duplicate virtual fixtures from the club database.
 * Uses a round-robin style rotation to ensure all clubs play
 * regularly and no pair repeats within a rotation cycle.
 */

import { CLUBS, LEAGUES } from "../data/clubs.js";

/**
 * generateLeagueFixtures
 * Round-robin schedule for a single league.
 * Returns array of { home, away } club objects.
 */
export function generateLeagueFixtures(leagueId) {
  const clubs = CLUBS.filter(c => c.leagueId === leagueId);
  const n     = clubs.length;
  if (n < 2) return [];

  const fixtures = [];
  // Standard round-robin algorithm
  const teams = [...clubs];
  if (n % 2 !== 0) teams.push(null); // bye if odd
  const rounds = teams.length - 1;
  const half   = teams.length / 2;

  for (let r = 0; r < rounds; r++) {
    for (let m = 0; m < half; m++) {
      const home = teams[m];
      const away = teams[teams.length - 1 - m];
      if (home && away) {
        fixtures.push({ home, away });
      }
    }
    // Rotate (fix first, rotate rest)
    teams.splice(1, 0, teams.pop());
  }

  return fixtures;
}

/**
 * generateAllFixtures
 * Generates fixtures for all leagues, returns flat list with metadata.
 */
export function generateAllFixtures() {
  const all = [];
  for (const league of LEAGUES) {
    const fixtures = generateLeagueFixtures(league.id);
    fixtures.forEach((f, i) => {
      all.push({
        id:         `${league.id}-${i}`,
        leagueId:   league.id,
        leagueName: league.name,
        leagueFlag: league.flag,
        home:       f.home,
        away:       f.away,
        round:      `${league.id}-r${Math.floor(i / (LEAGUES.length)) + 1}`,
      });
    });
  }
  return all;
}

/**
 * getNextFixture
 * Picks the next fixture for a league based on a cursor index.
 * Call this repeatedly to cycle through all fixtures.
 */
const cursors = {};

export function getNextFixture(leagueId) {
  const fixtures = generateLeagueFixtures(leagueId);
  if (!fixtures.length) return null;
  if (cursors[leagueId] === undefined) cursors[leagueId] = 0;
  const fixture = fixtures[cursors[leagueId] % fixtures.length];
  cursors[leagueId]++;
  return fixture;
}

/**
 * shuffleFixtures
 * Returns a shuffled copy of fixtures for variety.
 * Uses a seeded approach so the same seed = same order.
 */
export function shuffleFixtures(fixtures, seed = 42) {
  const arr = [...fixtures];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}