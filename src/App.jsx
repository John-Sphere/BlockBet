import { useState, useEffect } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x6df1feCD5d4A8cA8701458bDc5139bC1038d6fd7";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const ABI = [
  "function placeBet(uint256,uint8,uint256) public",
  "function claimWinnings(uint256) public",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
  "function matchCount() public view returns (uint256)",
];
const USDC_ABI = ["function approve(address,uint256) public returns (bool)"];

const VIRTUAL_TEAMS = [
  { home: "Man United", away: "Arsenal", league: "Virtual Premier League" },
  { home: "Barcelona", away: "Real Madrid", league: "Virtual La Liga" },
  { home: "Liverpool", away: "Man City", league: "Virtual Premier League" },
  { home: "PSG", away: "Bayern Munich", league: "Virtual Champions League" },
  { home: "Chelsea", away: "Tottenham", league: "Virtual Premier League" },
  { home: "Juventus", away: "AC Milan", league: "Virtual Serie A" },
  { home: "Dortmund", away: "Inter Milan", league: "Virtual Bundesliga" },
  { home: "Atletico Madrid", away: "Sevilla", league: "Virtual La Liga" },
  { home: "Ajax", away: "PSV", league: "Virtual Eredivisie" },
  { home: "Porto", away: "Benfica", league: "Virtual Primeira Liga" },
  { home: "Celtic", away: "Rangers", league: "Virtual Scottish Premier" },
  { home: "Galatasaray", away: "Fenerbahce", league: "Virtual Super Lig" },
  { home: "Boca Juniors", away: "River Plate", league: "Virtual Superliga" },
  { home: "Flamengo", away: "Palmeiras", league: "Virtual Brasileirao" },
  { home: "Al Hilal", away: "Al Nassr", league: "Virtual Saudi Pro League" },
  { home: "Marseille", away: "Lyon", league: "Virtual Ligue 1" },
  { home: "Valencia", away: "Villarreal", league: "Virtual La Liga" },
  { home: "Napoli", away: "Roma", league: "Virtual Serie A" },
  { home: "Leicester", away: "Everton", league: "Virtual Premier League" },
  { home: "Sporting CP", away: "Braga", league: "Virtual Primeira Liga" },
];

