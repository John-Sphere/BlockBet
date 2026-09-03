/**
 * BLOCKBET League Table
 * Real standings, read live from the shared standings modules — the
 * same source each sport's match manager uses to adjust odds based
 * on current club form. Football uses points-based standings
 * (3-1-0); Basketball uses real win-percentage standings, since the
 * NBA has no draws.
 */

import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { ClubBadge } from "../components/ui/ClubBadge";
import { initMatchManager } from "../engine/matchManager";
import { subscribe as subscribeFootball, getStandings as getFootballStandings } from "../engine/standings";
import { LEAGUES } from "../data/clubs";
import { initBasketballMatchManager } from "../engine/basketballMatchManager";
import { subscribe as subscribeBasketball, getStandings as getBasketballStandings } from "../engine/basketballStandings";
import { BASKETBALL_LEAGUES } from "../data/basketballClubs";
import "./LeagueTable.css";

const SPORTS = [
  { id: "football", name: "Football", leagues: LEAGUES },
  { id: "basketball", name: "Basketball", leagues: BASKETBALL_LEAGUES },
];

export default function LeagueTable() {
  const [sportId, setSportId] = useState("football");
  const [leagueId, setLeagueId] = useState(LEAGUES[0].id);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    initMatchManager();
    initBasketballMatchManager();
    const unsubF = subscribeFootball(() => forceUpdate((n) => n + 1));
    const unsubB = subscribeBasketball(() => forceUpdate((n) => n + 1));
    return () => { unsubF(); unsubB(); };
  }, []);

  const sport = SPORTS.find((s) => s.id === sportId);

  function handleSportChange(id) {
    setSportId(id);
    const firstLeague = SPORTS.find((s) => s.id === id).leagues[0];
    setLeagueId(firstLeague.id);
  }

  const league = sport.leagues.find((l) => l.id === leagueId) || sport.leagues[0];
  const rows = sportId === "football" ? getFootballStandings(league.id) : getBasketballStandings(league.id);
  const isBasketball = sportId === "basketball";

  return (
    <div className="lt-page">
      <div className="lt-head">
        <h1 className="lt-title">League table</h1>
        <p className="lt-sub">Live standings from completed virtual matches</p>
      </div>

      <div className="lt-tabs">
        {SPORTS.map((s) => (
          <button
            key={s.id}
            className={`lt-tab ${sportId === s.id ? "lt-tab--on" : ""}`}
            onClick={() => handleSportChange(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {sport.leagues.length > 1 && (
        <div className="lt-tabs">
          {sport.leagues.map((l) => (
            <button
              key={l.id}
              className={`lt-tab ${leagueId === l.id ? "lt-tab--on" : ""}`}
              onClick={() => setLeagueId(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <Card style={{ overflow: "hidden" }}>
        <div className="lt-table-head">
          <span className="lt-col-pos">#</span>
          <span className="lt-col-club">Club</span>
          <span>P</span>
          <span>W</span>
          <span>{isBasketball ? "—" : "D"}</span>
          <span>L</span>
          <span>{isBasketball ? "PF" : "GF"}</span>
          <span>{isBasketball ? "PA" : "GA"}</span>
          <span>{isBasketball ? "DIFF" : "GD"}</span>
          <span>{isBasketball ? "—" : "Pts"}</span>
        </div>
        {rows.length === 0 || rows.every((r) => r.played === 0) ? (
          <div className="lt-empty">
            No {isBasketball ? "games" : "matches"} completed yet in {league?.name}. The table fills in as virtual {isBasketball ? "games" : "matches"} finish.
          </div>
        ) : (
          rows.map((r, i) => {
            const gf = isBasketball ? r.pf : r.gf;
            const ga = isBasketball ? r.pa : r.ga;
            const gd = gf - ga;
            return (
              <div key={r.name} className={`lt-row ${i < 4 ? "lt-row--top" : ""} ${i >= rows.length - 3 ? "lt-row--bottom" : ""}`}>
                <span className="lt-col-pos">{i + 1}</span>
                <span className="lt-col-club">
                  <ClubBadge name={r.name} size={20} />
                  {r.name}
                </span>
                <span>{r.played}</span>
                <span>{r.won}</span>
                <span>{isBasketball ? "—" : r.drawn}</span>
                <span>{r.lost}</span>
                <span>{gf}</span>
                <span>{ga}</span>
                <span>{gd > 0 ? `+${gd}` : gd}</span>
                <span className={isBasketball ? "" : "lt-col-pts"}>{isBasketball ? "—" : r.points}</span>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
