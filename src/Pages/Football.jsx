import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { subscribe, initMatchManager } from "../engine/matchManager";
import { ClubBadge } from "../components/ui/ClubBadge";
import { useBetSlip } from "../context/BetSlipContext";
import "./Football.css";

export default function Football() {
  const [matches, setMatches] = useState([]);
  const { selections, addSelection } = useBetSlip();
  const [searchParams] = useSearchParams();
  const leagueFilter = searchParams.get("league");
  const liveOnly = searchParams.get("live") === "1";

  useEffect(() => {
    initMatchManager();
    const unsubscribe = subscribe((snapshot) => setMatches(snapshot));
    return unsubscribe;
  }, []);

  let visibleMatches = matches;
  if (leagueFilter) {
    visibleMatches = visibleMatches.filter((m) => m.leagueId === leagueFilter);
  }
  if (liveOnly) {
    visibleMatches = visibleMatches.filter(
      (m) => m.status === "first_half" || m.status === "second_half" || m.status === "halftime"
    );
  }

  const grouped = visibleMatches.reduce((acc, m) => {
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

        <svg width="100%" height="110" viewBox="0 0 400 110" aria-hidden="true">
          {/* Pitch outline */}
          <rect x="6" y="4" width="388" height="102" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          {/* Halfway line */}
          <line x1="200" y1="4" x2="200" y2="106" stroke="var(--pitch-line)" strokeWidth="1" />
          {/* Center circle + spot */}
          <circle cx="200" cy="55" r="22" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <circle cx="200" cy="55" r="1.4" fill="var(--pitch-line)" />

          {/* Left penalty box + six-yard box */}
          <rect x="6" y="24" width="42" height="62" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <rect x="6" y="38" width="16" height="34" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <path d="M48 34 A 18 18 0 0 1 48 76" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          {/* Left goal frame */}
          <rect x="0" y="44" width="6" height="22" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />

          {/* Right penalty box + six-yard box */}
          <rect x="352" y="24" width="42" height="62" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <rect x="378" y="38" width="16" height="34" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          <path d="M352 34 A 18 18 0 0 0 352 76" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
          {/* Right goal frame */}
          <rect x="394" y="44" width="6" height="22" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />

          {/* Chalk-drawn attacking move */}
          <path
            className="bb-chalk-path"
            d="M55 78 L120 40 L175 58 L235 30 L300 50 L360 45"
            pathLength="1"
            stroke="var(--gold)"
            strokeWidth="1.75"
            fill="none"
            markerEnd="url(#arrow)"
          />

          <circle className="bb-chalk-ball" r="4" fill="var(--gold)">
            <animateMotion
              dur="3.6s"
              repeatCount="indefinite"
              path="M55 78 L120 40 L175 58 L235 30 L300 50 L360 45"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>

          <defs>
            <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--gold)" />
            </marker>
          </defs>
        </svg>

        <div className="bb-hero-stats">
          <div className="bb-hero-stat">
            <div className="num">{visibleMatches.length}</div>
            <div className="label">Matches today</div>
          </div>
          <div className="bb-hero-stat">
            <div className="num">
              {visibleMatches.filter((m) => m.status === "first_half" || m.status === "second_half").length}
            </div>
            <div className="label">Live now</div>
          </div>
        </div>
      </section>

      {liveOnly && visibleMatches.length === 0 && (
        <div style={{ padding: "0 28px 24px", color: "var(--chalk-dim)", fontSize: 13 }}>
          No matches are live right now — check back in a moment as kickoffs roll through.
        </div>
      )}

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
