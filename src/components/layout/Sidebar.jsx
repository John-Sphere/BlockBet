import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useApp }    from "../../context/AppContext";
import { useWallet } from "../../context/WalletContext";
import { LEAGUES }   from "../../data/clubs";

const ALL_LINKS = [
  { to:"/football",    icon:"⚽", label:"Virtual Football", badge:"LIVE" },
  { to:"/history",     icon:"📊", label:"Match History",    badge:null   },
  { to:"/leaderboard", icon:"🏆", label:"Leaderboard",      badge:null   },
  { to:"/admin",       icon:"⚙️", label:"Admin Panel",      badge:null, adminOnly:true },
];

export function Sidebar() {
  const { pathname }              = useLocation();
  const [searchParams]            = useSearchParams();
  const { sidebarOpen }           = useApp();
  const { connected, address, shortAddr, balance } = useWallet();

  const activeLeague = searchParams.get("league");

  const adminWallet = (import.meta.env.VITE_ADMIN_WALLET || "").toLowerCase();
  const isAdmin = connected && address && adminWallet && address.toLowerCase() === adminWallet;

  const LINKS = ALL_LINKS.filter(l => !l.adminOnly || isAdmin);

  return (
    <aside style={{
      position:"fixed", top:"var(--nav-h)", left:0, zIndex:100,
      height:"calc(100vh - var(--nav-h))", width:"var(--side-w)",
      background:"var(--pitch-mid)", borderRight:"1px solid var(--pitch-line)",
      display:"flex", flexDirection:"column",
      transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
      transition:"transform 0.3s ease",
      overflowY:"auto", overflowX:"hidden",
    }}>

      {/* ── BRAND BLOCK ── */}
      <div style={{
        padding:"20px 18px", borderBottom:"1px solid var(--pitch-line)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <div style={{
            width:36, height:36, borderRadius:9,
            border:"1.5px solid var(--gold)",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0, background:"var(--pitch-dark)",
          }}>
            <img src="/logo.png" alt="BlockBet" width={26} height={26} style={{ objectFit:"contain" }}
              onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML='<span style="font-size:18px;font-weight:900;color:var(--gold)">B</span>'; }} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, letterSpacing:1, color:"var(--chalk)" }}>BLOCKBET</div>
            <div style={{ fontSize:9, color:"var(--chalk-dim)", letterSpacing:2 }}>VIRTUAL SPORTSBOOK</div>
          </div>
        </div>

        {/* USDC pill */}
        <div style={{
          display:"flex", alignItems:"center", gap:6,
          background:"var(--pitch-card)", border:"1px solid var(--pitch-line)",
          borderRadius:8, padding:"6px 10px",
        }}>
          <span style={{ fontSize:14 }}>💵</span>
          <div>
            <div style={{ fontSize:9, color:"var(--chalk-dim)", fontWeight:700, letterSpacing:1 }}>POWERED BY</div>
            <div style={{ fontSize:13, color:"var(--gold)", fontWeight:800 }}>USDC • Arc Testnet</div>
          </div>
        </div>
      </div>

      {/* ── WALLET BLOCK ── */}
      {connected && (
        <div style={{
          margin:"12px 14px",
          background:"var(--pitch-card)", border:"1px solid var(--pitch-line)",
          borderRadius:12, padding:"12px 14px",
        }}>
          <div style={{ fontSize:9, color:"var(--chalk-dim)", fontWeight:700, letterSpacing:1, marginBottom:6 }}>MY WALLET</div>
          <div style={{ fontSize:12, color:"var(--chalk)", fontWeight:700, marginBottom:4 }}>🦊 {shortAddr}</div>
          <div style={{ fontSize:18, fontWeight:900, color:"var(--gold)" }}>
            {balance} <span style={{ fontSize:11, color:"var(--chalk-dim)", fontWeight:600 }}>USDC</span>
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
              color: active ? "var(--gold)" : "var(--chalk-dim)",
              background: active ? "rgba(201,162,75,0.09)" : "transparent",
              borderLeft:`3px solid ${active ? "var(--gold)" : "transparent"}`,
              fontWeight: active ? 700 : 500,
              transition:"background 0.15s ease, color 0.15s ease", textDecoration:"none",
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(201,162,75,0.05)"; e.currentTarget.style.color="var(--chalk)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--chalk-dim)"; }}}
            >
              <span style={{ fontSize:18, flexShrink:0 }}>{l.icon}</span>
              <span style={{ flex:1 }}>{l.label}</span>
              {l.badge && (
                <span style={{
                  fontSize:8, fontWeight:800, letterSpacing:0.5, padding:"2px 6px",
                  borderRadius:5, background:"rgba(139,30,30,0.25)",
                  border:"1px solid var(--live-red)", color:"var(--chalk)",
                }}>
                  {l.badge}
                </span>
              )}
              {active && (
                <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--gold)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── LEAGUES ── */}
      <div style={{ padding: "10px 0", borderTop: "1px solid var(--pitch-line)" }}>
        <div style={{ padding: "0 18px 8px", fontSize: 9, color: "var(--chalk-dim)", fontWeight: 700, letterSpacing: 1 }}>
          LEAGUES
        </div>
        {LEAGUES.map((l) => {
          const active = pathname === "/football" && activeLeague === l.id;
          return (
            <Link
              key={l.id}
              to={`/football?league=${l.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 18px", fontSize: 12,
                color: active ? "var(--gold)" : "var(--chalk-dim)",
                background: active ? "rgba(201,162,75,0.08)" : "transparent",
                textDecoration: "none",
                fontWeight: active ? 700 : 500,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--chalk)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--chalk-dim)"; }}
            >
              <span>{l.flag}</span>
              <span>{l.name}</span>
            </Link>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding:"14px 18px", borderTop:"1px solid var(--pitch-line)",
        fontSize:10, color:"var(--chalk-dim)",
      }}>
        <div style={{ marginBottom:2, fontWeight:600, color:"var(--chalk)" }}>BlockBet v2.0 — Phase 2</div>
        <div>⛓️ Arc Testnet • 💵 USDC Native</div>
      </div>
    </aside>
  );
}
