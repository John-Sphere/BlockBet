import { useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { Navbar }  from "./Navbar";
import { Sidebar } from "./Sidebar";
import { BetSlipPanel } from "../ui/BetSlipPanel";
import { MobileTabBar } from "./MobileTabBar";
import { MobileMenu } from "./MobileMenu";
import { FloatingBetSlip } from "./FloatingBetSlip";
import { OfflineBanner } from "./OfflineBanner";
import { RouteProgressBar } from "./RouteProgressBar";

export function Layout({ children }) {
  const { pathname } = useLocation();
  const { toggleSidebar } = useApp();
  const isHome = pathname === "/";
  // Casino games (roulette, etc.) build their own internal bet slip —
  // the global sports bet slip (for football/basketball/tennis/darts
  // selections) is meaningless there and was fighting it for space
  // on desktop, since both are real flex-width layout members.
  const isCasino = pathname.startsWith("/casino");

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <RouteProgressBar />
      <Navbar />
      <OfflineBanner />
      <div style={{ display:"flex", flex:1, paddingTop:"var(--nav-h)" }}>
        {!isHome && <Sidebar />}
        <main
          className={`bb-main-content${isHome ? " bb-main-content--no-tabbar" : " bb-content-with-sidebar"}`}
          style={{ flex:1, minWidth:0, overflowX:"hidden" }}
        >
          {children}
        </main>
        {!isHome && !isCasino && <BetSlipPanel />}
      </div>
      {!isHome && <MobileTabBar onOpenMenu={toggleSidebar} />}
      <MobileMenu />
      <FloatingBetSlip />
    </div>
  );
}
