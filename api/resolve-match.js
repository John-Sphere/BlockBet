/**
 * /api/resolve-match?home=X&away=Y&result=N
 *
 * Called by the browser the moment a match it's tracking (one that
 * was actually synced to chain, i.e. someone could have bet on it)
 * finishes its simulation. Passes the REAL result the simulation
 * already computed — result: 1=home win, 2=draw, 3=away win —
 * matching the Result enum in FootballBetting.sol exactly.
 *
 * This replaces resolve-matches.js's old random-outcome cron job,
 * which resolved matches with a result unrelated to what anyone
 * actually watched.
 */

import { ethers } from "ethers";

const ABI = [
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function resolveMatch(uint256,uint8) public",
];

const MAX_ATTEMPTS = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  const { home, away, result } = req.query;
  const resultNum = Number(result);

  if (!home || !away || ![1, 2, 3].includes(resultNum)) {
    return res.status(400).json({ error: "home, away, and result (1, 2, or 3) are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);

    const count = await contract.matchCount();
    const total = Number(count);
    const MAX_SCAN = 100;
    const startFrom = Math.max(1, total - MAX_SCAN + 1);

    let targetMatchId = null;
    for (let i = total; i >= startFrom; i--) {
      const m = await contract.getMatch(i);
      const [mHome, mAway, , , , resolved] = m;
      if (mHome === home && mAway === away && !resolved) {
        targetMatchId = i;
        break;
      }
    }

    if (targetMatchId === null) {
      return res.status(200).json({ resolved: false, reason: "no matching unresolved match found" });
    }

    // Several matches can finish at nearly the same real-world moment
    // now that rounds are wall-clock synchronized, so multiple resolve
    // requests can collide over transaction ordering — retry with a
    // fresh nonce read, same approach as ensure-match.js.
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        const tx = await contract.resolveMatch(targetMatchId, resultNum, { nonce });
        await tx.wait();
        return res.status(200).json({ matchId: targetMatchId, result: resultNum, resolved: true, attempt });
      } catch (err) {
        lastError = err;
        const isNonceIssue =
          err.code === "NONCE_EXPIRED" ||
          err.code === "REPLACEMENT_UNDERPRICED" ||
          /nonce/i.test(err.message || "");
        if (!isNonceIssue || attempt === MAX_ATTEMPTS) throw err;
        await sleep(300 * attempt);
      }
    }
    throw lastError;
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
