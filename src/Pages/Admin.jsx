/**
 * BLOCKBET Admin Panel
 * SECURITY: VITE_ADMIN_WALLET must be set, valid, and match connected wallet.
 * If any check fails, access is DENIED — not just hidden.
 */

import { useState, useEffect } from "react";
import { useWallet }     from "../context/WalletContext";
import { useApp }        from "../context/AppContext";
import { Card }          from "../components/ui/Card";
import { Button }        from "../components/ui/Button";
import { Badge }         from "../components/ui/Badge";
import { CLUBS, LEAGUES } from "../data/clubs";
import {
  setAdminOverrides,
  pauseEngine,
  resumeEngine,
  getCurrentMatches,
  initMatchManager,
} from "../engine/matchManager";
import "./Admin.css";

// ── SECURITY: all three conditions must be true ─────────────
function getIsAdmin(connected, address) {
  // 1. Wallet must be connected
  if (!connected || !address) return false;

  // 2. Env var must exist and not be empty
  const raw = import.meta.env.VITE_ADMIN_WALLET;
  if (!raw || typeof raw !== "string" || raw.trim() === "") return false;

  const configured = raw.trim().toLowerCase();

  // 3. Must be a valid Ethereum address (0x + 40 hex chars = 42 total)
  if (!/^0x[0-9a-f]{40}$/.test(configured)) return false;

  // 4. Must match connected wallet (case-insensitive)
  return address.toLowerCase() === configured;
}

const RATING_KEYS = [
  { key:"attack",          label:"⚔️ Attack",           min:40, max:100 },
  { key:"midfield",        label:"🔄 Midfield",          min:40, max:100 },
  { key:"defence",         label:"🛡️ Defence",           min:40, max:100 },
  { key:"goalkeeping",     label:"🧤 Goalkeeping",       min:40, max:100 },
  { key:"overall",         label:"⭐ Overall",           min:40, max:100 },
  { key:"form",            label:"📈 Form",              min:40, max:100 },
  { key:"homeAdvantage",   label:"🏠 Home Advantage",   min:0,  max:20  },
  { key:"awayPerformance", label:"✈️ Away Performance", min:50, max:100 },
];

function ratingColor(v) {
  if (v >= 88) return "#10E981";
  if (v >= 75) return "#2EC7F2";
  if (v >= 60) return "#FFC857";
  return "#FF4D6D";
}

function statusBadgeColor(s) {
  const map = {
    betting:     "warning",
    first_half:  "success",
    halftime:    "primary",
    second_half: "success",
    finished:    "ghost",
  };
  return map[s] || "ghost";
}

