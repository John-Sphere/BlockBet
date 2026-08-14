import { useEffect, useState } from "react";
import { subscribe, initMatchManager } from "../engine/matchManager";
import { ClubBadge } from "../components/ui/ClubBadge";
import { useBetSlip } from "../context/BetSlipContext";
import "./Football.css";

export default function Football() {
  const [matches, setMatches] = useState([]);
  const { selections, addSelection } = useBetSlip();

  useEffect(() => {
    initMatchManager();
    const unsubscribe = subscribe((snapshot) => setMatches(snapshot));
    return unsubscribe;
  }, []);

  const grouped = matches.reduce((acc, m) => {
    acc[m.leagueName] = acc[m.leagueName] || [];
    acc[m.leagueName].push(m);
    return acc;
  }, {});

  function isPicked(matchId, side) {
    return selections.some((s) => s.matchId === matchId && s.side === side);
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

        <svg width="100%" height="90" viewBox="0 0 400 90" aria-hidden="true">
          <rect x="1" y="1" width="398" height="88" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <line x1="200" y1="1" x2="200" y2="89" stroke="var(--pitch-line)" strokeWidth="1" />
          <circle cx="200" cy="45" r="20" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />

          <path
            className="bb-chalk-path"
            d="M40 65 L110 30 L170 45 L230 25 L290 40"
            pathLength="1"
            stroke="var(--gold)"
            strokeWidth="1.5"
            fill="none"
            markerEnd="url(#arrow)"
          />

          <circle className="bb-chalk-ball" r="3.5" fill="var(--gold)">
            <animateMotion
              dur="3.2s"
              repeatCount="indefinite"
              path="M40 65 L110 30 L170 45 L230 25 L290 40"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>

          <path d="M280 60 L330 40 L370 55" stroke="var(--gold)" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" opacity="0.35" />

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
              {matches.filter((m) => m.status === "first_half" || m.status === "second_half").length}
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
            {leagueMatches.map((match) => {
              const isLive = match.status === "first_half" || match.status === "second_half" || match.status === "halftime";
              const isFinished = match.status === "finished";
              const oddsMap = { home: match.oddsHome, draw: match.oddsDraw, away: match.oddsAway };

              return (
                <div className="bb-match-card" key={match.id}>
                  <div className="bb-match-header">
                    <div className="bb-match-teams">
                      <ClubBadge name={match.homeTeam} size={22} />
                      {match.homeTeam}
                      <span className="vs">vs</span>
                      <ClubBadge name={match.awayTeam} size={22} />
                      {match.awayTeam}
                    </div>
                    {isLive ? (
                      <span className="pill pill-live">● Live {match.minute}'</span>
                    ) : isFinished ? (
                      <span className="pill pill-finished">
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : (
                      <span className="pill pill-open">Betting open</span>
                    )}
                  </div>

                  {!isFinished && (
                    <div className="bb-odds-row">
                      {["home", "draw", "away"].map((side) => (
                        <div
                          key={side}
                          className={`odds-box${isPicked(match.id, side) ? " selected" : ""}`}
                          onClick={() => addSelection(match, side, oddsMap[side])}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="label">{side}</div>
                          <div className="value">{oddsMap[side]?.toFixed(2) ?? "-"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