const TEAM_LOGOS = {
  "Man United": "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  "Arsenal": "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  "Chelsea": "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  "Liverpool": "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  "Man City": "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  "Tottenham": "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  "Barcelona": "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg",
  "Real Madrid": "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  "Bayern Munich": "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg",
  "PSG": "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",
  "Juventus": "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg",
  "AC Milan": "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg",
  "Inter Milan": "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg",
  "Atletico Madrid": "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
  "Dortmund": "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg",
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

const C = {
  bg1: "#050608",
  bg2: "#08111F",
  bg3: "#0D1728",
  primary: "#2EC7F2",
  secondary: "#47D7FF",
  glow: "#00CFFF",
  neon: "#6FEFFF",
  white: "#FFFFFF",
  gray: "#C8D2DC",
  success: "#10E981",
  warning: "#FFC857",
  danger: "#FF4D6D",
  border: "rgba(46,199,242,0.15)",
  borderHover: "rgba(46,199,242,0.4)",
  glass: "rgba(13,23,40,0.8)",
  glow10: "rgba(46,199,242,0.1)",
  glow20: "rgba(46,199,242,0.2)",
  glow30: "rgba(46,199,242,0.3)",
};

export default function App() {
  const isMobile = useIsMobile();
  const [signer, setSigner] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [betSlip, setBetSlip] = useState([]);
  const [showSlip, setShowSlip] = useState(false);
  const [activeLeague, setActiveLeague] = useState("All");
  const [betAmount, setBetAmount] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [countdowns, setCountdowns] = useState({});

  useEffect(() => {
    loadMatches();
    const matchInterval = setInterval(loadMatches, 30000);
    const countdownInterval = setInterval(() => {
      setCountdowns(prev => {
        const updated = {};
        Object.keys(prev).forEach(id => {
          updated[id] = Math.max(0, (prev[id] || 90) - 1);
        });
        return updated;
      });
    }, 1000);
    return () => { clearInterval(matchInterval); clearInterval(countdownInterval); };
  }, []);

  async function loadMatches(prov) {
    try {
      const provider = prov || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const count = await contract.matchCount();
      const loaded = [];
      for (let i = Math.max(1, Number(count) - 9); i <= Number(count); i++) {
        const m = await contract.getMatch(i);
        const teamInfo = VIRTUAL_TEAMS.find(t => t.home === m[0] && t.away === m[1]) || { league: "Virtual League" };
        loaded.push({
          id: i, homeTeam: m[0], awayTeam: m[1],
          league: teamInfo.league,
          totalHome: Number(ethers.formatUnits(m[2], 6)),
          totalDraw: Number(ethers.formatUnits(m[3], 6)),
          totalAway: Number(ethers.formatUnits(m[4], 6)),
          resolved: m[5], result: Number(m[6]),
        });
        if (!countdowns[i]) {
          setCountdowns(prev => ({ ...prev, [i]: Math.floor(Math.random() * 90) + 30 }));
        }
      }
      setMatches(loaded.reverse());
    } catch { setMatches([]); }
  }

  async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask!");
    const web3Provider = new ethers.BrowserProvider(window.ethereum);
    await web3Provider.send("eth_requestAccounts", []);
    const web3Signer = await web3Provider.getSigner();
    const address = await web3Signer.getAddress();
    setSigner(web3Signer);
    setConnected(true);
    setWalletAddress(address.slice(0, 6) + "..." + address.slice(-4));
    loadMatches(web3Provider);
  }

  function disconnectWallet() {
    setSigner(null); setConnected(false);
    setWalletAddress(""); setBetSlip([]);
  }

  function getOdds(side, pool) {
    if (!side || !pool) return (Math.random() * 2 + 1.3).toFixed(2);
    return Math.max(1.01, pool / side).toFixed(2);
  }

  function addToBetSlip(match, prediction, odds) {
    const label = prediction === 1 ? "1" : prediction === 2 ? "X" : "2";
    const predLabel = prediction === 1 ? "Home Win" : prediction === 2 ? "Draw" : "Away Win";
    const exists = betSlip.find(b => b.matchId === match.id);
    if (exists) {
      if (exists.prediction === prediction) {
        setBetSlip(betSlip.filter(b => b.matchId !== match.id));
      } else {
        setBetSlip(betSlip.map(b => b.matchId === match.id ? { ...b, prediction, label, odds, predLabel } : b));
      }
    } else {
      setBetSlip([...betSlip, { matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, prediction, label, odds, predLabel }]);
    }
  }

  async function placeBet(matchId, prediction) {
    if (!signer) return alert("Connect your wallet first!");
    if (!betAmount || betAmount <= 0) return alert("Enter a bet amount!");
    const amountInUnits = ethers.parseUnits(betAmount.toString(), 6);
    setLoading(true);
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      await (await usdc.approve(CONTRACT_ADDRESS, amountInUnits)).wait();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      await (await contract.placeBet(matchId, prediction, amountInUnits)).wait();
      alert("✅ Bet placed successfully!");
      loadMatches();
      setBetSlip([]);
      setBetAmount("");
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  }

  async function claimWinnings(matchId) {
    if (!signer) return alert("Connect your wallet first!");
    setLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      await (await contract.claimWinnings(matchId)).wait();
      alert("💰 Winnings claimed!");
      loadMatches();
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  }

  const resultLabel = (r) => r === 1 ? "Home Win" : r === 2 ? "Draw" : r === 3 ? "Away Win" : "Pending";
  const LEAGUES = ["All", ...new Set(matches.map(m => m.league))];
  const filtered = activeLeague === "All" ? matches : matches.filter(m => m.league === activeLeague);
  const totalOdds = betSlip.reduce((acc, b) => acc * parseFloat(b.odds || 1), 1);
  const potentialWin = betAmount ? (betAmount * totalOdds).toFixed(2) : "0.00";

  const grouped = {};
  filtered.forEach(m => {
    if (!grouped[m.league]) grouped[m.league] = [];
    grouped[m.league].push(m);
  });

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const TeamBadge = ({ team, size = 22 }) => {
    if (TEAM_LOGOS[team]) return (
      <img src={TEAM_LOGOS[team]} alt={team}
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
        onError={e => e.target.style.display = "none"} />
    );
    return <div style={{ width: size, height: size, background: C.bg3, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, border: `1px solid ${C.border}` }}>⚽</div>;
  };

  const BetSlipContent = () => (
    <div style={{ height: "100%" }}>
      <div style={{ background: `linear-gradient(135deg, ${C.bg2}, ${C.bg3})`, borderBottom: `1px solid ${C.border}`, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.primary, boxShadow: `0 0 10px ${C.primary}` }} />
          <span style={{ fontSize: 15, fontWeight: "700", color: C.white, letterSpacing: 0.5 }}>BET SLIP</span>
          {betSlip.length > 0 && (
            <span style={{ background: C.primary, color: C.bg1, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "700" }}>
              {betSlip.length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {betSlip.length > 0 && (
            <button onClick={() => setBetSlip([])}
              style={{ background: "rgba(255,77,109,0.1)", border: `1px solid rgba(255,77,109,0.3)`, color: C.danger, padding: "4px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
              Clear
            </button>
          )}
          {isMobile && (
            <button onClick={() => setShowSlip(false)}
              style={{ background: C.glow10, border: `1px solid ${C.border}`, color: C.gray, width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ padding: 16, overflowY: "auto", maxHeight: isMobile ? "65vh" : "calc(100vh - 200px)" }}>
        {betSlip.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.gray }}>
            <div style={{ fontSize: 40, marginBottom: 12, filter: `drop-shadow(0 0 10px ${C.primary})` }}>🎯</div>
            <div style={{ fontSize: 13, color: C.gray }}>Click odds to add selections</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>Build your bet slip</div>
          </div>
        ) : (
          <>
            {betSlip.map((bet, i) => (
              <div key={i} style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10, backdropFilter: "blur(10px)", boxShadow: `0 0 20px ${C.glow10}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "600", color: C.white, marginBottom: 4 }}>
                      {bet.homeTeam} vs {bet.awayTeam}
                    </div>
                    <div style={{ fontSize: 11, color: C.primary }}>{bet.predLabel}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: "800", color: C.primary, textShadow: `0 0 10px ${C.primary}` }}>{bet.odds}</span>
                    <button onClick={() => setBetSlip(betSlip.filter((_, idx) => idx !== i))}
                      style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ margin: "16px 0" }}>
              <div style={{ fontSize: 11, color: C.gray, marginBottom: 8, letterSpacing: 0.5, fontWeight: "600" }}>STAKE AMOUNT (USDC)</div>
              <input type="number" placeholder="Enter amount..."
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.glass, color: C.white, fontSize: 15, boxSizing: "border-box", outline: "none", backdropFilter: "blur(10px)" }} />
            </div>

            <div style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, backdropFilter: "blur(10px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: C.gray, fontSize: 13 }}>Total Odds</span>
                <span style={{ color: C.primary, fontWeight: "700", fontSize: 14 }}>{totalOdds.toFixed(2)}x</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.gray, fontSize: 13 }}>Potential Win</span>
                <span style={{ color: C.success, fontWeight: "800", fontSize: 18, textShadow: `0 0 15px ${C.success}` }}>{potentialWin} USDC</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!connected) return connectWallet();
                if (betSlip.length === 0) return alert("Add selections first!");
                betSlip.forEach(bet => placeBet(bet.matchId, bet.prediction));
              }}
              style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", borderRadius: 12, fontWeight: "800", cursor: "pointer", fontSize: 15, boxShadow: `0 0 30px ${C.glow30}, 0 4px 15px ${C.glow20}`, letterSpacing: 0.5 }}>
              {connected ? "⚡ PLACE BET" : "🦊 CONNECT WALLET"}
            </button>

            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              🔒 Secured by Arc Testnet • USDC Native
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg1, minHeight: "100vh", color: C.white, fontFamily: "'Inter', 'SF Pro Display', Arial, sans-serif" }}>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.25; transform: scale(1.05); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(46,199,242,0.3); } 50% { box-shadow: 0 0 40px rgba(46,199,242,0.6); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #08111F; }
        ::-webkit-scrollbar-thumb { background: #2EC7F2; border-radius: 2px; }
        input::placeholder { color: #475569; }
        input:focus { border-color: rgba(46,199,242,0.5) !important; box-shadow: 0 0 20px rgba(46,199,242,0.15) !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: `rgba(8,17,31,0.95)`, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "12px 16px" : "0 32px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? "auto" : 64 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setShowMenu(!showMenu)}
                style={{ background: "none", border: "none", color: C.white, fontSize: 20, cursor: "pointer" }}>☰</button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${C.glow20}` }}>
                <img src="/logo.png" alt="logo" style={{ width: 28, height: 28, objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: "800", background: `linear-gradient(90deg, ${C.primary}, ${C.secondary}, ${C.neon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>
                  BLOCKBET
                </div>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: 3, fontWeight: "600" }}>DECENTRALIZED SPORTS BETTING</div>
              </div>
            </div>
          </div>

          {!isMobile && (
            <div style={{ display: "flex", gap: 32 }}>
              {["Virtual Sports", "Live Betting", "Results", "How It Works"].map((t, i) => (
                <span key={t} style={{ fontSize: 13, cursor: "pointer", color: i === 0 ? C.primary : C.gray, borderBottom: i === 0 ? `2px solid ${C.primary}` : "none", padding: "22px 0", display: "inline-block", fontWeight: i === 0 ? "700" : "500", letterSpacing: 0.3 }}>{t}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {betSlip.length > 0 && (
              <button onClick={() => setShowSlip(!showSlip)}
                style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", padding: isMobile ? "7px 12px" : "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: "700", cursor: "pointer", boxShadow: `0 0 20px ${C.glow20}` }}>
                🎯 {betSlip.length}
              </button>
            )}
            {connected ? (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ background: C.glass, border: `1px solid ${C.border}`, padding: isMobile ? "7px 12px" : "8px 16px", borderRadius: 10, fontSize: 12, color: C.primary, fontWeight: "700", backdropFilter: "blur(10px)", boxShadow: `0 0 15px ${C.glow10}` }}>
                  🦊 {walletAddress}
                </div>
                {!isMobile && (
                  <button onClick={disconnectWallet}
                    style={{ background: "rgba(255,77,109,0.08)", color: C.danger, border: `1px solid rgba(255,77,109,0.2)`, padding: "8px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: "600" }}>
                    Disconnect
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={connectWallet}
                  style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", padding: isMobile ? "8px 14px" : "10px 20px", borderRadius: 10, fontWeight: "700", cursor: "pointer", fontSize: isMobile ? 12 : 13, boxShadow: `0 0 25px ${C.glow20}` }}>
                  🦊 {isMobile ? "Connect" : "Connect Wallet"}
                </button>
                {!isMobile && (
                  <button onClick={connectWallet}
                    style={{ background: C.glass, color: C.primary, border: `1px solid ${C.border}`, padding: "10px 20px", borderRadius: 10, fontWeight: "600", cursor: "pointer", fontSize: 13, backdropFilter: "blur(10px)" }}>
                    Register
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobile && showMenu && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 200 }}>
          <div onClick={() => setShowMenu(false)} style={{ position: "absolute", width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 280, height: "100%", background: C.bg2, padding: 24, overflowY: "auto", borderRight: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <span style={{ fontSize: 16, fontWeight: "800", background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>BLOCKBET</span>
              <button onClick={() => setShowMenu(false)} style={{ background: C.glow10, border: `1px solid ${C.border}`, color: C.white, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            {connected ? (
              <div style={{ background: C.glass, borderRadius: 14, padding: 16, marginBottom: 24, border: `1px solid ${C.border}`, backdropFilter: "blur(10px)" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, letterSpacing: 1, fontWeight: "600" }}>CONNECTED WALLET</div>
                <div style={{ fontSize: 13, color: C.primary, fontWeight: "700" }}>🦊 {walletAddress}</div>
                <button onClick={() => { disconnectWallet(); setShowMenu(false); }}
                  style={{ marginTop: 12, width: "100%", padding: 10, background: "rgba(255,77,109,0.08)", color: C.danger, border: `1px solid rgba(255,77,109,0.2)`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "600" }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => { connectWallet(); setShowMenu(false); }}
                style={{ width: "100%", padding: 14, background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", borderRadius: 12, fontWeight: "700", cursor: "pointer", fontSize: 14, marginBottom: 24, boxShadow: `0 0 25px ${C.glow20}` }}>
                🦊 Connect Wallet
              </button>
            )}

            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginBottom: 12, fontWeight: "700" }}>VIRTUAL LEAGUES</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => { setActiveLeague(league); setShowMenu(false); }}
                style={{ padding: "13px 10px", fontSize: 13, color: activeLeague === league ? C.primary : C.gray, cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontWeight: activeLeague === league ? "700" : "400", display: "flex", alignItems: "center", gap: 8 }}>
                <span>{league === "All" ? "⚡" : "🎮"}</span>
                {league === "All" ? "All Matches" : league}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HERO BANNER */}
      <div style={{ background: `linear-gradient(135deg, ${C.bg1} 0%, ${C.bg2} 50%, ${C.bg3} 100%)`, padding: isMobile ? "40px 16px 50px" : "80px 32px 90px", position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.border}` }}>

        {/* GLOW EFFECTS */}
        <div style={{ position: "absolute", top: -120, right: -120, width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, rgba(46,199,242,0.12) 0%, transparent 70%)`, filter: "blur(40px)", animation: "pulse 5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: -150, left: -80, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,207,255,0.08) 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "40%", left: "35%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(71,215,255,0.06) 0%, transparent 70%)`, filter: "blur(40px)" }} />

        {/* FLOATING PARTICLES */}
        {!isMobile && [
          { top: "15%", left: "8%" }, { top: "35%", left: "18%" },
          { top: "65%", left: "5%" }, { top: "20%", left: "55%" },
          { top: "75%", left: "48%" }, { top: "45%", left: "62%" },
        ].map((pos, i) => (
          <div key={i} style={{ position: "absolute", width: i % 2 === 0 ? 3 : 2, height: i % 2 === 0 ? 3 : 2, borderRadius: "50%", background: C.primary, opacity: 0.5, top: pos.top, left: pos.left, boxShadow: `0 0 8px ${C.primary}` }} />
        ))}

        {/* THIN LINES */}
        {!isMobile && (
          <>
            <div style={{ position: "absolute", top: "30%", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, opacity: 0.5 }} />
            <div style={{ position: "absolute", top: "70%", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, opacity: 0.3 }} />
          </>
        )}

        <div style={{ position: "relative", zIndex: 2, maxWidth: isMobile ? "100%" : 580 }}>

          {/* LIVE BADGE */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,233,129,0.06)", border: "1px solid rgba(16,233,129,0.2)", color: C.success, fontSize: 12, fontWeight: "700", padding: "7px 16px", borderRadius: 20, marginBottom: 24, backdropFilter: "blur(10px)", letterSpacing: 0.5 }}>
            <div style={{ width: 6, height: 6, background: C.success, borderRadius: "50%", boxShadow: `0 0 8px ${C.success}` }} />
            🔴 LIVE ON ARC TESTNET • USDC NATIVE
          </div>

          {/* HEADLINE */}
          <div style={{ fontSize: isMobile ? 30 : 56, fontWeight: "900", color: C.white, lineHeight: 1.05, marginBottom: 18, letterSpacing: -1.5 }}>
            The Future of{" "}
            <span style={{ background: `linear-gradient(90deg, ${C.primary}, ${C.secondary}, ${C.neon})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: `drop-shadow(0 0 25px rgba(46,199,242,0.4))` }}>
              On-Chain
            </span>
            <br />Sports Betting
          </div>

          {/* SUBTITLE */}
          <div style={{ fontSize: isMobile ? 14 : 17, color: C.gray, lineHeight: 1.75, marginBottom: 36, maxWidth: 480 }}>
            Bet with USDC. Instant payouts. Provably fair.{" "}
            <span style={{ color: C.primary, fontWeight: "600" }}>AI-powered predictions.</span>{" "}
            Fully decentralized on Arc blockchain.
          </div>

          {/* CTA BUTTONS */}
          <div style={{ display: "flex", gap: 14, marginBottom: 52, flexWrap: "wrap" }}>
            {!connected && (
              <button onClick={connectWallet}
                style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", padding: isMobile ? "13px 24px" : "16px 32px", borderRadius: 14, fontSize: isMobile ? 14 : 16, fontWeight: "800", cursor: "pointer", boxShadow: `0 0 40px ${C.glow30}, 0 8px 25px ${C.glow20}`, letterSpacing: 0.5 }}>
                🦊 Connect Wallet
              </button>
            )}
            <button onClick={() => window.scrollTo({ top: 700, behavior: "smooth" })}
              style={{ background: C.glass, color: C.primary, border: `1px solid ${C.border}`, padding: isMobile ? "13px 24px" : "16px 32px", borderRadius: 14, fontSize: isMobile ? 14 : 16, fontWeight: "700", cursor: "pointer", backdropFilter: "blur(20px)", boxShadow: `0 0 20px ${C.glow10}`, letterSpacing: 0.5 }}>
              ⚡ Start Betting
            </button>
          </div>

          {/* STATS */}
          <div style={{ display: "flex", gap: isMobile ? 24 : 48, flexWrap: "wrap" }}>
            {[
              { value: `${matches.length}+`, label: "LIVE MATCHES", icon: "⚽" },
              { value: "~3 MIN", label: "MATCH DURATION", icon: "⏱️" },
              { value: "100%", label: "ON-CHAIN", icon: "🔒" },
              { value: "USDC", label: "NATIVE TOKEN", icon: "💎" },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: "900", color: C.primary, textShadow: `0 0 20px rgba(46,199,242,0.4)` }}>
                  {stat.icon} {stat.value}
                </div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 4, letterSpacing: 1.5, fontWeight: "600" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FLOATING MATCH PREVIEW CARDS */}
        {!isMobile && matches.length > 0 && (
          <div style={{ position: "absolute", right: 60, top: "50%", transform: "translateY(-50%)", width: 290, zIndex: 1 }}>
            {matches.slice(0, 2).map((match, i) => {
              const pool = match.totalHome + match.totalDraw + match.totalAway;
              const o1 = getOdds(match.totalHome, pool);
              const ox = getOdds(match.totalDraw, pool);
              const o2 = getOdds(match.totalAway, pool);
              return (
                <div key={i} style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 20, padding: 18, marginBottom: 14, backdropFilter: "blur(20px)", boxShadow: `0 0 40px ${C.glow10}, inset 0 1px 0 rgba(255,255,255,0.05)`, animation: `float ${3 + i}s ease-in-out infinite` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(16,233,129,0.08)", color: C.success, fontSize: 10, fontWeight: "700", padding: "4px 10px", borderRadius: 10, border: "1px solid rgba(16,233,129,0.2)", letterSpacing: 0.5 }}>
                      <div style={{ width: 5, height: 5, background: C.success, borderRadius: "50%", boxShadow: `0 0 6px ${C.success}` }} />
                      VIRTUAL LIVE
                    </div>
                    <span style={{ fontSize: 11, color: C.warning, fontWeight: "700" }}>
                      ⏱ {formatCountdown(countdowns[match.id] || 90)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: C.white, fontWeight: "700", marginBottom: 12, letterSpacing: 0.3 }}>
                    {match.homeTeam} vs {match.awayTeam}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ label: "1", odd: o1 }, { label: "X", odd: ox }, { label: "2", odd: o2 }].map(opt => (
                      <div key={opt.label} style={{ flex: 1, background: `rgba(46,199,242,0.06)`, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 4px", textAlign: "center", boxShadow: `0 0 12px ${C.glow10}` }}>
                        <div style={{ fontSize: 9, color: "#475569", marginBottom: 3, fontWeight: "600", letterSpacing: 0.5 }}>{opt.label}</div>
                        <div style={{ fontSize: 14, fontWeight: "800", color: C.primary, textShadow: `0 0 10px rgba(46,199,242,0.4)` }}>{opt.odd}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LEAGUE FILTER */}
      <div style={{ background: C.bg2, padding: isMobile ? "10px 16px" : "10px 32px", display: "flex", gap: 8, overflowX: "auto", borderBottom: `1px solid ${C.border}` }}>
        {LEAGUES.map(league => (
          <button key={league} onClick={() => setActiveLeague(league)}
            style={{ background: activeLeague === league ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : C.glass, color: activeLeague === league ? C.bg1 : C.gray, border: `1px solid ${activeLeague === league ? "transparent" : C.border}`, padding: isMobile ? "6px 14px" : "7px 18px", borderRadius: 20, cursor: "pointer", fontSize: isMobile ? 11 : 12, whiteSpace: "nowrap", fontWeight: activeLeague === league ? "700" : "500", flexShrink: 0, backdropFilter: "blur(10px)", boxShadow: activeLeague === league ? `0 0 20px ${C.glow20}` : "none" }}>
            {league === "All" ? "⚡ All" : `🎮 ${league}`}
          </button>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", maxWidth: isMobile ? "100%" : 1400, margin: "0 auto" }}>

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div style={{ width: 240, background: C.bg2, borderRight: `1px solid ${C.border}`, flexShrink: 0, minHeight: "calc(100vh - 200px)" }}>
            <div style={{ padding: "16px 20px", fontSize: 10, color: "#475569", letterSpacing: 2, fontWeight: "700" }}>VIRTUAL LEAGUES</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => setActiveLeague(league)}
                style={{ padding: "12px 20px", fontSize: 13, cursor: "pointer", color: activeLeague === league ? C.primary : C.gray, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: activeLeague === league ? "700" : "400", background: activeLeague === league ? `rgba(46,199,242,0.05)` : "transparent", borderLeft: activeLeague === league ? `2px solid ${C.primary}` : "2px solid transparent" }}
                onMouseEnter={e => { if (activeLeague !== league) e.currentTarget.style.background = "rgba(46,199,242,0.03)"; }}
                onMouseLeave={e => { if (activeLeague !== league) e.currentTarget.style.background = "transparent"; }}>
                <span>{league === "All" ? "⚡ All Matches" : `🎮 ${league}`}</span>
                {activeLeague === league && <span style={{ color: C.primary, fontSize: 16 }}>›</span>}
              </div>
            ))}

            <div style={{ margin: 16, background: C.glass, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, backdropFilter: "blur(10px)" }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 12, fontWeight: "700", letterSpacing: 1 }}>HOW IT WORKS</div>
              {["Connect MetaMask wallet", "Choose a virtual match", "Pick Home / Draw / Away", "Enter USDC amount", "Claim your winnings! 💰"].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, fontSize: 12, color: C.gray, lineHeight: 1.4 }}>
                  <span style={{ color: C.primary, fontWeight: "700", minWidth: 16 }}>{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATCHES */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* TABLE HEADER */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 90px", padding: "10px 20px", background: C.bg2, fontSize: 10, color: "#475569", fontWeight: "700", borderBottom: `1px solid ${C.border}`, letterSpacing: 1.5 }}>
              <span>MATCH</span>
              <span style={{ textAlign: "center" }}>HOME</span>
              <span style={{ textAlign: "center" }}>DRAW</span>
              <span style={{ textAlign: "center" }}>AWAY</span>
              <span style={{ textAlign: "center" }}>TIMER</span>
            </div>
          )}

          {/* MATCHES HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "10px 16px" : "10px 20px", background: C.bg1, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ color: C.primary, fontSize: 13, fontWeight: "700", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.success, display: "inline-block", boxShadow: `0 0 8px ${C.success}` }} />
              Virtual Matches ({filtered.length})
            </span>
            <button onClick={() => loadMatches()}
              style={{ background: C.glass, color: C.primary, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: "600", backdropFilter: "blur(10px)" }}>
              🔄 Refresh
            </button>
          </div>

          {matches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#475569" }}>
              <div style={{ fontSize: 56, marginBottom: 16, filter: `drop-shadow(0 0 15px ${C.primary})` }}>⚡</div>
              <div style={{ fontSize: 18, fontWeight: "700", color: C.gray, marginBottom: 8 }}>No Virtual Matches Yet</div>
              <div style={{ fontSize: 14, color: "#475569", marginBottom: 24 }}>Connect your wallet to load matches</div>
              <button onClick={connectWallet}
                style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: C.bg1, border: "none", padding: "14px 28px", borderRadius: 12, fontWeight: "700", cursor: "pointer", fontSize: 14, boxShadow: `0 0 30px ${C.glow20}` }}>
                🦊 Connect Wallet
              </button>
            </div>
          ) : (
            Object.entries(grouped).map(([league, leagueMatches]) => (
              <div key={league}>
                <div style={{ padding: isMobile ? "10px 16px" : "10px 20px", background: `rgba(46,199,242,0.03)`, fontSize: 11, color: C.primary, fontWeight: "700", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, letterSpacing: 1 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, display: "inline-block", boxShadow: `0 0 8px ${C.primary}` }} />
                  🎮 {league.toUpperCase()}
                </div>

                {leagueMatches.map((match, idx) => {
                  const pool = match.totalHome + match.totalDraw + match.totalAway;
                  const o1 = getOdds(match.totalHome, pool);
                  const ox = getOdds(match.totalDraw, pool);
                  const o2 = getOdds(match.totalAway, pool);
                  const selected = betSlip.find(b => b.matchId === match.id);
                  const countdown = countdowns[match.id] || 90;
                  const isUrgent = countdown < 30;

                  return (
                    <div key={match.id}
                      style={{ background: idx % 2 === 0 ? C.bg1 : "rgba(8,17,31,0.5)", borderBottom: `1px solid ${C.border}`, transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(46,199,242,0.03)"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? C.bg1 : "rgba(8,17,31,0.5)"}>

                      <div style={{ padding: isMobile ? "12px 16px" : "14px 20px", display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>

                        {/* MATCH INFO */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(46,199,242,0.06)", color: C.primary, fontSize: 9, fontWeight: "700", padding: "2px 8px", borderRadius: 6, marginBottom: 8, border: `1px solid ${C.border}`, letterSpacing: 0.5 }}>
                            🎮 VIRTUAL
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <TeamBadge team={match.homeTeam} size={isMobile ? 18 : 22} />
                            <span style={{ fontSize: isMobile ? 13 : 14, color: C.white, fontWeight: "600", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {match.homeTeam}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <TeamBadge team={match.awayTeam} size={isMobile ? 18 : 22} />
                            <span style={{ fontSize: isMobile ? 13 : 14, color: C.white, fontWeight: "600", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {match.awayTeam}
                            </span>
                          </div>
                          {match.resolved && (
                            <div style={{ marginTop: 8, fontSize: 11, color: C.success, fontWeight: "700", display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, display: "inline-block" }} />
                              Result: {resultLabel(match.result)}
                            </div>
                          )}
                        </div>

                        {/* ODDS BUTTONS */}
                        {!match.resolved && (
                          <div style={{ display: "flex", gap: isMobile ? 5 : 6, flexShrink: 0 }}>
                            {[{ code: 1, odds: o1, label: "1" }, { code: 2, odds: ox, label: "X" }, { code: 3, odds: o2, label: "2" }].map(opt => (
                              <button key={opt.code}
                                onClick={() => addToBetSlip(match, opt.code, opt.odds)}
                                style={{
                                  width: isMobile ? 54 : 72,
                                  padding: isMobile ? "8px 3px" : "10px 4px",
                                  background: selected?.prediction === opt.code ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})` : C.glass,
                                  color: selected?.prediction === opt.code ? C.bg1 : C.white,
                                  border: `1px solid ${selected?.prediction === opt.code ? "transparent" : C.border}`,
                                  borderRadius: 10, cursor: "pointer", textAlign: "center",
                                  backdropFilter: "blur(10px)",
                                  boxShadow: selected?.prediction === opt.code ? `0 0 20px ${C.glow30}` : `0 0 8px ${C.glow10}`,
                                  transition: "all 0.2s",
                                }}>
                                <div style={{ fontSize: 9, color: selected?.prediction === opt.code ? C.bg1 : "#475569", marginBottom: 3, fontWeight: "700", letterSpacing: 0.5 }}>{opt.label}</div>
                                <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: "800", textShadow: selected?.prediction === opt.code ? "none" : `0 0 8px rgba(46,199,242,0.3)` }}>{opt.odds}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* TIMER OR CLAIM */}
                        <div style={{ minWidth: isMobile ? 44 : 80, textAlign: "center", flexShrink: 0 }}>
                          {match.resolved ? (
                            <button onClick={() => claimWinnings(match.id)}
                              style={{ background: `linear-gradient(135deg, ${C.warning}, #FF6B35)`, color: C.bg1, border: "none", padding: isMobile ? "8px 6px" : "10px 12px", borderRadius: 10, cursor: "pointer", fontSize: isMobile ? 10 : 12, fontWeight: "700", boxShadow: `0 0 15px rgba(255,200,87,0.3)`, width: "100%" }}>
                              💰 {isMobile ? "Claim" : "Claim Win"}
                            </button>
                          ) : (
                            <div style={{ background: C.glass, border: `1px solid ${isUrgent ? "rgba(255,77,109,0.3)" : C.border}`, borderRadius: 10, padding: isMobile ? "6px 4px" : "8px 6px", backdropFilter: "blur(10px)", boxShadow: isUrgent ? `0 0 15px rgba(255,77,109,0.2)` : "none" }}>
                              <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: "800", color: isUrgent ? C.danger : C.warning, textShadow: isUrgent ? `0 0 10px ${C.danger}` : `0 0 10px rgba(255,200,87,0.4)` }}>
                                {formatCountdown(countdown)}
                              </div>
                              <div style={{ fontSize: 9, color: "#475569", marginTop: 2, fontWeight: "600", letterSpacing: 0.5 }}>BETTING</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div style={{ height: isMobile ? 80 : 32 }} />
        </div>

        {/* DESKTOP BET SLIP */}
        {!isMobile && (
          <div style={{ width: 300, background: C.bg2, borderLeft: `1px solid ${C.border}`, flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)", overflowY: "auto" }}>
            <BetSlipContent />
          </div>
        )}
      </div>

      {/* MOBILE BET SLIP */}
      {isMobile && showSlip && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300, background: C.bg2, borderRadius: "20px 20px 0 0", border: `1px solid ${C.border}`, boxShadow: `0 -8px 40px rgba(46,199,242,0.15)` }}>
          <BetSlipContent />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `rgba(8,17,31,0.95)`, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, height: 62, backdropFilter: "blur(20px)" }}>
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "virtual", icon: "⚡", label: "Virtual" },
            { id: "betslip", icon: "🎯", label: betSlip.length > 0 ? `Slip(${betSlip.length})` : "Slip" },
            { id: "results", icon: "📊", label: "Results" },
            { id: "account", icon: "👤", label: "Account" },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "betslip") setShowSlip(true); }}
              style={{ flex: 1, background: "transparent", border: "none", color: activeTab === tab.id ? C.primary : "#475569", cursor: "pointer", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontWeight: activeTab === tab.id ? "700" : "400" }}>
              <span style={{ fontSize: 20, filter: activeTab === tab.id ? `drop-shadow(0 0 6px ${C.primary})` : "none" }}>{tab.icon}</span>
              <span style={{ letterSpacing: 0.3 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ background: C.bg2, borderTop: `1px solid ${C.border}`, padding: "28px 32px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 15px ${C.glow20}` }}>
            <img src="/logo.png" alt="logo" style={{ width: 20, height: 20, objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: "800", background: `linear-gradient(90deg, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1 }}>BLOCKBET</span>
        </div>
        <p style={{ color: "#475569", fontSize: 12, margin: 0, letterSpacing: 0.5 }}>
          Decentralized Virtual Sports Betting • Arc Testnet • USDC Native Payments
        </p>
      </div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(5,6,8,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 40px", textAlign: "center", boxShadow: `0 0 60px ${C.glow20}`, backdropFilter: "blur(20px)" }}>
            <div style={{ fontSize: 36, marginBottom: 12, animation: "pulse 1s ease-in-out infinite" }}>⚡</div>
            <div style={{ fontSize: 15, fontWeight: "700", color: C.primary, marginBottom: 4 }}>Processing Transaction</div>
            <div style={{ fontSize: 12, color: C.gray }}>Please confirm in MetaMask...</div>
          </div>
        </div>
      )}
    </div>
  );
}