/**
 * BLOCKBET Match Manager
 *
 * Manages the lifecycle of virtual matches:
 * scheduled → live → halftime → live → finished
 *
 * Runs entirely in the browser — no server needed for Phase 2.
 * Integrates with the simulation engine for pre-calculated results.
 */

import { simulateMatch }      from "./simulate.js";
import { calculateOdds }      from "./oddsEngine.js";
import { generateAllFixtures, shuffleFixtures } from "./fixtureGenerator.js";
import { LEAGUES }            from "../data/clubs.js";

// Match duration constants (in ms)
const BETTING_WINDOW_MS  = 2 * 60 * 1000;  // 2 min to place bets
const MATCH_DURATION_MS  = 4 * 60 * 1000;  // 4 min simulated match
const HT_DURATION_MS     = 1 * 60 * 1000;  // 1 min HT
const RESULT_DISPLAY_MS  = 2 * 60 * 1000;  // 2 min to claim
const CYCLE_MS           = BETTING_WINDOW_MS + MATCH_DURATION_MS + HT_DURATION_MS + RESULT_DISPLAY_MS;

let matchState      = [];
let listeners       = new Set();
let fixtureQueue    = [];
let fixtureIndex    = 0;
let initialized     = false;
let adminOverrides  = {}; // { clubId: { ratings: {...} } } from admin panel

/** Subscribe to match state changes */
export function subscribe(fn) {
  listeners.add(fn);
  fn(matchState); // emit current state immediately
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach(fn => fn([...matchState]));
}

/** Override club ratings from admin panel */
export function setAdminOverrides(overrides) {
  adminOverrides = overrides;
}

function applyOverrides(club) {
  if (adminOverrides[club.id]) {
    return { ...club, ratings: { ...club.ratings, ...adminOverrides[club.id].ratings } };
  }
  return club;
}

/** Build a match object from a fixture */
function createMatch(fixture, round) {
  const home = applyOverrides(fixture.home);
  const away = applyOverrides(fixture.away);
  const odds = calculateOdds(home.ratings, away.ratings);
  const sim  = simulateMatch(home, away, round);

  const now = Date.now();
  return {
    id:           `${fixture.leagueId}-${round}-${Date.now()}`,
    leagueId:     fixture.leagueId,
    leagueName:   fixture.leagueName,
    leagueFlag:   fixture.leagueFlag || "🏆",
    homeTeam:     home.name,
    homeClubId:   home.id,
    homeLogo:     home.logo,
    awayTeam:     away.name,
    awayClubId:   away.id,
    awayLogo:     away.logo,
    // Pre-computed result (revealed only at FT)
    _sim:         sim,
    // Odds
    oddsHome:     odds.home,
    oddsDraw:     odds.draw,
    oddsAway:     odds.away,
    probabilities: odds.probabilities,
    // Status lifecycle
    status:       "betting",  // betting → first_half → halftime → second_half → finished
    minute:       0,
    homeScore:    0,
    awayScore:    0,
    // Timing
    bettingEndsAt: now + BETTING_WINDOW_MS,
    kickOffAt:     now + BETTING_WINDOW_MS,
    htAt:          now + BETTING_WINDOW_MS + MATCH_DURATION_MS / 2,
    ftAt:          now + BETTING_WINDOW_MS + MATCH_DURATION_MS + HT_DURATION_MS,
    finishedAt:    null,
    // Timeline (revealed progressively)
    visibleEvents: [],
    timeline:      sim.timeline,
    // Stats (revealed at FT)
    stats:         null,
    // Result (1=home,2=draw,3=away — hidden until FT)
    result:        null,
    // Chain
    poolHome:      0,
    poolDraw:      0,
    poolAway:      0,
    chainMatchId:  null,
    round,
  };
}

/** Get next fixture from queue */
function nextFixture() {
  if (!fixtureQueue.length) {
    fixtureQueue = shuffleFixtures(generateAllFixtures(), Date.now());
  }
  const f = fixtureQueue[fixtureIndex % fixtureQueue.length];
  fixtureIndex++;
  return f;
}

