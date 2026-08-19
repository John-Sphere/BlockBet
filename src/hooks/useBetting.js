import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

// Real-time indexer (built today!) — fast GraphQL reads instead of
// scanning blockchain history directly. Currently covers single bets
// and match data; accumulator legs/outcomes still read on-chain below
// since those aren't indexed yet.
const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/c5d5150/v1/graphql";

async function queryIndexer(query, variables) {
  const res = await fetch(INDEXER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Indexer query failed");
  return json.data;
}

// Result enum from the contract: 0=NONE, 1=HOME, 2=DRAW, 3=AWAY
const BET_ABI = [
  "function placeBet(uint256,uint8,uint256,uint256) public",
  "function claimWinnings(uint256) public",
  "function cashOutBet(uint256,uint256,uint256,bytes32,bytes) public",
  "function getMatch(uint256) view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function matchCount() view returns (uint256)",
  "function placeAccumulator(uint256[],uint8[],uint256,uint256) public",
  "function claimAccumulator(uint256) public",
  "function checkAccumulatorOutcome(uint256) view returns (uint8)",
  "function getAccumulatorLegCount(uint256) view returns (uint256)",
  "function getAccumulatorLeg(uint256,uint256) view returns (uint256,uint8)",
  "function accumulatorCount() view returns (uint256)",
  "function bets(uint256,address) view returns (uint256,uint8,uint256,bool,bool)",
  "function accumulators(uint256) view returns (address,uint256,uint256,bool)",
  "event BetPlaced(uint256 matchId, address bettor, uint8 prediction, uint256 amount, uint256 oddsBps)",
  "event BetCashedOut(uint256 matchId, address bettor, uint256 amount)",
  "event AccumulatorPlaced(uint256 accId, address bettor, uint256 legCount, uint256 stake, uint256 combinedOddsBps)",
];

export function useBetting() {
  const { signer, approveUsdc, refreshBalance, usdcAddress } = useWallet();
  const [placing,  setPlacing]  = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);

  // odds: the decimal odds shown on screen (e.g. 2.19) — locked in as
  // basis points at placement time (2.19 -> 21900), matching how
  // accumulators already worked.
  const placeBet = useCallback(async ({ matchId, selection, amount, odds }) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!amount || Number(amount) <= 0) throw new Error("Invalid stake amount");
    if (!odds || Number(odds) <= 0) throw new Error("Invalid odds");
    setPlacing(true);
    try {
      await approveUsdc(CONTRACT, amount);
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const amtUnits = ethers.parseUnits(String(amount), 6);
      const oddsBps = Math.round(Number(odds) * 10000);
      const tx = await contract.placeBet(matchId, selection, amtUnits, oddsBps);
      const receipt = await tx.wait();
      await refreshBalance();
      return { success:true, txHash:receipt.hash };
    } finally { setPlacing(false); }
  }, [signer, approveUsdc, refreshBalance]);

  // Fetches a signed cashout quote from the server, then submits it
  // to the contract. Two network round-trips: get the quote, then
  // spend it — the quote itself is only valid for a couple minutes.
  const cashOutBet = useCallback(async (matchId) => {
    if (!signer) throw new Error("Wallet not connected");
    const address = await signer.getAddress();
    setCashingOut(true);
    try {
      const res = await fetch(`/api/cashout-quote?matchId=${matchId}&address=${address}`);
      const quote = await res.json();
      if (!res.ok) throw new Error(quote.error || "Couldn't get a cashout quote");

      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const tx = await contract.cashOutBet(
        matchId,
        quote.offeredAmount,
        quote.deadline,
        quote.nonce,
        quote.signature
      );
      const receipt = await tx.wait();
      await refreshBalance();
      return { success: true, txHash: receipt.hash, amount: ethers.formatUnits(quote.offeredAmount, 6) };
    } finally {
      setCashingOut(false);
    }
  }, [signer, refreshBalance]);

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
  //
  // MetaMask's own RPC connection separately rate-limits rapid bursts
  // of requests — with two event types x many chunks, firing them
  // back-to-back with no pause was tripping that limit. A short delay
  // between each chunk, and a smaller total lookback, keeps this
  // comfortably under whatever burst limit MetaMask enforces.
  const CHUNK_SIZE = 1000;
  const MAX_CHUNKS = 8; // covers 8,000 blocks of lookback
  const CHUNK_DELAY_MS = 250;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
      if (toBlock > 0) await sleep(CHUNK_DELAY_MS);
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

    // Single bets — fast path via the indexer instead of scanning
    // blockchain history directly.
    let singles = [];
    try {
      const data = await queryIndexer(
        `query MyBets($bettor: String!) {
          Bet(where: { bettor: { _ilike: $bettor } }) {
            id matchId bettor prediction amount claimed oddsBps cashedOut
          }
        }`,
        { bettor: target }
      );

      const matchIds = [...new Set(data.Bet.map((b) => b.matchId))];
      let matchesById = {};
      if (matchIds.length) {
        const matchData = await queryIndexer(
          `query Matches($ids: [numeric!]) {
            Match(where: { matchId: { _in: $ids } }) {
              matchId homeTeam awayTeam resolved result
            }
          }`,
          { ids: matchIds }
        );
        matchesById = Object.fromEntries(matchData.Match.map((m) => [m.matchId, m]));
      }

      singles = data.Bet.map((b) => {
        const match = matchesById[b.matchId] || {};
        const prediction = Number(b.prediction);
        const result = Number(match.result ?? 0);
        return {
          matchId: Number(b.matchId),
          prediction,
          amount: ethers.formatUnits(b.amount, 6),
          homeTeam: match.homeTeam || "Unknown",
          awayTeam: match.awayTeam || "Unknown",
          resolved: !!match.resolved,
          result,
          claimed: b.claimed,
          cashedOut: b.cashedOut,
          won: !!match.resolved && result === prediction,
          txHash: null,
        };
      }).reverse();
    } catch {
      // Indexer unreachable — fall back to nothing rather than the
      // old slow scan, since that path added a lot of complexity for
      // an edge case. Worth revisiting if this happens often.
      singles = [];
    }

    const allAccEvents = await queryFilterChunked(contract, contract.filters.AccumulatorPlaced());
    const accEvents = allAccEvents.filter((ev) => ev.args.bettor.toLowerCase() === target);

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
        await sleep(150);
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
      await sleep(150);
    }

    return {
      singles,
      accumulators: accumulators.reverse(),
    };
  }, [signer]);

  return {
    placeBet, claimWinnings, cashOutBet,
    placeAccumulator, claimAccumulator, checkAccumulatorOutcome,
    getMyBets,
    placing, claiming, cashingOut,
  };
}
