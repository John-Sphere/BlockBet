import { useState, useEffect } from "react";
import { Card }  from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { subscribe } from "../engine/matchManager.js";
import { LEAGUES }   from "../data/clubs.js";
import "./MatchHistory.css";

export default function MatchHistory() {
  const [allMatches, setAllMatches]  = useState([]);
  const [finished,   setFinished]    = useState([]);
  const [selected,   setSelected]    = useState(null);
  const [leagueFilter, setFilter]    = useState("all");

  useEffect(() => {
    const unsub = subscribe(matches => {
      setAllMatches(matches);
      setFinished(prev => {
        const fin = matches.filter(m => m.status === "finished");
        // Merge without duplicates
        const existingIds = new Set(prev.map(m => m.id));
        const newOnes = fin.filter(m => !existingIds.has(m.id));
        return [...newOnes, ...prev].slice(0, 100); // keep last 100
      });
    });
    return unsub;
  }, []);

  const shown = leagueFilter === "all"
    ? finished
    : finished.filter(m => m.leagueId === leagueFilter);

  const selectedMatch = finished.find(m => m.id === selected);

  return (
    <div className="history-page">
      <div className="history-head">
        <h1 className="history-title">📊 Match History</h1>
        <p className="history-sub">Completed virtual matches with full statistics</p>
      </div>

      {/* League filter */}
      <div className="history-filters">
        <button className={`hf-btn ${leagueFilter==="all"?"hf-btn--active":""}`} onClick={() => setFilter("all")}>All</button>
        {LEAGUES.map(l => (
          <button key={l.id} className={`hf-btn ${leagueFilter===l.id?"hf-btn--active":""}`} onClick={() => setFilter(l.id)}>
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      <div className="history-layout">
        {/* Match list */}
        <div className="history-list">
          {shown.length === 0 ? (
            <Card style={{ padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:14 }}>📋</div>
              <h3 style={{ color:"var(--white)", marginBottom:8 }}>No Matches Yet</h3>
              <p style={{ color:"var(--gray-400)" }}>Completed matches will appear here.</p>
            </Card>
          ) : (
            shown.map(m => (
              <Card
                key={m.id}
                className={`history-match ${selected === m.id ? "history-match--selected" : ""}`}
                onClick={() => setSelected(m.id === selected ? null : m.id)}
              >
                <div className="hm-league">{m.leagueFlag} {m.leagueName}</div>
                <div className="hm-row">
                  <div className="hm-team">
                    <img src={m.homeLogo} alt="" width={24} height={24} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                    <span className={m.result === 1 ? "hm-winner" : ""}>{m.homeTeam}</span>
                  </div>
                  <div className="hm-score">
                    <span className={m.result === 1 ? "hm-score--win" : ""}>{m.homeScore}</span>
                    {" – "}
                    <span className={m.result === 3 ? "hm-score--win" : ""}>{m.awayScore}</span>
                  </div>
                  <div className="hm-team hm-team--right">
                    <span className={m.result === 3 ? "hm-winner" : ""}>{m.awayTeam}</span>
                    <img src={m.awayLogo} alt="" width={24} height={24} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                  </div>
                </div>
                <div className="hm-footer">
                  <Badge color="ghost">FT</Badge>
                  {m._sim && <span className="hm-ht">HT: {m._sim.firstHalf.home}–{m._sim.firstHalf.away}</span>}
                  <span className="hm-result">
                    {m.result === 1 ? `🏆 ${m.homeTeam}` : m.result === 3 ? `🏆 ${m.awayTeam}` : "🤝 Draw"}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Match detail */}
        {selectedMatch && (
          <div className="history-detail">
            <Card className="hd-card">
              <div className="hd-head">
                <span>{selectedMatch.leagueFlag} {selectedMatch.leagueName}</span>
                <Badge color="ghost">Full Time</Badge>
              </div>
              <div className="hd-scoreline">
                <div className="hd-team">
                  <img src={selectedMatch.homeLogo} alt="" width={48} height={48} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                  <span>{selectedMatch.homeTeam}</span>
                </div>
                <div className="hd-score">
                  {selectedMatch.homeScore} – {selectedMatch.awayScore}
                  <div className="hd-ht">HT: {selectedMatch._sim?.firstHalf?.home}–{selectedMatch._sim?.firstHalf?.away}</div>
                </div>
                <div className="hd-team hd-team--right">
                  <img src={selectedMatch.awayLogo} alt="" width={48} height={48} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                  <span>{selectedMatch.awayTeam}</span>
                </div>
              </div>

              {/* Stats */}
              {selectedMatch.stats && (
                <div className="hd-stats">
                  <h3 className="hd-section-title">Match Statistics</h3>
                  {[
                    ["Possession", selectedMatch.stats.possession.map(v => `${v}%`)],
                    ["Shots", selectedMatch.stats.shots],
                    ["Shots on Target", selectedMatch.stats.shotsOnTarget],
                    ["Corners", selectedMatch.stats.corners],
                    ["Fouls", selectedMatch.stats.fouls],
                    ["Yellow Cards", selectedMatch.stats.yellowCards],
                    ["Red Cards", selectedMatch.stats.redCards],
                  ].map(([label, vals]) => vals && (
                    <div key={label} className="hd-stat-row">
                      <div className="hd-stat-bar-left">
                        <span style={{ fontWeight:700, color:"var(--primary)" }}>{vals[0]}</span>
                        <div className="hd-bar-wrap">
                          <div
                            className="hd-bar hd-bar--home"
                            style={{ width: `${getBarPct(vals[0], vals[1])}%` }}
                          />
                        </div>
                      </div>
                      <span className="hd-stat-label">{label}</span>
                      <div className="hd-stat-bar-right">
                        <div className="hd-bar-wrap">
                          <div
                            className="hd-bar hd-bar--away"
                            style={{ width: `${getBarPct(vals[1], vals[0])}%` }}
                          />
                        </div>
                        <span style={{ fontWeight:700, color:"var(--secondary)" }}>{vals[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {selectedMatch.visibleEvents?.length > 0 && (
                <div className="hd-timeline">
                  <h3 className="hd-section-title">Match Timeline</h3>
                  <div className="hd-events">
                    {selectedMatch.visibleEvents.filter(e => ["goal","yellow_card","red_card","halftime","fulltime"].includes(e.type)).map((e, i) => (
                      <div key={i} className={`hd-event hd-event--${e.team || "neutral"}`}>
                        <span className="hd-event-min">{e.minute}'</span>
                        <span className="hd-event-icon">{eventIcon(e.type)}</span>
                        <span className="hd-event-label">
                          {e.type === "goal"      ? `GOAL — ${e.team === "home" ? selectedMatch.homeTeam : selectedMatch.awayTeam}${e.detail ? ` (${e.detail})` : ""}` :
                           e.type === "yellow_card"? `Yellow Card — ${e.team === "home" ? selectedMatch.homeTeam : selectedMatch.awayTeam}` :
                           e.type === "red_card"  ? `Red Card — ${e.team === "home" ? selectedMatch.homeTeam : selectedMatch.awayTeam}` :
                           e.type === "halftime"  ? `Half Time — ${e.score}` :
                           e.type === "fulltime"  ? `Full Time — ${e.score}` : ""}
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

function getBarPct(val, other) {
  const v = parseFloat(val) || 0;
  const o = parseFloat(other) || 0;
  const total = v + o;
  if (!total) return 50;
  return Math.round((v / total) * 100);
}

function eventIcon(type) {
  const map = { goal:"⚽", yellow_card:"🟨", red_card:"🟥", halftime:"⏸️", fulltime:"🏁", corner:"🚩" };
  return map[type] || "📌";
}