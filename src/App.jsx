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

const ALL_MATCHES = [
  { id: "d1", homeTeam: "Man United", awayTeam: "Arsenal", league: "England Premier League", time: "32:14", totalHome: 1200, totalDraw: 450, totalAway: 890, resolved: false, result: 0 },
  { id: "d2", homeTeam: "Liverpool", awayTeam: "Chelsea", league: "England Premier League", time: "67:22", totalHome: 2100, totalDraw: 760, totalAway: 1800, resolved: false, result: 0 },
  { id: "d3", homeTeam: "Man City", awayTeam: "Tottenham", league: "England Premier League", time: "15:44", totalHome: 3100, totalDraw: 540, totalAway: 700, resolved: false, result: 0 },
  { id: "d4", homeTeam: "Barcelona", awayTeam: "Real Madrid", league: "Spain La Liga", time: "44:08", totalHome: 3200, totalDraw: 980, totalAway: 2100, resolved: false, result: 0 },
  { id: "d5", homeTeam: "Atletico Madrid", awayTeam: "Barcelona", league: "Spain La Liga", time: "78:33", totalHome: 1400, totalDraw: 880, totalAway: 2200, resolved: false, result: 0 },
  { id: "d6", homeTeam: "Bayern Munich", awayTeam: "Dortmund", league: "Germany Bundesliga", time: "55:19", totalHome: 1800, totalDraw: 540, totalAway: 900, resolved: false, result: 0 },
  { id: "d7", homeTeam: "PSG", awayTeam: "Juventus", league: "Champions League", time: "23:51", totalHome: 2800, totalDraw: 820, totalAway: 1500, resolved: false, result: 0 },
  { id: "d8", homeTeam: "Inter Milan", awayTeam: "AC Milan", league: "Italy Serie A", time: "61:07", totalHome: 1900, totalDraw: 700, totalAway: 1300, resolved: false, result: 0 },
  { id: "d9", homeTeam: "Chelsea", awayTeam: "Tottenham", league: "England Premier League", time: "88:02", totalHome: 1600, totalDraw: 620, totalAway: 1100, resolved: false, result: 0 },
  { id: "d10", homeTeam: "Real Madrid", awayTeam: "Bayern Munich", league: "Champions League", time: "12:34", totalHome: 2600, totalDraw: 910, totalAway: 1700, resolved: false, result: 0 },
];

