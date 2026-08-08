import { useState, useEffect, useCallback } from "react";
import { useWallet }  from "../context/WalletContext";
import { useApp }     from "../context/AppContext";
import { Card }       from "../components/ui/Card";
import { Button }     from "../components/ui/Button";
import { Badge }      from "../components/ui/Badge";
import { useBetting } from "../hooks/useBetting";
import {
  initMatchManager, subscribe, updateMatchPool,
} from "../engine/matchManager";
import { LEAGUES } from "../data/clubs";
import "./Football.css";

const STATUS_CONFIG = {
  betting:     { label:"🕐 Betting Open", color:"warning" },
  first_half:  { label:"🔴 1st Half",     color:"success" },
  halftime:    { label:"⏸️ Half Time",    color:"primary" },
  second_half: { label:"🔴 2nd Half",     color:"success" },
  finished:    { label:"✅ Full Time",    color:"ghost"   },
};

export default function Football() {
  const { connected, connect, balance, shortAddr } = useWallet();
  const { addToast }   = useApp();
  const { placeBet, placing } = useBetting();

  const [matches,   setMatches]  = useState([]);
  const [betSlip,   setBetSlip]  = useState([]);
  const [slipOpen,  setSlipOpen] = useState(false);
  const [leagueF,   setLeagueF]  = useState("all");
  const [statusF,   setStatusF]  = useState("all");
  const [stake,     setStake]    = useState("");
  const [expanded,  setExpanded] = useState(null);

  useEffect(() => {
    initMatchManager();
    return subscribe(setMatches);
  }, []);

  const addBet = useCallback((bet) => {
    setBetSlip(prev => {
      const idx = prev.findIndex(b => b.matchId === bet.matchId);
      if (idx >= 0) {
        if (prev[idx].selection === bet.selection) return prev.filter((_, i) => i !== idx);
        const n = [...prev]; n[idx] = bet; return n;
      }
      return [...prev, bet];
    });
    setSlipOpen(true);
  }, []);

  const removeBet = useCallback(i => setBetSlip(p => p.filter((_, idx) => idx !== i)), []);
  const clearSlip = useCallback(() => { setBetSlip([]); setSlipOpen(false); setStake(""); }, []);

  async function handlePlace() {
    if (!connected) {
      const r = await connect();
      if (r?.error) { addToast(r.error, "error"); return; }
    }
    if (!stake || parseFloat(stake) <= 0) { addToast("Enter a valid USDC stake.", "warning"); return; }
    if (parseFloat(stake) > parseFloat(balance)) { addToast("Insufficient USDC balance.", "error"); return; }
    for (const b of betSlip) {
      if (typeof b.matchId !== "number") { addToast("Demo match — blockchain bets only.", "warning"); continue; }
      try {
        await placeBet({ matchId:b.matchId, selection:b.selection, amount:stake });
        updateMatchPool(b.matchId, b.selection, Number(stake));
      } catch (e) { addToast(e.message || "Bet failed.", "error"); return; }
    }
    addToast("✅ Bet placed with USDC!", "success");
    clearSlip();
  }

  const shown = matches.filter(m => {
    const byL = leagueF === "all" || m.leagueId === leagueF;
    const byS = statusF === "all"
      || m.status === statusF
      || (statusF === "live" && ["first_half","second_half"].includes(m.status));
    return byL && byS;
  });

  const liveCount = matches.filter(m => ["first_half","second_half"].includes(m.status)).length;
  const totalOdds = betSlip.reduce((a, b) => a * parseFloat(b.odds || 1), 1);
  const potWin    = stake ? (parseFloat(stake) * totalOdds).toFixed(2) : "0.00";
  const overBal   = parseFloat(stake) > parseFloat(balance);

  return (
    <div className="fp">

      {/* ── HERO STRIP ── */}
      <div className="fp__hero">
        <div className="fp__hero-bg" />
        <div className="fp__hero-content">
          {/* Logo + brand */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{
              width:52, height:52, borderRadius:12,
              background:"linear-gradient(135deg,#2EC7F2,#47D7FF)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 28px rgba(46,199,242,0.45)",
            }}>
              <img src="/logo.png" alt="BlockBet" width={38} height={38} style={{ objectFit:"contain" }}
                onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML='<span style="font-size:26px;font-weight:900;color:#050608">B</span>'; }} />
            </div>
            <div>
              <div className="grad" style={{ fontSize:26, fontWeight:900, letterSpacing:1 }}>BLOCKBET</div>
              <div style={{ fontSize:11, color:"var(--muted)", letterSpacing:2, fontWeight:600 }}>VIRTUAL FOOTBALL SPORTSBOOK</div>
            </div>
          </div>

          <h1 className="fp__hero-h1">
            Virtual Football — <span className="grad">Bet with USDC</span>
          </h1>
          <p className="fp__hero-p">
            AI-powered matches · Rated odds · Instant USDC settlement on Arc blockchain
          </p>

          {/* Live stats */}
          <div className="fp__hero-stats">
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val" style={{ color:"var(--success)" }}>{liveCount}</span>
              <span className="fp__hero-stat-lbl">Live Now</span>
            </div>
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val">{matches.length}</span>
              <span className="fp__hero-stat-lbl">Total Matches</span>
            </div>
            {connected && (
              <div className="fp__hero-stat">
                <span className="fp__hero-stat-val" style={{ color:"var(--success)" }}>{balance}</span>
                <span className="fp__hero-stat-lbl">USDC Balance</span>
              </div>
            )}
            <div className="fp__hero-stat">
              <span className="fp__hero-stat-val">USDC</span>
              <span className="fp__hero-stat-lbl">Currency</span>
            </div>
          </div>

          {/* CTA */}
          {!connected && (
            <div style={{ marginTop:20 }}>
              <Button onClick={connect}>🦊 Connect Wallet to Bet</Button>
            </div>
          )}
        </div>

        {/* Decorative rings */}
        <div className="fp__ring fp__ring-1" />
        <div className="fp__ring fp__ring-2" />
      </div>

      {/* ── FILTERS ── */}
      <div className="fp__filters-wrap">
        <div className="fp__filters">
          {[
            { id:"all",      label:"All" },
            { id:"betting",  label:"🕐 Betting" },
            { id:"live",     label:"🔴 Live" },
            { id:"halftime", label:"⏸️ HT" },
            { id:"finished", label:"✅ Done" },
          ].map(f => (
            <button key={f.id} className={`fp__flt ${statusF===f.id?"fp__flt--on":""}`} onClick={() => setStatusF(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="fp__leagues">
          <button className={`fp__league ${leagueF==="all"?"fp__league--on":""}`} onClick={() => setLeagueF("all")}>⚡ All</button>
          {LEAGUES.map(l => (
            <button key={l.id} className={`fp__league ${leagueF===l.id?"fp__league--on":""}`} onClick={() => setLeagueF(l.id)}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="fp__main">

        {/* Match cards */}
        <div className="fp__cards">
          {shown.length === 0 ? (
            <Card style={{ padding:"60px 24px", textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>⚽</div>
              <h3 style={{ marginBottom:8 }}>No Matches Found</h3>
              <p style={{ color:"var(--muted)", fontSize:13 }}>The engine is generating fixtures. Check back shortly.</p>
            </Card>
          ) : (
            shown.map(m => {
              const sc  = STATUS_CONFIG[m.status] || STATUS_CONFIG.betting;
              const isBet  = m.status === "betting";
              const isLive = ["first_half","second_half"].includes(m.status);
              const isDone = m.status === "finished";
              const sel    = betSlip.find(b => b.matchId === m.id);
              const goals  = (m.visibleEvents || []).filter(e => e.type === "goal");

              return (
                <Card key={m.id} className={`mc ${isLive?"mc--live":""}`} style={{ marginBottom:12 }}>

                  {/* Match header */}
                  <div className="mc__head">
                    <span className="mc__league">{m.leagueFlag} {m.leagueName}</span>
                    <Badge color={sc.color}>{sc.label}</Badge>
                    {isLive && <span className="mc__min">{m.minute}'</span>}
                    {isDone && m._sim && <span className="mc__ht">HT {m._sim.firstHalf?.home}–{m._sim.firstHalf?.away}</span>}
                    {/* USDC pool */}
                    {(m.poolHome+m.poolDraw+m.poolAway) > 0 && (
                      <span className="mc__pool">💵 {(m.poolHome+m.poolDraw+m.poolAway).toFixed(0)} USDC</span>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="mc__body">
                    <div className="mc__teams">
                      <div className="mc__team">
                        <img src={m.homeLogo} alt={m.homeTeam} className="mc__logo" onError={e => e.target.style.display="none"} />
                        <span className="mc__name">{m.homeTeam}</span>
                      </div>
                      <div className="mc__center">
                        {m.status === "betting"
                          ? <span className="mc__vs">VS</span>
                          : <span className="mc__score">{m.homeScore}<span>–</span>{m.awayScore}</span>
                        }
                      </div>
                      <div className="mc__team mc__team--r">
                        <span className="mc__name">{m.awayTeam}</span>
                        <img src={m.awayLogo} alt={m.awayTeam} className="mc__logo" onError={e => e.target.style.display="none"} />
                      </div>
                    </div>

                    {/* Odds - betting open */}
                    {isBet && (
                      <div className="mc__odds">
                        {[
                          { code:1, l:"1", sub:"Home Win", odds:m.oddsHome },
                          { code:2, l:"X", sub:"Draw",     odds:m.oddsDraw },
                          { code:3, l:"2", sub:"Away Win", odds:m.oddsAway },
                        ].map(opt => {
                          const active = sel?.selection === opt.code;
                          return (
                            <button
                              key={opt.code}
                              className={`mc__odd ${active?"mc__odd--on":""}`}
                              onClick={() => addBet({ matchId:m.id, homeTeam:m.homeTeam, awayTeam:m.awayTeam, selection:opt.code, selectionLabel:opt.sub, odds:opt.odds })}
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
                    {isLive && (
                      <div className="mc__live-odds">
                        <span>1: {m.oddsHome}</span>
                        <span>X: {m.oddsDraw}</span>
                        <span>2: {m.oddsAway}</span>
                        <Badge color="success">🔴 Live</Badge>
                      </div>
                    )}

                    {/* Finished */}
                    {isDone && m.result && (
                      <div className="mc__result">
                        <span className="mc__result-text">
                          {m.result===1?`🏆 ${m.homeTeam}`:m.result===3?`🏆 ${m.awayTeam}`:"🤝 Draw"}
                        </span>
                        <Button variant="ghost" size="sm">💰 Claim USDC</Button>
                      </div>
                    )}
                  </div>

                  {/* Goal events */}
                  {goals.length > 0 && (
                    <div className="mc__goals">
                      {goals.map((e, i) => (
                        <span key={i} className="mc__goal">
                          ⚽ {e.minute}' {e.team==="home"?m.homeTeam:m.awayTeam}
                          {e.detail&&<span style={{color:"var(--muted)",fontWeight:400}}> ({e.detail})</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats toggle */}
                  {isDone && m.stats && (
                    <button className="mc__stats-btn" onClick={() => setExpanded(v => v===m.id?null:m.id)}>
                      {expanded===m.id?"▲ Hide Stats":"▼ Match Stats"}
                    </button>
                  )}
                  {expanded===m.id && m.stats && (
                    <div className="mc__stats">
                      {[
                        ["Possession", m.stats.possession?.map(v=>`${v}%`)],
                        ["Shots", m.stats.shots],
                        ["Shots on Target", m.stats.shotsOnTarget],
                        ["Corners", m.stats.corners],
                        ["Fouls", m.stats.fouls],
                        ["Yellow Cards", m.stats.yellowCards],
                        ["Red Cards", m.stats.redCards],
                      ].map(([lbl, vals]) => vals && (
                        <div key={lbl} className="mc__stat-row">
                          <span style={{textAlign:"right",fontWeight:700,color:"var(--primary)"}}>{vals[0]}</span>
                          <span style={{textAlign:"center",fontSize:10,color:"var(--muted)"}}>{lbl}</span>
                          <span style={{textAlign:"left",fontWeight:700,color:"var(--primary2)"}}>{vals[1]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* ── DESKTOP BET SLIP ── */}
        <div className="fp__slip-desk">
          <SlipPanel
            slip={betSlip} stake={stake} setStake={setStake}
            totalOdds={totalOdds} potWin={potWin} overBal={overBal}
            balance={balance} connected={connected}
            onRemove={removeBet} onClear={clearSlip} onPlace={handlePlace}
            placing={placing}
          />
        </div>
      </div>

      {/* ── MOBILE SLIP ── */}
      {slipOpen && (
        <div className="fp__slip-mob">
          <SlipPanel
            slip={betSlip} stake={stake} setStake={setStake}
            totalOdds={totalOdds} potWin={potWin} overBal={overBal}
            balance={balance} connected={connected}
            onRemove={removeBet} onClear={clearSlip} onPlace={handlePlace}
            placing={placing} onClose={() => setSlipOpen(false)} mobile
          />
        </div>
      )}

      {/* FAB */}
      {betSlip.length > 0 && !slipOpen && (
        <button className="fp__fab" onClick={() => setSlipOpen(true)}>
          🎯 {betSlip.length} Bet{betSlip.length>1?"s":""} · Win: {potWin} USDC
        </button>
      )}
    </div>
  );
}

/* ── BET SLIP COMPONENT ─────────────────────────────────── */
function SlipPanel({ slip, stake, setStake, totalOdds, potWin, overBal, balance, connected, onRemove, onClear, onPlace, placing, onClose, mobile }) {
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* Head */}
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(46,199,242,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:slip.length?"var(--success)":"var(--muted)", boxShadow:slip.length?"0 0 8px var(--success)":"none" }} />
          <span style={{ fontSize:12, fontWeight:800, letterSpacing:1.5 }}>BET SLIP</span>
          {slip.length>0&&<span style={{ background:"var(--primary)", color:"var(--bg)", width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>{slip.length}</span>}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {slip.length>0&&<button onClick={onClear} style={{ background:"rgba(255,77,109,0.09)", border:"1px solid rgba(255,77,109,0.26)", color:"var(--danger)", padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:600 }}>Clear</button>}
          {mobile&&<button onClick={onClose} style={{ background:"var(--glass)", border:"1px solid var(--border)", color:"var(--muted)", width:28, height:28, borderRadius:"50%", fontSize:13 }}>✕</button>}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:14, overflowY:"auto", maxHeight:mobile?"62vh":"calc(100vh - 260px)" }}>
        {slip.length===0 ? (
          <div style={{ textAlign:"center", padding:"44px 0", color:"var(--muted)" }}>
            <div style={{ fontSize:38, marginBottom:12 }}>🎯</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>No selections yet</div>
            <div style={{ fontSize:12 }}>Click any odds to add a bet</div>
          </div>
        ) : (
          <>
            {slip.map((b, i) => (
              <div key={i} style={{ background:"rgba(13,23,40,0.65)", border:"1px solid var(--border)", borderRadius:12, padding:12, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>{b.homeTeam} vs {b.awayTeam}</div>
                  <div style={{ fontSize:11, color:"var(--primary)" }}>{b.selectionLabel}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:17, fontWeight:900, color:"var(--primary)" }}>{b.odds}</span>
                  <button onClick={() => onRemove(i)} style={{ background:"none", border:"none", color:"var(--danger)", fontSize:16 }}>✕</button>
                </div>
              </div>
            ))}

            {/* Stake input */}
            <div style={{ margin:"14px 0" }}>
              <label style={{ display:"block", fontSize:10, color:"var(--muted)", fontWeight:700, letterSpacing:1, marginBottom:7 }}>STAKE AMOUNT (USDC)</label>
              <div style={{ position:"relative" }}>
                <input
                  type="number" value={stake} onChange={e=>setStake(e.target.value)}
                  placeholder="Enter USDC amount…" min="1"
                  style={{
                    width:"100%", padding:"12px 50px 12px 14px",
                    borderRadius:12, border:`1px solid ${overBal?"rgba(255,77,109,0.5)":"var(--border)"}`,
                    background:"rgba(13,23,40,0.65)", color:"var(--white)", fontSize:15,
                  }}
                />
                <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"var(--muted)", fontWeight:700 }}>USDC</span>
              </div>
              {connected && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, fontSize:11, color:"var(--muted)" }}>
                  <span>Balance:</span>
                  <strong style={{ color:"var(--success)" }}>{balance} USDC</strong>
                  <button onClick={() => setStake(balance)} style={{ marginLeft:"auto", background:"var(--glass)", border:"1px solid var(--border)", color:"var(--primary)", padding:"2px 7px", borderRadius:4, fontSize:10, fontWeight:700 }}>MAX</button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div style={{ background:"rgba(13,23,40,0.65)", border:"1px solid var(--border)", borderRadius:12, padding:14, marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8, color:"var(--gray)" }}>
                <span>Selections</span><strong>{slip.length}</strong>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8, color:"var(--gray)" }}>
                <span>Total Odds</span><strong style={{ color:"var(--primary)" }}>{totalOdds.toFixed(2)}x</strong>
              </div>
              <div style={{ height:1, background:"var(--border)", margin:"10px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"var(--gray)" }}>
                <span>Potential Win</span>
                <strong style={{ fontSize:20, color:"var(--success)" }}>{potWin} <span style={{ fontSize:12, color:"var(--muted)" }}>USDC</span></strong>
              </div>
            </div>

            <Button fullWidth loading={placing} onClick={onPlace}>
              {connected ? "⚡ Place Bet with USDC" : "🦊 Connect Wallet to Bet"}
            </Button>
            <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"var(--muted)" }}>
              🔒 Settled on Arc blockchain • USDC instant payout
            </div>
          </>
        )}
      </div>
    </div>
  );
}