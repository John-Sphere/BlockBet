/**
 * standings.js
 * Shared, live-updating table of every club's season stats (P/W/D/L/GF/GA/Pts).
 * matchManager.js records results here as matches finish; LeagueTable.jsx
 * and the odds engine both read from this single source instead of each
 * keeping their own copy.
 */

import { CLUBS } from "../data/clubs.js";

let table = {};
let listeners = new Set();

function reset() {
  table = {};
  CLUBS.forEach((c) => {
    table[c.name] = {
      name: c.name,
      leagueId: c.leagueId,
      played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, points: 0,
    };
  });
}
reset();

function emit() {
  const snapshot = { ...table };
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribe(fn) {
  listeners.add(fn);
  fn({ ...table });
  return () => listeners.delete(fn);
}

export function getStandings(leagueId) {
  return Object.values(table)
    .filter((r) => r.leagueId === leagueId)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
}

// Records the result of a finished match exactly once. Called from
// matchManager.js right when a match transitions to "finished".
export function recordResult(match) {
  const home = table[match.homeTeam];
  const away = table[match.awayTeam];
  if (!home || !away) return;

  home.played++; away.played++;
  home.gf += match.homeScore; home.ga += match.awayScore;
  away.gf += match.awayScore; away.ga += match.homeScore;

  if (match.homeScore > match.awayScore) {
    home.won++; home.points += 3; away.lost++;
  } else if (match.homeScore < match.awayScore) {
    away.won++; away.points += 3; home.lost++;
  } else {
    home.drawn++; away.drawn++; home.points += 1; away.points += 1;
  }

  emit();
}

// Converts a club's current form (points-per-game so far this
// session) into a rating adjustment used when generating odds for
// their next match. Clubs on a hot streak get a small boost, clubs
// struggling get a small penalty — returns null if they haven't
// played yet, so the base rating is used untouched.
export function getFormRating(clubName, baseForm) {
  const row = table[clubName];
  if (!row || row.played === 0) return baseForm;

  const ppg = row.points / row.played; // 0..3
  const formFromTable = 55 + (ppg / 3) * 35; // roughly 55..90
  // Blend with the club's base form so one bad result doesn't swing
  // odds wildly — table performance nudges the rating, it doesn't
  // replace it.
  return Math.round(baseForm * 0.5 + formFromTable * 0.5);
}

export function resetStandings() {
  reset();
  emit();
}
