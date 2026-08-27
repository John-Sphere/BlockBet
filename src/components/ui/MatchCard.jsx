import PitchViz from "../charts/PitchViz";
import { ClubBadge } from "./ClubBadge";

const FORM_COLOR = { W: "w", D: "d", L: "l" };
function FormDots({ form = [] }) {
  return (
    <div className="form-dots">
      {form.map((r, i) => <i key={i} className={FORM_COLOR[r]} />)}
    </div>
  );
}

// match shape (from matchManager.js, already transformed by Football.jsx):
// { id, chainMatchId, status: 'betting'|'first_half'|'halftime'|'second_half'|'finished',
//   minuteLabel, kickoffLabel, homeTeam, awayTeam, homeScore, awayScore,
//   homeForm, awayForm, oddsHome, oddsDraw, oddsAway, hasSecondaryMarkets, seed }
export default function MatchCard({ match, selectedOdd, onSelectOdd }) {
  const isLive = match.status === "first_half" || match.status === "second_half" || match.status === "halftime";
  const isFt = match.status === "finished";
  const leading = (a, b) => (Number(a) > Number(b) ? "leading" : "");

  return (
    <div className={`match-card ${isLive ? "live" : ""}`}>
      <div className="mc-teams">
        <div className="mc-team-row">
          <ClubBadge name={match.homeTeam} size={21} />
          <div className="mc-team-name">{match.homeTeam}</div>
          {match.homeForm && <FormDots form={match.homeForm} />}
          <div className={`mc-score ${leading(match.homeScore, match.awayScore)}`}>
            {match.homeScore ?? "—"}
          </div>
        </div>
        <div className="mc-team-row">
          <ClubBadge name={match.awayTeam} size={21} />
          <div className="mc-team-name">{match.awayTeam}</div>
          {match.awayForm && <FormDots form={match.awayForm} />}
          <div className={`mc-score ${leading(match.awayScore, match.homeScore)}`}>
            {match.awayScore ?? "—"}
          </div>
        </div>
      </div>

      <div className="mc-status">
        {isLive && <span className="status-pill live">LIVE {match.minuteLabel}</span>}
        {isFt && <span className="status-pill ft">FT</span>}
        {!isLive && !isFt && <span className="status-pill open">{match.kickoffLabel}</span>}
        {isLive && <PitchViz seed={match.seed || 1} />}
      </div>

      <div>
        <div className="mc-odds">
          {isFt ? (
            <>
              <button className="odd-btn disabled" disabled>{match.oddsHome?.toFixed(2)}</button>
              <button className="odd-btn disabled" disabled>{match.oddsDraw?.toFixed(2)}</button>
              <button className="odd-btn disabled" disabled>{match.oddsAway?.toFixed(2)}</button>
            </>
          ) : (
            <>
              <OddButton label="Home" value={match.oddsHome} active={selectedOdd === "home"} onClick={() => onSelectOdd(match, "home", match.oddsHome)} />
              <OddButton label="Draw" value={match.oddsDraw} active={selectedOdd === "draw"} onClick={() => onSelectOdd(match, "draw", match.oddsDraw)} />
              <OddButton label="Away" value={match.oddsAway} active={selectedOdd === "away"} onClick={() => onSelectOdd(match, "away", match.oddsAway)} />
            </>
          )}
        </div>
        {match.hasSecondaryMarkets && !isFt && (
          <div className="secondary-row">
            <span className="secondary-tag display-only">O/U 2.5 · display only</span>
            <span className="secondary-tag display-only">GG/NG · display only</span>
          </div>
        )}
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
