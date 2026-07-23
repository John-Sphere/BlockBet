import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { useApp }    from "../../context/AppContext";
import { Button }    from "../ui/Button";

const NAV_LINKS = [
  { to:"/football",    label:"⚽ Football"    },
  { to:"/history",     label:"📊 History"     },
  { to:"/leaderboard", label:"🏆 Leaderboard" },
  { to:"/admin",       label:"⚙️ Admin"       },
];

export function Navbar() {
  const { connected, shortAddr, balance, connect, disconnect, connecting, wrongNet, ensureArcNetwork } = useWallet();
  const { toggleSidebar, addToast } = useApp();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);

  async function handleConnect() {
    const r = await connect();
    if (r?.error) addToast(r.error, "error");
    else addToast("Wallet connected! 🎉", "success");
  }

  return (
    <header style={{
      position:"sticky", top:0, zIndex:200, height:"var(--nav-h)",
      background:"rgba(8,17,31,0.97)", borderBottom:"1px solid var(--border)",
      backdropFilter:"blur(24px)",
    }}>
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        height:"100%", padding:"0 24px", gap:16,
      }}>
        {/* LEFT */}
        <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
          <button
            onClick={toggleSidebar}
            style={{ background:"none", border:"none", color:"var(--white)", fontSize:20, cursor:"pointer", padding:4 }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <Link to="/" style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"linear-gradient(135deg,#2EC7F2,#47D7FF)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 20px rgba(46,199,242,0.25)", flexShrink:0,
            }}>
              <img src="/logo.png" alt="BlockBet" width={26} height={26} style={{ objectFit:"contain" }}
                onError={e => { e.target.style.display="none"; }} />
            </div>
            <div>
              <div className="gradient-text" style={{ fontSize:17, fontWeight:900, letterSpacing:1 }}>BLOCKBET</div>
              <div style={{ fontSize:8, color:"var(--gray-600)", letterSpacing:3, fontWeight:600 }}>WEB3 SPORTSBOOK</div>
            </div>
          </Link>
        </div>

        {/* CENTRE */}
        <nav style={{ display:"flex", gap:2 }}>
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} style={{
              padding:"8px 14px", fontSize:13, borderRadius:8, transition:"var(--transition)",
              color: location.pathname === l.to ? "var(--primary)" : "var(--gray-400)",
              background: location.pathname === l.to ? "rgba(46,199,242,0.08)" : "transparent",
              fontWeight: location.pathname === l.to ? 700 : 500,
            }}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* RIGHT */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          {wrongNet && connected && (
            <button onClick={ensureArcNetwork} style={{
              fontSize:12, color:"var(--warning)", background:"rgba(255,200,87,0.10)",
              border:"1px solid rgba(255,200,87,0.25)", padding:"6px 12px",
              borderRadius:8, fontWeight:600,
            }}>
              ⚠️ Wrong Network
            </button>
          )}
          {connected ? (
            <div style={{ position:"relative" }}>
              <div
                onClick={() => setDropOpen(v => !v)}
                style={{
                  display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                  background:"var(--glass)", border:"1px solid var(--border)",
                  padding:"7px 14px", borderRadius:12, backdropFilter:"blur(10px)",
                }}
              >
                <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--success)", boxShadow:"0 0 8px var(--success)", flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, color:"var(--primary)", fontWeight:700 }}>🦊 {shortAddr}</div>
                  <div style={{ fontSize:11, color:"var(--success)", fontWeight:700 }}>{balance} USDC</div>
                </div>
                <span style={{ fontSize:10, color:"var(--gray-400)" }}>{dropOpen?"▲":"▼"}</span>
              </div>
              {dropOpen && (
                <div style={{
                  position:"absolute", right:0, top:"calc(100% + 8px)", minWidth:180,
                  background:"var(--bg-card)", border:"1px solid var(--border)",
                  borderRadius:12, overflow:"hidden", zIndex:300,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.4)", animation:"fadeUp 0.2s ease",
                }}>
                  {[
                    { to:"/football",    label:"⚽ Virtual Football" },
                    { to:"/leaderboard", label:"🏆 Leaderboard"      },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setDropOpen(false)} style={{
                      display:"block", padding:"11px 16px", fontSize:13,
                      color:"var(--gray-200)", transition:"var(--transition)",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(46,199,242,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ height:1, background:"var(--border)" }} />
                  <button onClick={() => { disconnect(); setDropOpen(false); }} style={{
                    display:"block", width:"100%", padding:"11px 16px", fontSize:13,
                    color:"var(--danger)", background:"transparent", textAlign:"left",
                    transition:"var(--transition)",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(255,77,109,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={handleConnect} loading={connecting} size="sm">
              🦊 Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}