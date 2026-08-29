// src/engine/aviatorRound.js
//
// Provable fairness for Aviator, same commit-reveal principle as
// roulette's provablyFair.js — kept as its own module since it
// produces a crash POINT rather than a winning number, and pairs
// directly with aviatorEngine.js's curve math for evaluating
// cash-out requests against a round already in progress.

import { crashPointFromRandom, timeForMultiplier, multiplierAtTime } from "./aviatorEngine.js";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function combinedRandomValue(serverSeed, clientSeed, nonce) {
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

// Call once per round, server-side, before accepting any bets —
// the crash point itself stays secret until the round actually ends.
export async function generateRound() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const serverSeed = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const serverSeedHash = await sha256Hex(serverSeed);
  return { serverSeed, serverSeedHash };
}

export async function computeCrashPoint(serverSeed, clientSeed, nonce) {
  const randomValue = await combinedRandomValue(serverSeed, clientSeed, nonce);
  return crashPointFromRandom(randomValue);
}

// Player-facing verification, same shape as roulette's verifySpin.
export async function verifyRound({ serverSeed, serverSeedHash, clientSeed, nonce, claimedCrashPoint }) {
  const actualHash = await sha256Hex(serverSeed);
  const hashMatches = actualHash === serverSeedHash;

  const recomputed = await computeCrashPoint(serverSeed, clientSeed, nonce);
  const crashMatches = recomputed === claimedCrashPoint;

  return { valid: hashMatches && crashMatches, hashMatches, crashMatches, recomputedCrashPoint: recomputed };
}

// The core real-time decision: given a round's (still-secret) crash
// point, when it actually started, and the exact moment a cash-out
// was requested — did it make it in time, and at what multiplier?
// This is called the instant a player clicks "Cash Out", so it needs
// to be fast and exact, not an approximation.
export function evaluateCashout(crashPoint, roundStartMs, requestMs) {
  const elapsedSeconds = (requestMs - roundStartMs) / 1000;
  const crashAtSeconds = timeForMultiplier(crashPoint);

  if (elapsedSeconds >= crashAtSeconds) {
    // Too late — the plane had already flown away before this
    // request reached the server. A real, honest loss, not an edge
    // case to hide: crash games are fundamentally a race against time.
    return { won: false, crashedAtSeconds: crashAtSeconds, multiplier: crashPoint };
  }

  return { won: true, multiplier: multiplierAtTime(elapsedSeconds), elapsedSeconds };
}
