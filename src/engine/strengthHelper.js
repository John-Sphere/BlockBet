/**
 * computeStrengthPublic — shared strength calculation
 * Used by both simulateEngine and oddsEngine without circular dep.
 */
export function computeStrengthPublic(ratings, isHome) {
  const {
    attack = 70, midfield = 70, defence = 70,
    goalkeeping = 70, overall = 70, form = 70,
    homeAdvantage = 5, awayPerformance = 70,
  } = ratings;

  const base =
    attack      * 0.28 +
    midfield    * 0.22 +
    defence     * 0.22 +
    goalkeeping * 0.12 +
    overall     * 0.10 +
    form        * 0.06;

  const locationMod = isHome
    ? 1 + homeAdvantage / 200
    : awayPerformance / 100;

  return Math.max(0.1, Math.min(1.5, (base / 100) * locationMod));
}