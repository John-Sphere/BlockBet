import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { subscribe, initMatchManager } from "../engine/matchManager";
import { useBetSlip } from "../context/BetSlipContext";
import MatchCard from "../components/ui/MatchCard";
import Sparkline from "../components/charts/Sparkline";
import "./Football.css";

function formatKickoff(ts) {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toCardShape(m) {
  const isLive = m.status === "first_half" || m.status === "second_half" || m.status === "halftime";
  return {
    id: m.id,
    chainMatchId: m.chainMatchId,
    leagueName: m.leagueName,
    status: m.status,
    minuteLabel: m.status === "halftime" ? "HT" : `${m.minute ?? 0}'`,
    kickoffLabel: formatKickoff(m.kickOffAt),
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    oddsHome: m.oddsHome,
    oddsDraw: m.oddsDraw,
    oddsAway: m.oddsAway,
    hasSecondaryMarkets: m.status !== "finished",
    // Deterministic per-match seed for the pitch momentum trace, so it
    // doesn't reshuffle on every re-render.
    seed: (m.id?.length || 1) * 0.37 + 0.6,
  };
}

export default function Football() {
  const [rawMatches, setRawMatches] = useState([]);
  const [activeLeague, setActiveLeague] = useState("All");
  const { selections, addSelection } = useBetSlip();

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe((matches) => setRawMatches(matches));
    return unsub;
  }, []);

  const matches = useMemo(() => rawMatches.map(toCardShape), [rawMatches]);

  const leagues = useMemo(() => {
    const byLeague = {};
    for (const m of matches) {
      if (!byLeague[m.leagueName]) byLeague[m.leagueName] = [];
      byLeague[m.leagueName].push(m);
    }
    return Object.entries(byLeague).map(([name, ms]) => ({ name, matches: ms }));
  }, [matches]);

  const liveCount = matches.filter((m) => m.status === "first_half" || m.status === "second_half" || m.status === "halftime").length;
  const leagueCount = leagues.length;
  const clubsTracked = useMemo(() => {
    const names = new Set();
    matches.forEach((m) => { names.add(m.homeTeam); names.add(m.awayTeam); });
    return names.size;
  }, [matches]);

  const visibleLeagues = activeLeague === "All" ? leagues : leagues.filter((l) => l.name === activeLeague);

  const hotGames = useMemo(
    () => matches.filter((m) => m.status !== "finished").slice(0, 6),
    [matches]
  );

  function handleSelectOdd(match, side, odds) {
    // addSelection expects the raw match shape (needs .id/.chainMatchId/
    // .homeTeam/.awayTeam) — the card-shaped object already has all of these.
    addSelection(match, side, odds);
  }

  function selectedOddFor(matchId) {
    return selections.find((s) => s.matchId === matchId)?.side;
  }

  return (
    <div className="bb-pro">
      <div className="main">
        <div className="stats-row">
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num">{matches.length}</div><div className="lbl">Matches today</div></div>
              <Sparkline width={66} height={28} color="#4C86FF" seed={1} />
            </div>
          </div>
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num live">{liveCount}</div><div className="lbl">Live now</div></div>
              <Sparkline width={66} height={28} color="#33D17A" seed={2} />
            </div>
          </div>
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num">{leagueCount}</div><div className="lbl">Leagues</div></div>
              <Sparkline width={66} height={28} color="#4C86FF" drift={0} seed={3} />
            </div>
          </div>
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num">{clubsTracked}</div><div className="lbl">Clubs tracked</div></div>
              <Sparkline width={66} height={28} color="#4C86FF" seed={4} />
            </div>
          </div>
        </div>

        {hotGames.length > 0 && (
          <>
            <div className="section-title"><h2>Hot games</h2></div>
            <div className="hot-row">
              {hotGames.map((m) => (
                <div className="hot-card" key={m.id}>
                  <div className="hc-top">
                    <span className="hc-league">{m.leagueName}</span>
                    {m.status !== "betting" && <span className="hc-heat">🔥 High vol</span>}
                  </div>
                  <div className="hc-teams">{m.homeTeam} <span className="vs">vs</span> {m.awayTeam}</div>
                  <div className="hc-odds">
                    <span>{m.oddsHome?.toFixed(2)}</span>
                    <span>{m.oddsDraw?.toFixed(2)}</span>
                    <span>{m.oddsAway?.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="league-tabs">
          {["All", ...leagues.map((l) => l.name)].map((name) => (
            <div
              key={name}
              className={`league-tab ${activeLeague === name ? "active" : ""}`}
              onClick={() => setActiveLeague(name)}
            >
              <span className="crest" />
              {name}
            </div>
          ))}
        </div>

        {visibleLeagues.map((league) => (
          <div className="league-block" key={league.name}>
            <div className="league-block-head">
              <h3><span className="crest" />{league.name}</h3>
              <Link to="/leaderboard" className="view-table">View table →</Link>
            </div>
            {league.matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                selectedOdd={selectedOddFor(m.id)}
                onSelectOdd={handleSelectOdd}
              />
            ))}
          </div>
        ))}

        {matches.length === 0 && (
          <div style={{ color: "var(--bp-text-faint, #4E5570)", padding: "40px 0", textAlign: "center" }}>
            Loading matches…
          </div>
        )}
      </div>
    </div>
  );
}
