import { useLocation } from "react-router-dom";
import { useApp }  from "../../context/AppContext";
import { Navbar }  from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { OfflineBanner } from "./OfflineBanner";

export function Layout({ children }) {
  const { sidebarOpen } = useApp();
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <Navbar />
      <OfflineBanner />
      <div style={{ display:"flex", flex:1, paddingTop:"var(--nav-h)" }}>
        {!isHome && <Sidebar />}
        <main
          className={`bb-main-content${isHome ? " bb-main-content--no-tabbar" : ""}`}
          style={{
            flex:1, minWidth:0, overflowX:"hidden",
            marginLeft: (!isHome && sidebarOpen) ? "var(--side-w)" : 0,
            transition:"margin-left 0.3s ease",
          }}
        >
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
