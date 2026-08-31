import { useState, useEffect, useRef, useCallback } from "react";
import { multiplierAtTime } from "../engine/aviatorEngine";
import { getRoundPhase, BETTING_WINDOW_MS } from "../engine/aviatorSchedule";
import { useBetting } from "../hooks/useBetting";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import "./Aviator.css";

// A real shared round: everyone sees the same 60s betting countdown,
// then the same round starts flying for everyone at once. Your own
// bet (if you placed one) rides along with it — cash out is only
// ever a real action against the actual shared round in progress.
export default function Aviator() {
  const { connected, connect, balance } = useWallet();
  const { placeAviatorBet, cashOutAviator, placing, cashingOut } = useBetting();
  const { addToast } = useApp();

  const [stake, setStake] = useState("10");
  const [round, setRound] = useState(getRoundPhase());
  const [multiplier, setMultiplier] = useState(1.0);
  const [myBet, setMyBet] = useState(null); // { betId, roundEpoch } — only set once placed
  const [roundResult, setRoundResult] = useState(null);
  const [history, setHistory] = useState([]);

  const tickRef = useRef(null);
  const cashingRef = useRef(false);
  const settledRoundsRef = useRef(new Set()); // avoid double-toasting the same crash

  // The single clock every visitor shares — recomputed every frame
  // purely from wall-clock time, no server round-trip needed just to
  // know what phase we're in.
  useEffect(() => {
    function tick() {
      const r = getRoundPhase();
      setRound((prev) => {
        // A brand new round started — reset per-round UI state.
        if (prev.epoch !== r.epoch) {
          setMyBet((currentBet) => (currentBet && currentBet.roundEpoch === r.epoch ? currentBet : null));
        }
        return r;
      });

      if (r.phase === "flying") {
        setMultiplier(multiplierAtTime(r.elapsedFlightSeconds));
      } else {
        setMultiplier(1.0);
      }
      tickRef.current = requestAnimationFrame(tick);
    }
    tickRef.current = requestAnimationFrame(tick);
    return () => { if (tickRef.current) cancelAnimationFrame(tickRef.current); };
  }, []);

  // If I have a live bet and the round I bet into crashes (someone
  // else's cash-out attempt would reveal this, but simplest correct
  // approach: once flight time is clearly past this bet's realistic
  // window and it's still unsettled, treat it as lost) — for now we
  // rely on the player actually clicking Cash Out to find out; a
  // bet left un-cashed-out when the round ends is a real loss,
  // exactly like a real crash game.
  useEffect(() => {
    if (myBet && round.phase === "betting" && !settledRoundsRef.current.has(myBet.roundEpoch)) {
      // Betting phase for a NEW round has started, meaning my
      // previous round's flight fully ended without me cashing out.
      settledRoundsRef.current.add(myBet.roundEpoch);
      addToast("That round ended before you cashed out — bet lost.", "error");
      setMyBet(null);
    }
  }, [round.phase, myBet, addToast]);

  async function handlePlaceBet() {
    if (!connected) { await connect(); return; }
    if (round.phase !== "betting") { addToast("Betting is closed for this round — wait for the next one.", "error"); return; }
    if (!stake || Number(stake) <= 0) { addToast("Enter a stake amount.", "error"); return; }
    if (Number(stake) > Number(balance)) {
      addToast(`Not enough USDC — you have ${Number(balance).toFixed(2)}, need ${Number(stake).toFixed(2)}.`, "error");
      return;
    }
    setRoundResult(null);
    try {
      const res = await placeAviatorBet(stake, round.epoch);
      setMyBet({ betId: res.betId, roundEpoch: res.roundEpoch });
      cashingRef.current = false;
      addToast("Bet placed — the round starts flying when the timer hits zero.", "success");
    } catch (e) {
      addToast(e?.message || "Bet failed.", "error");
    }
  }

  async function handleCashOut() {
    if (!myBet || cashingRef.current) return;
    cashingRef.current = true;
    try {
      const res = await cashOutAviator(myBet.betId, myBet.roundEpoch);
      setRoundResult(res);
      setHistory((prev) => [res.multiplier, ...prev].slice(0, 15));
      settledRoundsRef.current.add(myBet.roundEpoch);
      addToast(
        res.won ? `Cashed out at ${res.multiplier.toFixed(2)}x — ${res.payout} USDC.` : `Too late — crashed at ${res.multiplier.toFixed(2)}x.`,
        res.won ? "success" : "error"
      );
      setMyBet(null);
    } catch (e) {
      addToast(e?.message || "Cash out failed.", "error");
      cashingRef.current = false;
    }
  }

  const secondsLeft = round.phase === "betting" ? Math.ceil(round.msUntilFlight / 1000) : null;
  const canCashOut = myBet && round.phase === "flying" && myBet.roundEpoch === round.epoch;

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
        {round.phase === "betting" ? (
          <>
            <div className="av-countdown">{secondsLeft}s</div>
            <div className="av-status">Betting open — next round starts soon</div>
          </>
        ) : (
          <div className={`av-multiplier ${roundResult && !roundResult.won ? "av-crashed" : ""} ${roundResult?.won ? "av-won" : ""}`}>
            {multiplier.toFixed(2)}x
          </div>
        )}
        {round.phase === "flying" && (
          <div className="av-status">
            {myBet ? "Flying — cash out any time" : "Flying — place a bet next round to play"}
          </div>
        )}
        <svg className="av-plane" viewBox="0 0 100 60">
          <path
            d={round.phase === "flying" ? "M5 55 Q 40 50 95 5" : "M5 55 L 95 5"}
            fill="none" stroke="var(--av-gold)" strokeWidth="2"
          />
          <circle
            cx={round.phase === "flying" ? Math.min(95, 5 + (multiplier - 1) * 30) : 5}
            cy={round.phase === "flying" ? Math.max(5, 55 - (multiplier - 1) * 22) : 55}
            r="4" fill="var(--av-gold)"
          />
        </svg>
      </div>

      <div className="av-controls">
        <div className="av-stake">
          <span>USDC</span>
          <input
            type="number" min="1" value={stake}
            onChange={(e) => setStake(e.target.value)}
            disabled={round.phase !== "betting" || !!myBet}
          />
        </div>

        {canCashOut ? (
          <button className="av-btn av-btn-cashout" onClick={handleCashOut} disabled={cashingOut}>
            {cashingOut ? "Cashing out…" : `Cash Out — ${(Number(stake) * multiplier).toFixed(2)} USDC`}
          </button>
        ) : myBet ? (
          <button className="av-btn av-btn-bet" disabled>Bet placed — waiting for takeoff</button>
        ) : (
          <button className="av-btn av-btn-bet" onClick={handlePlaceBet} disabled={placing || round.phase !== "betting"}>
            {!connected ? "Connect wallet" : placing ? "Placing bet…" : round.phase === "betting" ? "Place Bet" : "Betting closed — wait for next round"}
          </button>
        )}
      </div>
    </div>
  );
}
