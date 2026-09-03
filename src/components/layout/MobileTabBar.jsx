import { NavLink } from "react-router-dom";
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
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 18V6M10 18V10M16 18V4M22 18V14" />
    </svg>
  ),
  swap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  ),
};

/**
 * 4-item bar: Pitch, Menu, Live, Swap. Bet Slip moved to its own
 * floating circular button (FloatingBetSlip.jsx) instead of living
 * here — the Sporty Bet-style pattern, sitting above this bar so it
 * doesn't overlap.
 */
export function MobileTabBar({ onOpenMenu }) {
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
      <NavLink to="/football?live=1" className={({ isActive }) => `mtb-item ${isActive ? "active" : ""}`}>
        <span className="mtb-icon-wrap">
          {ICONS.live}
          <i className="mtb-live-dot" />
        </span>
        <span>Live</span>
      </NavLink>
      <NavLink to="/swap" className={({ isActive }) => `mtb-item ${isActive ? "active" : ""}`}>
        {ICONS.swap}
        <span>Swap</span>
      </NavLink>
    </nav>
  );
}
