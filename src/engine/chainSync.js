/**
 * chainSync.js
 * Reads matches from the on-chain FootballBetting contract (read-only,
 * no wallet needed) and returns a lookup of "home::away" -> match info
 * (chainMatchId + total USDC staked per side, for informational
 * display only — single bets are fixed-odds now, so this no longer
 * drives the displayed odds).
 */

import { ethers } from "ethers";

const RPC_URL = import.meta.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.io";
const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

const ABI = [
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

// Only scan the most recent matches, not the full history — as
// matchCount grows over a session, looping through everything on
// every poll gets increasingly expensive and starves other features
// (like My Bets) of RPC quota on Arc's rate-limited public endpoint.
const MAX_SCAN = 80;

function key(home, away) {
  return `${home}::${away}`;
}

export async function fetchActiveChainMatches() {
  if (!CONTRACT) return {};
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);
    const count = await contract.matchCount();
    const total = Number(count);
    const startFrom = Math.max(1, total - MAX_SCAN + 1);

    const map = {};
    for (let i = startFrom; i <= total; i++) {
      const m = await contract.getMatch(i);
      const [home, away, totalHome, totalDraw, totalAway, finished] = m;
      if (finished) continue;
      map[key(home, away)] = {
        chainMatchId: i,
        poolHome: Number(ethers.formatUnits(totalHome, 6)),
        poolDraw: Number(ethers.formatUnits(totalDraw, 6)),
        poolAway: Number(ethers.formatUnits(totalAway, 6)),
      };
    }
    return map;
  } catch {
    // Chain unreachable or contract not deployed yet — betting stays
    // disabled until this resolves, everything else still works.
    return {};
  }
}

export function matchKey(homeTeam, awayTeam) {
  return key(homeTeam, awayTeam);
}
