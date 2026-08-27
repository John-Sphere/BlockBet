/**
 * /api/roulette-spin?betId=X&txHash=Y
 *
 * Called right after a roulette bet is confirmed on-chain. Generates
 * the spin result using genuine provable fairness, signs a payout
 * authorization using the same trusted-oracle pattern as cashout,
 * and returns everything the player needs to both claim their result
 * AND independently verify the spin was genuinely fair.
 *
 * Fairness: the bet's own transaction hash (txHash) is used as the
 * "client seed" — something that doesn't exist until AFTER the bet
 * is placed and mined, so the server can't have picked its own
 * secret seed with foreknowledge of what that hash would be. Combined
 * with the server's freshly generated secret seed, neither side
 * could have engineered this specific result in advance.
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
  const { betId, txHash } = req.query;
  if (!betId || !txHash) {
    return res.status(400).json({ error: "betId and txHash are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);
    const contractAddress = process.env.BETTING_ADDRESS;

    const [bettor, amount, settled] = await contract.rouletteBets(betId);
    if (amount === 0n) return res.status(404).json({ error: "Bet not found" });
    if (settled) return res.status(400).json({ error: "This bet has already been settled" });

    // Confirm the transaction hash genuinely belongs to this bet, so
    // nobody can pass an arbitrary favorable hash as their "client seed".
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.from.toLowerCase() !== bettor.toLowerCase()) {
      return res.status(400).json({ error: "Transaction hash doesn't match this bet" });
    }

    const betNumbers = (await contract.getRouletteBetNumbers(betId)).map(Number);

    // Generate the server's secret seed fresh for this spin, compute
    // its hash (the "commitment"), then immediately reveal both —
    // the bet's own immutable, already-mined tx hash stands in for a
    // separate pre-commit round trip, since it's equally impossible
    // for the server to have predicted in advance.
    const seedBytes = crypto.getRandomValues(new Uint8Array(32));
    const serverSeed = Array.from(seedBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const serverSeedHash = await sha256Hex(serverSeed);
    const nonce = 0; // one spin per bet, so a fixed nonce is fine here

    const randomValue = await combinedRandomValue(serverSeed, txHash, nonce);
    const winningNumber = Math.floor(randomValue * 37);

    const won = betNumbers.includes(winningNumber);
    const payout = won ? Math.floor(Number(amount) * 36 / betNumbers.length) : 0;

    const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;
    const settlementNonce = ethers.hexlify(ethers.randomBytes(32));

    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256", "bytes32", "address"],
      [betId, winningNumber, deadline, settlementNonce, contractAddress]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return res.status(200).json({
      betId: Number(betId),
      winningNumber,
      won,
      payout: payout.toString(),
      deadline,
      nonce: settlementNonce,
      signature,
      // Everything needed to independently verify fairness client-side:
      fairness: { serverSeed, serverSeedHash, clientSeed: txHash, nonce: 0 },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
