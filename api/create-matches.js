import { ethers } from "ethers";

const VIRTUAL_TEAMS = [
  ["Man United", "Arsenal"],
  ["Barcelona", "Real Madrid"],
  ["Liverpool", "Man City"],
  ["PSG", "Bayern Munich"],
  ["Chelsea", "Tottenham"],
  ["Juventus", "AC Milan"],
  ["Dortmund", "Inter Milan"],
  ["Atletico Madrid", "Sevilla"],
];

const ABI = [
  "function createMatch(string,string) public",
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

export default async function handler(req, res) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
      process.env.BETTING_ADDRESS, ABI, wallet
    );

    const count = await contract.matchCount();
    let activeMatches = 0;

    for (let i = 1; i <= Number(count); i++) {
      const m = await contract.getMatch(i);
      if (!m[5]) activeMatches++;
    }

    if (activeMatches < 3) {
      const pair = VIRTUAL_TEAMS[Math.floor(Math.random() * VIRTUAL_TEAMS.length)];
      const tx = await contract.createMatch(pair[0], pair[1]);
      await tx.wait();
      res.status(200).json({ success: true, created: pair });
    } else {
      res.status(200).json({ success: true, message: "Enough active matches" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}