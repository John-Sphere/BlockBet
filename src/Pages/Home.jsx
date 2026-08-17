import { Link } from "react-router-dom";
import { Link2, DollarSign, BrainCircuit, ShieldCheck, Lock, BadgeCheck, Shirt, Globe2, BarChart3, Clock } from "lucide-react";
import "./Home.css";

const FEATURES = [
  {
    icon: Link2,
    title: "On-chain",
    tag: "Transparent. Verifiable. Trustless.",
    body: "Every bet, result, and payout is recorded on-chain. No middlemen, no hidden data — just pure transparency you can verify anytime.",
    link: "100% Provably Fair",
  },
  {
    icon: DollarSign,
    title: "USDC settled",
    tag: "Fast. Stable. Reliable.",
    body: "All deposits, bets, and payouts settle in USDC. Enjoy the stability of a world-class stablecoin with instant on-chain settlement.",
    link: "Stable Value · Instant Settlement",
  },
  {
    icon: BrainCircuit,
    title: "AI-powered",
    tag: "Smarter simulations. Better experience.",
    body: "Our simulation engine models matches in real time with data-driven logic to deliver realistic results and a fair betting experience.",
    link: "Intelligent · Adaptive · Fair",
  },
  {
    icon: ShieldCheck,
    title: "Built on Arc",
    tag: "Fast. Scalable. Secure.",
    body: "BLOCKBET runs on Arc — a next-generation Layer 1 blockchain designed for speed, scalability, and real-world financial applications.",
    link: "Fast · Scalable · Secure",
  },
];

const STATS = [
  { icon: Shirt, num: "114+", label: "Clubs", sub: "From top leagues worldwide" },
  { icon: Globe2, num: "6", label: "Leagues", sub: "Premier League, La Liga, Serie A & more" },
  { icon: BarChart3, num: "Live", label: "Matches", sub: "Full matchdays, simulated live" },
  { icon: Clock, num: "24/7", label: "Live", sub: "New matchdays, non-stop action" },
];

export default function Home() {
  return (
    <div className="hp">
      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-hero-text">
          <div className="eyebrow">AI-powered. On-chain. Built for the game.</div>
          <h1 className="hp-hero-title">
            Read the game.
            <br />
            <span>Back your call.</span>
          </h1>
          <p className="hp-hero-sub">
            BLOCKBET is the next generation of on-chain sports betting.
            Every match, every bet, every payout — transparent, provable,
            and settled in USDC on Arc.
          </p>
          <div className="hp-hero-actions">
            <Link to="/football" className="btn-gold hp-cta">Start betting &rarr;</Link>
            <Link to="/football" className="btn-outline hp-cta">Explore matches &rarr;</Link>
          </div>

          <div className="hp-trust-row">
            <div className="hp-trust-item">
              <ShieldCheck size={20} />
              <div>
                <div className="hp-trust-title">Provably fair</div>
                <div className="hp-trust-sub">Verifiable outcomes on-chain</div>
              </div>
            </div>
            <div className="hp-trust-item">
              <Lock size={20} />
              <div>
                <div className="hp-trust-title">Transparent</div>
                <div className="hp-trust-sub">Every bet and payout is on-chain</div>
              </div>
            </div>
            <div className="hp-trust-item">
              <BadgeCheck size={20} />
              <div>
                <div className="hp-trust-title">Secure</div>
                <div className="hp-trust-sub">Built with industry best practices</div>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for a hero image — swap the background/content of
            .hp-hero-visual in Home.css for a real photo or illustration
            when you have one. */}
        <div className="hp-hero-visual">
          <div className="hp-hero-visual-inner">
            <span className="hp-hero-visual-number">10</span>
            <span className="hp-hero-visual-label">BLOCKBET</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="hp-features">
        <div className="hp-features-head">
          <div className="eyebrow">Built on the foundations that matter</div>
          <h2 className="hp-features-title">Built on the foundations that matter.</h2>
        </div>

        <div className="hp-feature-list">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="hp-feature-row" key={f.title}>
                <div className="hp-feature-icon">
                  <Icon size={26} />
                </div>
                <div className="hp-feature-body">
                  <div className="hp-feature-title">{f.title.toUpperCase()}</div>
                  <div className="hp-feature-tag">{f.tag}</div>
                  <p className="hp-feature-text">{f.body}</p>
                </div>
                <div className="hp-feature-link">{f.link} &rarr;</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="hp-stats">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div className="hp-stat" key={s.label}>
              <Icon size={22} />
              <div>
                <div className="hp-stat-num">{s.num} <span>{s.label}</span></div>
                <div className="hp-stat-sub">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── CTA BANNER ── */}
      <section className="hp-banner">
        <div className="hp-banner-text">
          <h2>The future of sports betting is here.</h2>
          <p>Join players already betting smarter with transparency, security, and innovation.</p>
        </div>
        <div className="hp-banner-action">
          <Link to="/football" className="hp-banner-btn">Start betting now &rarr;</Link>
          <div className="hp-banner-sub">Built on Arc. Secured by blockchain. Backed by USDC.</div>
        </div>
      </section>
    </div>
  );
}
