/**
 * BLOCKBET League Table
 * Real standings (P/W/D/L/GF/GA/GD/Pts) computed live from finished
 * matches, per league. Replaces the old player-activity leaderboard —
 * this is a football table, not a betting leaderboard.
 */

import { useState, useEffect, useRef } from "react";
import { Card } from "../components/ui/Card";
import { ClubBadge } from "../components/ui/ClubBadge";
import {
  subscribe,
  initMatchManager,
  getCurrentMatches,
} from "../engine/matchManager";
import { LEAGUES, CLUBS } from "../data/clubs";
import "./LeagueTable.css";

function emptyStandings() {
  const table = {};
  CLUBS.forEach((c) => {
    table[c.name] = {
      name: c.name,
      leagueId: c.leagueId,
      played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, points: 0,
    };
  });
  return table;
}

function applyResult(table, match) {
  const home = table[match.homeTeam];
  const away = table[match.awayTeam];
  if (!home || !away) return;

  home.played++; away.played++;
  home.gf += match.homeScore; home.ga += match.awayScore;
  away.gf += match.awayScore; away.ga += match.homeScore;

  if (match.homeScore > match.awayScore) {
    home.won++; home.points += 3;
    away.lost++;
  } else if (match.homeScore < match.awayScore) {
    away.won++; away.points += 3;
    home.lost++;
  } else {
    home.drawn++; away.drawn++;
    home.points += 1; away.points += 1;
  }
}

export default function LeagueTable() {
  const [leagueId, setLeagueId] = useState(LEAGUES[0].id);
  const [standings, setStandings] = useState(emptyStandings);
  const countedIds = useRef(new Set());

  useEffect(() => {
    initMatchManager();

    // Count any matches already finished at mount
    const current = getCurrentMatches();
    const table = emptyStandings();
    current.filter((m) => m.status === "finished").forEach((m) => {
      countedIds.current.add(m.id);
      applyResult(table, m);
    });
    setStandings(table);

    const unsub = subscribe((matches) => {
      const newlyFinished = matches.filter(
        (m) => m.status === "finished" && !countedIds.current.has(m.id)
      );
      if (!newlyFinished.length) return;
      setStandings((prev) => {
        const next = { ...prev };
        // Deep-copy only the rows that will change
        newlyFinished.forEach((m) => {
          countedIds.current.add(m.id);
          if (next[m.homeTeam]) next[m.homeTeam] = { ...next[m.homeTeam] };
          if (next[m.awayTeam]) next[m.awayTeam] = { ...next[m.awayTeam] };
          applyResult(next, m);
        });
        return next;
      });
    });

    return unsub;
  }, []);

  const league = LEAGUES.find((l) => l.id === leagueId);
  const rows = Object.values(standings)
    .filter((r) => r.leagueId === leagueId)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

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
        {rows.length === 0 ? (
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
