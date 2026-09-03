import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSwap } from "../hooks/useSwap";
import { useLend } from "../hooks/useLend";
import { useWallet } from "../context/WalletContext";
import { TokenIcon } from "../components/ui/TokenIcon";
import "./Portfolio.css";

const TOKEN_META = {
  USDC:   { icon: "$", color: "#4C86FF" },
  EURC:   { icon: "€", color: "#7DA6FF" },
  cirBTC: { icon: "₿", color: "#F0A83E" },
  BLOCK:  { icon: "B", color: "#E8B23D" },
};
const ALL_ASSETS = Object.keys(TOKEN_META);
const POOL_ASSETS = ["EURC", "cirBTC", "BLOCK"]; // USDC-paired pools only

// A single view pulling together everything spread across Swap's
// Pool tab and Lend's tabs — real data from both hooks, no new
// contract calls, just genuinely gathered in one place.
export default function Portfolio() {
  const { connected, connect, address } = useWallet();
  const { getBalance, getMyLp } = useSwap();
  const { getLenderInfo, getBorrowerInfo } = useLend();

  const [loading, setLoading] = useState(true);
  const [walletBalances, setWalletBalances] = useState({});
  const [lpPositions, setLpPositions] = useState({});
  const [lendPositions, setLendPositions] = useState({});
  const [borrowPosition, setBorrowPosition] = useState(null);

  const refresh = useCallback(async () => {
    if (!address) { setLoading(false); return; }
    setLoading(true);

    const [balances, lpEntries, lendEntries, borrower] = await Promise.all([
      Promise.all(ALL_ASSETS.map(async (sym) => [sym, await getBalance(sym, address)])),
      Promise.all(POOL_ASSETS.map(async (sym) => [sym, await getMyLp(sym, address)])),
      Promise.all(ALL_ASSETS.map(async (sym) => [sym, await getLenderInfo(sym, address)])),
      getBorrowerInfo(address),
    ]);

    setWalletBalances(Object.fromEntries(balances));
    setLpPositions(Object.fromEntries(lpEntries));
    setLendPositions(Object.fromEntries(lendEntries));
    setBorrowPosition(borrower);
    setLoading(false);
  }, [address, getBalance, getMyLp, getLenderInfo, getBorrowerInfo]);

  useEffect(() => { refresh(); }, [refresh]);

  const hasAnyLp = POOL_ASSETS.some((sym) => Number(lpPositions[sym]?.lpBalance || 0) > 0);
  const hasAnyLend = ALL_ASSETS.some((sym) => Number(lendPositions[sym]?.balance || 0) > 0);
  const hasBorrow = borrowPosition && Number(borrowPosition.collateralAmount) > 0;

  if (!connected) {
    return (
      <div className="pf-page">
        <div className="pf-connect">
          <h1>Portfolio</h1>
          <p>Connect your wallet to see everything in one place — balances, liquidity positions, and lending activity.</p>
          <button className="pf-connect-btn" onClick={connect}>Connect wallet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page">
      <div className="pf-header">
        <h1>Portfolio</h1>
        <p>Everything across Swap and Lend, gathered in one place.</p>
      </div>

      {loading ? (
        <div className="pf-loading">Loading your positions…</div>
      ) : (
        <>
          <section className="pf-section">
            <div className="pf-section-label">Wallet balances</div>
            <div className="pf-balance-grid">
              {ALL_ASSETS.map((sym) => (
                <div className="pf-balance-card" key={sym}>
                  <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={22} />
                  <div className="pf-balance-amount">{Number(walletBalances[sym] || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div className="pf-balance-sym">{sym}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="pf-section">
            <div className="pf-section-label">Liquidity positions</div>
            {hasAnyLp ? (
              <div className="pf-list">
                {POOL_ASSETS.filter((sym) => Number(lpPositions[sym]?.lpBalance || 0) > 0).map((sym) => (
                  <div className="pf-list-item" key={sym}>
                    <div className="pf-list-left">
                      <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={20} />
                      <span>USDC/{sym} pool</span>
                    </div>
                    <div className="pf-list-right">
                      {Number(lpPositions[sym].usdcShare).toFixed(4)} USDC + {Number(lpPositions[sym].tokenShare).toFixed(6)} {sym}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pf-empty">No liquidity positions yet. <Link to="/swap">Add some on the Swap page →</Link></div>
            )}
          </section>

          <section className="pf-section">
            <div className="pf-section-label">Lending deposits</div>
            {hasAnyLend ? (
              <div className="pf-list">
                {ALL_ASSETS.filter((sym) => Number(lendPositions[sym]?.balance || 0) > 0).map((sym) => (
                  <div className="pf-list-item" key={sym}>
                    <div className="pf-list-left">
                      <TokenIcon symbol={sym} fallbackIcon={TOKEN_META[sym].icon} color={TOKEN_META[sym].color} size={20} />
                      <span>{sym} deposited</span>
                    </div>
                    <div className="pf-list-right">{Number(lendPositions[sym].balance).toFixed(6)} {sym}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pf-empty">No active lending deposits. <Link to="/lend">Deposit on the Lend page →</Link></div>
            )}
          </section>

          <section className="pf-section">
            <div className="pf-section-label">Borrow position</div>
            {hasBorrow ? (
              <div className="pf-borrow-card">
                <div className="pf-list-item">
                  <div className="pf-list-left">
                    <TokenIcon symbol={borrowPosition.collateralToken} fallbackIcon={TOKEN_META[borrowPosition.collateralToken]?.icon} color={TOKEN_META[borrowPosition.collateralToken]?.color} size={20} />
                    <span>Collateral</span>
                  </div>
                  <div className="pf-list-right">{Number(borrowPosition.collateralAmount).toFixed(6)} {borrowPosition.collateralToken}</div>
                </div>
                {borrowPosition.borrowedAsset && Number(borrowPosition.borrowedAmount) > 0 && (
                  <div className="pf-list-item">
                    <div className="pf-list-left">
                      <TokenIcon symbol={borrowPosition.borrowedAsset} fallbackIcon={TOKEN_META[borrowPosition.borrowedAsset]?.icon} color={TOKEN_META[borrowPosition.borrowedAsset]?.color} size={20} />
                      <span>Borrowed</span>
                    </div>
                    <div className="pf-list-right">{Number(borrowPosition.borrowedAmount).toFixed(6)} {borrowPosition.borrowedAsset}</div>
                  </div>
                )}
                {borrowPosition.liquidatable && (
                  <div className="pf-danger-banner">⚠ This position is currently liquidatable</div>
                )}
              </div>
            ) : (
              <div className="pf-empty">No active borrow position. <Link to="/lend">Post collateral on the Lend page →</Link></div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
