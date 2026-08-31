import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./RouteProgressBar.css";

// A brief, deliberate loading-bar animation on every route change —
// gives navigation the "something just loaded" feel of a real page
// transition, even though the actual client-side swap is instant.
// Purely perceptual, not tied to any real async work (the existing
// Suspense fallback in App.jsx already covers genuine lazy-chunk
// loading on first visit to a route).
export function RouteProgressBar() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setComplete(false);
    setVisible(true);

    const completeTimer = setTimeout(() => setComplete(true), 220);
    const hideTimer = setTimeout(() => setVisible(false), 480);

    return () => {
      clearTimeout(completeTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  return <div className={`rpb-bar ${complete ? "rpb-complete" : ""}`} />;
}
