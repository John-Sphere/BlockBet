import { useApp }  from "../../context/AppContext";
import { Navbar }  from "./Navbar";
import { Sidebar } from "./Sidebar";

export function Layout({ children }) {
  const { sidebarOpen } = useApp();

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <Navbar />
      <div style={{ display:"flex", flex:1, paddingTop:"var(--nav-h)" }}>
        <Sidebar />
        <main style={{
          flex:1, minWidth:0, overflowX:"hidden",
          marginLeft: sidebarOpen ? "var(--side-w)" : 0,
          transition:"margin-left 0.3s ease",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
