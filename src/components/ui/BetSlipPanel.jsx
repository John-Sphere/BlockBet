import { useState } from "react";
import { useBetSlip } from "../../context/BetSlipContext";
import { useBetting } from "../../hooks/useBetting";
import { useApp } from "../../context/AppContext";
import { useWallet } from "../../context/WalletContext";
import "./BetSlipPanel.css";

const SELECTION_CODE = { home: 1, draw: 2, away: 3 };

export function BetSlipPanel() {
  const { selections, removeSelection, clearAll, open, setOpen } = useBetSlip();
  const { placeBet, placing } = useBetting();
  const { addToast } = useApp();
  const { connected, connect } = useWallet();

  const [mode, setMode] = useState("single");
  const [stakes, setStakes] = useState({});

  if (!open) {
    return selections.length > 0 ? (
      <button className="bet-slip-tab" onClick={() => setOpen(true)}>
        Bet slip <span className="bet-slip-count">{selections.length}</span>
      </button>
    ) : null;
  }

  function stakeFor(matchId) {
    return stakes[matchId] ?? "10";
  }

  function setStake(matchId, value) {
    setStakes((prev) => ({ ...prev, [matchId]: value }));
  }

  async function handlePlaceOne(sel) {
    if (!connected) {
      await connect();
      return;
    }
    if (sel.chainMatchId === null || sel.chainMatchId === undefined) {
      addToast("This match hasn't synced to chain yet. Try again shortly.", "warning");
      return;
    }
    const amount = stakeFor(sel.matchId);
    if (!amount || Number(amount) <= 0) {
      addToast("Enter a stake amount first.", "error");
      return;
    }
    try {
      const result = await placeBet({
        matchId: sel.chainMatchId,
        selection: SELECTION_CODE[sel.side],
        amount,
      });
      if (result?.success) {
        addToast(`Bet placed on ${sel.side === "draw" ? "draw" : sel.side === "home" ? sel.homeTeam : sel.awayTeam}.`, "success");
        removeSelection(sel.matchId);
      }
    } catch (e) {
      addToast(e?.message || "Bet failed. Try again.", "error");
    }
  }

  async function handlePlaceAll() {
    for (const sel of selections) {
      await handlePlaceOne(sel);
    }
  }

  return (
    <div className="bet-slip-panel">
      <div className="bet-slip-panel-head">
        <div className="bet-slip-panel-title">
          Bet slip <span className="bet-slip-count">{selections.length}</span>
        </div>
        <button className="bet-slip-panel-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>

      <div className="bet-slip-tabs">
        {["single", "multiple", "system"].map((m) => (
          <button
            key={m}
            className={`bet-slip-tab-btn${mode === m ? " active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {mode !== "single" ? (
        <div className="bet-slip-soon">
          {mode === "multiple" ? "Multiple" : "System"} bets aren't available yet — combined-odds betting needs a contract upgrade we haven't shipped. Use Single for now.
        </div>
      ) : selections.length === 0 ? (
        <div className="bet-slip-empty">Click an odds box on any match to add it here.</div>
      ) : (
        <>
          <div className="bet-slip-list">
            {selections.map((sel) => {
              const label = sel.side === "draw" ? "Draw" : sel.side === "home" ? sel.homeTeam : sel.awayTeam;
              const canBet = sel.chainMatchId !== null && sel.chainMatchId !== undefined;
              return (
                <div className="bet-slip-item" key={sel.matchId}>
                  <div className="bet-slip-item-head">
                    <div>
                      <div className="bet-slip-item-pick">{sel.side} · {label}</div>
                      <div className="bet-slip-item-match">{sel.homeTeam} v {sel.awayTeam}</div>
                    </div>
                    <button className="bet-slip-item-remove" onClick={() => removeSelection(sel.matchId)} aria-label="Remove">×</button>
                  </div>

                  {!canBet && (
                    <div className="bet-slip-item-warning">Syncing to chain</div>
                  )}

                  <div className="bet-slip-item-row">
                    <input
                      type="number"
                      min="1"
                      value={stakeFor(sel.matchId)}
                      onChange={(e) => setStake(sel.matchId, e.target.value)}
                      className="bet-slip-item-input"
                    />
                    <span className="bet-slip-item-odds">{sel.odds?.toFixed(2)}</span>
                    <button
                      className="btn-gold bet-slip-item-place"
                      onClick={() => handlePlaceOne(sel)}
                      disabled={placing || !canBet}
                    >
                      {placing ? "…" : "Place"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bet-slip-panel-footer">
            <button className="btn-outline bet-slip-clear" onClick={clearAll}>Clear all</button>
            <button className="btn-gold bet-slip-place-all" onClick={handlePlaceAll} disabled={placing}>
              {!connected ? "Connect wallet" : placing ? "Placing…" : `Place all (${selections.length})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
