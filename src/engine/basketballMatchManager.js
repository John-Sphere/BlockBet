// src/engine/basketballMatchManager.js
//
// Mirrors matchManager.js's architecture (wall-clock synced rounds,
// deterministic simulation revealed progressively as real time
// passes) adapted for basketball: 4 quarters instead of 2 halves,
// no draw, live scores computed from a dense scoring-play timeline
// instead of sparse goal events.

import { simulateBasketballMatch } from "./simulateBasketball.js";
import { calculateOdds, calculateLiveOdds } from "./basketballOddsEngine.js";
import { BASKETBALL_LEAGUES, BASKETBALL_CLUBS } from "../data/basketballClubs.js";

// ── Timing (compressed real-world minutes, same philosophy as football) ──
const BETTING_WINDOW_MS = 2 * 60 * 1000;
const QUARTER_MS        = 2 * 60 * 1000; // each of the 4 quarters
const HALFTIME_MS       = 1 * 60 * 1000; // break between Q2 and Q3
const ROUND_PERIOD_MS   = 20 * 60 * 1000;
const STAGGER_MS        = 20 * 1000;

let matchState = [];
let listeners = [];
let tickInterval = null;
let initialized = false;
let paused = false;
const fixtureListCache = {};

function emit() {
  listeners.forEach((fn) => fn(matchState));
}

export function subscribe(fn) {
  listeners.push(fn);
  fn(matchState);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

function currentRoundEpoch() {
  return Math.floor(Date.now() / ROUND_PERIOD_MS);
}

function matchesForLeague(leagueId) {
  const count = BASKETBALL_CLUBS.filter((c) => c.leagueId === leagueId).length;
  return Math.max(1, Math.floor(count / 2));
}

// Deterministic per-league shuffle, same fixed-seed philosophy as
// football's clubs — every visitor computes the identical fixture
// list without needing a shared backend.
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
    const teams = BASKETBALL_CLUBS.filter((c) => c.leagueId === leagueId);
    const pairs = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i !== j) pairs.push({ home: teams[i], away: teams[j] });
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

function createMatch(leagueId, leagueName, fixture, round, baseTime, delayMs) {
  const { home, away } = fixture;
  const sim = simulateBasketballMatch(home, away, round);
  const baseOdds = calculateOdds(home.ratings, away.ratings);

  const kickOffAt    = baseTime + delayMs + BETTING_WINDOW_MS;
  const q1At         = kickOffAt;
  const q2At         = q1At + QUARTER_MS;
  const halftimeAt   = q2At + QUARTER_MS;
  const q3At         = halftimeAt + HALFTIME_MS;
  const q4At         = q3At + QUARTER_MS;
  const finishedAt   = q4At + QUARTER_MS;

  return {
    id: `${leagueId}-${round}-${home.id}-${away.id}`,
    sport: "basketball",
    leagueId,
    leagueName,
    homeTeam: home.name,
    awayTeam: away.name,
    homeClub: home,
    awayClub: away,
    sim,
    status: "betting",
    quarter: 0,
    elapsedMinutes: 0,
    homeScore: 0,
    awayScore: 0,
    oddsHome: baseOdds.home,
    oddsAway: baseOdds.away,
    probabilities: baseOdds.probabilities,
    kickOffAt, q1At, q2At, halftimeAt, q3At, q4At, finishedAt,
    chainMatchId: null,
    poolHome: 0, poolAway: 0, hasRealPool: false,
  };
}

function buildLeagueRound(leagueId, leagueName, epoch) {
  const count = matchesForLeague(leagueId);
  const fixtures = getFixturesForRound(leagueId, epoch, count);
  const baseTime = epoch * ROUND_PERIOD_MS;
  const round = `bball-epoch${epoch}`;
  return fixtures.map((fx, i) => createMatch(leagueId, leagueName, fx, round, baseTime, i * STAGGER_MS));
}

