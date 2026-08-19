/**
 * BLOCKBET My Bets
 * Two tabs: Open Bet (still pending) and Bet History (resolved —
 * won or lost). Reads directly from the contract's event log and
 * lets you claim winnings on anything resolved, won, and unclaimed.
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ClubBadge } from "../components/ui/ClubBadge";
import { useWallet } from "../context/WalletContext";
import { useBetting } from "../hooks/useBetting";
import { useApp } from "../context/AppContext";
import "./MyBets.css";

const PREDICTION_LABEL = { 1: "Home", 2: "Draw", 3: "Away" };

function singleStatus(bet) {
  if (!bet.resolved) return { label: "Pending", tone: "open" };
  if (bet.claimed) return { label: "Claimed", tone: "muted" };
  if (bet.won) return { label: "Won \u2014 unclaimed", tone: "success" };
  return { label: "Lost", tone: "danger" };
}

function accStatus(acc) {
  if (acc.outcome === 0) return { label: "Pending", tone: "open" };
  if (acc.claimed) return { label: "Claimed", tone: "muted" };
  if (acc.outcome === 1) return { label: "Won \u2014 unclaimed", tone: "success" };
  return { label: "Lost", tone: "danger" };
}

function SingleCard({ bet, onClaim, claiming, onCashOut, cashingOut }) {
  const status = singleStatus(bet);
  return (
    <Card className="mb-item">
      <div className="mb-item-teams">
        <ClubBadge name={bet.homeTeam} size={22} />
        {bet.homeTeam}
        <span className="vs">vs</span>
        <ClubBadge name={bet.awayTeam} size={22} />
        {bet.awayTeam}
      </div>
      <div className="mb-item-row">
        <span>Pick: <strong>{PREDICTION_LABEL[bet.prediction]}</strong></span>
        <span>Stake: <strong>{bet.amount} USDC</strong></span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {bet.resolved && bet.won && !bet.claimed && (
        <button className="btn-gold mb-claim-btn" onClick={() => onClaim(bet.matchId)} disabled={claiming}>
          {claiming ? "Claiming…" : "Claim winnings"}
        </button>
      )}
      {!bet.resolved && !bet.cashedOut && (
        <button className="btn-outline mb-claim-btn" onClick={() => onCashOut(bet.matchId)} disabled={cashingOut}>
          {cashingOut ? "Cashing out…" : "Cash out for stake back"}
        </button>
      )}
    </Card>
  );
}

function AccCard({ acc, onClaim, claiming }) {
  const status = accStatus(acc);
  return (
    <Card className="mb-item">
      <div className="mb-item-row" style={{ marginBottom: 8 }}>
        <span>{acc.legCount} legs · {acc.combinedOdds.toFixed(2)}x combined</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div className="mb-legs">
        {acc.legs.map((leg, i) => (
          <div key={i} className="mb-leg">
            <span>{leg.homeTeam} vs {leg.awayTeam}</span>
            <span>{PREDICTION_LABEL[leg.prediction]}</span>
            <span className={leg.resolved ? (leg.result === leg.prediction ? "mb-leg-won" : "mb-leg-lost") : "mb-leg-pending"}>
              {leg.resolved ? (leg.result === leg.prediction ? "Won" : "Lost") : "Pending"}
            </span>
          </div>
        ))}
      </div>
      <div className="mb-item-row" style={{ marginTop: 8 }}>
        <span>Stake: <strong>{acc.stake} USDC</strong></span>
      </div>
      {acc.outcome === 1 && !acc.claimed && (
        <button className="btn-gold mb-claim-btn" onClick={() => onClaim(acc.accId)} disabled={claiming}>
          {claiming ? "Claiming…" : "Claim winnings"}
        </button>
      )}
    </Card>
  );
}

export default function MyBets() {
  const { connected, address, connect } = useWallet();
  const { getMyBets, claimWinnings, claimAccumulator, cashOutBet, claiming, cashingOut } = useBetting();
  const { addToast } = useApp();

  const [tab, setTab] = useState("open"); // "open" | "history"
  const [loading, setLoading] = useState(false);
  const [singles, setSingles] = useState([]);
  const [accumulators, setAccumulators] = useState([]);

  const load = useCallback(async () => {
    if (!connected || !address) return;
    setLoading(true);
    try {
      const { singles, accumulators } = await getMyBets(address);
      setSingles(singles);
      setAccumulators(accumulators);
    } catch (e) {
      addToast("Couldn't load bet history. Try refreshing.", "error");
    } finally {
      setLoading(false);
    }
  }, [connected, address, getMyBets, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClaimSingle(matchId) {
    try {
      const result = await claimWinnings(matchId);
      if (result?.success) {
        addToast("Winnings claimed.", "success");
        load();
      }
    } catch (e) {
      addToast(e?.message || "Claim failed.", "error");
    }
  }

  async function handleCashOut(matchId) {
    try {
      const result = await cashOutBet(matchId);
      if (result?.success) {
        addToast(`Cashed out ${result.amount} USDC.`, "success");
        load();
      }
    } catch (e) {
      addToast(e?.message || "Cash out failed.", "error");
    }
  }

  async function handleClaimAccumulator(accId) {
    try {
      const result = await claimAccumulator(accId);
      if (result?.success) {
        addToast("Multiple winnings claimed.", "success");
        load();
      }
    } catch (e) {
      addToast(e?.message || "Claim failed.", "error");
    }
  }

  if (!connected) {
    return (
      <div className="mb-gate">
        <h2>Open bet</h2>
        <p>Connect your wallet to see your bets.</p>
        <button className="btn-gold" onClick={connect}>Connect wallet</button>
      </div>
    );
  }

  const openSingles = singles.filter((b) => !b.resolved);
  const openAccs = accumulators.filter((a) => a.outcome === 0);
  const historySingles = singles.filter((b) => b.resolved);
  const historyAccs = accumulators.filter((a) => a.outcome !== 0);

  const shownSingles = tab === "open" ? openSingles : historySingles;
  const shownAccs = tab === "open" ? openAccs : historyAccs;
  const hasAny = shownSingles.length > 0 || shownAccs.length > 0;

  return (
    <div className="mb-page">
      <div className="mb-head">
        <div>
          <h1 className="mb-title">{tab === "open" ? "Open bet" : "Bet history"}</h1>
          <p className="mb-sub">Read directly from the blockchain — always up to date.</p>
        </div>
        <button className="btn-outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mb-tabs">
        <button
          className={`mb-tab ${tab === "open" ? "mb-tab--on" : ""}`}
          onClick={() => setTab("open")}
        >
          Open bet
          {(openSingles.length + openAccs.length) > 0 && (
            <span className="mb-tab-count">{openSingles.length + openAccs.length}</span>
          )}
        </button>
        <button
          className={`mb-tab ${tab === "history" ? "mb-tab--on" : ""}`}
          onClick={() => setTab("history")}
        >
          Bet history
        </button>
      </div>

      {loading && !hasAny && (
        <Card style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--chalk-dim)" }}>Loading your bets from the chain…</p>
        </Card>
      )}

      {!loading && !hasAny && (
        <Card style={{ padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--chalk-dim)" }}>
            {tab === "open"
              ? "No open bets right now. Head to the pitch and place one."
              : "No settled bets yet — they'll show up here once a match finishes."}
          </p>
        </Card>
      )}

      {shownSingles.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Single bets</div>
          <div className="mb-list">
            {shownSingles.map((bet) => (
              <SingleCard key={bet.matchId + bet.txHash} bet={bet} onClaim={handleClaimSingle} claiming={claiming} onCashOut={handleCashOut} cashingOut={cashingOut} />
            ))}
          </div>
        </>
      )}

      {shownAccs.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: "24px 0 10px" }}>Multiples</div>
          <div className="mb-list">
            {shownAccs.map((acc) => (
              <AccCard key={acc.accId + acc.txHash} acc={acc} onClaim={handleClaimAccumulator} claiming={claiming} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
