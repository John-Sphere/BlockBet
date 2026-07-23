/**
 * BLOCKBET Odds Engine
 *
 * Converts club ratings into market odds.
 * Uses a probability model based on strength ratio,
 * then applies house margin (overround).
 *
 * Admin can change club ratings → odds update automatically.
 */

import { computeStrengthPublic } from "./strengthHelper.js";

/**
 * HOUSE_MARGIN — percentage the house takes as overround
 * Default 5.5% which gives ~105.5% book.
 * Adjustable per league or globally.
 */
const HOUSE_MARGIN = 0.055;

/**
 * calculateProbabilities
 * Returns home/draw/away win probabilities (0–1) based on ratings.
 */
export function calculateProbabilities(homeRatings, awayRatings) {
  const hStr = computeStrengthPublic(homeRatings, true);
  const aStr = computeStrengthPublic(awayRatings, false);

  const total = hStr + aStr;
  const rawHome = hStr / total;
  const rawAway = aStr / total;

  // Draw probability model — base draw rate in football is ~26–28%
  // Higher when teams are closely matched
  const diff = Math.abs(rawHome - rawAway);
  const drawBase = 0.28 - diff * 0.2;  // closer match → more draws
  const drawProb = Math.max(0.10, Math.min(0.35, drawBase));

  const homeProb = rawHome * (1 - drawProb);
  const awayProb = rawAway * (1 - drawProb);

  return {
    home: +homeProb.toFixed(4),
    draw: +drawProb.toFixed(4),
    away: +awayProb.toFixed(4),
  };
}

/**
 * probabilityToOdds
 * Converts probability to decimal odds with house margin applied.
 */
function probabilityToOdds(prob, margin) {
  const fair = 1 / prob;
  const withMargin = fair * (1 - margin);
  return Math.max(1.05, +withMargin.toFixed(2));
}

/**
 * calculateOdds
 * Main export — returns Home/Draw/Away decimal odds from club ratings.
 *
 * @param {object} homeRatings  Club ratings object
 * @param {object} awayRatings  Club ratings object
 * @param {number} margin       House margin (optional, default 5.5%)
 */
export function calculateOdds(homeRatings, awayRatings, margin = HOUSE_MARGIN) {
  const probs = calculateProbabilities(homeRatings, awayRatings);

  return {
    home: probabilityToOdds(probs.home, margin),
    draw: probabilityToOdds(probs.draw, margin),
    away: probabilityToOdds(probs.away, margin),
    probabilities: probs,
  };
}

/**
 * calculatePoolOdds
 * When real USDC is bet into pools, recalculate odds
 * based on pool distribution (parimutuel style).
 */
export function calculatePoolOdds(poolHome, poolDraw, poolAway, margin = HOUSE_MARGIN) {
  const total = poolHome + poolDraw + poolAway;
  if (!total) return null;

  const adj = 1 - margin;
  return {
    home: total > 0 && poolHome > 0 ? +((total * adj) / poolHome).toFixed(2) : null,
    draw: total > 0 && poolDraw > 0 ? +((total * adj) / poolDraw).toFixed(2) : null,
    away: total > 0 && poolAway > 0 ? +((total * adj) / poolAway).toFixed(2) : null,
  };
}

/**
 * formatOdds — display helper
 */
export function formatOdds(odds) {
  if (!odds || isNaN(odds)) return "—";
  return Number(odds).toFixed(2);
}