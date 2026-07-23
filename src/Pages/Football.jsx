import { useState, useEffect, useCallback } from "react";
import { useWallet }  from "../context/WalletContext";
import { useApp }     from "../context/AppContext";
import { Card }       from "../components/ui/Card";
import { Button }     from "../components/ui/Button";
import { Badge }      from "../components/ui/Badge";
import { useBetting } from "../hooks/useBetting";
import {
  initMatchManager, subscribe,
  updateMatchPool, pauseEngine, resumeEngine,
} from "../engine/matchManager";
import { LEAGUES } from "../data/clubs";
import "./Football.css";

export default function Football() {
  const { connected, connect, balance } = useWallet();
  const { addToast }                    = useApp();
  const { placeBet, placing }           = useBetting();

  const [matches,      setMatches]   = useState([]);
  const [betSlip,      setBetSlip]   = useState([]);
  const [slipOpen,     setSlipOpen]  = useState(false);
  const [leagueFilter, setLeague]    = useState("all");
  const [statusFilter, setStatus]    = useState("all");
  const [stake,        setStake]     = useState("");
  const [expanded,     setExpanded]  = useState(null);

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe(setMatches);
    return unsub;
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
    setSlipOpen(true);
  }, []);

  const removeBet = useCallback((i) => setBetSlip(p => p.filter((_, idx) => idx !== i)), []);
  const clearSlip = useCallback(() => { setBetSlip([]); setSlipOpen(false); setStake(""); }, []);

  async function handlePlaceBet() {
    if (!connected) {
      const r = await connect();
      if (r?.error) { addToast(r.error, "error"); return; }
    }
    if (!stake || parseFloat(stake) <= 0) { addToast("Enter a valid stake amount.", "warning"); return; }
    if (parseFloat(stake) > parseFloat(balance)) { addToast("Insufficient USDC balance.", "error"); return; }

    for (const b of betSlip) {
      if (typeof b.matchId !== "number") {
        addToast(`Cannot bet on demo match. Only blockchain matches are supported.`, "warning");
        continue;
      }
      try {
        await placeBet({ matchId: b.matchId, selection: b.selection, amount: stake });
        updateMatchPool(b.matchId, b.selection, Number(stake));
      } catch (e) {
        addToast(e.message || "Bet failed.", "error");
        return;
      }
    }
    addToast("✅ Bet placed successfully!", "success");
    clearSlip();
  }

  const shown = matches.filter(m => {
    const byLeague = leagueFilter === "all" || m.leagueId === leagueFilter;
    const byStatus = statusFilter === "all"
      || m.status === statusFilter
      || (statusFilter === "live" && ["first_half","second_half"].includes(m.status));
    return byLeague && byStatus;
  });

  const liveCount = matches.filter(m => ["first_half","second_half"].includes(m.status)).length;

  const statusConfig = {
    betting:     { label:"🕐 Betting Open", color:"warning" },
    first_half:  { label:"🔴 1st Half",     color:"success" },
    halftime:    { label:"⏸️ Half Time",    color:"primary" },
    second_half: { label:"🔴 2nd Half",     color:"success" },
    finished:    { label:"✅ Full Time",    color:"ghost"   },
  };

  return (
    <div className="fp">
      {/* Header */}
      <div className="fp__head">
        <div>
          <h1 className="fp__title">
            ⚽ Virtual Football
            {liveCount > 0 && <Badge color="success" size="md" style={{ marginLeft:10 }}>🔴 {liveCount} Live</Badge>}
          </h1>
          <p className="fp__sub">AI-powered virtual matches · Rated odds · Instant USDC settlement</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>🔄 Refresh</Button>
      </div>

      {/* Status filter */}
      <div className="fp__filters">
        {[
          { id:"all",       label:"All" },
          { id:"betting",   label:"🕐 Betting" },
          { id:"live",      label:"🔴 Live" },
          { id:"halftime",  label:"⏸️ HT" },
          { id:"finished",  label:"✅ Finished" },
        ].map(f => (
          <button
            key={f.id}
            className={`fp__filter-btn ${statusFilter === f.id ? "fp__filter-btn--active" : ""}`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* League tabs */}
      <div className="fp__leagues">
        <button className={`fp__league-btn ${leagueFilter==="all"?"fp__league-btn--active":""}`} onClick={() => setLeague("all")}>⚡ All</button>
        {LEAGUES.map(l => (
          <button
            key={l.id}
            className={`fp__league-btn ${leagueFilter===l.id?"fp__league-btn--active":""}`}
            onClick={() => setLeague(l.id)}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Layout */}
      <div className="fp__layout">
        {/* Matches */}
        <div className="fp__matches">
          {shown.length === 0 ? (
            <Card style={{ padding:"56px 24px", textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>⚽</div>
              <h3 style={{ marginBottom:8 }}>No Matches Found</h3>
              <p style={{ color:"var(--gray-400)" }}>The engine is generating matches. Check back in a moment.</p>
            </Card>
          ) : (
            shown.map(m => {
              const sc  = statusConfig[m.status] || statusConfig.betting;
              const isBetting = m.status === "betting";
              const isLive    = ["first_half","second_half"].includes(m.status);
              const isDone    = m.status === "finished";
              const sel       = betSlip.find(b => b.matchId === m.id);
              const goals     = (m.visibleEvents || []).filter(e => e.type === "goal");

              return (
                <Card key={m.id} style={{ marginBottom:12, overflow:"hidden" }}
                  className={isLive ? "fp__card--live" : ""}>

                  {/* Match header */}
                  <div style={{
                    display:"flex", alignItems:"center", gap:8, padding:"10px 16px",
                    borderBottom:"1px solid var(--border)", background:"rgba(46,199,242,0.02)",
                    flexWrap:"wrap",
                  }}>
                    <span style={{ fontSize:11, color:"var(--primary)", fontWeight:700, flex:1 }}>
                      {m.leagueFlag} {m.leagueName}
                    </span>
                    <Badge color={sc.color}>{sc.label}</Badge>
                    {isLive && <span style={{ fontSize:12, color:"var(--success)", fontWeight:800 }}>{m.minute}'</span>}
                    {isDone && m._sim && (
                      <span style={{ fontSize:11, color:"var(--gray-400)" }}>
                        HT: {m._sim.firstHalf?.home}–{m._sim.firstHalf?.away}
                      </span>
                    )}
                  </div>

                  {/* Teams + Score */}
                  <div style={{ padding:"16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                        <img src={m.homeLogo} alt={m.homeTeam} width={28} height={28}
                          style={{ objectFit:"contain", flexShrink:0 }}
                          onError={e => e.target.style.display="none"} />
                        <span style={{ fontSize:14, fontWeight:700, color:"var(--white)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {m.homeTeam}
                        </span>
                      </div>
                      <div style={{ textAlign:"center", flexShrink:0, minWidth:70 }}>
                        {m.status === "betting"
                          ? <span style={{ fontSize:13, color:"var(--gray-600)", fontWeight:700 }}>VS</span>
                          : <span style={{ fontSize:22, fontWeight:900, letterSpacing:2 }}>{m.homeScore} – {m.awayScore}</span>
                        }
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, flexDirection:"row-reverse" }}>
                        <img src={m.awayLogo} alt={m.awayTeam} width={28} height={28}
                          style={{ objectFit:"contain", flexShrink:0 }}
                          onError={e => e.target.style.display="none"} />
                        <span style={{ fontSize:14, fontWeight:700, color:"var(--white)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right" }}>
                          {m.awayTeam}
                        </span>
                      </div>
                    </div>

                    {/* Odds buttons (betting open only) */}
                    {isBetting && (
                      <div style={{ display:"flex", gap:8 }}>
                        {[
                          { code:1, label:"1", sub:"Home Win", odds:m.oddsHome },
                          { code:2, label:"X", sub:"Draw",     odds:m.oddsDraw },
                          { code:3, label:"2", sub:"Away Win", odds:m.oddsAway },
                        ].map(opt => {
                          const isActive = sel?.selection === opt.code;
                          return (
                            <button
                              key={opt.code}
                              onClick={() => addBet({
                                matchId: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
                                selection: opt.code, selectionLabel: opt.sub, odds: opt.odds,
                              })}
                              style={{
                                flex:1, padding:"10px 4px", textAlign:"center",
                                background: isActive
                                  ? "linear-gradient(135deg,#2EC7F2,#47D7FF)"
                                  : "rgba(46,199,242,0.05)",
                                border:`1px solid ${isActive ? "transparent" : "rgba(46,199,242,0.15)"}`,
                                borderRadius:12, cursor:"pointer", transition:"all 0.2s",
                                boxShadow: isActive ? "0 0 20px rgba(46,199,242,0.25)" : "none",
                              }}
                            >
                              <div style={{ fontSize:9, fontWeight:800, marginBottom:3, color: isActive ? "#050608" : "var(--gray-600)" }}>{opt.label}</div>
                              <div style={{ fontSize:16, fontWeight:900, color: isActive ? "#050608" : "var(--white)" }}>{opt.odds}</div>
                              <div style={{ fontSize:9, color: isActive ? "#050608" : "var(--gray-600)" }}>{opt.sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Live odds read-only */}
                    {isLive && (
                      <div style={{ display:"flex", gap:16, justifyContent:"center", fontSize:13, color:"var(--gray-400)", padding:"6px 0", alignItems:"center" }}>
                        <span>1: {m.oddsHome}</span>
                        <span>X: {m.oddsDraw}</span>
                        <span>2: {m.oddsAway}</span>
                        <span style={{ background:"rgba(16,233,129,0.12)", border:"1px solid rgba(16,233,129,0.3)", color:"var(--success)", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:10 }}>🔴 Live</span>
                      </div>
                    )}

                    {/* Finished result */}
                    {isDone && m.result && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"var(--warning)" }}>
                          {m.result===1 ? `🏆 ${m.homeTeam} Win` : m.result===3 ? `🏆 ${m.awayTeam} Win` : "🤝 Draw"}
                        </span>
                        <Button variant="ghost" size="sm">💰 Claim</Button>
                      </div>
                    )}
                  </div>

                  {/* Goal events */}
                  {goals.length > 0 && (
                    <div style={{ padding:"8px 16px", borderTop:"1px solid var(--border)", display:"flex", flexWrap:"wrap", gap:8, background:"rgba(16,233,129,0.02)" }}>
                      {goals.map((e, i) => (
                        <span key={i} style={{ fontSize:12, color:"var(--success)", fontWeight:600 }}>
                          ⚽ {e.minute}' {e.team==="home" ? m.homeTeam : m.awayTeam}
                          {e.detail && <span style={{ color:"var(--gray-400)", fontWeight:400 }}> ({e.detail})</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats toggle */}
                  {isDone && m.stats && (
                    <button
                      onClick={() => setExpanded(v => v === m.id ? null : m.id)}
                      style={{ width:"100%", padding:9, fontSize:11, color:"var(--gray-400)", background:"none", border:"none", borderTop:"1px solid var(--border)", cursor:"pointer" }}
                    >
                      {expanded === m.id ? "▲ Hide Stats" : "▼ Match Statistics"}
                    </button>
                  )}
                  {expanded === m.id && m.stats && (
                    <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", animation:"fadeIn 0.3s ease" }}>
                      {[
                        ["Possession", m.stats.possession?.map(v => `${v}%`)],
                        ["Shots", m.stats.shots],
                        ["Shots on Target", m.stats.shotsOnTarget],
                        ["Corners", m.stats.corners],
                        ["Fouls", m.stats.fouls],
                        ["Yellow Cards", m.stats.yellowCards],
                        ["Red Cards", m.stats.redCards],
                      ].map(([label, vals]) => vals && (
                        <div key={label} style={{ display:"grid", gridTemplateColumns:"60px 1fr 60px", gap:8, alignItems:"center", marginBottom:8, fontSize:12 }}>
                          <span style={{ textAlign:"right", fontWeight:700, color:"var(--primary)" }}>{vals[0]}</span>
                          <span style={{ textAlign:"center", fontSize:10, color:"var(--gray-400)" }}>{label}</span>
                          <span style={{ textAlign:"left", fontWeight:700, color:"var(--secondary)" }}>{vals[1]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop Bet Slip */}
        <div className="fp__slip-desktop">
          <BetSlipBox
            slip={betSlip} stake={stake} setStake={setStake}
            balance={balance} connected={connected}
            onRemove={removeBet} onClear={clearSlip} onPlace={handlePlaceBet}
            placing={placing}
          />
        </div>
      </div>

      {/* Mobile slip */}
      {slipOpen && (
        <div className="fp__slip-mobile">
          <BetSlipBox
            slip={betSlip} stake={stake} setStake={setStake}
            balance={balance} connected={connected}
            onRemove={removeBet} onClear={clearSlip} onPlace={handlePlaceBet}
            placing={placing} onClose={() => setSlipOpen(false)} mobile
          />
        </div>
      )}

      {/* Mobile FAB */}
      {betSlip.length > 0 && !slipOpen && (
        <button className="fp__fab" onClick={() => setSlipOpen(true)}>
          🎯 {betSlip.length} Selection{betSlip.length > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

/* ── Inline Bet Slip ─────────────────────────────────────── */
function BetSlipBox({ slip, stake, setStake, balance, connected, onRemove, onClear, onPlace, placing, onClose, mobile }) {
  const totalOdds = slip.reduce((a, b) => a * parseFloat(b.odds || 1), 1);
  const potWin    = stake ? (parseFloat(stake) * totalOdds).toFixed(2) : "0.00";
  const overBal   = parseFloat(stake) > parseFloat(balance);

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"var(--bg-raised)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden" }}>
      {/* Head */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background: slip.length ? "var(--success)" : "var(--gray-600)", boxShadow: slip.length ? "0 0 8px var(--success)" : "none" }} />
          <span style={{ fontSize:12, fontWeight:800, letterSpacing:1 }}>BET SLIP</span>
          {slip.length > 0 && (
            <span style={{ background:"var(--primary)", color:"var(--bg-base)", width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>
              {slip.length}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {slip.length > 0 && (
            <button onClick={onClear} style={{ background:"rgba(255,77,109,0.08)", border:"1px solid rgba(255,77,109,0.25)", color:"var(--danger)", padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:600 }}>
              Clear
            </button>
          )}
          {mobile && (
            <button onClick={onClose} style={{ background:"var(--glass)", border:"1px solid var(--border)", color:"var(--gray-400)", width:28, height:28, borderRadius:"50%", fontSize:14 }}>✕</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:14, overflowY:"auto", maxHeight: mobile ? "60vh" : "calc(100vh - 200px)" }}>
        {slip.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--gray-600)" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🎯</div>
            <div style={{ fontSize:13 }}>Click odds to add selections</div>
          </div>
        ) : (
          <>
            {slip.map((b, i) => (
              <div key={i} style={{ background:"rgba(13,23,40,0.6)", border:"1px solid var(--border)", borderRadius:12, padding:12, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>{b.homeTeam} vs {b.awayTeam}</div>
                  <div style={{ fontSize:11, color:"var(--primary)" }}>{b.selectionLabel}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16, fontWeight:900, color:"var(--primary)" }}>{b.odds}</span>
                  <button onClick={() => onRemove(i)} style={{ background:"none", border:"none", color:"var(--danger)", fontSize:16 }}>✕</button>
                </div>
              </div>
            ))}

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:10, color:"var(--gray-600)", fontWeight:700, letterSpacing:1, marginBottom:7 }}>STAKE (USDC)</label>
              <input
                type="number" placeholder="Enter amount…" value={stake}
                onChange={e => setStake(e.target.value)} min="1"
                style={{
                  width:"100%", padding:"12px 14px", borderRadius:12,
                  border:`1px solid ${overBal ? "rgba(255,77,109,0.5)" : "var(--border)"}`,
                  background:"rgba(13,23,40,0.6)", color:"var(--white)", fontSize:15,
                }}
              />
              {connected && (
                <div style={{ display:"flex", gap:6, marginTop:6, fontSize:11, color:"var(--gray-600)", alignItems:"center" }}>
                  Balance: <strong style={{ color:"var(--primary)" }}>{balance} USDC</strong>
                  <button onClick={() => setStake(balance)} style={{ background:"var(--glass)", border:"1px solid var(--border)", color:"var(--primary)", padding:"2px 7px", borderRadius:4, fontSize:10, fontWeight:700 }}>MAX</button>
                </div>
              )}
            </div>

            <div style={{ background:"rgba(13,23,40,0.6)", border:"1px solid var(--border)", borderRadius:12, padding:14, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:"var(--gray-200)" }}>
                <span>Total Odds</span>
                <strong style={{ color:"var(--primary)" }}>{totalOdds.toFixed(2)}x</strong>
              </div>
              <div style={{ height:1, background:"var(--border)", margin:"10px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"var(--gray-200)" }}>
                <span>Potential Win</span>
                <strong style={{ fontSize:18, color:"var(--success)" }}>{potWin} USDC</strong>
              </div>
            </div>

            <Button fullWidth loading={placing} onClick={onPlace}>
              {connected ? "⚡ Place Bet" : "🦊 Connect & Bet"}
            </Button>
            <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"var(--gray-600)" }}>
              🔒 Secured by Arc Testnet Smart Contract
            </div>
          </>
        )}
      </div>
    </div>
  );
}