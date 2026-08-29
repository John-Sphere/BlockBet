import { Link } from "react-router-dom";
import "./Casino.css";

const GAMES = [
  {
    key: "blackjack",
    name: "Blackjack",
    tag: "Beat the dealer to 21",
    status: "soon",
    art: "blackjack",
    accent: "green",
  },
  {
    key: "dice",
    name: "Dice",
    tag: "Pick a target, roll provably fair",
    status: "soon",
    art: "dice",
    accent: "violet",
  },
  {
    key: "slots",
    name: "Slots",
    tag: "3-reel, on-chain payouts",
    status: "soon",
    art: "slots",
    accent: "rose",
  },
  {
    key: "plinko",
    name: "Plinko",
    tag: "Drop, bounce, cash out",
    status: "soon",
    art: "plinko",
    accent: "cyan",
  },
  {
    key: "aviator",
    name: "Aviator",
    tag: "Cash out before it crashes",
    status: "live",
    art: "aviator",
    accent: "green",
  },
];

export default function Casino() {
  return (
    <div className="cs-page">
      <div className="cs-header">
        <h1>Casino</h1>
        <p>Provably fair, on-chain games settled instantly in USDC.</p>
      </div>

      <div className="cs-hero-wrap">
        <Link to="/casino/roulette" className="cs-hero">
          <div className="cs-hero-art">
            <RouletteArt />
          </div>
          <div className="cs-hero-body">
            <span className="cs-pill cs-pill-live">● LIVE</span>
            <h2>European Roulette</h2>
            <p>Single zero · Provably fair seed reveal · Full table &amp; outside bets</p>
            <span className="cs-hero-cta">Play now →</span>
          </div>
        </Link>
      </div>

      <div className="cs-section-label">More games</div>
      <div className="cs-grid">
        {GAMES.map((g) => (
          <GameTile key={g.key} game={g} />
        ))}
      </div>
    </div>
  );
}

function GameTile({ game }) {
  const isLive = game.status === "live";
  const content = (
    <>
      <div className="cs-tile-art">
        <GameArt kind={game.art} />
        {!isLive && <div className="cs-tile-lock">SOON</div>}
      </div>
      <div className="cs-tile-body">
        <div className="cs-tile-name">{game.name}</div>
        <div className="cs-tile-tag">{game.tag}</div>
      </div>
    </>
  );

  return isLive ? (
    <Link to={`/casino/${game.key}`} className={`cs-tile cs-accent-${game.accent}`}>
      {content}
    </Link>
  ) : (
    <div className={`cs-tile cs-tile-disabled cs-accent-${game.accent}`}>{content}</div>
  );
}

function GameArt({ kind }) {
  switch (kind) {
    case "blackjack":
      return (
        <svg viewBox="0 0 120 90" className="cs-art">
          <rect x="30" y="14" width="42" height="60" rx="6" className="cs-card cs-card-a" />
          <rect x="48" y="20" width="42" height="60" rx="6" className="cs-card cs-card-b" />
          <text x="69" y="46" className="cs-card-pip">A</text>
          <text x="69" y="66" className="cs-card-suit">♠</text>
        </svg>
      );
    case "dice":
      return (
        <svg viewBox="0 0 120 90" className="cs-art">
          <rect x="24" y="30" width="34" height="34" rx="7" className="cs-die cs-die-a" transform="rotate(-8 41 47)" />
          <rect x="58" y="24" width="34" height="34" rx="7" className="cs-die cs-die-b" transform="rotate(10 75 41)" />
          <circle cx="34" cy="40" r="2.4" className="cs-pip" />
          <circle cx="48" cy="40" r="2.4" className="cs-pip" />
          <circle cx="34" cy="54" r="2.4" className="cs-pip" />
          <circle cx="48" cy="54" r="2.4" className="cs-pip" />
          <circle cx="75" cy="30" r="2.4" className="cs-pip" />
          <circle cx="75" cy="41" r="2.4" className="cs-pip" />
          <circle cx="75" cy="52" r="2.4" className="cs-pip" />
        </svg>
      );
    case "slots":
      return (
        <svg viewBox="0 0 120 90" className="cs-art">
          <rect x="18" y="20" width="84" height="50" rx="8" className="cs-slot-body" />
          <rect x="27" y="29" width="20" height="32" rx="4" className="cs-reel" />
          <rect x="50" y="29" width="20" height="32" rx="4" className="cs-reel" />
          <rect x="73" y="29" width="20" height="32" rx="4" className="cs-reel" />
          <text x="37" y="50" className="cs-reel-sym">7</text>
          <text x="60" y="50" className="cs-reel-sym">★</text>
          <text x="83" y="50" className="cs-reel-sym">7</text>
        </svg>
      );
    case "plinko":
      return (
        <svg viewBox="0 0 120 90" className="cs-art">
          {[0, 1, 2, 3].map((row) =>
            Array.from({ length: row + 3 }).map((_, i) => (
              <circle
                key={`${row}-${i}`}
                cx={30 + i * 14 - row * 7}
                cy={20 + row * 14}
                r="2.6"
                className="cs-peg"
              />
            ))
          )}
          <circle cx="60" cy="18" r="4" className="cs-ball" />
          <rect x="20" y="72" width="80" height="10" rx="3" className="cs-plinko-tray" />
        </svg>
      );
    case "aviator":
      return (
        <svg viewBox="0 0 120 90" className="cs-art">
          <path d="M15 70 Q 55 60 105 20" fill="none" className="cs-av-path" strokeWidth="2.5" />
          <circle cx="105" cy="20" r="5" className="cs-av-plane" />
          <path d="M100 12 L 110 20 L 100 28" fill="none" className="cs-av-wing" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}

function RouletteArt() {
  return (
    <svg viewBox="0 0 200 200" className="cs-hero-svg">
      <circle cx="100" cy="100" r="88" className="cs-hero-ring" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x = 100 + 70 * Math.sin(angle);
        const y = 100 - 70 * Math.cos(angle);
        const colors = ["cs-seg-red", "cs-seg-black"];
        return <circle key={i} cx={x} cy={y} r="7" className={colors[i % 2]} />;
      })}
      <circle cx="100" cy="100" r="6" className="cs-seg-green" />
      <circle cx="100" cy="100" r="34" className="cs-hero-hub" />
    </svg>
  );
}
