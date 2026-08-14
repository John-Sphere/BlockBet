import { ethers } from "ethers";
import { CLUBS, LEAGUES } from "../src/data/clubs.js";
import { generateLeagueFixtures, shuffleFixtures } from "../src/engine/fixtureGenerator.js";

const ABI = [
  "function createMatch(string,string) public",
  "function matchCount() public view returns (uint256)",
  "function getMatch(uint256) public view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

// Same target used across all leagues — 3 per league, matching
// matchManager.js's MATCHES_PER_LEAGUE.
const MIN_ACTIVE_PER_LEAGUE = 3;

export default async function handler(req, res) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(
      process.env.BETTING_ADDRESS, ABI, wallet
    );

    const count = await contract.matchCount();

    // Count active (unfinished) matches per league by checking the home
    // team name against clubs.js — since the contract only stores
    // home/away strings, not a leagueId, we infer league from the club.
    const activeByLeague = {};
    for (let i = 1; i <= Number(count); i++) {
      const m = await contract.getMatch(i);
      const finished = m[5];
      if (finished) continue;
      const homeName = m[0];
      const club = CLUBS.find((c) => c.name === homeName);
      if (club) {
        activeByLeague[club.leagueId] = (activeByLeague[club.leagueId] || 0) + 1;
      }
    }

    const created = [];

    for (const league of LEAGUES) {
      const activeCount = activeByLeague[league.id] || 0;
      if (activeCount >= MIN_ACTIVE_PER_LEAGUE) continue;

      const fixtures = generateLeagueFixtures(league.id);
      if (!fixtures.length) continue;

      const shuffled = shuffleFixtures(fixtures, Date.now() ^ league.id.length);
      const needed = MIN_ACTIVE_PER_LEAGUE - activeCount;

      for (let i = 0; i < needed && i < shuffled.length; i++) {
        const fixture = shuffled[i];
        const tx = await contract.createMatch(fixture.home.name, fixture.away.name);
        await tx.wait();
        created.push({ league: league.name, home: fixture.home.name, away: fixture.away.name });
      }
    }

    res.status(200).json({ success: true, created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
