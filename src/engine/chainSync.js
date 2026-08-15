/**
 * chainSync.js
 * Reads matches from the on-chain FootballBetting contract (read-only,
 * no wallet needed) and returns a lookup of "home::away" -> chainMatchId
 * for active (unfinished) matches. matchManager.js uses this to fill in
 * chainMatchId on its client-generated matches once create-matches.js
 * has registered the corresponding fixture on-chain.
 */

import { ethers } from "ethers";

const RPC_URL = import.meta.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.io";
const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

const ABI = [
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

function key(home, away) {
  return `${home}::${away}`;
}

export async function fetchActiveChainMatches() {
  if (!CONTRACT) return {};
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);
    const count = await contract.matchCount();

    const map = {};
    for (let i = 1; i <= Number(count); i++) {
      const m = await contract.getMatch(i);
      const [home, away, , , , finished] = m;
      if (finished) continue;
      map[key(home, away)] = i;
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
