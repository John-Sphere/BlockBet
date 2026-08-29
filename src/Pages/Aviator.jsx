import { useState, useEffect, useRef, useCallback } from "react";
import { multiplierAtTime } from "../engine/aviatorEngine";
import { useBetting } from "../hooks/useBetting";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import "./Aviator.css";

// Game states: "idle" (no bet yet) -> "flying" (bet placed, multiplier
// climbing) -> "crashed" | "cashed_out" (round over, brief pause) -> "idle"
export default function Aviator() {
  const { connected, connect, balance } = useWallet();
  const { placeAviatorBet, cashOutAviator, placing, cashingOut } = useBetting();
  const { addToast } = useApp();

  const [stake, setStake] = useState("10");
  const [phase, setPhase] = useState("idle");
  const [multiplier, setMultiplier] = useState(1.0);
  const [betInfo, setBetInfo] = useState(null); // { betId, txHash, confirmedAtMs }
  const [roundResult, setRoundResult] = useState(null); // { won, multiplier, payout }
  const [history, setHistory] = useState([]); // real past round multipliers this session

  const tickRef = useRef(null);
  const cashingRef = useRef(false); // guards against double-clicking cash out

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => stopTicking, [stopTicking]);

  function startTicking(startMs) {
    function frame() {
      const elapsed = (Date.now() - startMs) / 1000;
      setMultiplier(multiplierAtTime(elapsed));
      tickRef.current = requestAnimationFrame(frame);
    }
    tickRef.current = requestAnimationFrame(frame);
  }

  async function handlePlaceBet() {
    if (!connected) { await connect(); return; }
    if (!stake || Number(stake) <= 0) { addToast("Enter a stake amount.", "error"); return; }
    if (Number(stake) > Number(balance)) {
      addToast(`Not enough USDC — you have ${Number(balance).toFixed(2)}, need ${Number(stake).toFixed(2)}.`, "error");
      return;
    }
    setRoundResult(null);
    try {
      const res = await placeAviatorBet(stake);
      setBetInfo(res);
      setMultiplier(1.0);
      setPhase("flying");
      cashingRef.current = false;
      startTicking(res.confirmedAtMs);
    } catch (e) {
      addToast(e?.message || "Bet failed.", "error");
    }
  }

  async function handleCashOut() {
    if (!betInfo || cashingRef.current) return;
    cashingRef.current = true;
    stopTicking();
    try {
      const res = await cashOutAviator(betInfo.betId, betInfo.txHash);
      setRoundResult(res);
      setPhase(res.won ? "cashed_out" : "crashed");
      setMultiplier(res.multiplier);
      setHistory((prev) => [res.multiplier, ...prev].slice(0, 15));
      addToast(
        res.won ? `Cashed out at ${res.multiplier.toFixed(2)}x — ${res.payout} USDC.` : `Crashed at ${res.multiplier.toFixed(2)}x — too late.`,
        res.won ? "success" : "error"
      );
      setTimeout(() => { setPhase("idle"); setBetInfo(null); }, 2500);
    } catch (e) {
      addToast(e?.message || "Cash out failed.", "error");
      cashingRef.current = false;
    }
  }

  const isFlying = phase === "flying";

  return (
    <div className="av-page">
      <div className="av-header">
        <div>
          <h1>Aviator</h1>
          <p>Cash out before it crashes. Provably fair, settled instantly in USDC.</p>
        </div>
        {history.length > 0 && (
          <div className="av-history">
            {history.map((m, i) => (
              <span key={i} className={`av-history-chip ${m >= 2 ? "av-good" : "av-bad"}`}>{m.toFixed(2)}x</span>
            ))}
          </div>
        )}
      </div>

      <div className="av-display">
        <div className={`av-multiplier ${phase === "crashed" ? "av-crashed" : ""} ${phase === "cashed_out" ? "av-won" : ""}`}>
          {multiplier.toFixed(2)}x
        </div>
        <div className="av-status">
          {phase === "idle" && "Place a bet to start"}
          {phase === "flying" && "Flying — cash out any time"}
          {phase === "crashed" && "Crashed! Too late to cash out"}
          {phase === "cashed_out" && "Cashed out!"}
        </div>
        <svg className="av-plane" viewBox="0 0 100 60">
          <path
            d={isFlying ? "M5 55 Q 40 50 95 5" : "M5 55 L 95 5"}
            fill="none"
            stroke={phase === "crashed" ? "var(--av-down)" : "var(--av-gold)"}
            strokeWidth="2"
          />
          <circle
            cx={isFlying ? Math.min(95, 5 + (multiplier - 1) * 30) : 5}
            cy={isFlying ? Math.max(5, 55 - (multiplier - 1) * 22) : 55}
            r="4"
            fill={phase === "crashed" ? "var(--av-down)" : "var(--av-gold)"}
          />
        </svg>
      </div>

      <div className="av-controls">
        <div className="av-stake">
          <span>USDC</span>
          <input
            type="number" min="1" value={stake}
            onChange={(e) => setStake(e.target.value)}
            disabled={phase !== "idle"}
          />
        </div>

        {phase === "idle" && (
          <button className="av-btn av-btn-bet" onClick={handlePlaceBet} disabled={placing}>
            {!connected ? "Connect wallet" : placing ? "Placing bet…" : "Place Bet"}
          </button>
        )}
        {phase === "flying" && (
          <button className="av-btn av-btn-cashout" onClick={handleCashOut} disabled={cashingOut}>
            {cashingOut ? "Cashing out…" : `Cash Out — ${(Number(stake) * multiplier).toFixed(2)} USDC`}
          </button>
        )}
        {(phase === "crashed" || phase === "cashed_out") && (
          <button className="av-btn av-btn-bet" disabled>
            {phase === "crashed" ? "Round over — crashed" : "Round over — cashed out"}
          </button>
        )}
      </div>
    </div>
  );
}
