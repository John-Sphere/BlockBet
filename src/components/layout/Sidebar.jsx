import { Link, useLocation } from "react-router-dom";
import { useApp }    from "../../context/AppContext";
import { useWallet } from "../../context/WalletContext";

const LINKS = [
  { to:"/football",    icon:"⚽", label:"Virtual Football", badge:"LIVE" },
  { to:"/history",     icon:"📊", label:"Match History",    badge:null   },
  { to:"/leaderboard", icon:"🏆", label:"Leaderboard",      badge:null   },
  { to:"/admin",       icon:"⚙️", label:"Admin Panel",      badge:null   },
];

export function Sidebar() {
  const { pathname }              = useLocation();
  const { sidebarOpen }           = useApp();
  const { connected, shortAddr, balance } = useWallet();

  return (
    <aside style={{
      position:"fixed", top:"var(--nav-h)", left:0, zIndex:100,
      height:"calc(100vh - var(--nav-h))", width:"var(--side-w)",
      background:"var(--bg2)", borderRight:"1px solid var(--border)",
      display:"flex", flexDirection:"column",
      transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
      transition:"transform 0.3s ease",
      overflowY:"auto", overflowX:"hidden",
    }}>

      {/* ── BRAND BLOCK ── */}
      <div style={{
        padding:"20px 18px", borderBottom:"1px solid var(--border)",
        background:"linear-gradient(180deg,rgba(46,199,242,0.06),transparent)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <div style={{
            width:36, height:36, borderRadius:9,
            background:"linear-gradient(135deg,#2EC7F2,#47D7FF)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 18px rgba(46,199,242,0.3)", flexShrink:0,
          }}>
            <img src="/logo.png" alt="BlockBet" width={26} height={26} style={{ objectFit:"contain" }}
              onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML='<span style="font-size:18px;font-weight:900;color:#050608">B</span>'; }} />
          </div>
          <div>
            <div className="grad" style={{ fontSize:16, fontWeight:900, letterSpacing:1 }}>BLOCKBET</div>
            <div style={{ fontSize:9, color:"var(--muted)", letterSpacing:2 }}>VIRTUAL SPORTSBOOK</div>
          </div>
        </div>

        {/* USDC pill */}
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          background:"rgba(16,233,129,0.08)", border:"1px solid rgba(16,233,129,0.22)",
          borderRadius:8, padding:"6px 10px",
        }}>
          <span style={{ fontSize:14 }}>💵</span>
          <div>
            <div style={{ fontSize:9, color:"var(--muted)", fontWeight:700, letterSpacing:1 }}>POWERED BY</div>
            <div style={{ fontSize:13, color:"var(--success)", fontWeight:800 }}>USDC • Arc Testnet</div>
          </div>
        </div>
      </div>

      {/* ── WALLET BLOCK ── */}
      {connected && (
        <div style={{
          margin:"12px 14px",
          background:"rgba(46,199,242,0.05)", border:"1px solid var(--border)",
          borderRadius:12, padding:"12px 14px",
        }}>
          <div style={{ fontSize:9, color:"var(--muted)", fontWeight:700, letterSpacing:1, marginBottom:6 }}>MY WALLET</div>
          <div style={{ fontSize:12, color:"var(--primary)", fontWeight:700, marginBottom:4 }}>🦊 {shortAddr}</div>
          <div style={{ fontSize:18, fontWeight:900, color:"var(--success)" }}>
            {balance} <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600 }}>USDC</span>
          </div>
        </div>
      )}

      {/* ── NAV LINKS ── */}
      <nav style={{ flex:1, padding:"8px 0" }}>
        {LINKS.map(l => {
          const active = pathname === l.to;
          return (
            <Link key={l.to} to={l.to} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 18px", fontSize:13,
              color: active ? "var(--primary)" : "var(--muted)",
              background: active ? "rgba(46,199,242,0.09)" : "transparent",
              borderLeft:`3px solid ${active ? "var(--primary)" : "transparent"}`,
              fontWeight: active ? 700 : 500,
              transition:"var(--ease)", textDecoration:"none",
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(46,199,242,0.04)"; e.currentTarget.style.color="var(--gray)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--muted)"; }}}
            >
              <span style={{ fontSize:18, flexShrink:0 }}>{l.icon}</span>
              <span style={{ flex:1 }}>{l.label}</span>
              {l.badge && (
                <span style={{
                  fontSize:8, fontWeight:800, letterSpacing:0.5, padding:"2px 6px",
                  borderRadius:5, background:"rgba(16,233,129,0.15)",
                  border:"1px solid rgba(16,233,129,0.3)", color:"var(--success)",
                }}>
                  {l.badge}
                </span>
              )}
              {active && (
                <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--primary)", boxShadow:"0 0 7px var(--primary)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── FOOTER ── */}
      <div style={{
        padding:"14px 18px", borderTop:"1px solid var(--border)",
        fontSize:10, color:"var(--muted)",
      }}>
        <div style={{ marginBottom:2, fontWeight:600 }}>BlockBet v2.0 — Phase 2</div>
        <div>⛓️ Arc Testnet • 💵 USDC Native</div>
      </div>
    </aside>
  );
}