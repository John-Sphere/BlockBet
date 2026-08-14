/**
 * BLOCKBET Match Manager — Phase 2
 * Manages full lifecycle of virtual matches.
 * Generates 3 matches per league = 18 simultaneous matches.
 * Staggered kick-offs so not all matches start at once.
 */

import { simulateMatch }       from "./simulate.js";
import { calculateOdds }       from "./oddsEngine.js";
import { generateLeagueFixtures, shuffleFixtures } from "./fixtureGenerator.js";
import { LEAGUES }             from "../data/clubs.js";
import { fetchActiveChainMatches, matchKey } from "./chainSync.js";

// ── TIMING ─────────────────────────────────────────────────
const BETTING_WINDOW_MS = 2  * 60 * 1000;
const HALF_DURATION_MS  = 2  * 60 * 1000;
const HT_DURATION_MS    = 1  * 60 * 1000;
const RESULT_HOLD_MS    = 2  * 60 * 1000;
const STAGGER_MS        = 45 * 1000;
const MATCHES_PER_LEAGUE= 3;
const CHAIN_SYNC_MS     = 15 * 1000; // check for on-chain match IDs every 15s

// ── MODULE STATE ────────────────────────────────────────────
let matchState    = [];
let listeners     = new Set();
let initialized   = false;
let tickInterval  = null;
let chainInterval = null;
let paused        = false;
let adminOverrides= {};
let fixtureCache  = {};
let fixtureIndex  = {};

// ── SUBSCRIBE ───────────────────────────────────────────────
export function subscribe(fn) {
  listeners.add(fn);
  fn([...matchState]);
  return () => listeners.delete(fn);
}

function emit() {
  const snapshot = [...matchState];
  listeners.forEach(fn => fn(snapshot));
}

// ── ADMIN CONTROLS ──────────────────────────────────────────
export function setAdminOverrides(overrides) {
  adminOverrides = overrides || {};
}

export function pauseEngine() {
  paused = true;
}

export function resumeEngine() {
  paused = false;
}

export function getCurrentMatches() {
  return [...matchState];
}

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

// ── CHAIN SYNC — fills in chainMatchId once create-matches.js has
//    registered the corresponding fixture on-chain ─────────────
async function syncChainIds() {
  const chainMap = await fetchActiveChainMatches();
  if (!Object.keys(chainMap).length) return;
  let changed = false;
  matchState = matchState.map(m => {
    if (m.chainMatchId !== null && m.chainMatchId !== undefined) return m;
    const id = chainMap[matchKey(m.homeTeam, m.awayTeam)];
    if (id === undefined) return m;
    changed = true;
    return { ...m, chainMatchId: id };
  });
  if (changed) emit();
}

// ── CLUB OVERRIDE ───────────────────────────────────────────
function applyOverrides(club) {
  if (adminOverrides[club.id]) {
    return {
      ...club,
      ratings: { ...club.ratings, ...adminOverrides[club.id].ratings },
    };
  }
  return club;
}

// ── FIXTURE POOL ────────────────────────────────────────────
function getLeagueFixtures(leagueId) {
  if (!fixtureCache[leagueId]) {
    const raw = generateLeagueFixtures(leagueId);
    fixtureCache[leagueId] = shuffleFixtures(raw, Date.now() ^ leagueId.length);
  }
  return fixtureCache[leagueId];
}

function nextLeagueFixture(leagueId) {
  const fixtures = getLeagueFixtures(leagueId);
  if (!fixtures.length) return null;
  if (fixtureIndex[leagueId] === undefined) fixtureIndex[leagueId] = 0;
  const fix = fixtures[fixtureIndex[leagueId] % fixtures.length];
  fixtureIndex[leagueId]++;
  return fix;
}

// ── CREATE MATCH ────────────────────────────────────────────
function createMatch(leagueId, leagueName, leagueFlag, fixture, round, delayMs = 0) {
  const home = applyOverrides(fixture.home);
  const away = applyOverrides(fixture.away);
  const odds = calculateOdds(home.ratings, away.ratings);
  const sim  = simulateMatch(home, away, round);
  const now  = Date.now();

  return {
    id:           `${leagueId}-${round}-${now}-${Math.random().toString(36).slice(2,6)}`,
    leagueId,
    leagueName,
    leagueFlag:   leagueFlag || "🏆",
    homeTeam:     home.name,
    homeClubId:   home.id,
    homeLogo:     home.logo,
    awayTeam:     away.name,
    awayClubId:   away.id,
    awayLogo:     away.logo,
    _sim:         sim,
    oddsHome:     odds.home,
    oddsDraw:     odds.draw,
    oddsAway:     odds.away,
    probabilities: odds.probabilities,
    status:       "betting",
    minute:       0,
    homeScore:    0,
    awayScore:    0,
    bettingEndsAt: now + delayMs + BETTING_WINDOW_MS,
    kickOffAt:     now + delayMs + BETTING_WINDOW_MS,
    htAt:          now + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS,
    secondHalfAt:  now + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS + HT_DURATION_MS,
    ftAt:          now + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS * 2 + HT_DURATION_MS,
    finishedAt:    null,
    visibleEvents: [],
    timeline:      sim.timeline,
    stats:         null,
    result:        null,
    poolHome:      0,
    poolDraw:      0,
    poolAway:      0,
    chainMatchId:  null,
    round,
  };
}

