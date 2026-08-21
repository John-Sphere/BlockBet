import { useState, useEffect } from "react";
import { useBetSlip } from "../../context/BetSlipContext";
import { useBetting } from "../../hooks/useBetting";
import { useApp } from "../../context/AppContext";
import { useWallet } from "../../context/WalletContext";
import { subscribe, initMatchManager } from "../../engine/matchManager";
import "./BetSlipPanel.css";

const SELECTION_CODE = { home: 1, draw: 2, away: 3 };
const QUICK_STAKES = [10, 20, 50, 100];

// Same live-cashout pricing model as MyBets.jsx and api/cashout-quote.js —
// kept in sync so the estimate shown here matches what you'd actually get.
const MARGIN = 0.85;
const LOSING_FLOOR = 0.05;

function estimateCashout(bet, liveMatch) {
  if (!liveMatch) return null;
  const stakeAmount = Number(bet.amount);
  const potentialWin = Number(bet.potentialWin);
  const minute = liveMatch.minute ?? 0;
  const certainty = Math.max(0, Math.min(1, minute / 90));
  let currentResult;
  if (liveMatch.homeScore > liveMatch.awayScore) currentResult = 1;
  else if (liveMatch.awayScore > liveMatch.homeScore) currentResult = 3;
  else currentResult = 2;
  const onTrack = currentResult === bet.prediction;
  const value = onTrack
    ? stakeAmount + (potentialWin - stakeAmount) * certainty * MARGIN
    : stakeAmount * Math.max(LOSING_FLOOR, 1 - certainty * MARGIN);
  return { value: value.toFixed(2), minute, homeScore: liveMatch.homeScore, awayScore: liveMatch.awayScore };
}

