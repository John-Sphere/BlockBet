/**
 * BLOCKBET Football Page
 * - 18 simultaneous matches (3 per league)
 * - EXACTLY ONE bet slip (desktop fixed right, mobile drawer)
 * - Finished matches cannot accept bets
 * - Countdown timer on betting-open matches
 * - Real USDC flow
 */

import { useState, useEffect, useCallback } from "react";
import { useWallet }  from "../context/WalletContext";
import { useApp }     from "../context/AppContext";
import { Card }       from "../components/ui/Card";
import { Button }     from "../components/ui/Button";
import { Badge }      from "../components/ui/Badge";
import { useBetting } from "../hooks/useBetting";
import {
  initMatchManager,
  subscribe,
  updateMatchPool,
} from "../engine/matchManager";
import { LEAGUES } from "../data/clubs";
import "./Football.css";

// ── STATUS CONFIG ───────────────────────────────────────────
const STATUS_CFG = {
  betting:     { label: "🕐 Betting Open", color: "warning" },
  first_half:  { label: "🔴 1st Half",     color: "success" },
  halftime:    { label: "⏸️ Half Time",    color: "primary" },
  second_half: { label: "🔴 2nd Half",     color: "success" },
  finished:    { label: "✅ Full Time",    color: "ghost"   },
};

