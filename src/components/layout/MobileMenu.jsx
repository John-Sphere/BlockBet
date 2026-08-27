import { Link, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useWallet } from "../../context/WalletContext";
import "./MobileMenu.css";

const OTHER_SPORTS = [
  { to: "/coming-soon/tennis",     label: "Tennis" },
  { to: "/coming-soon/darts",      label: "Darts" },
  { to: "/coming-soon/casino",     label: "Casino" },
];

// Slide-in drawer for small screens, replacing what the permanent
// sidebar does on desktop — desktop hides the sidebar entirely below
// 1080px, so this is the only way to reach Match History/Table/Admin
// on mobile.
export function MobileMenu() {
  const { sidebarOpen, toggleSidebar } = useApp();
  const { connected, address } = useWallet();
  const { pathname } = useLocation();

  const adminWallet = (import.meta.env.VITE_ADMIN_WALLET || "").toLowerCase();
  const isAdmin = connected && address && adminWallet && address.toLowerCase() === adminWallet;

  if (!sidebarOpen) return null;

  function close() { toggleSidebar(); }

  return (
    <>
      <div className="bb-mm-scrim" onClick={close} />
      <div className="bb-mm-drawer">
        <div className="bb-mm-head">
          <span className="bb-mm-title">Menu</span>
          <button className="bb-mm-close" onClick={close} aria-label="Close menu">✕</button>
        </div>

        <nav className="bb-mm-nav">
          <Link to="/" className={`bb-mm-item ${pathname === "/" ? "active" : ""}`} onClick={close}>Home</Link>
          <Link to="/football" className={`bb-mm-item ${pathname === "/football" ? "active" : ""}`} onClick={close}>Football</Link>
          <Link to="/basketball" className={`bb-mm-item ${pathname === "/basketball" ? "active" : ""}`} onClick={close}>Basketball</Link>

          <div className="bb-mm-divider" />
          <div className="bb-mm-label">Coming soon</div>
          {OTHER_SPORTS.map((s) => (
            <div key={s.to} className="bb-mm-item disabled">
              {s.label}
              <span className="bb-mm-soon">SOON</span>
            </div>
          ))}

          <div className="bb-mm-divider" />
          <Link to="/my-bets" className={`bb-mm-item ${pathname === "/my-bets" ? "active" : ""}`} onClick={close}>Open Bet</Link>
          <Link to="/history" className={`bb-mm-item ${pathname === "/history" ? "active" : ""}`} onClick={close}>Match History</Link>
          <Link to="/leaderboard" className={`bb-mm-item ${pathname === "/leaderboard" ? "active" : ""}`} onClick={close}>Table</Link>
          {isAdmin && (
            <Link to="/admin" className={`bb-mm-item ${pathname === "/admin" ? "active" : ""}`} onClick={close}>Admin Panel</Link>
          )}

          <div className="bb-mm-divider" />
          <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="bb-mm-item" onClick={close}>
            💧 Get USDC
          </a>
        </nav>

        <div className="bb-mm-footer">
          <div className="bb-mm-net">Arc Testnet · USDC Native</div>
        </div>
      </div>
    </>
  );
}
