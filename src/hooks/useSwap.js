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
  "function lpBalance(address,address) view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address,uint256) external returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const SLIPPAGE_BPS = 100; // 1% default tolerance
const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/d59f742/v1/graphql";

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

export function useSwap() {
  const { signer, provider } = useWallet();
  const [swapping, setSwapping] = useState(false);

  // Read-only quote — works even before connecting a wallet, using
  // whichever provider is available (falls back to a plain RPC read).
  // Real price impact — compares the pool's current spot price
  // (before your trade) against the actual effective rate your trade
  // would get, expressed as a percentage. This is what actually
  // explains a "bad rate" on a thin pool: it's not a bug, it's the
  // trade being large relative to the pool's depth.
  const getPriceImpact = useCallback(async (fromSymbol, toSymbol, amountIn) => {
    if (!amountIn || Number(amountIn) <= 0) return null;
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, readProvider);
    const from = TOKENS[fromSymbol];
    const to = TOKENS[toSymbol];

    try {
      // Two-hop (neither side USDC): approximate using the worse of
      // the two legs' impact, since both pools get touched.
      if (fromSymbol !== "USDC" && toSymbol !== "USDC") {
        const [impactFrom, impactTo] = await Promise.all([
          getPriceImpact(fromSymbol, "USDC", amountIn),
          getPriceImpact("USDC", toSymbol, amountIn), // rough estimate, second leg's real input differs slightly
        ]);
        if (impactFrom == null || impactTo == null) return null;
        return Math.max(impactFrom, impactTo);
      }

      const poolToken = fromSymbol === "USDC" ? to : from;
      const [reserveUsdc, reserveToken] = await contract.getPool(poolToken.address);
      if (reserveUsdc === 0n || reserveToken === 0n) return null;

      const amountInUnits = ethers.parseUnits(String(amountIn), from.decimals);
      const usdcIn = fromSymbol === "USDC";
      const amountOut = await contract.getAmountOut(poolToken.address, amountInUnits, usdcIn);

      // Convert everything to whole-unit floats first, then compare
      // rates directly — avoids any decimal-scaling mistakes.
      const usdcWhole = Number(reserveUsdc) / 1e6;
      const tokenWhole = Number(reserveToken) / Math.pow(10, poolToken.decimals);
      const spotPrice = usdcIn ? tokenWhole / usdcWhole : usdcWhole / tokenWhole;

      const amountOutWhole = Number(ethers.formatUnits(amountOut, to.decimals));
      const effectivePrice = amountOutWhole / Number(amountIn);

      const impact = ((spotPrice - effectivePrice) / spotPrice) * 100;
      return Math.max(0, impact);
    } catch {
      return null;
    }
  }, [signer, provider]);

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

  // Real price history for a token, derived from actual historical
  // swap events indexed on-chain — not simulated data. Returns points
  // sorted oldest-first, each { time, price } where price is USDC
  // per one whole token, correctly accounting for that token's real
  // decimal precision.
  const getPriceHistory = useCallback(async (symbol, limit = 50) => {
    const token = TOKENS[symbol];
    if (!token) return [];
    try {
      const data = await queryIndexer(
        `query SwapHistory($token: String!, $limit: Int!) {
          SwapEvent(where: { token: { _ilike: $token } }, order_by: { timestamp: asc }, limit: $limit) {
            usdcIn amountIn amountOut timestamp
          }
        }`,
        { token: token.address, limit }
      );
      return data.SwapEvent.map((e) => {
        const usdcAmount = e.usdcIn ? Number(e.amountIn) : Number(e.amountOut);
        const tokenAmount = e.usdcIn ? Number(e.amountOut) : Number(e.amountIn);
        const usdcValue = usdcAmount / 1e6;
        const tokenValue = tokenAmount / Math.pow(10, token.decimals);
        return {
          time: Number(e.timestamp) * 1000,
          price: tokenValue > 0 ? usdcValue / tokenValue : 0,
        };
      }).filter((p) => p.price > 0);
    } catch {
      return [];
    }
  }, []);

  // Real pool state — reserves and total LP shares, read directly
  // from the contract. Used to show current price/ratio and to
  // calculate the correctly-proportioned deposit for adding liquidity.
  const getPoolInfo = useCallback(async (symbol) => {
    const token = TOKENS[symbol];
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, readProvider);
    const [reserveUsdc, reserveToken, totalLp] = await contract.getPool(token.address);
    return {
      reserveUsdc: ethers.formatUnits(reserveUsdc, 6),
      reserveToken: ethers.formatUnits(reserveToken, token.decimals),
      totalLp: totalLp.toString(),
      exists: reserveUsdc > 0n,
    };
  }, [signer, provider]);

  // A specific user's LP share of a given pool, plus what that's
  // currently redeemable for in real USDC + token terms.
  const getMyLp = useCallback(async (symbol, address) => {
    if (!address) return { lpBalance: "0", usdcShare: "0", tokenShare: "0" };
    const token = TOKENS[symbol];
    const readProvider = signer?.provider || provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const contract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, readProvider);
    const lpBal = await contract.lpBalance(token.address, address);
    const [reserveUsdc, reserveToken, totalLp] = await contract.getPool(token.address);
    if (totalLp === 0n || lpBal === 0n) {
      return { lpBalance: "0", usdcShare: "0", tokenShare: "0" };
    }
    const usdcShare = (lpBal * reserveUsdc) / totalLp;
    const tokenShare = (lpBal * reserveToken) / totalLp;
    return {
      lpBalance: lpBal.toString(),
      usdcShare: ethers.formatUnits(usdcShare, 6),
      tokenShare: ethers.formatUnits(tokenShare, token.decimals),
    };
  }, [signer, provider]);

  // Adds liquidity to a pool. If the pool already has liquidity, the
  // caller should pass amounts matching the CURRENT ratio (get it
  // from getPoolInfo first) — depositing at a different ratio still
  // works but will shift the price, same real tradeoff as any AMM.
  const addLiquidity = useCallback(async (symbol, usdcAmount, tokenAmount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = TOKENS[symbol];
    const usdcUnits = ethers.parseUnits(String(usdcAmount), 6);
    const tokenUnits = ethers.parseUnits(String(tokenAmount), token.decimals);

    setSwapping(true);
    try {
      const usdcContract = new ethers.Contract(TOKENS.USDC.address, ERC20_ABI, signer);
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
      const owner = await signer.getAddress();

      const usdcAllowance = await usdcContract.allowance(owner, SWAP_CONTRACT);
      if (usdcAllowance < usdcUnits) {
        const tx = await usdcContract.approve(SWAP_CONTRACT, usdcUnits);
        await tx.wait();
      }
      const tokenAllowance = await tokenContract.allowance(owner, SWAP_CONTRACT);
      if (tokenAllowance < tokenUnits) {
        const tx = await tokenContract.approve(SWAP_CONTRACT, tokenUnits);
        await tx.wait();
      }

      const swapContract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, signer);
      const tx = await swapContract.addLiquidity(token.address, usdcUnits, tokenUnits);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setSwapping(false);
    }
  }, [signer]);

  // Burns LP tokens, returning your proportional share of both sides
  // of the pool. lpAmount is the raw LP token count (as returned by
  // getMyLp), not a USDC/token amount.
  const removeLiquidity = useCallback(async (symbol, lpAmount) => {
    if (!signer) throw new Error("Wallet not connected");
    const token = TOKENS[symbol];
    setSwapping(true);
    try {
      const swapContract = new ethers.Contract(SWAP_CONTRACT, SWAP_ABI, signer);
      const tx = await swapContract.removeLiquidity(token.address, lpAmount);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } finally {
      setSwapping(false);
    }
  }, [signer]);

  return {
    getQuote, executeSwap, getBalance, checkNeedsApproval, approveToken, getPriceHistory, getPriceImpact,
    getPoolInfo, getMyLp, addLiquidity, removeLiquidity,
    swapping, TOKENS,
  };
}
