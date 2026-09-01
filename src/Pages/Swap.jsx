import { useMemo, useState, useEffect, useCallback } from "react";
import { useSwap } from "../hooks/useSwap";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import { TokenIcon } from "../components/ui/TokenIcon";
import PriceChart from "../components/charts/PriceChart";
import "./Swap.css";

// Real tokens only — matching what's actually deployed and pooled on
// Arc Testnet. No ARC or WETH here, since those don't exist as real
// pools on this platform.
const TOKEN_META = {
  USDC:   { name: "USD Coin",       icon: "$", color: "#4C86FF" },
  EURC:   { name: "Euro Coin",      icon: "€", color: "#7DA6FF" },
  cirBTC: { name: "Circle BTC",     icon: "₿", color: "#F0A83E" },
  BLOCK:  { name: "BlockBet Token", icon: "B", color: "#E8B23D" },
};
const TOKEN_LIST = Object.keys(TOKEN_META);

export default function Swap() {
  const { getQuote, executeSwap, getBalance, checkNeedsApproval, approveToken, getPriceHistory, swapping, TOKENS } = useSwap();
  const { connected, connect, address } = useWallet();
  const { addToast } = useApp();

  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("BLOCK");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [slippage, setSlippage] = useState(1.0);
  const [pickerFor, setPickerFor] = useState(null);
  const [balances, setBalances] = useState({});
  const [needsApproval, setNeedsApproval] = useState(false);
  const [approving, setApproving] = useState(false);
  const [poolPrices, setPoolPrices] = useState({}); // real on-chain price per token, in USDC

  const refreshBalances = useCallback(async () => {
    if (!address) { setBalances({}); return; }
    const entries = await Promise.all(
      TOKEN_LIST.map(async (sym) => [sym, await getBalance(sym, address)])
    );
    setBalances(Object.fromEntries(entries));
  }, [address, getBalance]);

  useEffect(() => { refreshBalances(); }, [refreshBalances]);

  // Real prices straight from your pools — one USDC-denominated
  // reference quote per non-USDC token, used for the ticker strip and
  // the USD-value hints under each field. Not an external market feed,
  // genuinely what your own liquidity is currently pricing things at.
  useEffect(() => {
    let cancelled = false;
    async function loadPrices() {
      const entries = await Promise.all(
        ["EURC", "cirBTC", "BLOCK"].map(async (sym) => {
          const q = await getQuote(sym, "USDC", "1");
          return [sym, q ? Number(q) : null];
        })
      );
      if (!cancelled) setPoolPrices(Object.fromEntries(entries));
    }
    loadPrices();
    const interval = setInterval(loadPrices, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [getQuote]);

  const priceOf = useCallback((sym) => (sym === "USDC" ? 1 : poolPrices[sym] ?? null), [poolPrices]);

  // The token to actually chart — whichever side of the pair isn't
  // USDC, since USDC itself has no swap history (it's always the
  // base currency, never the "token" side of a Swap event).
  const chartToken = toToken !== "USDC" ? toToken : fromToken !== "USDC" ? fromToken : null;

  useEffect(() => {
    let cancelled = false;
    if (!showChart || !chartToken) return;
    setChartLoading(true);
    getPriceHistory(chartToken).then((data) => {
      if (!cancelled) { setChartData(data); setChartLoading(false); }
    });
    return () => { cancelled = true; };
  }, [showChart, chartToken, getPriceHistory]);

  useEffect(() => {
    let cancelled = false;
    if (!amountIn || Number(amountIn) <= 0 || fromToken === toToken) {
      setAmountOut("");
      return;
    }
    setQuoting(true);
    getQuote(fromToken, toToken, amountIn).then((q) => {
      if (!cancelled) { setAmountOut(q || ""); setQuoting(false); }
    });
    return () => { cancelled = true; };
  }, [fromToken, toToken, amountIn, getQuote]);

  useEffect(() => {
    let cancelled = false;
    if (!connected || !amountIn || Number(amountIn) <= 0) { setNeedsApproval(false); return; }
    checkNeedsApproval(fromToken, amountIn).then((needs) => {
      if (!cancelled) setNeedsApproval(needs);
    });
    return () => { cancelled = true; };
  }, [connected, fromToken, amountIn, checkNeedsApproval]);

  const fromBalance = Number(balances[fromToken] || 0);
  const toBalance = Number(balances[toToken] || 0);
  const usdIn = amountIn && priceOf(fromToken) ? (Number(amountIn) * priceOf(fromToken)).toFixed(2) : "0.00";
  const usdOut = amountOut && priceOf(toToken) ? (Number(amountOut) * priceOf(toToken)).toFixed(2) : "0.00";
  const insufficientFunds = amountIn && Number(amountIn) > fromBalance;
  const isTwoHop = fromToken !== "USDC" && toToken !== "USDC";

  function pct(p) {
    setAmountIn((fromBalance * p).toFixed(6).replace(/\.?0+$/, "") || "0");
  }

  function flip() {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmountIn(amountOut || "");
  }

  function selectToken(symbol) {
    if (pickerFor === "from") {
      if (symbol === toToken) setToToken(fromToken);
      setFromToken(symbol);
    } else if (pickerFor === "to") {
      if (symbol === fromToken) setFromToken(toToken);
      setToToken(symbol);
    }
    setPickerFor(null);
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
    try {
      const res = await executeSwap(fromToken, toToken, amountIn);
      addToast(`Swapped ${amountIn} ${fromToken} for ~${Number(res.amountOut).toFixed(4)} ${toToken}.`, "success");
      setAmountIn("");
      setAmountOut("");
      refreshBalances();
    } catch (e) {
      addToast(e?.message || "Swap failed.", "error");
    }
  }

  const fromT = TOKEN_META[fromToken];
  const toT = TOKEN_META[toToken];

  const tickerData = TOKEN_LIST.map((sym) => ({
    symbol: sym,
    price: priceOf(sym),
  }));

  let submitLabel;
  if (!connected) submitLabel = "Connect Wallet";
  else if (!amountIn) submitLabel = "Enter an amount";
  else if (insufficientFunds) submitLabel = `Insufficient ${fromToken} balance`;
  else if (needsApproval && !isTwoHop) submitLabel = approving ? "Approving…" : `Approve ${fromToken}`;
  else submitLabel = swapping ? "Swapping…" : "Swap";

  const submitDisabled = connected && (!amountIn || insufficientFunds || swapping || approving || fromToken === toToken);
  const submitAction = !connected ? connect : (needsApproval && !isTwoHop ? handleApprove : handleSwap);

  return (
    <div className="sw-page">
      <div className="sw-ticker-strip">
        <div className="sw-ticker">
          {[...tickerData, ...tickerData].map((t, i) => (
            <span className="sw-ticker-item" key={i}>
              <span className="sw-ticker-sym">${t.symbol}</span>
              <span>{t.price != null ? `$${t.price.toLocaleString(undefined, { maximumFractionDigits: t.symbol === "cirBTC" ? 0 : 4 })}` : "—"}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="sw-body">
        <div className="sw-card">
          <div className="sw-card-top">
            <div className="sw-tabs">
              <button className="sw-tab active">Swap</button>
              <button className="sw-tab" disabled>Bridge</button>
            </div>
            <div className="sw-toolbar">
              <button className={`sw-icon-btn ${showChart ? "sw-icon-btn-active" : ""}`} onClick={() => setShowChart((s) => !s)} aria-label="Chart" disabled={!chartToken}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
              </button>
              <button className="sw-icon-btn" onClick={() => setShowSettings((s) => !s)} aria-label="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/></svg>
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="sw-settings">
              <div className="sw-settings-label">Slippage tolerance (display only — actual protection is fixed at 1% on-chain)</div>
              <div className="sw-slippage-row">
                {[0.5, 1.0, 2.0].map((v) => (
                  <button key={v} className={`sw-slip-btn ${slippage === v ? "active" : ""}`} onClick={() => setSlippage(v)}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {showChart && chartToken && (
            <div className="sw-chart-panel">
              <div className="sw-chart-head">
                <TokenIcon symbol={chartToken} fallbackIcon={TOKEN_META[chartToken].icon} color={TOKEN_META[chartToken].color} size={18} />
                <span>{chartToken} / USDC</span>
                {chartData.length > 0 && (
                  <span className="sw-chart-current">${chartData[chartData.length - 1].price.toFixed(4)}</span>
                )}
              </div>
              {chartLoading ? (
                <div className="sw-chart-loading">Loading real swap history…</div>
              ) : (
                <PriceChart data={chartData} width={420} height={160} />
              )}
            </div>
          )}

          <div className="sw-field">
            <div className="sw-field-top">
              <span className="sw-field-label">Sell</span>
              <div className="sw-balance-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sw-wallet-ico"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h.01"/></svg>
                <span>{fromBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {fromToken}</span>
                {connected && <button className="sw-pct" onClick={() => pct(0.5)}>50%</button>}
                {connected && <button className="sw-pct" onClick={() => pct(1)}>Max</button>}
              </div>
            </div>
            <div className="sw-field-row">
              <TokenPill symbol={fromToken} meta={fromT} onClick={() => setPickerFor("from")} />
              <div className="sw-amount-block">
                <input
                  className="sw-amount-input"
                  type="number"
                  placeholder="0.00"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                />
                <span className="sw-usd-value">${usdIn}</span>
              </div>
            </div>
          </div>

          <div className="sw-flip-row">
            <button className="sw-flip-btn" onClick={flip} aria-label="Flip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
            </button>
          </div>

          <div className="sw-field">
            <div className="sw-field-top">
              <span className="sw-field-label">Receive</span>
              <div className="sw-balance-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sw-wallet-ico"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h.01"/></svg>
                <span>{toBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toToken}</span>
              </div>
            </div>
            <div className="sw-field-row">
              <TokenPill symbol={toToken} meta={toT} onClick={() => setPickerFor("to")} />
              <div className="sw-amount-block">
                <input className="sw-amount-input" type="text" placeholder="0.00" value={quoting ? "…" : amountOut} readOnly />
                <span className="sw-usd-value">${usdOut}</span>
              </div>
            </div>
          </div>

          {isTwoHop && (
            <div className="sw-route-note">Routed through USDC — two on-chain swaps, one confirmation each.</div>
          )}

          <button className="sw-submit" disabled={submitDisabled} onClick={submitAction}>
            {submitLabel}
          </button>
        </div>

        {priceOf(fromToken) != null && (
          <div className="sw-float-chip">
            <TokenIcon symbol={fromToken} fallbackIcon={fromT.icon} color={fromT.color} size={20} />
            <span className="sw-float-sym">{fromToken}</span>
            <span className="sw-float-price">${priceOf(fromToken).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
          </div>
        )}
      </div>

      {pickerFor && (
        <div className="sw-modal-backdrop" onClick={() => setPickerFor(null)}>
          <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sw-modal-head">
              <span>Select a token</span>
              <span className="sw-modal-close" onClick={() => setPickerFor(null)}>✕</span>
            </div>
            {TOKEN_LIST.map((sym) => (
              <button key={sym} className="sw-modal-item" onClick={() => selectToken(sym)}>
                <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={28} />
                <span className="sw-modal-item-body">
                  <span className="sw-modal-item-sym">{sym}</span>
                  <span className="sw-modal-item-name">{TOKEN_META[sym].name}</span>
                </span>
                <span className="sw-modal-item-bal">{Number(balances[sym] || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenPill({ symbol, meta, onClick }) {
  return (
    <button className="sw-token-pill" onClick={onClick}>
      <TokenIcon symbol={symbol} fallbackIcon={meta.icon} color={meta.color} size={22} />
      {symbol}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="sw-chevron">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}
