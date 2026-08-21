import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Deterministic per-match position, so a given match always lands in
// the same spot on the radar rather than jumping around each render.
function hashAngle(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

// A genuine live feature, not decoration: each blip is a real live
// match. Rings/sweep are visual flavor; position and existence of
// blips come straight from matchManager.js.
export default function RadarViz({ matches = [], size = 460 }) {
  const navigate = useNavigate();
  const cx = size / 2;
  const cy = size / 2;
  const rings = [0.86, 0.6, 0.34].map((f) => (size / 2) * f);

  const blips = useMemo(() => matches.slice(0, 10).map((m) => {
    const angleDeg = hashAngle(m.id);
    const angle = (angleDeg * Math.PI) / 180;
    const ringIdx = hashAngle(m.id + "r") % 3;
    const radius = rings[ringIdx] * (0.7 + (hashAngle(m.id + "d") % 25) / 100);
    return {
      id: m.id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      label: `${m.homeTeam} vs ${m.awayTeam} \u2014 ${m.homeScore}-${m.awayScore} (${m.minute}')`,
    };
  }), [matches, cx, cy, rings]);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
      <defs>
        <radialGradient id="radar-sweep-grad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#4C86FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#4C86FF" stopOpacity="0.28" />
        </radialGradient>
      </defs>

      {rings.map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="#4C86FF" strokeWidth="1" opacity={0.28 - i * 0.06} />
      ))}
      <line x1={cx} y1={cy - rings[0]} x2={cx} y2={cy + rings[0]} stroke="#4C86FF" strokeWidth="0.5" opacity="0.12" />
      <line x1={cx - rings[0]} y1={cy} x2={cx + rings[0]} y2={cy} stroke="#4C86FF" strokeWidth="0.5" opacity="0.12" />

      <g className="radar-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path
          d={`M${cx},${cy} L${cx},${cy - rings[0]} A${rings[0]},${rings[0]} 0 0,1 ${cx + rings[0] * Math.sin(0.55)},${cy - rings[0] * Math.cos(0.55)} Z`}
          fill="url(#radar-sweep-grad)"
        />
      </g>

      {blips.map((b) => (
        <g
          key={b.id}
          className="radar-blip"
          onClick={() => navigate(`/match/${b.id}`)}
          style={{ cursor: "pointer" }}
        >
          <title>{b.label}</title>
          <circle cx={b.x} cy={b.y} r="9" fill="transparent" />
          <circle cx={b.x} cy={b.y} r="4" fill="#33D17A">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.45;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      <circle cx={cx} cy={cy} r="3.5" fill="#7DA6FF" />
    </svg>
  );
}
