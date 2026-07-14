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
    return () => {
      clearInterval(matchInterval);
      clearInterval(countdownInterval);
    };
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
          id: i,
          homeTeam: m[0],
          awayTeam: m[1],
          league: teamInfo.league,
          totalHome: Number(ethers.formatUnits(m[2], 6)),
          totalDraw: Number(ethers.formatUnits(m[3], 6)),
          totalAway: Number(ethers.formatUnits(m[4], 6)),
          resolved: m[5],
          result: Number(m[6]),
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
    const predLabel = prediction === 1 ? "Home win" : prediction === 2 ? "Draw" : "Away win";
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

  const resultLabel = (r) => r === 1 ? "🏠 Home Win" : r === 2 ? "🤝 Draw" : r === 3 ? "✈️ Away Win" : "Pending";
  const LEAGUES = ["All", ...new Set(matches.map(m => m.league))];
  const filtered = activeLeague === "All" ? matches : matches.filter(m => m.league === activeLeague);
  const totalOdds = betSlip.reduce((acc, b) => acc * parseFloat(b.odds || 1), 1);
  const potentialWin = betAmount ? (betAmount * totalOdds).toFixed(2) : "0.00";

  const grouped = {};
  filtered.forEach(m => {
    if (!grouped[m.league]) grouped[m.league] = [];
    grouped[m.league].push(m);
  });

  const TeamBadge = ({ team, size = 22 }) => {
    if (TEAM_LOGOS[team]) return (
      <img src={TEAM_LOGOS[team]} alt={team}
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
        onError={e => e.target.style.display = "none"} />
    );
    return <div style={{ width: size, height: size, background: "#1e293b", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>⚽</div>;
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const BetSlipContent = () => (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: "600", color: "white" }}>🎯 Bet Slip</span>
          {betSlip.length > 0 && (
            <span style={{ background: "white", color: "#6366f1", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold" }}>
              {betSlip.length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {betSlip.length > 0 && (
            <button onClick={() => setBetSlip([])} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              Clear
            </button>
          )}
          {isMobile && (
            <button onClick={() => setShowSlip(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ padding: 14, overflowY: "auto", maxHeight: isMobile ? "65vh" : "calc(100vh - 200px)" }}>
        {betSlip.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
            <div style={{ fontSize: 13 }}>Click odds to add to slip</div>
          </div>
        ) : (
          <>
            {betSlip.map((bet, i) => (
              <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "600", color: "#e2e8f0", marginBottom: 3 }}>
                      {bet.homeTeam} vs {bet.awayTeam}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{bet.predLabel}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: "bold", color: "#38bdf8" }}>{bet.odds}</span>
                    <button onClick={() => setBetSlip(betSlip.filter((_, idx) => idx !== i))}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ margin: "14px 0" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Stake (USDC)</div>
              <input type="number" placeholder="Enter amount..."
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#0f172a", color: "white", fontSize: 14, boxSizing: "border-box" }} />
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Total odds</span>
                <span style={{ color: "#38bdf8", fontWeight: "600" }}>{totalOdds.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Potential win</span>
                <span style={{ color: "#4ade80", fontWeight: "bold", fontSize: 16 }}>{potentialWin} USDC</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!connected) return connectWallet();
                if (betSlip.length === 0) return alert("Add selections first!");
                betSlip.forEach(bet => placeBet(bet.matchId, bet.prediction));
              }}
              style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", borderRadius: 10, fontWeight: "600", cursor: "pointer", fontSize: 15 }}>
              {connected ? "🎯 Place Bet" : "🦊 Connect Wallet"}
            </button>

            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#475569" }}>
              🔒 Secured by Arc Testnet
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "white", fontFamily: "Arial, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: isMobile ? "10px 14px" : "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? "auto" : 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>☰</button>
            )}
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo.png" alt="logo" style={{ width: 26, height: 26, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: "700", background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                DISTANT FINANCE
              </div>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2 }}>VIRTUAL SPORTS BETTING</div>
            </div>
          </div>

          {!isMobile && (
            <div style={{ display: "flex", gap: 24 }}>
              {["Virtual Sports", "Live Betting", "Results", "How it Works"].map(t => (
                <span key={t} style={{ fontSize: 13, cursor: "pointer", color: t === "Virtual Sports" ? "#38bdf8" : "#64748b", borderBottom: t === "Virtual Sports" ? "2px solid #38bdf8" : "none", padding: "18px 0", display: "inline-block" }}>{t}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {betSlip.length > 0 && (
              <button onClick={() => setShowSlip(!showSlip)}
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: "600", cursor: "pointer" }}>
                🎯 {betSlip.length}
              </button>
            )}
            {connected ? (
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 8, fontSize: 12, color: "#38bdf8", fontWeight: "600" }}>
                  🦊 {walletAddress}
                </div>
                {!isMobile && (
                  <button onClick={disconnectWallet}
                    style={{ background: "#1e1e2e", color: "#ef4444", border: "1px solid #3f1515", padding: "7px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: "600" }}>
                    Disconnect
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={connectWallet}
                  style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", padding: isMobile ? "7px 12px" : "8px 16px", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: isMobile ? 12 : 13 }}>
                  🦊 {isMobile ? "Connect" : "Connect Wallet"}
                </button>
                {!isMobile && (
                  <button onClick={connectWallet}
                    style={{ background: "transparent", color: "#38bdf8", border: "1px solid #1e3a5f", padding: "8px 16px", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 13 }}>
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
          <div onClick={() => setShowMenu(false)} style={{ position: "absolute", width: "100%", height: "100%", background: "rgba(0,0,0,0.8)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 270, height: "100%", background: "#0a0f1e", padding: 20, overflowY: "auto", borderRight: "1px solid #1e293b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <span style={{ fontSize: 15, fontWeight: "700", color: "#38bdf8" }}>DISTANT FINANCE</span>
              <button onClick={() => setShowMenu(false)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {connected ? (
              <div style={{ background: "#0f172a", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Connected</div>
                <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: "600" }}>🦊 {walletAddress}</div>
                <button onClick={() => { disconnectWallet(); setShowMenu(false); }}
                  style={{ marginTop: 10, width: "100%", padding: 8, background: "#1e1e2e", color: "#ef4444", border: "1px solid #3f1515", borderRadius: 6, cursor: "pointer" }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => { connectWallet(); setShowMenu(false); }}
                style={{ width: "100%", padding: 12, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 14, marginBottom: 20 }}>
                🦊 Connect Wallet
              </button>
            )}
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1, marginBottom: 10, fontWeight: "600" }}>VIRTUAL LEAGUES</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => { setActiveLeague(league); setShowMenu(false); }}
                style={{ padding: "10px 8px", fontSize: 13, color: activeLeague === league ? "#38bdf8" : "#94a3b8", cursor: "pointer", borderBottom: "1px solid #0f172a", fontWeight: activeLeague === league ? "600" : "normal" }}>
                {league === "All" ? "🌍 All Matches" : "🎮 " + league}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HERO BANNER */}
      <div style={{ background: "#020617", padding: isMobile ? "24px 16px" : "40px 24px", position: "relative", overflow: "hidden", borderBottom: "1px solid #1e293b" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "#0ea5e9", opacity: 0.12, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 260, height: 260, borderRadius: "50%", background: "#6366f1", opacity: 0.1, filter: "blur(40px)" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 480 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8", fontSize: 12, fontWeight: "600", padding: "5px 12px", borderRadius: 20, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, background: "#38bdf8", borderRadius: "50%" }} />
            🎮 Virtual Sports Betting
          </div>
          <div style={{ fontSize: isMobile ? 22 : 32, fontWeight: "700", color: "white", lineHeight: 1.2, marginBottom: 12 }}>
            Bet on{" "}
            <span style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Virtual Matches
            </span>
            {" "}with USDC
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
            Fast-paced virtual football matches. New games every few minutes. Instant USDC payouts on Arc Testnet!
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {!connected && (
              <button onClick={connectWallet}
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: "600", cursor: "pointer" }}>
                🦊 Connect Wallet
              </button>
            )}
            <button onClick={() => window.scrollTo({ top: 500, behavior: "smooth" })}
              style={{ background: "transparent", color: "#e2e8f0", border: "1px solid #334155", padding: "11px 22px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
              View Matches ⬇️
            </button>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: "700", color: "white" }}>{matches.length}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>active matches</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: "700", color: "white" }}>~3 min</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>match duration</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: "700", color: "white" }}>100%</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>on-chain payouts</div>
            </div>
          </div>
        </div>

        {!isMobile && matches.length > 0 && (
          <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", width: 260, zIndex: 1 }}>
            {matches.slice(0, 2).map((match, i) => {
              const pool = match.totalHome + match.totalDraw + match.totalAway;
              const o1 = getOdds(match.totalHome, pool);
              const ox = getOdds(match.totalDraw, pool);
              const o2 = getOdds(match.totalAway, pool);
              return (
                <div key={i} style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.1)", color: "#818cf8", fontSize: 9, fontWeight: "600", padding: "2px 6px", borderRadius: 8 }}>
                      🎮 VIRTUAL
                    </div>
                    <span style={{ fontSize: 10, color: "#ef4444", fontWeight: "bold" }}>
                      ⏱️ {formatCountdown(countdowns[match.id] || 90)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: "600", marginBottom: 8 }}>
                    {match.homeTeam} vs {match.awayTeam}
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[o1, ox, o2].map((odd, idx) => (
                      <span key={idx} style={{ flex: 1, background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 0", borderRadius: 6, textAlign: "center" }}>{odd}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LEAGUE FILTER */}
      <div style={{ background: "#020617", padding: isMobile ? "8px 14px" : "8px 24px", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid #0f172a" }}>
        {LEAGUES.map(league => (
          <button key={league} onClick={() => setActiveLeague(league)}
            style={{ background: activeLeague === league ? "linear-gradient(135deg,#0ea5e9,#6366f1)" : "#0f172a", color: activeLeague === league ? "white" : "#64748b", border: "1px solid " + (activeLeague === league ? "transparent" : "#1e293b"), padding: isMobile ? "5px 12px" : "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: isMobile ? 11 : 12, whiteSpace: "nowrap", fontWeight: activeLeague === league ? "600" : "normal", flexShrink: 0 }}>
            {league}
          </button>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", maxWidth: isMobile ? "100%" : 1400, margin: "0 auto" }}>

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div style={{ width: 220, background: "#0a0f1e", borderRight: "1px solid #1e293b", flexShrink: 0 }}>
            <div style={{ padding: "12px 16px", fontSize: 10, color: "#475569", letterSpacing: 1, fontWeight: "600" }}>VIRTUAL LEAGUES</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => setActiveLeague(league)}
                style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", color: activeLeague === league ? "#38bdf8" : "#94a3b8", borderBottom: "1px solid #0f172a", display: "flex", justifyContent: "space-between", fontWeight: activeLeague === league ? "600" : "normal", background: activeLeague === league ? "#0f172a" : "transparent" }}>
                <span>{league === "All" ? "🌍 All Matches" : "🎮 " + league}</span>
                <span style={{ color: "#334155" }}>›</span>
              </div>
            ))}

            <div style={{ padding: "16px", marginTop: 12, background: "#0f172a", margin: 12, borderRadius: 10, border: "1px solid #1e293b" }}>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 8, fontWeight: "600" }}>HOW IT WORKS</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                1️⃣ Connect MetaMask<br />
                2️⃣ Pick a match<br />
                3️⃣ Choose Home/Draw/Away<br />
                4️⃣ Enter USDC amount<br />
                5️⃣ Claim winnings! 💰
              </div>
            </div>
          </div>
        )}

        {/* MATCHES */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px 72px 80px", padding: "8px 16px", background: "#0a0f1e", fontSize: 11, color: "#475569", fontWeight: "600", borderBottom: "1px solid #1e293b" }}>
              <span>MATCH</span>
              <span style={{ textAlign: "center" }}>1</span>
              <span style={{ textAlign: "center" }}>X</span>
              <span style={{ textAlign: "center" }}>2</span>
              <span style={{ textAlign: "center" }}>TIMER</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "8px 14px" : "8px 16px", background: "#020617", borderBottom: "1px solid #0f172a" }}>
            <span style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600" }}>
              🎮 Virtual Matches ({filtered.length})
            </span>
            <button onClick={() => loadMatches()}
              style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #1e293b", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              🔄 Refresh
            </button>
          </div>

          {matches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
              <div style={{ fontSize: 16, marginBottom: 8 }}>No virtual matches yet!</div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 20 }}>Connect your wallet to load matches</div>
              <button onClick={connectWallet}
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: "600", cursor: "pointer", fontSize: 14 }}>
                🦊 Connect Wallet
              </button>
            </div>
          ) : (
            Object.entries(grouped).map(([league, leagueMatches]) => (
              <div key={league}>
                <div style={{ padding: isMobile ? "8px 14px" : "8px 16px", background: "#0a0f1e", fontSize: 11, color: "#818cf8", fontWeight: "600", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  🎮 {league.toUpperCase()}
                </div>
                {leagueMatches.map((match, idx) => {
                  const pool = match.totalHome + match.totalDraw + match.totalAway;
                  const o1 = getOdds(match.totalHome, pool);
                  const ox = getOdds(match.totalDraw, pool);
                  const o2 = getOdds(match.totalAway, pool);
                  const selected = betSlip.find(b => b.matchId === match.id);
                  const countdown = countdowns[match.id] || 90;

                  return (
                    <div key={match.id} style={{ background: idx % 2 === 0 ? "#020617" : "#030a14", borderBottom: "1px solid #0f172a" }}>
                      <div style={{ padding: isMobile ? "10px 14px" : "12px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>

                        {/* MATCH INFO */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.1)", color: "#818cf8", fontSize: 9, fontWeight: "600", padding: "2px 6px", borderRadius: 8, marginBottom: 6 }}>
                            🎮 VIRTUAL • {match.league}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <TeamBadge team={match.homeTeam} size={isMobile ? 16 : 20} />
                            <span style={{ fontSize: isMobile ? 12 : 13, color: "#e2e8f0", fontWeight: "600", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {match.homeTeam}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <TeamBadge team={match.awayTeam} size={isMobile ? 16 : 20} />
                            <span style={{ fontSize: isMobile ? 12 : 13, color: "#e2e8f0", fontWeight: "600", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {match.awayTeam}
                            </span>
                          </div>
                          {match.resolved && (
                            <div style={{ marginTop: 6, fontSize: 11, color: "#4ade80", fontWeight: "600" }}>
                              ✅ Result: {resultLabel(match.result)}
                            </div>
                          )}
                        </div>

                        {/* ODDS */}
                        {!match.resolved && (
                          <div style={{ display: "flex", gap: isMobile ? 4 : 5, flexShrink: 0 }}>
                            {[{ code: 1, odds: o1, label: "1" }, { code: 2, odds: ox, label: "X" }, { code: 3, odds: o2, label: "2" }].map(opt => (
                              <button key={opt.code}
                                onClick={() => addToBetSlip(match, opt.code, opt.odds)}
                                style={{ width: isMobile ? 50 : 66, padding: isMobile ? "6px 2px" : "8px 4px", background: selected?.prediction === opt.code ? "linear-gradient(135deg,#0ea5e9,#6366f1)" : "#0f172a", color: "white", border: "1px solid " + (selected?.prediction === opt.code ? "transparent" : "#1e293b"), borderRadius: 8, cursor: "pointer", textAlign: "center" }}>
                                <div style={{ fontSize: 9, color: selected?.prediction === opt.code ? "rgba(255,255,255,0.7)" : "#64748b", marginBottom: 2 }}>{opt.label}</div>
                                <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: "bold" }}>{opt.odds}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* TIMER or CLAIM */}
                        <div style={{ minWidth: isMobile ? 40 : 70, textAlign: "center", flexShrink: 0 }}>
                          {match.resolved ? (
                            <button onClick={() => claimWinnings(match.id)}
                              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "white", border: "none", padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: isMobile ? 10 : 11, fontWeight: "600" }}>
                              💰 Claim
                            </button>
                          ) : (
                            <div>
                              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: "bold", color: countdown < 30 ? "#ef4444" : "#f59e0b" }}>
                                {formatCountdown(countdown)}
                              </div>
                              <div style={{ fontSize: 9, color: "#475569" }}>betting</div>
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
          <div style={{ height: isMobile ? 70 : 24 }} />
        </div>

        {/* DESKTOP BET SLIP */}
        {!isMobile && (
          <div style={{ width: 290, background: "#0a0f1e", borderLeft: "1px solid #1e293b", flexShrink: 0, position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto" }}>
            <BetSlipContent />
          </div>
        )}
      </div>

      {/* MOBILE BET SLIP */}
      {isMobile && showSlip && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300, background: "#0a0f1e", borderRadius: "16px 16px 0 0", border: "1px solid #1e293b" }}>
          <BetSlipContent />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0f1e", borderTop: "1px solid #1e293b", display: "flex", zIndex: 100, height: 58 }}>
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "virtual", icon: "🎮", label: "Virtual" },
            { id: "betslip", icon: "🎯", label: betSlip.length > 0 ? `Slip(${betSlip.length})` : "Slip" },
            { id: "results", icon: "📊", label: "Results" },
            { id: "account", icon: "👤", label: "Account" },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "betslip") setShowSlip(true); }}
              style={{ flex: 1, background: "transparent", border: "none", color: activeTab === tab.id ? "#38bdf8" : "#475569", cursor: "pointer", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ background: "#0a0f1e", borderTop: "1px solid #1e293b", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: "700", color: "#38bdf8" }}>DISTANT FINANCE</span>
        </div>
        <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>Virtual Sports Betting • Arc Testnet • USDC Payments</p>
      </div>

      {loading && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "white", padding: "14px 24px", borderRadius: 12, fontWeight: "bold", fontSize: 15, zIndex: 500 }}>
          ⏳ Processing transaction...
        </div>
      )}
    </div>
  );
}