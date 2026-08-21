import { useMemo } from "react";
export default function PitchViz({ width = 112, height = 24, seed = 1, color = "#4C86FF" }) {
  const { d, last } = useMemo(() => {
    const pts = [];
    let y = height / 2;
    for (let i = 0; i < 9; i++) {
      y += Math.sin(i * seed) * (height * 0.23);
      y = Math.max(2, Math.min(height - 2, y));
      pts.push([i * (width / 8), y]);
    }
    const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    return { d: path, last: pts[pts.length - 1] };
  }, [width, height, seed]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#242B40" strokeWidth="1" strokeDasharray="2 3" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}
