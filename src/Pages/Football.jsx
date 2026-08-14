import { useState } from "react";
import { ClubBadge } from "../components/ui/ClubBadge";
import "./Football.css";

// NOTE: adjust the field names below (match.home, match.odds.home, etc.)
// to match whatever shape your matchManager.js / oddsEngine.js actually
// produce. This assumes each match looks roughly like:
// { id, league, home, away, status, kickoffIn, minute, odds: { home, draw, away } }

export default function Football({ matches = [] }) {
  const [selected, setSelected] = useState({});

  const grouped = matches.reduce((acc, m) => {
    acc[m.league] = acc[m.league] || [];
    acc[m.league].push(m);
    return acc;
  }, {});

  function pickOdds(matchId, side) {
    setSelected((prev) => ({ ...prev, [matchId]: side }));
  }

  return (
    <div>
      <section className="bb-hero">
        <div className="eyebrow">Live formation · Arc testnet</div>
        <h1 className="bb-hero-title">
          Read the pitch.
          <br />
          <span>Back the play.</span>
        </h1>
        <p className="bb-hero-sub">
          Odds set from real club form, drawn out like a manager's
          chalkboard. Settle instantly in USDC.
        </p>

        <svg width="100%" height="90" viewBox="0 0 400 90" style={{ opacity: 0.85 }} aria-hidden="true">
          <rect x="1" y="1" width="398" height="88" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <line x1="200" y1="1" x2="200" y2="89" stroke="var(--pitch-line)" strokeWidth="1" />
          <circle cx="200" cy="45" r="20" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <path d="M40 65 L110 30 L170 45 L230 25" stroke="var(--gold)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
          <defs>
            <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--gold)" />
            </marker>
          </defs>
        </svg>

        <div className="bb-hero-stats">
          <div className="bb-hero-stat">
            <div className="num">{matches.length}</div>
            <div className="label">Matches today</div>
          </div>
          <div className="bb-hero-stat">
            <div className="num">
              {matches.filter((m) => m.status === "live").length}
            </div>
            <div className="label">Live now</div>
          </div>
        </div>
      </section>

      {Object.entries(grouped).map(([league, leagueMatches]) => (
        <section className="bb-league-section" key={league}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {league}
          </div>
          <div className="bb-match-grid">
            {leagueMatches.map((match) => (
              <div className="bb-match-card" key={match.id}>
                <div className="bb-match-header">
                  <div className="bb-match-teams">
                    <ClubBadge name={match.home} size={22} />
                    {match.home}
                    <span className="vs">vs</span>
                    <ClubBadge name={match.away} size={22} />
                    {match.away}
                  </div>
                  {match.status === "live" ? (
                    <span className="pill pill-live">● Live {match.minute}'</span>
                  ) : match.status === "finished" ? (
                    <span className="pill pill-finished">Finished</span>
                  ) : (
                    <span className="pill pill-open">
                      Kick-off {match.kickoffIn}
                    </span>
                  )}
                </div>

                {match.status !== "finished" && (
                  <div className="bb-odds-row">
                    {["home", "draw", "away"].map((side) => (
                      <div
                        key={side}
                        className={`odds-box${
                          selected[match.id] === side ? " selected" : ""
                        }`}
                        onClick={() => pickOdds(match.id, side)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="label">{side}</div>
                        <div className="value">
                          {match.odds?.[side]?.toFixed(2) ?? "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
