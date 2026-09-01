/**
 * /api/resolve-matches
 *
 * Fallback resolver, run on a schedule (every 5 min via GitHub
 * Actions). Client-triggered resolution (matchManager.js, the moment
 * a match finishes in someone's open browser) handles the vast
 * majority of cases — this exists purely as a safety net for matches
 * that finished while nobody had the site open to trigger it.
 *
 * Uses the exact same deterministic simulation reconstruction as
 * cashout-quote.js to determine each match's REAL result — not a
 * random guess, which is what this endpoint used to do (a real bug,
 * since a match can only be resolved once; a wrong random result
 * landing first would permanently lock in an incorrect outcome).
 */

import { ethers } from "ethers";
import { simulateMatch } from "../src/engine/simulate.js";
import { generateLeagueFixtures, shuffleFixtures } from "../src/engine/fixtureGenerator.js";
import { LEAGUES, CLUBS } from "../src/data/clubs.js";

const ABI = [
  "function resolveMatch(uint256,uint8) public",
];

const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/d59f742/v1/graphql";

const BETTING_WINDOW_MS = 2 * 60 * 1000;
const HALF_DURATION_MS  = 3.5 * 60 * 1000;
const HT_DURATION_MS    = 1.5 * 60 * 1000;
const STAGGER_MS        = 20 * 1000;
const ROUND_PERIOD_MS   = 18 * 60 * 1000;

function matchesForLeague(leagueId) {
  const count = CLUBS.filter((c) => c.leagueId === leagueId).length;
  return Math.max(1, Math.floor(count / 2));
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

// Finds which league/round/fixture-index a home/away pairing belongs
// to — checks both the current epoch and the previous one, since a
// finished-but-unresolved match may have already rotated out of the
// current round by the time this runs.
function findMatchContext(homeTeam, awayTeam) {
  const nowEpoch = Math.floor(Date.now() / ROUND_PERIOD_MS);
  for (const epoch of [nowEpoch, nowEpoch - 1]) {
    for (const league of LEAGUES) {
      const count = matchesForLeague(league.id);
      const fixtures = getFixturesForRound(league.id, epoch, count);
      const index = fixtures.findIndex((f) => f.home.name === homeTeam && f.away.name === awayTeam);
      if (index !== -1) {
        return { league, epoch, index, home: fixtures[index].home, away: fixtures[index].away };
      }
    }
  }
  return null;
}

function isFinished(context) {
  const baseTime = context.epoch * ROUND_PERIOD_MS;
  const delayMs = context.index * STAGGER_MS;
  const ftAt = baseTime + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS * 2 + HT_DURATION_MS;
  return Date.now() >= ftAt;
}

async function getUnresolvedMatches() {
  try {
    const res = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ Match(where: { resolved: { _eq: false } }, limit: 100) { matchId homeTeam awayTeam } }`,
      }),
    });
    const json = await res.json();
    return json?.data?.Match || [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);

    const unresolved = await getUnresolvedMatches();
    const resolved = [];

    for (const m of unresolved) {
      const context = findMatchContext(m.homeTeam, m.awayTeam);
      if (!context) continue;
      if (!isFinished(context)) continue;

      const round = `epoch${context.epoch}-${context.index}`;
      const sim = simulateMatch(context.home, context.away, round);

      const nonce = await provider.getTransactionCount(wallet.address, "pending");
      const tx = await contract.resolveMatch(m.matchId, sim.result, { nonce });
      await tx.wait();
      resolved.push({ matchId: Number(m.matchId), homeTeam: m.homeTeam, awayTeam: m.awayTeam, result: sim.result });
    }

    res.status(200).json({ success: true, resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
