import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

// Real-time indexer (built today!) — fast GraphQL reads instead of
// scanning blockchain history directly. Currently covers single bets
// and match data; accumulator legs/outcomes still read on-chain below
// since those aren't indexed yet.
const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/3b829a5/v1/graphql";

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
  "function placeRouletteBet(uint256,uint256[]) public",
  "function settleRouletteBet(uint256,uint256,uint256,bytes32,bytes) public",
  "function rouletteBetCount() view returns (uint256)",
  "event RouletteBetPlaced(uint256 betId, address bettor, uint256 amount, uint256 numberCount)",
  "function placeAviatorBet(uint256) public",
  "function settleAviatorBet(uint256,uint256,uint256,bytes32,bytes) public",
  "function aviatorBetCount() view returns (uint256)",
  "event AviatorBetPlaced(uint256 betId, address bettor, uint256 amount)",
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
        const odds = Number(b.oddsBps) / 10000;
        return {
          matchId: Number(b.matchId),
          prediction,
          amount: ethers.formatUnits(b.amount, 6),
          odds,
          potentialWin: (Number(ethers.formatUnits(b.amount, 6)) * odds).toFixed(2),
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
      singles = [];
    }

    // Accumulator list — fast path via the indexer instead of
    // scanning blockchain history. Outcome and leg details still come
    // from the contract directly since the indexer doesn't track
    // those yet (see the known limitation noted when we built it).
    let accList = [];
    try {
      const data = await queryIndexer(
        `query MyAccumulators($bettor: String!) {
          Accumulator(where: { bettor: { _ilike: $bettor } }) {
            accId stake combinedOddsBps claimed legCount
          }
        }`,
        { bettor: target }
      );
      accList = data.Accumulator;
    } catch {
      accList = [];
    }

    const accumulators = [];
    for (const a of accList) {
      const accId = a.accId;
      const legCount = Number(a.legCount);
      const outcome = await contract.checkAccumulatorOutcome(accId);

      const legs = [];
      for (let i = 0; i < legCount; i++) {
        const [matchId, prediction] = await contract.getAccumulatorLeg(accId, i);
        const [homeTeam, awayTeam, , , , resolved, result] = await contract.getMatch(matchId);
        legs.push({ matchId: Number(matchId), prediction: Number(prediction), homeTeam, awayTeam, resolved, result: Number(result) });
      }

      accumulators.push({
        accId: Number(accId),
        legCount,
        stake: ethers.formatUnits(a.stake, 6),
        combinedOdds: Number(a.combinedOddsBps) / 10000,
        outcome: Number(outcome),
        claimed: a.claimed,
        legs,
        txHash: null,
      });
    }

    return {
      singles,
      accumulators: accumulators.reverse(),
    };
  }, [signer]);

  // Real roulette table flow: places every bet in the slip on-chain
  // (sequentially, to avoid wallet rate-limiting), requests ONE
  // shared provably-fair spin covering all of them, then settles each
  // bet against that same winning number. Returns the winning number,
  // per-bet results, total payout, and the fairness data needed to
  // verify the spin independently.
  const playRoulette = useCallback(async (bets) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!bets || bets.length === 0) throw new Error("No bets placed");
    setPlacing(true);
    try {
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const totalStake = bets.reduce((a, b) => a + Number(b.stake), 0);
      await approveUsdc(CONTRACT, String(totalStake));

      const betIds = [];
      let lastReceipt = null;
      for (const bet of bets) {
        const amtUnits = ethers.parseUnits(String(bet.stake), 6);
        const tx = await contract.placeRouletteBet(amtUnits, bet.numbers);
        const receipt = await tx.wait();
        lastReceipt = receipt;

        const placedEvent = receipt.logs
          .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
          .find((e) => e?.name === "RouletteBetPlaced");
        if (placedEvent?.args?.betId === undefined) throw new Error("Couldn't read bet ID from transaction");
        betIds.push(Number(placedEvent.args.betId));
      }

      const spinRes = await fetch("/api/roulette-spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betIds, txHash: lastReceipt.hash }),
      });
      const spin = await spinRes.json();
      if (!spinRes.ok) throw new Error(spin.error || "Spin failed");

      let totalPayout = 0n;
      for (const s of spin.settlements) {
        const settleTx = await contract.settleRouletteBet(s.betId, spin.winningNumber, s.deadline, s.nonce, s.signature);
        await settleTx.wait();
        totalPayout += BigInt(s.payout);
      }
      await refreshBalance();

      return {
        success: true,
        winningNumber: spin.winningNumber,
        settlements: spin.settlements,
        totalPayout: ethers.formatUnits(totalPayout, 6),
        won: spin.settlements.some((s) => s.won),
        fairness: spin.fairness,
      };
    } finally {
      setPlacing(false);
    }
  }, [signer, approveUsdc, refreshBalance]);

  // Places an Aviator bet on-chain. Returns the betId and the tx's
  // own hash — both needed later for the cash-out request, plus the
  // moment it confirmed, used to drive the client-side multiplier
  // display (the actual authoritative timing for settlement comes
  // from the transaction's real on-chain block timestamp, read
  // server-side — this local timestamp is just for a smooth-looking
  // display in the meantime).
  const placeAviatorBet = useCallback(async (amount) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!amount || Number(amount) <= 0) throw new Error("Invalid stake amount");
    setPlacing(true);
    try {
      await approveUsdc(CONTRACT, amount);
      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const amtUnits = ethers.parseUnits(String(amount), 6);
      const tx = await contract.placeAviatorBet(amtUnits);
      const receipt = await tx.wait();

      const placedEvent = receipt.logs
        .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find((e) => e?.name === "AviatorBetPlaced");
      if (placedEvent?.args?.betId === undefined) throw new Error("Couldn't read bet ID from transaction");

      return {
        success: true,
        betId: Number(placedEvent.args.betId),
        txHash: receipt.hash,
        confirmedAtMs: Date.now(),
      };
    } finally {
      setPlacing(false);
    }
  }, [signer, approveUsdc]);

  // The actual cash-out: asks the server for the current state (won
  // at some multiplier, or already crashed), then submits whatever
  // signed settlement it returns. Every call to this genuinely
  // attempts to settle the bet — there's no free "peek" at the
  // current multiplier through this function, since each request
  // returns a real, one-time-usable signature either way.
  const cashOutAviator = useCallback(async (betId, txHash) => {
    if (!signer) throw new Error("Wallet not connected");
    setCashingOut(true);
    try {
      const res = await fetch("/api/aviator-cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betId, txHash }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Cash out failed");

      const contract = new ethers.Contract(CONTRACT, BET_ABI, signer);
      const settleTx = await contract.settleAviatorBet(
        betId, result.payout, result.deadline, result.nonce, result.signature
      );
      await settleTx.wait();
      await refreshBalance();

      return {
        success: true,
        crashed: result.crashed,
        won: result.won,
        multiplier: result.multiplier,
        payout: ethers.formatUnits(result.payout, 6),
      };
    } finally {
      setCashingOut(false);
    }
  }, [signer, refreshBalance]);

  return {
    placeBet, claimWinnings, cashOutBet,
    placeAccumulator, claimAccumulator, checkAccumulatorOutcome,
    getMyBets, playRoulette,
    placeAviatorBet, cashOutAviator,
    placing, claiming, cashingOut,
  };
}