export default function Admin() {
  const { connected, address }   = useWallet();
  const { addToast }             = useApp();
  const isAdmin = getIsAdmin(connected, address);

  const [tab,      setTab]      = useState("clubs");
  const [clubs,    setClubs]    = useState(() =>
    CLUBS.map(c => ({ ...c, ratings: { ...c.ratings } }))
  );
  const [matches,  setMatches]  = useState([]);
  const [engineOn, setEngineOn] = useState(true);
  const [saved,    setSaved]    = useState(false);
  const [leagueF,  setLeagueF]  = useState("all");

  // Refresh match list every second
  useEffect(() => {
    initMatchManager();
    const t = setInterval(() => {
      setMatches(getCurrentMatches());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── GUARD: block any admin action if not authorised ──────
  function guardedAction(fn) {
    if (!isAdmin) {
      addToast("Access denied. Admin wallet not authorised.", "error");
      return;
    }
    fn();
  }

  function handleApplyRatings() {
    guardedAction(() => {
      const overrides = {};
      clubs.forEach(c => { overrides[c.id] = { ratings: c.ratings }; });
      setAdminOverrides(overrides);
      setSaved(true);
      addToast("✅ Club ratings applied. Odds update on next fixture.", "success");
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function handleToggleEngine() {
    guardedAction(() => {
      if (engineOn) {
        pauseEngine();
        setEngineOn(false);
        addToast("⏸️ Engine paused.", "warning");
      } else {
        resumeEngine();
        setEngineOn(true);
        addToast("▶️ Engine resumed.", "success");
      }
    });
  }

  function updateRating(clubId, key, value) {
    if (!isAdmin) return;
    setClubs(prev =>
      prev.map(c =>
        c.id === clubId
          ? { ...c, ratings: { ...c.ratings, [key]: Number(value) } }
          : c
      )
    );
  }

  const shownClubs = leagueF === "all"
    ? clubs
    : clubs.filter(c => c.leagueId === leagueF);

  const activeCount   = matches.filter(m => m.status !== "finished").length;
  const finishedCount = matches.filter(m => m.status === "finished").length;

  // ── GATE 1: not connected ─────────────────────────────────
  if (!connected) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__icon">🔒</div>
        <h2>Admin Panel</h2>
        <p>Connect your wallet to continue.</p>
      </div>
    );
  }

  // ── GATE 2: env var missing / invalid ─────────────────────
  const rawEnv = import.meta.env.VITE_ADMIN_WALLET?.trim();
  if (!rawEnv || rawEnv === "" || !/^0x[0-9a-fA-F]{40}$/.test(rawEnv)) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__icon">⚙️</div>
        <h2>Admin Not Configured</h2>
        <p>
          Set <code>VITE_ADMIN_WALLET</code> in your <code>.env</code> file
          to a valid Ethereum address to enable admin access.
        </p>
      </div>
    );
  }

  // ── GATE 3: wrong wallet ──────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__icon">🚫</div>
        <h2>Access Denied</h2>
        <p>Your wallet is not authorised to access the Admin Panel.</p>
        <Badge color="danger" size="md" style={{ marginTop: 12 }}>
          {address?.slice(0,6)}…{address?.slice(-4)}
        </Badge>
      </div>
    );
  }

  // ── AUTHORISED VIEW ───────────────────────────────────────
  return (
    <div className="admin">

      {/* Header */}
      <div className="admin__head">
        <div>
          <h1 className="admin__title">⚙️ Admin Dashboard</h1>
          <p className="admin__sub">BlockBet Engine Control Panel</p>
        </div>
        <div className="admin__head-actions">
          <Badge color={engineOn ? "success" : "danger"}>
            {engineOn ? "🟢 Engine Running" : "🔴 Engine Paused"}
          </Badge>
          <Button
            variant={engineOn ? "danger" : "primary"}
            size="sm"
            onClick={handleToggleEngine}
          >
            {engineOn ? "⏸️ Pause Engine" : "▶️ Resume Engine"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin__stats">
        {[
          { label: "Active Matches",  val: activeCount,    color: "#10E981" },
          { label: "Finished Today",  val: finishedCount,  color: "#2EC7F2" },
          { label: "Total Clubs",     val: CLUBS.length,   color: "#FFC857" },
          { label: "Leagues",         val: LEAGUES.length, color: "#8B5CF6" },
        ].map(s => (
          <Card key={s.label} style={{ padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin__tabs">
        {[
          { id: "clubs",   label: "🏟️ Club Ratings" },
          { id: "matches", label: "⚽ Live Matches"  },
          { id: "odds",    label: "📊 Odds Preview"  },
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

      {/* ── CLUB RATINGS ── */}
      {tab === "clubs" && (
        <div className="fade-in">
          <div className="admin__panel-head">
            <h2>Club Ratings</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <select
                value={leagueF}
                onChange={e => setLeagueF(e.target.value)}
                className="admin__select"
              >
                <option value="all">All Leagues</option>
                {LEAGUES.map(l => (
                  <option key={l.id} value={l.id}>{l.flag} {l.name}</option>
                ))}
              </select>
              <Button
                variant={saved ? "ghost" : "primary"}
                size="sm"
                onClick={handleApplyRatings}
              >
                {saved ? "✅ Applied!" : "💾 Apply Changes"}
              </Button>
            </div>
          </div>

          <div className="admin__clubs-grid">
            {shownClubs.map(club => {
              const league = LEAGUES.find(l => l.id === club.leagueId);
              return (
                <Card key={club.id} style={{ padding: 18 }}>
                  <div className="admin__club-head">
                    <img
                      src={club.logo} alt={club.name}
                      width={32} height={32}
                      style={{ objectFit: "contain", flexShrink: 0 }}
                      onError={e => e.target.style.display = "none"}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{club.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {league?.flag} {league?.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#2EC7F2" }}>
                      {club.ratings.overall}
                    </div>
                  </div>

                  <div className="admin__ratings">
                    {RATING_KEYS.map(({ key, label, min, max }) => (
                      <div key={key} className="admin__rating-row">
                        <div className="admin__rating-meta">
                          <span className="admin__rating-label">{label}</span>
                          <span style={{ color: ratingColor(club.ratings[key]), fontWeight: 700 }}>
                            {club.ratings[key]}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="range" min={min} max={max}
                            value={club.ratings[key]}
                            onChange={e => updateRating(club.id, key, e.target.value)}
                            style={{ flex: 1, accentColor: "#2EC7F2" }}
                          />
                          <input
                            type="number" min={min} max={max}
                            value={club.ratings[key]}
                            onChange={e => updateRating(club.id, key, e.target.value)}
                            className="admin__rating-num"
                          />
                        </div>
                        <div className="admin__rating-bar">
                          <div style={{
                            width: `${((club.ratings[key] - min) / (max - min)) * 100}%`,
                            height: "100%",
                            background: ratingColor(club.ratings[key]),
                            borderRadius: 2,
                            transition: "width 0.3s, background 0.3s",
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIVE MATCHES ── */}
      {tab === "matches" && (
        <div className="fade-in">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
            Live Matches ({matches.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.length === 0 ? (
              <Card style={{ padding: "40px 24px", textAlign: "center" }}>
                <p style={{ color: "var(--muted)" }}>No matches running. Start the engine.</p>
              </Card>
            ) : (
              matches.map(m => (
                <Card key={m.id} style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Badge color={statusBadgeColor(m.status)}>
                      {m.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
                      {m.homeTeam} vs {m.awayTeam}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: "#2EC7F2" }}>
                      {m.homeScore} – {m.awayScore}
                    </span>
                    {m.minute > 0 && (
                      <span style={{ fontSize: 12, color: "#10E981", fontWeight: 700 }}>
                        {m.minute}'
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                    <span>{m.leagueName}</span>
                    <span>1: {m.oddsHome} | X: {m.oddsDraw} | 2: {m.oddsAway}</span>
                    <span>Pool: {(m.poolHome + m.poolDraw + m.poolAway).toFixed(0)} USDC</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── ODDS PREVIEW ── */}
      {tab === "odds" && (
        <div className="fade-in">
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Odds Preview</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            Change club ratings → Apply Changes → odds update on next generated fixture.
          </p>
          <Card style={{ overflow: "hidden" }}>
            <div className="admin__odds-head">
              <span>Home</span><span>Away</span>
              <span style={{ textAlign: "center" }}>1</span>
              <span style={{ textAlign: "center" }}>X</span>
              <span style={{ textAlign: "center" }}>2</span>
            </div>
            {matches.map(m => (
              <div key={m.id} className="admin__odds-row">
                <span>{m.homeTeam}</span>
                <span>{m.awayTeam}</span>
                <span style={{ color: "#2EC7F2", textAlign: "center", fontWeight: 800 }}>{m.oddsHome}</span>
                <span style={{ color: "#FFC857", textAlign: "center", fontWeight: 800 }}>{m.oddsDraw}</span>
                <span style={{ color: "#47D7FF", textAlign: "center", fontWeight: 800 }}>{m.oddsAway}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}