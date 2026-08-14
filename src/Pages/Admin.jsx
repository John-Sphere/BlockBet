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
import { ClubBadge }     from "../components/ui/ClubBadge";
import { CLUBS, LEAGUES } from "../data/clubs";
import {
  setAdminOverrides,
  pauseEngine,
  resumeEngine,
  getCurrentMatches,
  initMatchManager,
} from "../engine/matchManager";
import "./Admin.css";

// ── SECURITY: all conditions must be true — unchanged from original ──
function getIsAdmin(connected, address) {
  if (!connected || !address) return false;

  const raw = import.meta.env.VITE_ADMIN_WALLET;
  if (!raw || typeof raw !== "string" || raw.trim() === "") return false;

  const configured = raw.trim().toLowerCase();

  if (!/^0x[0-9a-f]{40}$/.test(configured)) return false;

  return address.toLowerCase() === configured;
}

const RATING_KEYS = [
  { key:"attack",          label:"Attack",           min:40, max:100 },
  { key:"midfield",        label:"Midfield",         min:40, max:100 },
  { key:"defence",         label:"Defence",          min:40, max:100 },
  { key:"goalkeeping",     label:"Goalkeeping",      min:40, max:100 },
  { key:"overall",         label:"Overall",          min:40, max:100 },
  { key:"form",            label:"Form",             min:40, max:100 },
  { key:"homeAdvantage",   label:"Home advantage",   min:0,  max:20  },
  { key:"awayPerformance", label:"Away performance", min:50, max:100 },
];

function ratingColor(v) {
  if (v >= 88) return "var(--win-green)";
  if (v >= 75) return "var(--gold)";
  if (v >= 60) return "var(--chalk-dim)";
  return "var(--loss-red)";
}

function statusBadgeTone(s) {
  const map = {
    betting:     "open",
    first_half:  "live",
    halftime:    "muted",
    second_half: "live",
    finished:    "muted",
  };
  return map[s] || "muted";
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

  useEffect(() => {
    initMatchManager();
    const t = setInterval(() => {
      setMatches(getCurrentMatches());
    }, 1000);
    return () => clearInterval(t);
  }, []);

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
      addToast("Club ratings applied. Odds update on next fixture.", "success");
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function handleToggleEngine() {
    guardedAction(() => {
      if (engineOn) {
        pauseEngine();
        setEngineOn(false);
        addToast("Engine paused.", "warning");
      } else {
        resumeEngine();
        setEngineOn(true);
        addToast("Engine resumed.", "success");
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

  if (!connected) {
    return (
      <div className="admin-gate">
        <h2>Admin panel</h2>
        <p>Connect your wallet to continue.</p>
      </div>
    );
  }

  const rawEnv = import.meta.env.VITE_ADMIN_WALLET?.trim();
  if (!rawEnv || rawEnv === "" || !/^0x[0-9a-fA-F]{40}$/.test(rawEnv)) {
    return (
      <div className="admin-gate">
        <h2>Admin not configured</h2>
        <p>
          Set <code>VITE_ADMIN_WALLET</code> in your <code>.env</code> file
          to a valid Ethereum address to enable admin access.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <h2>Access denied</h2>
        <p>Your wallet is not authorised to access the Admin panel.</p>
        <Badge tone="danger">
          {address?.slice(0,6)}…{address?.slice(-4)}
        </Badge>
      </div>
    );
  }

  return (
    <div className="admin">

      <div className="admin__head">
        <div>
          <h1 className="admin__title">Admin dashboard</h1>
          <p className="admin__sub">BLOCKBET engine control panel</p>
        </div>
        <div className="admin__head-actions">
          <Badge tone={engineOn ? "success" : "danger"}>
            {engineOn ? "Engine running" : "Engine paused"}
          </Badge>
          <Button
            variant={engineOn ? "danger" : "primary"}
            size="sm"
            onClick={handleToggleEngine}
          >
            {engineOn ? "Pause engine" : "Resume engine"}
          </Button>
        </div>
      </div>

      <div className="admin__stats">
        {[
          { label: "Active matches",  val: activeCount },
          { label: "Finished today",  val: finishedCount },
          { label: "Total clubs",     val: CLUBS.length },
          { label: "Leagues",         val: LEAGUES.length },
        ].map(s => (
          <Card key={s.label} style={{ padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--gold)" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--chalk-dim)", marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="admin__tabs">
        {[
          { id: "clubs",   label: "Club ratings" },
          { id: "matches", label: "Live matches" },
          { id: "odds",    label: "Odds preview" },
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

      {tab === "clubs" && (
        <div>
          <div className="admin__panel-head">
            <h2>Club ratings</h2>
            <div style={{ display: "flex", gap: 10 }}>
              <select
                value={leagueF}
                onChange={e => setLeagueF(e.target.value)}
                className="admin__select"
              >
                <option value="all">All leagues</option>
                {LEAGUES.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <Button
                variant={saved ? "ghost" : "primary"}
                size="sm"
                onClick={handleApplyRatings}
              >
                {saved ? "Applied" : "Apply changes"}
              </Button>
            </div>
          </div>

          <div className="admin__clubs-grid">
            {shownClubs.map(club => {
              const league = LEAGUES.find(l => l.id === club.leagueId);
              return (
                <Card key={club.id} style={{ padding: 18 }}>
                  <div className="admin__club-head">
                    <ClubBadge name={club.name} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--chalk)" }}>{club.name}</div>
                      <div style={{ fontSize: 11, color: "var(--chalk-dim)" }}>
                        {league?.name}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>
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
                            style={{ flex: 1, accentColor: "var(--gold)" }}
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

      {tab === "matches" && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--chalk)" }}>
            Live matches ({matches.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matches.length === 0 ? (
              <Card style={{ padding: "40px 24px", textAlign: "center" }}>
                <p style={{ color: "var(--chalk-dim)" }}>No matches running. Start the engine.</p>
              </Card>
            ) : (
              matches.map(m => (
                <Card key={m.id} style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Badge tone={statusBadgeTone(m.status)}>
                      {m.status.replace("_", " ")}
                    </Badge>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--chalk)" }}>
                      {m.homeTeam} vs {m.awayTeam}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>
                      {m.homeScore} – {m.awayScore}
                    </span>
                    {m.minute > 0 && (
                      <span style={{ fontSize: 12, color: "var(--win-green)", fontWeight: 700 }}>
                        {m.minute}'
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--chalk-dim)" }}>
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

      {tab === "odds" && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--chalk)" }}>Odds preview</h2>
          <p style={{ fontSize: 13, color: "var(--chalk-dim)", marginBottom: 20 }}>
            Change club ratings, apply changes, and odds update on the next generated fixture.
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
                <span style={{ color: "var(--gold)", textAlign: "center", fontWeight: 700 }}>{m.oddsHome}</span>
                <span style={{ color: "var(--chalk)", textAlign: "center", fontWeight: 700 }}>{m.oddsDraw}</span>
                <span style={{ color: "var(--gold-bright)", textAlign: "center", fontWeight: 700 }}>{m.oddsAway}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
