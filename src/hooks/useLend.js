import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

// Fill this in once BlockLend.sol is actually deployed.
const LEND_CONTRACT = "0xB67e4C8B4328269e5CcA56Ba0a593eC806a85531";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const COLLATERAL_TOKENS = {
  EURC:   { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
  cirBTC: { address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8 },
  BLOCK:  { address: "0x69cE945a92B29fC5BEd230139AA31716f324CD8C", decimals: 18 },
};

const LEND_ABI = [
  "function deposit(uint256) external",
  "function withdraw(uint256) external",
  "function postCollateral(address,uint256) external",
  "function borrow(uint256) external",
  "function repay(uint256) external",
  "function withdrawCollateral(uint256) external",
  "function liquidate(address,uint256) external",
  "function lenderBalance(address) view returns (uint256)",
  "function lenderShares(address) view returns (uint256)",
  "function currentDebt(address) view returns (uint256)",
  "function maxBorrowable(address) view returns (uint256)",
  "function isLiquidatable(address) view returns (bool)",
  "function getPosition(address) view returns (address,uint256,uint256,uint256,bool)",
  "function totalPoolValue() view returns (uint256)",
  "function totalShares() view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address,uint256) external returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

export function useLend() {
  const { signer, provider } = useWallet();
  const [busy, setBusy] = useState(false);

  function readContract() {
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    return new ethers.Contract(LEND_CONTRACT, LEND_ABI, readProvider);
  }

  async function ensureApproval(tokenAddress, amountUnits) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const owner = await signer.getAddress();
    const current = await contract.allowance(owner, LEND_CONTRACT);
    if (current < amountUnits) {
      const tx = await contract.approve(LEND_CONTRACT, amountUnits);
      await tx.wait();
    }
  }

  // ── Lender side ──────────────────────────────────────────────

  const getLenderInfo = useCallback(async (address) => {
    if (!address) return { balance: "0" };
    const contract = readContract();
    const balance = await contract.lenderBalance(address);
    return { balance: ethers.formatUnits(balance, 6) };
  }, [signer, provider]);

  const depositUsdc = useCallback(async (amount) => {
    if (!signer) throw new Error("Wallet not connected");
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), 6);
      await ensureApproval(USDC_ADDRESS, units);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.deposit(units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  const withdrawUsdc = useCallback(async (shareAmount) => {
    if (!signer) throw new Error("Wallet not connected");
    setBusy(true);
    try {
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.withdraw(shareAmount);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  // ── Borrower side ────────────────────────────────────────────

  const getBorrowerInfo = useCallback(async (address) => {
    if (!address) return null;
    const contract = readContract();
    const [collateralToken, collateralAmount, borrowedAmount, availableToBorrow, liquidatable] = await contract.getPosition(address);
    const collSymbol = Object.entries(COLLATERAL_TOKENS).find(([, t]) => t.address.toLowerCase() === collateralToken.toLowerCase())?.[0] || null;
    const decimals = collSymbol ? COLLATERAL_TOKENS[collSymbol].decimals : 18;
    return {
      collateralToken: collSymbol,
      collateralAmount: ethers.formatUnits(collateralAmount, decimals),
      borrowedAmount: ethers.formatUnits(borrowedAmount, 6),
      availableToBorrow: ethers.formatUnits(availableToBorrow, 6),
      liquidatable,
    };
  }, [signer, provider]);

  const postCollateral = useCallback(async (symbol, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = COLLATERAL_TOKENS[symbol];
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), token.decimals);
      await ensureApproval(token.address, units);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.postCollateral(token.address, units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  const borrowUsdc = useCallback(async (amount) => {
    if (!signer) throw new Error("Wallet not connected");
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), 6);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.borrow(units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  const repayUsdc = useCallback(async (amount) => {
    if (!signer) throw new Error("Wallet not connected");
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), 6);
      await ensureApproval(USDC_ADDRESS, units);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.repay(units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  const withdrawCollateral = useCallback(async (symbol, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = COLLATERAL_TOKENS[symbol];
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), token.decimals);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.withdrawCollateral(units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  // Anyone can liquidate an unsafe position — this is intentionally
  // usable against any address, not just your own.
  const liquidatePosition = useCallback(async (borrowerAddress, repayAmount) => {
    if (!signer) throw new Error("Wallet not connected");
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(repayAmount), 6);
      await ensureApproval(USDC_ADDRESS, units);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.liquidate(borrowerAddress, units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  const getTokenBalance = useCallback(async (symbol, address) => {
    if (!address) return "0";
    const isUsdc = symbol === "USDC";
    const token = isUsdc ? { address: USDC_ADDRESS, decimals: 6 } : COLLATERAL_TOKENS[symbol];
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(token.address, ERC20_ABI, readProvider);
    const bal = await contract.balanceOf(address);
    return ethers.formatUnits(bal, token.decimals);
  }, [signer, provider]);

  return {
    getLenderInfo, depositUsdc, withdrawUsdc,
    getBorrowerInfo, postCollateral, borrowUsdc, repayUsdc, withdrawCollateral,
    liquidatePosition, getTokenBalance,
    busy, COLLATERAL_TOKENS,
  };
}
