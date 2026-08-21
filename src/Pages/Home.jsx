import { Link } from "react-router-dom";
import "./Home.css";

const TICKER_ITEMS = [
  { t: "Man United vs Newcastle", o: "2.10", d: "up" },
  { t: "Juventus vs AC Milan", o: "2.20", d: "up" },
  { t: "Real Madrid vs Barcelona", o: "2.05", d: "down" },
  { t: "Liverpool vs Chelsea", o: "2.05", d: "up" },
  { t: "Bayern vs Dortmund", o: "1.65", d: "down" },
  { t: "Inter vs Napoli", o: "2.15", d: "up" },
];

const LIVE_PREVIEW = [
  { league: "Premier League", minute: "90'", home: "Man United", away: "Newcastle", hs: 1, as: 0, odds: ["2.10", "3.40", "4.80"] },
  { league: "Serie A", minute: "71'", home: "Juventus", away: "AC Milan", hs: 1, as: 1, odds: ["2.20", "3.20", "3.10"] },
  { league: "La Liga", minute: "54'", home: "Real Madrid", away: "Barcelona", hs: 0, as: 0, odds: ["2.05", "3.75", "3.40"] },
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
            <div className="hero-corner">LIVE FORMATION · ARC TESTNET</div>
            <svg className="grid-lines" viewBox="0 0 460 500" width="100%" height="100%">
              <line x1="0" y1="250" x2="460" y2="250" stroke="#4C86FF" strokeWidth="1" />
              <circle cx="230" cy="250" r="60" fill="none" stroke="#4C86FF" strokeWidth="1" />
              <circle cx="230" cy="250" r="2.5" fill="#4C86FF" />
              <rect x="0" y="180" width="46" height="140" fill="none" stroke="#4C86FF" strokeWidth="1" />
              <rect x="414" y="180" width="46" height="140" fill="none" stroke="#4C86FF" strokeWidth="1" />
              <path d="M40,420 C120,360 160,300 230,250 C300,200 340,140 420,90" fill="none" stroke="#7DA6FF" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
              <circle cx="420" cy="90" r="5" fill="#7DA6FF" />
              <circle cx="40" cy="420" r="4" fill="#4C86FF" opacity="0.6" />
            </svg>
            <div className="glow-ring" />
            <div className="glow-ring r2" />
            <div className="glow-ring r3" />
            <div className="hero-badge">
              <div className="hb-team"><span className="hb-badge" />BlockBet FC</div>
              <div className="hb-score">2 – 1</div>
              <div className="hb-live">LIVE 78'</div>
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
            <h2>27 matches live across 6 leagues</h2>
            <p>Every fixture is deterministic — the same round, same kickoff time, same result, for every visitor.</p>
          </div>
          <div className="live-preview">
            {LIVE_PREVIEW.map((m, i) => (
              <Link to="/football" className="lp-card" key={i}>
                <div className="lp-top">
                  <span className="lp-league">{m.league}</span>
                  <span className="lp-live">LIVE {m.minute}</span>
                </div>
                <div className="lp-teams">
                  <div className="lp-team-row"><span className="lp-badge" /><span>{m.home}</span><span className="sc">{m.hs}</span></div>
                  <div className="lp-team-row"><span className="lp-badge" /><span>{m.away}</span><span className="sc">{m.as}</span></div>
                </div>
                <div className="lp-odds">
                  {m.odds.map((o, j) => <span key={j}>{o}</span>)}
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
