import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

// ─── CONFIG ────────────────────────────────────────────────
const CONTRACT   = "0x6df1feCD5d4A8cA8701458bDc5139bC1038d6fd7";
const USDC_ADDR  = "0x3600000000000000000000000000000000000000";
const CHAIN_ID   = "0x4BE";
const RPC_URL    = "https://rpc.testnet.arc.network";
const ARC_NET    = {
  chainId: CHAIN_ID,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

// Read-only provider so matches/odds load for EVERY visitor,
// not just people who already connected MetaMask.
const readProvider = new ethers.JsonRpcProvider(RPC_URL);

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

// ─── STATIC DATA ───────────────────────────────────────────
const LOGOS = {
  "Man United":     "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  "Arsenal":        "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  "Chelsea":        "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  "Liverpool":      "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  "Man City":       "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  "Tottenham":      "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  "Barcelona":      "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg",
  "Real Madrid":    "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  "Bayern Munich":  "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg",
  "PSG":            "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",
  "Juventus":       "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg",
  "AC Milan":       "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg",
  "Inter Milan":    "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg",
  "Atletico Madrid":"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
  "Dortmund":       "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg",
  "Napoli":         "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli_2007.svg",
  "Ajax":           "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg",
  "PSV":            "https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg",
  "Benfica":        "https://upload.wikimedia.org/wikipedia/en/3/38/Sport_Lisboa_e_Benfica.svg",
  "Porto":          "https://upload.wikimedia.org/wikipedia/en/3/3b/F.C._Porto.svg",
  "Celtic":         "https://upload.wikimedia.org/wikipedia/en/3/35/Celtic_FC.svg",
  "Rangers":        "https://upload.wikimedia.org/wikipedia/en/5/53/Rangers_FC.svg",
  "Flamengo":       "https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg",
  "Palmeiras":      "https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg",
  "Boca Juniors":   "https://upload.wikimedia.org/wikipedia/commons/f/f1/CA_Boca_Juniors_logo.svg",
  "River Plate":    "https://upload.wikimedia.org/wikipedia/commons/a/a2/River_Plate_logo.svg",
  "Al Hilal":       "https://upload.wikimedia.org/wikipedia/en/a/a2/Al-Hilal-Logo.svg",
  "Al Nassr":       "https://upload.wikimedia.org/wikipedia/en/c/cd/Al-Nassr_FC_Logo.svg",
  "Galatasaray":    "https://upload.wikimedia.org/wikipedia/en/9/94/Galatasaray_Sports_Club_Logo.svg",
  "Fenerbahce":     "https://upload.wikimedia.org/wikipedia/en/c/c3/Fenerbah%C3%A7e_SK_logo.svg",
};

const CLUBS = [
  { name:"Man City",      league:"Premier League", country:"England",   rating:96 },
  { name:"Arsenal",       league:"Premier League", country:"England",   rating:91 },
  { name:"Liverpool",     league:"Premier League", country:"England",   rating:92 },
  { name:"Chelsea",       league:"Premier League", country:"England",   rating:87 },
  { name:"Man United",    league:"Premier League", country:"England",   rating:85 },
  { name:"Tottenham",     league:"Premier League", country:"England",   rating:84 },
  { name:"Real Madrid",   league:"La Liga",        country:"Spain",     rating:97 },
  { name:"Barcelona",     league:"La Liga",        country:"Spain",     rating:93 },
  { name:"Atletico Madrid",league:"La Liga",       country:"Spain",     rating:88 },
  { name:"Bayern Munich", league:"Bundesliga",     country:"Germany",   rating:95 },
  { name:"Dortmund",      league:"Bundesliga",     country:"Germany",   rating:87 },
  { name:"Juventus",      league:"Serie A",        country:"Italy",     rating:86 },
  { name:"Inter Milan",   league:"Serie A",        country:"Italy",     rating:89 },
  { name:"AC Milan",      league:"Serie A",        country:"Italy",     rating:87 },
  { name:"Napoli",        league:"Serie A",        country:"Italy",     rating:88 },
  { name:"PSG",           league:"Ligue 1",        country:"France",    rating:92 },
  { name:"Benfica",       league:"Primeira Liga",  country:"Portugal",  rating:84 },
  { name:"Porto",         league:"Primeira Liga",  country:"Portugal",  rating:83 },
  { name:"Ajax",          league:"Eredivisie",     country:"Netherlands",rating:83 },
  { name:"PSV",           league:"Eredivisie",     country:"Netherlands",rating:82 },
  { name:"Celtic",        league:"Scottish Premier",country:"Scotland", rating:81 },
  { name:"Rangers",       league:"Scottish Premier",country:"Scotland", rating:80 },
  { name:"Galatasaray",   league:"Super Lig",      country:"Turkey",    rating:83 },
  { name:"Fenerbahce",    league:"Super Lig",      country:"Turkey",    rating:82 },
  { name:"Flamengo",      league:"Brasileirao",    country:"Brazil",    rating:84 },
  { name:"Palmeiras",     league:"Brasileirao",    country:"Brazil",    rating:83 },
  { name:"Boca Juniors",  league:"Superliga",      country:"Argentina", rating:83 },
  { name:"River Plate",   league:"Superliga",      country:"Argentina", rating:84 },
  { name:"Al Hilal",      league:"Saudi Pro League",country:"Saudi Arabia",rating:86 },
  { name:"Al Nassr",      league:"Saudi Pro League",country:"Saudi Arabia",rating:85 },
];

const DEMO_MATCHES = [
  { id:"d1", home:"Man United",    away:"Arsenal",       league:"Virtual Premier League",  ai:"Home", conf:72 },
  { id:"d2", home:"Barcelona",     away:"Real Madrid",   league:"Virtual La Liga",         ai:"Away", conf:68 },
  { id:"d3", home:"Liverpool",     away:"Man City",      league:"Virtual Premier League",  ai:"Away", conf:74 },
  { id:"d4", home:"PSG",           away:"Bayern Munich", league:"Virtual Champions League",ai:"Home", conf:65 },
  { id:"d5", home:"Juventus",      away:"Inter Milan",   league:"Virtual Serie A",         ai:"Draw", conf:58 },
  { id:"d6", home:"Dortmund",      away:"Bayern Munich", league:"Virtual Bundesliga",      ai:"Away", conf:77 },
  { id:"d7", home:"Ajax",          away:"PSV",           league:"Virtual Eredivisie",      ai:"Home", conf:62 },
  { id:"d8", home:"Boca Juniors",  away:"River Plate",   league:"Virtual Superliga",       ai:"Home", conf:60 },
  { id:"d9", home:"Celtic",        away:"Rangers",       league:"Virtual Scottish Premier",ai:"Home", conf:63 },
  { id:"d10",home:"Galatasaray",   away:"Fenerbahce",    league:"Virtual Super Lig",       ai:"Away", conf:66 },
  { id:"d11",home:"Flamengo",      away:"Palmeiras",     league:"Virtual Brasileirao",     ai:"Draw", conf:55 },
  { id:"d12",home:"Al Hilal",      away:"Al Nassr",      league:"Virtual Saudi Pro League",ai:"Home", conf:70 },
  { id:"d13",home:"Atletico Madrid",away:"Barcelona",    league:"Virtual La Liga",         ai:"Away", conf:69 },
  { id:"d14",home:"Chelsea",       away:"Tottenham",     league:"Virtual Premier League",  ai:"Home", conf:71 },
  { id:"d15",home:"AC Milan",      away:"Napoli",        league:"Virtual Serie A",         ai:"Away", conf:64 },
];

const PROMOS = [
  { icon:"🎁", title:"Welcome Bonus",    desc:"100% match on first deposit up to 500 USDC", badge:"NEW",   color:"#10E981" },
  { icon:"👥", title:"Refer & Earn",     desc:"Get 50 USDC for every friend you refer",      badge:"HOT",   color:"#2EC7F2" },
  { icon:"👑", title:"VIP Cashback",     desc:"Weekly cashback up to 20% for VIP members",   badge:"VIP",   color:"#FFC857" },
  { icon:"🚀", title:"Acca Boost",       desc:"Up to 50% boost on accumulator bets",          badge:"BOOST", color:"#47D7FF" },
  { icon:"🏆", title:"Weekly Tournament",desc:"Compete for 10,000 USDC prize pool",           badge:"LIVE",  color:"#FF4D6D" },
  { icon:"🍀", title:"Daily Lucky Draw", desc:"Daily draw with guaranteed USDC prizes",        badge:"DAILY", color:"#a78bfa" },
];

const VIP_TIERS = [
  { name:"Bronze",  icon:"🥉", cashback:"5%",  color:"#CD7F32" },
  { name:"Silver",  icon:"🥈", cashback:"8%",  color:"#C0C0C0" },
  { name:"Gold",    icon:"🥇", cashback:"12%", color:"#FFD700" },
  { name:"Platinum",icon:"💎", cashback:"16%", color:"#2EC7F2" },
  { name:"Diamond", icon:"👑", cashback:"20%", color:"#6FEFFF" },
];

const FAQS = [
  { q:"What is BlockBet?",            a:"BlockBet is a decentralized virtual football betting platform on Arc Testnet. All bets use USDC and are settled by smart contracts." },
  { q:"How do I start betting?",      a:"Connect MetaMask, switch to Arc Testnet, get test USDC from faucet.circle.com, pick a virtual match and place your bet." },
  { q:"How are results decided?",     a:"Virtual match results are generated on-chain using verifiable smart contracts for complete transparency and fairness." },
  { q:"When do I get my winnings?",   a:"Winnings are available instantly after a match resolves. Click Claim Winnings on your winning bet." },
  { q:"Is BlockBet provably fair?",   a:"Yes! All match results are generated by smart contracts on Arc blockchain — fully transparent and verifiable." },
  { q:"What is the minimum bet?",     a:"Minimum bet is 1 USDC. VIP members can access higher limits." },
];

const NAV_ITEMS = [
  { id:"home",       icon:"⚡", label:"Virtual Football" },
  { id:"clubs",      icon:"🏟️", label:"Club Explorer"    },
  { id:"ai",         icon:"🤖", label:"AI Predictions"   },
  { id:"promos",     icon:"🎁", label:"Promotions"       },
  { id:"vip",        icon:"👑", label:"VIP Club"         },
  { id:"leaderboard",icon:"🏆", label:"Leaderboard"      },
];

const LEADERBOARD = [
  { rank:1, wallet:"0x7f3a...4c2e", profit:"12,450", bets:234 },
  { rank:2, wallet:"0x9b1c...7d8f", profit:"9,820",  bets:187 },
  { rank:3, wallet:"0x2e4d...1a9b", profit:"7,650",  bets:156 },
  { rank:4, wallet:"0x5c8f...3e2a", profit:"5,230",  bets:142 },
  { rank:5, wallet:"0x1d6b...9c4f", profit:"4,870",  bets:128 },
];

// ─── HELPERS ───────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

function randomOdds(seed) {
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  return (1.3 + r * 2.5).toFixed(2);
}

// ─── COMPONENTS ────────────────────────────────────────────
function Pill({ children, color = "#2EC7F2", small }) {
  return (
    <span className={small ? "pill pill-sm" : "pill"} style={{ background: color + "18", border: `1px solid ${color}40`, color }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, outline, small, danger, style = {} }) {
  const cls = ["bb-btn", outline ? "btn-outline" : "btn-solid", small ? "btn-sm" : "", danger ? "btn-danger" : ""].join(" ");
  return <button className={cls} onClick={onClick} style={style}>{children}</button>;
}

function Card({ children, glow, style = {}, onClick }) {
  return (
    <div className={glow ? "card card-glow" : "card"} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

function TeamLogo({ name, size = 22 }) {
  const src = LOGOS[name];
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "#0D1728", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>⚽</div>;
}

// ─── MAIN ──────────────────────────────────────────────────
export default function App() {
  const mobile = useIsMobile();

  // wallet state
  const [signer,      setSigner]      = useState(null);
  const [connected,   setConnected]   = useState(false);
  const [address,     setAddress]     = useState("");
  const [balance,     setBalance]     = useState("0.00");
  const [netErr,      setNetErr]      = useState(false);

  // ui state
  const [page,        setPage]        = useState("home");
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [notif,       setNotif]       = useState(null);
  const [openFaq,     setOpenFaq]     = useState(null);
  const [favClubs,    setFavClubs]    = useState([]);
  const [clubSearch,  setClubSearch]  = useState("");
  const [clubCountry, setClubCountry] = useState("All");

  // betting state
  const [matches,      setMatches]      = useState([]);
  const [matchesReady, setMatchesReady] = useState(false);
  const [league,       setLeague]       = useState("All");
  const [betSlip,      setBetSlip]      = useState([]);
  const [slipOpen,     setSlipOpen]     = useState(false);
  const [stake,        setStake]        = useState("");
  const [loading,      setLoading]      = useState(false);

  // ── effects
  useEffect(() => {
    // Always load matches on a read-only RPC — works with zero wallet.
    loadMatches();
    const t = setInterval(() => loadMatches(), 30000);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", onAccounts);
      window.ethereum.on("chainChanged", () => window.location.reload());
      if (localStorage.getItem("bb_connected") === "1") silentConnect();
    }
    return () => { clearInterval(t); window.removeEventListener("scroll", onScroll); };
  }, []);

  // ── wallet helpers
  async function silentConnect() {
    try {
      const accs = await window.ethereum.request({ method: "eth_accounts" });
      if (accs.length) {
        const p = new ethers.BrowserProvider(window.ethereum);
        const s = await p.getSigner();
        setSigner(s); setConnected(true);
        setAddress(accs[0].slice(0,6) + "..." + accs[0].slice(-4));
        await checkNet(p); await fetchBal(accs[0], p);
      }
    } catch {}
  }

  async function onAccounts(accs) {
    if (!accs.length) return disconnect();
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    setSigner(s); setAddress(accs[0].slice(0,6) + "..." + accs[0].slice(-4));
    await fetchBal(accs[0], p);
  }

  async function checkNet(p) {
    const net = await p.getNetwork();
    const cid = "0x" + net.chainId.toString(16);
    if (cid !== CHAIN_ID) {
      setNetErr(true);
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] }); setNetErr(false); }
      catch (e) { if (e.code === 4902) { await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC_NET] }); setNetErr(false); } }
    } else setNetErr(false);
  }

  async function fetchBal(addr, p) {
    try {
      const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, p);
      const b = await usdc.balanceOf(addr);
      setBalance(Number(ethers.formatUnits(b, 6)).toFixed(2));
    } catch { setBalance("0.00"); }
  }

  async function connect() {
    if (!window.ethereum) { toast("MetaMask not found! Please install MetaMask.", "err"); return; }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      setSigner(s); setConnected(true);
      setAddress(addr.slice(0,6) + "..." + addr.slice(-4));
      localStorage.setItem("bb_connected", "1");
      await checkNet(p); await fetchBal(addr, p);
      toast("Wallet connected! 🎉");
    } catch (e) {
      toast(e.code === 4001 ? "Connection rejected." : "Failed to connect.", "err");
    }
  }

  function disconnect() {
    setSigner(null); setConnected(false); setAddress(""); setBalance("0.00");
    setBetSlip([]); setNetErr(false); localStorage.removeItem("bb_connected");
    toast("Wallet disconnected.");
  }

  function toast(msg, type = "ok") {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 4000);
  }

  // ── match helpers
  // Always reads via the public RPC (readProvider) so matches show up for
  // every visitor immediately, whether or not MetaMask is installed/connected.
  async function loadMatches() {
    try {
      const c = new ethers.Contract(CONTRACT, BET_ABI, readProvider);
      const cnt = Number(await c.matchCount());
      const loaded = [];
      for (let i = Math.max(1, cnt - 14); i <= cnt; i++) {
        const m = await c.getMatch(i);
        const demo = DEMO_MATCHES.find(d => d.home === m[0] && d.away === m[1]);
        loaded.push({
          id: i, home: m[0], away: m[1],
          league: demo?.league || "Virtual League",
          totalHome: Number(ethers.formatUnits(m[2], 6)),
          totalDraw: Number(ethers.formatUnits(m[3], 6)),
          totalAway: Number(ethers.formatUnits(m[4], 6)),
          resolved: m[5], result: Number(m[6]),
          ai: demo?.ai || "Home", conf: demo?.conf || 65,
        });
      }
      setMatches(loaded.reverse());
    } catch (err) {
      console.error("loadMatches failed:", err);
      setMatches([]);
    } finally {
      setMatchesReady(true);
    }
  }

  function odds(side, pool, seed) {
    if (!pool || !side) return randomOdds(seed);
    return Math.max(1.01, pool / side).toFixed(2);
  }

  function addBet(match, pred, o) {
    const label    = pred === 1 ? "1" : pred === 2 ? "X" : "2";
    const predText = pred === 1 ? "Home Win" : pred === 2 ? "Draw" : "Away Win";
    setBetSlip(prev => {
      const exists = prev.find(b => b.mid === match.id);
      if (exists) {
        if (exists.pred === pred) return prev.filter(b => b.mid !== match.id);
        return prev.map(b => b.mid === match.id ? { ...b, pred, label, predText, odds: o } : b);
      }
      return [...prev, { mid: match.id, home: match.home, away: match.away, pred, label, predText, odds: o }];
    });
    setSlipOpen(true);
  }

  async function placeBets() {
    if (!connected)              return connect();
    if (netErr)                  return toast("Switch to Arc Testnet first!", "err");
    if (!stake || stake <= 0)    return toast("Enter a valid stake amount.", "err");
    if (+stake > +balance)       return toast("Insufficient USDC balance.", "err");
    setLoading(true);
    try {
      const amt = ethers.parseUnits(stake.toString(), 6);
      const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
      await (await usdc.approve(CONTRACT, amt)).wait();
      const c = new ethers.Contract(CONTRACT, BET_ABI, signer);
      for (const b of betSlip) {
        if (!isNaN(b.mid)) {
          await (await c.placeBet(b.mid, b.pred, amt)).wait();
        }
      }
      toast("✅ Bet placed successfully!");
      setBetSlip([]); setStake(""); loadMatches();
      const addr = await signer.getAddress();
      await fetchBal(addr, new ethers.BrowserProvider(window.ethereum));
    } catch (e) {
      toast(e.code === 4001 ? "Transaction rejected." : "Transaction failed.", "err");
    }
    setLoading(false);
  }

  async function claim(id) {
    if (!connected) return connect();
    setLoading(true);
    try {
      const c = new ethers.Contract(CONTRACT, BET_ABI, signer);
      await (await c.claimWinnings(id)).wait();
      toast("💰 Winnings claimed!"); loadMatches();
      const addr = await signer.getAddress();
      await fetchBal(addr, new ethers.BrowserProvider(window.ethereum));
    } catch { toast("Claim failed. You may not have a winning bet.", "err"); }
    setLoading(false);
  }

  // ── derived
  const totalOdds = betSlip.reduce((a, b) => a * parseFloat(b.odds || 1), 1);
  const potWin    = stake ? (stake * totalOdds).toFixed(2) : "0.00";
  const resultStr = r => r===1 ? "Home Win" : r===2 ? "Draw" : r===3 ? "Away Win" : "";
  const LEAGUES   = ["All", ...new Set(matches.map(m => m.league))];
  const shown     = league === "All" ? matches : matches.filter(m => m.league === league);
  const grouped   = shown.reduce((g, m) => { (g[m.league] = g[m.league] || []).push(m); return g; }, {});
  const COUNTRIES = ["All", ...new Set(CLUBS.map(c => c.country))];
  const clubs     = CLUBS.filter(c =>
    c.name.toLowerCase().includes(clubSearch.toLowerCase()) &&
    (clubCountry === "All" || c.country === clubCountry)
  );

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="app">
      <style>{`
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 20px rgba(46,199,242,.3)} 50%{box-shadow:0 0 50px rgba(46,199,242,.6)} }
      `}</style>

      {/* ── NOTIFICATION ── */}
      {notif && (
        <div className={`notif ${notif.type === "err" ? "notif-err" : ""}`}>
          {notif.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <header className={`header ${scrolled ? "header-scrolled" : ""}`}>
        <div className="header-inner">
          {/* Logo */}
          <div className="logo-wrap">
            {mobile && (
              <button className="icon-btn" onClick={() => setMenuOpen(v => !v)}>☰</button>
            )}
            <div className="logo-icon">
              <img src="/logo.png" alt="BlockBet" width={26} height={26} style={{ objectFit:"contain" }} />
            </div>
            <div>
              <div className="logo-text">BLOCKBET</div>
              <div className="logo-sub">WEB3 SPORTSBOOK</div>
            </div>
          </div>

          {/* Desktop nav */}
          {!mobile && (
            <nav className="main-nav">
              {NAV_ITEMS.map(n => (
                <button key={n.id} className={`nav-btn ${page === n.id ? "nav-btn-active" : ""}`} onClick={() => setPage(n.id)}>
                  {n.label}
                </button>
              ))}
            </nav>
          )}

          {/* Right */}
          <div className="header-right">
            {betSlip.length > 0 && (
              <button className="slip-pill" onClick={() => setSlipOpen(v => !v)}>
                🎯 {betSlip.length}
              </button>
            )}
            {connected ? (
              <>
                <div className="wallet-badge">
                  <span className="wallet-addr">🦊 {address}</span>
                  <span className="wallet-bal">{balance} USDC</span>
                </div>
                {!mobile && <Btn outline small danger onClick={disconnect}>Disconnect</Btn>}
              </>
            ) : (
              <Btn onClick={connect}>{mobile ? "🦊 Connect" : "🦊 Connect Wallet"}</Btn>
            )}
          </div>
        </div>

        {/* Network error bar */}
        {netErr && connected && (
          <div className="net-err">
            ⚠️ Wrong network — please switch to Arc Testnet
            <Btn small onClick={() => checkNet(new ethers.BrowserProvider(window.ethereum))} style={{ marginLeft:12 }}>
              Switch
            </Btn>
          </div>
        )}
      </header>

      {/* ── MOBILE MENU ── */}
      {mobile && menuOpen && (
        <div className="overlay" onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="logo-text">BLOCKBET</span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            {connected ? (
              <div className="drawer-wallet">
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>CONNECTED</div>
                <div style={{ color:"var(--primary)", fontWeight:700 }}>🦊 {address}</div>
                <div style={{ color:"var(--success)", fontWeight:800, fontSize:16 }}>{balance} USDC</div>
                <Btn small danger onClick={() => { disconnect(); setMenuOpen(false); }} style={{ marginTop:10, width:"100%" }}>
                  Disconnect
                </Btn>
              </div>
            ) : (
              <Btn onClick={() => { connect(); setMenuOpen(false); }} style={{ margin:"12px 16px", width:"calc(100% - 32px)" }}>
                🦊 Connect Wallet
              </Btn>
            )}
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={`drawer-item ${page === n.id ? "drawer-item-active" : ""}`}
                onClick={() => { setPage(n.id); setMenuOpen(false); }}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── LAYOUT ── */}
      <div className="layout">

        {/* Desktop sidebar */}
        {!mobile && (
          <aside className="sidebar">
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={`sidebar-item ${page === n.id ? "sidebar-item-active" : ""}`}
                onClick={() => setPage(n.id)}>
                <span>{n.icon}</span> {n.label}
              </button>
            ))}
            <div className="sidebar-stats">
              <div className="sidebar-stats-title">PLATFORM STATS</div>
              {[
                { label:"Virtual Matches", val: matches.length, color:"var(--primary)" },
                { label:"Players Online",  val:"3,847",          color:"var(--success)" },
                { label:"Total Bets",      val:"48,291",          color:"var(--warning)" },
                { label:"USDC Locked",     val:"$284K",           color:"var(--secondary)" },
              ].map(s => (
                <div key={s.label} className="stats-row">
                  <span style={{ color:"var(--muted)" }}>{s.label}</span>
                  <span style={{ color:s.color, fontWeight:700 }}>{s.val}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="main">

          {/* ── HERO ── */}
          <section className="hero">
            <div className="hero-glow hero-glow-1" />
            <div className="hero-glow hero-glow-2" />
            <div className="hero-grid" />
            {!mobile && [0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="particle" style={{ top:`${10+i*10}%`, left:`${5+i*12}%`, animationDelay:`${i*0.4}s` }} />
            ))}

            <div className="hero-content">
              <div className="hero-badges">
                {[["🔴","LIVE ON ARC","var(--success)"],["🛡️","PROVABLY FAIR","var(--primary)"],["🤖","AI POWERED","var(--warning)"],["⚡","INSTANT PAYOUTS","var(--secondary)"]].map(([ic,tx,col]) => (
                  <span key={tx} className="hero-badge" style={{ background:`${col}15`, border:`1px solid ${col}40`, color:col }}>
                    {ic} {tx}
                  </span>
                ))}
              </div>

              <h1 className="hero-title">
                The Future of <span className="hero-gradient">On-Chain</span><br />Sports Betting
              </h1>

              <p className="hero-sub">
                Bet with USDC. Instant payouts. Provably fair.{" "}
                <span style={{ color:"var(--primary)", fontWeight:600 }}>AI-powered predictions.</span>{" "}
                Fully decentralized on Arc blockchain.
              </p>

              <div className="hero-ctas">
                {!connected
                  ? <Btn onClick={connect}>🦊 Connect Wallet</Btn>
                  : <Btn onClick={() => setPage("home")}>⚡ Start Betting</Btn>
                }
                <Btn outline onClick={() => { setPage("home"); }}>🎮 View Matches</Btn>
              </div>

              <div className="hero-stats">
                {[["⚽","48,291+","TOTAL BETS"],["👥","3,847","ONLINE NOW"],["💎","$284K+","USDC LOCKED"],["🔒","100%","ON-CHAIN"]].map(([ic,val,lbl]) => (
                  <div key={lbl}>
                    <div className="hero-stat-val">{ic} {val}</div>
                    <div className="hero-stat-lbl">{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating cards — hidden on mobile, and now sit in normal
                flow on the right of the hero instead of overlapping text
                (see .hero / .float-card rules appended to App.css) */}
            {!mobile && (
              <div className="float-card-stack">
                {DEMO_MATCHES.slice(0,2).map((m,i) => (
                  <div key={m.id} className="float-card" style={{ animationDelay:`${i}s` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                      <Pill color="var(--success)" small>🎮 VIRTUAL</Pill>
                      <span style={{ fontSize:10, color:"var(--warning)", fontWeight:700 }}>AI: {m.ai} {m.conf}%</span>
                    </div>
                    <div style={{ fontSize:13, color:"#fff", fontWeight:700, marginBottom:10 }}>{m.home} vs {m.away}</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {["1","X","2"].map(l => (
                        <div key={l} className="float-odd">
                          <div style={{ fontSize:9, color:"var(--muted)" }}>{l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:"var(--primary)" }}>{randomOdds(m.id.charCodeAt(1)+l.charCodeAt(0))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── PAGE CONTENT ── */}
          <div className="page-content">

            {/* HOME — Virtual matches */}
            {page === "home" && (
              <div className="fade-in">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">⚡ Virtual Football Arena</h2>
                    <p className="section-sub">AI-powered virtual matches · Instant settlement</p>
                  </div>
                  <Btn small outline onClick={() => loadMatches()}>🔄 Refresh</Btn>
                </div>

                {/* League filter */}
                <div className="filter-row">
                  {LEAGUES.map(l => (
                    <button key={l} className={`filter-btn ${league===l?"filter-btn-active":""}`} onClick={() => setLeague(l)}>
                      {l === "All" ? "⚡ All" : `🎮 ${l}`}
                    </button>
                  ))}
                </div>

                {!matchesReady ? (
                  <Card style={{ padding:60, textAlign:"center" }}>
                    <div className="spinner" style={{ margin:"0 auto 16px" }} />
                    <div style={{ fontSize:13, color:"var(--muted)" }}>Loading virtual matches...</div>
                  </Card>
                ) : matches.length === 0 ? (
                  <Card style={{ padding:60, textAlign:"center" }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>⚡</div>
                    <div style={{ fontSize:18, fontWeight:700, color:"#fff", marginBottom:8 }}>No Virtual Matches Yet</div>
                    <div style={{ fontSize:13, color:"var(--muted)", marginBottom:24 }}>
                      No matches were found on-chain right now. Try refreshing, or connect your wallet to place bets once matches are live.
                    </div>
                    <Btn onClick={connected ? () => loadMatches() : connect}>
                      {connected ? "🔄 Refresh" : "🦊 Connect Wallet"}
                    </Btn>
                  </Card>
                ) : (
                  Object.entries(grouped).map(([lg, lgMatches]) => (
                    <div key={lg} style={{ marginBottom:28 }}>
                      <div className="league-header">
                        <span className="league-dot" />
                        🎮 {lg.toUpperCase()}
                      </div>
                      <div className="match-list">
                        {lgMatches.map(m => {
                          const pool = m.totalHome + m.totalDraw + m.totalAway;
                          const o1 = odds(m.totalHome, pool, m.id * 1);
                          const ox = odds(m.totalDraw,  pool, m.id * 2);
                          const o2 = odds(m.totalAway,  pool, m.id * 3);
                          const sel = betSlip.find(b => b.mid === m.id);
                          return (
                            <Card key={m.id} style={{ padding: mobile ? 14 : "16px 20px" }}>
                              <div className="match-row">
                                {/* Teams */}
                                <div className="match-teams">
                                  <div className="match-pills">
                                    <Pill small>VIRTUAL</Pill>
                                    <Pill small color="var(--warning)">🤖 {m.ai} {m.conf}%</Pill>
                                    {m.resolved && <Pill small color="var(--success)">✅ DONE</Pill>}
                                  </div>
                                  <div className="team-row">
                                    <TeamLogo name={m.home} size={mobile?16:20} />
                                    <span className="team-name">{m.home}</span>
                                  </div>
                                  <div className="team-row">
                                    <TeamLogo name={m.away} size={mobile?16:20} />
                                    <span className="team-name">{m.away}</span>
                                  </div>
                                  {m.resolved && (
                                    <div style={{ fontSize:12, color:"var(--success)", fontWeight:700, marginTop:6 }}>
                                      ✅ Result: {resultStr(m.result)}
                                    </div>
                                  )}
                                </div>

                                {/* Odds */}
                                {!m.resolved && (
                                  <div className="odds-row">
                                    {[{code:1,o:o1,l:"1"},{code:2,o:ox,l:"X"},{code:3,o:o2,l:"2"}].map(opt => (
                                      <button key={opt.code} className={`odd-btn ${sel?.pred===opt.code?"odd-btn-active":""}`}
                                        onClick={() => addBet(m, opt.code, opt.o)}>
                                        <span className="odd-label">{opt.l}</span>
                                        <span className="odd-val">{opt.o}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* Claim */}
                                {m.resolved && (
                                  <Btn small onClick={() => claim(m.id)}>💰 Claim</Btn>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CLUBS */}
            {page === "clubs" && (
              <div className="fade-in">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">🏟️ Club Explorer</h2>
                    <p className="section-sub">Explore clubs and their AI ratings</p>
                  </div>
                </div>
                <div className="club-filters">
                  <input className="search-input" value={clubSearch} onChange={e => setClubSearch(e.target.value)} placeholder="🔍 Search clubs..." />
                  <div className="filter-row" style={{ marginTop:0 }}>
                    {COUNTRIES.map(c => (
                      <button key={c} className={`filter-btn ${clubCountry===c?"filter-btn-active":""}`} onClick={() => setClubCountry(c)}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="clubs-grid">
                  {clubs.map(cl => (
                    <Card key={cl.name} style={{ padding:18, textAlign:"center", cursor:"pointer" }}
                      onClick={() => setFavClubs(p => p.includes(cl.name) ? p.filter(f=>f!==cl.name) : [...p,cl.name])}>
                      <div style={{ textAlign:"right", marginBottom:6, fontSize:16 }}>
                        {favClubs.includes(cl.name) ? "❤️" : "🤍"}
                      </div>
                      <img src={LOGOS[cl.name] || ""} alt={cl.name} style={{ width:48, height:48, objectFit:"contain", marginBottom:10 }} onError={e=>e.target.style.display="none"} />
                      <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:3 }}>{cl.name}</div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:12 }}>{cl.league}</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <div className="club-stat">
                          <div style={{ fontSize:9, color:"var(--muted)" }}>AI RATING</div>
                          <div style={{ fontSize:16, fontWeight:800, color:"var(--primary)" }}>{cl.rating}</div>
                        </div>
                        <div className="club-stat" style={{ background:"rgba(16,233,129,0.08)" }}>
                          <div style={{ fontSize:9, color:"var(--muted)" }}>FORM</div>
                          <div style={{ fontSize:16, fontWeight:800, color:"var(--success)" }}>
                            {cl.rating > 90 ? "A" : cl.rating > 85 ? "B+" : "B"}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* AI PREDICTIONS */}
            {page === "ai" && (
              <div className="fade-in">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">🤖 AI Prediction Center</h2>
                    <p className="section-sub">Machine learning powered match predictions</p>
                  </div>
                </div>
                <div className="ai-grid">
                  {DEMO_MATCHES.slice(0,8).map(m => (
                    <Card key={m.id} glow style={{ padding:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{m.home} vs {m.away}</span>
                        <Pill small color="var(--warning)">🤖 AI</Pill>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                        <div className="ai-stat">
                          <div style={{ fontSize:9, color:"var(--muted)", marginBottom:4 }}>PREDICTION</div>
                          <div style={{ fontSize:16, fontWeight:800, color:"var(--primary)" }}>{m.ai} Win</div>
                        </div>
                        <div className="ai-stat ai-stat-green">
                          <div style={{ fontSize:9, color:"var(--muted)", marginBottom:4 }}>CONFIDENCE</div>
                          <div style={{ fontSize:16, fontWeight:800, color:"var(--success)" }}>{m.conf}%</div>
                        </div>
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--muted)", marginBottom:6 }}>
                          <span>Win Probability</span>
                          <span style={{ color:"var(--primary)" }}>{m.conf}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width:`${m.conf}%` }} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {["1","X","2"].map((l,i) => (
                          <div key={l} className="ai-odd">
                            <div style={{ fontSize:9, color:"var(--muted)" }}>{l}</div>
                            <div style={{ fontSize:14, fontWeight:800, color:"var(--primary)" }}>{randomOdds(m.id.charCodeAt(1)*(i+1))}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* PROMOS */}
            {page === "promos" && (
              <div className="fade-in">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">🎁 Promotions</h2>
                    <p className="section-sub">Exclusive bonuses for BlockBet players</p>
                  </div>
                </div>
                <div className="promos-grid">
                  {PROMOS.map(p => (
                    <Card key={p.title} style={{ padding:22, position:"relative", overflow:"hidden" }}>
                      <div style={{ position:"absolute", top:-40, right:-40, width:120, height:120, borderRadius:"50%", background:`${p.color}10`, filter:"blur(20px)" }} />
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                        <span style={{ fontSize:32 }}>{p.icon}</span>
                        <Pill small color={p.color}>{p.badge}</Pill>
                      </div>
                      <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:8 }}>{p.title}</div>
                      <div style={{ fontSize:13, color:"var(--gray)", lineHeight:1.6, marginBottom:16 }}>{p.desc}</div>
                      <Btn small style={{ width:"100%" }}>Claim Now →</Btn>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* VIP */}
            {page === "vip" && (
              <div className="fade-in">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">👑 VIP Club</h2>
                    <p className="section-sub">Exclusive rewards for our most loyal players</p>
                  </div>
                </div>
                <div className="vip-grid">
                  {VIP_TIERS.map((v,i) => (
                    <Card key={v.name} glow={i===4} style={{ padding:24, textAlign:"center" }}>
                      <div style={{ fontSize:36, marginBottom:12 }}>{v.icon}</div>
                      <div style={{ fontSize:16, fontWeight:800, color:v.color, marginBottom:16, textShadow:`0 0 15px ${v.color}60` }}>{v.name}</div>
                      <div style={{ fontSize:11, color:"var(--muted)", marginBottom:4 }}>Weekly Cashback</div>
                      <div style={{ fontSize:28, fontWeight:900, color:"var(--success)", marginBottom:16 }}>{v.cashback}</div>
                      <Btn small outline>Join {v.name}</Btn>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* LEADERBOARD */}
            {page === "leaderboard" && (
              <div className="fade-in">
                <div className="section-head">
                  <div>
                    <h2 className="section-title">🏆 Leaderboard</h2>
                    <p className="section-sub">Top performers this week</p>
                  </div>
                </div>
                <Card style={{ overflow:"hidden" }}>
                  <div className="lb-head">
                    <span>#</span><span>PLAYER</span><span style={{textAlign:"right"}}>PROFIT</span><span style={{textAlign:"right"}}>BETS</span>
                  </div>
                  {LEADERBOARD.map((p,i) => (
                    <div key={p.rank} className="lb-row">
                      <span style={{ fontSize:16, fontWeight:800, color: i<3?"var(--warning)":"var(--muted)" }}>
                        {i===0?"👑":i===1?"🥈":i===2?"🥉":p.rank}
                      </span>
                      <span style={{ fontSize:13, color:"#fff", fontFamily:"monospace" }}>{p.wallet}</span>
                      <span style={{ fontSize:14, fontWeight:800, color:"var(--success)", textAlign:"right" }}>+{p.profit} USDC</span>
                      <span style={{ fontSize:13, color:"var(--muted)", textAlign:"right" }}>{p.bets}</span>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* HOW IT WORKS */}
            <section style={{ padding: mobile ? "32px 0" : "48px 0" }}>
              <div style={{ textAlign:"center", marginBottom:32 }}>
                <h2 className="section-title">How It Works</h2>
                <p className="section-sub">Get started in four simple steps</p>
              </div>
              <div className="steps-grid">
                {[
                  { n:"01", icon:"🦊", t:"Connect Wallet",  d:"Connect your MetaMask wallet to BlockBet" },
                  { n:"02", icon:"💰", t:"Get USDC",        d:"Get test USDC from faucet.circle.com" },
                  { n:"03", icon:"⚽", t:"Choose Match",    d:"Pick a virtual match and your prediction" },
                  { n:"04", icon:"🏆", t:"Win Instantly",   d:"Claim your winnings after match resolves" },
                ].map(s => (
                  <Card key={s.n} style={{ padding:22, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"var(--primary)", fontWeight:800, letterSpacing:2, marginBottom:10 }}>STEP {s.n}</div>
                    <div style={{ fontSize:36, marginBottom:12 }}>{s.icon}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:8 }}>{s.t}</div>
                    <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.6 }}>{s.d}</div>
                  </Card>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section style={{ padding: mobile ? "0 0 32px" : "0 0 48px" }}>
              <div style={{ textAlign:"center", marginBottom:28 }}>
                <h2 className="section-title">FAQ</h2>
                <p className="section-sub">Everything you need to know</p>
              </div>
              <div className="faq-list">
                {FAQS.map((f,i) => (
                  <Card key={i} style={{ overflow:"hidden", cursor:"pointer", marginBottom:8 }} onClick={() => setOpenFaq(openFaq===i?null:i)}>
                    <div className="faq-q">
                      <span>{f.q}</span>
                      <span style={{ fontSize:18, color:"var(--primary)", transition:"transform .2s", display:"inline-block", transform: openFaq===i?"rotate(45deg)":"none" }}>+</span>
                    </div>
                    {openFaq===i && <div className="faq-a">{f.a}</div>}
                  </Card>
                ))}
              </div>
            </section>

          </div>{/* end page-content */}

          {/* FOOTER */}
          <footer className="footer">
            <div className="footer-grid">
              <div>
                <div className="logo-wrap" style={{ marginBottom:14 }}>
                  <div className="logo-icon"><img src="/logo.png" alt="" width={22} height={22} style={{ objectFit:"contain" }} /></div>
                  <span className="logo-text">BLOCKBET</span>
                </div>
                <p style={{ fontSize:13, color:"var(--muted)", lineHeight:1.7, maxWidth:260 }}>
                  The future of decentralized virtual football betting. Powered by Arc Testnet. USDC native.
                </p>
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  {["𝕏","📱","💬","🐙"].map((ic,i) => (
                    <div key={i} className="social-btn">{ic}</div>
                  ))}
                </div>
              </div>
              {[
                { t:"Product",  l:["Virtual Football","AI Predictions","Club Explorer","VIP Club","Tournaments"] },
                { t:"Company",  l:["About","Blog","Careers","Press","Contact"] },
                { t:"Legal",    l:["Privacy Policy","Terms of Service","Responsible Gaming","Disclaimer"] },
              ].map(col => (
                <div key={col.t}>
                  <div className="footer-col-title">{col.t}</div>
                  {col.l.map(link => <div key={link} className="footer-link">{link}</div>)}
                </div>
              ))}
            </div>
            <div className="footer-bottom">
              <span>© 2025 BlockBet. Built on Arc Testnet.</span>
              <div style={{ display:"flex", gap:10 }}>
                <Pill small>ARC TESTNET</Pill>
                <Pill small color="var(--success)">USDC NATIVE</Pill>
                <Pill small color="var(--warning)">PROVABLY FAIR</Pill>
              </div>
            </div>
          </footer>

          {mobile && <div style={{ height:70 }} />}
        </main>

        {/* Desktop bet slip */}
        {!mobile && (
          <aside className="betslip-panel">
            <BetSlipContent />
          </aside>
        )}
      </div>

      {/* Mobile bet slip */}
      {mobile && slipOpen && (
        <div className="mobile-slip">
          <BetSlipContent />
        </div>
      )}

      {/* Mobile bottom nav */}
      {mobile && (
        <nav className="bottom-nav">
          {[
            { id:"home",  icon:"⚽", label:"Virtual" },
            { id:"clubs", icon:"🏟️", label:"Clubs" },
            { id:"ai",    icon:"🤖", label:"AI" },
            { id:"slip",  icon:"🎯", label: betSlip.length > 0 ? `Slip(${betSlip.length})` : "Slip" },
            { id:"vip",   icon:"👑", label:"VIP" },
          ].map(t => (
            <button key={t.id} className={`bot-btn ${(page===t.id&&t.id!=="slip")||(slipOpen&&t.id==="slip")?"bot-btn-active":""}`}
              onClick={() => { if(t.id==="slip"){setSlipOpen(v=>!v);}else{setPage(t.id);setSlipOpen(false);} }}>
              <span style={{ fontSize:20 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <Card glow style={{ padding:"32px 48px", textAlign:"center" }}>
            <div className="spinner" />
            <div style={{ fontSize:15, fontWeight:700, color:"var(--primary)", marginTop:16, marginBottom:6 }}>Processing Transaction</div>
            <div style={{ fontSize:13, color:"var(--muted)" }}>Please confirm in MetaMask...</div>
          </Card>
        </div>
      )}
    </div>
  );

  // ── BET SLIP ──
  function BetSlipContent() {
    return (
      <div className="slip-inner">
        <div className="slip-head">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="slip-dot" style={{ background: betSlip.length>0?"var(--success)":"var(--muted)", boxShadow: betSlip.length>0?"0 0 10px var(--success)":"none" }} />
            <span style={{ fontSize:13, fontWeight:800, color:"#fff", letterSpacing:1 }}>BET SLIP</span>
            {betSlip.length>0 && <span className="slip-count">{betSlip.length}</span>}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {betSlip.length>0 && (
              <button className="clear-btn" onClick={() => setBetSlip([])}>Clear</button>
            )}
            {mobile && (
              <button className="icon-btn" onClick={() => setSlipOpen(false)}>✕</button>
            )}
          </div>
        </div>

        <div className="slip-body">
          {betSlip.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)" }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🎯</div>
              <div style={{ fontSize:13 }}>Click any odds to add selections</div>
            </div>
          ) : (
            <>
              {betSlip.map((b,i) => (
                <div key={i} className="slip-item">
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:3 }}>{b.home} vs {b.away}</div>
                    <div style={{ fontSize:11, color:"var(--primary)" }}>{b.predText}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16, fontWeight:900, color:"var(--primary)" }}>{b.odds}</span>
                    <button onClick={() => setBetSlip(prev => prev.filter((_,idx)=>idx!==i))} style={{ background:"none", border:"none", color:"var(--danger)", cursor:"pointer", fontSize:16 }}>✕</button>
                  </div>
                </div>
              ))}

              <div style={{ margin:"14px 0" }}>
                <div style={{ fontSize:11, color:"var(--muted)", marginBottom:8, fontWeight:700, letterSpacing:1 }}>STAKE (USDC)</div>
                <input type="number" className="stake-input" placeholder="Enter amount..." value={stake} onChange={e=>setStake(e.target.value)} />
                {connected && (
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:6 }}>
                    Balance: <span style={{ color:"var(--primary)", fontWeight:700 }}>{balance} USDC</span>
                  </div>
                )}
              </div>

              <div className="slip-totals">
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:13, color:"var(--gray)" }}>Total Odds</span>
                  <span style={{ fontSize:14, fontWeight:800, color:"var(--primary)" }}>{totalOdds.toFixed(2)}x</span>
                </div>
                <div style={{ height:1, background:"var(--border)", margin:"10px 0" }} />
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, color:"var(--gray)" }}>Potential Win</span>
                  <span style={{ fontSize:18, fontWeight:900, color:"var(--success)" }}>{potWin} USDC</span>
                </div>
              </div>

              <Btn style={{ width:"100%", justifyContent:"center", marginTop:4 }} onClick={placeBets}>
                {connected ? "⚡ PLACE BET" : "🦊 CONNECT WALLET"}
              </Btn>
              <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"var(--muted)" }}>
                🔒 Secured by Arc Testnet
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}