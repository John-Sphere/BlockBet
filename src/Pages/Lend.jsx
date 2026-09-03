import { useState, useEffect, useCallback } from "react";
import { useLend } from "../hooks/useLend";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import { TokenIcon } from "../components/ui/TokenIcon";
import "./Lend.css";

const TOKEN_META = {
  USDC:   { icon: "$", color: "#4C86FF" },
  EURC:   { icon: "€", color: "#7DA6FF" },
  cirBTC: { icon: "₿", color: "#F0A83E" },
  BLOCK:  { icon: "B", color: "#E8B23D" },
};
const ALL_ASSETS = Object.keys(TOKEN_META);

export default function Lend() {
  const {
    getLenderInfo, depositAsset, withdrawAsset,
    getBorrowerInfo, getMaxBorrowable, postCollateral, borrowAsset, repayAsset, withdrawCollateral,
    liquidatePosition, getTokenBalance, busy,
  } = useLend();
  const { connected, connect, address } = useWallet();
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState("lend");
  const [lendAsset, setLendAsset] = useState("USDC");
  const [lenderInfo, setLenderInfo] = useState(null);
  const [borrowerInfo, setBorrowerInfo] = useState(null);
  const [balances, setBalances] = useState({});

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [collateralToken, setCollateralToken] = useState("BLOCK");
  const [collateralAmt, setCollateralAmt] = useState("");
  const [borrowAssetChoice, setBorrowAssetChoice] = useState("USDC");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [borrowMax, setBorrowMax] = useState("0");
  const [repayAmt, setRepayAmt] = useState("");

  const [liquidateTarget, setLiquidateTarget] = useState("");
  const [liquidateAsset, setLiquidateAsset] = useState("USDC");
  const [liquidateAmt, setLiquidateAmt] = useState("");

  const refreshLend = useCallback(async () => {
    if (!address) return;
    const [lender, bal] = await Promise.all([
      getLenderInfo(lendAsset, address),
      getTokenBalance(lendAsset, address),
    ]);
    setLenderInfo(lender);
    setBalances((b) => ({ ...b, [lendAsset]: bal }));
  }, [address, lendAsset, getLenderInfo, getTokenBalance]);

  const refreshBorrow = useCallback(async () => {
    if (!address) return;
    const [borrower, collBal] = await Promise.all([
      getBorrowerInfo(address),
      getTokenBalance(collateralToken, address),
    ]);
    setBorrowerInfo(borrower);
    setBalances((b) => ({ ...b, [collateralToken]: collBal }));

    const effectiveBorrowAsset = borrower?.borrowedAsset || borrowAssetChoice;
    const max = await getMaxBorrowable(address, effectiveBorrowAsset);
    setBorrowMax(max);
  }, [address, collateralToken, borrowAssetChoice, getBorrowerInfo, getTokenBalance, getMaxBorrowable]);

  useEffect(() => { if (activeTab === "lend") refreshLend(); }, [activeTab, refreshLend]);
  useEffect(() => { if (activeTab === "borrow") refreshBorrow(); }, [activeTab, refreshBorrow]);

  async function handleDeposit() {
    if (!connected) { await connect(); return; }
    try {
      await depositAsset(lendAsset, depositAmt);
      addToast(`Deposited ${depositAmt} ${lendAsset}.`, "success");
      setDepositAmt("");
      refreshLend();
    } catch (e) { addToast(e?.message || "Deposit failed.", "error"); }
  }

  async function handleWithdraw() {
    try {
      await withdrawAsset(lendAsset, withdrawAmt);
      addToast("Withdrawal complete.", "success");
      setWithdrawAmt("");
      refreshLend();
    } catch (e) { addToast(e?.message || "Withdraw failed.", "error"); }
  }

  async function handlePostCollateral() {
    if (!connected) { await connect(); return; }
    try {
      await postCollateral(collateralToken, collateralAmt);
      addToast(`Posted ${collateralAmt} ${collateralToken} as collateral.`, "success");
      setCollateralAmt("");
      refreshBorrow();
    } catch (e) { addToast(e?.message || "Posting collateral failed.", "error"); }
  }

  async function handleBorrow() {
    try {
      await borrowAsset(borrowAssetChoice, borrowAmt);
      addToast(`Borrowed ${borrowAmt} ${borrowAssetChoice}.`, "success");
      setBorrowAmt("");
      refreshBorrow();
    } catch (e) { addToast(e?.message || "Borrow failed.", "error"); }
  }

  async function handleRepay() {
    if (!borrowerInfo?.borrowedAsset) return;
    try {
      await repayAsset(borrowerInfo.borrowedAsset, repayAmt);
      addToast(`Repaid ${repayAmt} ${borrowerInfo.borrowedAsset}.`, "success");
      setRepayAmt("");
      refreshBorrow();
    } catch (e) { addToast(e?.message || "Repay failed.", "error"); }
  }

  async function handleLiquidate() {
    if (!connected) { await connect(); return; }
    if (!liquidateTarget || !liquidateAmt) { addToast("Enter both an address and an amount.", "error"); return; }
    try {
      await liquidatePosition(liquidateTarget, liquidateAsset, liquidateAmt);
      addToast("Liquidation successful — bonus collateral received.", "success");
      setLiquidateAmt("");
    } catch (e) { addToast(e?.message || "Liquidation failed — position may be healthy or already resolved.", "error"); }
  }

  const lockedToBorrowedAsset = borrowerInfo?.borrowedAsset && Number(borrowerInfo.borrowedAmount) > 0;

  return (
    <div className="ln-page">
      <div className="ln-header">
        <h1>Lend & Borrow</h1>
        <p>All four assets — USDC, EURC, cirBTC, BLOCK — can be deposited to earn interest, or borrowed against collateral in a different one.</p>
      </div>

      <div className="ln-tabs">
        <button className={`ln-tab ${activeTab === "lend" ? "active" : ""}`} onClick={() => setActiveTab("lend")}>Lend</button>
        <button className={`ln-tab ${activeTab === "borrow" ? "active" : ""}`} onClick={() => setActiveTab("borrow")}>Borrow</button>
        <button className={`ln-tab ${activeTab === "liquidate" ? "active" : ""}`} onClick={() => setActiveTab("liquidate")}>Liquidate</button>
      </div>

      {activeTab === "lend" && (
        <div className="ln-card">
          <div className="ln-asset-select">
            {ALL_ASSETS.map((sym) => (
              <button key={sym} className={`ln-asset-btn ${lendAsset === sym ? "active" : ""}`} onClick={() => setLendAsset(sym)}>
                <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={16} />
                {sym}
              </button>
            ))}
          </div>

          <div className="ln-stat-row">
            <div className="ln-stat"><span>Your deposit balance</span><span>{lenderInfo ? Number(lenderInfo.balance).toFixed(6) : "0"} {lendAsset}</span></div>
            <div className="ln-stat"><span>Wallet balance</span><span>{Number(balances[lendAsset] || 0).toFixed(6)} {lendAsset}</span></div>
          </div>

          <div className="ln-section-label">Deposit</div>
          <div className="ln-input-row">
            <input type="number" placeholder={`${lendAsset} amount`} value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
            <button onClick={handleDeposit} disabled={busy}>{!connected ? "Connect" : busy ? "…" : "Deposit"}</button>
          </div>

          <div className="ln-section-label">Withdraw</div>
          <div className="ln-input-row">
            <input type="number" placeholder={`${lendAsset} amount`} value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} />
            <button onClick={handleWithdraw} disabled={busy}>{busy ? "…" : "Withdraw"}</button>
          </div>
        </div>
      )}

      {activeTab === "borrow" && (
        <div className="ln-card">
          {borrowerInfo && Number(borrowerInfo.collateralAmount) > 0 && (
            <div className="ln-stat-row">
              <div className="ln-stat"><span>Collateral posted</span><span>{Number(borrowerInfo.collateralAmount).toFixed(6)} {borrowerInfo.collateralToken}</span></div>
              <div className="ln-stat"><span>Borrowed asset</span><span>{borrowerInfo.borrowedAsset || "None yet"}</span></div>
              <div className="ln-stat"><span>Current debt</span><span>{Number(borrowerInfo.borrowedAmount).toFixed(6)} {borrowerInfo.borrowedAsset || ""}</span></div>
              {borrowerInfo.liquidatable && <div className="ln-danger-banner">⚠ Your position is currently liquidatable</div>}
            </div>
          )}

          <div className="ln-section-label">Post collateral</div>
          <div className="ln-collateral-select">
            {ALL_ASSETS.map((sym) => (
              <button key={sym} className={`ln-coll-btn ${collateralToken === sym ? "active" : ""}`} onClick={() => setCollateralToken(sym)}>
                <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={16} />
                {sym}
              </button>
            ))}
          </div>
          <div className="ln-input-row">
            <input type="number" placeholder={`${collateralToken} amount`} value={collateralAmt} onChange={(e) => setCollateralAmt(e.target.value)} />
            <button onClick={handlePostCollateral} disabled={busy}>{!connected ? "Connect" : busy ? "…" : "Post"}</button>
          </div>

          <div className="ln-section-label">Borrow</div>
          {lockedToBorrowedAsset ? (
            <div className="ln-locked-note">Currently borrowing {borrowerInfo.borrowedAsset} — repay in full before switching to a different asset.</div>
          ) : (
            <div className="ln-collateral-select">
              {ALL_ASSETS.map((sym) => (
                <button key={sym} className={`ln-coll-btn ${borrowAssetChoice === sym ? "active" : ""}`} onClick={() => setBorrowAssetChoice(sym)}>
                  <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={16} />
                  {sym}
                </button>
              ))}
            </div>
          )}
          <div className="ln-section-label" style={{ marginTop: 4, textTransform: "none", fontWeight: 400 }}>
            Available to borrow: {Number(borrowMax).toFixed(6)} {borrowerInfo?.borrowedAsset || borrowAssetChoice}
          </div>
          <div className="ln-input-row">
            <input type="number" placeholder="Amount" value={borrowAmt} onChange={(e) => setBorrowAmt(e.target.value)} />
            <button onClick={handleBorrow} disabled={busy}>{busy ? "…" : "Borrow"}</button>
          </div>

          <div className="ln-section-label">Repay</div>
          <div className="ln-input-row">
            <input type="number" placeholder={borrowerInfo?.borrowedAsset ? `${borrowerInfo.borrowedAsset} amount` : "Amount"} value={repayAmt} onChange={(e) => setRepayAmt(e.target.value)} />
            <button onClick={handleRepay} disabled={busy || !borrowerInfo?.borrowedAsset}>{busy ? "…" : "Repay"}</button>
          </div>
        </div>
      )}

      {activeTab === "liquidate" && (
        <div className="ln-card">
          <p className="ln-liquidate-note">
            Anyone can liquidate a position once its debt exceeds 75% of its collateral value.
            You repay part or all of their debt (in whichever asset they actually borrowed) and receive their collateral back plus an 8% bonus.
          </p>
          <div className="ln-section-label">Borrower address</div>
          <input className="ln-full-input" type="text" placeholder="0x..." value={liquidateTarget} onChange={(e) => setLiquidateTarget(e.target.value)} />

          <div className="ln-section-label" style={{ marginTop: 12 }}>Asset they borrowed</div>
          <div className="ln-collateral-select">
            {ALL_ASSETS.map((sym) => (
              <button key={sym} className={`ln-coll-btn ${liquidateAsset === sym ? "active" : ""}`} onClick={() => setLiquidateAsset(sym)}>
                <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={16} />
                {sym}
              </button>
            ))}
          </div>

          <div className="ln-section-label" style={{ marginTop: 12 }}>Amount to repay</div>
          <div className="ln-input-row">
            <input type="number" placeholder="Amount" value={liquidateAmt} onChange={(e) => setLiquidateAmt(e.target.value)} />
            <button onClick={handleLiquidate} disabled={busy}>{!connected ? "Connect" : busy ? "…" : "Liquidate"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
