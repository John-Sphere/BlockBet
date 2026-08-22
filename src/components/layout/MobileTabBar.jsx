import { NavLink } from "react-router-dom";
import { useBetSlip } from "../../context/BetSlipContext";
import "./MobileTabBar.css";

const ICONS = {
  pitch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  slip: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 18V6M10 18V10M16 18V4M22 18V14" />
    </svg>
  ),
  openBet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 4v16" />
    </svg>
  ),
};

/**
 * 5-item bar, Bet Slip back in the middle position (not floating):
 * Pitch, Menu, Bet Slip, Live, Open Bet.
 */
export function MobileTabBar({ onOpenMenu }) {
  const { selections, setOpen } = useBetSlip();
  return (
    <nav className="mtb">
      <NavLink to="/football" className={({ isActive }) => `mtb-item ${isActive ? "active" : ""}`}>
        {ICONS.pitch}
        <span>Pitch</span>
      </NavLink>
      <button className="mtb-item" onClick={onOpenMenu}>
        {ICONS.menu}
        <span>Menu</span>
      </button>
      <button className="mtb-item" onClick={() => setOpen(true)}>
        <span className="mtb-icon-wrap">
          {ICONS.slip}
          {selections.length > 0 && <span className="mtb-badge">{selections.length}</span>}
        </span>
        <span>Bet Slip</span>
      </button>
      <NavLink to="/football?live=1" className={({ isActive }) => `mtb-item ${isActive ? "active" : ""}`}>
        <span className="mtb-icon-wrap">
          {ICONS.live}
          <i className="mtb-live-dot" />
        </span>
        <span>Live</span>
      </NavLink>
      <NavLink to="/my-bets" className={({ isActive }) => `mtb-item ${isActive ? "active" : ""}`}>
        {ICONS.openBet}
        <span>Open Bet</span>
      </NavLink>
    </nav>
  );
}
