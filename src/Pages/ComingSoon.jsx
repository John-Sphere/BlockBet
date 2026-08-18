import { useParams, Link } from "react-router-dom";
import "./ComingSoon.css";

const SPORT_INFO = {
  basketball: { icon: "🏀", label: "Basketball" },
  tennis:     { icon: "🎾", label: "Tennis" },
  darts:      { icon: "🎯", label: "Darts" },
  casino:     { icon: "🎰", label: "Casino" },
};

export default function ComingSoon() {
  const { sport } = useParams();
  const info = SPORT_INFO[sport] || { icon: "🏆", label: "This section" };

  return (
    <div className="cs-page">
      <div className="cs-icon">{info.icon}</div>
      <h1 className="cs-title">{info.label} is coming soon</h1>
      <p className="cs-sub">
        We're focused on getting Virtual Football right first. {info.label} betting will
        land in a future update.
      </p>
      <Link to="/football" className="btn-gold">Back to the pitch</Link>
    </div>
  );
}
