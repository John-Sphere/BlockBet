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

    // Search recent matches for this exact unresolved fixture — same
    // "most recent first" approach as ensure-match, since the match
    // we want is always one of the newer ones.
    const MAX_SCAN = 100;
    const startFrom = Math.max(1, total - MAX_SCAN + 1);

    for (let i = total; i >= startFrom; i--) {
      const m = await contract.getMatch(i);
      const [mHome, mAway, , , , resolved] = m;
      if (mHome === home && mAway === away && !resolved) {
        const tx = await contract.resolveMatch(i, resultNum);
        await tx.wait();
        return res.status(200).json({ matchId: i, result: resultNum, resolved: true });
      }
    }

    // Not found unresolved (either never synced to chain, or already
    // resolved) — not an error, just nothing to do.
    return res.status(200).json({ resolved: false, reason: "no matching unresolved match found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
