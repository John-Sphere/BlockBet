/**
 * /api/cashout-quote?matchId=X&address=Y
 *
 * Signs a LIVE cashout price quote for a pending bet. Since the
 * contract itself can never know a match's real state, this endpoint
 * independently reconstructs it server-side, using the exact same
 * deterministic simulation your site already runs client-side (same
 * seed = same match, always) — then prices the cashout based on
 * whether the bet's prediction is currently on track.
 *
 * Known simplification: the live "form" rating adjustment (which
 * depends on match history accumulated in each browser's memory) is
 * skipped here, since the server has no access to that per-session
 * state. This is a close approximation, not byte-perfect — the
 * pricing formula's built-in margin covers small differences like this.
 */

import { ethers } from "ethers";
import { simulateMatch } from "../src/engine/simulate.js";
import { generateLeagueFixtures, shuffleFixtures } from "../src/engine/fixtureGenerator.js";
import { LEAGUES, CLUBS } from "../src/data/clubs.js";

const ABI = [
  "function bets(uint256,address) view returns (uint256,uint8,uint256,bool,bool)",
  "function getMatch(uint256) view returns (string,string,uint256,uint256,uint256,bool,uint8)",
];

const QUOTE_VALID_SECONDS = 120;

// ── Same timing constants as matchManager.js — must stay in sync ──
const BETTING_WINDOW_MS = 2 * 60 * 1000;
const HALF_DURATION_MS  = 3.5 * 60 * 1000;
const HT_DURATION_MS    = 1.5 * 60 * 1000;
const STAGGER_MS        = 20 * 1000;
const ROUND_PERIOD_MS   = 18 * 60 * 1000;

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

// Finds which league/round/fixture-index currently holds this exact
// home/away pairing, reconstructing everything needed to re-run the
// identical simulation the client already ran.
function findMatchContext(homeTeam, awayTeam) {
  const epoch = currentRoundEpoch();
  for (const league of LEAGUES) {
    const count = matchesForLeague(league.id);
    const fixtures = getFixturesForRound(league.id, epoch, count);
    const index = fixtures.findIndex(
      (f) => f.home.name === homeTeam && f.away.name === awayTeam
    );
    if (index !== -1) {
      return { league, epoch, index, home: fixtures[index].home, away: fixtures[index].away };
    }
  }
  return null;
}

function getVisibleGoals(timeline, upToMinute, isSecondHalf) {
  return (timeline || []).filter((e) => {
    if (e.type !== "goal") return false;
    const m = typeof e.minute === "number"
      ? e.minute
      : typeof e.minute === "string" && e.minute.includes("+")
        ? parseInt(e.minute.split("+")[0]) + 0.5
        : 0;
    return isSecondHalf ? m >= 46 && m <= upToMinute : m >= 1 && m <= upToMinute;
  });
}

// Reconstructs the live minute + current score for a match, purely
// from real time and the deterministic simulation — same approach
// matchManager.js uses client-side.
function getLiveState(context) {
  const baseTime = context.epoch * ROUND_PERIOD_MS;
  const delayMs = context.index * STAGGER_MS;
  const kickOffAt    = baseTime + delayMs + BETTING_WINDOW_MS;
  const htAt         = kickOffAt + HALF_DURATION_MS;
  const secondHalfAt = htAt + HT_DURATION_MS;
  const ftAt         = secondHalfAt + HALF_DURATION_MS;

  const round = `epoch${context.epoch}-${context.index}`;
  const sim = simulateMatch(context.home, context.away, round);

  const now = Date.now();
  let minute, homeScore, awayScore, finished = false;

  if (now < kickOffAt) {
    minute = 0; homeScore = 0; awayScore = 0;
  } else if (now < htAt) {
    minute = Math.min(45, Math.floor(((now - kickOffAt) / HALF_DURATION_MS) * 45));
    const goals = getVisibleGoals(sim.timeline, minute, false);
    homeScore = goals.filter((g) => g.team === "home").length;
    awayScore = goals.filter((g) => g.team === "away").length;
  } else if (now < secondHalfAt) {
    minute = 45;
    const goals = getVisibleGoals(sim.timeline, 45, false);
    homeScore = goals.filter((g) => g.team === "home").length;
    awayScore = goals.filter((g) => g.team === "away").length;
  } else if (now < ftAt) {
    minute = Math.min(90, 46 + Math.floor(((now - secondHalfAt) / HALF_DURATION_MS) * 44));
    const goals = getVisibleGoals(sim.timeline, minute, true);
    homeScore = goals.filter((g) => g.team === "home").length;
    awayScore = goals.filter((g) => g.team === "away").length;
  } else {
    minute = 90; homeScore = sim.homeScore; awayScore = sim.awayScore; finished = true;
  }

  return { minute, homeScore, awayScore, finished };
}

