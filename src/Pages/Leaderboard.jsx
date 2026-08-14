import { useState, useEffect } from "react";
import { Card }  from "../components/ui/Card";
import "./Leaderboard.css";

const DEMO = [
  { rank:1,  wallet:"0x7f3a…4c2e", bets:234, wins:158, profit:12450, winRate:67.5 },
  { rank:2,  wallet:"0x9b1c…7d8f", bets:187, wins:121, profit:9820,  winRate:64.7 },
  { rank:3,  wallet:"0x2e4d…1a9b", bets:156, wins:97,  profit:7650,  winRate:62.2 },
  { rank:4,  wallet:"0x5c8f…3e2a", bets:142, wins:86,  profit:5230,  winRate:60.6 },
  { rank:5,  wallet:"0x1d6b…9c4f", bets:128, wins:76,  profit:4870,  winRate:59.4 },
  { rank:6,  wallet:"0x8e2a…5f1d", bets:110, wins:64,  profit:3420,  winRate:58.2 },
  { rank:7,  wallet:"0x3f9c…2b8e", bets:98,  wins:55,  profit:2890,  winRate:56.1 },
  { rank:8,  wallet:"0x6a4b…7c3f", bets:89,  wins:48,  profit:2210,  winRate:53.9 },
  { rank:9,  wallet:"0x4d7e…9a2c", bets:76,  wins:40,  profit:1870,  winRate:52.6 },
  { rank:10, wallet:"0xc2f1…6b4d", bets:68,  wins:34,  profit:1340,  winRate:50.0 },
];

const SORT_OPTIONS = [
  { id:"profit",  label:"Most profit"    },
  { id:"wins",    label:"Most wins"      },
  { id:"bets",    label:"Most active"    },
  { id:"winrate", label:"Best win rate"  },
];

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState("profit");
  const [data,   setData]   = useState(DEMO);

  useEffect(() => {
    const sorted = [...DEMO].sort((a, b) => {
      if (sortBy === "profit")  return b.profit  - a.profit;
      if (sortBy === "wins")    return b.wins    - a.wins;
      if (sortBy === "bets")    return b.bets    - a.bets;
      if (sortBy === "winrate") return b.winRate - a.winRate;
      return 0;
    });
    setData(sorted.map((d, i) => ({ ...d, rank:i+1 })));
  }, [sortBy]);

  const rankIcon  = r => r===1?"1st":r===2?"2nd":r===3?"3rd":r;
  const rankColor = r => r===1?"var(--gold)":r===2?"var(--chalk)":r===3?"#B08858":"var(--chalk-dim)";

  return (
    <div className="lb-page">
      <div className="lb-head">
        <h1 className="lb-title">Leaderboard</h1>
        <p className="lb-sub">Top BLOCKBET players ranked by performance</p>
      </div>

      <div className="lb-summary">
        {[
          { val:"10,000+", label:"Total players" },
          { val:"284,750", label:"Total bets"     },
          { val:"$92,400", label:"Rewards paid"   },
          { val:"58.3%",   label:"Avg win rate"   },
        ].map(s => (
          <Card key={s.label} style={{ padding:20, textAlign:"center" }}>
            <div style={{ fontSize:20, fontWeight:700, color:"var(--gold)", marginBottom:4 }}>{s.val}</div>
            <div style={{ fontSize:11, color:"var(--chalk-dim)" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="lb-sort">
        {SORT_OPTIONS.map(s => (
          <button
            key={s.id}
            className={`lb-sort-btn ${sortBy===s.id?"lb-sort-btn--active":""}`}
            onClick={() => setSortBy(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Card style={{ overflow:"hidden" }}>
        <div className="lb-table-head">
          <span>#</span>
          <span>Player</span>
          <span>Bets</span>
          <span>Wins</span>
          <span>Win rate</span>
          <span>Profit</span>
        </div>
        {data.map((p, i) => (
          <div key={p.wallet} className={`lb-table-row ${i<3?"lb-table-row--top":""}`}>
            <span style={{ fontSize:13, fontWeight:700, color:rankColor(p.rank) }}>{rankIcon(p.rank)}</span>
            <span style={{ color:"var(--chalk)", fontFamily:"var(--font-mono)", fontSize:13 }}>{p.wallet}</span>
            <span className="lb-num">{p.bets}</span>
            <span className="lb-num">{p.wins}</span>
            <span className="lb-num" style={{ color: p.winRate>60?"var(--win-green)":"var(--chalk-dim)" }}>
              {p.winRate.toFixed(1)}%
            </span>
            <span className="lb-profit">+{p.profit.toLocaleString()} USDC</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
