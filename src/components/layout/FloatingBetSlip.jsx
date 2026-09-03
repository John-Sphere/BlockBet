import { useBetSlip } from "../../context/BetSlipContext";
import "./FloatingBetSlip.css";

// A round floating action button for the bet slip, mobile only —
// the Sporty Bet pattern. Sits above the 4-item bottom tab bar so
// nothing overlaps, and only actually shows once there's at least
// one selection (no point floating an empty slip button).
export function FloatingBetSlip() {
  const { selections, setOpen } = useBetSlip();
  if (selections.length === 0) return null;

  return (
    <button className="fbs-btn" onClick={() => setOpen(true)} aria-label="Open bet slip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </svg>
      <span className="fbs-badge">{selections.length}</span>
    </button>
  );
}
