import { useState } from "react";
import { useBetting } from "../../hooks/useBetting";
import { useApp } from "../../context/AppContext";
import { useWallet } from "../../context/WalletContext";
import "./BetSlip.css";

// Standard 1X2 encoding used by the contract's placeBet(matchId, selection, amount)
const SELECTION_CODE = { home: 1, draw: 2, away: 3 };

export function BetSlip({ match, side, odds, onClose }) {
  const [amount, setAmount] = useState("10");
  const { placeBet, placing } = useBetting();
  const { addToast } = useApp();
  const { connected, connect } = useWallet();

  const canBet = match.chainMatchId !== null && match.chainMatchId !== undefined;

  async function handlePlaceBet() {
    if (!connected) {
      await connect();
      return;
    }
    if (!canBet) {
      addToast("This match hasn't synced to chain yet. Try again shortly.", "warning");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      addToast("Enter a stake amount first.", "error");
      return;
    }
    try {
      const result = await placeBet({
        matchId: match.chainMatchId,
        selection: SELECTION_CODE[side],
        amount,
      });
      if (result?.success) {
        addToast("Bet placed.", "success");
        onClose();
      }
    } catch (e) {
      addToast(e?.message || "Bet failed. Try again.", "error");
    }
  }

  const potentialWin = (Number(amount) * odds).toFixed(2);

  return (
    <div className="bet-slip">
      <div className="bet-slip-head">
        <div>
          <div className="bet-slip-teams">{match.homeTeam} vs {match.awayTeam}</div>
          <div className="bet-slip-side">{side} · {odds.toFixed(2)}</div>
        </div>
        <button className="bet-slip-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      {!canBet && (
        <div className="bet-slip-warning">
          Syncing to chain — betting opens once this match is confirmed.
        </div>
      )}

      <label className="bet-slip-label" htmlFor="bet-amount">Stake (USDC)</label>
      <input
        id="bet-amount"
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="bet-slip-input"
      />

      <div className="bet-slip-payout">
        <span>Potential win</span>
        <span className="bet-slip-payout-value">{potentialWin} USDC</span>
      </div>

      <button
        className="btn-gold bet-slip-submit"
        onClick={handlePlaceBet}
        disabled={placing || !canBet}
      >
        {!connected ? "Connect wallet" : placing ? "Placing bet…" : "Place bet"}
      </button>
    </div>
  );
}
