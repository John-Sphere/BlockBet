import { ClubBadge } from "./ClubBadge";

const STATUS_LABEL = {
  betting: null,
  q1: "Q1", q2: "Q2", halftime: "HT", q3: "Q3", q4: "Q4",
  finished: "FT",
};

function formatKickoff(ts) {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function BasketballMatchCard({ match, selectedSide, onSelectOdd }) {
  const isLive = ["q1", "q2", "halftime", "q3", "q4"].includes(match.status);
  const isFt = match.status === "finished";
  const leading = (a, b) => (a > b ? "leading" : "");

  return (
    <div className={`match-card ${isLive ? "live" : ""}`}>
      <div className="mc-teams">
        <div className="mc-team-row">
          <ClubBadge name={match.homeTeam} size={21} />
          <div className="mc-team-name">{match.homeTeam}</div>
          <div className={`mc-score ${leading(match.homeScore, match.awayScore)}`}>
            {isLive || isFt ? match.homeScore : "—"}
          </div>
        </div>
        <div className="mc-team-row">
          <ClubBadge name={match.awayTeam} size={21} />
          <div className="mc-team-name">{match.awayTeam}</div>
          <div className={`mc-score ${leading(match.awayScore, match.homeScore)}`}>
            {isLive || isFt ? match.awayScore : "—"}
          </div>
        </div>
      </div>

      <div className="mc-status">
        {isLive && <span className="status-pill live">{STATUS_LABEL[match.status]} {Math.round(match.elapsedMinutes)}'</span>}
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