// ── REPLACE FINISHED MATCH ──────────────────────────────────
function replaceMatch(match) {
  const league = LEAGUES.find(l => l.id === match.leagueId);
  if (!league) return null;
  const fix = nextLeagueFixture(league.id);
  if (!fix) return null;
  return createMatch(
    league.id, league.name, league.flag, fix,
    `r${Date.now()}`, 0
  );
}

// ── TICK — ADVANCE MATCH STATE ──────────────────────────────
function tickMatch(match, now) {
  switch (match.status) {

    case "betting": {
      if (now < match.kickOffAt) return match;
      return { ...match, status: "first_half", minute: 1 };
    }

    case "first_half": {
      const elapsed   = now - match.kickOffAt;
      const minute    = Math.min(45, Math.floor((elapsed / HALF_DURATION_MS) * 45));
      const vis       = getVisibleEvents(match.timeline, minute, false);
      const homeScore = vis.filter(e => e.type === "goal" && e.team === "home").length;
      const awayScore = vis.filter(e => e.type === "goal" && e.team === "away").length;
      const updated   = { ...match, minute, visibleEvents: vis, homeScore, awayScore };
      if (now >= match.htAt) return { ...updated, status: "halftime", minute: 45 };
      return updated;
    }

    case "halftime": {
      if (now >= match.secondHalfAt) return { ...match, status: "second_half", minute: 46 };
      return match;
    }

    case "second_half": {
      const elapsed   = now - match.secondHalfAt;
      const minute    = Math.min(90, 46 + Math.floor((elapsed / HALF_DURATION_MS) * 44));
      const vis       = getVisibleEvents(match.timeline, minute, true);
      const homeScore = vis.filter(e => e.type === "goal" && e.team === "home").length;
      const awayScore = vis.filter(e => e.type === "goal" && e.team === "away").length;
      const updated   = { ...match, minute, visibleEvents: vis, homeScore, awayScore };
      if (now >= match.ftAt) {
        const sim = match._sim;
        return {
          ...updated,
          status:        "finished",
          minute:        90,
          homeScore:     sim.homeScore,
          awayScore:     sim.awayScore,
          result:        sim.result,
          stats:         sim.stats,
          visibleEvents: sim.timeline,
          finishedAt:    now,
        };
      }
      return updated;
    }

    case "finished":
      return match;

    default:
      return match;
  }
}

function getVisibleEvents(timeline, upToMinute, isSecondHalf) {
  return (timeline || []).filter(e => {
    if (e.type === "halftime" || e.type === "fulltime") return false;
    const m = typeof e.minute === "number"
      ? e.minute
      : typeof e.minute === "string" && e.minute.includes("+")
        ? parseInt(e.minute.split("+")[0]) + 0.5
        : 0;
    if (isSecondHalf) return m >= 46 && m <= upToMinute;
    return m >= 1 && m <= upToMinute;
  });
}

// ── MAIN TICK ───────────────────────────────────────────────
function tick() {
  if (paused) return;
  const now = Date.now();

  matchState = matchState.map(m => tickMatch(m, now));

  matchState = matchState.map(m => {
    if (
      m.status === "finished" &&
      m.finishedAt &&
      now - m.finishedAt > RESULT_HOLD_MS
    ) {
      const replacement = replaceMatch(m);
      return replacement || m;
    }
    return m;
  });

  emit();
}

// ── INIT ────────────────────────────────────────────────────
export function initMatchManager() {
  if (initialized) return;
  initialized = true;

  LEAGUES.forEach(league => {
    const fixtures = generateLeagueFixtures(league.id);
    if (!fixtures.length) return;

    const shuffled = shuffleFixtures(fixtures, Date.now() ^ (league.id.charCodeAt(0) * 31));
    const count    = Math.min(MATCHES_PER_LEAGUE, shuffled.length);

    for (let i = 0; i < count; i++) {
      const fix   = shuffled[i];
      const delay = i * STAGGER_MS;
      matchState.push(
        createMatch(league.id, league.name, league.flag, fix, `r1-${i}`, delay)
      );
    }

    fixtureIndex[league.id] = count;
    fixtureCache[league.id] = shuffled;
  });

  tickInterval = setInterval(tick, 1000);

  // Poll the chain periodically to pick up chainMatchId once
  // create-matches.js has registered the corresponding fixture.
  chainInterval = setInterval(syncChainIds, CHAIN_SYNC_MS);
  syncChainIds();

  emit();
}

export function stopMatchManager() {
  clearInterval(tickInterval);
  clearInterval(chainInterval);
  initialized  = false;
  matchState   = [];
  fixtureCache = {};
  fixtureIndex = {};
  paused       = false;
}
