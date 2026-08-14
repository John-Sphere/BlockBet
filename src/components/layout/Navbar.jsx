import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { useApp } from "../../context/AppContext";
import "./Navbar.css";

export function Navbar() {
  const {
    connect,
    disconnect,
    connected,
    wrongNet,
    shortAddr,
    balance,
    txPending,
  } = useWallet();
  const { toggleSidebar } = useApp();

  return (
    <header className="bb-navbar">
      <div className="bb-navbar-left">
        <button
          className="bb-navbar-menu"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <span />
          <span />
          <span />
        </button>

        <Link to="/" className="bb-navbar-brand">
          <img src="/logo.png" alt="BLOCKBET" className="bb-navbar-logo" />
          <div className="bb-navbar-tag">Virtual Football Sportsbook</div>
        </Link>
      </div>

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
