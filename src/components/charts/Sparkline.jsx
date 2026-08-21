import { useMemo } from "react";
export default function Sparkline({
  width = 66, height = 28, color = "#4C86FF", drift = 0.3,
  points = 14, seed = 1, data,
}) {
  const path = useMemo(() => {
    const series =
      data && data.length > 1
        ? data
        : (() => {
            let v = height * 0.6;
            let s = seed * 9301 + 49297;
            const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
            const out = [];
            for (let i = 0; i < points; i++) {
              v += (rand() - 0.5) * (height * 0.28) + drift;
              v = Math.max(height * 0.12, Math.min(height * 0.92, v));
              out.push(v);
            }
            return out;
          })();
    const min = Math.min(...series);
    const max = Math.max(...series);
    const norm = data && data.length > 1
      ? series.map((v) => height - ((v - min) / (max - min || 1)) * height)
      : series.map((v) => height - v);
    const pts = norm.map((y, i) => [i * (width / (norm.length - 1)), y]);
    const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, drift, points, seed, width, height]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <path d={path.area} fill={color} opacity="0.14" />
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
