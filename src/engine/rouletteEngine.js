// src/engine/rouletteEngine.js
//
// European roulette (single zero, 37 pockets — better odds for
// players than American double-zero). Genuinely different from the
// sports engines: this is one instant spin against the house, not a
// multi-minute match, so it needs real "provably fair" randomness
// instead of our deterministic wall-clock seeds.
//
// Provably fair works via commit-reveal: the server generates a
// secret seed and publishes its HASH before the spin happens, so it
// can be mathematically proven afterward that the result wasn't
// chosen based on what was bet. Combined with a client-provided
// seed, neither the house nor the player can control the result
// alone. See provablyFair.js for the actual hashing.

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function colorOf(number) {
  if (number === 0) return "green";
  return RED_NUMBERS.has(number) ? "red" : "black";
}

// Real roulette bet types and their true payout odds.
export const BET_TYPES = {
  straight:  { payout: 35, label: "Straight up (single number)" },
  split:     { payout: 17, label: "Split (2 adjacent numbers)" },
  street:    { payout: 11, label: "Street (3 numbers, one row)" },
  corner:    { payout: 8,  label: "Corner (4 numbers)" },
  sixLine:   { payout: 5,  label: "Six line (6 numbers)" },
  column:    { payout: 2,  label: "Column (12 numbers)" },
  dozen:     { payout: 2,  label: "Dozen (12 numbers)" },
  red:       { payout: 1,  label: "Red" },
  black:     { payout: 1,  label: "Black" },
  odd:       { payout: 1,  label: "Odd" },
  even:      { payout: 1,  label: "Even" },
  low:       { payout: 1,  label: "1-18" },
  high:      { payout: 1,  label: "19-36" },
};

// Given a winning number and a placed bet, determines whether that
// specific bet wins. `bet.numbers` is always the exact set of pocket
// numbers the bet covers — computed by the UI when the bet is placed
// (e.g. a "red" bet's numbers = all 18 red numbers), kept explicit
// here rather than re-deriving it, so this stays a pure, simple check.
export function betWins(winningNumber, bet) {
  return bet.numbers.includes(winningNumber);
}

export function calculatePayout(stake, betType) {
  const odds = BET_TYPES[betType]?.payout;
  if (odds == null) return 0;
  return stake * (odds + 1); // +1 returns the original stake too, standard convention
}

// Maps a raw 0-1 random value (from the provably-fair hash) onto a
// winning pocket number — NOT onto wheel position, since only the
// pocket number matters for bet resolution.
export function numberFromRandom(randomValue) {
  return Math.floor(randomValue * 37); // 0-36 inclusive
}