// The actual pricing model: how much of the match is "decided" grows
// with elapsed minutes. If your prediction currently matches the live
// scoreline, your cashout value rises toward your potential win as
// that gets more certain. If not, it shrinks toward a small floor.
// A margin (0.85) is applied either way — cashing out before the
// final whistle is always priced slightly below the "fair" value,
// same as how real sportsbooks price early settlement.
const MARGIN = 0.85;
const LOSING_FLOOR = 0.05;

function priceCashout(stakeAmount, oddsBps, prediction, liveState) {
  const potentialWin = stakeAmount * (oddsBps / 10000);
  const certainty = Math.max(0, Math.min(1, liveState.minute / 90));

  let currentResult;
  if (liveState.homeScore > liveState.awayScore) currentResult = 1;
  else if (liveState.awayScore > liveState.homeScore) currentResult = 3;
  else currentResult = 2;

  const onTrack = currentResult === prediction;

  if (onTrack) {
    return stakeAmount + (potentialWin - stakeAmount) * certainty * MARGIN;
  }
  return stakeAmount * Math.max(LOSING_FLOOR, 1 - certainty * MARGIN);
}

export default async function handler(req, res) {
  const { matchId, address } = req.query;
  if (!matchId || !address) {
    return res.status(400).json({ error: "matchId and address are required" });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(process.env.BETTING_ADDRESS, ABI, wallet);
    const contractAddress = process.env.BETTING_ADDRESS;

    const [amount, prediction, oddsBps, claimed, cashedOut] = await contract.bets(matchId, address);
    if (amount === 0n) return res.status(404).json({ error: "No bet found for this match/address" });
    if (claimed) return res.status(400).json({ error: "This bet has already been claimed" });
    if (cashedOut) return res.status(400).json({ error: "This bet has already been cashed out" });

    const [homeTeam, awayTeam, , , , resolved] = await contract.getMatch(matchId);
    if (resolved) {
      return res.status(400).json({ error: "Match already resolved \u2014 claim your winnings instead" });
    }

    const context = findMatchContext(homeTeam, awayTeam);
    const stakeAmount = Number(ethers.formatUnits(amount, 6));

    let offeredUsdc;
    if (!context) {
      // Couldn't locate this fixture in the current round (rare edge
      // case, e.g. right at a round boundary) — fall back to a full
      // stake refund rather than fail outright.
      offeredUsdc = stakeAmount;
    } else {
      const liveState = getLiveState(context);
      offeredUsdc = priceCashout(stakeAmount, Number(oddsBps), Number(prediction), liveState);
    }

    const offeredAmount = ethers.parseUnits(offeredUsdc.toFixed(6), 6);
    const deadline = Math.floor(Date.now() / 1000) + QUOTE_VALID_SECONDS;
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    const messageHash = ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "uint256", "bytes32", "address"],
      [matchId, address, offeredAmount, deadline, nonce, contractAddress]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return res.status(200).json({
      matchId: Number(matchId),
      offeredAmount: offeredAmount.toString(),
      deadline,
      nonce,
      signature,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
