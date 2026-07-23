import { Link, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";

const LINKS = [
  { to:"/football",    icon:"⚽", label:"Virtual Football" },
  { to:"/history",     icon:"📊", label:"Match History"    },
  { to:"/leaderboard", icon:"🏆", label:"Leaderboard"      },
  { to:"/admin",       icon:"⚙️", label:"Admin Panel"      },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen } = useApp();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{
          display:"none",
          "@media (max-width:1023px)": { display:"block" },
          position:"fixed", inset:0, zIndex:99,
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
        }} />
      )}

      <aside style={{
        position:"fixed", top:"var(--nav-h)", left:0, zIndex:100,
        height:"calc(100vh - var(--nav-h))", width:"var(--side-w)",
        background:"var(--bg-raised)", borderRight:"1px solid var(--border)",
        display:"flex", flexDirection:"column", overflowX:"hidden", overflowY:"auto",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.3s ease",
      }}>
        <nav style={{ flex:1, paddingTop:12 }}>
          {LINKS.map(l => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                title={l.label}
                style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"12px 20px", fontSize:13, fontWeight: active ? 700 : 500,
                  color: active ? "var(--primary)" : "var(--gray-400)",
                  background: active ? "rgba(46,199,242,0.08)" : "transparent",
                  borderLeft: `3px solid ${active ? "var(--primary)" : "transparent"}`,
                  transition:"var(--transition)", whiteSpace:"nowrap",
                  textDecoration:"none",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(46,199,242,0.04)"; e.currentTarget.style.color="var(--gray-200)"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--gray-400)"; }}}
              >
                <span style={{ fontSize:18, flexShrink:0 }}>{l.icon}</span>
                <span>{l.label}</span>
                {active && (
                  <span style={{
                    marginLeft:"auto", width:6, height:6, borderRadius:"50%",
                    background:"var(--primary)", boxShadow:"0 0 8px var(--primary)",
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{
          padding:"14px 20px", borderTop:"1px solid var(--border)",
          fontSize:10, color:"var(--gray-600)", display:"flex", flexDirection:"column", gap:3,
        }}>
          <span>BlockBet v2.0</span>
          <span>Arc Testnet</span>
        </div>
      </aside>
    </>
  );
}