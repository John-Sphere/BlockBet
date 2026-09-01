import { useMemo, useState } from "react";

// A real historical price line chart — plots genuine on-chain swap
// history (not simulated), with a hoverable point that shows the
// exact price and time at any position along the line.
export default function PriceChart({ data, width = 400, height = 180, color = "#E8B23D" }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { points, minPrice, maxPrice } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], minPrice: 0, maxPrice: 0 };
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || max * 0.1 || 1;
    const pts = data.map((d, i) => {
      const x = padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
      const y = padding.top + innerH - ((d.price - min) / range) * innerH;
      return { x, y, ...d };
    });
    return { points: pts, minPrice: min, maxPrice: max };
  }, [data, innerW, innerH]);

  if (!data || data.length === 0) {
    return (
      <div style={{
        width, height, display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-faint)", fontSize: 12,
      }}>
        No swap history yet for this token
      </div>
    );
  }

  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + innerH} L${points[0].x},${padding.top + innerH} Z`;
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = relX * scaleX;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setHoverIndex(closest);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
      style={{ cursor: "crosshair" }}
    >
      <defs>
        <linearGradient id="pc-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#pc-area-fill)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {hovered && (
        <>
          <line x1={hovered.x} y1={padding.top} x2={hovered.x} y2={padding.top + innerH} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
          <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} stroke="#0B0E17" strokeWidth="2" />
        </>
      )}

      <text x={padding.left} y={height - 6} fontSize="9" fill="#545B6E" fontFamily="monospace">
        {new Date(data[0].time).toLocaleDateString()}
      </text>
      <text x={width - padding.right} y={height - 6} fontSize="9" fill="#545B6E" fontFamily="monospace" textAnchor="end">
        {new Date(data[data.length - 1].time).toLocaleDateString()}
      </text>

      {hovered && (
        <g>
          <rect
            x={Math.min(Math.max(hovered.x - 45, 4), width - 94)}
            y={hovered.y - 34 < 0 ? hovered.y + 10 : hovered.y - 34}
            width="90" height="26" rx="6"
            fill="#12161F" stroke={color} strokeWidth="1"
          />
          <text
            x={Math.min(Math.max(hovered.x - 45, 4), width - 94) + 45}
            y={(hovered.y - 34 < 0 ? hovered.y + 10 : hovered.y - 34) + 12}
            fontSize="10" fill="#EEF0F5" fontFamily="monospace" textAnchor="middle" fontWeight="700"
          >
            ${hovered.price.toFixed(4)}
          </text>
          <text
            x={Math.min(Math.max(hovered.x - 45, 4), width - 94) + 45}
            y={(hovered.y - 34 < 0 ? hovered.y + 10 : hovered.y - 34) + 22}
            fontSize="8" fill="#8990A3" fontFamily="monospace" textAnchor="middle"
          >
            {new Date(hovered.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </text>
        </g>
      )}
    </svg>
  );
}
