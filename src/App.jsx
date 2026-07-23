import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppProvider }    from "./context/AppContext";
import { WalletProvider } from "./context/WalletContext";
import { Layout }         from "./components/layout/Layout";
import "./App.css";

const Home         = lazy(() => import("./pages/Home"));
const Football     = lazy(() => import("./pages/Football"));
const MatchHistory = lazy(() => import("./pages/MatchHistory"));
const Leaderboard  = lazy(() => import("./pages/Leaderboard"));
const Admin        = lazy(() => import("./pages/Admin"));
const Markets      = lazy(() => import("./pages/Markets"));
const Rewards      = lazy(() => import("./pages/Rewards"));
const VIP          = lazy(() => import("./pages/VIP"));
const MyBets       = lazy(() => import("./pages/MyBets"));
const Wallet       = lazy(() => import("./pages/Wallet"));
const Settings     = lazy(() => import("./pages/Settings"));

function Loader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh" }}>
      <div style={{ width:44, height:44, border:"3px solid var(--primary)", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <WalletProvider>
        <Layout>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/"            element={<Home />}         />
              <Route path="/football"    element={<Football />}     />
              <Route path="/history"     element={<MatchHistory />} />
              <Route path="/leaderboard" element={<Leaderboard />}  />
              <Route path="/markets"     element={<Markets />}      />
              <Route path="/rewards"     element={<Rewards />}      />
              <Route path="/vip"         element={<VIP />}          />
              <Route path="/my-bets"     element={<MyBets />}       />
              <Route path="/wallet"      element={<Wallet />}       />
              <Route path="/settings"    element={<Settings />}     />
              <Route path="/admin"       element={<Admin />}        />
              <Route path="*"            element={<Home />}         />
            </Routes>
          </Suspense>
        </Layout>
      </WalletProvider>
    </AppProvider>
  );
}