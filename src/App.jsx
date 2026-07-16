import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const CONTRACT_ADDRESS = "0x6df1feCD5d4A8cA8701458bDc5139bC1038d6fd7";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = "0x4BE";
const ARC_NETWORK = {
  chainId: ARC_CHAIN_ID,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

const ABI = [
  "function placeBet(uint256,uint8,uint256) public",
  "function claimWinnings(uint256) public",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function matchCount() public view returns (uint256)",
];
const USDC_ABI = [
  "function approve(address,uint256) public returns (bool)",
  "function balanceOf(address) public view returns (uint256)",
];

const C = {
  bg1: "#050608", bg2: "#08111F", bg3: "#0D1728",
  primary: "#2EC7F2", secondary: "#47D7FF", glow: "#00CFFF", neon: "#6FEFFF",
  white: "#FFFFFF", gray: "#C8D2DC", muted: "#4A5568",
  success: "#10E981", warning: "#FFC857", danger: "#FF4D6D",
  border: "rgba(46,199,242,0.12)", borderHover: "rgba(46,199,242,0.35)",
  glass: "rgba(13,23,40,0.75)", glow10: "rgba(46,199,242,0.10)",
  glow20: "rgba(46,199,242,0.20)", glow30: "rgba(46,199,242,0.30)",
};

// ============================================================
// DATA
// ============================================================
const CLUBS = [
  // England
  { name: "Manchester City", league: "Premier League", country: "England", logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg", rating: 96, strength: 95 },
  { name: "Arsenal", league: "Premier League", country: "England", logo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg", rating: 91, strength: 89 },
  { name: "Liverpool", league: "Premier League", country: "England", logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg", rating: 92, strength: 90 },
  { name: "Chelsea", league: "Premier League", country: "England", logo: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg", rating: 87, strength: 85 },
  { name: "Man United", league: "Premier League", country: "England", logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg", rating: 85, strength: 83 },
  { name: "Tottenham", league: "Premier League", country: "England", logo: "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg", rating: 84, strength: 82 },
  // Spain
  { name: "Real Madrid", league: "La Liga", country: "Spain", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg", rating: 97, strength: 96 },
  { name: "Barcelona", league: "La Liga", country: "Spain", logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg", rating: 93, strength: 91 },
  { name: "Atletico Madrid", league: "La Liga", country: "Spain", logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg", rating: 88, strength: 87 },
  // Germany
  { name: "Bayern Munich", league: "Bundesliga", country: "Germany", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg", rating: 95, strength: 94 },
  { name: "Dortmund", league: "Bundesliga", country: "Germany", logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg", rating: 87, strength: 85 },
  // Italy
  { name: "Juventus", league: "Serie A", country: "Italy", logo: "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg", rating: 86, strength: 84 },
  { name: "Inter Milan", league: "Serie A", country: "Italy", logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg", rating: 89, strength: 88 },
  { name: "AC Milan", league: "Serie A", country: "Italy", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg", rating: 87, strength: 86 },
  { name: "Napoli", league: "Serie A", country: "Italy", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli_2007.svg", rating: 88, strength: 86 },
  // France
  { name: "PSG", league: "Ligue 1", country: "France", logo: "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg", rating: 92, strength: 90 },
  { name: "Lyon", league: "Ligue 1", country: "France", logo: "https://upload.wikimedia.org/wikipedia/en/c/c5/Olympique_Lyonnais.svg", rating: 82, strength: 80 },
  // Portugal
  { name: "Benfica", league: "Primeira Liga", country: "Portugal", logo: "https://upload.wikimedia.org/wikipedia/en/3/38/Sport_Lisboa_e_Benfica.svg", rating: 84, strength: 83 },
  { name: "Porto", league: "Primeira Liga", country: "Portugal", logo: "https://upload.wikimedia.org/wikipedia/en/3/3b/F.C._Porto.svg", rating: 83, strength: 81 },
  // Netherlands
  { name: "Ajax", league: "Eredivisie", country: "Netherlands", logo: "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg", rating: 83, strength: 81 },
  // Saudi Arabia
  { name: "Al Hilal", league: "Saudi Pro League", country: "Saudi Arabia", logo: "https://upload.wikimedia.org/wikipedia/en/a/a2/Al-Hilal-Logo.svg", rating: 86, strength: 84 },
  { name: "Al Nassr", league: "Saudi Pro League", country: "Saudi Arabia", logo: "https://upload.wikimedia.org/wikipedia/en/c/cd/Al-Nassr_FC_Logo.svg", rating: 85, strength: 83 },
  // Brazil
  { name: "Flamengo", league: "Brasileirao", country: "Brazil", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg", rating: 84, strength: 82 },
  { name: "Palmeiras", league: "Brasileirao", country: "Brazil", logo: "https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg", rating: 83, strength: 81 },
  // Argentina
  { name: "Boca Juniors", league: "Superliga", country: "Argentina", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f1/CA_Boca_Juniors_logo.svg", rating: 83, strength: 81 },
  { name: "River Plate", league: "Superliga", country: "Argentina", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a2/River_Plate_logo.svg", rating: 84, strength: 82 },
];

const VIRTUAL_MATCHES = [
  { id: "v1", home: "Man United", away: "Arsenal", league: "Virtual Premier League", homeOdds: 2.10, drawOdds: 3.40, awayOdds: 2.85, aiPick: "Home", confidence: 72 },
  { id: "v2", home: "Barcelona", away: "Real Madrid", league: "Virtual La Liga", homeOdds: 2.45, drawOdds: 3.20, awayOdds: 2.60, aiPick: "Away", confidence: 68 },
  { id: "v3", home: "Liverpool", away: "Man City", league: "Virtual Premier League", homeOdds: 2.80, drawOdds: 3.10, awayOdds: 2.30, aiPick: "Away", confidence: 74 },
  { id: "v4", home: "PSG", away: "Bayern Munich", league: "Virtual Champions League", homeOdds: 1.95, drawOdds: 3.50, awayOdds: 3.20, aiPick: "Home", confidence: 65 },
  { id: "v5", home: "Juventus", away: "Inter Milan", league: "Virtual Serie A", homeOdds: 2.60, drawOdds: 3.00, awayOdds: 2.55, aiPick: "Draw", confidence: 58 },
  { id: "v6", home: "Dortmund", away: "Bayern Munich", league: "Virtual Bundesliga", homeOdds: 3.20, drawOdds: 3.30, awayOdds: 2.05, aiPick: "Away", confidence: 77 },
];

const MARKETS = [
  { icon: "⚽", name: "Match Winner", desc: "Pick the winning team or draw", popular: true },
  { icon: "🎯", name: "Double Chance", desc: "Cover two outcomes at once", popular: true },
  { icon: "📊", name: "Over/Under", desc: "Total goals in the match", popular: true },
  { icon: "🥅", name: "Both Teams Score", desc: "Will both teams find the net?", popular: false },
  { icon: "🎱", name: "Correct Score", desc: "Predict the exact final score", popular: false },
  { icon: "⚖️", name: "Handicap", desc: "Levelled playing field betting", popular: false },
  { icon: "🛡️", name: "Draw No Bet", desc: "Refund if the match is drawn", popular: false },
  { icon: "👟", name: "First Goal Scorer", desc: "Who scores the opening goal?", popular: false },
];

const PROMOTIONS = [
  { icon: "🎁", title: "Welcome Bonus", desc: "Get 100% bonus on your first deposit up to 500 USDC", badge: "NEW", color: C.success },
  { icon: "👥", title: "Referral Rewards", desc: "Earn 50 USDC for every friend you refer to BlockBet", badge: "HOT", color: C.primary },
  { icon: "👑", title: "VIP Bonus", desc: "Exclusive weekly cashback for VIP members up to 20%", badge: "VIP", color: C.warning },
  { icon: "🚀", title: "Acca Boost", desc: "Get up to 50% boost on accumulator bets", badge: "BOOST", color: C.secondary },
  { icon: "🏆", title: "Weekly Tournament", desc: "Compete for a 10,000 USDC prize pool every week", badge: "LIVE", color: C.danger },
  { icon: "🍀", title: "Lucky Draw", desc: "Daily lucky draw with guaranteed USDC prizes", badge: "DAILY", color: "#a78bfa" },
];

const VIP_LEVELS = [
  { level: "Bronze", icon: "🥉", cashback: "5%", limit: "1,000 USDC", color: "#CD7F32" },
  { level: "Silver", icon: "🥈", cashback: "8%", limit: "5,000 USDC", color: "#C0C0C0" },
  { level: "Gold", icon: "🥇", cashback: "12%", limit: "25,000 USDC", color: "#FFD700" },
  { level: "Platinum", icon: "💎", cashback: "16%", limit: "100,000 USDC", color: C.primary },
  { level: "Diamond", icon: "👑", cashback: "20%", limit: "Unlimited", color: C.neon },
];

const LEADERBOARD = [
  { rank: 1, wallet: "0x7f3a...4c2e", profit: "+12,450", bets: 234, badge: "👑" },
  { rank: 2, wallet: "0x9b1c...7d8f", profit: "+9,820", bets: 187, badge: "🥈" },
  { rank: 3, wallet: "0x2e4d...1a9b", profit: "+7,650", bets: 156, badge: "🥉" },
  { rank: 4, wallet: "0x5c8f...3e2a", profit: "+5,230", bets: 142, badge: "" },
  { rank: 5, wallet: "0x1d6b...9c4f", profit: "+4,870", bets: 128, badge: "" },
];

const FAQS = [
  { q: "What is BlockBet?", a: "BlockBet is a decentralized virtual football betting platform built on Arc Testnet. All bets are placed using USDC and settled by smart contracts on-chain." },
  { q: "How do I start betting?", a: "Connect your MetaMask wallet, ensure you're on Arc Testnet, get test USDC from the faucet, then choose a virtual match and place your bet." },
  { q: "How are virtual matches decided?", a: "Virtual matches are simulated using our AI engine and results are generated on-chain using verifiable randomness for complete transparency." },
  { q: "When do I receive my winnings?", a: "Winnings are available to claim instantly after a match resolves. Simply click 'Claim Winnings' on your winning bet." },
  { q: "Is BlockBet provably fair?", a: "Yes! All match results are generated using smart contracts on the Arc blockchain, making them completely transparent and verifiable." },
  { q: "What is the minimum bet?", a: "The minimum bet is 1 USDC. There is no maximum bet, though higher limits are available for VIP members." },
];

// ============================================================
// HOOKS
// ============================================================
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

function useCounter(end, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
}

// ============================================================
// SUB COMPONENTS
// ============================================================
function GlassCard({ children, style = {}, glow = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.glass, border: `1px solid ${glow ? C.borderHover : C.border}`,
      borderRadius: 20, backdropFilter: "blur(20px)",
      boxShadow: glow ? `0 0 40px ${C.glow20}, inset 0 1px 0 rgba(255,255,255,0.05)` : `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`,
      transition: "all 0.3s ease", cursor: onClick ? "pointer" : "default", ...style,
    }}>
      {children}
    </div>
  );
}

function CyanButton({ children, onClick, style = {}, outline = false, small = false }) {
  return (
    <button onClick={onClick} style={{
      background: outline ? "transparent" : `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
      color: outline ? C.primary : C.bg1,
      border: outline ? `1px solid ${C.border}` : "none",
      padding: small ? "8px 16px" : "13px 26px",
      borderRadius: 12, fontWeight: "700", cursor: "pointer",
      fontSize: small ? 12 : 14, letterSpacing: 0.4,
      boxShadow: outline ? `0 0 15px ${C.glow10}` : `0 0 35px ${C.glow30}, 0 4px 15px ${C.glow20}`,
      backdropFilter: outline ? "blur(10px)" : "none",
      transition: "all 0.2s ease", ...style,
    }}>
      {children}
    </button>
  );
}

function Badge({ children, color = C.primary }) {
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 9, fontWeight: "800", padding: "3px 8px",
      borderRadius: 6, letterSpacing: 1,
    }}>
      {children}
    </span>
  );
}

function StatCard({ icon, value, label, color = C.primary }) {
  return (
    <GlassCard style={{ padding: "20px 16px", textAlign: "center", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: "900", color, textShadow: `0 0 20px ${color}50`, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, fontWeight: "600" }}>{label}</div>
    </GlassCard>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const isMobile = useIsMobile();
  const [signer, setSigner] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [betSlip, setBetSlip] = useState([]);
  const [showSlip, setShowSlip] = useState(false);
  const [activeLeague, setActiveLeague] = useState("All");
  const [betAmount, setBetAmount] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [activeSection, setActiveSection] = useState("virtual");
  const [clubSearch, setClubSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [networkError, setNetworkError] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [notification, setNotification] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [betType, setBetType] = useState("single");

  const betsCount = useCounter(48291);
  const playersOnline = useCounter(3847);
  const usdcLocked = useCounter(284750);

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 30000);
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountChange);
      window.ethereum.on("chainChanged", handleChainChange);
      window.ethereum.on("disconnect", handleDisconnect);
      const saved = localStorage.getItem("blockbet_connected");
      if (saved === "true") reconnectWallet();
    }
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountChange);
        window.ethereum.removeListener("chainChanged", handleChainChange);
      }
    };
  }, []);

  function showNotif(msg, type = "success") {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function reconnectWallet() {
    try {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const s = await provider.getSigner();
        setSigner(s);
        setConnected(true);
        setWalletAddress(accounts[0].slice(0, 6) + "..." + accounts[0].slice(-4));
        await checkNetwork(provider);
        await loadUsdcBalance(accounts[0], provider);
        loadMatches(provider);
      }
    } catch {}
  }

  async function handleAccountChange(accounts) {
    if (accounts.length === 0) { disconnectWallet(); }
    else {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const s = await provider.getSigner();
      setSigner(s);
      setWalletAddress(accounts[0].slice(0, 6) + "..." + accounts[0].slice(-4));
      await loadUsdcBalance(accounts[0], provider);
    }
  }

  function handleChainChange() { window.location.reload(); }
  function handleDisconnect() { disconnectWallet(); }

  async function checkNetwork(provider) {
    const network = await provider.getNetwork();
    const chainId = "0x" + network.chainId.toString(16);
    if (chainId !== ARC_CHAIN_ID) {
      setNetworkError(true);
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_ID }] });
        setNetworkError(false);
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC_NETWORK] });
          setNetworkError(false);
        }
      }
    } else { setNetworkError(false); }
  }

  async function loadUsdcBalance(address, provider) {
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      const bal = await usdc.balanceOf(address);
      setUsdcBalance(Number(ethers.formatUnits(bal, 6)).toFixed(2));
    } catch { setUsdcBalance("0.00"); }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      showNotif("MetaMask not detected! Please install MetaMask.", "error");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const s = await provider.getSigner();
      const address = await s.getAddress();
      setSigner(s);
      setConnected(true);
      setWalletAddress(address.slice(0, 6) + "..." + address.slice(-4));
      localStorage.setItem("blockbet_connected", "true");
      await checkNetwork(provider);
      await loadUsdcBalance(address, provider);
      loadMatches(provider);
      showNotif("Wallet connected successfully! 🎉");
    } catch (e) {
      if (e.code === 4001) showNotif("Connection rejected by user.", "error");
      else showNotif("Failed to connect wallet.", "error");
    }
  }

  function disconnectWallet() {
    setSigner(null); setConnected(false);
    setWalletAddress(""); setBetSlip([]);
    setUsdcBalance("0.00"); setNetworkError(false);
    localStorage.removeItem("blockbet_connected");
    showNotif("Wallet disconnected.");
  }

  async function loadMatches(prov) {
    try {
      const provider = prov || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const count = await contract.matchCount();
      const loaded = [];
      for (let i = Math.max(1, Number(count) - 14); i <= Number(count); i++) {
        const m = await contract.getMatch(i);
        const vMatch = VIRTUAL_MATCHES.find(v => v.home === m[0] && v.away === m[1]);
        loaded.push({
          id: i, homeTeam: m[0], awayTeam: m[1],
          league: vMatch ? vMatch.league : "Virtual League",
          totalHome: Number(ethers.formatUnits(m[2], 6)),
          totalDraw: Number(ethers.formatUnits(m[3], 6)),
          totalAway: Number(ethers.formatUnits(m[4], 6)),
          resolved: m[5], result: Number(m[6]),
          aiPick: vMatch?.aiPick || "Home",
          confidence: vMatch?.confidence || 65,
        });
      }
      setMatches(loaded.reverse());
    } catch { setMatches([]); }
  }

  function getOdds(side, pool) {
    if (!side || !pool) return (Math.random() * 2 + 1.4).toFixed(2);
    return Math.max(1.01, pool / side).toFixed(2);
  }

  function addToBetSlip(match, prediction, odds) {
    const label = prediction === 1 ? "1" : prediction === 2 ? "X" : "2";
    const predLabel = prediction === 1 ? "Home Win" : prediction === 2 ? "Draw" : "Away Win";
    const exists = betSlip.find(b => b.matchId === match.id);
    if (exists) {
      if (exists.prediction === prediction) setBetSlip(betSlip.filter(b => b.matchId !== match.id));
      else setBetSlip(betSlip.map(b => b.matchId === match.id ? { ...b, prediction, label, odds, predLabel } : b));
    } else {
      setBetSlip([...betSlip, { matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, prediction, label, odds, predLabel }]);
    }
    if (!showSlip) setShowSlip(true);
  }

  async function placeBet(matchId, prediction) {
    if (!connected) return connectWallet();
    if (networkError) return showNotif("Please switch to Arc Testnet first!", "error");
    if (!betAmount || betAmount <= 0) return showNotif("Enter a valid bet amount!", "error");
    if (parseFloat(betAmount) > parseFloat(usdcBalance)) return showNotif("Insufficient USDC balance!", "error");
    const amountInUnits = ethers.parseUnits(betAmount.toString(), 6);
    setLoading(true);
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      const approveTx = await usdc.approve(CONTRACT_ADDRESS, amountInUnits);
      await approveTx.wait();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.placeBet(matchId, prediction, amountInUnits);
      await tx.wait();
      showNotif("✅ Bet placed successfully!");
      loadMatches(); setBetSlip([]); setBetAmount("");
      const address = await signer.getAddress();
      await loadUsdcBalance(address, new ethers.BrowserProvider(window.ethereum));
    } catch (e) {
      showNotif(e.code === 4001 ? "Transaction rejected." : "Transaction failed. Try again.", "error");
    }
    setLoading(false);
  }

  async function claimWinnings(matchId) {
    if (!connected) return connectWallet();
    setLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.claimWinnings(matchId);
      await tx.wait();
      showNotif("💰 Winnings claimed successfully!");
      loadMatches();
      const address = await signer.getAddress();
      await loadUsdcBalance(address, new ethers.BrowserProvider(window.ethereum));
    } catch (e) { showNotif("Claim failed. You may not have a winning bet.", "error"); }
    setLoading(false);
  }

  const totalOdds = betSlip.reduce((acc, b) => acc * parseFloat(b.odds || 1), 1);
  const potentialWin = betAmount ? (betAmount * totalOdds).toFixed(2) : "0.00";
  const LEAGUES = ["All", ...new Set(matches.map(m => m.league))];
  const filtered = activeLeague === "All" ? matches : matches.filter(m => m.league === activeLeague);
  const grouped = {};
  filtered.forEach(m => { if (!grouped[m.league]) grouped[m.league] = []; grouped[m.league].push(m); });
  const resultLabel = (r) => r === 1 ? "Home Win" : r === 2 ? "Draw" : r === 3 ? "Away Win" : "Pending";

  const countries = ["All", ...new Set(CLUBS.map(c => c.country))];
  const filteredClubs = CLUBS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(clubSearch.toLowerCase());
    const matchFilter = clubFilter === "All" || c.country === clubFilter;
    return matchSearch && matchFilter;
  });

  const TeamBadge = ({ team, size = 22 }) => {
    const club = CLUBS.find(c => c.name === team);
    if (club?.logo) return (
      <img src={club.logo} alt={team} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
    );
    return <div style={{ width: size, height: size, background: C.bg3, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>⚽</div>;
  };

  // ============================================================
  // SECTIONS
  // ============================================================

  const HeroSection = () => (
    <div style={{ background: `linear-gradient(135deg, ${C.bg1} 0%, ${C.bg2} 60%, ${C.bg3} 100%)`, padding: isMobile ? "60px 16px 70px" : "100px 40px 110px", position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.border}` }}>
      {/* GLOW ORBS */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, rgba(46,199,242,0.10) 0%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -200, left: -100, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,207,255,0.07) 0%, transparent 70%)`, filter: "blur(80px)", pointerEvents: "none" }} />

      {/* FLOATING PARTICLES */}
      {!isMobile && Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ position: "absolute", width: i % 3 === 0 ? 4 : 2, height: i % 3 === 0 ? 4 : 2, borderRadius: "50%", background: C.primary, opacity: 0.4, top: `${8 + i * 8}%`, left: `${4 + i * 8}%`, boxShadow: `0 0 8px ${C.primary}`, animation: `float ${3 + (i % 3)}s ease-in-out infinite ${i * 0.3}s` }} />
      ))}

      {/* GRID LINES */}
      {!isMobile && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: "80px 80px", opacity: 0.3, pointerEvents: "none" }} />
      )}

      <div style={{ position: "relative", zIndex: 2, maxWidth: isMobile ? "100%" : 640 }}>
        {/* BADGES ROW */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { icon: "🔴", text: "LIVE ON ARC TESTNET", color: C.success },
            { icon: "🛡️", text: "PROVABLY FAIR", color: C.primary },
            { icon: "🤖", text: "AI POWERED", color: C.warning },
            { icon: "⚡", text: "INSTANT PAYOUTS", color: C.secondary },
          ].map(b => (
            <div key={b.text} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${b.color}10`, border: `1px solid ${b.color}30`, color: b.color, fontSize: 10, fontWeight: "700", padding: "5px 12px", borderRadius: 20, letterSpacing: 0.5 }}>
              {b.icon} {b.text}
            </div>
          ))}
        </div>

        {/* HEADLINE */}
        <h1 style={{ fontSize: isMobile ? 32 : 62, fontWeight: "900", color: C.white, lineHeight: 1.05, marginBottom: 20, letterSpacing: -2, margin: "0 0 20px 0" }}>
          The Future of{" "}
          <span style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary}, ${C.neon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 30px rgba(46,199,242,0.4))` }}>
            On-Chain
          </span>
          <br />Sports Betting
        </h1>

        {/* SUBTITLE */}
        <p style={{ fontSize: isMobile ? 15 : 18, color: C.gray, lineHeight: 1.75, marginBottom: 36, maxWidth: 520, margin: "0 0 36px 0" }}>
          Bet with USDC. Instant payouts. Provably fair.{" "}
          <span style={{ color: C.primary, fontWeight: "600" }}>AI-powered predictions.</span>{" "}
          Fully decentralized on Arc blockchain.
        </p>

        {/* CTA */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 52 }}>
          {!connected ? (
            <CyanButton onClick={connectWallet}>🦊 Connect Wallet</CyanButton>
          ) : (
            <CyanButton onClick={() => setActiveSection("virtual")}>⚡ Start Betting</CyanButton>
          )}
          <CyanButton outline onClick={() => setActiveSection("virtual")}>🎮 View Matches</CyanButton>
        </div>

        {/* STATS */}
        <div style={{ display: "flex", gap: isMobile ? 24 : 48, flexWrap: "wrap" }}>
          {[
            { value: `${betsCount.toLocaleString()}+`, label: "TOTAL BETS", icon: "🎯" },
            { value: `${playersOnline.toLocaleString()}`, label: "ONLINE NOW", icon: "👥" },
            { value: `$${(usdcLocked / 1000).toFixed(0)}K+`, label: "USDC LOCKED", icon: "💎" },
            { value: "100%", label: "ON-CHAIN", icon: "🔒" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: "900", color: C.primary, textShadow: `0 0 20px rgba(46,199,242,0.4)` }}>
                {s.icon} {s.value}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: 2, fontWeight: "700" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING CARDS */}
      {!isMobile && VIRTUAL_MATCHES.slice(0, 2).map((match, i) => (
        <GlassCard key={i} glow style={{ position: "absolute", right: i === 0 ? 60 : 80, top: i === 0 ? "15%" : "55%", width: 280, padding: 18, animation: `float ${3 + i}s ease-in-out infinite` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Badge color={C.success}>🎮 VIRTUAL</Badge>
            <span style={{ fontSize: 11, color: C.warning, fontWeight: "700" }}>AI: {match.aiPick} {match.confidence}%</span>
          </div>
          <div style={{ fontSize: 14, color: C.white, fontWeight: "700", marginBottom: 12 }}>
            {match.home} vs {match.away}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ l: "1", o: match.homeOdds }, { l: "X", o: match.drawOdds }, { l: "2", o: match.awayOdds }].map(opt => (
              <div key={opt.l} style={{ flex: 1, background: `${C.primary}10`, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 3, fontWeight: "600" }}>{opt.l}</div>
                <div style={{ fontSize: 14, fontWeight: "800", color: C.primary }}>{opt.o}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );

  const VirtualSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      {/* SECTION HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: "800", color: C.white, margin: 0, letterSpacing: -0.5 }}>
            ⚡ Virtual Football Arena
          </h2>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0 0" }}>AI-powered virtual matches • Instant settlement</p>
        </div>
        <CyanButton small onClick={loadMatches}>🔄 Refresh</CyanButton>
      </div>

      {/* NETWORK ERROR */}
      {networkError && connected && (
        <div style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.danger }}>
          ⚠️ Wrong network detected. Please switch to Arc Testnet.
          <CyanButton small onClick={() => checkNetwork(new ethers.BrowserProvider(window.ethereum))}>Switch Network</CyanButton>
        </div>
      )}

      {/* LEAGUE FILTER */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingBottom: 4 }}>
        {LEAGUES.map(l => (
          <button key={l} onClick={() => setActiveLeague(l)} style={{
            background: activeLeague === l ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : C.glass,
            color: activeLeague === l ? C.bg1 : C.gray,
            border: `1px solid ${activeLeague === l ? "transparent" : C.border}`,
            padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: 12,
            fontWeight: activeLeague === l ? "700" : "500", whiteSpace: "nowrap",
            backdropFilter: "blur(10px)", flexShrink: 0,
            boxShadow: activeLeague === l ? `0 0 20px ${C.glow20}` : "none",
          }}>
            {l === "All" ? "⚡ All" : `🎮 ${l}`}
          </button>
        ))}
      </div>

      {/* MATCHES */}
      {matches.length === 0 ? (
        <GlassCard style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: "700", color: C.gray, marginBottom: 8 }}>No Virtual Matches Yet</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Connect your wallet to load matches from the blockchain</div>
          <CyanButton onClick={connectWallet}>🦊 Connect Wallet</CyanButton>
        </GlassCard>
      ) : (
        Object.entries(grouped).map(([league, leagueMatches]) => (
          <div key={league} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: C.primary, fontWeight: "800", letterSpacing: 2, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, display: "inline-block", boxShadow: `0 0 8px ${C.primary}` }} />
              🎮 {league.toUpperCase()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leagueMatches.map((match, idx) => {
                const pool = match.totalHome + match.totalDraw + match.totalAway;
                const o1 = getOdds(match.totalHome, pool);
                const ox = getOdds(match.totalDraw, pool);
                const o2 = getOdds(match.totalAway, pool);
                const sel = betSlip.find(b => b.matchId === match.id);

                return (
                  <GlassCard key={match.id} style={{ padding: isMobile ? "14px" : "16px 20px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>

                      {/* TEAMS */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                          <Badge color={C.primary}>VIRTUAL</Badge>
                          <Badge color={C.warning}>🤖 AI: {match.aiPick} {match.confidence}%</Badge>
                          {match.resolved && <Badge color={C.success}>✅ RESOLVED</Badge>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <TeamBadge team={match.homeTeam} size={isMobile ? 18 : 22} />
                          <span style={{ fontSize: isMobile ? 13 : 14, color: C.white, fontWeight: "700" }}>{match.homeTeam}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <TeamBadge team={match.awayTeam} size={isMobile ? 18 : 22} />
                          <span style={{ fontSize: isMobile ? 13 : 14, color: C.white, fontWeight: "700" }}>{match.awayTeam}</span>
                        </div>
                        {match.resolved && (
                          <div style={{ marginTop: 8, fontSize: 12, color: C.success, fontWeight: "700" }}>
                            ✅ Result: {resultLabel(match.result)}
                          </div>
                        )}
                      </div>

                      {/* ODDS */}
                      {!match.resolved && (
                        <div style={{ display: "flex", gap: isMobile ? 5 : 8, flexShrink: 0 }}>
                          {[{ code: 1, odds: o1, label: "1" }, { code: 2, odds: ox, label: "X" }, { code: 3, odds: o2, label: "2" }].map(opt => (
                            <button key={opt.code} onClick={() => addToBetSlip(match, opt.code, opt.odds)} style={{
                              width: isMobile ? 56 : 72, padding: isMobile ? "9px 4px" : "11px 6px",
                              background: sel?.prediction === opt.code ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : `${C.primary}08`,
                              color: sel?.prediction === opt.code ? C.bg1 : C.white,
                              border: `1px solid ${sel?.prediction === opt.code ? "transparent" : C.border}`,
                              borderRadius: 12, cursor: "pointer", textAlign: "center",
                              boxShadow: sel?.prediction === opt.code ? `0 0 25px ${C.glow30}` : "none",
                              transition: "all 0.2s",
                            }}>
                              <div style={{ fontSize: 9, color: sel?.prediction === opt.code ? C.bg1 : C.muted, marginBottom: 3, fontWeight: "700" }}>{opt.label}</div>
                              <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: "900" }}>{opt.odds}</div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* CLAIM */}
                      {match.resolved && (
                        <CyanButton small onClick={() => claimWinnings(match.id)}>💰 Claim</CyanButton>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const ClubExplorer = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: "800", color: C.white, margin: "0 0 8px 0" }}>🏆 Club Explorer</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Explore all clubs and their AI ratings</p>
      </div>

      {/* SEARCH & FILTER */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input value={clubSearch} onChange={e => setClubSearch(e.target.value)} placeholder="🔍 Search clubs..." style={{ flex: 1, minWidth: 200, padding: "10px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.glass, color: C.white, fontSize: 13, backdropFilter: "blur(10px)", outline: "none" }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {countries.map(c => (
            <button key={c} onClick={() => setClubFilter(c)} style={{
              background: clubFilter === c ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : C.glass,
              color: clubFilter === c ? C.bg1 : C.gray, border: `1px solid ${clubFilter === c ? "transparent" : C.border}`,
              padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: clubFilter === c ? "700" : "400",
              backdropFilter: "blur(10px)", whiteSpace: "nowrap",
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* CLUBS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {filteredClubs.map(club => (
          <GlassCard key={club.name} style={{ padding: 16, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => setFavorites(prev => prev.includes(club.name) ? prev.filter(f => f !== club.name) : [...prev, club.name])}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <span style={{ fontSize: 16, cursor: "pointer" }}>{favorites.includes(club.name) ? "❤️" : "🤍"}</span>
            </div>
            <img src={club.logo} alt={club.name} style={{ width: 52, height: 52, objectFit: "contain", marginBottom: 10 }} onError={e => e.target.style.display = "none"} />
            <div style={{ fontSize: 13, fontWeight: "700", color: C.white, marginBottom: 4 }}>{club.name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{club.league}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
              <div style={{ flex: 1, background: `${C.primary}10`, borderRadius: 8, padding: "6px 4px" }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>AI RATING</div>
                <div style={{ fontSize: 14, fontWeight: "800", color: C.primary }}>{club.rating}</div>
              </div>
              <div style={{ flex: 1, background: `${C.success}10`, borderRadius: 8, padding: "6px 4px" }}>
                <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>STRENGTH</div>
                <div style={{ fontSize: 14, fontWeight: "800", color: C.success }}>{club.strength}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const AISection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: "800", color: C.white, margin: "0 0 8px 0" }}>🤖 AI Prediction Center</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Machine learning powered match predictions</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
        {VIRTUAL_MATCHES.map(match => (
          <GlassCard key={match.id} glow style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: "700", color: C.white }}>{match.home} vs {match.away}</div>
              <Badge color={C.warning}>🤖 AI</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ background: `${C.primary}10`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: "600", letterSpacing: 1 }}>AI PREDICTION</div>
                <div style={{ fontSize: 18, fontWeight: "800", color: C.primary }}>{match.aiPick} Win</div>
              </div>
              <div style={{ background: `${C.success}10`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: "600", letterSpacing: 1 }}>CONFIDENCE</div>
                <div style={{ fontSize: 18, fontWeight: "800", color: C.success }}>{match.confidence}%</div>
              </div>
            </div>

            {/* CONFIDENCE BAR */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6 }}>
                <span>Win Probability</span>
                <span style={{ color: C.primary }}>{match.confidence}%</span>
              </div>
              <div style={{ background: C.bg3, borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${match.confidence}%`, height: "100%", background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, borderRadius: 4, boxShadow: `0 0 10px ${C.primary}` }} />
              </div>
            </div>

            {/* ODDS */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[{ l: "Home", o: match.homeOdds }, { l: "Draw", o: match.drawOdds }, { l: "Away", o: match.awayOdds }].map(opt => (
                <div key={opt.l} style={{ flex: 1, background: `${C.primary}08`, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{opt.l}</div>
                  <div style={{ fontSize: 16, fontWeight: "800", color: C.primary }}>{opt.o}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: C.muted, padding: "10px 12px", background: `${C.primary}06`, borderRadius: 8, border: `1px solid ${C.border}` }}>
              💡 <span style={{ color: C.gray }}>AI recommends betting on <strong style={{ color: C.primary }}>{match.aiPick} Win</strong> with medium confidence based on historical performance.</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const MarketsSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: "800", color: C.white, margin: "0 0 8px 0" }}>📊 Betting Markets</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Choose from a wide range of betting markets</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 14 }}>
        {MARKETS.map(m => (
          <GlassCard key={m.name} style={{ padding: 18, cursor: "pointer" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{m.icon}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: "700", color: C.white }}>{m.name}</div>
              {m.popular && <Badge color={C.warning}>HOT</Badge>}
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{m.desc}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const PromotionsSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px", background: `linear-gradient(180deg, transparent, ${C.bg2}30, transparent)` }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: "800", color: C.white, margin: "0 0 8px 0" }}>🎁 Promotions</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Exclusive bonuses for BlockBet players</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
        {PROMOTIONS.map(p => (
          <GlassCard key={p.title} style={{ padding: 22, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: `${p.color}08`, filter: "blur(20px)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
              <span style={{ fontSize: 32 }}>{p.icon}</span>
              <Badge color={p.color}>{p.badge}</Badge>
            </div>
            <div style={{ fontSize: 16, fontWeight: "800", color: C.white, marginBottom: 8 }}>{p.title}</div>
            <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.6, marginBottom: 16 }}>{p.desc}</div>
            <CyanButton small style={{ width: "100%" }}>Claim Now →</CyanButton>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const VIPSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: "900", color: C.white, margin: "0 0 8px 0" }}>👑 VIP Club</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Exclusive rewards for our most loyal players</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, 1fr)", gap: 12 }}>
        {VIP_LEVELS.map((v, i) => (
          <GlassCard key={v.level} glow={i === 4} style={{ padding: 20, textAlign: "center", border: i === 4 ? `1px solid ${C.borderHover}` : undefined }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{v.icon}</div>
            <div style={{ fontSize: 15, fontWeight: "800", color: v.color, marginBottom: 12, textShadow: `0 0 15px ${v.color}50` }}>{v.level}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Cashback</div>
            <div style={{ fontSize: 20, fontWeight: "900", color: C.success, marginBottom: 8 }}>{v.cashback}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Monthly Limit</div>
            <div style={{ fontSize: 12, fontWeight: "700", color: C.gray }}>{v.limit}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const LeaderboardSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: "800", color: C.white, margin: "0 0 8px 0" }}>🏆 Leaderboard</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Top performers this week</p>
      </div>
      <GlassCard style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 80px", padding: "12px 20px", background: `${C.primary}08`, fontSize: 10, color: C.muted, fontWeight: "700", letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>
          <span>#</span><span>PLAYER</span><span style={{ textAlign: "right" }}>PROFIT</span><span style={{ textAlign: "right" }}>BETS</span>
        </div>
        {LEADERBOARD.map((p, i) => (
          <div key={p.rank} style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 80px", padding: "16px 20px", borderBottom: i < LEADERBOARD.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.primary}05`}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span style={{ fontSize: 14, fontWeight: "800", color: p.rank <= 3 ? C.warning : C.muted }}>{p.badge || p.rank}</span>
            <span style={{ fontSize: 13, color: C.white, fontFamily: "monospace" }}>{p.wallet}</span>
            <span style={{ fontSize: 14, fontWeight: "800", color: C.success, textAlign: "right" }}>{p.profit} USDC</span>
            <span style={{ fontSize: 13, color: C.muted, textAlign: "right" }}>{p.bets}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );

  const HowItWorksSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px", background: `linear-gradient(180deg, transparent, ${C.bg2}40, transparent)` }}>
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: "900", color: C.white, margin: "0 0 8px 0" }}>How It Works</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Get started in four simple steps</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 20 }}>
        {[
          { step: "01", icon: "🦊", title: "Connect Wallet", desc: "Connect your MetaMask wallet to BlockBet" },
          { step: "02", icon: "💰", title: "Get USDC", desc: "Get test USDC from Arc faucet.circle.com" },
          { step: "03", icon: "⚽", title: "Choose Match", desc: "Pick a virtual match and your prediction" },
          { step: "04", icon: "🏆", title: "Win Instantly", desc: "Claim your winnings after the match resolves" },
        ].map((s, i) => (
          <GlassCard key={s.step} style={{ padding: 22, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.primary, fontWeight: "800", letterSpacing: 2, marginBottom: 12 }}>STEP {s.step}</div>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 15, fontWeight: "800", color: C.white, marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
            {i < 3 && !isMobile && (
              <div style={{ position: "absolute", right: -12, top: "50%", fontSize: 20, color: C.primary, zIndex: 1 }}>→</div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const FAQSection = () => (
    <div style={{ padding: isMobile ? "24px 16px" : "32px 40px" }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h2 style={{ fontSize: isMobile ? 24 : 36, fontWeight: "900", color: C.white, margin: "0 0 8px 0" }}>FAQ</h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>Everything you need to know</p>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {FAQS.map((faq, i) => (
          <GlassCard key={i} style={{ overflow: "hidden", cursor: "pointer" }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: "600", color: openFaq === i ? C.primary : C.white }}>{faq.q}</span>
              <span style={{ fontSize: 18, color: C.primary, transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none" }}>+</span>
            </div>
            {openFaq === i && (
              <div style={{ padding: "0 20px 16px", fontSize: 13, color: C.gray, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                {faq.a}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const BetSlipPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* HEADER */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: betSlip.length > 0 ? C.success : C.muted, boxShadow: betSlip.length > 0 ? `0 0 10px ${C.success}` : "none" }} />
          <span style={{ fontSize: 13, fontWeight: "800", color: C.white, letterSpacing: 1 }}>BET SLIP</span>
          {betSlip.length > 0 && (
            <span style={{ background: C.primary, color: C.bg1, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "800" }}>
              {betSlip.length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {betSlip.length > 0 && (
            <button onClick={() => setBetSlip([])} style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: C.danger, padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: "600" }}>
              Clear
            </button>
          )}
          {isMobile && (
            <button onClick={() => setShowSlip(false)} style={{ background: C.glass, border: `1px solid ${C.border}`, color: C.gray, width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          )}
        </div>
      </div>

      {/* BET TYPE */}
      <div style={{ display: "flex", padding: "10px 16px", gap: 6, borderBottom: `1px solid ${C.border}` }}>
        {["single", "multiple"].map(t => (
          <button key={t} onClick={() => setBetType(t)} style={{ flex: 1, padding: "7px", background: betType === t ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : C.glass, color: betType === t ? C.bg1 : C.gray, border: `1px solid ${betType === t ? "transparent" : C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {betSlip.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 13 }}>Click any odds to add to your slip</div>
          </div>
        ) : (
          <>
            {betSlip.map((bet, i) => (
              <div key={i} style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "700", color: C.white, marginBottom: 3 }}>{bet.homeTeam} vs {bet.awayTeam}</div>
                    <div style={{ fontSize: 11, color: C.primary }}>{bet.predLabel}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: "900", color: C.primary, textShadow: `0 0 10px ${C.primary}50` }}>{bet.odds}</span>
                    <button onClick={() => setBetSlip(betSlip.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: "700", letterSpacing: 1 }}>STAKE (USDC)</div>
              <input type="number" placeholder="Enter amount..." value={betAmount} onChange={e => setBetAmount(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.glass, color: C.white, fontSize: 14, boxSizing: "border-box", outline: "none", backdropFilter: "blur(10px)" }} />
              {connected && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Balance: <span style={{ color: C.primary, fontWeight: "700" }}>{usdcBalance} USDC</span></div>
              )}
            </div>

            <div style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, backdropFilter: "blur(10px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.gray }}>Total Odds</span>
                <span style={{ fontSize: 14, fontWeight: "800", color: C.primary }}>{totalOdds.toFixed(2)}x</span>
              </div>
              <div style={{ height: 1, background: C.border, margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.gray }}>Potential Win</span>
                <span style={{ fontSize: 18, fontWeight: "900", color: C.success, textShadow: `0 0 15px ${C.success}50` }}>{potentialWin} USDC</span>
              </div>
            </div>

            <CyanButton style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                if (!connected) return connectWallet();
                betSlip.forEach(bet => placeBet(bet.matchId, bet.prediction));
              }}>
              {connected ? "⚡ PLACE BET" : "🦊 CONNECT WALLET"}
            </CyanButton>

            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.muted }}>
              🔒 Secured by Arc Testnet Smart Contract
            </div>
          </>
        )}
      </div>
    </div>
  );

  const NAV_SECTIONS = [
    { id: "virtual", label: "Virtual Football", icon: "⚽" },
    { id: "markets", label: "Betting Markets", icon: "📊" },
    { id: "clubs", label: "Club Explorer", icon: "🏟️" },
    { id: "ai", label: "AI Predictions", icon: "🤖" },
    { id: "promotions", label: "Promotions", icon: "🎁" },
    { id: "vip", label: "VIP Club", icon: "👑" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
  ];

  return (
    <div style={{ background: C.bg1, minHeight: "100vh", color: C.white, fontFamily: "'Inter', 'SF Pro Display', Arial, sans-serif" }}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.2; transform: scale(1.05); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(46,199,242,0.3); } 50% { box-shadow: 0 0 50px rgba(46,199,242,0.6); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg2}; }
        ::-webkit-scrollbar-thumb { background: ${C.primary}; border-radius: 2px; }
        input::placeholder { color: ${C.muted}; }
        input:focus { border-color: rgba(46,199,242,0.4) !important; box-shadow: 0 0 20px rgba(46,199,242,0.1) !important; }
        button { font-family: inherit; }
      `}</style>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: notification.type === "error" ? "rgba(255,77,109,0.15)" : C.glass, border: `1px solid ${notification.type === "error" ? "rgba(255,77,109,0.4)" : C.border}`, borderRadius: 12, padding: "14px 20px", maxWidth: 320, backdropFilter: "blur(20px)", boxShadow: `0 0 30px ${notification.type === "error" ? "rgba(255,77,109,0.2)" : C.glow10}`, fontSize: 13, color: notification.type === "error" ? C.danger : C.white, fontWeight: "600" }}>
          {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: scrolled ? "rgba(8,17,31,0.97)" : "rgba(8,17,31,0.85)", borderBottom: `1px solid ${scrolled ? C.border : "transparent"}`, padding: isMobile ? "12px 16px" : "0 40px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(24px)", transition: "all 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? "auto" : 64, gap: 16 }}>

          {/* LOGO */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {isMobile && (
              <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: "none", color: C.white, fontSize: 20, cursor: "pointer" }}>☰</button>
            )}
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${C.glow20}` }}>
              <img src="/logo.png" alt="logo" style={{ width: 26, height: 26, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: "900", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary}, ${C.neon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>BLOCKBET</div>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: 3, fontWeight: "600" }}>WEB3 SPORTSBOOK</div>
            </div>
          </div>

          {/* NAV */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
              {NAV_SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ background: "none", border: "none", padding: "22px 12px", fontSize: 13, cursor: "pointer", color: activeSection === s.id ? C.primary : C.muted, borderBottom: activeSection === s.id ? `2px solid ${C.primary}` : "2px solid transparent", fontWeight: activeSection === s.id ? "700" : "400", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* RIGHT */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {betSlip.length > 0 && (
              <button onClick={() => setShowSlip(!showSlip)} style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", padding: isMobile ? "7px 12px" : "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: "800", cursor: "pointer", boxShadow: `0 0 25px ${C.glow20}`, display: "flex", alignItems: "center", gap: 6 }}>
                🎯 {betSlip.length}
              </button>
            )}
            {connected ? (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ background: C.glass, border: `1px solid ${C.border}`, padding: isMobile ? "7px 10px" : "8px 14px", borderRadius: 10, backdropFilter: "blur(10px)", boxShadow: `0 0 15px ${C.glow10}` }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 1 }}>🦊 {walletAddress}</div>
                  <div style={{ fontSize: 12, fontWeight: "700", color: C.primary }}>{usdcBalance} USDC</div>
                </div>
                {!isMobile && (
                  <button onClick={disconnectWallet} style={{ background: "rgba(255,77,109,0.08)", color: C.danger, border: "1px solid rgba(255,77,109,0.2)", padding: "8px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontWeight: "600" }}>
                    Disconnect
                  </button>
                )}
              </div>
            ) : (
              <CyanButton onClick={connectWallet}>{isMobile ? "🦊 Connect" : "🦊 Connect Wallet"}</CyanButton>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobile && showMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setShowMenu(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 280, height: "100%", background: C.bg2, overflow: "auto", borderRight: `1px solid ${C.border}` }}>
            <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, fontWeight: "900", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BLOCKBET</span>
              <button onClick={() => setShowMenu(false)} style={{ background: C.glass, border: `1px solid ${C.border}`, color: C.white, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            {connected && (
              <div style={{ margin: 16, background: C.glass, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>CONNECTED</div>
                <div style={{ fontSize: 13, color: C.primary, fontWeight: "700", marginBottom: 2 }}>🦊 {walletAddress}</div>
                <div style={{ fontSize: 14, fontWeight: "800", color: C.success }}>{usdcBalance} USDC</div>
                <button onClick={() => { disconnectWallet(); setShowMenu(false); }} style={{ marginTop: 10, width: "100%", padding: 8, background: "rgba(255,77,109,0.08)", color: C.danger, border: "1px solid rgba(255,77,109,0.2)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: "600" }}>Disconnect</button>
              </div>
            )}
            {!connected && (
              <div style={{ margin: 16 }}>
                <CyanButton style={{ width: "100%", justifyContent: "center" }} onClick={() => { connectWallet(); setShowMenu(false); }}>🦊 Connect Wallet</CyanButton>
              </div>
            )}
            {NAV_SECTIONS.map(s => (
              <button key={s.id} onClick={() => { setActiveSection(s.id); setShowMenu(false); }} style={{ width: "100%", padding: "14px 20px", background: activeSection === s.id ? `${C.primary}10` : "transparent", border: "none", borderLeft: activeSection === s.id ? `3px solid ${C.primary}` : "3px solid transparent", color: activeSection === s.id ? C.primary : C.gray, fontSize: 14, fontWeight: activeSection === s.id ? "700" : "400", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex" }}>

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div style={{ width: 220, background: C.bg2, borderRight: `1px solid ${C.border}`, flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)", overflowY: "auto" }}>
            <div style={{ padding: "14px 0" }}>
              {NAV_SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ width: "100%", padding: "12px 20px", background: activeSection === s.id ? `${C.primary}10` : "transparent", border: "none", borderLeft: activeSection === s.id ? `3px solid ${C.primary}` : "3px solid transparent", color: activeSection === s.id ? C.primary : C.muted, fontSize: 13, fontWeight: activeSection === s.id ? "700" : "400", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s" }}>
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}

              {/* STATS */}
              <div style={{ margin: "16px 12px", background: C.glass, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12 }}>PLATFORM STATS</div>
                {[
                  { label: "Virtual Matches", value: matches.length, color: C.primary },
                  { label: "Players Online", value: playersOnline.toLocaleString(), color: C.success },
                  { label: "Total Bets", value: betsCount.toLocaleString(), color: C.warning },
                  { label: "USDC Locked", value: `$${(usdcLocked / 1000).toFixed(0)}K`, color: C.secondary },
                ].map(stat => (
                  <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: C.muted }}>{stat.label}</span>
                    <span style={{ color: stat.color, fontWeight: "700" }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex: 1, minWidth: 0, maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}>
          <HeroSection />

          {activeSection === "virtual" && <VirtualSection />}
          {activeSection === "clubs" && <ClubExplorer />}
          {activeSection === "ai" && <AISection />}
          {activeSection === "markets" && <MarketsSection />}
          {activeSection === "promotions" && <PromotionsSection />}
          {activeSection === "vip" && <VIPSection />}
          {activeSection === "leaderboard" && <LeaderboardSection />}

          <HowItWorksSection />
          <FAQSection />

          {/* FOOTER */}
          <div style={{ background: C.bg2, borderTop: `1px solid ${C.border}`, padding: isMobile ? "32px 16px" : "40px 40px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/logo.png" alt="logo" style={{ width: 22, height: 22, objectFit: "contain" }} />
                  </div>
                  <span style={{ fontSize: 16, fontWeight: "900", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>BLOCKBET</span>
                </div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, maxWidth: 280 }}>The future of decentralized virtual football betting. Powered by Arc Testnet. USDC native.</p>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  {["𝕏", "📱", "💬", "🐙"].map((icon, i) => (
                    <div key={i} style={{ width: 34, height: 34, background: C.glass, border: `1px solid ${C.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer" }}>{icon}</div>
                  ))}
                </div>
              </div>
              {[
                { title: "Product", links: ["Virtual Football", "Betting Markets", "AI Predictions", "VIP Club", "Tournaments"] },
                { title: "Company", links: ["About", "Blog", "Careers", "Press", "Contact"] },
                { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Responsible Gaming", "Cookie Policy", "Disclaimer"] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: 11, color: C.primary, fontWeight: "800", letterSpacing: 2, marginBottom: 14 }}>{col.title.toUpperCase()}</div>
                  {col.links.map(link => (
                    <div key={link} style={{ fontSize: 13, color: C.muted, marginBottom: 10, cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = C.primary} onMouseLeave={e => e.target.style.color = C.muted}>{link}</div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 12, color: C.muted }}>© 2025 BlockBet. All rights reserved. Built on Arc Testnet.</div>
              <div style={{ display: "flex", gap: 16 }}>
                <Badge color={C.primary}>ARC TESTNET</Badge>
                <Badge color={C.success}>USDC NATIVE</Badge>
                <Badge color={C.warning}>PROVABLY FAIR</Badge>
              </div>
            </div>
          </div>

          <div style={{ height: isMobile ? 70 : 0 }} />
        </div>

        {/* DESKTOP BET SLIP */}
        {!isMobile && (
          <div style={{ width: 300, background: C.bg2, borderLeft: `1px solid ${C.border}`, flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)", overflowY: "auto" }}>
            <BetSlipPanel />
          </div>
        )}
      </div>

      {/* MOBILE BET SLIP */}
      {isMobile && showSlip && (
        <div style={{ position: "fixed", bottom: 62, left: 0, right: 0, zIndex: 300, background: C.bg2, borderRadius: "20px 20px 0 0", border: `1px solid ${C.border}`, maxHeight: "80vh", overflow: "hidden", boxShadow: `0 -8px 40px rgba(46,199,242,0.15)` }}>
          <BetSlipPanel />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,17,31,0.97)", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, height: 62, backdropFilter: "blur(20px)" }}>
          {[
            { id: "virtual", icon: "⚽", label: "Virtual" },
            { id: "clubs", icon: "🏟️", label: "Clubs" },
            { id: "ai", icon: "🤖", label: "AI" },
            { id: "slip", icon: "🎯", label: betSlip.length > 0 ? `Slip(${betSlip.length})` : "Slip" },
            { id: "vip", icon: "👑", label: "VIP" },
          ].map(tab => (
            <button key={tab.id} onClick={() => { if (tab.id === "slip") { setShowSlip(!showSlip); } else { setActiveSection(tab.id); setShowSlip(false); } }} style={{ flex: 1, background: "transparent", border: "none", color: (activeSection === tab.id && tab.id !== "slip") || (showSlip && tab.id === "slip") ? C.primary : C.muted, cursor: "pointer", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontWeight: "600" }}>
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              <span style={{ letterSpacing: 0.3 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5,6,8,0.9)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <GlassCard glow style={{ padding: "32px 48px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, border: `3px solid ${C.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: "700", color: C.primary, marginBottom: 6 }}>Processing Transaction</div>
            <div style={{ fontSize: 13, color: C.muted }}>Please confirm in MetaMask...</div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}