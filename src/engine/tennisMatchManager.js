// src/engine/tennisMatchManager.js
//
// Mirrors football/basketball's wall-clock-synced round architecture,
// but tennis match length is naturally variable (a straight-sets
// sweep is much shorter than a 3-set battle with tiebreaks) — so
// instead of fixed quarter/half durations, each simulated game gets
// a fixed real-time slice, and total match length emerges from
// however many games the deterministic simulation actually produced.

import { simulateTennisMatch } from "./simulateTennis.js";
import { calculateOdds, calculateLiveOdds } from "./tennisOddsEngine.js";
import { TENNIS_LEAGUES, TENNIS_PLAYERS } from "../data/tennisPlayers.js";

const BETTING_WINDOW_MS = 3 * 60 * 1000;
const GAME_DURATION_MS  = 20 * 1000; // compressed real-time per game
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
  const count = TENNIS_PLAYERS.filter((p) => p.leagueId === leagueId).length;
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
    const players = TENNIS_PLAYERS.filter((p) => p.leagueId === leagueId);
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

// Flattens the sets/games structure into one ordered list of games,
// so we can index "how many games have happened by minute X"
// regardless of which set they fall in.
function flattenGames(sets) {
  const flat = [];
  sets.forEach((set, setIndex) => {
    set.games.forEach((g) => flat.push({ ...g, setIndex }));
  });
  return flat;
}

function createMatch(leagueId, leagueName, fixture, round, baseTime, delayMs) {
  const { home, away } = fixture;
  const sim = simulateTennisMatch(home, away, round);
  const flatGames = flattenGames(sim.sets);
  const baseOdds = calculateOdds(home.ratings, away.ratings);

  const kickOffAt  = baseTime + delayMs + BETTING_WINDOW_MS;
  const finishedAt = kickOffAt + flatGames.length * GAME_DURATION_MS;

  return {
    id: `${leagueId}-${round}-${home.id}-${away.id}`,
    sport: "tennis",
    leagueId,
    leagueName,
    homeTeam: home.name,
    awayTeam: away.name,
    homeClub: home,
    awayClub: away,
    sim,
    flatGames,
    status: "betting",
    setsA: 0, setsB: 0,
    gamesA: 0, gamesB: 0, // games in the CURRENT set only
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
  const round = `tennis-epoch${epoch}`;
  return fixtures.map((fx, i) => createMatch(leagueId, leagueName, fx, round, baseTime, i * STAGGER_MS));
}

function tickMatch(match, now) {
  const { kickOffAt, finishedAt, flatGames } = match;

  if (now < kickOffAt) return match;

  if (now >= finishedAt) {
    return {
      ...match, status: "finished",
      setsA: match.sim.setsA, setsB: match.sim.setsB,
      currentSet: match.sim.sets.length,
    };
  }

  const gamesRevealed = Math.min(flatGames.length, Math.floor((now - kickOffAt) / GAME_DURATION_MS));
  const revealed = flatGames.slice(0, gamesRevealed);

  let setsA = 0, setsB = 0, gamesA = 0, gamesB = 0, currentSet = 1;
  let lastSetIndex = 0;

  for (const g of revealed) {
    if (g.setIndex !== lastSetIndex) {
      // A new set has started — the previous set is complete, tally it.
      const prevSetResult = match.sim.sets[lastSetIndex];
      if (prevSetResult.winner === "A") setsA++; else setsB++;
      gamesA = 0; gamesB = 0;
      lastSetIndex = g.setIndex;
    }
    if (g.winner === "A") gamesA++; else gamesB++;
    currentSet = g.setIndex + 1;
  }

  const liveOdds = calculateLiveOdds(match.probabilities, setsA, setsB, gamesA, gamesB);

  return {
    ...match, status: "live",
    setsA, setsB, gamesA, gamesB, currentSet,
    oddsHome: liveOdds.home, oddsAway: liveOdds.away,
  };
}

async function resolveTennisMatchOnChain(home, away, result) {
  try {
    await fetch(`/api/resolve-match?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&result=${result}`);
  } catch {
    // Best-effort — same known gap as basketball: the fallback cron
    // resolver doesn't cover tennis's fixture space yet.
  }
}

function tick() {
  if (paused) return;
  const now = Date.now();
  const epoch = currentRoundEpoch();

  const needsRebuild = matchState.length === 0 || matchState.some((m) => !m.id.includes(`epoch${epoch}`));
  if (needsRebuild) {
    matchState = TENNIS_LEAGUES.flatMap((l) => buildLeagueRound(l.id, l.name, epoch));
  } else {
    const previousStatuses = new Map(matchState.map((m) => [m.id, m.status]));
    matchState = matchState.map((m) => tickMatch(m, now));

    matchState.forEach((m) => {
      const wasFinished = previousStatuses.get(m.id) === "finished";
      if (m.status === "finished" && !wasFinished && m.chainMatchId !== null) {
        resolveTennisMatchOnChain(m.homeTeam, m.awayTeam, m.sim.result);
      }
    });
  }
  emit();
}

function pauseEngine() { paused = true; }
function resumeEngine() { paused = false; }

export function initTennisMatchManager() {
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

export function stopTennisMatchManager() {
  clearInterval(tickInterval);
  initialized = false;
  matchState = [];
  if (typeof window !== "undefined") {
    window.removeEventListener("offline", pauseEngine);
    window.removeEventListener("online", resumeEngine);
  }
}
