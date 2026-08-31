import { useState, useEffect, useCallback } from "react";
import { useSwap } from "../hooks/useSwap";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import "./Swap.css";

const TOKEN_LIST = ["USDC", "EURC", "cirBTC", "BLOCK"];

export default function Swap() {
  const { getQuote, executeSwap, getBalance, checkNeedsApproval, approveToken, swapping, TOKENS } = useSwap();
  const { connected, connect, address } = useWallet();
  const { addToast } = useApp();

  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("BLOCK");
  const [amountIn, setAmountIn] = useState("10");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [balances, setBalances] = useState({});
  const [result, setResult] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approving, setApproving] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!address) { setBalances({}); return; }
    const entries = await Promise.all(
      TOKEN_LIST.map(async (sym) => [sym, await getBalance(sym, address)])
    );
    setBalances(Object.fromEntries(entries));
  }, [address, getBalance]);

  useEffect(() => { refreshBalances(); }, [refreshBalances]);

  // Live quote, refetched whenever the amount or token pair changes.
  useEffect(() => {
    let cancelled = false;
    if (!amountIn || Number(amountIn) <= 0 || fromToken === toToken) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    getQuote(fromToken, toToken, amountIn).then((q) => {
      if (!cancelled) { setQuote(q); setQuoting(false); }
    });
    return () => { cancelled = true; };
  }, [fromToken, toToken, amountIn, getQuote]);

  useEffect(() => {
    let cancelled = false;
    if (!connected || !amountIn || Number(amountIn) <= 0) {
      setNeedsApproval(false);
      return;
    }
    checkNeedsApproval(fromToken, amountIn).then((needs) => {
      if (!cancelled) setNeedsApproval(needs);
    });
    return () => { cancelled = true; };
  }, [connected, fromToken, amountIn, checkNeedsApproval, result]);

  function flipTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
    setResult(null);
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await approveToken(fromToken, amountIn);
      setNeedsApproval(false);
      addToast(`${fromToken} approved — you can now swap.`, "success");
    } catch (e) {
      addToast(e?.message || "Approval failed.", "error");
    } finally {
      setApproving(false);
    }
  }

  async function handleSwap() {
    if (!connected) { await connect(); return; }
    if (fromToken === toToken) { addToast("Choose two different tokens.", "error"); return; }
    if (!amountIn || Number(amountIn) <= 0) { addToast("Enter an amount.", "error"); return; }
    if (Number(amountIn) > Number(balances[fromToken] || 0)) {
      addToast(`Not enough ${fromToken} — you have ${Number(balances[fromToken] || 0).toFixed(4)}.`, "error");
      return;
    }
    setResult(null);
    try {
      const res = await executeSwap(fromToken, toToken, amountIn);
      setResult(res);
      addToast(`Swapped ${amountIn} ${fromToken} for ~${Number(res.amountOut).toFixed(4)} ${toToken}.`, "success");
      setAmountIn("");
      refreshBalances();
    } catch (e) {
      addToast(e?.message || "Swap failed.", "error");
    }
  }

  const isTwoHop = fromToken !== "USDC" && toToken !== "USDC";

  return (
    <div className="sw-page">
      <div className="sw-header">
        <h1>Swap</h1>
        <p>Trade USDC, EURC, cirBTC, and BLOCK. 0.3% fee, real on-chain liquidity.</p>
      </div>

      <div className="sw-card">
        <div className="sw-field">
          <div className="sw-field-top">
            <span>From</span>
            {connected && <span className="sw-balance" onClick={() => setAmountIn(balances[fromToken] || "0")}>
              Balance: {Number(balances[fromToken] || 0).toFixed(4)}
            </span>}
          </div>
          <div className="sw-input-row">
            <input type="number" min="0" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} placeholder="0.0" />
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
              {TOKEN_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <button className="sw-flip" onClick={flipTokens} aria-label="Flip tokens">⇅</button>

        <div className="sw-field">
          <div className="sw-field-top">
            <span>To</span>
            {connected && <span className="sw-balance">Balance: {Number(balances[toToken] || 0).toFixed(4)}</span>}
          </div>
          <div className="sw-input-row">
            <input type="text" readOnly value={quoting ? "…" : (quote ? Number(quote).toFixed(6) : "0.0")} placeholder="0.0" />
            <select value={toToken} onChange={(e) => setToToken(e.target.value)}>
              {TOKEN_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {isTwoHop && (
          <div className="sw-route-note">Routed through USDC — two on-chain swaps, one confirmation each.</div>
        )}

        {connected && needsApproval && !isTwoHop ? (
          <button className="sw-btn sw-btn-approve" onClick={handleApprove} disabled={approving}>
            {approving ? "Approving…" : `Approve ${fromToken}`}
          </button>
        ) : (
          <button className="sw-btn" onClick={handleSwap} disabled={swapping || fromToken === toToken}>
            {!connected ? "Connect wallet" : swapping ? "Swapping…" : "Swap"}
          </button>
        )}

        <div className="sw-meta">
          <span>Fee</span><span>0.3%</span>
        </div>
        <div className="sw-meta">
          <span>Slippage tolerance</span><span>1%</span>
        </div>
      </div>

      {result && (
        <div className="sw-result">
          Swapped successfully — received ~{Number(result.amountOut).toFixed(4)} {toToken}.
        </div>
      )}
    </div>
  );
}
