/**
 * marketsEngine.js
 * Calculates secondary markets — Both Teams to Score (GG/NG) and
 * Over/Under goal lines — from club ratings, using a simple Poisson
 * goal model. These are DISPLAY ONLY for now: the smart contract only
 * supports Home/Draw/Away bets, so these markets aren't bet-able
 * on-chain yet (that needs a contract change, same as fixed-odds
 * singles did).
 */

const HOUSE_MARGIN = 0.055;

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonProb(lambda, k) {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

// Rough expected-goals estimate per team from attack vs opponent
// defence/goalkeeping — same spirit as simulate.js's xG model, kept
// simple since this only powers display markets, not the actual
// simulated result.
function expectedGoals(attackerRatings, defenderRatings) {
  const attack = (attackerRatings.attack * 0.7 + attackerRatings.midfield * 0.3) / 100;
  const defence = (defenderRatings.defence * 0.7 + defenderRatings.goalkeeping * 0.3) / 100;
  const base = 1.35 * (attack / Math.max(0.4, defence));
  return Math.max(0.4, Math.min(3.2, base));
}

function toOdds(prob) {
  if (prob <= 0) return null;
  const fair = 1 / prob;
  return Math.max(1.05, +(fair * (1 - HOUSE_MARGIN)).toFixed(2));
}

export function calculateExtraMarkets(homeRatings, awayRatings) {
  const homeXG = expectedGoals(homeRatings, awayRatings);
  const awayXG = expectedGoals(awayRatings, homeRatings);

  // Both teams to score: P(home scores >=1) * P(away scores >=1),
  // treated as independent — a simplification, fine for a display
  // market on a simulated game.
  const pHomeScores = 1 - poissonProb(homeXG, 0);
  const pAwayScores = 1 - poissonProb(awayXG, 0);
  const ggProb = pHomeScores * pAwayScores;

  // Over/Under total goals — sum both teams' expected goals, then
  // use a Poisson distribution over the combined total.
  const totalXG = homeXG + awayXG;
  function overProb(line) {
    // P(total > line) = 1 - P(total <= floor(line))
    const maxGoals = Math.floor(line);
    let cumulative = 0;
    for (let k = 0; k <= maxGoals; k++) {
      cumulative += poissonProb(totalXG, k);
    }
    return 1 - cumulative;
  }

  const lines = [1.5, 2.5, 3.5];
  const overUnder = {};
  lines.forEach((line) => {
    const over = overProb(line);
    overUnder[line] = {
      over: toOdds(over),
      under: toOdds(1 - over),
    };
  });

  return {
    gg: {
      yes: toOdds(ggProb),
      no: toOdds(1 - ggProb),
    },
    overUnder,
    homeXG: +homeXG.toFixed(2),
    awayXG: +awayXG.toFixed(2),
  };
}
