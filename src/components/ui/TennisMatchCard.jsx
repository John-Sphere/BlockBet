import { ClubBadge } from "./ClubBadge";

function formatKickoff(ts) {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TennisMatchCard({ match, selectedSide, onSelectOdd }) {
  const isLive = match.status === "live";
  const isFt = match.status === "finished";
  const leading = (a, b) => (a > b ? "leading" : "");

  const finalSetsA = isFt ? match.sim.setsA : match.setsA;
  const finalSetsB = isFt ? match.sim.setsB : match.setsB;

  return (
    <div className={`match-card ${isLive ? "live" : ""}`}>
      <div className="mc-teams">
        <div className="mc-team-row">
          <ClubBadge name={match.homeTeam} size={21} />
          <div className="mc-team-name">{match.homeTeam}</div>
          <div className={`mc-score ${leading(finalSetsA, finalSetsB)}`}>
            {isLive || isFt ? finalSetsA : "—"}
          </div>
        </div>
        <div className="mc-team-row">
          <ClubBadge name={match.awayTeam} size={21} />
          <div className="mc-team-name">{match.awayTeam}</div>
          <div className={`mc-score ${leading(finalSetsB, finalSetsA)}`}>
            {isLive || isFt ? finalSetsB : "—"}
          </div>
        </div>
      </div>

      <div className="mc-status">
        {isLive && (
          <>
            <span className="status-pill live">SET {match.currentSet}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--chalk-dim)", marginTop: 4 }}>
              {match.gamesA}–{match.gamesB}
            </span>
          </>
        )}
        {isFt && <span className="status-pill ft">FT</span>}
        {!isLive && !isFt && <span className="status-pill open">{formatKickoff(match.kickOffAt)}</span>}
      </div>

      <div>
        <div className="mc-odds">
          {isFt ? (
            <>
              <button className="odd-btn disabled" disabled>{match.oddsHome?.toFixed(2)}</button>
              <button className="odd-btn disabled" disabled>{match.oddsAway?.toFixed(2)}</button>
            </>
          ) : (
            <>
              <OddButton label="Home" value={match.oddsHome} active={selectedSide === "home"} onClick={() => onSelectOdd(match, "home", match.oddsHome)} />
              <OddButton label="Away" value={match.oddsAway} active={selectedSide === "away"} onClick={() => onSelectOdd(match, "away", match.oddsAway)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OddButton({ label, value, active, onClick }) {
  if (value == null) return null;
  return (
    <button className={`odd-btn ${active ? "selected" : ""}`} onClick={onClick}>
      <span className="k">{label}</span>
      {value.toFixed(2)}
    </button>
  );
}
