/**
 * BLOCKBET League Table
 * Real standings (P/W/D/L/GF/GA/GD/Pts), read live from the shared
 * standings.js module — the same source matchManager.js uses to
 * adjust odds based on current club form.
 */

import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { ClubBadge } from "../components/ui/ClubBadge";
import { initMatchManager } from "../engine/matchManager";
import { subscribe, getStandings } from "../engine/standings";
import { LEAGUES } from "../data/clubs";
import "./LeagueTable.css";

export default function LeagueTable() {
  const [leagueId, setLeagueId] = useState(LEAGUES[0].id);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const league = LEAGUES.find((l) => l.id === leagueId);
  const rows = getStandings(leagueId);

  return (
    <div className="lt-page">
      <div className="lt-head">
        <h1 className="lt-title">League table</h1>
        <p className="lt-sub">Live standings from completed virtual matches</p>
      </div>

      <div className="lt-tabs">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            className={`lt-tab ${leagueId === l.id ? "lt-tab--on" : ""}`}
            onClick={() => setLeagueId(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div className="lt-table-head">
          <span className="lt-col-pos">#</span>
          <span className="lt-col-club">Club</span>
          <span>P</span>
          <span>W</span>
          <span>D</span>
          <span>L</span>
          <span>GF</span>
          <span>GA</span>
          <span>GD</span>
          <span>Pts</span>
        </div>
        {rows.length === 0 || rows.every((r) => r.played === 0) ? (
          <div className="lt-empty">
            No matches completed yet in {league?.name}. The table fills in as virtual matches finish.
          </div>
        ) : (
          rows.map((r, i) => {
            const gd = r.gf - r.ga;
            return (
              <div key={r.name} className={`lt-row ${i < 4 ? "lt-row--top" : ""} ${i >= rows.length - 3 ? "lt-row--bottom" : ""}`}>
                <span className="lt-col-pos">{i + 1}</span>
                <span className="lt-col-club">
                  <ClubBadge name={r.name} size={20} />
                  {r.name}
                </span>
                <span>{r.played}</span>
                <span>{r.won}</span>
                <span>{r.drawn}</span>
                <span>{r.lost}</span>
                <span>{r.gf}</span>
                <span>{r.ga}</span>
                <span>{gd > 0 ? `+${gd}` : gd}</span>
                <span className="lt-col-pts">{r.points}</span>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
