// src/engine/simulateTennis.js
//
// Tennis needs a fundamentally different model than football (sparse
// goals) or basketball (dense scoring plays): matches are built from
// games, games are built from sets, best-of-3. We simulate at the
// GAME level (who wins each game, alternating serve) rather than
// simulating every individual point — a legitimate real structure,
// just not point-by-point granular.

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

// Probability the server wins a given game — serve rating matters a
// lot (real tennis: servers win 60-80%+ of their service games at
// the pro level), returner's return rating pulls it back down.
function serverWinChance(server, returner) {
  const base = 0.62 + (server.ratings.serve - returner.ratings.returnG) / 250;
  return Math.max(0.35, Math.min(0.92, base));
}

// A tiebreak (played at 6-6) is closer to a coin flip weighted by
// overall + mental rating, since serve advantage matters less over
// a single short breaker.
function tiebreakWinChance(playerA, playerB) {
  const diff = (playerA.ratings.overall + playerA.ratings.mental * 0.5)
             - (playerB.ratings.overall + playerB.ratings.mental * 0.5);
  return Math.max(0.3, Math.min(0.7, 0.5 + diff / 200));
}

function simulateSet(playerA, playerB, rand, firstServerIsA) {
  let gamesA = 0, gamesB = 0;
  let serverIsA = firstServerIsA;
  const games = []; // { winner: 'A'|'B' }

  while (true) {
    const chance = serverIsA ? serverWinChance(playerA, playerB) : serverWinChance(playerB, playerA);
    const serverWins = rand() < chance;
    const winnerIsA = serverIsA ? serverWins : !serverWins;

    if (winnerIsA) gamesA++; else gamesB++;
    games.push({ winner: winnerIsA ? "A" : "B" });
    serverIsA = !serverIsA;

    if (gamesA >= 6 && gamesA - gamesB >= 2) return { winner: "A", gamesA, gamesB, games, tiebreak: false };
    if (gamesB >= 6 && gamesB - gamesA >= 2) return { winner: "B", gamesA, gamesB, games, tiebreak: false };
    if (gamesA === 6 && gamesB === 6) {
      const aWinsTb = rand() < tiebreakWinChance(playerA, playerB);
      games.push({ winner: aWinsTb ? "A" : "B", isTiebreak: true });
      return {
        winner: aWinsTb ? "A" : "B",
        gamesA: aWinsTb ? 7 : 6, gamesB: aWinsTb ? 6 : 7,
        games, tiebreak: true,
      };
    }
  }
}

/**
 * Deterministic tennis match simulation — best of 3 sets. Same seed
 * always produces the same result. Returns the full set-by-set and
 * game-by-game breakdown, used to progressively reveal the match
 * live as real time passes.
 */
export function simulateTennisMatch(playerA, playerB, round) {
  const seed = makeSeed(playerA.id, playerB.id, round);
  const rand = mulberry32(seed);

  const sets = [];
  let setsA = 0, setsB = 0;
  let firstServerIsA = true;

  while (setsA < 2 && setsB < 2) {
    const set = simulateSet(playerA, playerB, rand, firstServerIsA);
    sets.push(set);
    if (set.winner === "A") setsA++; else setsB++;
    // Total games in the set determines who serves first next set
    // (odd total flips the opening server) — a small realism touch.
    const totalGames = set.gamesA + set.gamesB;
    if (totalGames % 2 === 1) firstServerIsA = !firstServerIsA;
  }

  const result = setsA > setsB ? 1 : 3; // 1 = playerA (home) wins, 3 = playerB (away) wins — no draw
  return { sets, setsA, setsB, result };
}
