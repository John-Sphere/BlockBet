import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import "./Navbar.css";

export default function Navbar() {
  const {
    connect,
    disconnect,
    connected,
    wrongNet,
    shortAddr,
    balance,
    txPending,
  } = useWallet();

  return (
    <header className="bb-navbar">
      <Link to="/" className="bb-navbar-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <polygon
            points="12,2 22,22 2,22"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1.5"
          />
        </svg>
        <div>
          <div className="bb-navbar-name">BLOCKBET</div>
          <div className="bb-navbar-tag">Virtual Football Sportsbook</div>
        </div>
      </Link>

      <nav className="bb-navbar-links">
        <NavLink to="/football" className="bb-navbar-link">
          Pitch
        </NavLink>
        <NavLink to="/history" className="bb-navbar-link">
          History
        </NavLink>
        <NavLink to="/leaderboard" className="bb-navbar-link">
          Table
        </NavLink>
      </nav>

      <div className="bb-navbar-wallet">
        {!connected ? (
          <button className="btn-gold" onClick={connect} disabled={txPending}>
            {txPending ? "Connecting…" : "Connect wallet"}
          </button>
        ) : wrongNet ? (
          <button className="btn-outline bb-wrong-net" onClick={connect}>
            Switch to Arc Testnet
          </button>
        ) : (
          <div className="bb-wallet-pill">
            <span className="bb-wallet-balance">
              {Number(balance ?? 0).toFixed(2)} USDC
            </span>
            <span className="bb-wallet-addr" onClick={disconnect} title="Disconnect">
              {shortAddr}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
