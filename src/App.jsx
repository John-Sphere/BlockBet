import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Layout } from "./components/layout/Layout";
import { BetSlipProvider } from "./context/BetSlipContext";
import { BetSlipPanel } from "./components/ui/BetSlipPanel";
import "./App.css";

const Football    = lazy(() => import("./Pages/Football"));
const Admin       = lazy(() => import("./Pages/Admin"));
const Leaderboard = lazy(() => import("./Pages/Leaderboard"));
const MatchHistory= lazy(() => import("./Pages/MatchHistory"));

function Loader() {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"center", height:"60vh",
    }}>
      <div style={{
        width:44, height:44,
        border:"3px solid var(--gold)", borderTopColor:"transparent",
        borderRadius:"50%", animation:"spin 0.8s linear infinite",
      }} />
    </div>
  );
}

export default function App() {
  return (
    <BetSlipProvider>
      <Layout>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/"            element={<Football />}     />
            <Route path="/football"    element={<Football />}     />
            <Route path="/history"     element={<MatchHistory />} />
            <Route path="/leaderboard" element={<Leaderboard />}  />
            <Route path="/admin"       element={<Admin />}        />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      <BetSlipPanel />
    </BetSlipProvider>
  );
}
