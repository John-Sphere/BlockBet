import { Link } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { subscribe, initMatchManager } from "../engine/matchManager";
import RadarViz from "../components/charts/RadarViz";
import "./Home.css";

const TICKER_ITEMS = [
  { t: "Man United vs Newcastle", o: "2.10", d: "up" },
  { t: "Juventus vs AC Milan", o: "2.20", d: "up" },
  { t: "Real Madrid vs Barcelona", o: "2.05", d: "down" },
  { t: "Liverpool vs Chelsea", o: "2.05", d: "up" },
  { t: "Bayern vs Dortmund", o: "1.65", d: "down" },
  { t: "Inter vs Napoli", o: "2.15", d: "up" },
];

const STEPS = [
  { num: "01", title: "Connect & fund", body: "Connect any browser wallet or scan to connect on mobile, then bridge testnet USDC in a click." },
  { num: "02", title: "Back your call", body: "Odds are drawn from real club ratings and move live with the match. Lock in a single or stack an accumulator." },
  { num: "03", title: "Claim or cash out", body: "Let it ride to full time, or exit early at a live signed quote. Winnings settle straight to your wallet." },
];

function TrustIcon({ name }) {
  switch (name) {
    case "shield":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z" /></svg>;
    case "lock":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case "check":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>;
    default:
      return null;
  }
}

