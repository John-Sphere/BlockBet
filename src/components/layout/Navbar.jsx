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

  return (
    <header className={`bb-navbar${isHome ? " bb-navbar--home" : ""}`}>
      <div className="bb-navbar-left">
        {!isHome && (
          <button
            className="bb-navbar-menu"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span />
            <span />
            <span />
          </button>
        )}

        <Link to="/" className="bb-navbar-brand">
          <img src="/logo.png" alt="BLOCKBET" className="bb-navbar-logo" />
          <div className="bb-navbar-tag">BlockBet</div>
        </Link>
      </div>

      {!isHome && (
        <nav className="bb-navbar-links">
          <NavLink to="/football" className="bb-navbar-link">
            Pitch
          </NavLink>
          <NavLink to="/football?live=1" className="bb-navbar-link bb-navbar-live">
            Live
            {liveCount > 0 && <span className="bb-navbar-live-badge">LIVE</span>}
          </NavLink>
          <NavLink to="/football?hot=1" className="bb-navbar-link">
            Hot games
          </NavLink>
        </nav>
      )}

      {isHome && (
        <button
          className={`bb-theme-switch ${theme === "dark" ? "bb-theme-switch--dark" : ""}`}
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === "dark"}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          <span className="bb-theme-switch-label bb-theme-switch-label--left">Light</span>
          <span className="bb-theme-switch-label bb-theme-switch-label--right">Dark</span>
          <span className="bb-theme-switch-thumb" />
        </button>
      )}

      {!isHome && (
        <div className="bb-navbar-wallet">
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bb-faucet-link"
            title="Get free testnet USDC on Arc Testnet"
          >
            💧<span className="bb-faucet-text"> Get USDC</span>
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
              <span className="bb-wallet-balance">
                {Number(balance ?? 0).toFixed(2)} USDC
              </span>
              <span className="bb-wallet-addr" onClick={disconnect} title="Disconnect">
                {shortAddr}
              </span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
