/**
 * /api/aviator-cashout  (POST)  { betId, roundEpoch }
 *
 * Handles both checking the current state AND cashing out an Aviator
 * bet. The crash point is derived from the SHARED round epoch (not
 * this individual bet's own tx hash) — every player betting into the
 * same round window gets the exact same crash point and multiplier
 * curve, which is what makes it a genuine shared round rather than a
 * private one-off. Still fully stateless: given a server-only secret
 * key + the public round epoch number, the crash point is always
 * identically recomputable without storing anything, while staying
 * unpredictable to anyone who doesn't have that key.
 */

import { ethers } from "ethers";
import { crashPointFromRandom, timeForMultiplier, multiplierAtTime } from "../src/engine/aviatorEngine.js";
import { flightStartMs, MAX_FLIGHT_MS } from "../src/engine/aviatorSchedule.js";

const ABI = [
  "function aviatorBets(uint256) view returns (address,uint256,bool)",
];

const QUOTE_VALID_SECONDS = 30;

async function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Shared per-round, not per-bet — this is the key change. Every bet
// placed in the same round window resolves against this same value.
async function deriveCrashPoint(roundEpoch) {
  const secret = process.env.AVIATOR_SERVER_SEED;
  if (!secret) throw new Error("Server misconfigured: AVIATOR_SERVER_SEED not set");
  const derived = await hmacSha256Hex(secret, `round:${roundEpoch}`);
  const randomValue = parseInt(derived.slice(0, 8), 16) / 0xffffffff;
  return crashPointFromRandom(randomValue);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { betId, roundEpoch } = req.body || {};
  if (!betId || roundEpoch === undefined) {
    return res.status(400).json({ error: "betId and roundEpoch are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);
    const contractAddress = process.env.BETTING_ADDRESS;

    const [, amount, settled] = await contract.aviatorBets(betId);
    if (amount === 0n) return res.status(404).json({ error: "Bet not found" });
    if (settled) return res.status(400).json({ error: "This bet has already been settled" });

    const crashPoint = await deriveCrashPoint(roundEpoch);
    const roundFlightStart = flightStartMs(roundEpoch);
    const requestMs = Date.now();
    const elapsedSeconds = (requestMs - roundFlightStart) / 1000;
    // The round always ends by its scheduled boundary regardless of
    // what the theoretical crash point works out to — this keeps
    // round cycling predictable even on a very high, rare result.
    const crashAtSeconds = Math.min(timeForMultiplier(crashPoint), MAX_FLIGHT_MS / 1000);

    if (elapsedSeconds < 0) {
      return res.status(400).json({ error: "This round hasn't started flying yet" });
    }

    if (elapsedSeconds >= crashAtSeconds) {
      const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "bytes32", "address"],
        [betId, 0, deadline, nonce, contractAddress]
      );
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      const displayMultiplier = Math.min(crashPoint, multiplierAtTime(MAX_FLIGHT_MS / 1000));
      return res.status(200).json({
        crashed: true, won: false, multiplier: displayMultiplier,
        payout: "0", deadline, nonce, signature,
      });
    }

    const currentMultiplier = multiplierAtTime(elapsedSeconds);
    const payoutAmount = (BigInt(amount) * BigInt(Math.round(currentMultiplier * 100))) / 100n;

    const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256", "bytes32", "address"],
      [betId, payoutAmount, deadline, nonce, contractAddress]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return res.status(200).json({
      crashed: false, won: true, multiplier: currentMultiplier,
      payout: payoutAmount.toString(), deadline, nonce, signature,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
