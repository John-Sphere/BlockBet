import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

// Result enum from the contract: 0=NONE, 1=HOME, 2=DRAW, 3=AWAY
const BET_ABI = [
  "function placeBet(uint256,uint8,uint256) public",
  "function claimWinnings(uint256) public",
  "function getMatch(uint256) view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function matchCount() view returns (uint256)",
  "function placeAccumulator(uint256[],uint8[],uint256,uint256) public",
  "function claimAccumulator(uint256) public",
  "function checkAccumulatorOutcome(uint256) view returns (uint8)",
  "function getAccumulatorLegCount(uint256) view returns (uint256)",
  "function getAccumulatorLeg(uint256,uint256) view returns (uint256,uint8)",
  "function accumulatorCount() view returns (uint256)",
  "function bets(uint256,address) view returns (uint256,uint8,bool)",
  "function accumulators(uint256) view returns (address,uint256,uint256,bool)",
  "event BetPlaced(uint256 matchId, address bettor, uint8 prediction, uint256 amount)",
  "event AccumulatorPlaced(uint256 accId, address bettor, uint256 legCount, uint256 stake, uint256 combinedOddsBps)",
];

export function useBetting() {
  const { signer, approveUsdc, refreshBalance, usdcAddress } = useWallet();
  const [placing,  setPlacing]  = useState(false);
  const [claiming, setClaiming] = useState(false);

  const placeBet = useCallback(async ({ matchId, selection, amount }) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!amount || Number(amount) <= 0) throw new Error("Invalid stake amount");
    setPlacing(true);
    try {
      await approveUsdc(CONTRACT, amount);
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const amtUnits = ethers.parseUnits(String(amount), 6);
      const tx = await contract.placeBet(matchId, selection, amtUnits);
      const receipt = await tx.wait();
      await refreshBalance();
      return { success:true, txHash:receipt.hash };
    } finally { setPlacing(false); }
  }, [signer, approveUsdc, refreshBalance]);

  const claimWinnings = useCallback(async (matchId) => {
    if (!signer) throw new Error("Wallet not connected");
    setClaiming(true);
    try {
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const tx = await contract.claimWinnings(matchId);
      const receipt = await tx.wait();
      await refreshBalance();
      return { success:true, txHash:receipt.hash };
    } finally { setClaiming(false); }
  }, [signer, refreshBalance]);

  // legs: [{ matchId, selection }] where selection is 1=home, 2=draw, 3=away
  // combinedOdds: decimal odds already multiplied together by the caller
  const placeAccumulator = useCallback(async ({ legs, combinedOdds, amount }) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!amount || Number(amount) <= 0) throw new Error("Invalid stake amount");
    if (!legs || legs.length < 2) throw new Error("Need at least 2 legs for a multiple");

    setPlacing(true);
    try {
      await approveUsdc(CONTRACT, amount);
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const amtUnits = ethers.parseUnits(String(amount), 6);
      const matchIds = legs.map((l) => l.matchId);
      const selections = legs.map((l) => l.selection);
      const combinedOddsBps = Math.round(combinedOdds * 10000);

      const tx = await contract.placeAccumulator(matchIds, selections, combinedOddsBps, amtUnits);
      const receipt = await tx.wait();
      await refreshBalance();
      return { success:true, txHash:receipt.hash };
    } finally { setPlacing(false); }
  }, [signer, approveUsdc, refreshBalance]);

  const claimAccumulator = useCallback(async (accumulatorId) => {
    if (!signer) throw new Error("Wallet not connected");
    setClaiming(true);
    try {
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const tx = await contract.claimAccumulator(accumulatorId);
      const receipt = await tx.wait();
      await refreshBalance();
      return { success:true, txHash:receipt.hash };
    } finally { setClaiming(false); }
  }, [signer, refreshBalance]);

  const checkAccumulatorOutcome = useCallback(async (accumulatorId) => {
    if (!signer) return null;
    const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
    const outcome = await contract.checkAccumulatorOutcome(accumulatorId);
    return Number(outcome);
  }, [signer]);

  // Arc's RPC rejects queryFilter calls that span too many blocks at
  // once ("request exceeded max allowed range"). Search backward from
  // the current block in bounded chunks instead of asking for the
  // entire chain history in one call.
  const CHUNK_SIZE = 1000;
  const MAX_CHUNKS = 20; // covers 20,000 blocks of lookback

  async function queryFilterChunked(contract, filter) {
    const provider = contract.runner.provider;
    const latest = await provider.getBlockNumber();
    let events = [];
    let toBlock = latest;

    for (let i = 0; i < MAX_CHUNKS && toBlock > 0; i++) {
      const fromBlock = Math.max(0, toBlock - CHUNK_SIZE + 1);
      try {
        const chunkEvents = await contract.queryFilter(filter, fromBlock, toBlock);
        events = events.concat(chunkEvents);
      } catch {
        // This chunk itself failed (still too wide, or a transient
        // RPC issue) — skip it rather than aborting the whole search.
      }
      toBlock = fromBlock - 1;
    }
    return events;
  }

  // Reads this wallet's full bet history straight from the contract's
  // event log. Note: BetPlaced/AccumulatorPlaced don't mark any field
  // as "indexed" in the contract, so we can't filter by address at the
  // blockchain level — fetch every event and filter to this wallet
  // ourselves instead.
  //
  // Calls run sequentially, not in parallel (Promise.all) — Arc's
  // public testnet RPC rate-limits bursts of simultaneous requests,
  // which silently drops most of the detail lookups if fired all at
  // once. One at a time is slower but actually completes reliably.
  const getMyBets = useCallback(async (address) => {
    if (!signer || !address) return { singles: [], accumulators: [] };
    const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
    const target = address.toLowerCase();

    const allBetEvents = await queryFilterChunked(contract, contract.filters.BetPlaced());
    const allAccEvents = await queryFilterChunked(contract, contract.filters.AccumulatorPlaced());

    const betEvents = allBetEvents.filter((ev) => ev.args.bettor.toLowerCase() === target);
    const accEvents = allAccEvents.filter((ev) => ev.args.bettor.toLowerCase() === target);

    const singles = [];
    for (const ev of betEvents) {
      const matchId = ev.args.matchId;
      const prediction = Number(ev.args.prediction);
      const amount = ev.args.amount;
      const [homeTeam, awayTeam, , , , resolved, result] = await contract.getMatch(matchId);
      const bet = await contract.bets(matchId, address);
      singles.push({
        matchId: Number(matchId),
        prediction,
        amount: ethers.formatUnits(amount, 6),
        homeTeam,
        awayTeam,
        resolved,
        result: Number(result),
        claimed: bet[2],
        won: resolved && Number(result) === prediction,
        txHash: ev.transactionHash,
      });
    }

    const accumulators = [];
    for (const ev of accEvents) {
      const accId = ev.args.accId;
      const legCount = Number(ev.args.legCount);
      const stake = ev.args.stake;
      const combinedOddsBps = Number(ev.args.combinedOddsBps);
      const outcome = await contract.checkAccumulatorOutcome(accId);
      const accData = await contract.accumulators(accId);

      const legs = [];
      for (let i = 0; i < legCount; i++) {
        const [matchId, prediction] = await contract.getAccumulatorLeg(accId, i);
        const [homeTeam, awayTeam, , , , resolved, result] = await contract.getMatch(matchId);
        legs.push({ matchId: Number(matchId), prediction: Number(prediction), homeTeam, awayTeam, resolved, result: Number(result) });
      }

      accumulators.push({
        accId: Number(accId),
        legCount,
        stake: ethers.formatUnits(stake, 6),
        combinedOdds: combinedOddsBps / 10000,
        outcome: Number(outcome),
        claimed: accData[3],
        legs,
        txHash: ev.transactionHash,
      });
    }

    return {
      singles: singles.reverse(),
      accumulators: accumulators.reverse(),
    };
  }, [signer]);

  return {
    placeBet, claimWinnings,
    placeAccumulator, claimAccumulator, checkAccumulatorOutcome,
    getMyBets,
    placing, claiming,
  };
}