// ── COUNTDOWN HELPER ────────────────────────────────────────
function formatCountdown(ms) {
  if (ms <= 0) return "00:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── MAIN COMPONENT ──────────────────────────────────────────
export default function Football() {
  const { connected, connect, balance } = useWallet();
  const { addToast }                    = useApp();
  const { placeBet, placing }           = useBetting();

  const [matches,   setMatches]  = useState([]);
  const [betSlip,   setBetSlip]  = useState([]);
  const [slipOpen,  setSlipOpen] = useState(false);
  const [leagueF,   setLeagueF]  = useState("all");
  const [statusF,   setStatusF]  = useState("all");
  const [stake,     setStake]    = useState("");
  const [expanded,  setExpanded] = useState(null);
  const [now,       setNow]      = useState(Date.now());

  // Single screen-width check → drives which slip to show
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1100);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1100);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Clock tick for countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Match engine
  useEffect(() => {
    initMatchManager();
    return subscribe(setMatches);
  }, []);

  // ── BET SLIP LOGIC ──────────────────────────────────────
  const addBet = useCallback((bet) => {
    // Never add bet for finished match
    if (bet.status === "finished") return;
    setBetSlip(prev => {
      const idx = prev.findIndex(b => b.matchId === bet.matchId);
      if (idx >= 0) {
        if (prev[idx].selection === bet.selection)
          return prev.filter((_, i) => i !== idx);
        const next = [...prev];
        next[idx] = bet;
        return next;
      }
      return [...prev, bet];
    });
    // On mobile open the slip when a bet is added
    if (isMobile) setSlipOpen(true);
  }, [isMobile]);

  const removeBet = useCallback(i => setBetSlip(p => p.filter((_, idx) => idx !== i)), []);
  const clearSlip = useCallback(() => {
    setBetSlip([]);
    setStake("");
    setSlipOpen(false);
  }, []);

  async function handlePlace() {
    if (!connected) {
      const r = await connect();
      if (r?.error) { addToast(r.error, "error"); return; }
    }
    if (betSlip.length === 0) {
      addToast("Add at least one selection.", "warning");
      return;
    }
    if (!stake || parseFloat(stake) <= 0) {
      addToast("Enter a valid USDC stake.", "warning");
      return;
    }
    if (parseFloat(stake) > parseFloat(balance)) {
      addToast("Insufficient USDC balance.", "error");
      return;
    }

    let anyPlaced = false;
    for (const b of betSlip) {
      // Skip demo/virtual matches — only blockchain matches have numeric chainMatchId
      if (typeof b.chainMatchId !== "number") {
        addToast(
          `${b.homeTeam} vs ${b.awayTeam}: Virtual match — on-chain bet requires a contract match ID.`,
          "warning"
        );
        continue;
      }
      try {
        await placeBet({
          matchId:   b.chainMatchId,
          selection: b.selection,
          amount:    stake,
        });
        updateMatchPool(b.matchId, b.selection, Number(stake));
        anyPlaced = true;
      } catch (e) {
        addToast(e.message || "Bet failed.", "error");
        return;
      }
    }
    if (anyPlaced) {
      addToast("✅ Bet placed with USDC!", "success");
      clearSlip();
    }
  }

  // ── FILTER ──────────────────────────────────────────────
  const shown = matches.filter(m => {
    const byL = leagueF === "all" || m.leagueId === leagueF;
    const byS = statusF === "all"
      || m.status === statusF
      || (statusF === "live" && ["first_half", "second_half"].includes(m.status));
    return byL && byS;
  });

  const liveCount = matches.filter(m =>
    ["first_half", "second_half"].includes(m.status)
  ).length;

  const totalOdds = betSlip.reduce((a, b) => a * parseFloat(b.odds || 1), 1);
  const potWin    = stake ? (parseFloat(stake) * totalOdds).toFixed(2) : "0.00";
  const overBal   = stake && parseFloat(stake) > parseFloat(balance);

  // ── RENDER ──────────────────────────────────────────────
  return (
    <div className="fp">

      {/* HERO STRIP */}
      <div className="fp__hero">
        <div className="fp__hero-grid" />
        <div className="fp__hero-orb fp__hero-orb--1" />
        <div className="fp__hero-orb fp__hero-orb--2" />
        <div className="fp__hero-ring fp__hero-ring--1" />
        <div className="fp__hero-ring fp__hero-ring--2" />

        <div className="fp__hero-content fade-up">
          {/* Logo + brand */}
          <div className="fp__hero-brand">
            <div className="fp__hero-logo">
              <img
                src="/logo.png" alt="BlockBet" width={38} height={38}
                style={{ objectFit: "contain" }}
                onError={e => {
                  e.target.style.display = "none";
                  e.target.parentNode.innerHTML =
                    '<span style="font-size:24px;font-weight:900;color:#050608">B</span>';
                }}
              />
            </div>
            <div>
              <div className="fp__hero-name grad">BLOCKBET</div>
              <div className="fp__hero-tagline">VIRTUAL FOOTBALL SPORTSBOOK</div>
            </div>
          </div>

          <h1 className="fp__hero-h1">
            Virtual Football —{" "}
            <span className="grad">Bet with USDC</span>
          </h1>
          <p className="fp__hero-p">
            AI-powered virtual matches · Rated odds · Instant USDC payouts on Arc Testnet
          </p>

          {/* Live stats bar */}
          <div className="fp__hero-stats">
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val" style={{ color: "#10E981" }}>
                {liveCount}
              </span>
              <span className="fp__hero-stat-lbl">LIVE NOW</span>
            </div>
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val">{matches.length}</span>
              <span className="fp__hero-stat-lbl">MATCHES</span>
            </div>
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val" style={{ color: "#10E981" }}>
                {connected ? balance : "—"}
              </span>
              <span className="fp__hero-stat-lbl">USDC BALANCE</span>
            </div>
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val">USDC</span>
              <span className="fp__hero-stat-lbl">CURRENCY</span>
            </div>
          </div>

          {!connected && (
            <Button onClick={connect} style={{ marginTop: 20 }}>
              🦊 Connect Wallet to Bet
            </Button>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="fp__filters-wrap">
        {/* Status filter */}
        <div className="fp__filter-row">
          {[
            { id: "all",      label: "All Matches" },
            { id: "betting",  label: "🕐 Betting"  },
            { id: "live",     label: "🔴 Live"      },
            { id: "halftime", label: "⏸️ HT"        },
            { id: "finished", label: "✅ Done"      },
          ].map(f => (
            <button
              key={f.id}
              className={`fp__flt ${statusF === f.id ? "fp__flt--on" : ""}`}
              onClick={() => setStatusF(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* League filter */}
        <div className="fp__filter-row">
          <button
            className={`fp__league ${leagueF === "all" ? "fp__league--on" : ""}`}
            onClick={() => setLeagueF("all")}
          >
            ⚡ All Leagues
          </button>
          {LEAGUES.map(l => (
            <button
              key={l.id}
              className={`fp__league ${leagueF === l.id ? "fp__league--on" : ""}`}
              onClick={() => setLeagueF(l.id)}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="fp__main">

        {/* MATCH CARDS */}
        <div className="fp__cards">
          {shown.length === 0 ? (
            <Card style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>⚽</div>
              <h3 style={{ marginBottom: 8 }}>No Matches Found</h3>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                The engine is generating fixtures. Matches appear within seconds.
              </p>
            </Card>
          ) : (
            shown.map(m => {
              const sc     = STATUS_CFG[m.status] || STATUS_CFG.betting;
              const isBet  = m.status === "betting";
              const isLive = ["first_half", "second_half"].includes(m.status);
              const isHT   = m.status === "halftime";
              const isDone = m.status === "finished";
              const sel    = betSlip.find(b => b.matchId === m.id);
              const goals  = (m.visibleEvents || []).filter(e => e.type === "goal");
              const countdown = isBet ? m.bettingEndsAt - now : 0;

              return (
                <Card
                  key={m.id}
                  className={`mc ${isLive ? "mc--live" : ""} ${isDone ? "mc--done" : ""}`}
                  style={{ marginBottom: 12 }}
                >
                  {/* Match header */}
                  <div className="mc__head">
                    <span className="mc__league">
                      {m.leagueFlag} {m.leagueName}
                    </span>
                    <Badge color={sc.color}>{sc.label}</Badge>
                    {isLive && (
                      <span className="mc__min">{m.minute}'</span>
                    )}
                    {isHT && (
                      <span className="mc__min" style={{ color: "var(--primary)" }}>HT</span>
                    )}
                    {isDone && m._sim && (
                      <span className="mc__ht">
                        HT {m._sim.firstHalf?.home}–{m._sim.firstHalf?.away}
                      </span>
                    )}
                    {(m.poolHome + m.poolDraw + m.poolAway) > 0 && (
                      <span className="mc__pool">
                        💵 {(m.poolHome + m.poolDraw + m.poolAway).toFixed(0)} USDC
                      </span>
                    )}
                    {/* Countdown for betting-open matches */}
                    {isBet && countdown > 0 && (
                      <span className={`mc__countdown ${countdown < 30000 ? "mc__countdown--urgent" : ""}`}>
                        ⏱️ {formatCountdown(countdown)}
                      </span>
                    )}
                  </div>

                  {/* Teams + score */}
                  <div className="mc__body">
                    <div className="mc__teams">
                      <div className="mc__team">
                        <img
                          src={m.homeLogo} alt={m.homeTeam}
                          className="mc__logo"
                          onError={e => e.target.style.display = "none"}
                        />
                        <span className="mc__name">{m.homeTeam}</span>
                      </div>
                      <div className="mc__center">
                        {isBet
                          ? <span className="mc__vs">VS</span>
                          : (
                            <span className="mc__score">
                              {m.homeScore}
                              <span className="mc__score-sep">–</span>
                              {m.awayScore}
                            </span>
                          )
                        }
                      </div>
                      <div className="mc__team mc__team--r">
                        <span className="mc__name">{m.awayTeam}</span>
                        <img
                          src={m.awayLogo} alt={m.awayTeam}
                          className="mc__logo"
                          onError={e => e.target.style.display = "none"}
                        />
                      </div>
                    </div>

                    {/* ODDS — only when betting is open */}
                    {isBet && !isDone && (
                      <div className="mc__odds">
                        {[
                          { code: 1, l: "1", sub: "Home Win", odds: m.oddsHome },
                          { code: 2, l: "X", sub: "Draw",     odds: m.oddsDraw },
                          { code: 3, l: "2", sub: "Away Win", odds: m.oddsAway },
                        ].map(opt => {
                          const active = sel?.selection === opt.code;
                          return (
                            <button
                              key={opt.code}
                              className={`mc__odd ${active ? "mc__odd--on" : ""}`}
                              onClick={() => addBet({
                                matchId:        m.id,
                                chainMatchId:   m.chainMatchId,
                                homeTeam:       m.homeTeam,
                                awayTeam:       m.awayTeam,
                                selection:      opt.code,
                                selectionLabel: opt.sub,
                                odds:           opt.odds,
                                status:         m.status,
                              })}
                            >
                              <span className="mc__odd-l">{opt.l}</span>
                              <span className="mc__odd-v">{opt.odds}</span>
                              <span className="mc__odd-s">{opt.sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Live odds read-only */}
                    {(isLive || isHT) && (
                      <div className="mc__live-odds">
                        <span>1: {m.oddsHome}</span>
                        <span>X: {m.oddsDraw}</span>
                        <span>2: {m.oddsAway}</span>
                        <Badge color="success" size="sm">🔴 Live</Badge>
                      </div>
                    )}

                    {/* Finished result */}
                    {isDone && m.result && (
                      <div className="mc__result">
                        <span className="mc__result-text">
                          {m.result === 1
                            ? `🏆 ${m.homeTeam}`
                            : m.result === 3
                              ? `🏆 ${m.awayTeam}`
                              : "🤝 Draw"}
                        </span>
                        <Button variant="ghost" size="sm">
                          💰 Claim USDC
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Goal events */}
                  {goals.length > 0 && (
                    <div className="mc__goals">
                      {goals.map((e, i) => (
                        <span key={i} className="mc__goal">
                          ⚽ {e.minute}' {e.team === "home" ? m.homeTeam : m.awayTeam}
                          {e.detail && (
                            <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                              {" "}({e.detail})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats expand toggle */}
                  {isDone && m.stats && (
                    <button
                      className="mc__stats-btn"
                      onClick={() => setExpanded(v => v === m.id ? null : m.id)}
                    >
                      {expanded === m.id ? "▲ Hide Stats" : "▼ Match Statistics"}
                    </button>
                  )}
                  {expanded === m.id && m.stats && (
                    <div className="mc__stats fade-in">
                      {[
                        ["Possession",      m.stats.possession?.map(v => `${v}%`)],
                        ["Shots",           m.stats.shots],
                        ["Shots on Target", m.stats.shotsOnTarget],
                        ["Corners",         m.stats.corners],
                        ["Fouls",           m.stats.fouls],
                        ["Yellow Cards",    m.stats.yellowCards],
                        ["Red Cards",       m.stats.redCards],
                      ].map(([lbl, vals]) => vals && (
                        <div key={lbl} className="mc__stat-row">
                          <span style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{vals[0]}</span>
                          <span style={{ textAlign: "center", fontSize: 10, color: "var(--muted)" }}>{lbl}</span>
                          <span style={{ textAlign: "left", fontWeight: 700, color: "#47D7FF" }}>{vals[1]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* DESKTOP BET SLIP — only above 1100px */}
        {!isMobile && (
          <div className="fp__slip-desk">
            <BetSlipPanel
              slip={betSlip} stake={stake} setStake={setStake}
              totalOdds={totalOdds} potWin={potWin}
              overBal={overBal} balance={balance} connected={connected}
              onRemove={removeBet} onClear={clearSlip}
              onPlace={handlePlace} placing={placing}
            />
          </div>
        )}
      </div>

      {/* MOBILE BET SLIP DRAWER — only below 1100px, only when open */}
      {isMobile && slipOpen && (
        <div className="fp__slip-mob">
          <BetSlipPanel
            slip={betSlip} stake={stake} setStake={setStake}
            totalOdds={totalOdds} potWin={potWin}
            overBal={overBal} balance={balance} connected={connected}
            onRemove={removeBet} onClear={clearSlip}
            onPlace={handlePlace} placing={placing}
            mobile onClose={() => setSlipOpen(false)}
          />
        </div>
      )}

      {/* FAB — only on mobile when slip is closed */}
      {isMobile && !slipOpen && betSlip.length > 0 && (
        <button className="fp__fab" onClick={() => setSlipOpen(true)}>
          🎯 {betSlip.length} Bet{betSlip.length > 1 ? "s" : ""}
          <span className="fp__fab-win"> · Win: {potWin} USDC</span>
        </button>
      )}
    </div>
  );
}

// ── BET SLIP PANEL ──────────────────────────────────────────
function BetSlipPanel({
  slip, stake, setStake, totalOdds, potWin,
  overBal, balance, connected,
  onRemove, onClear, onPlace, placing,
  mobile, onClose,
}) {
  return (
    <div className="slip">
      {/* Head */}
      <div className="slip__head">
        <div className="slip__head-left">
          <span
            className={`slip__dot ${slip.length > 0 ? "slip__dot--on" : ""}`}
          />
          <span className="slip__title">BET SLIP</span>
          {slip.length > 0 && (
            <span className="slip__count">{slip.length}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {slip.length > 0 && (
            <button className="slip__clear" onClick={onClear}>Clear all</button>
          )}
          {mobile && (
            <button className="slip__close" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="slip__body">
        {slip.length === 0 ? (
          <div className="slip__empty">
            <span className="slip__empty-icon">🎯</span>
            <span className="slip__empty-title">No selections yet</span>
            <span className="slip__empty-sub">Click any odds button to add a bet</span>
          </div>
        ) : (
          <>
            {/* Selections */}
            {slip.map((b, i) => (
              <div key={i} className="slip__item">
                <div className="slip__item-info">
                  <span className="slip__item-match">
                    {b.homeTeam} vs {b.awayTeam}
                  </span>
                  <span className="slip__item-pick">{b.selectionLabel}</span>
                </div>
                <div className="slip__item-right">
                  <span className="slip__item-odds">{b.odds}</span>
                  <button
                    className="slip__item-del"
                    onClick={() => onRemove(i)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {/* Stake */}
            <div className="slip__stake">
              <label className="slip__stake-label">STAKE AMOUNT (USDC)</label>
              <div className="slip__stake-input-wrap">
                <input
                  type="number"
                  className={`slip__stake-input ${overBal ? "slip__stake-input--err" : ""}`}
                  placeholder="Enter USDC amount…"
                  value={stake}
                  onChange={e => setStake(e.target.value)}
                  min="1"
                />
                <span className="slip__stake-currency">USDC</span>
              </div>
              {connected && (
                <div className="slip__bal-row">
                  <span>Balance:</span>
                  <strong>{balance} USDC</strong>
                  <button
                    className="slip__max-btn"
                    onClick={() => setStake(balance)}
                  >
                    MAX
                  </button>
                </div>
              )}
              {overBal && (
                <div className="slip__bal-err">
                  ⚠️ Stake exceeds USDC balance
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="slip__summary">
              <div className="slip__sum-row">
                <span>Selections</span>
                <strong>{slip.length}</strong>
              </div>
              <div className="slip__sum-row">
                <span>Total Odds</span>
                <strong style={{ color: "var(--primary)" }}>
                  {totalOdds.toFixed(2)}x
                </strong>
              </div>
              <div className="slip__sum-divider" />
              <div className="slip__sum-row">
                <span>Potential Win</span>
                <strong className="slip__sum-win">
                  {potWin} <span className="slip__sum-usdc">USDC</span>
                </strong>
              </div>
            </div>

            {/* Place bet button */}
            <Button
              fullWidth
              loading={placing}
              disabled={overBal || placing}
              onClick={onPlace}
            >
              {connected ? "⚡ Place Bet with USDC" : "🦊 Connect Wallet to Bet"}
            </Button>

            <div className="slip__footer-note">
              🔒 Settled on Arc blockchain · USDC instant payout
            </div>
          </>
        )}
      </div>
    </div>
  );
}