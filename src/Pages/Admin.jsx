import { useState, useEffect } from "react";
import { useWallet }     from "../context/WalletContext";
import { useApp }        from "../context/AppContext";
import { Card }          from "../components/ui/Card";
import { Button }        from "../components/ui/Button";
import { Badge }         from "../components/ui/Badge";
import { CLUBS, LEAGUES } from "../data/clubs";
import {
  setAdminOverrides, pauseEngine, resumeEngine,
  getCurrentMatches, initMatchManager,
} from "../engine/matchManager";
import "./Admin.css";

const ADMIN_WALLET = (import.meta.env.VITE_ADMIN_WALLET || "").toLowerCase();

const RATING_KEYS = [
  { key:"attack",          label:"Attack",          min:40, max:100 },
  { key:"midfield",        label:"Midfield",         min:40, max:100 },
  { key:"defence",         label:"Defence",          min:40, max:100 },
  { key:"goalkeeping",     label:"Goalkeeping",      min:40, max:100 },
  { key:"overall",         label:"Overall",          min:40, max:100 },
  { key:"form",            label:"Form",             min:40, max:100 },
  { key:"homeAdvantage",   label:"Home Advantage",   min:0,  max:20  },
  { key:"awayPerformance", label:"Away Performance", min:50, max:100 },
];

function ratingColor(v) {
  if (v >= 85) return "var(--success)";
  if (v >= 70) return "var(--primary)";
  if (v >= 55) return "var(--warning)";
  return "var(--danger)";
}

function statusColor(s) {
  const m = { betting:"warning", first_half:"success", halftime:"primary", second_half:"success", finished:"ghost" };
  return m[s] || "ghost";
}

