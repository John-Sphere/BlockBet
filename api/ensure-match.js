/**
 * /api/ensure-match?home=X&away=Y
 *
 * Creates this exact fixture on-chain if it doesn't already exist,
 * and returns its chainMatchId. Includes retry logic: since multiple
 * requests can arrive close together and all try to sign a
 * transaction with the same wallet, they can collide over transaction
 * ordering ("nonce"). Retrying with a fresh nonce read after a short
 * delay resolves this for the vast majority of collisions.
 */

import { ethers } from "ethers";

const ABI = [
  "function createMatch(string,string) public",
  "function matchCount() public view returns (uint256)",
];

const MAX_ATTEMPTS = 4;
const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/c5d5150/v1/graphql";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Checks whether this fixture already exists via the indexer — one
// fast database query instead of scanning up to 100 matches directly
// on-chain, which was the majority of the delay before a bet could
// sync. Falls back to "not found" (letting the flow create it fresh)
// if the indexer itself is unreachable, rather than failing outright.
async function findExistingMatch(home, away) {
  try {
    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query Find($home: String!, $away: String!) {
          Match(where: { homeTeam: { _eq: $home }, awayTeam: { _eq: $away }, resolved: { _eq: false } }, limit: 1) {
            matchId
          }
        }`,
        variables: { home, away },
      }),
    });
    const json = await res.json();
    const match = json?.data?.Match?.[0];
    return match ? Number(match.matchId) : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { home, away } = req.query;
  if (!home || !away) {
    return res.status(400).json({ error: "home and away are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);

    const existingMatchId = await findExistingMatch(home, away);
    if (existingMatchId !== null) {
      return res.status(200).json({ matchId: existingMatchId, created: false });
    }

    // Doesn't exist yet — create it, retrying on nonce/transaction
    // collisions since concurrent requests share one wallet.
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Explicitly reading the pending nonce fresh on every attempt,
        // rather than letting ethers cache it, so a retry after
        // someone else's transaction lands actually gets the right slot.
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        const tx = await contract.createMatch(home, away, { nonce });
        await tx.wait();
        const newCount = await contract.matchCount();
        return res.status(200).json({ matchId: Number(newCount), created: true, attempt });
      } catch (err) {
        lastError = err;
        const isNonceIssue =
          err.code === "NONCE_EXPIRED" ||
          err.code === "REPLACEMENT_UNDERPRICED" ||
          /nonce/i.test(err.message || "");
        if (!isNonceIssue || attempt === MAX_ATTEMPTS) throw err;
        // Small increasing delay before retrying with a fresh nonce read.
        await sleep(300 * attempt);
      }
    }
    throw lastError;
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
