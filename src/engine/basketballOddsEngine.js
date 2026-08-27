/**
 * BLOCKBET Basketball Odds Engine
 *
 * Self-contained (doesn't depend on football's strengthHelper.js,
 * since basketball ratings use different fields entirely: offense/
 * defense/threePoint/pace instead of attack/midfield/defence).
 *
 * Two-way market only — no draw in basketball.
 */

const HOUSE_MARGIN = 0.055;
const MAX_ODDS = 15.0;

function strength(ratings, isHome) {
  const base =
    ratings.offense * 0.4 +
    ratings.defense * 0.3 +
    ratings.threePoint * 0.15 +
    ratings.pace * 0.1 +
    ratings.form * 0.05;
  return isHome ? base + ratings.homeAdvantage : base;
}

export function calculateProbabilities(homeRatings, awayRatings) {
  const hStr = strength(homeRatings, true);
  const aStr = strength(awayRatings, false);
  const total = hStr + aStr;

  return {
    home: +(hStr / total).toFixed(4),
    away: +(aStr / total).toFixed(4),
  };
}

function probabilityToOdds(prob, margin) {
  const fair = 1 / prob;
  const withMargin = fair * (1 - margin);
  return Math.min(MAX_ODDS, Math.max(1.02, +withMargin.toFixed(2)));
}

export function calculateOdds(homeRatings, awayRatings, margin = HOUSE_MARGIN) {
  const probs = calculateProbabilities(homeRatings, awayRatings);
  return {
    home: probabilityToOdds(probs.home, margin),
    away: probabilityToOdds(probs.away, margin),
    probabilities: probs,
  };
}

// Live in-play odds — same blending philosophy as football's version:
// pre-match probability blends toward "certain" as the game clock
// runs down, based on the actual current score. quarter/minute here
// is total elapsed minutes out of 48 (4 quarters x 12 min).
export function calculateLiveOdds(baseProbabilities, elapsedMinutes, homeScore, awayScore, margin = HOUSE_MARGIN) {
  const certainty = Math.max(0, Math.min(1, elapsedMinutes / 48));

  const leading = homeScore >= awayScore ? "home" : "away";
  const certain = { home: leading === "home" ? 1 : 0, away: leading === "away" ? 1 : 0 };

  // Point differential also matters in basketball — a 20-point lead
  // late is far more decisive than a 2-point lead, so certainty
  // scales up faster when the game is genuinely lopsided.
  const diff = Math.abs(homeScore - awayScore);
  const diffFactor = Math.min(1, diff / 20);
  const effectiveCertainty = Math.min(1, certainty * (0.6 + 0.4 * diffFactor + 0.4 * certainty));

  const blended = {
    home: baseProbabilities.home * (1 - effectiveCertainty) + certain.home * effectiveCertainty,
    away: baseProbabilities.away * (1 - effectiveCertainty) + certain.away * effectiveCertainty,
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
