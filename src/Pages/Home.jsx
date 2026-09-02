import { useState, useEffect, useMemo } from "react";
import { subscribe, initMatchManager } from "../engine/matchManager";
import RadarViz from "../components/charts/RadarViz";
import "./Home.css";

const GLOSSARY = [
  { term: "Wallet", icon: "◈", body: "An app that holds your funds and signs transactions — nobody but you can move money out of it." },
  { term: "USDC", icon: "$", body: "A digital dollar — 1 USDC is designed to always equal $1. It's what you bet with." },
  { term: "On-chain", icon: "⛓", body: "Recorded permanently on a public ledger anyone can inspect — not a private database." },
  { term: "Testnet", icon: "◎", body: "A practice network. Same mechanics as the real thing, but the USDC has no real-world value." },
  { term: "Provably fair", icon: "✓", body: "A result you can personally recompute and verify — not just a promise you have to trust." },
];

const BET_FLOW = [
  { n: "1", title: "You pick odds", body: "Tap a price — it's locked in for you at that exact number." },
  { n: "2", title: "Wallet signs it", body: "Your wallet asks you to confirm — nothing moves without your approval." },
  { n: "3", title: "Stake moves on-chain", body: "USDC leaves your wallet and enters the contract, publicly recorded." },
  { n: "4", title: "Payout returns automatically", body: "If you win, the contract pays your wallet directly — no request needed." },
];

const FEATURES = [
  { icon: "◆", title: "Provably fair, not just claimed", body: "Roulette spins use a commit-reveal seed you can verify after the fact — the server can't have known the result in advance." },
  { icon: "◇", title: "Odds that move with the match", body: "Prices are calculated from real club ratings and shift live as the scoreline changes, not held static behind the scenes." },
  { icon: "▲", title: "Cash out at a real quote", body: "Exit a pending bet early at a dynamically priced, signed quote instead of a flat, arbitrary discount." },
  { icon: "●", title: "Nothing sits in a custodial account", body: "Funds move directly between your wallet and the contract — BlockBet never holds a balance on your behalf." },
];

const USE_CASES = [
  { icon: "⚽", title: "Fixed-odds singles", body: "Lock in a price the moment you bet — honored regardless of how the market moves after." },
  { icon: "▦", title: "Accumulators", body: "Stack two or more legs for combined odds, settled together once every leg resolves." },
  { icon: "↺", title: "Live cash-out", body: "Exit early mid-match at a live-priced, signed quote instead of waiting for full time." },
];

const COMPARISON = [
  { label: "Where your money sits", trad: "In the operator's account", bb: "In your own wallet until you bet" },
  { label: "Can you verify a result?", trad: "You have to trust the operator", bb: "Recompute it yourself from the published seed" },
  { label: "Withdrawal", trad: "Request & wait for approval", bb: "Already in your wallet — nothing to request" },
];

const PF_STEPS = [
  { tag: "BEFORE", title: "Server commits", body: "Publishes a scrambled fingerprint of its secret number." },
  { tag: "DURING", title: "Spin resolves", body: "Your result is calculated using that already-committed number." },
  { tag: "AFTER", title: "Server reveals", body: "The original number is published in full." },
  { tag: "YOU", title: "You verify", body: "Re-scramble the revealed number — it matches, or it doesn't." },
];

const RESOURCES = [
  { tag: "//R.01", title: "Get testnet USDC", body: "Fund a wallet in one click to start placing bets on Arc Testnet." },
  { tag: "//R.02", title: "Read the docs", body: "Contract addresses, indexer schema, and API reference for the whole stack." },
  { tag: "//R.03", title: "Verify a spin", body: "Step-by-step guide to reproducing any roulette result from its published seed." },
  { tag: "//R.04", title: "Explorer", body: "Inspect every bet, match, and payout directly on Arc's block explorer." },
];

const FAQS = [
  { q: "Is this real money?", a: "No — BlockBet currently runs entirely on Arc Testnet using testnet USDC with no real-world value." },
  { q: "Do you ever hold my funds?", a: "No. Stakes move directly from your wallet into the contract when you bet, and payouts move directly back out." },
];

