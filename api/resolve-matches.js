import { ethers } from "ethers";

const ABI = [
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function resolveMatch(uint256,uint8) public",
];

export default async function handler(req, res) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
      process.env.BETTING_ADDRESS, ABI, wallet
    );

    const count = await contract.matchCount();
    let resolved = [];

    for (let i = Math.max(1, Number(count) - 5); i <= Number(count); i++) {
      const m = await contract.getMatch(i);
      const isResolved = m[5];
      const totalBets = Number(m[2]) + Number(m[3]) + Number(m[4]);

      if (!isResolved && totalBets > 0) {
        const result = Math.floor(Math.random() * 3) + 1;
        const tx = await contract.resolveMatch(i, result);
        await tx.wait();
        resolved.push({ matchId: i, result });
      }
    }

    res.status(200).json({ success: true, resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}