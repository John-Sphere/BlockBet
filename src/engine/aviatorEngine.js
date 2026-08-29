// src/engine/aviatorEngine.js
//
// Aviator ("crash game") mechanics: a round starts, a multiplier
// climbs continuously from 1.00x, and players race to cash out
// before it "crashes" at a point determined — but kept secret —
// the moment the round begins. Anyone still in when it crashes
// loses their stake; anyone who cashed out first keeps stake ×
// their locked-in multiplier.
//
// Same provable-fairness principle as roulette (commit-reveal), just
// applied to a crash POINT instead of a winning number.

const HOUSE_EDGE = 0.02; // 2% — the crash point distribution bakes this in directly

// Turns a 0-1 random value into a crash multiplier. This is the
// standard formula used by real crash games: it produces a long-tail
// distribution — most rounds crash early (low multiplier), rare
// rounds run very high — with the house edge built directly into the
// math rather than needing a separate margin step like roulette.
export function crashPointFromRandom(randomValue) {
  const r = Math.min(0.999999, Math.max(0.000001, randomValue));
  const raw = (1 - HOUSE_EDGE) / (1 - r);
  return Math.max(1.00, Math.floor(raw * 100) / 100);
}

// Elapsed real seconds -> current multiplier. Exponential growth,
// calibrated so 2x lands around 4-5 seconds in — fast enough to feel
// exciting, slow enough to give a genuine decision window.
const GROWTH_RATE = 0.16;

export function multiplierAtTime(elapsedSeconds) {
  return Math.max(1.00, +(Math.exp(GROWTH_RATE * elapsedSeconds)).toFixed(2));
}

// Inverse of the above — how many seconds until the multiplier
// reaches a given crash point. Used to know exactly when a round
// ends without needing to check every single frame against it.
export function timeForMultiplier(multiplier) {
  return Math.log(multiplier) / GROWTH_RATE;
}

// Given a crash point and the current elapsed time, has this round
// already crashed? (And if so, exactly when, in elapsed seconds.)
export function hasCrashed(crashPoint, elapsedSeconds) {
  return elapsedSeconds >= timeForMultiplier(crashPoint);
}
