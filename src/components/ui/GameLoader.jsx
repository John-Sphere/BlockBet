import { useState, useEffect } from "react";
import "./GameLoader.css";

// Brief branded loading screen shown when entering a casino game —
// purely a UX/pacing touch (games load fast either way), gives the
// moment of "arriving at the table" a bit of ceremony.
export function GameLoader({ gameName = "Loading", children, duration = 1000 }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!loading) return children;

  return (
    <div className="gl-screen">
      <div className="gl-spinner">
        <div className="gl-ring" />
        <div className="gl-ring gl-ring-2" />
      </div>
      <div className="gl-text">{gameName}</div>
    </div>
  );
}
