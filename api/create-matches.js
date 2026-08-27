/**
 * /api/create-matches
 *
 * Pre-creates the CURRENT round's real fixtures on-chain, for every
 * league, ahead of anyone actually clicking to bet — so by the time
 * a visitor tries to bet on a match, it's often already synced,
 * skipping the wait ensure-match.js would otherwise need.
 *
 * Uses the exact same deterministic fixture-selection logic as
 * matchManager.js (fixed per-league seed + wall-clock round epoch),
 * so what gets created here always matches what's actually live on
 * the site — not a disconnected random selection.
 */

import { ethers } from "ethers";
import { CLUBS, LEAGUES } from "../src/data/clubs.js";
import { generateLeagueFixtures, shuffleFixtures } from "../src/engine/fixtureGenerator.js";

const ABI = [
  "function createMatch(string,string) public",
];

const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/49a3373/v1/graphql";

// Must stay in sync with matchManager.js's ROUND_PERIOD_MS.
const ROUND_PERIOD_MS = 18 * 60 * 1000;

function matchesForLeague(leagueId) {
  const count = CLUBS.filter((c) => c.leagueId === leagueId).length;
  return Math.max(1, Math.floor(count / 2));
}

function currentRoundEpoch() {
  return Math.floor(Date.now() / ROUND_PERIOD_MS);
}

const fixtureListCache = {};
function getLeagueFixtureList(leagueId) {
  if (!fixtureListCache[leagueId]) {
    const raw = generateLeagueFixtures(leagueId);
    let seed = 0;
    for (let i = 0; i < leagueId.length; i++) seed = (seed * 31 + leagueId.charCodeAt(i)) | 0;
    fixtureListCache[leagueId] = shuffleFixtures(raw, seed >>> 0);
  }
  return fixtureListCache[leagueId];
}

function getFixturesForRound(leagueId, epoch, count) {
  const fixtures = getLeagueFixtureList(leagueId);
  if (!fixtures.length) return [];
  const startIdx = (epoch * count) % fixtures.length;
  const picked = [];
  for (let i = 0; i < count; i++) picked.push(fixtures[(startIdx + i) % fixtures.length]);
  return picked;
}

// Fast existence check via the indexer instead of scanning on-chain
// history. If the indexer's unreachable, assumes it already exists
// (skip) rather than risk creating duplicate matches.
async function existsOnChain(home, away) {
  try {
    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query Find($home: String!, $away: String!) {
          Match(where: { homeTeam: { _eq: $home }, awayTeam: { _eq: $away } }, limit: 1) {
            matchId
          }
        }`,
        variables: { home, away },
      }),
    });
    const json = await res.json();
    return !!json?.data?.Match?.[0];
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);

    const epoch = currentRoundEpoch();
    const created = [];

    for (const league of LEAGUES) {
      const count = matchesForLeague(league.id);
      const fixtures = getFixturesForRound(league.id, epoch, count);

      for (const fixture of fixtures) {
        const home = fixture.home.name;
        const away = fixture.away.name;

        const already = await existsOnChain(home, away);
        if (already) continue;

        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        const tx = await contract.createMatch(home, away, { nonce });
        await tx.wait();
        created.push({ league: league.name, home, away });
      }
    }

    res.status(200).json({ success: true, epoch, created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
