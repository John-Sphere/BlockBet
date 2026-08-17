import { Link } from "react-router-dom";
import "./Home.css";

// Small inline icon components — avoids adding a new dependency
// (lucide-react isn't installed in this project) just for a handful
// of simple line icons.
function IconLink({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function IconDollar({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function IconBrain({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9.5 2a2.5 2.5 0 0 1 2.5 2.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>; }
function IconShield({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>; }
function IconLock({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IconBadgeCheck({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>; }
function IconShirt({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z"/></svg>; }
function IconGlobe({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>; }
function IconBarChart({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>; }
function IconClock({ size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }

const FEATURES = [
  {
    icon: IconLink,
    title: "On-chain",
    tag: "Transparent. Verifiable. Trustless.",
    body: "Every bet, result, and payout is recorded on-chain. No middlemen, no hidden data — just pure transparency you can verify anytime.",
    link: "100% Provably Fair",
  },
  {
    icon: IconDollar,
    title: "USDC settled",
    tag: "Fast. Stable. Reliable.",
    body: "All deposits, bets, and payouts settle in USDC. Enjoy the stability of a world-class stablecoin with instant on-chain settlement.",
    link: "Stable Value · Instant Settlement",
  },
  {
    icon: IconBrain,
    title: "AI-powered",
    tag: "Smarter simulations. Better experience.",
    body: "Our simulation engine models matches in real time with data-driven logic to deliver realistic results and a fair betting experience.",
    link: "Intelligent · Adaptive · Fair",
  },
  {
    icon: IconShield,
    title: "Built on Arc",
    tag: "Fast. Scalable. Secure.",
    body: "BLOCKBET runs on Arc — a next-generation Layer 1 blockchain designed for speed, scalability, and real-world financial applications.",
    link: "Fast · Scalable · Secure",
  },
];

const STATS = [
  { icon: IconShirt, num: "114+", label: "Clubs", sub: "From top leagues worldwide" },
  { icon: IconGlobe, num: "6", label: "Leagues", sub: "Premier League, La Liga, Serie A & more" },
  { icon: IconBarChart, num: "Live", label: "Matches", sub: "Full matchdays, simulated live" },
  { icon: IconClock, num: "24/7", label: "Live", sub: "New matchdays, non-stop action" },
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
          </div>

          <div className="hp-trust-row">
            <div className="hp-trust-item">
              <IconShield size={20} />
              <div>
                <div className="hp-trust-title">Provably fair</div>
                <div className="hp-trust-sub">Verifiable outcomes on-chain</div>
              </div>
            </div>
            <div className="hp-trust-item">
              <IconLock size={20} />
              <div>
                <div className="hp-trust-title">Transparent</div>
                <div className="hp-trust-sub">Every bet and payout is on-chain</div>
              </div>
            </div>
            <div className="hp-trust-item">
              <IconBadgeCheck size={20} />
              <div>
                <div className="hp-trust-title">Secure</div>
                <div className="hp-trust-sub">Built with industry best practices</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero image — save the file to public/hero-player.jpg */}
        <div className="hp-hero-visual">
          <img src="/hero-player.jpg" alt="BLOCKBET player" className="hp-hero-photo" />
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
