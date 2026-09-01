import { useState, useEffect, useCallback } from "react";
import { useLend } from "../hooks/useLend";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import { TokenIcon } from "../components/ui/TokenIcon";
import "./Lend.css";

const COLLATERAL_META = {
  EURC:   { icon: "€", color: "#7DA6FF" },
  cirBTC: { icon: "₿", color: "#F0A83E" },
  BLOCK:  { icon: "B", color: "#E8B23D" },
};

export default function Lend() {
  const {
    getLenderInfo, depositUsdc, withdrawUsdc,
    getBorrowerInfo, postCollateral, borrowUsdc, repayUsdc, withdrawCollateral,
    liquidatePosition, getTokenBalance, busy,
  } = useLend();
  const { connected, connect, address } = useWallet();
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState("lend");
  const [lenderInfo, setLenderInfo] = useState(null);
  const [borrowerInfo, setBorrowerInfo] = useState(null);
  const [balances, setBalances] = useState({});

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [collateralToken, setCollateralToken] = useState("BLOCK");
  const [collateralAmt, setCollateralAmt] = useState("");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");

  const [liquidateTarget, setLiquidateTarget] = useState("");
  const [liquidateAmt, setLiquidateAmt] = useState("");

  const refresh = useCallback(async () => {
    if (!address) return;
    const [lender, borrower, usdcBal, collBal] = await Promise.all([
      getLenderInfo(address),
      getBorrowerInfo(address),
      getTokenBalance("USDC", address),
      getTokenBalance(collateralToken, address),
    ]);
    setLenderInfo(lender);
    setBorrowerInfo(borrower);
    setBalances({ USDC: usdcBal, [collateralToken]: collBal });
  }, [address, collateralToken, getLenderInfo, getBorrowerInfo, getTokenBalance]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleDeposit() {
    if (!connected) { await connect(); return; }
    try {
      await depositUsdc(depositAmt);
      addToast(`Deposited ${depositAmt} USDC.`, "success");
      setDepositAmt("");
      refresh();
    } catch (e) { addToast(e?.message || "Deposit failed.", "error"); }
  }

  async function handleWithdraw() {
    try {
      await withdrawUsdc(withdrawAmt);
      addToast("Withdrawal complete.", "success");
      setWithdrawAmt("");
      refresh();
    } catch (e) { addToast(e?.message || "Withdraw failed.", "error"); }
  }

  async function handlePostCollateral() {
    if (!connected) { await connect(); return; }
    try {
      await postCollateral(collateralToken, collateralAmt);
      addToast(`Posted ${collateralAmt} ${collateralToken} as collateral.`, "success");
      setCollateralAmt("");
      refresh();
    } catch (e) { addToast(e?.message || "Posting collateral failed.", "error"); }
  }

  async function handleBorrow() {
    try {
      await borrowUsdc(borrowAmt);
      addToast(`Borrowed ${borrowAmt} USDC.`, "success");
      setBorrowAmt("");
      refresh();
    } catch (e) { addToast(e?.message || "Borrow failed.", "error"); }
  }

  async function handleRepay() {
    try {
      await repayUsdc(repayAmt);
      addToast(`Repaid ${repayAmt} USDC.`, "success");
      setRepayAmt("");
      refresh();
    } catch (e) { addToast(e?.message || "Repay failed.", "error"); }
  }

  async function handleLiquidate() {
    if (!connected) { await connect(); return; }
    if (!liquidateTarget || !liquidateAmt) { addToast("Enter both an address and an amount.", "error"); return; }
    try {
      await liquidatePosition(liquidateTarget, liquidateAmt);
      addToast("Liquidation successful — bonus collateral received.", "success");
      setLiquidateAmt("");
    } catch (e) { addToast(e?.message || "Liquidation failed — position may be healthy or already resolved.", "error"); }
  }

  return (
    <div className="ln-page">
      <div className="ln-header">
        <h1>Lend & Borrow</h1>
        <p>Deposit USDC to earn interest, or post collateral to borrow against it. 8% APR, 66% max LTV.</p>
      </div>

      <div className="ln-tabs">
        <button className={`ln-tab ${activeTab === "lend" ? "active" : ""}`} onClick={() => setActiveTab("lend")}>Lend</button>
        <button className={`ln-tab ${activeTab === "borrow" ? "active" : ""}`} onClick={() => setActiveTab("borrow")}>Borrow</button>
        <button className={`ln-tab ${activeTab === "liquidate" ? "active" : ""}`} onClick={() => setActiveTab("liquidate")}>Liquidate</button>
      </div>

      {activeTab === "lend" && (
        <div className="ln-card">
          <div className="ln-stat-row">
            <div className="ln-stat"><span>Your deposit balance</span><span>{lenderInfo ? Number(lenderInfo.balance).toFixed(4) : "0"} USDC</span></div>
            <div className="ln-stat"><span>Wallet balance</span><span>{Number(balances.USDC || 0).toFixed(4)} USDC</span></div>
          </div>

          <div className="ln-section-label">Deposit</div>
          <div className="ln-input-row">
            <input type="number" placeholder="USDC amount" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
            <button onClick={handleDeposit} disabled={busy}>{!connected ? "Connect" : busy ? "…" : "Deposit"}</button>
          </div>

          <div className="ln-section-label">Withdraw (in shares)</div>
          <div className="ln-input-row">
            <input type="number" placeholder="Share amount" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
            <button onClick={handleWithdraw} disabled={busy}>{busy ? "…" : "Withdraw"}</button>
          </div>
        </div>
      )}

      {activeTab === "borrow" && (
        <div className="ln-card">
          {borrowerInfo && (
            <div className="ln-stat-row">
              <div className="ln-stat"><span>Collateral posted</span><span>{Number(borrowerInfo.collateralAmount).toFixed(6)} {borrowerInfo.collateralToken || "—"}</span></div>
              <div className="ln-stat"><span>Current debt</span><span>{Number(borrowerInfo.borrowedAmount).toFixed(4)} USDC</span></div>
              <div className="ln-stat"><span>Available to borrow</span><span>{Number(borrowerInfo.availableToBorrow).toFixed(4)} USDC</span></div>
              {borrowerInfo.liquidatable && <div className="ln-danger-banner">⚠ Your position is currently liquidatable</div>}
            </div>
          )}

          <div className="ln-section-label">Post collateral</div>
          <div className="ln-collateral-select">
            {Object.keys(COLLATERAL_META).map((sym) => (
              <button key={sym} className={`ln-coll-btn ${collateralToken === sym ? "active" : ""}`} onClick={() => setCollateralToken(sym)}>
                <TokenIcon symbol={sym} fallbackIcon={COLLATERAL_META[sym].icon} color={COLLATERAL_META[sym].color} size={16} />
                {sym}
              </button>
            ))}
          </div>
          <div className="ln-input-row">
            <input type="number" placeholder={`${collateralToken} amount`} value={collateralAmt} onChange={(e) => setCollateralAmt(e.target.value)} />
            <button onClick={handlePostCollateral} disabled={busy}>{!connected ? "Connect" : busy ? "…" : "Post"}</button>
          </div>

          <div className="ln-section-label">Borrow USDC</div>
          <div className="ln-input-row">
            <input type="number" placeholder="USDC amount" value={borrowAmt} onChange={(e) => setBorrowAmt(e.target.value)} />
            <button onClick={handleBorrow} disabled={busy}>{busy ? "…" : "Borrow"}</button>
          </div>

          <div className="ln-section-label">Repay</div>
          <div className="ln-input-row">
            <input type="number" placeholder="USDC amount" value={repayAmt} onChange={(e) => setRepayAmt(e.target.value)} />
            <button onClick={handleRepay} disabled={busy}>{busy ? "…" : "Repay"}</button>
          </div>
        </div>
      )}

      {activeTab === "liquidate" && (
        <div className="ln-card">
          <p className="ln-liquidate-note">
            Anyone can liquidate a position once its debt exceeds 75% of its collateral value.
            You repay part or all of their debt and receive their collateral back plus an 8% bonus.
          </p>
          <div className="ln-section-label">Borrower address</div>
          <input className="ln-full-input" type="text" placeholder="0x..." value={liquidateTarget} onChange={(e) => setLiquidateTarget(e.target.value)} />
          <div className="ln-section-label" style={{ marginTop: 12 }}>Amount to repay (USDC)</div>
          <div className="ln-input-row">
            <input type="number" placeholder="USDC amount" value={liquidateAmt} onChange={(e) => setLiquidateAmt(e.target.value)} />
            <button onClick={handleLiquidate} disabled={busy}>{!connected ? "Connect" : busy ? "…" : "Liquidate"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