export function BetSlipPanel() {
  const { selections, removeSelection, clearAll, open, setOpen } = useBetSlip();
  const { placeBet, placeAccumulator, cashOutBet, getMyBets, placing, cashingOut } = useBetting();
  const { addToast } = useApp();
  const { connected, connect, balance, address } = useWallet();

  const [mode, setMode] = useState("single");
  const [stakes, setStakes] = useState({});
  const [multiStake, setMultiStake] = useState("10");
  const [openSingles, setOpenSingles] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe((matches) => setLiveMatches(matches));
    return unsub;
  }, []);

  useEffect(() => {
    if (!connected || !address) { setOpenSingles([]); return; }
    let cancelled = false;
    (async () => {
      // Reuse the same getMyBets path as My Bets — filtered down to
      // just pending (unresolved, not cashed out) singles for this
      // compact preview.
      const { singles } = await getMyBets(address);
      if (!cancelled) setOpenSingles(singles.filter((b) => !b.resolved && !b.cashedOut).slice(0, 3));
    })();
    return () => { cancelled = true; };
  }, [connected, address, getMyBets]);

  function findLiveMatch(homeTeam, awayTeam) {
    return liveMatches.find((m) => m.homeTeam === homeTeam && m.awayTeam === awayTeam) || null;
  }

  function stakeFor(matchId) { return stakes[matchId] ?? "10"; }
  function setStake(matchId, value) { setStakes((prev) => ({ ...prev, [matchId]: value })); }

  const allSynced = selections.every((s) => s.chainMatchId !== null && s.chainMatchId !== undefined);
  const combinedOdds = selections.reduce((acc, s) => acc * (s.odds || 1), 1);
  const isMulti = mode === "accumulator";
  const activeStake = isMulti ? multiStake : stakeFor(selections[0]?.matchId);
  const potentialWin = isMulti
    ? Number(multiStake || 0) * combinedOdds
    : Number(stakeFor(selections[0]?.matchId) || 0) * (selections[0]?.odds || 0);
  const estProfit = potentialWin - Number(activeStake || 0);

  async function handlePlaceOne(sel) {
    if (!connected) { await connect(); return; }
    if (sel.chainMatchId === null || sel.chainMatchId === undefined) {
      addToast("This match hasn't synced to chain yet. Try again shortly.", "warning");
      return;
    }
    const amount = stakeFor(sel.matchId);
    if (!amount || Number(amount) <= 0) { addToast("Enter a stake amount first.", "error"); return; }
    if (Number(amount) > Number(balance)) {
      addToast(`Not enough USDC \u2014 you have ${Number(balance).toFixed(2)}, need ${Number(amount).toFixed(2)}.`, "error");
      return;
    }
    try {
      const result = await placeBet({ matchId: sel.chainMatchId, selection: SELECTION_CODE[sel.side], amount, odds: sel.odds });
      if (result?.success) {
        addToast(`Bet placed on ${sel.side === "draw" ? "draw" : sel.side === "home" ? sel.homeTeam : sel.awayTeam}.`, "success");
        removeSelection(sel.matchId);
      }
    } catch (e) {
      addToast(e?.message || "Bet failed. Try again.", "error");
    }
  }

  async function handlePlaceMultiple() {
    if (!connected) { await connect(); return; }
    if (selections.length < 2) { addToast("Add at least 2 picks for a multiple.", "error"); return; }
    if (!allSynced) { addToast("Some matches haven't synced to chain yet. Try again shortly.", "warning"); return; }
    if (!multiStake || Number(multiStake) <= 0) { addToast("Enter a stake amount first.", "error"); return; }
    if (Number(multiStake) > Number(balance)) {
      addToast(`Not enough USDC \u2014 you have ${Number(balance).toFixed(2)}, need ${Number(multiStake).toFixed(2)}.`, "error");
      return;
    }
    try {
      const legs = selections.map((s) => ({ matchId: s.chainMatchId, selection: SELECTION_CODE[s.side] }));
      const result = await placeAccumulator({ legs, combinedOdds, amount: multiStake });
      if (result?.success) {
        addToast(`Multiple placed \u2014 ${selections.length} legs at ${combinedOdds.toFixed(2)}x.`, "success");
        clearAll();
      }
    } catch (e) {
      addToast(e?.message || "Multiple bet failed. Try again.", "error");
    }
  }

  async function handleCashOut(matchId) {
    try {
      const result = await cashOutBet(matchId);
      if (result?.success) {
        addToast(`Cashed out ${result.amount} USDC.`, "success");
        setOpenSingles((prev) => prev.filter((b) => b.matchId !== matchId));
      }
    } catch (e) {
      addToast(e?.message || "Cash out failed.", "error");
    }
  }

  return (
    <aside className={`slip ${open ? "slip--mobile-open" : ""}`}>
      <div className="slip-head">
        <h2>Bet Slip</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="clear" onClick={clearAll} role="button">Clear all</span>
          <button className="slip-mobile-close" onClick={() => setOpen(false)} aria-label="Close bet slip">✕</button>
        </div>
      </div>

      <div className="mode-toggle">
        <div className={`mode-btn ${mode === "single" ? "active" : ""}`} onClick={() => setMode("single")}>Single</div>
        <div className={`mode-btn ${mode === "accumulator" ? "active" : ""}`} onClick={() => setMode("accumulator")}>Accumulator</div>
      </div>

      <div className="slip-items">
        {selections.length === 0 && (
          <div style={{ color: "var(--chalk-dim)", fontSize: "12px", padding: "8px 2px" }}>
            Click an odds box on any match to add it here.
          </div>
        )}
        {selections.map((sel) => {
          const label = sel.side === "draw" ? "Draw" : sel.side === "home" ? sel.homeTeam : sel.awayTeam;
          const canBet = sel.chainMatchId !== null && sel.chainMatchId !== undefined;
          return (
            <div className="slip-item" key={sel.matchId}>
              <div className="slip-item-top">
                <div>
                  <div className="slip-item-match">{sel.homeTeam} vs {sel.awayTeam}</div>
                  <div className="slip-item-pick">Pick: {label}{!canBet && " \u2014 syncing to chain"}</div>
                </div>
                <div className="slip-item-close" onClick={() => removeSelection(sel.matchId)} role="button">✕</div>
              </div>
              <div className="slip-item-odd">{sel.odds?.toFixed(2)}x</div>
            </div>
          );
        })}
      </div>

      {selections.length > 0 && (
        <div className="stake-block">
          {!isMulti ? (
            <>
              <div className="field-label">Stake</div>
              <div className="amount-input">
                <span>USDC</span>
                <input type="number" min="1" value={stakeFor(selections[0].matchId)} onChange={(e) => setStake(selections[0].matchId, e.target.value)} />
              </div>
              <div className="quick-stakes">
                {QUICK_STAKES.map((v) => (
                  <span key={v} onClick={() => setStake(selections[0].matchId, String(v))} role="button">{v}</span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="field-label">Stake</div>
              <div className="amount-input">
                <span>USDC</span>
                <input type="number" min="1" value={multiStake} onChange={(e) => setMultiStake(e.target.value)} />
              </div>
              <div className="quick-stakes">
                {QUICK_STAKES.map((v) => (
                  <span key={v} onClick={() => setMultiStake(String(v))} role="button">{v}</span>
                ))}
              </div>
            </>
          )}

          <div className="slip-summary">
            <div className="ts-row"><span>Legs</span><span>{selections.length}</span></div>
            <div className="ts-row"><span>{isMulti ? "Combined odds" : "Odds"}</span><span>{(isMulti ? combinedOdds : selections[0]?.odds || 0).toFixed(2)}x</span></div>
            <div className="ts-row"><span>Est. profit</span><span>{estProfit.toFixed(2)} USDC</span></div>
            <div className="ts-row total"><span>Potential win</span><span className="val">{potentialWin.toFixed(2)} USDC</span></div>
          </div>

          <button
            className="place-bet"
            disabled={placing || (isMulti ? selections.length < 2 || !allSynced : !selections[0] || selections[0].chainMatchId == null)}
            onClick={() => (isMulti ? handlePlaceMultiple() : handlePlaceOne(selections[0]))}
          >
            {!connected ? "Connect wallet" : placing ? "Placing…" : `Place ${isMulti ? "Accumulator" : "Bet"}`}
          </button>
        </div>
      )}

      {openSingles.length > 0 && (
        <div className="open-bet-block">
          <div className="open-bet-title"><span>Open Bet</span><span style={{ color: "var(--gold-bright)" }}>{openSingles.length}</span></div>
          {openSingles.map((b) => {
            const liveMatch = findLiveMatch(b.homeTeam, b.awayTeam);
            const estimate = estimateCashout(b, liveMatch);
            return (
              <div className="open-bet-card" key={b.matchId} style={{ marginBottom: 8 }}>
                <div className="oc-match">{b.homeTeam} vs {b.awayTeam}</div>
                <div className="oc-meta">
                  <span>Stake {Number(b.amount).toFixed(1)} USDC</span>
                  <span>Odds {b.odds?.toFixed(2)}x</span>
                </div>
                {estimate && (
                  <div className="oc-live">
                    <span className="score">Live {estimate.homeScore}–{estimate.awayScore} ({estimate.minute}')</span>
                    <span className="cashval">{estimate.value} USDC</span>
                  </div>
                )}
                <button className="cashout-btn" onClick={() => handleCashOut(b.matchId)} disabled={cashingOut}>
                  {cashingOut ? "Cashing out…" : `Cash out for ~${estimate ? estimate.value : b.amount} USDC`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
