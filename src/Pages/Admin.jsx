import { useState, useEffect } from "react";
import { useWallet }     from "../context/WalletContext";
import { Card }          from "../components/ui/Card";
import { Button }        from "../components/ui/Button";
import { Badge }         from "../components/ui/Badge";
import { CLUBS, LEAGUES } from "../data/clubs.js";
import { setAdminOverrides, pauseEngine, resumeEngine, getCurrentMatches } from "../engine/matchManager.js";
import "./Admin.css";

// Admin wallet — only this address can access admin panel
const ADMIN_WALLET = import.meta.env.VITE_ADMIN_WALLET?.toLowerCase() || "";

export default function Admin() {
  const { connected, address } = useWallet();
  const [tab,        setTab]        = useState("clubs");
  const [clubs,      setClubs]      = useState(() =>
    CLUBS.map(c => ({ ...c, ratings: { ...c.ratings } }))
  );
  const [matches,    setMatches]    = useState([]);
  const [engineOn,   setEngineOn]   = useState(true);
  const [saved,      setSaved]      = useState(false);
  const [filterLeague, setFilter]   = useState("all");

  const isAdmin = connected && (
    address.toLowerCase() === ADMIN_WALLET ||
    address.toLowerCase().startsWith("0x") // dev: allow any wallet
  );

  useEffect(() => {
    const t = setInterval(() => setMatches(getCurrentMatches()), 1000);
    return () => clearInterval(t);
  }, []);

  function updateRating(clubId, key, value) {
    setClubs(prev => prev.map(c =>
      c.id === clubId
        ? { ...c, ratings: { ...c.ratings, [key]: Number(value) } }
        : c
    ));
  }

  function applyRatings() {
    const overrides = {};
    clubs.forEach(c => { overrides[c.id] = { ratings: c.ratings }; });
    setAdminOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleEngine() {
    if (engineOn) { pauseEngine(); setEngineOn(false); }
    else          { resumeEngine(); setEngineOn(true); }
  }

  const shownClubs = filterLeague === "all"
    ? clubs
    : clubs.filter(c => c.leagueId === filterLeague);

  if (!connected) {
    return (
      <div className="admin-gate">
        <h2>🔒 Admin Panel</h2>
        <p>Connect your wallet to access the admin dashboard.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <h2>🚫 Access Denied</h2>
        <p>Your wallet is not authorised to access the admin panel.</p>
        <Badge color="danger">{address}</Badge>
      </div>
    );
  }

  return (
    <div className="admin">
      {/* Header */}
      <div className="admin__head">
        <div>
          <h1 className="admin__title">⚙️ Admin Dashboard</h1>
          <p className="admin__sub">BlockBet Engine Control</p>
        </div>
        <div className="admin__controls">
          <Button
            variant={engineOn ? "danger" : "primary"}
            onClick={toggleEngine}
          >
            {engineOn ? "⏸️ Pause Engine" : "▶️ Resume Engine"}
          </Button>
          <Badge color={engineOn ? "success" : "danger"}>
            {engineOn ? "Engine Running" : "Engine Paused"}
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="admin__stats">
        {[
          { label:"Active Matches",  val: matches.filter(m => m.status !== "finished").length, color:"var(--success)" },
          { label:"Finished Today",  val: matches.filter(m => m.status === "finished").length, color:"var(--primary)" },
          { label:"Total Clubs",     val: CLUBS.length,                                         color:"var(--warning)" },
          { label:"Leagues",         val: LEAGUES.length,                                        color:"var(--purple)" },
        ].map(s => (
          <Card key={s.label} className="admin__stat-card">
            <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:11, color:"var(--gray-400)", marginTop:4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin__tabs">
        {[
          { id:"clubs",   label:"🏟️ Club Ratings" },
          { id:"matches", label:"⚽ Live Matches" },
          { id:"bets",    label:"🎯 Recent Bets" },
          { id:"odds",    label:"📊 Odds Preview" },
        ].map(t => (
          <button
            key={t.id}
            className={`admin__tab ${tab === t.id ? "admin__tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CLUB RATINGS TAB */}
      {tab === "clubs" && (
        <div className="admin__panel fade-in">
          <div className="admin__panel-head">
            <h2>Club Ratings</h2>
            <div style={{ display:"flex", gap:10 }}>
              {/* League filter */}
              <select
                className="admin__select"
                value={filterLeague}
                onChange={e => setFilter(e.target.value)}
              >
                <option value="all">All Leagues</option>
                {LEAGUES.map(l => <option key={l.id} value={l.id}>{l.flag} {l.name}</option>)}
              </select>
              <Button onClick={applyRatings} variant={saved ? "ghost" : "primary"}>
                {saved ? "✅ Saved!" : "💾 Apply Changes"}
              </Button>
            </div>
          </div>

          <div className="admin__clubs-grid">
            {shownClubs.map(club => (
              <Card key={club.id} className="admin__club-card">
                <div className="admin__club-head">
                  <img src={club.logo} alt={club.name} width={32} height={32} style={{ objectFit:"contain" }} onError={e => e.target.style.display="none"} />
                  <div>
                    <div className="admin__club-name">{club.name}</div>
                    <div className="admin__club-league">{LEAGUES.find(l => l.id === club.leagueId)?.flag} {club.leagueId}</div>
                  </div>
                  <div className="admin__overall" style={{ color:"var(--primary)" }}>
                    {club.ratings.overall}
                  </div>
                </div>

                <div className="admin__ratings">
                  {Object.entries(club.ratings).map(([key, val]) => (
                    <div key={key} className="admin__rating-row">
                      <label className="admin__rating-label">{ratingLabel(key)}</label>
                      <div className="admin__rating-input-wrap">
                        <input
                          type="range"
                          min={key === "homeAdvantage" ? 0 : key === "awayPerformance" ? 50 : 40}
                          max={key === "homeAdvantage" ? 20 : 100}
                          value={val}
                          onChange={e => updateRating(club.id, key, e.target.value)}
                          className="admin__range"
                        />
                        <input
                          type="number"
                          value={val}
                          min={0} max={100}
                          onChange={e => updateRating(club.id, key, e.target.value)}
                          className="admin__rating-num"
                        />
                      </div>
                      <div className="admin__rating-bar">
                        <div
                          className="admin__rating-fill"
                          style={{ width:`${val}%`, background: ratingColor(val) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* LIVE MATCHES TAB */}
      {tab === "matches" && (
        <div className="admin__panel fade-in">
          <h2>Live Matches</h2>
          <div className="admin__match-list">
            {matches.map(m => (
              <Card key={m.id} className="admin__match-row">
                <div className="admin__match-info">
                  <Badge color={statusColor(m.status)}>{m.status.toUpperCase().replace("_"," ")}</Badge>
                  <span className="admin__match-teams">{m.homeTeam} vs {m.awayTeam}</span>
                  <span className="admin__match-score">{m.homeScore} – {m.awayScore}</span>
                  <span style={{ fontSize:11, color:"var(--gray-400)" }}>{m.leagueName}</span>
                </div>
                <div className="admin__match-meta">
                  <div>Odds: {m.oddsHome} / {m.oddsDraw} / {m.oddsAway}</div>
                  <div>Pool: {(m.poolHome + m.poolDraw + m.poolAway).toFixed(0)} USDC</div>
                  {m.minute > 0 && <div>{m.minute}'</div>}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ODDS PREVIEW TAB */}
      {tab === "odds" && (
        <div className="admin__panel fade-in">
          <h2>Odds Preview</h2>
          <p style={{ color:"var(--gray-400)", marginBottom:20 }}>
            Current odds for upcoming fixtures based on club ratings.
            Change ratings in the Club Ratings tab to see odds update automatically.
          </p>
          <div className="admin__odds-table">
            <div className="admin__odds-head">
              <span>Home</span><span>Away</span>
              <span>1</span><span>X</span><span>2</span>
            </div>
            {matches.map(m => (
              <div key={m.id} className="admin__odds-row">
                <span>{m.homeTeam}</span>
                <span>{m.awayTeam}</span>
                <span style={{ color:"var(--primary)" }}>{m.oddsHome}</span>
                <span style={{ color:"var(--warning)" }}>{m.oddsDraw}</span>
                <span style={{ color:"var(--secondary)" }}>{m.oddsAway}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ratingLabel(key) {
  const map = {
    attack:"Attack", midfield:"Midfield", defence:"Defence",
    goalkeeping:"GK", overall:"Overall", form:"Form",
    homeAdvantage:"Home Adv", awayPerformance:"Away Perf",
  };
  return map[key] || key;
}

function ratingColor(val) {
  if (val >= 85) return "var(--success)";
  if (val >= 70) return "var(--primary)";
  if (val >= 55) return "var(--warning)";
  return "var(--danger)";
}

function statusColor(status) {
  const map = { betting:"warning", first_half:"success", halftime:"primary", second_half:"success", finished:"ghost" };
  return map[status] || "ghost";
}