export default function Admin() {
  const { connected, address } = useWallet();
  const { addToast }           = useApp();

  const [tab,     setTab]     = useState("clubs");
  const [clubs,   setClubs]   = useState(() => CLUBS.map(c => ({ ...c, ratings:{ ...c.ratings } })));
  const [matches, setMatches] = useState([]);
  const [engineOn,setEngine]  = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [filter,  setFilter]  = useState("all");

  const isAdmin = connected && (
    !ADMIN_WALLET || address.toLowerCase() === ADMIN_WALLET
  );

  useEffect(() => {
    initMatchManager();
    const t = setInterval(() => setMatches(getCurrentMatches()), 1000);
    return () => clearInterval(t);
  }, []);

  function updateRating(clubId, key, value) {
    setClubs(prev => prev.map(c =>
      c.id === clubId ? { ...c, ratings:{ ...c.ratings, [key]:Number(value) } } : c
    ));
  }

  function applyRatings() {
    const overrides = {};
    clubs.forEach(c => { overrides[c.id] = { ratings:c.ratings }; });
    setAdminOverrides(overrides);
    setSaved(true);
    addToast("Club ratings applied! Odds will update on next fixture.", "success");
    setTimeout(() => setSaved(false), 2500);
  }

  function toggleEngine() {
    if (engineOn) { pauseEngine(); setEngine(false); addToast("Engine paused.", "warning"); }
    else          { resumeEngine(); setEngine(true); addToast("Engine resumed.", "success"); }
  }

  const shownClubs = filter === "all" ? clubs : clubs.filter(c => c.leagueId === filter);

  // ── AUTH GATES ───────────────────────────────────────────
  if (!connected) {
    return (
      <div className="admin-gate">
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <h2>Admin Panel</h2>
        <p>Connect your wallet to access the admin dashboard.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <div style={{ fontSize:48, marginBottom:16 }}>🚫</div>
        <h2>Access Denied</h2>
        <p>Your wallet is not authorised.</p>
        <Badge color="danger" size="md" style={{ marginTop:12 }}>{address}</Badge>
      </div>
    );
  }

  return (
    <div className="admin">

      {/* Header */}
      <div className="admin__head">
        <div>
          <h1 className="admin__title">⚙️ Admin Dashboard</h1>
          <p className="admin__sub">BlockBet Engine Control Panel</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <Badge color={engineOn ? "success" : "danger"}>
            {engineOn ? "🟢 Engine Running" : "🔴 Engine Paused"}
          </Badge>
          <Button variant={engineOn ? "danger" : "primary"} size="sm" onClick={toggleEngine}>
            {engineOn ? "⏸️ Pause Engine" : "▶️ Resume Engine"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin__stats">
        {[
          { label:"Active Matches",  val:matches.filter(m => m.status !== "finished").length, color:"var(--success)"  },
          { label:"Finished",        val:matches.filter(m => m.status === "finished").length,  color:"var(--primary)"  },
          { label:"Total Clubs",     val:CLUBS.length,                                          color:"var(--warning)"  },
          { label:"Leagues",         val:LEAGUES.length,                                         color:"var(--purple)"   },
        ].map(s => (
          <Card key={s.label} style={{ padding:18, textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:11, color:"var(--gray-400)", marginTop:4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin__tabs">
        {[
          { id:"clubs",   label:"🏟️ Club Ratings" },
          { id:"matches", label:"⚽ Live Matches"  },
          { id:"odds",    label:"📊 Odds Preview"  },
        ].map(t => (
          <button
            key={t.id}
            className={`admin__tab ${tab===t.id?"admin__tab--active":""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CLUB RATINGS */}
      {tab === "clubs" && (
        <div className="fade-in">
          <div className="admin__panel-head">
            <h2 style={{ fontSize:20, fontWeight:800 }}>Club Ratings</h2>
            <div style={{ display:"flex", gap:10 }}>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ background:"var(--glass)", border:"1px solid var(--border)", color:"var(--white)", padding:"8px 12px", borderRadius:10, fontSize:13 }}
              >
                <option value="all">All Leagues</option>
                {LEAGUES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
              </select>
              <Button onClick={applyRatings} variant={saved ? "ghost" : "primary"} size="sm">
                {saved ? "✅ Saved!" : "💾 Apply Changes"}
              </Button>
            </div>
          </div>

          <div className="admin__clubs-grid">
            {shownClubs.map(club => {
              const league = LEAGUES.find(l => l.id === club.leagueId);
              return (
                <Card key={club.id} style={{ padding:18 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:12, borderBottom:"1px solid var(--border)" }}>
                    <img src={club.logo} alt={club.name} width={32} height={32}
                      style={{ objectFit:"contain", flexShrink:0 }}
                      onError={e => e.target.style.display="none"} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>{club.name}</div>
                      <div style={{ fontSize:11, color:"var(--gray-400)" }}>{league?.flag} {league?.name}</div>
                    </div>
                    <div style={{ fontSize:22, fontWeight:900, color:"var(--primary)" }}>{club.ratings.overall}</div>
                  </div>

                  {RATING_KEYS.map(({ key, label, min, max }) => (
                    <div key={key} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--gray-400)", marginBottom:4 }}>
                        <span style={{ fontWeight:600, letterSpacing:0.5 }}>{label}</span>
                        <span style={{ color:ratingColor(club.ratings[key]), fontWeight:700 }}>{club.ratings[key]}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input
                          type="range" min={min} max={max}
                          value={club.ratings[key]}
                          onChange={e => updateRating(club.id, key, e.target.value)}
                          style={{ flex:1, accentColor:"var(--primary)" }}
                        />
                        <input
                          type="number" min={min} max={max}
                          value={club.ratings[key]}
                          onChange={e => updateRating(club.id, key, e.target.value)}
                          style={{ width:46, background:"var(--glass)", border:"1px solid var(--border)", color:"var(--white)", padding:"3px 6px", borderRadius:6, fontSize:11, textAlign:"center" }}
                        />
                      </div>
                      <div style={{ height:3, background:"var(--bg-card)", borderRadius:2, overflow:"hidden", marginTop:3 }}>
                        <div style={{ height:"100%", width:`${((club.ratings[key]-min)/(max-min))*100}%`, background:ratingColor(club.ratings[key]), borderRadius:2, transition:"width 0.3s" }} />
                      </div>
                    </div>
                  ))}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* LIVE MATCHES */}
      {tab === "matches" && (
        <div className="fade-in">
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:16 }}>Live Matches</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {matches.length === 0 ? (
              <Card style={{ padding:"48px 24px", textAlign:"center" }}>
                <p style={{ color:"var(--gray-400)" }}>No active matches. Start the engine.</p>
              </Card>
            ) : (
              matches.map(m => (
                <Card key={m.id} style={{ padding:"14px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <Badge color={statusColor(m.status)}>{m.status.replace("_"," ").toUpperCase()}</Badge>
                    <span style={{ fontSize:14, fontWeight:700, flex:1 }}>{m.homeTeam} vs {m.awayTeam}</span>
                    <span style={{ fontSize:18, fontWeight:900, color:"var(--primary)" }}>{m.homeScore} – {m.awayScore}</span>
                    {m.minute > 0 && <span style={{ fontSize:12, color:"var(--success)" }}>{m.minute}'</span>}
                  </div>
                  <div style={{ display:"flex", gap:16, marginTop:8, fontSize:12, color:"var(--gray-400)" }}>
                    <span>{m.leagueName}</span>
                    <span>Odds: {m.oddsHome} / {m.oddsDraw} / {m.oddsAway}</span>
                    <span>Pool: {(m.poolHome+m.poolDraw+m.poolAway).toFixed(0)} USDC</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ODDS PREVIEW */}
      {tab === "odds" && (
        <div className="fade-in">
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Odds Preview</h2>
          <p style={{ color:"var(--gray-400)", fontSize:13, marginBottom:20 }}>
            Odds are calculated from club ratings. Change ratings → click Apply → odds update on next fixture.
          </p>
          <Card style={{ overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 80px 80px 80px", padding:"10px 18px", fontSize:10, color:"var(--gray-600)", fontWeight:700, letterSpacing:1, borderBottom:"1px solid var(--border)", background:"rgba(46,199,242,0.04)" }}>
              <span>Home</span><span>Away</span><span style={{textAlign:"center"}}>1</span><span style={{textAlign:"center"}}>X</span><span style={{textAlign:"center"}}>2</span>
            </div>
            {matches.map(m => (
              <div key={m.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 80px 80px 80px", padding:"12px 18px", borderBottom:"1px solid var(--border)", fontSize:13, alignItems:"center" }}>
                <span style={{ color:"var(--white)", fontWeight:600 }}>{m.homeTeam}</span>
                <span style={{ color:"var(--white)", fontWeight:600 }}>{m.awayTeam}</span>
                <span style={{ color:"var(--primary)", textAlign:"center", fontWeight:800 }}>{m.oddsHome}</span>
                <span style={{ color:"var(--warning)", textAlign:"center", fontWeight:800 }}>{m.oddsDraw}</span>
                <span style={{ color:"var(--secondary)", textAlign:"center", fontWeight:800 }}>{m.oddsAway}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}