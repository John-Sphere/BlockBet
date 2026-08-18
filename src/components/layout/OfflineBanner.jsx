import { useState, useEffect } from "react";
import "./OfflineBanner.css";

// Small banner shown whenever the device has no connection — pairs
// with matchManager.js pausing the match engine on the same event,
// so it's clear why matches stopped ticking instead of it just
// looking broken.
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bb-offline-banner">
      You're offline — matches are paused and will resume once you're back online.
    </div>
  );
}
