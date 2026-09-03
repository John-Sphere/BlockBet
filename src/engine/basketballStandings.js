/**
 * basketballStandings.js
 * Mirrors standings.js's architecture, but for real basketball rules:
 * no draws, ranked by win percentage (not a 3-1-0 points system),
 * with point differential as the tiebreaker — same convention real
 * NBA standings use.
 */

import { BASKETBALL_CLUBS } from "../data/basketballClubs.js";

let table = {};
let listeners = new Set();

function reset() {
  table = {};
  BASKETBALL_CLUBS.forEach((c) => {
    table[c.name] = {
      name: c.name,
      leagueId: c.leagueId,
      played: 0, won: 0, lost: 0,
      pf: 0, pa: 0,
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
      const pctA = a.played > 0 ? a.won / a.played : 0;
      const pctB = b.played > 0 ? b.won / b.played : 0;
      if (pctB !== pctA) return pctB - pctA;
      return (b.pf - b.pa) - (a.pf - a.pa); // point differential tiebreak
    });
}

// Called from basketballMatchManager.js the instant a game finishes.
export function recordResult(match) {
  const home = table[match.homeTeam];
  const away = table[match.awayTeam];
  if (!home || !away) return;

  home.played++; away.played++;
  home.pf += match.homeScore; home.pa += match.awayScore;
  away.pf += match.awayScore; away.pa += match.homeScore;

  if (match.homeScore > match.awayScore) {
    home.won++; away.lost++;
  } else {
    away.won++; home.lost++;
  }

  emit();
}

export function resetStandings() {
  reset();
  emit();
}
