import "./ClubBadge.css";

// A curated palette so colors stay readable on the dark pitch background —
// avoids picking near-black or neon colors that would clash or vanish.
const PALETTE = [
  "#C9A24B", // gold
  "#5B8DEF", // blue
  "#E0574A", // red
  "#4E9A5C", // green
  "#B15FD1", // purple
  "#4BB3C9", // teal
  "#D18A3E", // amber
  "#7C8CC9", // periwinkle
  "#C95B8C", // pink
  "#6FAE4E", // olive-green
];

// Deterministic hash so the same club name always gets the same color,
// without needing to store a color field in clubs.js.
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
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function ClubBadge({ name, size = 32 }) {
  const color = PALETTE[hashToIndex(name, PALETTE.length)];
  const initials = getInitials(name);

  return (
    <div
      className="club-badge"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        borderColor: color,
        color: color,
      }}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