// Note: the topbar is NOT duplicated here — Layout.jsx already
// renders <Navbar /> for every page (including this one, using its
// simple isHome variant from Phase 1). This component starts at the
// hero, not with its own separate top bar.
export default function Home() {
  const [allMatches, setAllMatches] = useState([]);

  useEffect(() => {
    initMatchManager();
    const unsub = subscribe((matches) => setAllMatches(matches));
    return unsub;
  }, []);

  const liveMatches = useMemo(
    () => allMatches.filter((m) => m.status === "first_half" || m.status === "second_half" || m.status === "halftime"),
    [allMatches]
  );
  const featuredLive = liveMatches[0];

  return (
    <div className="home-page">
      <div className="wrap">
        <div className="hero">
          <div>
            <div className="eyebrow">
              <span className="dot" />
              AI-powered · On-chain · Built for the game
            </div>
            <h1>
              Read the game.
              <br />
              <span className="accent">Back your call.</span>
            </h1>
            <p className="sub">
              BlockBet is the next generation of on-chain sports betting. Every match, every bet,
              every payout — transparent, provable, and settled in USDC on Arc.
            </p>
            <div className="hero-cta">
              <Link to="/football" className="btn-start">Start betting →</Link>
              <a href="#how-it-works" className="btn-docs">How it works</a>
            </div>
            <div className="trust-row">
              <div className="trust-item">
                <TrustIcon name="shield" />
                <div><div className="t">Provably fair</div><div className="d">Verifiable outcomes on-chain</div></div>
              </div>
              <div className="trust-item">
                <TrustIcon name="lock" />
                <div><div className="t">Transparent</div><div className="d">Every bet and payout is on-chain</div></div>
              </div>
              <div className="trust-item">
                <TrustIcon name="check" />
                <div><div className="t">Secure</div><div className="d">Built with industry best practices</div></div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-corner">LIVE MATCH RADAR · ARC TESTNET</div>
            <RadarViz matches={liveMatches} />
            <div className="glow-ring" />
            <div className="glow-ring r2" />
            <div className="glow-ring r3" />
            <div className="hero-badge">
              {featuredLive ? (
                <>
                  <div className="hb-team"><span className="hb-badge" />{featuredLive.homeTeam} v {featuredLive.awayTeam}</div>
                  <div className="hb-score">{featuredLive.homeScore} – {featuredLive.awayScore}</div>
                  <div className="hb-live">LIVE {featuredLive.minute}'</div>
                </>
              ) : (
                <div className="hb-team" style={{ width: "100%", justifyContent: "center" }}>
                  {liveMatches.length} matches live right now
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ticker-strip">
        <div className="ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((x, i) => (
            <div className="t-item" key={i}>
              <b>{x.t}</b>
              <span>{x.o}</span>
              <span className={x.d}>{x.d === "up" ? "▲" : "▼"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wrap">
        <section id="how-it-works">
          <div className="section-head">
            <div className="section-eyebrow">How it works</div>
            <h2>From wallet to winnings, three steps.</h2>
            <p>No custodial accounts, no withdrawal queues. Everything settles directly to your wallet on Arc.</p>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step-card" key={s.num}>
                <div className="step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="section-head">
            <div className="section-eyebrow">Right now</div>
            <h2>{liveMatches.length} matches live across {new Set(allMatches.map(m => m.leagueName)).size} leagues</h2>
            <p>Every fixture is deterministic — the same round, same kickoff time, same result, for every visitor.</p>
          </div>
          <div className="live-preview">
            {(liveMatches.length > 0 ? liveMatches : allMatches).slice(0, 3).map((m) => (
              <Link to={`/match/${m.id}`} className="lp-card" key={m.id}>
                <div className="lp-top">
                  <span className="lp-league">{m.leagueName}</span>
                  {liveMatches.length > 0
                    ? <span className="lp-live">LIVE {m.minute}'</span>
                    : <span className="lp-league">{new Date(m.kickOffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                <div className="lp-teams">
                  <div className="lp-team-row"><span className="lp-badge" /><span>{m.homeTeam}</span><span className="sc">{m.homeScore ?? "\u2014"}</span></div>
                  <div className="lp-team-row"><span className="lp-badge" /><span>{m.awayTeam}</span><span className="sc">{m.awayScore ?? "\u2014"}</span></div>
                </div>
                <div className="lp-odds">
                  <span>{m.oddsHome?.toFixed(2)}</span>
                  <span>{m.oddsDraw?.toFixed(2)}</span>
                  <span>{m.oddsAway?.toFixed(2)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="stats-band">
            <div className="sb-item"><div className="num blue">114</div><div className="lbl">Clubs tracked across 6 leagues</div></div>
            <div className="sb-item"><div className="num green">100%</div><div className="lbl">Bets settled on-chain</div></div>
            <div className="sb-item"><div className="num blue">&lt;2s</div><div className="lbl">Indexer sync latency</div></div>
            <div className="sb-item"><div className="num green">0</div><div className="lbl">Custodial funds held</div></div>
          </div>
        </section>

        <section style={{ paddingTop: 0 }}>
          <div className="cta-banner">
            <h2>Every bet, provable. Every payout, yours.</h2>
            <p>Connect a wallet and place your first bet on Arc Testnet — funded in USDC, settled on-chain.</p>
            <Link to="/football" className="btn-start" style={{ display: "inline-flex" }}>Start betting →</Link>
          </div>
        </section>
      </div>

      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <div className="footer-brand"><span className="mark" />BlockBet</div>
              <p className="footer-desc">On-chain virtual sportsbook settled in USDC on Arc Testnet. Provably fair, fully transparent.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/football">Football</Link>
              <Link to="/football?live=1">Live</Link>
              <Link to="/football?hot=1">Hot games</Link>
              <Link to="/leaderboard">Table</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/my-bets">Open Bet</Link>
              <Link to="/history">Match History</Link>
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">Get USDC</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="https://blockbet.mintlify.app" target="_blank" rel="noopener noreferrer">Docs</a>
              <a href="https://testnet.arcscan.app/address/0xD49620Dad8Ce38d2dD69F97FE955220eF51eF3f9" target="_blank" rel="noopener noreferrer">Contract on explorer</a>
              <a href="#">Status</a>
            </div>
          </div>
          <div className="footer-bottom">
            <div>© 2026 BlockBet · v2.0 Phase 2</div>
            <div className="net"><span className="dot" />Arc Testnet · USDC Native</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
