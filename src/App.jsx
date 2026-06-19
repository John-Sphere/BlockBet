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

const SPORTS = [
  { id: "Football", icon: "⚽" },
  { id: "Basketball", icon: "🏀" },
  { id: "Tennis", icon: "🎾" },
  { id: "Baseball", icon: "⚾" },
];

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
  const [sportsMatches, setSportsMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [betSlip, setBetSlip] = useState([]);
  const [showSlip, setShowSlip] = useState(false);
  const [activeLeague, setActiveLeague] = useState("All");
  const [activeSport, setActiveSport] = useState("Football");
  const [activeTab, setActiveTab] = useState("home");
  const [betAmount, setBetAmount] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState({ matches: 0, pools: 0, bettors: 3891 });

  useEffect(() => {
    fetchSportsData("Football");
    const interval = setInterval(() => fetchSportsData(activeSport), 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSportsData(sport) {
    setSportsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const sportMap = {
        Football: "Soccer",
        Basketball: "Basketball",
        Tennis: "Tennis",
        Baseball: "Baseball",
      };
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=${sportMap[sport]}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.events) {
        const matches = data.events.slice(0, 40).map((event, idx) => ({
          id: "s" + idx,
          homeTeam: event.strHomeTeam,
          awayTeam: event.strAwayTeam,
          league: event.strLeague,
          time: event.strTime ? event.strTime.slice(0, 5) : "TBD",
          date: event.dateEvent,
          homeScore: event.intHomeScore,
          awayScore: event.intAwayScore,
          status: event.strStatus,
          homeBadge: event.strHomeTeamBadge,
          awayBadge: event.strAwayTeamBadge,
          totalHome: Math.floor(Math.random() * 5000) + 500,
          totalDraw: Math.floor(Math.random() * 2000) + 200,
          totalAway: Math.floor(Math.random() * 4000) + 400,
          resolved: false,
          isReal: true,
          sport,
        }));
        setSportsMatches(matches);
        setStats(s => ({ ...s, matches: matches.length, pools: matches.reduce((a, m) => a + m.totalHome + m.totalDraw + m.totalAway, 0) }));
      } else {
        setSportsMatches([]);
      }
    } catch { setSportsMatches([]); }
    setSportsLoading(false);
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
  }

  function disconnectWallet() {
    setSigner(null); setConnected(false);
    setWalletAddress(""); setBetSlip([]);
  }

  function getOdds(side, pool) {
    if (!side || !pool) return (Math.random() * 3 + 1.3).toFixed(2);
    return Math.max(1.01, (pool / side)).toFixed(2);
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

  const filtered = activeLeague === "All" ? sportsMatches : sportsMatches.filter(m => m.league === activeLeague);
  const LEAGUES = ["All", ...new Set(sportsMatches.map(m => m.league))].slice(0, 8);
  const totalOdds = betSlip.reduce((acc, b) => acc * parseFloat(b.odds || 1), 1);
  const potentialWin = betAmount ? (betAmount * totalOdds).toFixed(2) : "0.00";

  const grouped = {};
  filtered.forEach(m => {
    if (!grouped[m.league]) grouped[m.league] = [];
    grouped[m.league].push(m);
  });

  const TeamBadge = ({ team, badge, size = 22 }) => {
    if (badge) return <img src={badge} alt={team} style={{ width: size, height: size, objectFit: "contain", borderRadius: "50%" }} onError={e => e.target.style.display = "none"} />;
    if (TEAM_LOGOS[team]) return <img src={TEAM_LOGOS[team]} alt={team} style={{ width: size, height: size, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />;
    return <div style={{ width: size, height: size, background: "#1e293b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>⚽</div>;
  };

  const isLiveMatch = (match) => match.homeScore !== null && match.status !== "Match Finished";
  const isFinished = (match) => match.status === "Match Finished";

  const BetSlipContent = () => (
    <div style={{ height: "100%" }}>
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
            <div style={{ fontSize: 13 }}>Click on any odds to add to your slip</div>
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
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ margin: "14px 0" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Stake amount (USDC)</div>
              <input type="number" placeholder="Enter amount..."
                value={betAmount} onChange={e => setBetAmount(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#0f172a", color: "white", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
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

            <button onClick={() => connected ? alert("Place bet on Arc Testnet matches!") : connectWallet()}
              style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", borderRadius: 10, fontWeight: "600", cursor: "pointer", fontSize: 15 }}>
              {connected ? "🎯 Place Bet" : "🦊 Connect Wallet"}
            </button>

            <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              🔒 Secured by Arc Testnet
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "white", fontFamily: "'Inter', Arial, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: isMobile ? "10px 14px" : "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? "auto" : 56 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>☰</button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/logo.png" alt="logo" style={{ width: 26, height: 26, objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: "700", background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  DISTANT FINANCE
                </div>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2 }}>DECENTRALIZED BETTING</div>
              </div>
            </div>
          </div>

          {!isMobile && (
            <div style={{ display: "flex", gap: 24 }}>
              {["Sports", "Live Betting", "Jackpot", "Livescore", "Results"].map(t => (
                <span key={t} style={{ fontSize: 13, cursor: "pointer", color: t === "Sports" ? "#38bdf8" : "#64748b", borderBottom: t === "Sports" ? "2px solid #38bdf8" : "none", padding: "18px 0", display: "inline-block" }}>{t}</span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {betSlip.length > 0 && (
              <button onClick={() => setShowSlip(!showSlip)}
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                🎯 <span>{betSlip.length}</span>
              </button>
            )}
            {connected ? (
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: "#0f172a", border: "1px solid #1e3a5f", padding: isMobile ? "6px 10px" : "7px 14px", borderRadius: 8, fontSize: 12, color: "#38bdf8", fontWeight: "600", display: "flex", alignItems: "center", gap: 6 }}>
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
              <span style={{ fontSize: 15, fontWeight: "700", background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DISTANT FINANCE</span>
              <button onClick={() => setShowMenu(false)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {connected ? (
              <div style={{ background: "#0f172a", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Connected wallet</div>
                <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: "600" }}>🦊 {walletAddress}</div>
                <button onClick={() => { disconnectWallet(); setShowMenu(false); }}
                  style={{ marginTop: 10, width: "100%", padding: 8, background: "#1e1e2e", color: "#ef4444", border: "1px solid #3f1515", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => { connectWallet(); setShowMenu(false); }}
                style={{ width: "100%", padding: 12, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", borderRadius: 8, fontWeight: "600", cursor: "pointer", fontSize: 14, marginBottom: 20 }}>
                🦊 Connect Wallet
              </button>
            )}

            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1, marginBottom: 10, fontWeight: "600" }}>SPORTS</div>
            {SPORTS.map(sport => (
              <div key={sport.id} onClick={() => { setActiveSport(sport.id); fetchSportsData(sport.id); setActiveLeague("All"); setShowMenu(false); }}
                style={{ padding: "12px 8px", fontSize: 14, color: activeSport === sport.id ? "#38bdf8" : "#94a3b8", cursor: "pointer", borderBottom: "1px solid #0f172a", fontWeight: activeSport === sport.id ? "600" : "normal", display: "flex", alignItems: "center", gap: 8 }}>
                {sport.icon} {sport.id}
              </div>
            ))}

            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1, marginBottom: 10, marginTop: 20, fontWeight: "600" }}>LEAGUES</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => { setActiveLeague(league); setShowMenu(false); }}
                style={{ padding: "10px 8px", fontSize: 13, color: activeLeague === league ? "#38bdf8" : "#94a3b8", cursor: "pointer", borderBottom: "1px solid #0f172a", fontWeight: activeLeague === league ? "600" : "normal" }}>
                {league === "All" ? "🌍 All Matches" : "🏆 " + league}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS BAR */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: isMobile ? "10px 14px" : "10px 24px" }}>
        <div style={{ display: "flex", gap: isMobile ? 12 : 24, overflowX: "auto" }}>
          {[
            { label: "Live matches", value: stats.matches, icon: "🔴" },
            { label: "USDC in pools", value: stats.pools.toLocaleString(), icon: "💰" },
            { label: "Active bettors", value: stats.bettors.toLocaleString(), icon: "👥" },
            { label: "Network", value: "Arc Testnet", icon: "⛓️" },
          ].map(stat => (
            <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: "600", color: "#e2e8f0" }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>{stat.label}</div>
              </div>
              {!isMobile && <div style={{ width: 1, height: 28, background: "#1e293b", marginLeft: 12 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* SPORTS TABS */}
      <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: isMobile ? "8px 14px" : "0 24px", display: "flex", gap: isMobile ? 6 : 0, overflowX: "auto" }}>
        {SPORTS.map(sport => (
          <button key={sport.id}
            onClick={() => { setActiveSport(sport.id); fetchSportsData(sport.id); setActiveLeague("All"); }}
            style={{
              background: isMobile ? (activeSport === sport.id ? "linear-gradient(135deg,#0ea5e9,#6366f1)" : "#0f172a") : "transparent",
              color: activeSport === sport.id ? (isMobile ? "white" : "#38bdf8") : "#64748b",
              border: isMobile ? "none" : "none",
              borderBottom: !isMobile ? (activeSport === sport.id ? "2px solid #38bdf8" : "2px solid transparent") : "none",
              padding: isMobile ? "7px 14px" : "12px 16px",
              borderRadius: isMobile ? 20 : 0,
              cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
              fontWeight: activeSport === sport.id ? "600" : "normal",
              flexShrink: 0,
            }}>
            {sport.icon} {sport.id}
          </button>
        ))}
      </div>

      {/* LEAGUE FILTER */}
      <div style={{ background: "#020617", padding: isMobile ? "8px 14px" : "8px 24px", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid #0f172a" }}>
        {LEAGUES.map(league => (
          <button key={league} onClick={() => setActiveLeague(league)}
            style={{
              background: activeLeague === league ? "linear-gradient(135deg,#0ea5e9,#6366f1)" : "#0f172a",
              color: activeLeague === league ? "white" : "#64748b",
              border: "1px solid " + (activeLeague === league ? "transparent" : "#1e293b"),
              padding: isMobile ? "5px 12px" : "6px 14px",
              borderRadius: 20, cursor: "pointer", fontSize: isMobile ? 11 : 12,
              whiteSpace: "nowrap", fontWeight: activeLeague === league ? "600" : "normal",
              flexShrink: 0,
            }}>
            {league}
          </button>
        ))}
      </div>

      {/* HERO BANNER */}
      <div style={{ background: "#020617", padding: isMobile ? "24px 16px" : "40px 24px", position: "relative", overflow: "hidden", borderBottom: "1px solid #1e293b" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "#0ea5e9", opacity: 0.12, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 260, height: 260, borderRadius: "50%", background: "#6366f1", opacity: 0.1, filter: "blur(40px)" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 480 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8", fontSize: 12, fontWeight: "600", padding: "5px 12px", borderRadius: 20, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, background: "#38bdf8", borderRadius: "50%" }} />
            Live on Arc Testnet
          </div>

          <div style={{ fontSize: isMobile ? 22 : 32, fontWeight: "700", color: "white", lineHeight: 1.2, marginBottom: 12 }}>
            Bet on sports with{" "}
            <span style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              real USDC
            </span>
            , fully on-chain
          </div>

          <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
            Transparent odds, instant payouts, zero middlemen. Connect your wallet and start betting on real matches today.
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {!connected && (
              <button onClick={connectWallet}
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)", color: "white", border: "none", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                🦊 Connect Wallet
              </button>
            )}
            <button onClick={() => window.scrollTo({ top: isMobile ? 400 : 300, behavior: "smooth" })}
              style={{ background: "transparent", color: "#e2e8f0", border: "1px solid #334155", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: "500", cursor: "pointer" }}>
              View Matches
            </button>
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: "700", color: "white" }}>{stats.pools.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>USDC in pools</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: "700", color: "white" }}>{stats.bettors.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>active bettors</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: "700", color: "white" }}>100%</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>on-chain payouts</div>
            </div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", width: 260, zIndex: 1 }}>
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 9, fontWeight: "600", padding: "2px 6px", borderRadius: 8, marginBottom: 8 }}>
                <div style={{ width: 4, height: 4, background: "#ef4444", borderRadius: "50%" }} /> LIVE
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: "500" }}>Man United</span>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 8px", borderRadius: 6 }}>2.10</span>
                  <span style={{ background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 8px", borderRadius: 6 }}>3.40</span>
                  <span style={{ background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 8px", borderRadius: 6 }}>2.85</span>
                </div>
              </div>
            </div>
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: "500" }}>Barcelona</span>
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 8px", borderRadius: 6 }}>1.96</span>
                  <span style={{ background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 8px", borderRadius: 6 }}>3.80</span>
                  <span style={{ background: "#1e293b", color: "#38bdf8", fontSize: 11, fontWeight: "600", padding: "4px 8px", borderRadius: 6 }}>4.20</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div style={{ width: 220, background: "#0a0f1e", borderRight: "1px solid #1e293b", flexShrink: 0, minHeight: "calc(100vh - 160px)" }}>
            <div style={{ padding: "12px 16px", fontSize: 10, color: "#475569", letterSpacing: 1, fontWeight: "600" }}>POPULAR</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => setActiveLeague(league)}
                style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", color: activeLeague === league ? "#38bdf8" : "#94a3b8", borderBottom: "1px solid #0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: activeLeague === league ? "600" : "normal", background: activeLeague === league ? "#0f172a" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "#0f172a"}
                onMouseLeave={e => e.currentTarget.style.background = activeLeague === league ? "#0f172a" : "transparent"}>
                <span>{league === "All" ? "🌍 All Matches" : "🏆 " + league}</span>
                <span style={{ color: "#334155", fontSize: 16 }}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* MATCHES */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* TABLE HEADER */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 72px 72px 36px", padding: "8px 16px", background: "#0a0f1e", fontSize: 11, color: "#475569", fontWeight: "600", letterSpacing: 0.5, borderBottom: "1px solid #1e293b" }}>
              <span>MATCH</span>
              <span style={{ textAlign: "center" }}>1</span>
              <span style={{ textAlign: "center" }}>X</span>
              <span style={{ textAlign: "center" }}>2</span>
              <span></span>
            </div>
          )}

          {/* REFRESH BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "8px 14px" : "8px 16px", background: "#020617", borderBottom: "1px solid #0f172a" }}>
            <span style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600", display: "flex", alignItems: "center", gap: 6 }}>
              {sportsLoading ? "⏳ Loading..." : `🔴 ${activeLeague === "All" ? "All Matches" : activeLeague} (${filtered.length})`}
            </span>
            <button onClick={() => fetchSportsData(activeSport)}
              style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #1e293b", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
              🔄 Refresh
            </button>
          </div>

          {sportsLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14 }}>Loading {activeSport} matches...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14 }}>No matches found today</div>
              <button onClick={() => fetchSportsData(activeSport)}
                style={{ marginTop: 16, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "white", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: "600" }}>
                Try Again
              </button>
            </div>
          ) : (
            Object.entries(grouped).map(([league, matches]) => (
              <div key={league}>
                <div style={{ padding: isMobile ? "8px 14px" : "8px 16px", background: "#0a0f1e", fontSize: 11, color: "#94a3b8", fontWeight: "600", letterSpacing: 0.5, borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  🏆 {league.toUpperCase()}
                </div>
                {matches.map((match, idx) => {
                  const pool = (match.totalHome || 0) + (match.totalDraw || 0) + (match.totalAway || 0);
                  const o1 = getOdds(match.totalHome, pool);
                  const ox = getOdds(match.totalDraw, pool);
                  const o2 = getOdds(match.totalAway, pool);
                  const selected = betSlip.find(b => b.matchId === match.id);
                  const live = isLiveMatch(match);
                  const finished = isFinished(match);

                  return (
                    <div key={match.id} style={{ background: idx % 2 === 0 ? "#020617" : "#030a14", borderBottom: "1px solid #0f172a", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#0a0f1e"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#020617" : "#030a14"}>
                      <div style={{ padding: isMobile ? "10px 14px" : "12px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>

                        {/* TIME */}
                        <div style={{ minWidth: isMobile ? 38 : 48, textAlign: "center", flexShrink: 0 }}>
                          {live ? (
                            <div>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#1a0a0a", color: "#ef4444", fontSize: 10, fontWeight: "bold", padding: "2px 6px", borderRadius: 10, border: "1px solid #3f1515" }}>
                                <div style={{ width: 5, height: 5, background: "#ef4444", borderRadius: "50%" }} />
                                LIVE
                              </div>
                              <div style={{ fontSize: 12, fontWeight: "bold", color: "#e2e8f0", marginTop: 2 }}>
                                {match.homeScore ?? 0} - {match.awayScore ?? 0}
                              </div>
                            </div>
                          ) : finished ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: "bold", color: "#94a3b8" }}>
                                {match.homeScore ?? 0} - {match.awayScore ?? 0}
                              </div>
                              <div style={{ fontSize: 10, color: "#475569" }}>FT</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: "600" }}>{match.time}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>{match.date?.slice(5)}</div>
                            </div>
                          )}
                        </div>

                        {/* TEAMS */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <TeamBadge team={match.homeTeam} badge={match.homeBadge} size={isMobile ? 18 : 22} />
                            <span style={{ fontSize: isMobile ? 12 : 13, color: "#e2e8f0", fontWeight: "500", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {match.homeTeam}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <TeamBadge team={match.awayTeam} badge={match.awayBadge} size={isMobile ? 18 : 22} />
                            <span style={{ fontSize: isMobile ? 12 : 13, color: "#e2e8f0", fontWeight: "500", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {match.awayTeam}
                            </span>
                          </div>
                        </div>

                        {/* ODDS */}
                        <div style={{ display: "flex", gap: isMobile ? 4 : 5, flexShrink: 0 }}>
                          {[{ code: 1, odds: o1, label: "1" }, { code: 2, odds: ox, label: "X" }, { code: 3, odds: o2, label: "2" }].map(opt => (
                            <button key={opt.code}
                              onClick={() => addToBetSlip(match, opt.code, opt.odds)}
                              style={{
                                width: isMobile ? 50 : 66,
                                padding: isMobile ? "6px 2px" : "8px 4px",
                                background: selected?.prediction === opt.code ? "linear-gradient(135deg,#0ea5e9,#6366f1)" : "#0f172a",
                                color: "white",
                                border: "1px solid " + (selected?.prediction === opt.code ? "transparent" : "#1e293b"),
                                borderRadius: 8, cursor: "pointer", textAlign: "center",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={e => { if (selected?.prediction !== opt.code) e.currentTarget.style.borderColor = "#38bdf8"; }}
                              onMouseLeave={e => { if (selected?.prediction !== opt.code) e.currentTarget.style.borderColor = "#1e293b"; }}>
                              <div style={{ fontSize: 9, color: selected?.prediction === opt.code ? "rgba(255,255,255,0.7)" : "#64748b", marginBottom: 2 }}>{opt.label}</div>
                              <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: "bold" }}>{opt.odds}</div>
                            </button>
                          ))}
                          {!isMobile && <div style={{ color: "#334155", fontSize: 11, width: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>+</div>}
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
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300, background: "#0a0f1e", borderRadius: "16px 16px 0 0", border: "1px solid #1e293b", boxShadow: "0 -8px 32px rgba(14,165,233,0.15)" }}>
          <BetSlipContent />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0f1e", borderTop: "1px solid #1e293b", display: "flex", zIndex: 100, height: 58 }}>
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "live", icon: "🔴", label: "Live" },
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
          <span style={{ fontSize: 14, fontWeight: "700", background: "linear-gradient(90deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DISTANT FINANCE</span>
        </div>
        <p style={{ color: "#334155", fontSize: 12, margin: 0 }}>Decentralized Sports Betting • Arc Testnet • USDC Payments</p>
      </div>

      {loading && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "white", padding: "14px 24px", borderRadius: 12, fontWeight: "bold", fontSize: 15, zIndex: 500 }}>
          ⏳ Processing...
        </div>
      )}
    </div>
  );
}