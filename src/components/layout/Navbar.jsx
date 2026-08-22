import { Link, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useWallet } from "../../context/WalletContext";
import { useApp } from "../../context/AppContext";
import { subscribe, initMatchManager } from "../../engine/matchManager";
import "./Navbar.css";

export function Navbar() {
  const {
    connect,
    disconnect,
    connected,
    connecting,
    wrongNet,
    shortAddr,
    balance,
    txPending,
    ensureArcNetwork,
  } = useWallet();
  const { toggleSidebar, addToast, theme, toggleTheme } = useApp();
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [liveCount, setLiveCount] = useState(0);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe((matches) => {
      const count = matches.filter(
        (m) => m.status === "first_half" || m.status === "second_half" || m.status === "halftime"
      ).length;
      setLiveCount(count);
    });
    return unsub;
  }, []);

  async function handleSwitchNetwork() {
    setSwitching(true);
    try {
      const ok = await ensureArcNetwork();
      if (!ok) {
        addToast("Couldn't switch network. Check your wallet for a pending request, or switch manually.", "error");
      }
    } catch (e) {
      addToast(e?.message || "Network switch failed.", "error");
    } finally {
      setSwitching(false);
    }
  }

  // ── HOME PAGE — simple topbar ─────────────────────────────
  if (isHome) {
    return (
      <header className="bb-topbar bb-topbar--home">
        <Link to="/" className="bb-brand">
          <span className="bb-brand-mark"><img src="/logo.png" alt="" onError={(e) => { e.target.style.display = "none"; e.target.parentNode.textContent = "B"; }} /></span>BlockBet
        </Link>
        <nav className="bb-top-links">
          <NavLink to="/football">Pitch</NavLink>
          <NavLink to="/football?live=1">Live</NavLink>
          <NavLink to="/football?hot=1">Hot games</NavLink>
          <a href="https://blockbet.mintlify.app" target="_blank" rel="noopener noreferrer">Docs</a>
        </nav>
        <div className="bb-spacer" />
        <Link to="/football" className="bb-btn-ghost">Connect wallet</Link>
        <button
          className={`bb-theme-switch ${theme === "dark" ? "bb-theme-switch--dark" : ""}`}
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === "dark"}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          <span className="bb-theme-switch-label bb-theme-switch-label--left">Light</span>
          <span className="bb-theme-switch-label bb-theme-switch-label--right">Dark</span>
          <span className="bb-theme-switch-thumb" />
        </button>
      </header>
    );
  }

  // ── APP PAGES — full topbar ────────────────────────────────
  return (
    <header className="bb-topbar">
      <Link to="/" className="bb-brand">
        <span className="bb-brand-mark"><img src="/logo.png" alt="" onError={(e) => { e.target.style.display = "none"; e.target.parentNode.textContent = "B"; }} /></span>BlockBet
      </Link>

      <nav className="bb-top-nav">
        <NavLink to="/football" className={({ isActive }) => isActive ? "active" : ""}>Pitch</NavLink>
        <NavLink to="/football?live=1" className="bb-top-nav-live">
          Live
          {liveCount > 0 && <span className="bb-live-badge">LIVE</span>}
        </NavLink>
        <NavLink to="/football?hot=1">Hot games</NavLink>
      </nav>

      <div className="bb-top-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Search matches, clubs…
      </div>

      <div className="bb-spacer" />

      <a
        href="https://faucet.circle.com"
        target="_blank"
        rel="noopener noreferrer"
        className="bb-btn-usdc"
        title="Get free testnet USDC on Arc Testnet"
      >
        💧 <span className="bb-usdc-text">Get USDC</span>
      </a>

      {!connected ? (
        <button className="btn-gold" onClick={connect} disabled={txPending || connecting}>
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
      ) : wrongNet ? (
        <button className="btn-outline bb-wrong-net" onClick={handleSwitchNetwork} disabled={switching}>
          {switching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      ) : (
        <div className="bb-wallet-pill">
          <span className="bb-wallet-balance">{Number(balance ?? 0).toFixed(2)} USDC</span>
          <span className="bb-wallet-addr" onClick={disconnect} title="Disconnect">
            <span className="bb-wallet-dot" />
            {shortAddr}
          </span>
        </div>
      )}
    </header>
  );
}
