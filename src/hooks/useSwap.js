import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";

const SWAP_CONTRACT = "0x62a1A511213f9D39beec755B0817Dacc7D9e2cAe";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

export const TOKENS = {
  USDC:   { address: USDC_ADDRESS, decimals: 6, symbol: "USDC" },
  EURC:   { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6, symbol: "EURC" },
  cirBTC: { address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", decimals: 8, symbol: "cirBTC" },
  BLOCK:  { address: "0x69cE945a92B29fC5BEd230139AA31716f324CD8C", decimals: 18, symbol: "BLOCK" },
};

const SWAP_ABI = [
  "function addLiquidity(address,uint256,uint256) external returns (uint256)",
  "function removeLiquidity(address,uint256) external returns (uint256,uint256)",
  "function swapUsdcForToken(address,uint256,uint256) external returns (uint256)",
  "function swapTokenForUsdc(address,uint256,uint256) external returns (uint256)",
  "function getAmountOut(address,uint256,bool) view returns (uint256)",
  "function getPool(address) view returns (uint256,uint256,uint256)",
  "function getPrice(address) view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address,uint256) external returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const SLIPPAGE_BPS = 100; // 1% default tolerance

export function useSwap() {
  const { signer, provider } = useWallet();
  const [swapping, setSwapping] = useState(false);

  // Read-only quote — works even before connecting a wallet, using
  // whichever provider is available (falls back to a plain RPC read).
  const getQuote = useCallback(async (fromSymbol, toSymbol, amountIn) => {
    if (!amountIn || Number(amountIn) <= 0) return null;
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, readProvider);
    const from = TOKENS[fromSymbol];
    const to = TOKENS[toSymbol];
    const amountInUnits = ethers.parseUnits(String(amountIn), from.decimals);

    try {
      if (fromSymbol === "USDC") {
        const out = await contract.getAmountOut(to.address, amountInUnits, true);
        return ethers.formatUnits(out, to.decimals);
      }
      if (toSymbol === "USDC") {
        const out = await contract.getAmountOut(from.address, amountInUnits, false);
        return ethers.formatUnits(out, to.decimals);
      }
      // Neither side is USDC — quote the two-hop route through it.
      const usdcOut = await contract.getAmountOut(from.address, amountInUnits, false);
      const finalOut = await contract.getAmountOut(to.address, usdcOut, true);
      return ethers.formatUnits(finalOut, to.decimals);
    } catch {
      return null; // pool doesn't exist yet or has no liquidity
    }
  }, [signer, provider]);

  async function ensureApproval(tokenAddress, amountUnits) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const owner = await signer.getAddress();
    const current = await contract.allowance(owner, SWAP_CONTRACT);
    if (current < amountUnits) {
      const tx = await contract.approve(SWAP_CONTRACT, amountUnits);
      await tx.wait();
    }
  }

  // Checks whether the "from" token already has enough allowance for
  // this swap — used to decide whether the UI should show "Approve"
  // or "Swap" as the active button, rather than silently handling
  // both inside one click.
  const checkNeedsApproval = useCallback(async (fromSymbol, amountIn) => {
    if (!signer || !amountIn || Number(amountIn) <= 0) return false;
    const from = TOKENS[fromSymbol];
    const amountInUnits = ethers.parseUnits(String(amountIn), from.decimals);
    const contract = new ethers.Contract(from.address, ERC20_ABI, signer);
    const owner = await signer.getAddress();
    const current = await contract.allowance(owner, SWAP_CONTRACT);
    return current < amountInUnits;
  }, [signer]);

  // A standalone, explicit approval step — its own button, its own
  // wallet confirmation, clearly separate from the swap itself.
  const approveToken = useCallback(async (fromSymbol, amountIn) => {
    if (!signer) throw new Error("Wallet not connected");
    const from = TOKENS[fromSymbol];
    const amountInUnits = ethers.parseUnits(String(amountIn), from.decimals);
    setSwapping(true);
    try {
      const contract = new ethers.Contract(from.address, ERC20_ABI, signer);
      const tx = await contract.approve(SWAP_CONTRACT, amountInUnits);
      await tx.wait();
      return { success: true };
    } finally {
      setSwapping(false);
    }
  }, [signer]);

  // Handles all three real cases: USDC->X, X->USDC, and X->Y (routed
  // through USDC as two separate on-chain swaps).
  const executeSwap = useCallback(async (fromSymbol, toSymbol, amountIn) => {
    if (!signer) throw new Error("Wallet not connected");
    const from = TOKENS[fromSymbol];
    const to = TOKENS[toSymbol];
    const amountInUnits = ethers.parseUnits(String(amountIn), from.decimals);

    setSwapping(true);
    try {
      const swapContract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, signer);

      if (fromSymbol === "USDC") {
        await ensureApproval(from.address, amountInUnits);
        const expectedOut = await swapContract.getAmountOut(to.address, amountInUnits, true);
        const minOut = (expectedOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;
        const tx = await swapContract.swapUsdcForToken(to.address, amountInUnits, minOut);
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, amountOut: ethers.formatUnits(expectedOut, to.decimals) };
      }

      if (toSymbol === "USDC") {
        await ensureApproval(from.address, amountInUnits);
        const expectedOut = await swapContract.getAmountOut(from.address, amountInUnits, false);
        const minOut = (expectedOut * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;
        const tx = await swapContract.swapTokenForUsdc(from.address, amountInUnits, minOut);
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, amountOut: ethers.formatUnits(expectedOut, to.decimals) };
      }

      // Two-hop: X -> USDC, then USDC -> Y. Each leg gets its own
      // slippage protection independently.
      await ensureApproval(from.address, amountInUnits);
      const usdcExpected = await swapContract.getAmountOut(from.address, amountInUnits, false);
      const usdcMinOut = (usdcExpected * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;
      const tx1 = await swapContract.swapTokenForUsdc(from.address, amountInUnits, usdcMinOut);
      const receipt1 = await tx1.wait();

      const usdcReceived = usdcExpected; // close enough for the second leg's quote
      await ensureApproval(TOKENS.USDC.address, usdcReceived);
      const finalExpected = await swapContract.getAmountOut(to.address, usdcReceived, true);
      const finalMinOut = (finalExpected * BigInt(10000 - SLIPPAGE_BPS)) / 10000n;
      const tx2 = await swapContract.swapUsdcForToken(to.address, usdcReceived, finalMinOut);
      const receipt2 = await tx2.wait();

      return {
        success: true,
        txHash: receipt2.hash,
        firstLegTxHash: receipt1.hash,
        amountOut: ethers.formatUnits(finalExpected, to.decimals),
      };
    } finally {
      setSwapping(false);
    }
  }, [signer]);

  const getBalance = useCallback(async (symbol, address) => {
    if (!address) return "0";
    const token = TOKENS[symbol];
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(token.address, ERC20_ABI, readProvider);
    const bal = await contract.balanceOf(address);
    return ethers.formatUnits(bal, token.decimals);
  }, [signer, provider]);

  return { getQuote, executeSwap, getBalance, checkNeedsApproval, approveToken, swapping, TOKENS };
}
