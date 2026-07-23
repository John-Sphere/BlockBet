import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS || "0x6df1feCD5d4A8cA8701458bDc5139bC1038d6fd7";

const BET_ABI = [
  "function placeBet(uint256,uint8,uint256) public",
  "function claimWinnings(uint256) public",
  "function getMatch(uint256) view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function matchCount() view returns (uint256)",
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

  return { placeBet, claimWinnings, placing, claiming };
}