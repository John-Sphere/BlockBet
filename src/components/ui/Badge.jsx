import "./Badge.css";

// Generic status/label pill — for things like "LIVE", "NEW", "OPEN",
// "FINISHED". For club initials with team colors, use ClubBadge instead.
//
// Usage: <Badge tone="live">Live</Badge>
// tone options: "default" | "live" | "open" | "success" | "muted"

export function Badge({ children, tone = "default" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
