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
  const [liveMatches, setLiveMatches] = useState([]);
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

  useEffect(() => {
    fetchSportsData("Football");
    loadLiveMatches();
    const interval = setInterval(() => fetchSportsData(activeSport), 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSportsData(sport) {
    setSportsLoading(true);
    try {
      let url = "";
      const today = new Date().toISOString().split("T")[0];

      if (sport === "Football") {
        url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Soccer`;
      } else if (sport === "Basketball") {
        url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Basketball`;
      } else if (sport === "Tennis") {
        url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Tennis`;
      } else if (sport === "Baseball") {
        url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Baseball`;
      } else if (sport === "Basketball") {
        url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${today}&s=Basketball`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.events) {
        const matches = data.events.slice(0, 30).map((event, idx) => ({
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
      } else {
        setSportsMatches([]);
      }
    } catch (err) {
      console.error("Sports API error:", err);
      setSportsMatches([]);
    }
    setSportsLoading(false);
  }

  async function loadLiveMatches(prov) {
    try {
      const provider = prov || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const count = await contract.matchCount();
      const loaded = [];
      for (let i = 1; i <= Number(count); i++) {
        const m = await contract.getMatch(i);
        loaded.push({
          id: i, homeTeam: m[0], awayTeam: m[1],
          league: "Arc Testnet", time: "LIVE",
          totalHome: Number(ethers.formatUnits(m[2], 6)),
          totalDraw: Number(ethers.formatUnits(m[3], 6)),
          totalAway: Number(ethers.formatUnits(m[4], 6)),
          resolved: m[5], result: Number(m[6]), isContract: true,
          sport: "Football",
        });
      }
      setLiveMatches(loaded);
    } catch { setLiveMatches([]); }
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
    loadLiveMatches(web3Provider);
  }

  function disconnectWallet() {
    setSigner(null); setConnected(false);
    setWalletAddress(""); setBetSlip([]);
  }

  function getOdds(side, pool) {
    if (!side || !pool) return (Math.random() * 2 + 1.3).toFixed(2);
    return (pool / side).toFixed(2);
  }

  function addToBetSlip(match, prediction, odds) {
    const label = prediction === 1 ? "1" : prediction === 2 ? "X" : "2";
    const exists = betSlip.find(b => b.matchId === match.id);
    if (exists) setBetSlip(betSlip.map(b => b.matchId === match.id ? { ...b, prediction, label, odds } : b));
    else setBetSlip([...betSlip, { matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, prediction, label, odds }]);
  }

  async function placeBet(matchId, prediction) {
    if (!signer) return alert("Connect wallet first!");
    if (!betAmount || betAmount <= 0) return alert("Enter amount!");
    const amountInUnits = ethers.parseUnits(betAmount.toString(), 6);
    setLoading(true);
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      await (await usdc.approve(CONTRACT_ADDRESS, amountInUnits)).wait();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      await (await contract.placeBet(matchId, prediction, amountInUnits)).wait();
      alert("✅ Bet placed!");
      loadLiveMatches();
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  }

  async function claimWinnings(matchId) {
    if (!signer) return alert("Connect wallet first!");
    setLoading(true);
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      await (await contract.claimWinnings(matchId)).wait();
      alert("💰 Winnings claimed!");
      loadLiveMatches();
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  }

  const allMatches = [...liveMatches, ...sportsMatches];
  const LEAGUES = ["All", ...new Set(sportsMatches.map(m => m.league))].slice(0, 8);
  const filtered = activeLeague === "All" ? allMatches : allMatches.filter(m => m.league === activeLeague);
  const totalOdds = betSlip.reduce((acc, b) => acc * parseFloat(b.odds || 1), 1).toFixed(2);
  const potentialWin = betAmount ? (betAmount * totalOdds).toFixed(2) : "0.00";

  const grouped = {};
  filtered.forEach(m => {
    if (!grouped[m.league]) grouped[m.league] = [];
    grouped[m.league].push(m);
  });

  const SPORTS = [
    { id: "Football", icon: "⚽" },
    { id: "Basketball", icon: "🏀" },
    { id: "Tennis", icon: "🎾" },
    { id: "Baseball", icon: "⚾" },
  ];

  const TeamLogo = ({ team, badge, size = 20 }) => {
    if (badge) return (
      <img src={badge} alt={team}
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, borderRadius: "50%" }}
        onError={e => e.target.style.display = "none"} />
    );
    if (TEAM_LOGOS[team]) return (
      <img src={TEAM_LOGOS[team]} alt={team}
        style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
        onError={e => e.target.style.display = "none"} />
    );
    return <div style={{ width: size, height: size, background: "#2a3555", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, color: "#888" }}>⚽</div>;
  };

  const MatchRow = ({ match, idx }) => {
    const pool = (match.totalHome || 0) + (match.totalDraw || 0) + (match.totalAway || 0);
    const o1 = getOdds(match.totalHome, pool);
    const ox = getOdds(match.totalDraw, pool);
    const o2 = getOdds(match.totalAway, pool);
    const selected = betSlip.find(b => b.matchId === match.id);
    const isLive = match.status === "Match Finished" || match.homeScore !== null;

    return (
      <div style={{ background: idx % 2 === 0 ? "#0a0c14" : "#0d1020", borderBottom: "1px solid #1a2035" }}>
        <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>

          {/* TIME/STATUS */}
          <div style={{ minWidth: isMobile ? 36 : 46, textAlign: "center", flexShrink: 0 }}>
            {match.isContract ? (
              <div style={{ fontSize: 10, color: "#00ff88", fontWeight: "bold" }}>🔴 LIVE</div>
            ) : isLive ? (
              <div>
                <div style={{ fontSize: 11, color: "#ff6b35", fontWeight: "bold" }}>
                  {match.homeScore ?? 0} - {match.awayScore ?? 0}
                </div>
                <div style={{ fontSize: 9, color: "#ff6b35" }}>FT</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>{match.time}</div>
                <div style={{ fontSize: 9, color: "#555" }}>{match.date?.slice(5)}</div>
              </div>
            )}
          </div>

          {/* TEAMS */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <TeamLogo team={match.homeTeam} badge={match.homeBadge} size={isMobile ? 16 : 20} />
              <span style={{ fontSize: isMobile ? 12 : 13, color: "#ddd", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {match.homeTeam}
              </span>
              {isLive && <span style={{ fontSize: 12, color: "#ddd", fontWeight: "bold" }}>{match.homeScore ?? 0}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TeamLogo team={match.awayTeam} badge={match.awayBadge} size={isMobile ? 16 : 20} />
              <span style={{ fontSize: isMobile ? 12 : 13, color: "#ddd", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {match.awayTeam}
              </span>
              {isLive && <span style={{ fontSize: 12, color: "#ddd", fontWeight: "bold" }}>{match.awayScore ?? 0}</span>}
            </div>
          </div>

          {/* ODDS */}
          <div style={{ display: "flex", gap: isMobile ? 3 : 5, alignItems: "center", flexShrink: 0 }}>
            {[{ code: 1, odds: o1, label: "1" }, { code: 2, odds: ox, label: "X" }, { code: 3, odds: o2, label: "2" }].map(opt => (
              <button key={opt.code}
                onClick={() => { addToBetSlip(match, opt.code, opt.odds); if (match.isContract) placeBet(match.id, opt.code); }}
                style={{
                  width: isMobile ? 48 : 62,
                  padding: isMobile ? "5px 2px" : "7px 4px",
                  background: selected?.prediction === opt.code ? "#00d4ff" : "#1a2035",
                  color: selected?.prediction === opt.code ? "#0a0c14" : "#ddd",
                  border: "1px solid " + (selected?.prediction === opt.code ? "#00d4ff" : "#2a3555"),
                  borderRadius: 6, cursor: "pointer", textAlign: "center",
                }}>
                <div style={{ fontSize: 9, color: selected?.prediction === opt.code ? "#0a0c14" : "#888", marginBottom: 1 }}>{opt.label}</div>
                <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: "bold" }}>{opt.odds}</div>
              </button>
            ))}
            {!isMobile && <div style={{ color: "#555", fontSize: 11, width: 28, textAlign: "center" }}>+</div>}
          </div>
        </div>

        {match.resolved && (
          <div style={{ padding: "0 12px 10px" }}>
            <button onClick={() => claimWinnings(match.id)}
              style={{ width: "100%", padding: 8, background: "#f4a261", color: "white", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>
              💰 Claim Winnings
            </button>
          </div>
        )}
      </div>
    );
  };

  const BetSlipPanel = () => (
    <div style={{ background: "#0d1526", borderRadius: isMobile ? "16px 16px 0 0" : 12, border: "1px solid #1a2035", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #00b4d8, #0077b6)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: "bold", fontSize: 15 }}>🎯 Bet Slip ({betSlip.length})</span>
        {isMobile && <button onClick={() => setShowSlip(false)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>}
      </div>
      <div style={{ padding: 14, maxHeight: isMobile ? "60vh" : "none", overflowY: "auto" }}>
        {betSlip.length === 0 ? (
          <p style={{ color: "#555", textAlign: "center", fontSize: 13, padding: "20px 0" }}>Click odds to add selections</p>
        ) : betSlip.map((bet, i) => (
          <div key={i} style={{ background: "#1a2035", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #2a3555" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#ddd" }}>{bet.homeTeam} vs {bet.awayTeam}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {bet.label === "1" ? "🏠 Home Win" : bet.label === "X" ? "🤝 Draw" : "✈️ Away Win"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: "bold", color: "#00d4ff" }}>{bet.odds}</span>
                <button onClick={() => setBetSlip(betSlip.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Stake (USDC)</div>
          <input type="number" placeholder="Enter amount" value={betAmount} onChange={e => setBetAmount(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #2a3555", background: "#0a0c14", color: "white", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        <div style={{ background: "#1a2035", borderRadius: 8, padding: 12, marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#888", fontSize: 13 }}>Total Odds</span>
            <span style={{ color: "#00d4ff", fontWeight: "bold" }}>{totalOdds}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888", fontSize: 13 }}>Potential Win</span>
            <span style={{ color: "#00ff88", fontWeight: "bold", fontSize: 15 }}>{potentialWin} USDC</span>
          </div>
        </div>

        <button onClick={() => connected ? alert("Use bet buttons on Arc Testnet matches to place real bets!") : connectWallet()}
          style={{ width: "100%", marginTop: 12, padding: 13, background: "linear-gradient(135deg, #00b4d8, #0077b6)", color: "white", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer", fontSize: 15 }}>
          {connected ? "🎯 Place Bet" : "🦊 Connect Wallet"}
        </button>

        <button onClick={() => { setBetSlip([]); setShowSlip(false); }}
          style={{ width: "100%", marginTop: 6, padding: 8, background: "transparent", color: "#555", border: "1px solid #1a2035", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
          Clear All
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#0a0c14", minHeight: "100vh", color: "white", fontFamily: "Arial, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: "#0d1526", padding: isMobile ? "10px 14px" : "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, borderBottom: "2px solid #00d4ff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isMobile && (
            <button onClick={() => setShowMenu(!showMenu)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer", padding: 0 }}>☰</button>
          )}
          <img src="/logo.png" alt="logo" style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: isMobile ? 13 : 18, fontWeight: "bold", color: "#00d4ff" }}>DISTANT FINANCE</div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 2 }}>DECENTRALIZED BETTING</div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 20 }}>
            {["Sports", "Live Betting", "Jackpot", "Livescore", "Results"].map(t => (
              <span key={t} style={{ fontSize: 13, cursor: "pointer", color: t === "Sports" ? "#00d4ff" : "#888", borderBottom: t === "Sports" ? "2px solid #00d4ff" : "none", paddingBottom: 4 }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {betSlip.length > 0 && (
            <button onClick={() => setShowSlip(!showSlip)}
              style={{ background: "#00d4ff", color: "#0a0c14", border: "none", padding: isMobile ? "6px 10px" : "8px 14px", borderRadius: 6, fontSize: isMobile ? 12 : 13, fontWeight: "bold", cursor: "pointer" }}>
              🎯 {betSlip.length}
            </button>
          )}
          {connected ? (
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ background: "#1a2035", border: "1px solid #00d4ff", padding: isMobile ? "6px 8px" : "8px 14px", borderRadius: 6, fontSize: isMobile ? 11 : 13, color: "#00d4ff", fontWeight: "bold" }}>
                🦊 {walletAddress}
              </div>
              {!isMobile && (
                <button onClick={disconnectWallet}
                  style={{ background: "#e63946", color: "white", border: "none", padding: "8px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={connectWallet}
                style={{ background: "#00d4ff", color: "#0a0c14", border: "none", padding: isMobile ? "7px 12px" : "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: isMobile ? 12 : 13 }}>
                🦊 {isMobile ? "Connect" : "Connect Wallet"}
              </button>
              {!isMobile && (
                <button onClick={connectWallet}
                  style={{ background: "transparent", color: "#00d4ff", border: "1px solid #00d4ff", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>
                  Register
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobile && showMenu && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 200 }}>
          <div onClick={() => setShowMenu(false)} style={{ position: "absolute", width: "100%", height: "100%", background: "rgba(0,0,0,0.7)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 270, height: "100%", background: "#0d1526", padding: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ color: "#00d4ff", fontWeight: "bold", fontSize: 16 }}>DISTANT FINANCE</span>
              <button onClick={() => setShowMenu(false)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {connected ? (
              <div style={{ background: "#1a2035", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #00d4ff" }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Connected</div>
                <div style={{ fontSize: 13, color: "#00d4ff", fontWeight: "bold" }}>🦊 {walletAddress}</div>
                <button onClick={() => { disconnectWallet(); setShowMenu(false); }}
                  style={{ marginTop: 10, width: "100%", padding: 8, background: "#e63946", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={() => { connectWallet(); setShowMenu(false); }}
                style={{ width: "100%", padding: 12, background: "#00d4ff", color: "#0a0c14", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", fontSize: 15, marginBottom: 20 }}>
                🦊 Connect Wallet
              </button>
            )}

            <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 8 }}>SPORTS</div>
            {SPORTS.map(sport => (
              <div key={sport.id} onClick={() => { setActiveSport(sport.id); fetchSportsData(sport.id); setShowMenu(false); }}
                style={{ padding: "12px 8px", fontSize: 14, color: activeSport === sport.id ? "#00d4ff" : "#ccc", cursor: "pointer", borderBottom: "1px solid #1a2035", fontWeight: activeSport === sport.id ? "bold" : "normal" }}>
                {sport.icon} {sport.id}
              </div>
            ))}

            <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 8, marginTop: 20 }}>LEAGUES</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => { setActiveLeague(league); setShowMenu(false); }}
                style={{ padding: "10px 8px", fontSize: 13, color: activeLeague === league ? "#00d4ff" : "#ccc", cursor: "pointer", borderBottom: "1px solid #1a2035" }}>
                {league === "All" ? "🌍 All" : "🏆 " + league}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPORT TABS */}
      <div style={{ background: "#050608", padding: isMobile ? "8px 12px" : "0 24px", display: "flex", gap: isMobile ? 6 : 0, borderBottom: "1px solid #111", overflowX: "auto" }}>
        {SPORTS.map(sport => (
          <button key={sport.id}
            onClick={() => { setActiveSport(sport.id); fetchSportsData(sport.id); setActiveLeague("All"); }}
            style={{
              background: isMobile ? (activeSport === sport.id ? "#00d4ff" : "#0d1526") : "transparent",
              color: activeSport === sport.id ? (isMobile ? "#0a0c14" : "#00d4ff") : "#888",
              border: isMobile ? "1px solid " + (activeSport === sport.id ? "#00d4ff" : "#1a2035") : "none",
              borderBottom: !isMobile ? (activeSport === sport.id ? "2px solid #00d4ff" : "2px solid transparent") : "none",
              padding: isMobile ? "6px 14px" : "10px 16px",
              borderRadius: isMobile ? 20 : 0,
              cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
              fontWeight: activeSport === sport.id ? "bold" : "normal",
              flexShrink: 0,
            }}>
            {sport.icon} {sport.id}
          </button>
        ))}
      </div>

      {/* LEAGUE FILTER */}
      <div style={{ display: "flex", gap: 6, padding: isMobile ? "8px 12px" : "8px 24px", overflowX: "auto", background: "#050608", borderBottom: "1px solid #111" }}>
        {LEAGUES.map(league => (
          <button key={league} onClick={() => setActiveLeague(league)}
            style={{ background: activeLeague === league ? "#00d4ff" : "#0d1526", color: activeLeague === league ? "#0a0c14" : "#888", border: "1px solid " + (activeLeague === league ? "#00d4ff" : "#1a2035"), padding: isMobile ? "5px 10px" : "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: isMobile ? 11 : 12, whiteSpace: "nowrap", fontWeight: activeLeague === league ? "bold" : "normal", flexShrink: 0 }}>
            {league}
          </button>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", maxWidth: isMobile ? "100%" : 1300, margin: "0 auto" }}>

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div style={{ width: 210, background: "#0d1526", borderRight: "1px solid #111", flexShrink: 0 }}>
            <div style={{ padding: "10px 16px", fontSize: 11, color: "#555", letterSpacing: 1, fontWeight: "bold" }}>POPULAR</div>
            {LEAGUES.map(league => (
              <div key={league} onClick={() => setActiveLeague(league)}
                style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", color: activeLeague === league ? "#00d4ff" : "#ccc", borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between", fontWeight: activeLeague === league ? "bold" : "normal" }}
                onMouseEnter={e => e.currentTarget.style.background = "#1a2035"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span>{league === "All" ? "🌍 All Matches" : "🏆 " + league}</span>
                <span style={{ color: "#555" }}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* MATCHES */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "8px 12px" : "8px 16px", background: "#050608", borderBottom: "1px solid #111" }}>
            <span style={{ color: "#00d4ff", fontSize: 13, fontWeight: "bold" }}>
              {sportsLoading ? "⏳ Loading matches..." : `🔴 ${activeLeague === "All" ? "All Matches" : activeLeague} (${filtered.length})`}
            </span>
            <button onClick={() => fetchSportsData(activeSport)}
              style={{ background: "#0d1526", color: "#00d4ff", border: "1px solid #1a2035", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              🔄 Refresh
            </button>
          </div>

          {sportsLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#555" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div>Loading live {activeSport} matches...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#555" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div>No {activeSport} matches found today</div>
              <button onClick={() => fetchSportsData(activeSport)}
                style={{ marginTop: 12, background: "#00d4ff", color: "#0a0c14", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>
                🔄 Try Again
              </button>
            </div>
          ) : (
            Object.entries(grouped).map(([league, matches]) => (
              <div key={league}>
                <div style={{ padding: isMobile ? "7px 12px" : "8px 16px", background: "#050608", fontSize: 12, color: "#00d4ff", fontWeight: "bold", borderTop: "1px solid #111", borderBottom: "1px solid #111" }}>
                  🏆 {league}
                </div>
                {matches.map((match, idx) => <MatchRow key={match.id} match={match} idx={idx} />)}
              </div>
            ))
          )}
          <div style={{ height: isMobile ? 70 : 20 }} />
        </div>

        {/* DESKTOP BET SLIP */}
        {!isMobile && (
          <div style={{ width: 280, flexShrink: 0, padding: 12, position: "sticky", top: 60, height: "fit-content" }}>
            <BetSlipPanel />
          </div>
        )}
      </div>

      {/* MOBILE BET SLIP */}
      {isMobile && showSlip && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300, boxShadow: "0 -4px 20px rgba(0,212,255,0.3)" }}>
          <BetSlipPanel />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d1526", borderTop: "1px solid #1a2035", display: "flex", zIndex: 100, height: 58 }}>
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "live", icon: "🔴", label: "Live" },
            { id: "betslip", icon: "🎯", label: betSlip.length > 0 ? `Slip(${betSlip.length})` : "Slip" },
            { id: "results", icon: "📊", label: "Results" },
            { id: "account", icon: "👤", label: "Account" },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "betslip") setShowSlip(true); }}
              style={{ flex: 1, background: "transparent", border: "none", color: activeTab === tab.id ? "#00d4ff" : "#555", cursor: "pointer", fontSize: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ background: "#050608", borderTop: "1px solid #111", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <img src="/logo.png" alt="logo" style={{ width: 22, height: 22, borderRadius: 4 }} />
          <span style={{ fontSize: 14, fontWeight: "bold", color: "#00d4ff" }}>DISTANT FINANCE</span>
        </div>
        <p style={{ color: "#444", fontSize: 12, margin: 0 }}>Decentralized Sports Betting • Arc Testnet • USDC Payments</p>
      </div>

      {loading && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#00d4ff", color: "#0a0c14", padding: "14px 24px", borderRadius: 12, fontWeight: "bold", fontSize: 15, zIndex: 500 }}>
          ⏳ Processing...
        </div>
      )}
    </div>
  );
}