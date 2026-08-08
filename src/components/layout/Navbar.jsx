import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../../context/WalletContext";
import { useApp }    from "../../context/AppContext";
import { Button }    from "../ui/Button";

const LINKS = [
  { to:"/football",    label:"⚽ Football"    },
  { to:"/history",     label:"📊 History"     },
  { to:"/leaderboard", label:"🏆 Leaderboard" },
  { to:"/admin",       label:"⚙️ Admin"       },
];

export function Navbar() {
  const { connected, shortAddr, balance, connect, disconnect, connecting, wrongNet, ensureArcNetwork } = useWallet();
  const { toggleSidebar, addToast } = useApp();
  const { pathname } = useLocation();
  const [drop, setDrop] = useState(false);

  async function handleConnect() {
    const r = await connect();
    if (r?.error) addToast(r.error, "error");
    else addToast("Wallet connected! 🎉", "success");
  }

  return (
    <header style={{
      position:"sticky", top:0, zIndex:200, height:"var(--nav-h)",
      background:"rgba(5,6,8,0.97)", borderBottom:"1px solid var(--border)",
      backdropFilter:"blur(28px)",
    }}>
      <div style={{ display:"flex", alignItems:"center", height:"100%", padding:"0 24px", gap:16 }}>

        {/* HAMBURGER */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          style={{ background:"none", color:"var(--white)", fontSize:20, flexShrink:0, padding:4 }}
        >
          ☰
        </button>

        {/* LOGO + BRAND */}
        <Link to="/" style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,#2EC7F2,#47D7FF)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 22px rgba(46,199,242,0.35)",
          }}>
            <img
              src="/logo.png"
              alt="BlockBet"
              width={28} height={28}
              style={{ objectFit:"contain" }}
              onError={e => {
                e.target.style.display = "none";
                e.target.parentNode.innerHTML = '<span style="font-size:20px;font-weight:900;color:#050608">B</span>';
              }}
            />
          </div>
          <div>
            <div className="grad" style={{ fontSize:18, fontWeight:900, letterSpacing:1.2 }}>BLOCKBET</div>
            <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:3, fontWeight:600 }}>WEB3 SPORTSBOOK</div>
          </div>
        </Link>

        {/* NAV LINKS */}
        <nav style={{ display:"flex", gap:2, flex:1, justifyContent:"center" }}>
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} style={{
              padding:"7px 14px", fontSize:13, borderRadius:10,
              color: pathname===l.to ? "var(--primary)" : "var(--muted)",
              background: pathname===l.to ? "rgba(46,199,242,0.10)" : "transparent",
              fontWeight: pathname===l.to ? 700 : 500,
              transition:"var(--ease)",
            }}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* NETWORK WARNING */}
        {wrongNet && connected && (
          <button onClick={ensureArcNetwork} style={{
            fontSize:11, color:"var(--warning)", background:"rgba(255,200,87,0.10)",
            border:"1px solid rgba(255,200,87,0.28)", padding:"6px 12px",
            borderRadius:8, fontWeight:700, flexShrink:0,
          }}>
            ⚠️ Switch to Arc Testnet
          </button>
        )}

        {/* WALLET AREA */}
        <div style={{ flexShrink:0, position:"relative" }}>
          {connected ? (
            <>
              <button
                onClick={() => setDrop(v => !v)}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:"var(--glass)", border:"1px solid var(--border)",
                  padding:"7px 14px", borderRadius:12, backdropFilter:"blur(12px)",
                  transition:"var(--ease)",
                }}
              >
                {/* Live dot */}
                <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--success)", boxShadow:"0 0 8px var(--success)", flexShrink:0 }} />
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:11, color:"var(--primary)", fontWeight:700 }}>🦊 {shortAddr}</div>
                  <div style={{ fontSize:12, color:"var(--success)", fontWeight:800 }}>{balance} USDC</div>
                </div>
                <span style={{ fontSize:10, color:"var(--muted)" }}>{drop?"▲":"▼"}</span>
              </button>

              {drop && (
                <div style={{
                  position:"absolute", right:0, top:"calc(100% + 8px)", minWidth:200,
                  background:"var(--bg3)", border:"1px solid var(--border)",
                  borderRadius:14, overflow:"hidden", zIndex:300,
                  boxShadow:"0 10px 40px rgba(0,0,0,0.5)", animation:"fadeUp 0.2s ease",
                }}>
                  {/* USDC balance block */}
                  <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", background:"rgba(46,199,242,0.05)" }}>
                    <div style={{ fontSize:10, color:"var(--muted)", fontWeight:700, letterSpacing:1, marginBottom:6 }}>USDC BALANCE</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"var(--success)" }}>{balance} <span style={{ fontSize:13, color:"var(--muted)" }}>USDC</span></div>
                    <div style={{ fontSize:10, color:"var(--muted)", marginTop:4 }}>Arc Testnet</div>
                  </div>
                  {[
                    { to:"/football",    label:"⚽ Virtual Football" },
                    { to:"/leaderboard", label:"🏆 Leaderboard"      },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setDrop(false)} style={{
                      display:"block", padding:"11px 16px", fontSize:13, color:"var(--gray)",
                      transition:"var(--ease)",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(46,199,242,0.07)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div style={{ height:1, background:"var(--border)" }} />
                  <button onClick={() => { disconnect(); setDrop(false); }} style={{
                    display:"block", width:"100%", padding:"11px 16px", fontSize:13,
                    color:"var(--danger)", background:"transparent", textAlign:"left",
                    transition:"var(--ease)",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(255,77,109,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  >
                    🔌 Disconnect Wallet
                  </button>
                </div>
              )}
            </>
          ) : (
            <Button onClick={handleConnect} loading={connecting}>
              🦊 Connect Wallet
            </Button>
          )}
        </div>

      </div>
    </header>
  );
}