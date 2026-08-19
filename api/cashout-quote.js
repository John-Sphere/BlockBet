/**
 * /api/cashout-quote?matchId=X&address=Y
 *
 * Signs a cashout price quote for a pending bet, using the same
 * trusted wallet that already signs resolveMatch/createMatch. The
 * contract itself can never know a live match's real state — it
 * only trusts this signature.
 *
 * v1 pricing: full stake back, available anytime before the match
 * resolves. This is a safe, honest starting point — a smarter
 * dynamic formula (factoring in live match progress) can be added
 * later using this same signing infrastructure, no redeploy needed.
 */

import { ethers } from "ethers";

const ABI = [
  "function bets(uint256,address) view returns (uint256,uint8,uint256,bool,bool)",
  "function getMatch(uint256) view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

const QUOTE_VALID_SECONDS = 120; // quote expires 2 minutes after issued

export default async function handler(req, res) {
  const { matchId, address } = req.query;
  if (!matchId || !address) {
    return res.status(400).json({ error: "matchId and address are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);
    const contractAddress = process.env.BETTING_ADDRESS;

    const [amount, , , claimed, cashedOut] = await contract.bets(matchId, address);
    if (amount === 0n) {
      return res.status(404).json({ error: "No bet found for this match/address" });
    }
    if (claimed) {
      return res.status(400).json({ error: "This bet has already been claimed" });
    }
    if (cashedOut) {
      return res.status(400).json({ error: "This bet has already been cashed out" });
    }

    const [, , , , , resolved] = await contract.getMatch(matchId);
    if (resolved) {
      return res.status(400).json({ error: "Match already resolved \u2014 claim your winnings instead" });
    }

    // v1: full stake back.
    const offeredAmount = amount;
    const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "uint256", "bytes32", "address"],
      [matchId, address, offeredAmount, deadline, nonce, contractAddress]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return res.status(200).json({
      matchId: Number(matchId),
      offeredAmount: offeredAmount.toString(),
      deadline,
      nonce,
      signature,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
