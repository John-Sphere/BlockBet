// src/engine/aviatorSchedule.js
//
// Shared, wall-clock-synced round scheduling for Aviator — same
// deterministic philosophy as matchManager.js for sports: every
// visitor computes the identical round timing independently, no
// server round-trip needed just to know what phase we're in.
//
// A full cycle: 60s betting window, then a flight phase (the
// multiplier climbing) capped at a generous maximum so rounds always
// cycle predictably even on a very high, rare crash point.

export const BETTING_WINDOW_MS = 60 * 1000;
export const MAX_FLIGHT_MS = 30 * 1000; // absolute cap — corresponds to ~121x, extremely rare
export const ROUND_PERIOD_MS = BETTING_WINDOW_MS + MAX_FLIGHT_MS;

export function currentRoundEpoch(now = Date.now()) {
  return Math.floor(now / ROUND_PERIOD_MS);
}

export function roundStartMs(epoch) {
  return epoch * ROUND_PERIOD_MS;
}

export function flightStartMs(epoch) {
  return roundStartMs(epoch) + BETTING_WINDOW_MS;
}

// The single source of truth every client uses to know what phase
// the current shared round is in, purely from wall-clock time.
export function getRoundPhase(now = Date.now()) {
  const epoch = currentRoundEpoch(now);
  const rStart = roundStartMs(epoch);
  const fStart = flightStartMs(epoch);
  const elapsedInRound = now - rStart;

  if (elapsedInRound < BETTING_WINDOW_MS) {
    return {
      epoch, phase: "betting",
      msUntilFlight: fStart - now,
      flightStartMs: fStart,
    };
  }
  return {
    epoch, phase: "flying",
    elapsedFlightSeconds: (now - fStart) / 1000,
    flightStartMs: fStart,
  };
}