/** Advance a match through its lifecycle */
function tickMatch(match, now) {
  const elapsed = now - match.kickOffAt;
  const totalMs = MATCH_DURATION_MS + HT_DURATION_MS;

  // Phase: BETTING
  if (match.status === "betting" && now >= match.kickOffAt) {
    return { ...match, status: "first_half", minute: 1 };
  }

  // Phase: FIRST HALF
  if (match.status === "first_half") {
    const halfElapsed = now - match.kickOffAt;
    const halfDuration = MATCH_DURATION_MS / 2;
    const minute = Math.min(45, Math.floor((halfElapsed / halfDuration) * 45));

    // Reveal first-half events
    const visibleEvents = match.timeline.filter(e => {
      const m = typeof e.minute === "number" ? e.minute : 0;
      return m <= minute && e.type !== "fulltime" && e.type !== "halftime";
    });

    // Running score from visible goals
    const hScore = visibleEvents.filter(e => e.type === "goal" && e.team === "home").length;
    const aScore = visibleEvents.filter(e => e.type === "goal" && e.team === "away").length;

    const updated = { ...match, minute, visibleEvents, homeScore: hScore, awayScore: aScore };

    if (now >= match.htAt) {
      return { ...updated, status: "halftime", minute: 45 };
    }
    return updated;
  }

  // Phase: HALF TIME
  if (match.status === "halftime") {
    const secondStart = match.htAt + HT_DURATION_MS;
    if (now >= secondStart) {
      return { ...match, status: "second_half", minute: 46 };
    }
    return match;
  }

  // Phase: SECOND HALF
  if (match.status === "second_half") {
    const secondStart = match.htAt + HT_DURATION_MS;
    const secondElapsed = now - secondStart;
    const halfDuration  = MATCH_DURATION_MS / 2;
    const minute = Math.min(90, 46 + Math.floor((secondElapsed / halfDuration) * 44));

    const sim = match._sim;
    const visibleEvents = match.timeline.filter(e => {
      const m = typeof e.minute === "number" ? e.minute : (e.minute === "HT" ? 45 : 0);
      return m <= minute && e.type !== "fulltime";
    });

    const hScore = visibleEvents.filter(e => e.type === "goal" && e.team === "home").length;
    const aScore = visibleEvents.filter(e => e.type === "goal" && e.team === "away").length;

    const updated = { ...match, minute, visibleEvents, homeScore: hScore, awayScore: aScore };

    if (now >= match.ftAt) {
      return {
        ...updated,
        status:    "finished",
        minute:    90,
        homeScore: sim.homeScore,
        awayScore: sim.awayScore,
        result:    sim.result,
        stats:     sim.stats,
        visibleEvents: sim.timeline,
        finishedAt: now,
      };
    }
    return updated;
  }

  return match;
}

let tickInterval = null;
let paused       = false;

export function pauseEngine()  { paused = true; }
export function resumeEngine() { paused = false; }

export function initMatchManager() {
  if (initialized) return;
  initialized = true;

  // Seed initial matches (one per league)
  const leagues = LEAGUES;
  leagues.forEach(league => {
    const fix = nextFixture();
    if (fix) matchState.push(createMatch(fix, `r${fixtureIndex}`));
  });

  // Tick every second
  tickInterval = setInterval(() => {
    if (paused) return;
    const now = Date.now();

    matchState = matchState.map(m => tickMatch(m, now));

    // Replace finished matches after RESULT_DISPLAY_MS
    matchState = matchState.map(m => {
      if (m.status === "finished" && m.finishedAt && now - m.finishedAt > RESULT_DISPLAY_MS) {
        const fix = nextFixture();
        return fix ? createMatch(fix, `r${fixtureIndex}`) : m;
      }
      return m;
    });

    emit();
  }, 1000);
}

export function stopMatchManager() {
  clearInterval(tickInterval);
  initialized = false;
  matchState  = [];
}

export function getCurrentMatches() {
  return matchState;
}

/** Update pool when bet is placed */
export function updateMatchPool(matchId, selection, amount) {
  matchState = matchState.map(m => {
    if (m.id !== matchId) return m;
    return {
      ...m,
      poolHome: selection === 1 ? m.poolHome + amount : m.poolHome,
      poolDraw: selection === 2 ? m.poolDraw + amount : m.poolDraw,
      poolAway: selection === 3 ? m.poolAway + amount : m.poolAway,
    };
  });
  emit();
}