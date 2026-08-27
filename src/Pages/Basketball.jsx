import { useMemo, useState, useEffect } from "react";
import { subscribe, initBasketballMatchManager } from "../engine/basketballMatchManager";
import { useBetSlip } from "../context/BetSlipContext";
import BasketballMatchCard from "../components/ui/BasketballMatchCard";
import Sparkline from "../components/charts/Sparkline";
import "./Football.css"; // reuses the same .bb-pro styling system

export default function Basketball() {
  const [matches, setMatches] = useState([]);
  const { selections, addSelection } = useBetSlip();

  useEffect(() => {
    initBasketballMatchManager();
    const unsub = subscribe((m) => setMatches(m));
    return unsub;
  }, []);

  const liveCount = matches.filter((m) =>
    ["q1", "q2", "halftime", "q3", "q4"].includes(m.status)
  ).length;

  const teamsTracked = useMemo(() => {
    const names = new Set();
    matches.forEach((m) => { names.add(m.homeTeam); names.add(m.awayTeam); });
    return names.size;
  }, [matches]);

  function handleSelectOdd(match, side, odds) {
    addSelection(match, side, odds);
  }

  function selectedSideFor(matchId) {
    return selections.find((s) => s.matchId === matchId)?.side;
  }

  return (
    <div className="bb-pro">
      <div className="main">
        <div className="stats-row">
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num">{matches.length}</div><div className="lbl">Games today</div></div>
              <Sparkline width={66} height={28} color="#4C86FF" seed={5} />
            </div>
          </div>
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num live">{liveCount}</div><div className="lbl">Live now</div></div>
              <Sparkline width={66} height={28} color="#33D17A" seed={6} />
            </div>
          </div>
          <div className="stat-card">
            <div className="top-row">
              <div><div className="num">{teamsTracked}</div><div className="lbl">Teams tracked</div></div>
              <Sparkline width={66} height={28} color="#4C86FF" drift={0} seed={7} />
            </div>
          </div>
        </div>

        <div className="league-block">
          <div className="league-block-head">
            <h3><span className="crest" />NBA</h3>
          </div>
          {matches.map((m) => (
            <BasketballMatchCard
              key={m.id}
              match={m}
              selectedSide={selectedSideFor(m.id)}
              onSelectOdd={handleSelectOdd}
            />
          ))}
        </div>

        {matches.length === 0 && (
          <div style={{ color: "var(--bp-text-faint, #4E5570)", padding: "40px 0", textAlign: "center" }}>
            Loading games…
          </div>
        )}
      </div>
    </div>
  );
}
