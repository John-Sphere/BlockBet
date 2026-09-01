import { useState } from "react";

// Same graceful-fallback pattern as ClubBadge.jsx: tries a real logo
// file first, falls back to the colored letter/symbol circle if that
// specific file doesn't exist yet. USDC/EURC/cirBTC are real Circle-
// issued assets — source their actual logos yourself if you want them
// shown (Circle typically provides official brand assets for
// integration purposes, worth double-checking their usage terms).
// BLOCK is your own token, so no such restriction there.
export function TokenIcon({ symbol, fallbackIcon, color, size = 24 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const slug = symbol.toLowerCase();

  if (!imgFailed) {
    return (
      <img
        src={`/token-logos/${slug}.png`}
        alt={symbol}
        width={size}
        height={size}
        style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      style={{
        width: size, height: size,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5, fontWeight: 800,
        color: "#080B12",
        background: color,
        flexShrink: 0,
      }}
    >
      {fallbackIcon}
    </span>
  );
}
