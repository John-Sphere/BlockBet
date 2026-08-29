import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { BetSlipProvider } from "./context/BetSlipContext";
import "./App.css";

const Home        = lazy(() => import("./Pages/Home"));
const Football    = lazy(() => import("./Pages/Football"));
const Basketball  = lazy(() => import("./Pages/Basketball"));
const Tennis      = lazy(() => import("./Pages/Tennis"));
const Darts       = lazy(() => import("./Pages/Darts"));
const Casino      = lazy(() => import("./Pages/Casino"));
const Roulette    = lazy(() => import("./Pages/Roulette"));
const Aviator      = lazy(() => import("./Pages/Aviator"));
const MatchDetail = lazy(() => import("./Pages/MatchDetail"));
const Admin       = lazy(() => import("./Pages/Admin"));
const LeagueTable = lazy(() => import("./Pages/LeagueTable"));
const MatchHistory= lazy(() => import("./Pages/MatchHistory"));
const MyBets      = lazy(() => import("./Pages/MyBets"));
const ComingSoon  = lazy(() => import("./Pages/ComingSoon"));

function Loader() {
  return (
    <div className="bb-loader">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <polygon
          className="bb-loader-triangle"
          points="28,6 50,48 6,48"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          pathLength="1"
        />
        <circle className="bb-loader-pulse" cx="28" cy="34" r="3" fill="var(--gold)" />
      </svg>
      <div className="bb-loader-text">BLOCKBET</div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="bb-splash">
        <Loader />
      </div>
    );
  }

  return (
    <BetSlipProvider>
      <Layout>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/"            element={<Home />}         />
            <Route path="/football"    element={<Football />}     />
            <Route path="/basketball"  element={<Basketball />}   />
            <Route path="/tennis"      element={<Tennis />}       />
            <Route path="/darts"       element={<Darts />}        />
            <Route path="/casino"      element={<Casino />}       />
            <Route path="/casino/roulette" element={<Roulette />} />
            <Route path="/casino/aviator" element={<Aviator />} />
            <Route path="/match/:matchId" element={<MatchDetail />} />
            <Route path="/history"     element={<MatchHistory />} />
            <Route path="/leaderboard" element={<LeagueTable />}  />
            <Route path="/my-bets"     element={<MyBets />}       />
            <Route path="/coming-soon/:sport" element={<ComingSoon />} />
            <Route path="/admin"       element={<Admin />}        />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BetSlipProvider>
  );
}
