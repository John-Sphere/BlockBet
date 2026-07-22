import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

const CONTRACT = "0x6df1feCD5d4A8cA8701458bDc5139bC1038d6fd7";
const USDC     = "0x3600000000000000000000000000000000000000";
const CHAIN    = "0x4BE";

const BET_ABI = [
  "function placeBet(uint256,uint8,uint256) public",
  "function claimWinnings(uint256) public",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function matchCount() public view returns (uint256)",
];
const USDC_ABI = [
  "function approve(address,uint256) public returns (bool)",
  "function balanceOf(address) public view returns (uint256)",
];

const LOGOS = {
  "Man United":      "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  "Arsenal":         "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  "Chelsea":         "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  "Liverpool":       "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  "Man City":        "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  "Tottenham":       "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  "Barcelona":       "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg",
  "Real Madrid":     "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  "Bayern Munich":   "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg",
  "PSG":             "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",
  "Juventus":        "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg",
  "AC Milan":        "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg",
  "Inter Milan":     "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg",
  "Atletico Madrid": "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
  "Dortmund":        "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg",
  "Napoli":          "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli_2007.svg",
  "Ajax":            "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg",
  "PSV":             "https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg",
  "Celtic":          "https://upload.wikimedia.org/wikipedia/en/3/35/Celtic_FC.svg",
  "Rangers":         "https://upload.wikimedia.org/wikipedia/en/5/53/Rangers_FC.svg",
  "Boca Juniors":    "https://upload.wikimedia.org/wikipedia/commons/f/f1/CA_Boca_Juniors_logo.svg",
  "River Plate":     "https://upload.wikimedia.org/wikipedia/commons/a/a2/River_Plate_logo.svg",
  "Flamengo":        "https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg",
  "Palmeiras":       "https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg",
  "Al Hilal":        "https://upload.wikimedia.org/wikipedia/en/a/a2/Al-Hilal-Logo.svg",
  "Al Nassr":        "https://upload.wikimedia.org/wikipedia/en/c/cd/Al-Nassr_FC_Logo.svg",
  "Galatasaray":     "https://upload.wikimedia.org/wikipedia/en/9/94/Galatasaray_Sports_Club_Logo.svg",
  "Fenerbahce":      "https://upload.wikimedia.org/wikipedia/en/c/c3/Fenerbah%C3%A7e_SK_logo.svg",
  "Porto":           "https://upload.wikimedia.org/wikipedia/en/3/3b/F.C._Porto.svg",
  "Benfica":         "https://upload.wikimedia.org/wikipedia/en/3/38/Sport_Lisboa_e_Benfica.svg",
};

const VIRTUAL = [
  { home:"Man United",    away:"Arsenal",       league:"Virtual Premier League"  },
  { home:"Barcelona",     away:"Real Madrid",   league:"Virtual La Liga"         },
  { home:"Liverpool",     away:"Man City",      league:"Virtual Premier League"  },
  { home:"PSG",           away:"Bayern Munich", league:"Virtual Champions League"},
  { home:"Juventus",      away:"Inter Milan",   league:"Virtual Serie A"         },
  { home:"Dortmund",      away:"Bayern Munich", league:"Virtual Bundesliga"      },
  { home:"Chelsea",       away:"Tottenham",     league:"Virtual Premier League"  },
  { home:"Atletico Madrid",away:"Barcelona",    league:"Virtual La Liga"         },
  { home:"Ajax",          away:"PSV",           league:"Virtual Eredivisie"      },
  { home:"Celtic",        away:"Rangers",       league:"Virtual Scottish"        },
  { home:"Boca Juniors",  away:"River Plate",   league:"Virtual Superliga"       },
  { home:"Flamengo",      away:"Palmeiras",     league:"Virtual Brasileirao"     },
  { home:"Al Hilal",      away:"Al Nassr",      league:"Virtual Saudi League"    },
  { home:"Galatasaray",   away:"Fenerbahce",    league:"Virtual Super Lig"       },
  { home:"Porto",         away:"Benfica",       league:"Virtual Primeira Liga"   },
  { home:"AC Milan",      away:"Napoli",        league:"Virtual Serie A"         },
];

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function Logo({ name, size = 20 }) {
  const src = LOGOS[name];
  return src
    ? <img src={src} alt={name} width={size} height={size} style={{ objectFit:"contain", flexShrink:0 }} onError={e => e.target.style.display="none"} />
    : <span style={{ fontSize: size * 0.7, flexShrink:0 }}>⚽</span>;
}

