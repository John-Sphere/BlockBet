/**
 * BLOCKBET Match Detail
 * Club stats comparison + secondary markets (GG/NG, Over/Under) —
 * the secondary markets are DISPLAY ONLY right now, since the smart
 * contract only supports Home/Draw/Away bets on-chain. Main 1X2
 * betting still works exactly as it does on the Football page.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subscribe, initMatchManager } from "../engine/matchManager";
import { ClubBadge } from "../components/ui/ClubBadge";
import { useBetSlip } from "../context/BetSlipContext";
import "./MatchDetail.css";

const RATING_ROWS = [
  { key: "attack", label: "Attack" },
  { key: "midfield", label: "Midfield" },
  { key: "defence", label: "Defence" },
  { key: "goalkeeping", label: "Goalkeeping" },
  { key: "form", label: "Form" },
];

export default function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const { selections, addSelection } = useBetSlip();

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe((snapshot) => setMatches(snapshot));
    return unsub;
  }, []);

  const match = matches.find((m) => m.id === matchId);

  if (!match) {
    return (
      <div className="md-page">
        <div className="md-notfound">
          <p>This match isn't currently active — matches rotate as rounds change.</p>
          <button className="btn-outline" onClick={() => navigate("/football")}>Back to pitch</button>
        </div>
      </div>
    );
  }

  const oddsMap = { home: match.oddsHome, draw: match.oddsDraw, away: match.oddsAway };
  const isFinished = match.status === "finished";

  function isPicked(side) {
    return selections.some((s) => s.matchId === match.id && s.side === side);
  }

  return (
    <div className="md-page">
      <button className="md-back" onClick={() => navigate(-1)}>&larr; Back</button>

      <div className="md-header">
        <div className="md-header-team">
          <ClubBadge name={match.homeTeam} size={44} />
          <div className="md-header-name">{match.homeTeam}</div>
        </div>
        <div className="md-header-mid">
          {isFinished ? (
            <div className="md-score">{match.homeScore} – {match.awayScore}</div>
          ) : (
            <div className="md-vs">vs</div>
          )}
          <div className="md-league">{match.leagueName}</div>
        </div>
        <div className="md-header-team">
          <ClubBadge name={match.awayTeam} size={44} />
          <div className="md-header-name">{match.awayTeam}</div>
        </div>
      </div>

      {!isFinished && (
        <div className="md-section">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Match winner</div>
          <div className="bb-odds-row">
            {["home", "draw", "away"].map((side) => (
              <div
                key={side}
                className={`odds-box${isPicked(side) ? " selected" : ""}`}
                onClick={() => addSelection(match, side, oddsMap[side])}
                role="button"
                tabIndex={0}
              >
                <div className="label">{side}</div>
                <div className="value">{oddsMap[side]?.toFixed(2) ?? "-"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.extraMarkets && !isFinished && (
        <div className="md-section">
          <div className="eyebrow" style={{ marginBottom: 4 }}>More markets</div>
          <p className="md-preview-note">Preview only — on-chain betting for these markets is coming soon.</p>

          <div className="md-market-group">
            <div className="md-market-label">Both teams to score</div>
            <div className="md-market-row">
              <div className="md-market-box">
                <span>Yes</span>
                <strong>{match.extraMarkets.gg.yes?.toFixed(2) ?? "-"}</strong>
              </div>
              <div className="md-market-box">
                <span>No</span>
                <strong>{match.extraMarkets.gg.no?.toFixed(2) ?? "-"}</strong>
              </div>
            </div>
          </div>

          {Object.entries(match.extraMarkets.overUnder).map(([line, vals]) => (
            <div className="md-market-group" key={line}>
              <div className="md-market-label">Total goals — {line}</div>
              <div className="md-market-row">
                <div className="md-market-box">
                  <span>Over {line}</span>
                  <strong>{vals.over?.toFixed(2) ?? "-"}</strong>
                </div>
                <div className="md-market-box">
                  <span>Under {line}</span>
                  <strong>{vals.under?.toFixed(2) ?? "-"}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {match.homeRatings && match.awayRatings && (
        <div className="md-section">
          <div className="eyebrow" style={{ marginBottom: 14 }}>Club comparison</div>
          {RATING_ROWS.map(({ key, label }) => {
            const h = match.homeRatings[key];
            const a = match.awayRatings[key];
            const total = h + a || 1;
            return (
              <div className="md-stat-row" key={key}>
                <span className="md-stat-value">{h}</span>
                <div className="md-stat-bars">
                  <div className="md-stat-bar-wrap md-stat-bar-wrap--home">
                    <div className="md-stat-bar md-stat-bar--home" style={{ width: `${(h / total) * 100}%` }} />
                  </div>
                  <span className="md-stat-label">{label}</span>
                  <div className="md-stat-bar-wrap">
                    <div className="md-stat-bar md-stat-bar--away" style={{ width: `${(a / total) * 100}%` }} />
                  </div>
                </div>
                <span className="md-stat-value">{a}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
