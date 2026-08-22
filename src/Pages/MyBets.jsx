import { useMemo, useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { useBetting } from "../hooks/useBetting";
import { useApp } from "../context/AppContext";
import { subscribe, initMatchManager } from "../engine/matchManager";
import "./MyBets.css";

// Same live-cashout pricing model as api/cashout-quote.js and the bet
// slip preview — kept in sync so this shows the same number you'd
// actually get.
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

function StatCard({ label, value, mono }) {
  return (
    <div className="mb-stat">
      <div className={`mb-stat-num ${mono ? "mono" : ""}`}>{value}</div>
      <div className="mb-stat-lbl">{label}</div>
    </div>
  );
}

function OpenBetCard({ bet, liveMatch, onCashOut, cashingOut }) {
  const estimate = estimateCashout(bet, liveMatch);
  return (
    <div className="mb-card">
      <div className="mb-card-top">
        <div className="mb-match">{bet.homeTeam} <span className="vs">vs</span> {bet.awayTeam}</div>
        <span className="mb-pill mb-pill-pending">PENDING</span>
      </div>
      <div className="mb-meta">
        <span>Stake <b>{Number(bet.amount).toFixed(1)} USDC</b></span>
        <span>Odds <b>{bet.odds?.toFixed(2)}x</b></span>
        <span>Potential win <b className="mb-win">{bet.potentialWin} USDC</b></span>
      </div>
      {estimate && (
        <div className="mb-live">
          <span className="mb-live-score">
            <i className="mb-live-dot" />
            Live {estimate.homeScore}–{estimate.awayScore} ({estimate.minute}')
          </span>
          <span className="mb-live-val">{estimate.value} USDC</span>
        </div>
      )}
      <button className="mb-cashout" onClick={() => onCashOut(bet.matchId)} disabled={cashingOut}>
        {cashingOut ? "Cashing out…" : `Cash out for ~${estimate ? estimate.value : bet.amount} USDC`}
      </button>
    </div>
  );
}

function OpenAccCard({ acc }) {
  return (
    <div className="mb-card">
      <div className="mb-card-top">
        <div className="mb-match">Multiple <span className="vs">·</span> {acc.legCount} legs</div>
        <span className="mb-pill mb-pill-pending">PENDING</span>
      </div>
      <div className="mb-meta">
        <span>Stake <b>{acc.stake} USDC</b></span>
        <span>Combined odds <b>{acc.combinedOdds.toFixed(2)}x</b></span>
        <span>Potential win <b className="mb-win">{(Number(acc.stake) * acc.combinedOdds).toFixed(2)} USDC</b></span>
      </div>
    </div>
  );
}

function HistoryRow({ bet, onClaim, claiming }) {
  const won = bet.won;
  const needsClaim = won && !bet.claimed && !bet.cashedOut;
  const label = bet.cashedOut ? "CASHED OUT" : won ? "WON" : "LOST";
  return (
    <div className="mb-history-row">
      <div className="mb-match">{bet.homeTeam} <span className="vs">vs</span> {bet.awayTeam}</div>
      <div className="mb-meta">
        <span>Stake <b>{Number(bet.amount).toFixed(1)} USDC</b></span>
        <span>Odds <b>{bet.odds?.toFixed(2)}x</b></span>
      </div>
      {needsClaim ? (
        <button className="mb-cashout" style={{ width: "auto", padding: "8px 16px" }} onClick={() => onClaim(bet.matchId)} disabled={claiming}>
          {claiming ? "Claiming…" : `Claim ${bet.potentialWin} USDC`}
        </button>
      ) : (
        <span className={`mb-pill ${won ? "mb-pill-won" : "mb-pill-lost"}`}>
          {won ? `${label} +${bet.potentialWin}` : label}
        </span>
      )}
    </div>
  );
}

function HistoryAccRow({ acc, onClaim, claiming }) {
  const won = acc.outcome === 1;
  const needsClaim = won && !acc.claimed;
  const payout = (Number(acc.stake) * acc.combinedOdds).toFixed(2);
  return (
    <div className="mb-history-row">
      <div className="mb-match">Multiple <span className="vs">·</span> {acc.legCount} legs</div>
      <div className="mb-meta">
        <span>Stake <b>{acc.stake} USDC</b></span>
        <span>Odds <b>{acc.combinedOdds.toFixed(2)}x</b></span>
      </div>
      {needsClaim ? (
        <button className="mb-cashout" style={{ width: "auto", padding: "8px 16px" }} onClick={() => onClaim(acc.accId)} disabled={claiming}>
          {claiming ? "Claiming…" : `Claim ${payout} USDC`}
        </button>
      ) : (
        <span className={`mb-pill ${won ? "mb-pill-won" : "mb-pill-lost"}`}>
          {won ? `WON +${payout}` : "LOST"}
        </span>
      )}
    </div>
  );
}

function EmptyState({ label, onCta }) {
  return (
    <div className="mb-empty">
      <div className="mb-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v16" />
        </svg>
      </div>
      <div className="mb-empty-title">{label}</div>
      <p>Nothing here yet — place a bet and it'll show up in real time.</p>
      <button className="mb-empty-cta" onClick={onCta}>Head to the pitch →</button>
    </div>
  );
}

export default function MyBets() {
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(false);
  const [singles, setSingles] = useState([]);
  const [accumulators, setAccumulators] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const { connected, address } = useWallet();
  const { getMyBets, claimWinnings, claimAccumulator, cashOutBet, claiming, cashingOut } = useBetting();
  const { addToast } = useApp();

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe((matches) => setLiveMatches(matches));
    return unsub;
  }, []);

  function findLiveMatch(homeTeam, awayTeam) {
    return liveMatches.find((m) => m.homeTeam === homeTeam && m.awayTeam === awayTeam) || null;
  }

  const load = useCallback(async () => {
    if (!connected || !address) { setSingles([]); setAccumulators([]); return; }
    setLoading(true);
    try {
      const { singles, accumulators } = await getMyBets(address);
      setSingles(singles);
      setAccumulators(accumulators);
    } catch {
      addToast("Couldn't load your bets. Try refreshing.", "error");
    } finally {
      setLoading(false);
    }
  }, [connected, address, getMyBets, addToast]);

  useEffect(() => { load(); }, [load]);

  async function handleClaimSingle(matchId) {
    try {
      const result = await claimWinnings(matchId);
      if (result?.success) { addToast("Winnings claimed.", "success"); load(); }
    } catch (e) { addToast(e?.message || "Claim failed.", "error"); }
  }

  async function handleClaimAccumulator(accId) {
    try {
      const result = await claimAccumulator(accId);
      if (result?.success) { addToast("Winnings claimed.", "success"); load(); }
    } catch (e) { addToast(e?.message || "Claim failed.", "error"); }
  }

  async function handleCashOut(matchId) {
    try {
      const result = await cashOutBet(matchId);
      if (result?.success) { addToast(`Cashed out ${result.amount} USDC.`, "success"); load(); }
    } catch (e) { addToast(e?.message || "Cash out failed.", "error"); }
  }

  const openSingles = singles.filter((b) => !b.resolved && !b.cashedOut);
  const openAccs = accumulators.filter((a) => a.outcome === 0 && !a.claimed);
  const settledSingles = singles.filter((b) => b.resolved || b.cashedOut);
  const settledAccs = accumulators.filter((a) => a.outcome !== 0 || a.claimed);

  const totals = useMemo(() => {
    const staked = openSingles.reduce((a, b) => a + Number(b.amount), 0) + openAccs.reduce((a, b) => a + Number(b.stake), 0);
    const potential = openSingles.reduce((a, b) => a + Number(b.potentialWin), 0) + openAccs.reduce((a, b) => a + Number(b.stake) * b.combinedOdds, 0);
    return { staked, potential, count: openSingles.length + openAccs.length };
  }, [openSingles, openAccs]);

  if (!connected) {
    return (
      <div className="mb-page">
        <div className="mb-empty">
          <div className="mb-empty-title">Connect your wallet</div>
          <p>Connect a wallet to see your open bets and history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-page">
      <div className="mb-header">
        <div>
          <h1>{tab === "open" ? "Open bet" : "Bet history"}</h1>
          <p>Read directly from the blockchain — always up to date.</p>
        </div>
        <button className="mb-refresh" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <div className="mb-stats-row">
        <StatCard label="Open bets" value={totals.count} />
        <StatCard label="Total staked" value={`${totals.staked.toFixed(2)} USDC`} mono />
        <StatCard label="Potential return" value={`${totals.potential.toFixed(2)} USDC`} mono />
      </div>

      <div className="mb-tabs">
        <button className={`mb-tab ${tab === "open" ? "active" : ""}`} onClick={() => setTab("open")}>
          Open bet{totals.count > 0 && <span className="mb-tab-count">{totals.count}</span>}
        </button>
        <button className={`mb-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          Bet history
        </button>
      </div>

      {tab === "open" && (
        openSingles.length === 0 && openAccs.length === 0 ? (
          <EmptyState label="No open bets right now" />
        ) : (
          <>
            {openSingles.length > 0 && (
              <>
                <div className="mb-section-label">Single bets</div>
                <div className="mb-list" style={{ marginBottom: 24 }}>
                  {openSingles.map((b) => (
                    <OpenBetCard
                      key={b.matchId}
                      bet={b}
                      liveMatch={findLiveMatch(b.homeTeam, b.awayTeam)}
                      onCashOut={handleCashOut}
                      cashingOut={cashingOut}
                    />
                  ))}
                </div>
              </>
            )}
            {openAccs.length > 0 && (
              <>
                <div className="mb-section-label">Multiples</div>
                <div className="mb-list">
                  {openAccs.map((a) => <OpenAccCard key={a.accId} acc={a} />)}
                </div>
              </>
            )}
          </>
        )
      )}

      {tab === "history" && (
        settledSingles.length === 0 && settledAccs.length === 0 ? (
          <EmptyState label="No settled bets yet" />
        ) : (
          <div className="mb-history-list">
            {settledSingles.map((b) => (
              <HistoryRow key={b.matchId} bet={b} onClaim={handleClaimSingle} claiming={claiming} />
            ))}
            {settledAccs.map((a) => (
              <HistoryAccRow key={a.accId} acc={a} onClaim={handleClaimAccumulator} claiming={claiming} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
