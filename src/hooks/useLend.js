import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

const LEND_CONTRACT = "0x33A42CB5861BF473e9D5f37B023b5D10d5D9d701";

// All four assets can now be deposited, borrowed, and used as
// collateral — this is the full multi-asset token list, not just
// collateral types anymore.
export const LEND_TOKENS = {
  USDC:   { address: "0x3600000000000000000000000000000000000000", decimals: 6 },
  EURC:   { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6 },
  cirBTC: { address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8 },
  BLOCK:  { address: "0x69cE945a92B29fC5BEd230139AA31716f324CD8C", decimals: 18 },
};

function symbolFor(address) {
  return Object.entries(LEND_TOKENS).find(([, t]) => t.address.toLowerCase() === address?.toLowerCase())?.[0] || null;
}

const LEND_ABI = [
  "function deposit(address,uint256) external",
  "function withdraw(address,uint256) external",
  "function postCollateral(address,uint256) external",
  "function borrow(address,uint256) external",
  "function repay(uint256) external",
  "function withdrawCollateral(uint256) external",
  "function liquidate(address,uint256) external",
  "function lenderBalance(address,address) view returns (uint256)",
  "function lenderShares(address,address) view returns (uint256)",
  "function currentDebt(address) view returns (uint256)",
  "function maxBorrowable(address,address) view returns (uint256)",
  "function isLiquidatable(address) view returns (bool)",
  "function getPosition(address) view returns (address,uint256,address,uint256,bool)",
  "function getUtilization(address) view returns (uint256)",
  "function convertValue(address,uint256,address) view returns (uint256)",
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

  // ── Lender side, any of the 4 assets ────────────────────────

  const getLenderInfo = useCallback(async (symbol, address) => {
    if (!address) return { balance: "0" };
    const token = LEND_TOKENS[symbol];
    const contract = readContract();
    const balance = await contract.lenderBalance(token.address, address);
    return { balance: ethers.formatUnits(balance, token.decimals) };
  }, [signer, provider]);

  const depositAsset = useCallback(async (symbol, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = LEND_TOKENS[symbol];
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), token.decimals);
      await ensureApproval(token.address, units);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.deposit(token.address, units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  const withdrawAsset = useCallback(async (symbol, shareAmount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = LEND_TOKENS[symbol];
    setBusy(true);
    try {
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.withdraw(token.address, shareAmount);
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
    const [collateralToken, collateralAmount, borrowedAssetAddr, borrowedAmount, liquidatable] = await contract.getPosition(address);
    const collSymbol = symbolFor(collateralToken);
    const borrowedSymbol = symbolFor(borrowedAssetAddr);
    const collDecimals = collSymbol ? LEND_TOKENS[collSymbol].decimals : 18;
    const borrowDecimals = borrowedSymbol ? LEND_TOKENS[borrowedSymbol].decimals : 6;

    let availableToBorrow = "0";
    if (collSymbol && borrowedSymbol) {
      const avail = await contract.maxBorrowable(address, borrowedAssetAddr);
      availableToBorrow = ethers.formatUnits(avail, borrowDecimals);
    }

    return {
      collateralToken: collSymbol,
      collateralAmount: ethers.formatUnits(collateralAmount, collDecimals),
      borrowedAsset: borrowedSymbol,
      borrowedAmount: ethers.formatUnits(borrowedAmount, borrowDecimals),
      availableToBorrow,
      liquidatable,
    };
  }, [signer, provider]);

  // How much of `borrowSymbol` could be borrowed against the given
  // collateral right now — used before a borrow has actually started,
  // when the contract's own position-based maxBorrowable isn't
  // queryable yet for a brand new borrower.
  const getMaxBorrowable = useCallback(async (address, borrowSymbol) => {
    if (!address) return "0";
    const token = LEND_TOKENS[borrowSymbol];
    const contract = readContract();
    const avail = await contract.maxBorrowable(address, token.address);
    return ethers.formatUnits(avail, token.decimals);
  }, [signer, provider]);

  const postCollateral = useCallback(async (symbol, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = LEND_TOKENS[symbol];
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

  const borrowAsset = useCallback(async (symbol, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = LEND_TOKENS[symbol];
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), token.decimals);
      const contract = new ethers.Contract(LEND_CONTRACT, LEND_ABI, signer);
      const tx = await contract.borrow(token.address, units);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setBusy(false);
    }
  }, [signer]);

  // repay/withdrawCollateral don't need an asset param on-chain — the
  // contract already knows from your position — but we still need
  // the right decimals for the amount being typed in.
  const repayAsset = useCallback(async (symbol, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = LEND_TOKENS[symbol];
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(amount), token.decimals);
      await ensureApproval(token.address, units);
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
    const token = LEND_TOKENS[symbol];
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

  const liquidatePosition = useCallback(async (borrowerAddress, borrowedSymbol, repayAmount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = LEND_TOKENS[borrowedSymbol];
    setBusy(true);
    try {
      const units = ethers.parseUnits(String(repayAmount), token.decimals);
      await ensureApproval(token.address, units);
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
    const token = LEND_TOKENS[symbol];
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(token.address, ERC20_ABI, readProvider);
    const bal = await contract.balanceOf(address);
    return ethers.formatUnits(bal, token.decimals);
  }, [signer, provider]);

  const getUtilization = useCallback(async (symbol) => {
    const token = LEND_TOKENS[symbol];
    const contract = readContract();
    const bps = await contract.getUtilization(token.address);
    return Number(bps) / 100;
  }, [signer, provider]);

  return {
    getLenderInfo, depositAsset, withdrawAsset,
    getBorrowerInfo, getMaxBorrowable, postCollateral, borrowAsset, repayAsset, withdrawCollateral,
    liquidatePosition, getTokenBalance, getUtilization,
    busy, LEND_TOKENS,
  };
}
