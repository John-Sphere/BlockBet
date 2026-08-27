/**
 * /api/roulette-spin  (POST)  { betIds: [1,2,3], txHash: "0x..." }
 *
 * Called right after all bets for one spin are confirmed on-chain
 * (a real roulette table lets you place several different bets
 * before spinning once — red, a straight number, a dozen — all
 * resolved by the same single spin). Generates ONE provably-fair
 * result and signs a separate payout authorization for EACH bet,
 * all attesting to that same winning number.
 *
 * Fairness: the LAST bet's transaction hash is used as the "client
 * seed" — something that doesn't exist until after it's mined, so
 * the server can't have picked its secret seed with foreknowledge
 * of it.
 */

import { ethers } from "ethers";

const ABI = [
  "function rouletteBets(uint256) view returns (address,uint256,bool)",
  "function getRouletteBetNumbers(uint256) view returns (uint256[])",
];

const QUOTE_VALID_SECONDS = 300;

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function combinedRandomValue(serverSeed, clientSeed, nonce) {
  const hash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { betIds, txHash } = req.body || {};
  if (!Array.isArray(betIds) || betIds.length === 0 || !txHash) {
    return res.status(400).json({ error: "betIds (array) and txHash are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);
    const contractAddress = process.env.BETTING_ADDRESS;

    // Confirm the tx hash genuinely belongs to the same bettor as
    // these bets, so nobody can pass an arbitrary favorable hash.
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return res.status(400).json({ error: "Transaction not found" });

    const betsInfo = [];
    for (const betId of betIds) {
      const [bettor, amount, settled] = await contract.rouletteBets(betId);
      if (amount === 0n) return res.status(404).json({ error: `Bet ${betId} not found` });
      if (settled) return res.status(400).json({ error: `Bet ${betId} already settled` });
      if (bettor.toLowerCase() !== receipt.from.toLowerCase()) {
        return res.status(400).json({ error: "Transaction doesn't match these bets" });
      }
      const numbers = (await contract.getRouletteBetNumbers(betId)).map(Number);
      betsInfo.push({ betId, amount, numbers });
    }

    // One secret seed, one shared result for every bet in this spin.
    const seedBytes = crypto.getRandomValues(new Uint8Array(32));
    const serverSeed = Array.from(seedBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const serverSeedHash = await sha256Hex(serverSeed);
    const nonce = 0;

    const randomValue = await combinedRandomValue(serverSeed, txHash, nonce);
    const winningNumber = Math.floor(randomValue * 37);

    const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;

    const settlements = [];
    for (const bet of betsInfo) {
      const won = bet.numbers.includes(winningNumber);
      const payout = won ? Math.floor(Number(bet.amount) * 36 / bet.numbers.length) : 0;
      const settlementNonce = ethers.hexlify(ethers.randomBytes(32));

      const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "uint256", "uint256", "bytes32", "address"],
        [bet.betId, winningNumber, deadline, settlementNonce, contractAddress]
      );
      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      settlements.push({
        betId: Number(bet.betId),
        won,
        payout: payout.toString(),
        deadline,
        nonce: settlementNonce,
        signature,
      });
    }

    return res.status(200).json({
      winningNumber,
      settlements,
      fairness: { serverSeed, serverSeedHash, clientSeed: txHash, nonce: 0 },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
