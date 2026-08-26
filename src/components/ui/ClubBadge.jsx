import { useState } from "react";
import "./ClubBadge.css";

// Curated palette so colors stay readable on the dark pitch background.
const PALETTE = [
  "#C9A24B", "#5B8DEF", "#E0574A", "#4E9A5C", "#B15FD1",
  "#4BB3C9", "#D18A3E", "#7C8CC9", "#C95B8C", "#6FAE4E",
];

// Deterministic hash so the same club name always gets the same color
// and shield style, without storing a color field in clubs.js.
function hashToIndex(str, mod) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % mod;
}

function getInitials(name) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

// Converts "Manchester United" -> "manchester-united", matching the
// exact filename each club's real crest should be saved as.
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Three subtly different shield silhouettes, picked deterministically
// per club, so not every crest on the page is an identical stamp.
const SHIELD_PATHS = [
  // classic pointed shield
  "M20 2 L36 8 V22 C36 34 28 41 20 45 C12 41 4 34 4 22 V8 Z",
  // rounded-top shield
  "M20 2 C28 2 36 6 36 6 V22 C36 34 28 41 20 45 C12 41 4 34 4 22 V6 C4 6 12 2 20 2 Z",
  // scalloped-top shield
  "M4 9 L12 4 L20 8 L28 4 L36 9 V22 C36 34 28 41 20 45 C12 41 4 34 4 22 Z",
];

export function ClubBadge({ name, size = 32 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const color = PALETTE[hashToIndex(name, PALETTE.length)];
  const initials = getInitials(name);
  const shieldPath = SHIELD_PATHS[hashToIndex(name + "shield", SHIELD_PATHS.length)];
  const height = Math.round(size * 1.15);

  // Tries the real crest first (added club-by-club to public/club-logos/).
  // Falls back automatically to the generated placeholder for any club
  // that doesn't have a real logo file yet — nothing breaks in the
  // meantime, and clubs upgrade individually as files are added.
  if (!imgFailed) {
    return (
      <img
        src={`/club-logos/${slugify(name)}.png`}
        alt={name}
        title={name}
        width={size}
        height={size}
        className="club-badge club-badge-img"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <svg
      className="club-badge"
      width={size}
      height={height}
      viewBox="0 0 40 46"
      role="img"
      aria-label={name}
    >
      <title>{name}</title>
      <path d={shieldPath} fill="var(--pitch-dark)" stroke={color} strokeWidth="1.75" />
      <path d={shieldPath} fill={color} opacity="0.16" />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize="13"
        fontWeight="700"
        fontFamily="var(--font-body, Arial, sans-serif)"
      >
        {initials}
      </text>
    </svg>
  );
}