// Returns total points scored by each side up to a given elapsed
// game-minute (0-48), from the pre-simulated dense play timeline.
function scoreAtMinute(sim, elapsedMinutes) {
  let home = 0, away = 0;
  for (const play of sim.timeline) {
    if (play.minute > elapsedMinutes) break;
    if (play.team === "home") home += play.points;
    else away += play.points;
  }
  return { home, away };
}

function tickMatch(match, now) {
  const { kickOffAt, q2At, halftimeAt, q3At, q4At, finishedAt } = match;

  if (now < kickOffAt) return match; // still in betting window

  if (now >= finishedAt) {
    return {
      ...match, status: "finished", quarter: 4, elapsedMinutes: 48,
      homeScore: match.sim.homeScore, awayScore: match.sim.awayScore,
    };
  }

  let status, quarter, elapsedMinutes;
  if (now < q2At) { status = "q1"; quarter = 1; elapsedMinutes = ((now - kickOffAt) / (q2At - kickOffAt)) * 12; }
  else if (now < halftimeAt) { status = "q2"; quarter = 2; elapsedMinutes = 12 + ((now - q2At) / (halftimeAt - q2At)) * 12; }
  else if (now < q3At) { status = "halftime"; quarter = 2; elapsedMinutes = 24; }
  else if (now < q4At) { status = "q3"; quarter = 3; elapsedMinutes = 24 + ((now - q3At) / (q4At - q3At)) * 12; }
  else { status = "q4"; quarter = 4; elapsedMinutes = 36 + ((now - q4At) / (finishedAt - q4At)) * 12; }

  const { home: homeScore, away: awayScore } = scoreAtMinute(match.sim, elapsedMinutes);
  const liveOdds = calculateLiveOdds(match.probabilities, elapsedMinutes, homeScore, awayScore);

  return {
    ...match, status, quarter, elapsedMinutes: +elapsedMinutes.toFixed(1),
    homeScore, awayScore,
    oddsHome: liveOdds.home, oddsAway: liveOdds.away,
  };
}

function tick() {
  if (paused) return;
  const now = Date.now();
  const epoch = currentRoundEpoch();

  // Regenerate each league's round if we've rolled into a new epoch.
  const needsRebuild = matchState.length === 0 || matchState.some((m) => !m.id.includes(`epoch${epoch}`));
  if (needsRebuild) {
    matchState = BASKETBALL_LEAGUES.flatMap((l) => buildLeagueRound(l.id, l.name, epoch));
  } else {
    const previousStatuses = new Map(matchState.map((m) => [m.id, m.status]));
    matchState = matchState.map((m) => tickMatch(m, now));

    // Reuses the same /api/resolve-match endpoint football already
    // uses — it's sport-agnostic (just takes home/away/result), so no
    // basketball-specific backend needed. Only fires once per match,
    // the instant it transitions to finished.
    matchState.forEach((m) => {
      const wasFinished = previousStatuses.get(m.id) === "finished";
      if (m.status === "finished" && !wasFinished && m.chainMatchId !== null) {
        resolveBasketballMatchOnChain(m.homeTeam, m.awayTeam, m.sim.result);
      }
    });
  }
  emit();
}

async function resolveBasketballMatchOnChain(home, away, result) {
  try {
    await fetch(`/api/resolve-match?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&result=${result}`);
  } catch {
    // Best-effort — the fallback cron won't cover basketball yet
    // (it only reconstructs football's fixture space), so a failed
    // request here is a real, known gap, not just a retry-later case.
  }
}

function pauseEngine() { paused = true; }
function resumeEngine() { paused = false; }

export function initBasketballMatchManager() {
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

export function stopBasketballMatchManager() {
  clearInterval(tickInterval);
  initialized = false;
  matchState = [];
  if (typeof window !== "undefined") {
    window.removeEventListener("offline", pauseEngine);
    window.removeEventListener("online", resumeEngine);
  }
}
