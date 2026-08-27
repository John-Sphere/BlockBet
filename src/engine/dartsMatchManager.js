// src/engine/dartsMatchManager.js
//
// Mirrors tennis's variable-length-match approach: each simulated
// leg gets a fixed real-time slice, and total match length emerges
// from however many legs the deterministic simulation actually
// produced (a quick 3-0 set sweep reveals faster than a tight 3-2
// set battle, matching real darts).

import { simulateDartsMatch } from "./simulateDarts.js";
import { calculateOdds, calculateLiveOdds } from "./dartsOddsEngine.js";
import { DARTS_LEAGUES, DARTS_PLAYERS } from "../data/dartsPlayers.js";

const BETTING_WINDOW_MS = 2 * 60 * 1000;
const LEG_DURATION_MS   = 15 * 1000; // compressed real-time per leg
const ROUND_PERIOD_MS   = 20 * 60 * 1000;
const STAGGER_MS        = 25 * 1000;

let matchState = [];
let listeners = [];
let tickInterval = null;
let initialized = false;
let paused = false;
const fixtureListCache = {};

function emit() { listeners.forEach((fn) => fn(matchState)); }

export function subscribe(fn) {
  listeners.push(fn);
  fn(matchState);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

function currentRoundEpoch() {
  return Math.floor(Date.now() / ROUND_PERIOD_MS);
}

function matchesForLeague(leagueId) {
  const count = DARTS_PLAYERS.filter((p) => p.leagueId === leagueId).length;
  return Math.max(1, Math.floor(count / 2));
}

function shuffleDeterministic(arr, seed) {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getLeagueFixtureList(leagueId) {
  if (!fixtureListCache[leagueId]) {
    const players = DARTS_PLAYERS.filter((p) => p.leagueId === leagueId);
    const pairs = [];
    for (let i = 0; i < players.length; i++) {
      for (let j = 0; j < players.length; j++) {
        if (i !== j) pairs.push({ home: players[i], away: players[j] });
      }
    }
    let seed = 0;
    for (let i = 0; i < leagueId.length; i++) seed = (seed * 31 + leagueId.charCodeAt(i)) | 0;
    fixtureListCache[leagueId] = shuffleDeterministic(pairs, Math.abs(seed) || 1);
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

function flattenLegs(sets) {
  const flat = [];
  sets.forEach((set, setIndex) => {
    set.legs.forEach((l) => flat.push({ ...l, setIndex }));
  });
  return flat;
}

function createMatch(leagueId, leagueName, fixture, round, baseTime, delayMs) {
  const { home, away } = fixture;
  const sim = simulateDartsMatch(home, away, round);
  const flatLegs = flattenLegs(sim.sets);
  const baseOdds = calculateOdds(home.ratings, away.ratings);

  const kickOffAt  = baseTime + delayMs + BETTING_WINDOW_MS;
  const finishedAt = kickOffAt + flatLegs.length * LEG_DURATION_MS;

  return {
    id: `${leagueId}-${round}-${home.id}-${away.id}`,
    sport: "darts",
    leagueId,
    leagueName,
    homeTeam: home.name,
    awayTeam: away.name,
    homeClub: home,
    awayClub: away,
    sim,
    flatLegs,
    status: "betting",
    setsA: 0, setsB: 0,
    legsA: 0, legsB: 0, // legs in the CURRENT set only
    currentSet: 1,
    oddsHome: baseOdds.home,
    oddsAway: baseOdds.away,
    probabilities: baseOdds.probabilities,
    kickOffAt, finishedAt,
    chainMatchId: null,
    poolHome: 0, poolAway: 0, hasRealPool: false,
  };
}

function buildLeagueRound(leagueId, leagueName, epoch) {
  const count = matchesForLeague(leagueId);
  const fixtures = getFixturesForRound(leagueId, epoch, count);
  const baseTime = epoch * ROUND_PERIOD_MS;
  const round = `darts-epoch${epoch}`;
  return fixtures.map((fx, i) => createMatch(leagueId, leagueName, fx, round, baseTime, i * STAGGER_MS));
}

function tickMatch(match, now) {
  const { kickOffAt, finishedAt, flatLegs } = match;

  if (now < kickOffAt) return match;

  if (now >= finishedAt) {
    return {
      ...match, status: "finished",
      setsA: match.sim.setsA, setsB: match.sim.setsB,
      currentSet: match.sim.sets.length,
    };
  }

  const legsRevealed = Math.min(flatLegs.length, Math.floor((now - kickOffAt) / LEG_DURATION_MS));
  const revealed = flatLegs.slice(0, legsRevealed);

  let setsA = 0, setsB = 0, legsA = 0, legsB = 0, currentSet = 1;
  let lastSetIndex = 0;

  for (const l of revealed) {
    if (l.setIndex !== lastSetIndex) {
      const prevSetResult = match.sim.sets[lastSetIndex];
      if (prevSetResult.winner === "A") setsA++; else setsB++;
      legsA = 0; legsB = 0;
      lastSetIndex = l.setIndex;
    }
    if (l.winner === "A") legsA++; else legsB++;
    currentSet = l.setIndex + 1;
  }

  const liveOdds = calculateLiveOdds(match.probabilities, setsA, setsB, legsA, legsB);

  return {
    ...match, status: "live",
    setsA, setsB, legsA, legsB, currentSet,
    oddsHome: liveOdds.home, oddsAway: liveOdds.away,
  };
}

async function resolveDartsMatchOnChain(home, away, result) {
  try {
    await fetch(`/api/resolve-match?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&result=${result}`);
  } catch {
    // Best-effort — same known gap as basketball/tennis.
  }
}

function tick() {
  if (paused) return;
  const now = Date.now();
  const epoch = currentRoundEpoch();

  const needsRebuild = matchState.length === 0 || matchState.some((m) => !m.id.includes(`epoch${epoch}`));
  if (needsRebuild) {
    matchState = DARTS_LEAGUES.flatMap((l) => buildLeagueRound(l.id, l.name, epoch));
  } else {
    const previousStatuses = new Map(matchState.map((m) => [m.id, m.status]));
    matchState = matchState.map((m) => tickMatch(m, now));

    matchState.forEach((m) => {
      const wasFinished = previousStatuses.get(m.id) === "finished";
      if (m.status === "finished" && !wasFinished && m.chainMatchId !== null) {
        resolveDartsMatchOnChain(m.homeTeam, m.awayTeam, m.sim.result);
      }
    });
  }
  emit();
}

function pauseEngine() { paused = true; }
function resumeEngine() { paused = false; }

export function initDartsMatchManager() {
  if (initialized) return;
  initialized = true;

  tick();
  tickInterval = setInterval(tick, 1000);

  if (typeof window !== "undefined") {
    if (!navigator.onLine) paused = true;
    window.addEventListener("offline", pauseEngine);
    window.addEventListener("online", resumeEngine);
  }
}

export function stopDartsMatchManager() {
  clearInterval(tickInterval);
  initialized = false;
  matchState = [];
  if (typeof window !== "undefined") {
    window.removeEventListener("offline", pauseEngine);
    window.removeEventListener("online", resumeEngine);
  }
}
