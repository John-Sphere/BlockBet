import { useState, useEffect } from "react";
import { Card }    from "../components/ui/Card";
import { Badge }   from "../components/ui/Badge";
import { subscribe, initMatchManager } from "../engine/matchManager";
import { LEAGUES } from "../data/clubs";
import "./MatchHistory.css";

function eventIcon(type) {
  const m = { goal:"⚽", yellow_card:"🟨", red_card:"🟥", halftime:"⏸️", fulltime:"🏁" };
  return m[type] || "📌";
}

function barPct(val, other) {
  const v = parseFloat(val)||0, o = parseFloat(other)||0;
  const t = v+o; if (!t) return 50;
  return Math.round((v/t)*100);
}

export default function MatchHistory() {
  const [finished,  setFinished]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [leagueF,   setLeagueF]   = useState("all");

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe(matches => {
      const fin = matches.filter(m => m.status === "finished");
      setFinished(prev => {
        const ids = new Set(prev.map(m => m.id));
        const next = fin.filter(m => !ids.has(m.id));
        return [...next, ...prev].slice(0, 100);
      });
    });
    return unsub;
  }, []);

  const shown = leagueF === "all" ? finished : finished.filter(m => m.leagueId === leagueF);
  const det   = finished.find(m => m.id === selected);

  return (
    <div className="mh-page">
      <div className="mh-head">
        <h1 className="mh-title">📊 Match History</h1>
        <p className="mh-sub">Completed virtual matches with full statistics</p>
      </div>

      {/* League filter */}
      <div className="mh-filters">
        <button className={`mh-filter ${leagueF==="all"?"mh-filter--active":""}`} onClick={() => setLeagueF("all")}>All</button>
        {LEAGUES.map(l => (
          <button key={l.id} className={`mh-filter ${leagueF===l.id?"mh-filter--active":""}`} onClick={() => setLeagueF(l.id)}>
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      <div className="mh-layout">
        {/* Match list */}
        <div className="mh-list">
          {shown.length === 0 ? (
            <Card style={{ padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:14 }}>📋</div>
              <h3 style={{ marginBottom:8 }}>No Matches Yet</h3>
              <p style={{ color:"var(--gray-400)" }}>Completed matches will appear here automatically.</p>
            </Card>
          ) : (
            shown.map(m => (
              <Card
                key={m.id}
                style={{ padding:"14px 18px", cursor:"pointer", marginBottom:10, border: selected===m.id?"1px solid rgba(46,199,242,0.4)":"1px solid var(--border)" }}
                onClick={() => setSelected(m.id===selected?null:m.id)}
              >
                <div style={{ fontSize:10, color:"var(--primary)", fontWeight:700, marginBottom:8 }}>
                  {m.leagueFlag} {m.leagueName}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                    <img src={m.homeLogo} alt="" width={24} height={24} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                    <span style={{ fontSize:13, fontWeight:700, color: m.result===1?"var(--warning)":"var(--white)" }}>{m.homeTeam}</span>
                  </div>
                  <div style={{ textAlign:"center", minWidth:60, fontSize:20, fontWeight:900 }}>
                    <span style={{ color: m.result===1?"var(--success)":m.result===3?"var(--success)":"var(--white)" }}>{m.homeScore}</span>
                    {" – "}
                    <span style={{ color: m.result===3?"var(--success)":m.result===1?"var(--white)":"var(--white)" }}>{m.awayScore}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, flexDirection:"row-reverse" }}>
                    <img src={m.awayLogo} alt="" width={24} height={24} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                    <span style={{ fontSize:13, fontWeight:700, color: m.result===3?"var(--warning)":"var(--white)" }}>{m.awayTeam}</span>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:11 }}>
                  <Badge color="ghost">FT</Badge>
                  {m._sim && <span style={{ color:"var(--gray-400)" }}>HT: {m._sim.firstHalf?.home}–{m._sim.firstHalf?.away}</span>}
                  <span style={{ marginLeft:"auto", color:"var(--warning)", fontWeight:700 }}>
                    {m.result===1?`🏆 ${m.homeTeam}`:m.result===3?`🏆 ${m.awayTeam}`:"🤝 Draw"}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        {det && (
          <div className="mh-detail">
            <Card style={{ overflow:"hidden" }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 18px", borderBottom:"1px solid var(--border)", fontSize:12, color:"var(--primary)", fontWeight:700 }}>
                <span>{det.leagueFlag} {det.leagueName}</span>
                <Badge color="ghost">Full Time</Badge>
              </div>

              {/* Score */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"20px 18px", borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flex:1 }}>
                  <img src={det.homeLogo} alt="" width={44} height={44} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                  <span style={{ fontSize:13, fontWeight:700, textAlign:"center" }}>{det.homeTeam}</span>
                </div>
                <div style={{ textAlign:"center", minWidth:80 }}>
                  <div style={{ fontSize:28, fontWeight:900 }}>{det.homeScore} – {det.awayScore}</div>
                  {det._sim && <div style={{ fontSize:11, color:"var(--gray-400)", marginTop:4 }}>HT: {det._sim.firstHalf?.home}–{det._sim.firstHalf?.away}</div>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flex:1 }}>
                  <img src={det.awayLogo} alt="" width={44} height={44} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                  <span style={{ fontSize:13, fontWeight:700, textAlign:"center" }}>{det.awayTeam}</span>
                </div>
              </div>

              {/* Stats */}
              {det.stats && (
                <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ fontSize:12, fontWeight:800, marginBottom:14 }}>Match Statistics</div>
                  {[
                    ["Possession",      det.stats.possession?.map(v=>`${v}%`)],
                    ["Shots",           det.stats.shots],
                    ["Shots on Target", det.stats.shotsOnTarget],
                    ["Corners",         det.stats.corners],
                    ["Fouls",           det.stats.fouls],
                    ["Yellow Cards",    det.stats.yellowCards],
                    ["Red Cards",       det.stats.redCards],
                  ].map(([label, vals]) => vals && (
                    <div key={label} style={{ display:"grid", gridTemplateColumns:"1fr 110px 1fr", gap:8, alignItems:"center", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
                        <span style={{ fontWeight:700, color:"var(--primary)", fontSize:13 }}>{vals[0]}</span>
                        <div style={{ width:60, height:4, background:"var(--bg-card)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ width:`${barPct(vals[0],vals[1])}%`, height:"100%", background:"var(--primary)", borderRadius:2 }} />
                        </div>
                      </div>
                      <span style={{ textAlign:"center", fontSize:10, color:"var(--gray-400)" }}>{label}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:60, height:4, background:"var(--bg-card)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ width:`${barPct(vals[1],vals[0])}%`, height:"100%", background:"var(--secondary)", borderRadius:2 }} />
                        </div>
                        <span style={{ fontWeight:700, color:"var(--secondary)", fontSize:13 }}>{vals[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {det.visibleEvents?.length > 0 && (
                <div style={{ padding:"14px 18px" }}>
                  <div style={{ fontSize:12, fontWeight:800, marginBottom:12 }}>Timeline</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {det.visibleEvents
                      .filter(e => ["goal","yellow_card","red_card","halftime","fulltime"].includes(e.type))
                      .map((e, i) => (
                        <div key={i} style={{
                          display:"flex", alignItems:"center", gap:10, padding:"6px 10px",
                          borderRadius:8, fontSize:12,
                          background: e.team==="home"?"rgba(46,199,242,0.06)":e.team==="away"?"rgba(71,215,255,0.06)":"rgba(255,255,255,0.03)",
                        }}>
                          <span style={{ fontSize:11, color:"var(--gray-400)", minWidth:30, fontWeight:700 }}>{e.minute}'</span>
                          <span style={{ fontSize:14 }}>{eventIcon(e.type)}</span>
                          <span style={{ color:"var(--gray-200)", fontWeight:600 }}>
                            {e.type==="goal"
                              ? `GOAL — ${e.team==="home"?det.homeTeam:det.awayTeam}${e.detail?` (${e.detail})`:""}`
                              : e.type==="yellow_card" ? `Yellow — ${e.team==="home"?det.homeTeam:det.awayTeam}`
                              : e.type==="red_card"    ? `Red Card — ${e.team==="home"?det.homeTeam:det.awayTeam}`
                              : e.type==="halftime"    ? `Half Time — ${e.score}`
                              : e.type==="fulltime"    ? `Full Time — ${e.score}` : ""}
                          </span>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}