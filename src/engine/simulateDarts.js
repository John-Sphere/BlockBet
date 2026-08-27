// src/engine/simulateDarts.js
//
// Real darts structure: legs (a single 501-down-to-0 game) build
// into sets, sets build into the match. We simulate at the LEG
// level — who wins each leg — rather than individual dart throws,
// same philosophy as tennis's game-level simulation. Standard
// televised format: best of 5 legs per set, best of 5 sets to win
// the match (first to 3).

function makeSeed(a, b, round) {
  const str = `${a}-${b}-${round}`;
  let seed = 0;
  for (let i = 0; i < str.length; i++) seed = (seed * 31 + str.charCodeAt(i)) | 0;
  return seed >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEGS_PER_SET = 5; // first to 3
const SETS_TO_WIN  = 3; // first to 3 sets

function legWinChance(playerA, playerB) {
  const strA = playerA.ratings.scoring * 0.5 + playerA.ratings.checkout * 0.35 + playerA.ratings.consistency * 0.15;
  const strB = playerB.ratings.scoring * 0.5 + playerB.ratings.checkout * 0.35 + playerB.ratings.consistency * 0.15;
  const diff = strA - strB;
  return Math.max(0.25, Math.min(0.75, 0.5 + diff / 150));
}

function simulateSet(playerA, playerB, rand) {
  let legsA = 0, legsB = 0;
  const legs = []; // { winner: 'A'|'B' }
  const chance = legWinChance(playerA, playerB);

  while (legsA < 3 && legsB < 3) {
    const aWins = rand() < chance;
    if (aWins) legsA++; else legsB++;
    legs.push({ winner: aWins ? "A" : "B" });
  }

  return { winner: legsA === 3 ? "A" : "B", legsA, legsB, legs };
}

/**
 * Deterministic darts match simulation — best of 5 sets, first to
 * 3, each set best of 5 legs. Same seed always produces the same
 * result. Returns the full set-by-set and leg-by-leg breakdown for
 * progressive live reveal.
 */
export function simulateDartsMatch(playerA, playerB, round) {
  const seed = makeSeed(playerA.id, playerB.id, round);
  const rand = mulberry32(seed);

  const sets = [];
  let setsA = 0, setsB = 0;

  while (setsA < SETS_TO_WIN && setsB < SETS_TO_WIN) {
    const set = simulateSet(playerA, playerB, rand);
    sets.push(set);
    if (set.winner === "A") setsA++; else setsB++;
  }

  const result = setsA > setsB ? 1 : 3; // 1 = playerA (home), 3 = playerB (away) — no draw
  return { sets, setsA, setsB, result };
}
