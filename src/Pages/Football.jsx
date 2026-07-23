import { useState, useEffect, useCallback } from "react";
import { useWallet }     from "../context/WalletContext";
import { useApp }        from "../context/AppContext";
import { initMatchManager, subscribe, updateMatchPool } from "../engine/matchManager.js";
import { useBetting }    from "../hooks/useBetting.js";
import { MatchCard }     from "../components/betting/MatchCard";
import { BetSlip }       from "../components/betting/BetSlip";
import { Card }          from "../components/ui/Card";
import { Badge }         from "../components/ui/Badge";
import { Button }        from "../components/ui/Button";
import { LEAGUES }       from "../data/clubs.js";
import "./Football.css";

export default function Football() {
  const { connected, connect } = useWallet();
  const { addToast }           = useApp();
  const { placeBet, placing }  = useBetting();

  const [matches,      setMatches]     = useState([]);
  const [betSlip,      setBetSlip]     = useState([]);
  const [slipOpen,     setSlipOpen]    = useState(false);
  const [leagueFilter, setLeague]      = useState("all");
  const [statusFilter, setStatus]      = useState("all");
  const [selectedMatch,setSelected]    = useState(null);
  const [isMobile,     setIsMobile]    = useState(window.innerWidth < 768);

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe(setMatches);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => { unsub(); window.removeEventListener("resize", onResize); };
  }, []);

  const addBet = useCallback((bet) => {
    setBetSlip(prev => {
      const idx = prev.findIndex(b => b.matchId === bet.matchId);
      if (idx >= 0) {
        if (prev[idx].selection === bet.selection) return prev.filter((_, i) => i !== idx);
        const next = [...prev]; next[idx] = bet; return next;
      }
      return [...prev, bet];
    });
    if (isMobile) setSlipOpen(true);
  }, [isMobile]);

  const removeBet = useCallback((i) => setBetSlip(p => p.filter((_, idx) => idx !== i)), []);
  const clearSlip = useCallback(() => { setBetSlip([]); setSlipOpen(false); }, []);

  const handlePlaceBet = useCallback(async ({ stake }) => {
    if (!connected) {
      const r = await connect();
      if (r?.error) { addToast(r.error, "error"); return; }
    }
    for (const b of betSlip) {
      try {
        await placeBet({ matchId: b.matchId, selection: b.selection, amount: stake });
        updateMatchPool(b.matchId, b.selection, Number(stake));
      } catch (e) {
        addToast(e.message || "Bet failed", "error");
        return;
      }
    }
    addToast("✅ All bets placed!", "success");
    clearSlip();
  }, [betSlip, connected, connect, placeBet, addToast, clearSlip]);

  // Filter matches
  const shown = matches.filter(m => {
    const byLeague = leagueFilter === "all" || m.leagueId === leagueFilter;
    const byStatus = statusFilter === "all" || m.status === statusFilter ||
      (statusFilter === "live" && ["first_half","second_half"].includes(m.status));
    return byLeague && byStatus;
  });

  // Count live
  const liveCount = matches.filter(m => ["first_half","second_half"].includes(m.status)).length;

  return (
    <div className="football-page">

      {/* Page header */}
      <div className="fp-header">
        <div>
          <h1 className="fp-title">
            ⚽ Virtual Football
            {liveCount > 0 && (
              <Badge color="success" size="md" style={{ marginLeft:12 }}>
                🔴 {liveCount} Live
              </Badge>
            )}
          </h1>
          <p className="fp-sub">
            AI-powered virtual matches · Rated odds · Instant USDC settlement
          </p>
        </div>
        <div className="fp-header-actions">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="fp-filters">
        {[
          { id:"all",       label:"All Matches" },
          { id:"betting",   label:"🕐 Betting Open" },
          { id:"live",      label:"🔴 Live" },
          { id:"halftime",  label:"⏸️ Half Time" },
          { id:"finished",  label:"✅ Finished" },
        ].map(f => (
          <button
            key={f.id}
            className={`fp-filter ${statusFilter === f.id ? "fp-filter--active" : ""}`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* League tabs */}
      <div className="fp-leagues">
        <button
          className={`fp-league-tab ${leagueFilter === "all" ? "fp-league-tab--active" : ""}`}
          onClick={() => setLeague("all")}
        >
          ⚡ All Leagues
        </button>
        {LEAGUES.map(l => (
          <button
            key={l.id}
            className={`fp-league-tab ${leagueFilter === l.id ? "fp-league-tab--active" : ""}`}
            onClick={() => setLeague(l.id)}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="fp-layout">

        {/* Match list */}
        <div className="fp-matches">
          {shown.length === 0 ? (
            <Card style={{ padding:"56px 24px", textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>⚽</div>
              <h3 style={{ color:"var(--white)", marginBottom:8 }}>No Matches Found</h3>
              <p style={{ color:"var(--gray-400)" }}>
                The engine is generating matches. Check back in a moment.
              </p>
            </Card>
          ) : (
            shown.map(m => (
              <EnhancedMatchCard
                key={m.id}
                match={m}
                onAddBet={addBet}
                betSlip={betSlip}
                onSelect={() => setSelected(m.id === selectedMatch ? null : m.id)}
                expanded={m.id === selectedMatch}
              />
            ))
          )}
        </div>

        {/* Desktop bet slip */}
        {!isMobile && (
          <div className="fp-slip">
            <BetSlip
              slip={betSlip}
              onRemove={removeBet}
              onClear={clearSlip}
              onPlaceBet={handlePlaceBet}
            />
          </div>
        )}
      </div>

      {/* Mobile: floating slip */}
      {isMobile && slipOpen && (
        <div className="fp-mobile-slip">
          <BetSlip
            slip={betSlip}
            onRemove={removeBet}
            onClear={clearSlip}
            onPlaceBet={handlePlaceBet}
            mobile
            onClose={() => setSlipOpen(false)}
          />
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && betSlip.length > 0 && !slipOpen && (
        <button className="fp-fab" onClick={() => setSlipOpen(true)}>
          🎯 {betSlip.length} Selection{betSlip.length > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

// ── ENHANCED MATCH CARD ──────────────────────────────────────────────────────

function EnhancedMatchCard({ match: m, onAddBet, betSlip, onSelect, expanded }) {
  const sel = betSlip?.find(b => b.matchId === m.id);

  const statusConfig = {
    betting:     { label:"🕐 Betting Open",  color:"warning" },
    first_half:  { label:"🔴 1st Half",      color:"success" },
    halftime:    { label:"⏸️ Half Time",     color:"primary" },
    second_half: { label:"🔴 2nd Half",      color:"success" },
    finished:    { label:"✅ Full Time",     color:"ghost"   },
  };
  const sc = statusConfig[m.status] || statusConfig.betting;

  const goalEvents  = (m.visibleEvents || []).filter(e => e.type === "goal");
  const isBettingOpen = m.status === "betting";
  const isLive       = ["first_half","second_half"].includes(m.status);
  const isFinished   = m.status === "finished";

  return (
    <Card className={`emc ${isLive ? "emc--live" : ""} ${isFinished ? "emc--finished" : ""}`}>

      {/* League + Status */}
      <div className="emc__head">
        <span className="emc__league">{m.leagueFlag} {m.leagueName}</span>
        <Badge color={sc.color}>{sc.label}</Badge>
        {isLive && <span className="emc__min">{m.minute}'</span>}
        {isFinished && m._sim && (
          <span className="emc__ht">HT: {m._sim.firstHalf.home}–{m._sim.firstHalf.away}</span>
        )}
      </div>

      {/* Teams + Score */}
      <div className="emc__body">
        <div className="emc__teams">
          <div className="emc__team">
            <img src={m.homeLogo} alt={m.homeTeam} className="emc__logo" onError={e => e.target.style.display="none"} />
            <span className="emc__name">{m.homeTeam}</span>
          </div>
          <div className="emc__center">
            {m.status === "betting"
              ? <span className="emc__vs">VS</span>
              : <span className="emc__score">{m.homeScore} <span>–</span> {m.awayScore}</span>
            }
          </div>
          <div className="emc__team emc__team--away">
            <span className="emc__name">{m.awayTeam}</span>
            <img src={m.awayLogo} alt={m.awayTeam} className="emc__logo" onError={e => e.target.style.display="none"} />
          </div>
        </div>

        {/* Pool sizes */}
        {(m.poolHome + m.poolDraw + m.poolAway) > 0 && (
          <div className="emc__pools">
            <span>Pool: {(m.poolHome + m.poolDraw + m.poolAway).toFixed(0)} USDC</span>
          </div>
        )}

        {/* Odds buttons */}
        {isBettingOpen && (
          <div className="emc__odds">
            {[
              { code:1, label:"1", odds:m.oddsHome, sublabel:"Home Win", color:"var(--primary)"   },
              { code:2, label:"X", odds:m.oddsDraw, sublabel:"Draw",     color:"var(--warning)"  },
              { code:3, label:"2", odds:m.oddsAway, sublabel:"Away Win", color:"var(--secondary)" },
            ].map(opt => (
              <button
                key={opt.code}
                className={`emc__odd ${sel?.selection === opt.code ? "emc__odd--active" : ""}`}
                onClick={() => onAddBet({
                  matchId: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
                  selection: opt.code, selectionLabel: opt.sublabel, odds: opt.odds,
                })}
                style={{ "--odd-color": opt.color }}
              >
                <span className="emc__odd-label">{opt.label}</span>
                <span className="emc__odd-val">{opt.odds}</span>
                <span className="emc__odd-sub">{opt.sublabel}</span>
              </button>
            ))}
          </div>
        )}

        {/* Live odds (read only) */}
        {isLive && (
          <div className="emc__live-odds">
            <span>1: {m.oddsHome}</span>
            <span>X: {m.oddsDraw}</span>
            <span>2: {m.oddsAway}</span>
            <span className="emc__live-badge">🔴 Live</span>
          </div>
        )}

        {/* Claim button */}
        {isFinished && m.result && (
          <div className="emc__result">
            <div className="emc__result-text">
              {m.result === 1 ? `🏆 ${m.homeTeam} Win` : m.result === 3 ? `🏆 ${m.awayTeam} Win` : "🤝 Draw"}
            </div>
            <Button variant="ghost" size="sm" onClick={() => alert(`Claim for match ${m.id}`)}>
              💰 Claim Winnings
            </Button>
          </div>
        )}
      </div>

      {/* Goal events ticker */}
      {goalEvents.length > 0 && (
        <div className="emc__goals">
          {goalEvents.map((e, i) => (
            <span key={i} className="emc__goal">
              ⚽ {e.minute}' {e.team === "home" ? m.homeTeam : m.awayTeam}
              {e.detail && <span className="emc__goal-type"> ({e.detail})</span>}
            </span>
          ))}
        </div>
      )}

      {/* Match stats (finished) */}
      {isFinished && m.stats && (
        <button className="emc__expand-btn" onClick={onSelect}>
          {expanded ? "▲ Hide Stats" : "▼ Match Statistics"}
        </button>
      )}

      {expanded && isFinished && m.stats && (
        <div className="emc__stats">
          {[
            ["Possession", m.stats.possession.map(v => `${v}%`)],
            ["Shots", m.stats.shots],
            ["Shots on Target", m.stats.shotsOnTarget],
            ["Corners", m.stats.corners],
            ["Fouls", m.stats.fouls],
            ["Yellow Cards", m.stats.yellowCards],
            ["Red Cards", m.stats.redCards],
          ].map(([label, vals]) => vals && (
            <div key={label} className="emc__stat-row">
              <span className="emc__stat-home">{vals[0]}</span>
              <span className="emc__stat-label">{label}</span>
              <span className="emc__stat-away">{vals[1]}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}