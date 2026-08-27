// src/engine/provablyFair.js
//
// Commit-reveal provable fairness, the real standard used by
// legitimate crypto casino games. How it works:
//
// 1. BEFORE any bet, the server generates a secret random seed and
//    publishes only its SHA-256 HASH to the player (the "commit").
//    The hash reveals nothing about the actual seed.
// 2. The player places their bet. The result is computed from the
//    (still-secret) server seed + a client seed + a nonce.
// 3. AFTER the spin, the server reveals the real seed.
// 4. The player can independently re-hash the revealed seed and
//    confirm it matches the hash published in step 1 — proving the
//    server didn't change the seed after seeing the bet. They can
//    also recompute the actual result themselves from the revealed
//    seed, confirming the number wasn't tampered with either.
//
// This file provides the hashing/verification utilities usable both
// client-side (to verify) and server-side (to generate) — uses the
// Web Crypto API, available in both browsers and Node's serverless
// functions without extra dependencies.

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Combines the (now-revealed) server seed with the client seed and a
// per-bet nonce into a single deterministic hash, then takes the
// first 8 hex characters as a 0-1 float — same combination method
// used to actually determine the spin result at bet time.
async function combinedRandomValue(serverSeed, clientSeed, nonce) {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await sha256Hex(combined);
  const chunk = hash.slice(0, 8);
  return parseInt(chunk, 16) / 0xffffffff;
}

// Call this once, server-side, before accepting a bet. Returns both
// the secret seed (kept server-side until reveal) and its hash
// (safe to show the player immediately).
export async function generateCommit() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const serverSeed = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const serverSeedHash = await sha256Hex(serverSeed);
  return { serverSeed, serverSeedHash };
}

// The actual result computation — called server-side at spin time
// (server seed is still secret at this point), using the real
// roulette wheel mapping from rouletteEngine.js.
export async function computeResult(serverSeed, clientSeed, nonce) {
  const randomValue = await combinedRandomValue(serverSeed, clientSeed, nonce);
  return Math.floor(randomValue * 37); // 0-36
}

// Player-facing verification — given everything revealed after the
// spin, confirms both that the seed matches its earlier-published
// hash, AND that it actually produces the claimed winning number.
export async function verifySpin({ serverSeed, serverSeedHash, clientSeed, nonce, claimedNumber }) {
  const actualHash = await sha256Hex(serverSeed);
  const hashMatches = actualHash === serverSeedHash;

  const recomputedNumber = await computeResult(serverSeed, clientSeed, nonce);
  const numberMatches = recomputedNumber === claimedNumber;

  return {
    valid: hashMatches && numberMatches,
    hashMatches,
    numberMatches,
    recomputedNumber,
  };
}

// A reasonable default client seed if the player doesn't want to
// supply their own — still combined with the server's secret seed,
// so this alone doesn't make results predictable.
export function generateClientSeed() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
