import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useBetSlip } from "../../context/BetSlipContext";
import { subscribe, initMatchManager } from "../../engine/matchManager";
import "./MobileTabBar.css";

// SportyBet-style fixed bottom tab bar, but mobile-only — the desktop
// sidebar/navbar layout is untouched and stays exactly as it was.
export function MobileTabBar() {
  const { toggleSidebar } = useApp();
  const { selections, setOpen: openSlip } = useBetSlip();
  const { pathname } = useLocation();
  const [liveCount, setLiveCount] = useState(0);

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

  // Landing page should feel clean, no app chrome before someone
  // actually enters the product.
  if (pathname === "/") return null;

  return (
    <nav className="bb-tabbar">
      <NavLink to="/football" className="bb-tabbar-item" end>
        <span>Pitch</span>
      </NavLink>

      <button className="bb-tabbar-item" onClick={toggleSidebar}>
        <span>Menu</span>
      </button>

      <NavLink to="/football?live=1" className="bb-tabbar-item bb-tabbar-center">
        <span className="bb-tabbar-center-icon">
          {liveCount > 0 && <span className="bb-tabbar-dot" />}
        </span>
        <span>Live</span>
      </NavLink>

      <button
        className="bb-tabbar-item"
        onClick={() => openSlip(true)}
      >
        <span className="bb-tabbar-icon">
          {selections.length > 0 && (
            <span className="bb-tabbar-badge">{selections.length}</span>
          )}
        </span>
        <span>Bet slip</span>
      </button>

      <NavLink to="/my-bets" className="bb-tabbar-item">
        <span>Me</span>
      </NavLink>
    </nav>
  );
}