export default function App() {
  const mobile = useIsMobile();

  // wallet
  const [provider,  setProvider]  = useState(null);
  const [signer,    setSigner]    = useState(null);
  const [connected, setConnected] = useState(false);
  const [addr,      setAddr]      = useState("");
  const [bal,       setBal]       = useState("0.00");
  const [netErr,    setNetErr]    = useState(false);

  // ui
  const [toast,     setToast]     = useState(null);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [slipOpen,  setSlipOpen]  = useState(false);
  const [leagueTab, setLeagueTab] = useState("All");

  // betting
  const [matches,   setMatches]   = useState([]);
  const [betSlip,   setBetSlip]   = useState([]);
  const [stake,     setStake]     = useState("");
  const [loading,   setLoading]   = useState(false);

  // ── on mount
  useEffect(() => {
    loadMatches();
    const t = setInterval(loadMatches, 30000);
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", onAccChange);
      window.ethereum.on("chainChanged", () => window.location.reload());
      if (localStorage.getItem("bb_con") === "1") silentReconnect();
    }
    return () => clearInterval(t);
  }, []);

  // ── wallet
  async function silentReconnect() {
    try {
      const accs = await window.ethereum.request({ method: "eth_accounts" });
      if (!accs.length) return;
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      setProvider(p); setSigner(s); setConnected(true);
      setAddr(accs[0].slice(0,6) + "…" + accs[0].slice(-4));
      await ensureNetwork(p);
      await refreshBal(accs[0], p);
      loadMatches(p);
    } catch {}
  }

  async function onAccChange(accs) {
    if (!accs.length) { disconnect(); return; }
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    setProvider(p); setSigner(s);
    setAddr(accs[0].slice(0,6) + "…" + accs[0].slice(-4));
    await refreshBal(accs[0], p);
  }

  async function ensureNetwork(p) {
    try {
      const net = await p.getNetwork();
      const cid = "0x" + net.chainId.toString(16);
      if (cid === CHAIN) { setNetErr(false); return true; }
      setNetErr(true);
      try {
        await window.ethereum.request({ method:"wallet_switchEthereumChain", params:[{ chainId: CHAIN }] });
        setNetErr(false); return true;
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({ method:"wallet_addEthereumChain", params:[{
            chainId: CHAIN, chainName:"Arc Testnet",
            nativeCurrency:{ name:"USDC", symbol:"USDC", decimals:6 },
            rpcUrls:["https://rpc.testnet.arc.network"],
            blockExplorerUrls:["https://testnet.arcscan.app"],
          }]});
          setNetErr(false); return true;
        }
      }
      return false;
    } catch { return false; }
  }

  async function refreshBal(address, p) {
    try {
      const c = new ethers.Contract(USDC, USDC_ABI, p);
      const b = await c.balanceOf(address);
      setBal(Number(ethers.formatUnits(b, 6)).toFixed(2));
    } catch { setBal("0.00"); }
  }

  async function connect() {
    if (!window.ethereum) {
      showToast("MetaMask not found! Please install it first.", "err");
      setTimeout(() => window.open("https://metamask.io/download/", "_blank"), 1000);
      return;
    }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const a = await s.getAddress();
      setProvider(p); setSigner(s); setConnected(true);
      setAddr(a.slice(0,6) + "…" + a.slice(-4));
      localStorage.setItem("bb_con", "1");
      const ok = await ensureNetwork(p);
      if (!ok) { showToast("Please switch to Arc Testnet.", "err"); return; }
      await refreshBal(a, p);
      loadMatches(p);
      showToast("Wallet connected! 🎉");
    } catch (e) {
      if (e.code === 4001) showToast("Connection cancelled.", "err");
      else showToast("Connection failed. Try again.", "err");
    }
  }

  function disconnect() {
    setProvider(null); setSigner(null); setConnected(false);
    setAddr(""); setBal("0.00"); setNetErr(false);
    setBetSlip([]); setStake("");
    localStorage.removeItem("bb_con");
    showToast("Wallet disconnected.");
  }

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── matches
  async function loadMatches(prov) {
    try {
      const p = prov || provider || new ethers.BrowserProvider(window.ethereum);
      const c = new ethers.Contract(CONTRACT, BET_ABI, p);
      const count = Number(await c.matchCount());
      const list = [];
      for (let i = Math.max(1, count - 14); i <= count; i++) {
        const m = await c.getMatch(i);
        const meta = VIRTUAL.find(v => v.home === m[0] && v.away === m[1]);
        list.push({
          id:     i,
          home:   m[0],
          away:   m[1],
          league: meta?.league || "Virtual League",
          tH:     Number(ethers.formatUnits(m[2], 6)),
          tD:     Number(ethers.formatUnits(m[3], 6)),
          tA:     Number(ethers.formatUnits(m[4], 6)),
          done:   m[5],
          result: Number(m[6]),
        });
      }
      setMatches(list.reverse());
    } catch { setMatches([]); }
  }

  function calcOdds(side, pool, seed) {
    if (!pool || !side) {
      const r = ((seed * 9301 + 49297) % 233280) / 233280;
      return (1.3 + r * 2.2).toFixed(2);
    }
    return Math.max(1.01, pool / side).toFixed(2);
  }

  function addToSlip(match, pred, odds) {
    setBetSlip(prev => {
      const exists = prev.find(b => b.id === match.id);
      if (exists) {
        if (exists.pred === pred) return prev.filter(b => b.id !== match.id);
        return prev.map(b => b.id === match.id ? { ...b, pred, odds, label: predLabel(pred) } : b);
      }
      return [...prev, { id: match.id, home: match.home, away: match.away, pred, odds, label: predLabel(pred) }];
    });
    setSlipOpen(true);
  }

  function predLabel(p) {
    return p === 1 ? "Home Win" : p === 2 ? "Draw" : "Away Win";
  }

  function resultStr(r) {
    return r === 1 ? "Home Win" : r === 2 ? "Draw" : r === 3 ? "Away Win" : "";
  }

  async function placeBet() {
    if (!connected)           return connect();
    if (netErr)               return showToast("Switch to Arc Testnet first!", "err");
    if (!stake || +stake <= 0) return showToast("Enter a valid stake.", "err");
    if (+stake > +bal)        return showToast("Insufficient USDC balance.", "err");
    if (!betSlip.length)      return showToast("Add at least one selection.", "err");

    setLoading(true);
    try {
      const amt = ethers.parseUnits(stake.toString(), 6);
      const usdc = new ethers.Contract(USDC, USDC_ABI, signer);
      showToast("Approving USDC spend…");
      await (await usdc.approve(CONTRACT, amt)).wait();

      const c = new ethers.Contract(CONTRACT, BET_ABI, signer);
      for (const b of betSlip) {
        if (typeof b.id === "number") {
          showToast(`Placing bet on match #${b.id}…`);
          await (await c.placeBet(b.id, b.pred, amt)).wait();
        }
      }
      showToast("✅ Bet placed successfully!");
      setBetSlip([]); setStake(""); setSlipOpen(false);
      loadMatches(provider);
      const a = await signer.getAddress();
      await refreshBal(a, provider);
    } catch (e) {
      if (e.code === 4001) showToast("Transaction rejected.", "err");
      else showToast("Transaction failed. Try again.", "err");
    }
    setLoading(false);
  }

  async function claimWin(id) {
    if (!connected) return connect();
    setLoading(true);
    try {
      const c = new ethers.Contract(CONTRACT, BET_ABI, signer);
      showToast("Claiming winnings…");
      await (await c.claimWinnings(id)).wait();
      showToast("💰 Winnings claimed!");
      loadMatches(provider);
      const a = await signer.getAddress();
      await refreshBal(a, provider);
    } catch { showToast("Claim failed.", "err"); }
    setLoading(false);
  }

  // ── derived
  const totalOdds = betSlip.reduce((a, b) => a * parseFloat(b.odds || 1), 1);
  const potWin    = stake ? (stake * totalOdds).toFixed(2) : "0.00";
  const leagues   = ["All", ...new Set(matches.map(m => m.league))];
  const shown     = leagueTab === "All" ? matches : matches.filter(m => m.league === leagueTab);
  const grouped   = shown.reduce((g, m) => { (g[m.league] = g[m.league]||[]).push(m); return g; }, {});

  // ── BET SLIP
  function SlipPanel() {
    return (
      <div className="slip-wrap">
        <div className="slip-hd">
          <div className="slip-hd-left">
            <span className={`slip-dot ${betSlip.length ? "dot-green" : ""}`} />
            <span className="slip-title">BET SLIP</span>
            {betSlip.length > 0 && <span className="slip-badge">{betSlip.length}</span>}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {betSlip.length > 0 && (
              <button className="slip-clear" onClick={() => { setBetSlip([]); setStake(""); }}>Clear all</button>
            )}
            {mobile && (
              <button className="icon-x" onClick={() => setSlipOpen(false)}>✕</button>
            )}
          </div>
        </div>

        <div className="slip-body">
          {betSlip.length === 0 ? (
            <div className="slip-empty">
              <span style={{ fontSize:32 }}>🎯</span>
              <p>Click any odds to add a selection</p>
            </div>
          ) : (
            <>
              {betSlip.map((b, i) => (
                <div key={i} className="slip-row">
                  <div className="slip-info">
                    <span className="slip-teams">{b.home} vs {b.away}</span>
                    <span className="slip-pick">{b.label}</span>
                  </div>
                  <div className="slip-right">
                    <span className="slip-odds">{b.odds}</span>
                    <button className="slip-del" onClick={() => setBetSlip(p => p.filter((_,idx) => idx !== i))}>✕</button>
                  </div>
                </div>
              ))}

              <div className="stake-wrap">
                <label className="stake-lbl">STAKE (USDC)</label>
                <input
                  type="number"
                  className="stake-input"
                  placeholder="Enter amount…"
                  value={stake}
                  onChange={e => setStake(e.target.value)}
                />
                {connected && (
                  <span className="stake-bal">Balance: <strong>{bal} USDC</strong></span>
                )}
              </div>

              <div className="slip-summary">
                <div className="sum-row">
                  <span>Total odds</span>
                  <strong>{totalOdds.toFixed(2)}x</strong>
                </div>
                <div className="sum-row sum-win">
                  <span>Potential win</span>
                  <strong>{potWin} USDC</strong>
                </div>
              </div>

              <button className="place-btn" onClick={placeBet}>
                {connected ? "⚡ Place Bet" : "🦊 Connect Wallet"}
              </button>
              <p className="slip-note">🔒 Secured by Arc Testnet Smart Contract</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER
  return (
    <div className="app">

      {/* TOAST */}
      {toast && <div className={`toast ${toast.type === "err" ? "toast-err" : ""}`}>{toast.msg}</div>}

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-inner">

          {/* Logo */}
          <div className="hdr-logo">
            {mobile && (
              <button className="icon-x" onClick={() => setMenuOpen(v => !v)}>☰</button>
            )}
            <div className="logo-box">
              <img src="/logo.png" alt="BlockBet" width={24} height={24} style={{ objectFit:"contain" }} />
            </div>
            <div>
              <div className="brand-name">BLOCKBET</div>
              <div className="brand-sub">WEB3 SPORTSBOOK</div>
            </div>
          </div>

          {/* Centre */}
          {!mobile && (
            <div className="hdr-tabs">
              {["⚽ Virtual Football","📊 Markets","👑 VIP","🏆 Leaderboard"].map(t => (
                <button key={t} className="hdr-tab">{t}</button>
              ))}
            </div>
          )}

          {/* Right */}
          <div className="hdr-right">
            {betSlip.length > 0 && (
              <button className="hdr-slip-btn" onClick={() => setSlipOpen(v => !v)}>
                🎯 {betSlip.length}
              </button>
            )}
            {connected ? (
              <div className="hdr-wallet">
                <div className="hdr-addr">🦊 {addr}</div>
                <div className="hdr-bal">{bal} USDC</div>
                {!mobile && (
                  <button className="disc-btn" onClick={disconnect}>Disconnect</button>
                )}
              </div>
            ) : (
              <button className="connect-btn" onClick={connect}>
                🦊 {mobile ? "Connect" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        {/* Network warning */}
        {netErr && connected && (
          <div className="net-warn">
            ⚠️ Wrong network — please switch to Arc Testnet
            <button className="net-switch" onClick={() => ensureNetwork(provider)}>Switch Now</button>
          </div>
        )}
      </header>

      {/* MOBILE DRAWER */}
      {mobile && menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-top">
              <span className="brand-name">BLOCKBET</span>
              <button className="icon-x" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            {connected ? (
              <div className="drawer-wallet">
                <div className="drawer-addr">🦊 {addr}</div>
                <div className="drawer-bal">{bal} USDC</div>
                <button className="disc-btn" style={{ width:"100%", marginTop:10 }} onClick={() => { disconnect(); setMenuOpen(false); }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="connect-btn" style={{ margin:"12px 0", width:"100%" }} onClick={() => { connect(); setMenuOpen(false); }}>
                🦊 Connect Wallet
              </button>
            )}
            {["⚽ Virtual Football","📊 Markets","👑 VIP","🏆 Leaderboard"].map(t => (
              <button key={t} className="drawer-item" onClick={() => setMenuOpen(false)}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow g1" />
        <div className="hero-glow g2" />
        <div className="hero-body">
          <div className="hero-pills">
            <span className="pill green">🟢 Live on Arc Testnet</span>
            <span className="pill blue">🛡️ Provably Fair</span>
            <span className="pill yellow">🤖 AI Powered</span>
          </div>
          <h1 className="hero-h1">
            The Future of <span className="grad-text">On-Chain</span><br />
            Sports Betting
          </h1>
          <p className="hero-p">
            Bet with USDC. Instant payouts. Provably fair. AI-powered predictions.<br />
            Fully decentralized on Arc blockchain.
          </p>
          <div className="hero-btns">
            {!connected
              ? <button className="connect-btn lg" onClick={connect}>🦊 Connect Wallet</button>
              : <button className="connect-btn lg" onClick={() => window.scrollTo({ top:500, behavior:"smooth" })}>⚡ Start Betting</button>
            }
            <button className="outline-btn lg" onClick={() => window.scrollTo({ top:500, behavior:"smooth" })}>
              🎮 View Matches
            </button>
          </div>
          <div className="hero-stats">
            {[["⚽","48K+","TOTAL BETS"],["👥","3,847","ONLINE"],["💎","$284K","USDC LOCKED"],["🔒","100%","ON-CHAIN"]].map(([ic,v,l]) => (
              <div key={l} className="h-stat">
                <div className="h-stat-val">{ic} {v}</div>
                <div className="h-stat-lbl">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN */}
      <div className="main-wrap">

        {/* MATCHES SECTION */}
        <div className="matches-section">
          <div className="ms-head">
            <div>
              <h2 className="ms-title">⚡ Virtual Football</h2>
              <p className="ms-sub">AI-powered virtual matches · Instant USDC payouts</p>
            </div>
            <button className="refresh-btn" onClick={() => loadMatches()}>🔄 Refresh</button>
          </div>

          {/* League tabs */}
          <div className="league-tabs">
            {leagues.map(l => (
              <button
                key={l}
                className={`league-tab ${leagueTab === l ? "league-tab-active" : ""}`}
                onClick={() => setLeagueTab(l)}
              >
                {l === "All" ? "⚡ All" : l}
              </button>
            ))}
          </div>

          {/* Matches */}
          {matches.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize:48 }}>⚡</span>
              <h3>No Matches Yet</h3>
              <p>Connect your wallet to load virtual matches from the blockchain</p>
              <button className="connect-btn" onClick={connect}>🦊 Connect Wallet</button>
            </div>
          ) : (
            Object.entries(grouped).map(([lg, lgMatches]) => (
              <div key={lg} className="league-group">
                <div className="league-hd">
                  <span className="league-dot" /> 🎮 {lg.toUpperCase()}
                </div>
                {lgMatches.map(m => {
                  const pool = m.tH + m.tD + m.tA;
                  const o1   = calcOdds(m.tH, pool, m.id * 1);
                  const ox   = calcOdds(m.tD, pool, m.id * 2);
                  const o2   = calcOdds(m.tA, pool, m.id * 3);
                  const sel  = betSlip.find(b => b.id === m.id);

                  return (
                    <div key={m.id} className="match-card">
                      {/* Tags */}
                      <div className="match-tags">
                        <span className="tag tag-blue">🎮 VIRTUAL</span>
                        {m.done && <span className="tag tag-green">✅ RESOLVED — {resultStr(m.result)}</span>}
                      </div>

                      <div className="match-body">
                        {/* Teams */}
                        <div className="teams">
                          <div className="team">
                            <Logo name={m.home} size={mobile ? 18 : 22} />
                            <span className="team-name">{m.home}</span>
                          </div>
                          <span className="vs">VS</span>
                          <div className="team">
                            <Logo name={m.away} size={mobile ? 18 : 22} />
                            <span className="team-name">{m.away}</span>
                          </div>
                        </div>

                        {/* Odds / Claim */}
                        {m.done ? (
                          <button className="claim-btn" onClick={() => claimWin(m.id)}>
                            💰 Claim Winnings
                          </button>
                        ) : (
                          <div className="odds">
                            {[{code:1,o:o1,l:"1"},{code:2,o:ox,l:"X"},{code:3,o:o2,l:"2"}].map(opt => (
                              <button
                                key={opt.code}
                                className={`odd-btn ${sel?.pred === opt.code ? "odd-active" : ""}`}
                                onClick={() => addToSlip(m, opt.code, opt.o)}
                              >
                                <span className="odd-lbl">{opt.l}</span>
                                <span className="odd-num">{opt.o}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* DESKTOP BET SLIP */}
        {!mobile && (
          <div className="desktop-slip">
            <SlipPanel />
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}
      <section className="hiw">
        <h2 className="hiw-title">How It Works</h2>
        <div className="hiw-grid">
          {[
            { n:"01", icon:"🦊", t:"Connect Wallet",  d:"Connect MetaMask to BlockBet" },
            { n:"02", icon:"💰", t:"Get Test USDC",   d:"Get USDC from faucet.circle.com" },
            { n:"03", icon:"⚽", t:"Choose a Match",  d:"Pick your prediction: 1, X or 2" },
            { n:"04", icon:"🏆", t:"Claim Winnings",  d:"Instant payout after match resolves" },
          ].map(s => (
            <div key={s.n} className="hiw-card">
              <div className="hiw-n">STEP {s.n}</div>
              <div className="hiw-icon">{s.icon}</div>
              <div className="hiw-t">{s.t}</div>
              <div className="hiw-d">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ftr">
        <div className="ftr-top">
          <div className="ftr-brand">
            <div className="logo-box"><img src="/logo.png" alt="" width={22} height={22} style={{ objectFit:"contain" }} /></div>
            <span className="brand-name">BLOCKBET</span>
          </div>
          <p className="ftr-p">Decentralized virtual sports betting · Arc Testnet · USDC native</p>
        </div>
        <div className="ftr-bottom">
          <span>© 2025 BlockBet. All rights reserved.</span>
          <div style={{ display:"flex", gap:8 }}>
            <span className="pill blue">ARC TESTNET</span>
            <span className="pill green">USDC NATIVE</span>
          </div>
        </div>
      </footer>

      {/* MOBILE BET SLIP */}
      {mobile && slipOpen && (
        <div className="mobile-slip-wrap">
          <SlipPanel />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {mobile && (
        <nav className="bot-nav">
          {[
            { icon:"⚽", label:"Matches" },
            { icon:"🎯", label: betSlip.length > 0 ? `Slip(${betSlip.length})` : "Slip", action: () => setSlipOpen(v => !v) },
            { icon:"👑", label:"VIP" },
            { icon:"👤", label:"Account", action: connected ? disconnect : connect },
          ].map(t => (
            <button key={t.label} className="bot-btn" onClick={t.action}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner" />
            <div className="loading-title">Processing…</div>
            <div className="loading-sub">Please confirm in MetaMask</div>
          </div>
        </div>
      )}
    </div>
  );
}