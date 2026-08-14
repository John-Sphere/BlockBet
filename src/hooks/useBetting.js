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
  "function accumulatorCount() view returns (uint256)",
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

  return {
    placeBet, claimWinnings,
    placeAccumulator, claimAccumulator, checkAccumulatorOutcome,
    placing, claiming,
  };
}
