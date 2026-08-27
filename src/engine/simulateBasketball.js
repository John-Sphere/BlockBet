// src/engine/simulateBasketball.js
//
// Basketball needs a different modeling approach than football's
// simulate.js: instead of a handful of sparse goal events, a real
// game has ~80-100 scoring plays between both teams. Rather than
// simulating each shot, we generate a dense, deterministic sequence
// of scoring events spread across 4 quarters, weighted by each
// team's offense/defense/pace ratings — same seeded-PRNG philosophy
// as football, just tuned for basketball's actual scoring rhythm.

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

const QUARTERS = 4;
const QUARTER_MINUTES = 12; // real NBA quarter length, used for pacing math only

function strength(ratings) {
  return (ratings.offense * 1.1 + ratings.threePoint * 0.7 + ratings.pace * 0.6) / 2.4;
}

function defenseStrength(ratings) {
  return ratings.defense;
}

/**
 * Deterministic basketball match simulation — same seed always
 * produces the same result, same as football. Returns a dense
 * timeline of individual scoring plays (each 2 or 3 points), plus
 * final quarter-by-quarter and total scores.
 */
export function simulateBasketballMatch(homeClub, awayClub, round) {
  const seed = makeSeed(homeClub.id, awayClub.id, round);
  const rand = mulberry32(seed);

  const homeOff = strength(homeClub.ratings) + homeClub.ratings.homeAdvantage;
  const awayOff = strength(awayClub.ratings);
  const homeDef = defenseStrength(homeClub.ratings);
  const awayDef = defenseStrength(awayClub.ratings);

  const timeline = []; // { team: 'home'|'away', points: 2|3, minute: float (0-48) }
  let homeScore = 0;
  let awayScore = 0;
  const quarterScores = [];

  for (let q = 0; q < QUARTERS; q++) {
    let homeQ = 0;
    let awayQ = 0;
    const quarterStart = q * QUARTER_MINUTES;

    // Roughly 20-26 combined scoring plays per quarter, split by
    // relative offense-vs-opposing-defense strength.
    const playCount = 20 + Math.floor(rand() * 7);
    const homeShare = (homeOff / awayDef) / ((homeOff / awayDef) + (awayOff / homeDef));

    // Pre-generate play times within the quarter, sorted, so the
    // timeline reads chronologically.
    const times = Array.from({ length: playCount }, () => quarterStart + rand() * QUARTER_MINUTES)
      .sort((a, b) => a - b);

    for (const minute of times) {
      const isHome = rand() < homeShare;
      const isThree = rand() < 0.36; // roughly matches real NBA three-point attempt rate
      const points = isThree ? 3 : 2;
      // A make isn't guaranteed — roughly 45-52% for twos, 34-38% for threes,
      // nudged by the shooting team's rating vs opponent defense.
      const baseChance = isThree ? 0.36 : 0.49;
      const ratingAdj = ((isHome ? homeOff - awayDef : awayOff - homeDef) / 100) * 0.15;
      const madeChance = Math.max(0.25, Math.min(0.65, baseChance + ratingAdj));

      if (rand() < madeChance) {
        timeline.push({ team: isHome ? "home" : "away", points, minute: +minute.toFixed(2) });
        if (isHome) { homeQ += points; homeScore += points; }
        else { awayQ += points; awayScore += points; }
      }
    }

    quarterScores.push({ home: homeQ, away: awayQ });
  }

  let result; // 1 = home win, 3 = away win — basketball has no draw
  if (homeScore === awayScore) {
    // Genuinely tied scores go to a short deterministic "overtime"
    // nudge based on ratings, same seed always resolves the same way.
    result = (homeOff + homeClub.ratings.homeAdvantage >= awayOff) ? 1 : 3;
    homeScore += result === 1 ? 3 : 0;
    awayScore += result === 3 ? 3 : 0;
  } else {
    result = homeScore > awayScore ? 1 : 3;
  }

  return { timeline, quarterScores, homeScore, awayScore, result };
}