export default function App() {
  const [signer, setSigner] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [betSlip, setBetSlip] = useState([]);
  const [showSlip, setShowSlip] = useState(false);
  const [activeTab, setActiveTab] = useState("Football");
  const [activeLeague, setActiveLeague] = useState("All");
  const [betAmount, setBetAmount] = useState("");
  const [timers, setTimers] = useState({});

  useEffect(() => {
    loadLiveMatches();
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = {};
        ALL_MATCHES.forEach(m => {
          const [min, sec] = (prev[m.id] || m.time).split(":").map(Number);
          let newSec = sec + 1;
          let newMin = min;
          if (newSec >= 60) { newSec = 0; newMin = Math.min(min + 1, 90); }
          updated[m.id] = `${String(newMin).padStart(2, "0")}:${String(newSec).padStart(2, "0")}`;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  function getOdds(side, pool) {
    if (!side || !pool) return (Math.random() * 2 + 1.3).toFixed(2);
    return (pool / side).toFixed(2);
  }

  function addToBetSlip(match, prediction, odds) {
    const label = prediction === 1 ? "1" : prediction === 2 ? "X" : "2";
    const exists = betSlip.find(b => b.matchId === match.id);
    if (exists) {
      setBetSlip(betSlip.map(b => b.matchId === match.id ? { ...b, prediction, label, odds } : b));
    } else {
      setBetSlip([...betSlip, { matchId: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, prediction, label, odds }]);
    }
    setShowSlip(true);
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
      alert("Bet placed!");
      loadLiveMatches();
    } catch (err) { alert("Error: " + err.message); }
    setLoading(false);
  }

  const leagues = ["All", "England Premier League", "Spain La Liga", "Germany Bundesliga", "Italy Serie A", "Champions League", "Arc Testnet"];
  const allMatches = [...liveMatches, ...ALL_MATCHES];
  const filtered = activeLeague === "All" ? allMatches : allMatches.filter(m => m.league === activeLeague);
  const grouped = leagues.filter(l => l !== "All").reduce((acc, league) => {
    const ms = filtered.filter(m => m.league === league);
    if (ms.length) acc[league] = ms;
    return acc;
  }, {});

  const totalOdds = betSlip.reduce((acc, b) => acc * parseFloat(b.odds || 1), 1).toFixed(2);
  const potentialWin = betAmount ? (betAmount * totalOdds).toFixed(2) : "0.00";

  return (
    <div style={{ background: "#0f1116", minHeight: "100vh", color: "white", fontFamily: "Arial, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: "#1a1d27", borderBottom: "1px solid #2a2d3a", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="logo" style={{ width: 36, height: 36, borderRadius: 6 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#00d4ff", letterSpacing: 1 }}>DISTANT FINANCE</div>
              <div style={{ fontSize: 9, color: "#555", letterSpacing: 2 }}>DECENTRALIZED BETTING</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {["Sports", "Live Betting", "Jackpot", "Livescore", "Results"].map(t => (
              <span key={t} onClick={() => setActiveTab(t)}
                style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer", color: activeTab === t ? "#00d4ff" : "#888", borderBottom: activeTab === t ? "2px solid #00d4ff" : "2px solid transparent" }}>
                {t}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {betSlip.length > 0 && (
              <button onClick={() => setShowSlip(!showSlip)}
                style={{ background: "#00d4ff", color: "#0f1116", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: "bold" }}>
                Betslip ({betSlip.length})
              </button>
            )}
            {connected ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ background: "#2a2d3a", padding: "8px 14px", borderRadius: 6, fontSize: 13, color: "#00d4ff", border: "1px solid #00d4ff" }}>
                  🦊 {walletAddress}
                </div>
                <button onClick={() => { setSigner(null); setConnected(false); setWalletAddress(""); setBetSlip([]); }}
                  style={{ background: "#e63946", color: "white", border: "none", padding: "8px 14px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>
                  Disconnect
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={connectWallet} style={{ background: "#00d4ff", color: "#0f1116", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>
                  🦊 Connect Wallet
                </button>
                <button onClick={connectWallet} style={{ background: "transparent", color: "#00d4ff", border: "1px solid #00d4ff", padding: "8px 16px", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 13 }}>
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SPORT TABS */}
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid #2a2d3a", overflowX: "auto" }}>
          {["Football", "Basketball", "Tennis", "Cricket", "Baseball", "Ice Hockey", "Handball"].map(sport => (
            <span key={sport} style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", color: sport === "Football" ? "#00d4ff" : "#888", borderBottom: sport === "Football" ? "2px solid #00d4ff" : "2px solid transparent", whiteSpace: "nowrap" }}>
              {sport}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", maxWidth: 1300, margin: "0 auto" }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 200, background: "#1a1d27", borderRight: "1px solid #2a2d3a", padding: "10px 0", flexShrink: 0 }}>
          <div style={{ padding: "8px 16px", fontSize: 13, fontWeight: "bold", color: "#888", letterSpacing: 1 }}>POPULAR</div>
          {["Today's Football", "Football in Next 3 Hours", "England Premier League", "Spain La Liga", "Italy Serie A", "Germany Bundesliga", "Champions League", "France Ligue 1", "Arc Testnet"].map(item => (
            <div key={item} onClick={() => setActiveLeague(item.includes("England") ? "England Premier League" : item.includes("Spain") ? "Spain La Liga" : item.includes("Italy") ? "Italy Serie A" : item.includes("Germany") ? "Germany Bundesliga" : item.includes("Champions") ? "Champions League" : item.includes("Arc") ? "Arc Testnet" : "All")}
              style={{ padding: "10px 16px", fontSize: 13, cursor: "pointer", color: "#ccc", borderLeft: "3px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = "#2a2d3a"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span>{item}</span>
              <span style={{ color: "#555", fontSize: 12 }}>›</span>
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: "0 8px" }}>

          {/* LEAGUE FILTER */}
          <div style={{ display: "flex", gap: 6, padding: "10px 0", overflowX: "auto" }}>
            {leagues.map(l => (
              <button key={l} onClick={() => setActiveLeague(l)}
                style={{ background: activeLeague === l ? "#00d4ff" : "#1a1d27", color: activeLeague === l ? "#0f1116" : "#888", border: "1px solid " + (activeLeague === l ? "#00d4ff" : "#2a2d3a"), padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", fontWeight: activeLeague === l ? "bold" : "normal" }}>
                {l}
              </button>
            ))}
          </div>

          {/* MATCHES TABLE HEADER */}
          <div style={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 50px", padding: "8px 12px", background: "#2a2d3a", fontSize: 11, color: "#888", fontWeight: "bold" }}>
              <span>MATCH</span>
              <span style={{ textAlign: "center" }}>1</span>
              <span style={{ textAlign: "center" }}>X</span>
              <span style={{ textAlign: "center" }}>2</span>
              <span style={{ textAlign: "center" }}>+</span>
            </div>

            {Object.entries(grouped).map(([league, matches]) => (
              <div key={league}>
                <div style={{ padding: "8px 12px", background: "#1f2230", fontSize: 12, color: "#00d4ff", fontWeight: "bold", borderTop: "1px solid #2a2d3a" }}>
                  🏆 {league}
                </div>
                {matches.map((match, idx) => {
                  const pool = match.totalHome + match.totalDraw + match.totalAway;
                  const o1 = getOdds(match.totalHome, pool);
                  const ox = getOdds(match.totalDraw, pool);
                  const o2 = getOdds(match.totalAway, pool);
                  const timer = timers[match.id] || match.time;
                  const selected = betSlip.find(b => b.matchId === match.id);

                  return (
                    <div key={match.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 50px", padding: "10px 12px", borderTop: "1px solid #2a2d3a", background: idx % 2 === 0 ? "#1a1d27" : "#1d2030", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#252838"}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#1a1d27" : "#1d2030"}>

                      {/* MATCH INFO */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ textAlign: "center", minWidth: 36 }}>
                          <div style={{ fontSize: 10, color: match.isContract ? "#00ff88" : "#ff6b35", fontWeight: "bold" }}>
                            {match.isContract ? "🔴 LIVE" : timer}
                          </div>
                          <div style={{ fontSize: 9, color: "#555" }}>H1</div>
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <img src={TEAM_LOGOS[match.homeTeam]} alt={match.homeTeam}
                              style={{ width: 16, height: 16, objectFit: "contain" }}
                              onError={e => e.target.style.display = "none"} />
                            <span style={{ fontSize: 13, color: "#ddd" }}>{match.homeTeam}</span>
                            <span style={{ fontSize: 12, color: "#555", marginLeft: "auto" }}>0</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <img src={TEAM_LOGOS[match.awayTeam]} alt={match.awayTeam}
                              style={{ width: 16, height: 16, objectFit: "contain" }}
                              onError={e => e.target.style.display = "none"} />
                            <span style={{ fontSize: 13, color: "#ddd" }}>{match.awayTeam}</span>
                            <span style={{ fontSize: 12, color: "#555", marginLeft: "auto" }}>0</span>
                          </div>
                        </div>
                      </div>

                      {/* ODDS BUTTONS */}
                      {[{ code: 1, odds: o1 }, { code: 2, odds: ox }, { code: 3, odds: o2 }].map(opt => (
                        <button key={opt.code}
                          onClick={() => { addToBetSlip(match, opt.code, opt.odds); if (match.isContract) placeBet(match.id, opt.code); }}
                          style={{ margin: "0 3px", padding: "8px 4px", background: selected?.prediction === opt.code ? "#00d4ff" : "#2a2d3a", color: selected?.prediction === opt.code ? "#0f1116" : "#ddd", border: "1px solid " + (selected?.prediction === opt.code ? "#00d4ff" : "#3a3d4a"), borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: "bold", width: "100%", textAlign: "center" }}
                          onMouseEnter={e => { if (selected?.prediction !== opt.code) e.currentTarget.style.background = "#3a3d4a" }}
                          onMouseLeave={e => { if (selected?.prediction !== opt.code) e.currentTarget.style.background = "#2a2d3a" }}>
                          {opt.odds}
                        </button>
                      ))}

                      {/* MORE */}
                      <div style={{ textAlign: "center", color: "#555", fontSize: 12, cursor: "pointer" }}>+79</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* BET SLIP */}
        {showSlip && (
          <div style={{ width: 280, background: "#1a1d27", borderLeft: "1px solid #2a2d3a", flexShrink: 0 }}>
            <div style={{ display: "flex", borderBottom: "1px solid #2a2d3a" }}>
              <div style={{ flex: 1, padding: "12px", textAlign: "center", background: "#00d4ff", color: "#0f1116", fontWeight: "bold", fontSize: 14 }}>
                Betslip ({betSlip.length})
              </div>
              <div style={{ flex: 1, padding: "12px", textAlign: "center", color: "#888", fontSize: 14, cursor: "pointer" }}>
                Cashout
              </div>
            </div>

            <div style={{ padding: 12 }}>
              {betSlip.map((bet, i) => (
                <div key={i} style={{ background: "#2a2d3a", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#ddd", fontWeight: "bold" }}>{bet.homeTeam} vs {bet.awayTeam}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                        {bet.label === "1" ? "Home Win" : bet.label === "X" ? "Draw" : "Away Win"} • {bet.label}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: "bold", color: "#00d4ff" }}>{bet.odds}</span>
                      <span onClick={() => setBetSlip(betSlip.filter((_, idx) => idx !== i))}
                        style={{ color: "#555", cursor: "pointer", fontSize: 16 }}>✕</span>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Stake (USDC)</div>
                <input type="number" placeholder="Enter amount"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #3a3d4a", background: "#0f1116", color: "white", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div style={{ marginTop: 10, background: "#2a2d3a", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "#888" }}>Total Odds</span>
                  <span style={{ color: "#00d4ff", fontWeight: "bold" }}>{totalOdds}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#888" }}>Potential Win</span>
                  <span style={{ color: "#00ff88", fontWeight: "bold" }}>{potentialWin} USDC</span>
                </div>
              </div>

              <button onClick={() => connected ? alert("Click odds on Arc Testnet matches to bet!") : connectWallet()}
                style={{ width: "100%", marginTop: 12, padding: "13px", background: "#00d4ff", color: "#0f1116", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer", fontSize: 15 }}>
                {connected ? "Place Bet" : "Connect Wallet to Bet"}
              </button>

              <button onClick={() => { setBetSlip([]); setShowSlip(false); }}
                style={{ width: "100%", marginTop: 6, padding: "8px", background: "transparent", color: "#555", border: "1px solid #2a2d3a", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ background: "#1a1d27", borderTop: "1px solid #2a2d3a", padding: "20px", textAlign: "center", marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <img src="/logo.png" alt="logo" style={{ width: 24, height: 24, borderRadius: 4 }} />
          <span style={{ fontSize: 14, fontWeight: "bold", color: "#00d4ff" }}>DISTANT FINANCE</span>
        </div>
        <p style={{ color: "#444", fontSize: 12, margin: 0 }}>Decentralized Sports Betting • Arc Testnet • USDC Payments</p>
      </div>

      {loading && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "#00d4ff", color: "#0f1116", padding: "12px 20px", borderRadius: 8, fontWeight: "bold", fontSize: 14 }}>
          ⏳ Processing...
        </div>
      )}
    </div>
  );
}