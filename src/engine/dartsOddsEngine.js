/**
 * BLOCKBET Darts Odds Engine
 *
 * Self-contained, two-way market only (no draw). Live odds weighted
 * primarily by sets won — winning 3 sets ends the match outright —
 * with legs won in the current set as a secondary factor.
 */

const HOUSE_MARGIN = 0.055;
const MAX_ODDS = 15.0;

function strength(ratings) {
  return ratings.scoring * 0.5 + ratings.checkout * 0.35 + ratings.consistency * 0.15;
}

export function calculateProbabilities(ratingsA, ratingsB) {
  const strA = strength(ratingsA);
  const strB = strength(ratingsB);
  const total = strA + strB;
  return {
    home: +(strA / total).toFixed(4),
    away: +(strB / total).toFixed(4),
  };
}

function probabilityToOdds(prob, margin) {
  const fair = 1 / prob;
  const withMargin = fair * (1 - margin);
  return Math.min(MAX_ODDS, Math.max(1.02, +withMargin.toFixed(2)));
}

export function calculateOdds(ratingsA, ratingsB, margin = HOUSE_MARGIN) {
  const probs = calculateProbabilities(ratingsA, ratingsB);
  return {
    home: probabilityToOdds(probs.home, margin),
    away: probabilityToOdds(probs.away, margin),
    probabilities: probs,
  };
}

// setsA/setsB = sets won so far (0-3 each, first to 3 wins).
// legsA/legsB = legs won in the CURRENT, still-in-progress set.
export function calculateLiveOdds(baseProbabilities, setsA, setsB, legsA, legsB, margin = HOUSE_MARGIN) {
  const setCertainty = Math.max(setsA, setsB) === 0 ? 0 : (Math.abs(setsA - setsB) / 3) * 0.8;
  const totalLegs = legsA + legsB;
  const legCertainty = totalLegs === 0 ? 0 : (Math.abs(legsA - legsB) / Math.max(3, totalLegs)) * 0.2;

  const certainty = Math.min(0.95, setCertainty + legCertainty);
  const leading = setsA !== setsB ? (setsA > setsB ? "home" : "away") : (legsA >= legsB ? "home" : "away");
  const certain = { home: leading === "home" ? 1 : 0, away: leading === "away" ? 1 : 0 };

  const blended = {
    home: baseProbabilities.home * (1 - certainty) + certain.home * certainty,
    away: baseProbabilities.away * (1 - certainty) + certain.away * certainty,
  };

  const FLOOR = 0.07;
  const clamp = (p) => Math.max(FLOOR, Math.min(0.97, p));
  const clamped = { home: clamp(blended.home), away: clamp(blended.away) };
  const sum = clamped.home + clamped.away;
  const norm = { home: clamped.home / sum, away: clamped.away / sum };

  return {
    home: probabilityToOdds(norm.home, margin),
    away: probabilityToOdds(norm.away, margin),
    probabilities: norm,
  };
}

export function formatOdds(odds) {
  if (!odds || isNaN(odds)) return "—";
  return Number(odds).toFixed(2);
}
