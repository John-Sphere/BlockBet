import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import "./Sidebar.css";

const ICONS = {
  home: "M3 12l9-9 9 9M5 10v10h14V10",
  football: null, // uses circle+cross, built inline below
  basketball: null, // uses plain circle
  ticket: "M3 4h18v16H3z|M3 9h18", // handled specially below
  history: "M3 12a9 9 0 1 0 9-9M3 12h6M3 12l4-4",
  table: "M4 20V10M12 20V4M20 20v-7",
  admin: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
};

const OTHER_LINKS = [
  { to: "/my-bets",     label: "Open Bet" },
  { to: "/history",     label: "Match History" },
  { to: "/leaderboard", label: "Table" },
  { to: "/admin",       label: "Admin Panel", adminOnly: true },
];

const OTHER_SPORTS = [];

export function Sidebar() {
  const { pathname } = useLocation();
  const { connected, address, shortAddr, balance } = useWallet();

  const onFootball = pathname === "/football" || pathname === "/";

  const adminWallet = (import.meta.env.VITE_ADMIN_WALLET || "").toLowerCase();
  const isAdmin = connected && address && adminWallet && address.toLowerCase() === adminWallet;
  const otherLinks = OTHER_LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <aside className="bb-sidebar">
      {connected && (
        <div className="bb-wallet-card">
          <div className="bb-wc-lbl">My Wallet</div>
          <div className="bb-wc-addr">{shortAddr}</div>
          <div className="bb-wc-bal">{Number(balance ?? 0).toFixed(2)}<span>USDC</span></div>
          <svg className="bb-wallet-spark" viewBox="0 0 200 26">
            <path d="M0 18 L20 15 L40 19 L60 12 L80 16 L100 9 L120 14 L140 8 L160 11 L180 6 L200 9" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          </svg>
        </div>
      )}

      <nav className="bb-side-nav">
        <Link to="/" className={`bb-nav-item ${pathname === "/" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg>
            Home
          </span>
        </Link>

        <Link to="/football" className={`bb-nav-item ${onFootball ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
            Football
          </span>
        </Link>
        <Link to="/football" className={`bb-nav-item sub ${onFootball ? "active" : ""}`}>
          All matches
        </Link>

        <Link to="/basketball" className={`bb-nav-item ${pathname === "/basketball" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c4.8 4.8 4.8 12.8 0 17.6M18.4 5.6c-4.8 4.8-4.8 12.8 0 17.6"/></svg>
            Basketball
          </span>
        </Link>

        <Link to="/tennis" className={`bb-nav-item ${pathname === "/tennis" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M4 8c4-2 12-2 16 0M4 16c4 2 12 2 16 0"/></svg>
            Tennis
          </span>
        </Link>

        <Link to="/darts" className={`bb-nav-item ${pathname === "/darts" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
            Darts
          </span>
        </Link>

        <Link to="/casino" className={`bb-nav-item ${pathname === "/casino" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/></svg>
            Casino
          </span>
        </Link>

        {OTHER_SPORTS.map((s) => (
          <Link key={s.to} to={s.to} className="bb-nav-item disabled">
            <span className="bb-nl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
              {s.label}
            </span>
            <span className="bb-soon-tag">SOON</span>
          </Link>
        ))}

        <div className="bb-nav-divider" />

        <Link to="/my-bets" className={`bb-nav-item ${pathname === "/my-bets" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>
            Open Bet
          </span>
        </Link>
        <Link to="/history" className={`bb-nav-item ${pathname === "/history" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9M3 12h6M3 12l4-4"/></svg>
            Match History
          </span>
        </Link>
        <Link to="/leaderboard" className={`bb-nav-item ${pathname === "/leaderboard" ? "active" : ""}`}>
          <span className="bb-nl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
            Table
          </span>
        </Link>
        {isAdmin && (
          <Link to="/admin" className={`bb-nav-item ${pathname === "/admin" ? "active" : ""}`}>
            <span className="bb-nl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/></svg>
              Admin Panel
            </span>
          </Link>
        )}
      </nav>

      <div className="bb-sidebar-footer">
        <div className="bb-sf-v">BlockBet v2.0 — Phase 2</div>
        <div className="bb-sf-net"><span className="bb-sf-dot" />Arc Testnet · USDC Native</div>
      </div>
    </aside>
  );
}
