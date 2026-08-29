/**
 * /api/aviator-cashout  (POST)  { betId, txHash }
 *
 * Handles both checking the current state AND cashing out an Aviator
 * bet. Crucially, this is stateless-safe: the crash point is derived
 * deterministically from a server-only secret key + this specific
 * bet's own on-chain data (via HMAC), so it never needs to be stored
 * anywhere between bet placement and cash-out — the server can always
 * recompute the identical answer later, but a player can never
 * predict it in advance without that secret key. The bet's actual
 * on-chain block timestamp (permanent, queryable forever) serves as
 * the round's start time, so there's no separate state to track
 * there either.
 */

import { ethers } from "ethers";
import { crashPointFromRandom, timeForMultiplier, multiplierAtTime } from "../src/engine/aviatorEngine.js";

const ABI = [
  "function aviatorBets(uint256) view returns (address,uint256,bool)",
];

const QUOTE_VALID_SECONDS = 30; // short window — this is a live, time-sensitive race

async function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveCrashPoint(betId, txHash) {
  const secret = process.env.AVIATOR_SERVER_SEED;
  if (!secret) throw new Error("Server misconfigured: AVIATOR_SERVER_SEED not set");
  const derived = await hmacSha256Hex(secret, `${betId}:${txHash}`);
  const randomValue = parseInt(derived.slice(0, 8), 16) / 0xffffffff;
  return crashPointFromRandom(randomValue);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { betId, txHash } = req.body || {};
  if (!betId || !txHash) return res.status(400).json({ error: "betId and txHash are required" });

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);
    const contractAddress = process.env.BETTING_ADDRESS;

    const [bettor, amount, settled] = await contract.aviatorBets(betId);
    if (amount === 0n) return res.status(404).json({ error: "Bet not found" });
    if (settled) return res.status(400).json({ error: "This bet has already been settled" });

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.from.toLowerCase() !== bettor.toLowerCase()) {
      return res.status(400).json({ error: "Transaction hash doesn't match this bet" });
    }
    const block = await provider.getBlock(receipt.blockNumber);
    const roundStartMs = block.timestamp * 1000;

    const crashPoint = await deriveCrashPoint(betId, txHash);
    const requestMs = Date.now();
    const elapsedSeconds = (requestMs - roundStartMs) / 1000;
    const crashAtSeconds = timeForMultiplier(crashPoint);

    if (elapsedSeconds >= crashAtSeconds) {
      const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "bytes32", "address"],
        [betId, 0, deadline, nonce, contractAddress]
      );
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));
      return res.status(200).json({
        crashed: true, won: false, multiplier: crashPoint,
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
