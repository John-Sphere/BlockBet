/**
 * BLOCKBET Match History
 * Loads already-finished matches on mount AND listens for new ones.
 * No more "No Matches Yet" when matches have already completed.
 */

import { useState, useEffect, useRef } from "react";
import { Card }  from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
  subscribe,
  initMatchManager,
  getCurrentMatches,
} from "../engine/matchManager";
import { LEAGUES } from "../data/clubs";
import "./MatchHistory.css";

function eventIcon(type) {
  return { goal:"⚽", yellow_card:"🟨", red_card:"🟥", halftime:"⏸️", fulltime:"🏁" }[type] || "📌";
}

function barPct(a, b) {
  const va = parseFloat(a) || 0;
  const vb = parseFloat(b) || 0;
  const t  = va + vb;
  return t ? Math.round((va / t) * 100) : 50;
}

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function MatchHistory() {
  const [finished,  setFinished]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [leagueF,   setLeagueF]   = useState("all");
  const seenIds = useRef(new Set());

  useEffect(() => {
    initMatchManager();

    // Load any already-finished matches immediately on mount
    const current = getCurrentMatches();
    const done    = current.filter(m => m.status === "finished");
    if (done.length) {
      done.forEach(m => seenIds.current.add(m.id));
      setFinished(done);
    }

    // Subscribe for future completions
    const unsub = subscribe(matches => {
      const newDone = matches.filter(
        m => m.status === "finished" && !seenIds.current.has(m.id)
      );
      if (newDone.length) {
        newDone.forEach(m => seenIds.current.add(m.id));
        setFinished(prev => [...newDone, ...prev].slice(0, 150));
      }
    });

    return unsub;
  }, []);

  const shown = leagueF === "all"
    ? finished
    : finished.filter(m => m.leagueId === leagueF);

  const det = finished.find(m => m.id === selected);

  return (
    <div className="mh">
      {/* Header */}
      <div className="mh__head">
        <div>
          <h1 className="mh__title">📊 Match History</h1>
          <p className="mh__sub">
            {finished.length > 0
              ? `${finished.length} completed match${finished.length > 1 ? "es" : ""}`
              : "Matches appear here as they finish"}
          </p>
        </div>
      </div>

      {/* League filter */}
      <div className="mh__filters">
        <button
          className={`mh__flt ${leagueF === "all" ? "mh__flt--on" : ""}`}
          onClick={() => setLeagueF("all")}
        >
          ⚡ All
        </button>
        {LEAGUES.map(l => (
          <button
            key={l.id}
            className={`mh__flt ${leagueF === l.id ? "mh__flt--on" : ""}`}
            onClick={() => setLeagueF(l.id)}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      <div className="mh__layout">

        {/* Match list */}
        <div className="mh__list">
          {shown.length === 0 ? (
            <Card style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
              <h3 style={{ marginBottom: 8 }}>No Matches Yet</h3>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Completed matches will appear here automatically as the engine runs.
              </p>
            </Card>
          ) : (
            shown.map(m => (
              <Card
                key={m.id}
                style={{
                  padding: "14px 18px", marginBottom: 10, cursor: "pointer",
                  border: selected === m.id
                    ? "1px solid rgba(46,199,242,0.45)"
                    : "1px solid var(--border)",
                }}
                onClick={() => setSelected(m.id === selected ? null : m.id)}
              >
                <div className="mh__row-league">
                  <span>{m.leagueFlag} {m.leagueName}</span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    {timeAgo(m.finishedAt)}
                  </span>
                </div>
                <div className="mh__row-teams">
                  <div className="mh__row-team">
                    <img
                      src={m.homeLogo} alt={m.homeTeam}
                      width={24} height={24}
                      style={{ objectFit: "contain" }}
                      onError={e => e.target.style.display = "none"}
                    />
                    <span className={m.result === 1 ? "mh__winner" : ""}>
                      {m.homeTeam}
                    </span>
                  </div>
                  <div className="mh__row-score">
                    <span className={m.result === 1 ? "mh__score-win" : ""}>{m.homeScore}</span>
                    <span className="mh__score-sep">–</span>
                    <span className={m.result === 3 ? "mh__score-win" : ""}>{m.awayScore}</span>
                  </div>
                  <div className="mh__row-team mh__row-team--r">
                    <span className={m.result === 3 ? "mh__winner" : ""}>
                      {m.awayTeam}
                    </span>
                    <img
                      src={m.awayLogo} alt={m.awayTeam}
                      width={24} height={24}
                      style={{ objectFit: "contain" }}
                      onError={e => e.target.style.display = "none"}
                    />
                  </div>
                </div>
                <div className="mh__row-footer">
                  <Badge color="ghost">FT</Badge>
                  {m._sim && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      HT {m._sim.firstHalf?.home}–{m._sim.firstHalf?.away}
                    </span>
                  )}
                  <span className="mh__row-result">
                    {m.result === 1
                      ? `🏆 ${m.homeTeam}`
                      : m.result === 3
                        ? `🏆 ${m.awayTeam}`
                        : "🤝 Draw"}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        {det && (
          <div className="mh__detail">
            <Card style={{ overflow: "hidden" }}>

              {/* Detail header */}
              <div className="mh__det-head">
                <span>{det.leagueFlag} {det.leagueName}</span>
                <Badge color="ghost">Full Time</Badge>
              </div>

              {/* Scoreline */}
              <div className="mh__det-score">
                <div className="mh__det-team">
                  <img src={det.homeLogo} alt={det.homeTeam} width={44} height={44}
                    style={{ objectFit: "contain" }}
                    onError={e => e.target.style.display = "none"} />
                  <span>{det.homeTeam}</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 30, fontWeight: 900 }}>
                    {det.homeScore} – {det.awayScore}
                  </div>
                  {det._sim && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      HT: {det._sim.firstHalf?.home}–{det._sim.firstHalf?.away}
                    </div>
                  )}
                </div>
                <div className="mh__det-team mh__det-team--r">
                  <img src={det.awayLogo} alt={det.awayTeam} width={44} height={44}
                    style={{ objectFit: "contain" }}
                    onError={e => e.target.style.display = "none"} />
                  <span>{det.awayTeam}</span>
                </div>
              </div>

              {/* Stats */}
              {det.stats && (
                <div className="mh__det-section">
                  <div className="mh__det-section-title">Match Statistics</div>
                  {[
                    ["Possession",      det.stats.possession?.map(v => `${v}%`)],
                    ["Shots",           det.stats.shots],
                    ["Shots on Target", det.stats.shotsOnTarget],
                    ["Corners",         det.stats.corners],
                    ["Fouls",           det.stats.fouls],
                    ["Yellow Cards",    det.stats.yellowCards],
                    ["Red Cards",       det.stats.redCards],
                  ].map(([label, vals]) => vals && (
                    <div key={label} className="mh__stat-row">
                      <div className="mh__stat-home">
                        <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: 13 }}>{vals[0]}</span>
                        <div className="mh__stat-bar-wrap">
                          <div className="mh__stat-bar mh__stat-bar--h"
                            style={{ width: `${barPct(vals[0], vals[1])}%` }} />
                        </div>
                      </div>
                      <span className="mh__stat-label">{label}</span>
                      <div className="mh__stat-away">
                        <div className="mh__stat-bar-wrap">
                          <div className="mh__stat-bar mh__stat-bar--a"
                            style={{ width: `${barPct(vals[1], vals[0])}%` }} />
                        </div>
                        <span style={{ fontWeight: 700, color: "var(--primary2, #47D7FF)", fontSize: 13 }}>{vals[1]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {det.visibleEvents?.length > 0 && (
                <div className="mh__det-section">
                  <div className="mh__det-section-title">Timeline</div>
                  {det.visibleEvents
                    .filter(e => ["goal","yellow_card","red_card","halftime","fulltime"].includes(e.type))
                    .map((e, i) => (
                      <div
                        key={i}
                        className={`mh__event mh__event--${e.team || "neutral"}`}
                      >
                        <span className="mh__event-min">{e.minute}'</span>
                        <span className="mh__event-icon">{eventIcon(e.type)}</span>
                        <span className="mh__event-text">
                          {e.type === "goal"
                            ? `GOAL — ${e.team === "home" ? det.homeTeam : det.awayTeam}${e.detail ? ` (${e.detail})` : ""}`
                            : e.type === "yellow_card"
                              ? `Yellow — ${e.team === "home" ? det.homeTeam : det.awayTeam}`
                              : e.type === "red_card"
                                ? `Red Card — ${e.team === "home" ? det.homeTeam : det.awayTeam}`
                                : e.type === "halftime"
                                  ? `Half Time — ${e.score || ""}`
                                  : e.type === "fulltime"
                                    ? `Full Time — ${e.score || ""}`
                                    : ""}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}