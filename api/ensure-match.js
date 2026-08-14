/**
 * /api/ensure-match?home=X&away=Y
 *
 * Called directly by the browser (matchManager.js) the moment it
 * generates a virtual match client-side. Creates that exact fixture
 * on-chain if it doesn't already exist, and returns its chainMatchId —
 * replacing the old approach of the server randomly creating unrelated
 * fixtures and hoping they happened to match what a viewer was seeing.
 */

import { ethers } from "ethers";

const ABI = [
  "function createMatch(string,string) public",
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

export default async function handler(req, res) {
  const { home, away } = req.query;
  if (!home || !away) {
    return res.status(400).json({ error: "home and away are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);

    const count = await contract.matchCount();

    // Check if this exact fixture already exists and is still open
    for (let i = 1; i <= Number(count); i++) {
      const m = await contract.getMatch(i);
      const [mHome, mAway, , , , resolved] = m;
      if (mHome === home && mAway === away && !resolved) {
        return res.status(200).json({ matchId: i, created: false });
      }
    }

    // Doesn't exist yet — create it now
    const tx = await contract.createMatch(home, away);
    await tx.wait();
    const newCount = await contract.matchCount();

    return res.status(200).json({ matchId: Number(newCount), created: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