// Note: no embedded topbar here — Layout.jsx already renders the real
// site navbar for every page, including this one. Building a second
// one directly into this component would duplicate it.
export default function Home() {
  const [tab, setTab] = useState("sports");
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
  const clubsTracked = useMemo(() => {
    const names = new Set();
    allMatches.forEach((m) => { names.add(m.homeTeam); names.add(m.awayTeam); });
    return names.size;
  }, [allMatches]);

  return (
    <div className="home-page">
      {/* ============ HERO ============ */}
      <div className="hp-hero">
        <div className="hp-hero-shape">
          <RadarViz matches={liveMatches} size={600} />
        </div>
        <div className="hp-hero-badge">New to crypto betting? This page explains everything below.</div>
        <div className="hp-eyebrow">ON-CHAIN SPORTSBOOK &amp; CASINO</div>
        <h1>
          Every wager, verifiable.
          <br />
          Every payout, yours.
        </h1>
        <p className="hp-hero-sub">
          BlockBet turns match odds, casino spins, and token swaps into a single onchain experience —
          priced transparently, settled instantly, and never held in a custodial account.
        </p>
        <div className="hp-hero-cta-row">
          <a href="/football" className="hp-btn-primary">Start betting →</a>
          <a href="#how-it-works" className="hp-btn-secondary">How it works</a>
        </div>
        <div className="hp-hero-status"><i />{liveMatches.length} matches live right now on Arc Testnet</div>
      </div>

      <div className="hp-wrap">
        {/* ============ FEATURES ============ */}
        <section>
          <div className="hp-eyebrow-tag">Why BlockBet</div>
          <h2 className="hp-h2">Built so the house never has the last word</h2>
          <p className="hp-p">BlockBet is engineered around one idea: you shouldn't have to trust the operator. Every price, every spin, and every payout is something you can check yourself.</p>
          <div className="hp-feat-grid">
            {FEATURES.map((f) => (
              <div className="hp-feat-card" key={f.title}>
                <div className="hp-feat-ico">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ GLOSSARY ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag center">New here?</div>
          <h2 className="hp-h2 center">Five words you'll see everywhere</h2>
          <p className="hp-p center">A quick glossary before anything else — these terms show up constantly once you're in the app.</p>
          <div className="hp-glossary">
            {GLOSSARY.map((g) => (
              <div className="hp-g-card" key={g.term}>
                <div className="hp-g-term"><div className="hp-g-ico">{g.icon}</div><h5>{g.term}</h5></div>
                <p>{g.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ STEP FLOW ============ */}
        <section id="how-it-works" style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag center">Step by step</div>
          <h2 className="hp-h2 center">What actually happens when you bet</h2>
          <p className="hp-p center">Four steps, start to finish — no hidden middle layer.</p>
          <div className="hp-flow">
            <div className="hp-flow-line" />
            <div className="hp-flow-steps">
              {BET_FLOW.map((s) => (
                <div className="hp-flow-step" key={s.n}>
                  <div className="hp-flow-dot">{s.n}</div>
                  <h5>{s.title}</h5>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ STATS ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-stats-band">
            <div className="hp-stat"><div className="hp-num gold">{allMatches.length}</div><div className="hp-lbl">Matches today</div></div>
            <div className="hp-stat"><div className="hp-num green">{liveMatches.length}</div><div className="hp-lbl">Live now</div></div>
            <div className="hp-stat"><div className="hp-num gold">{clubsTracked}</div><div className="hp-lbl">Clubs tracked</div></div>
            <div className="hp-stat"><div className="hp-num green">100%</div><div className="hp-lbl">Settled onchain</div></div>
          </div>
        </section>

        {/* ============ USE CASES ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag">What you can wager on</div>
          <h2 className="hp-h2">One wallet, every way to play</h2>
          <p className="hp-p">Whichever way you like to bet, it settles through the same contract and the same USDC balance.</p>
          <div className="hp-tabs">
            <button className={`hp-tab ${tab === "sports" ? "active" : ""}`} onClick={() => setTab("sports")}>Sports</button>
            <button className={`hp-tab ${tab === "casino" ? "active" : ""}`} onClick={() => setTab("casino")}>Casino</button>
          </div>
          <div className="hp-use-grid">
            {USE_CASES.map((u) => (
              <div className="hp-use-card" key={u.title}>
                <div className="hp-use-ico">{u.icon}</div>
                <h5>{u.title}</h5>
                <p>{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ COMPARISON TABLE ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag center">Why it's different</div>
          <h2 className="hp-h2 center">Traditional sportsbook vs. BlockBet</h2>
          <p className="hp-p center">The mechanics most bettors never get to see, laid out side by side.</p>
          <div className="hp-cmp">
            <div className="hp-cmp-row head">
              <div className="hp-cmp-cell" />
              <div className="hp-cmp-cell">Traditional sportsbook</div>
              <div className="hp-cmp-cell">BlockBet</div>
            </div>
            {COMPARISON.map((row) => (
              <div className="hp-cmp-row" key={row.label}>
                <div className="hp-cmp-cell label">{row.label}</div>
                <div className="hp-cmp-cell trad">{row.trad}</div>
                <div className="hp-cmp-cell bb">{row.bb}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ PROVABLY FAIR DEEP DIVE ============ */}
        <section id="provably-fair" style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag center">Deeper dive</div>
          <h2 className="hp-h2 center">How "provably fair" actually works</h2>
          <p className="hp-p center">Using a real example: a roulette spin.</p>
          <div className="hp-pf-box">
            <p className="hp-pf-lead">
              Before your spin happens, the server generates a secret number and publishes its <i>hash</i> —
              a scrambled fingerprint that reveals nothing on its own. Only after the spin resolves does the
              server publish the original secret number. Anyone can re-hash it and confirm it matches what
              was published beforehand — proving the server couldn't have changed its answer after the fact.
            </p>
            <div className="hp-pf-steps">
              {PF_STEPS.map((s) => (
                <div className="hp-pf-step" key={s.tag}>
                  <div className="hp-pf-num">{s.tag}</div>
                  <h5>{s.title}</h5>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ RESOURCES ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag">Resources</div>
          <h2 className="hp-h2">Built in the open</h2>
          <div className="hp-res-grid">
            {RESOURCES.map((r) => (
              <div className="hp-res-card" key={r.tag}>
                <div className="hp-res-tag">{r.tag}</div>
                <h5>{r.title}</h5>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-eyebrow-tag">FAQ</div>
          <h2 className="hp-h2">Common questions</h2>
          {FAQS.map((f) => (
            <div className="hp-faq-item" key={f.q}>
              <div className="hp-faq-q">{f.q}</div>
              <div className="hp-faq-a">{f.a}</div>
            </div>
          ))}
        </section>

        {/* ============ CTA ============ */}
        <section style={{ paddingTop: 0 }}>
          <div className="hp-cta-banner">
            <h2>Ready to see it for yourself?</h2>
            <p>Connect a wallet, claim testnet USDC, and place a bet you can verify every step of.</p>
            <a href="/football" className="hp-btn-primary">Start betting →</a>
          </div>
        </section>
      </div>

      {/* ============ FOOTER ============ */}
      <footer className="hp-footer">
        <div className="hp-wrap">
          <div className="hp-footer-grid">
            <div className="hp-footer-col"><h4>PLAY</h4><a href="/football">Football</a><a href="/casino">Casino</a><a href="/swap">Swap</a><a href="/leaderboard">Table</a></div>
            <div className="hp-footer-col"><h4>ACCOUNT</h4><a href="/my-bets">Open Bet</a><a href="/history">Match History</a><a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">Get USDC</a></div>
            <div className="hp-footer-col"><h4>LEARN</h4><a href="#how-it-works">How it works</a><a href="#provably-fair">Provably fair</a><a href="https://blockbet.mintlify.app" target="_blank" rel="noopener noreferrer">Docs</a></div>
            <div className="hp-footer-col"><h4>CONNECT</h4><a href="https://x.com/block_on_bet" target="_blank" rel="noopener noreferrer">X</a></div>
          </div>
          <div className="hp-footer-bottom">© 2026 BlockBet — Arc Testnet · USDC Native. Testnet only, no real-money value.</div>
        </div>
      </footer>
    </div>
  );
}
