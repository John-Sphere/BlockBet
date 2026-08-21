import { useLocation } from "react-router-dom";
import { Navbar }  from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { MobileMenu } from "./MobileMenu";
import { OfflineBanner } from "./OfflineBanner";

export function Layout({ children }) {
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
          style={{ flex:1, minWidth:0, overflowX:"hidden" }}
        >
          {children}
        </main>
      </div>
      <MobileTabBar />
      <MobileMenu />
    </div>
  );
}
