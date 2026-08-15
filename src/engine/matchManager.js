/**
 * BLOCKBET Match Manager — Phase 2
 * Manages full lifecycle of virtual matches.
 * Every club in a league plays simultaneously each round (a real
 * matchday), fixtures rotate themselves via the shuffled round-robin
 * pool, and odds factor in each club's current league form.
 */

import { simulateMatch }       from "./simulate.js";
import { calculateOdds }       from "./oddsEngine.js";
import { generateLeagueFixtures, shuffleFixtures } from "./fixtureGenerator.js";
import { LEAGUES, CLUBS }      from "../data/clubs.js";
import { fetchActiveChainMatches, matchKey } from "./chainSync.js";
import { recordResult, getFormRating } from "./standings.js";

// ── TIMING ─────────────────────────────────────────────────
const BETTING_WINDOW_MS = 2  * 60 * 1000;
const HALF_DURATION_MS  = 2  * 60 * 1000;
const HT_DURATION_MS    = 1  * 60 * 1000;
const RESULT_HOLD_MS    = 2  * 60 * 1000;
const STAGGER_MS        = 20 * 1000;
const CHAIN_SYNC_MS     = 15 * 1000;

// Full matchday — every club in a league plays at once, so the
// number of simultaneous matches is half the club count (each match
// uses 2 clubs). A 20-club league runs 10 matches, an 18-club league
// runs 9.
function matchesForLeague(leagueId) {
  const count = CLUBS.filter((c) => c.leagueId === leagueId).length;
  return Math.max(1, Math.floor(count / 2));
}

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

// Asks the server to create this exact fixture on-chain (or return its
// existing ID if it's already there), then patches chainMatchId onto
// the matching client-side match once the response comes back.
//
// Called on-demand (when someone actually clicks a match to bet on it)
// rather than eagerly for every match on page load — firing 50+
// simultaneous chain-write requests from one shared signing wallet
// causes transaction ordering conflicts and most of them fail.
export async function ensureMatchOnChain(localMatchId, homeTeam, awayTeam) {
  try {
    const res = await fetch(
      `/api/ensure-match?home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.matchId === undefined) return null;
    matchState = matchState.map((m) =>
      m.id === localMatchId ? { ...m, chainMatchId: data.matchId } : m
    );
    emit();
    return data.matchId;
  } catch {
    return null;
  }
}

// ── CHAIN SYNC (fallback, catches anything ensureMatchOnChain missed) ──
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

// ── CLUB OVERRIDE + FORM ─────────────────────────────────────
// Admin overrides win first, then current table form nudges the
// resulting "form" rating so clubs on a run of good/bad results see
// their odds shift accordingly.
function applyClubAdjustments(club) {
  const overridden = adminOverrides[club.id]
    ? { ...club, ratings: { ...club.ratings, ...adminOverrides[club.id].ratings } }
    : club;

  const formAdjusted = getFormRating(overridden.name, overridden.ratings.form);
  return {
    ...overridden,
    ratings: { ...overridden.ratings, form: formAdjusted },
  };
}

// ── FIXTURE POOL ────────────────────────────────────────────
function getLeagueFixtures(leagueId) {
  if (!fixtureCache[leagueId]) {
    const raw = generateLeagueFixtures(leagueId);
    fixtureCache[leagueId] = shuffleFixtures(raw, Date.now() ^ leagueId.length);
  }
  return fixtureCache[leagueId];
}

// Pulls the next N fixtures for a league, reshuffling the pool once
// it's been fully cycled through — this is the "shuffling itself"
// behavior: every full round gets a fresh random order.
function nextLeagueFixtures(leagueId, count) {
  let fixtures = getLeagueFixtures(leagueId);
  if (!fixtures.length) return [];
  if (fixtureIndex[leagueId] === undefined) fixtureIndex[leagueId] = 0;

  const picked = [];
  for (let i = 0; i < count; i++) {
    if (fixtureIndex[leagueId] >= fixtures.length) {
      fixtures = shuffleFixtures(fixtures, Date.now() ^ (leagueId.length + i));
      fixtureCache[leagueId] = fixtures;
      fixtureIndex[leagueId] = 0;
    }
    picked.push(fixtures[fixtureIndex[leagueId]]);
    fixtureIndex[leagueId]++;
  }
  return picked;
}

// ── CREATE MATCH ────────────────────────────────────────────
function createMatch(leagueId, leagueName, leagueFlag, fixture, round, delayMs = 0) {
  const home = applyClubAdjustments(fixture.home);
  const away = applyClubAdjustments(fixture.away);
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

// ── REPLACE A FULL LEAGUE'S ROUND AT ONCE ───────────────────
// Instead of replacing one finished match at a time, once every
// match in a league's current round has finished, the whole league
// kicks off its next round together — a proper matchday.
function replaceLeagueRound(leagueId, leagueName, leagueFlag) {
  const count = matchesForLeague(leagueId);
  const fixtures = nextLeagueFixtures(leagueId, count);
  return fixtures.map((fix, i) =>
    createMatch(leagueId, leagueName, leagueFlag, fix, `r${Date.now()}-${i}`, i * STAGGER_MS)
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
        const finished = {
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
        recordResult(finished); // feeds the shared league table
        return finished;
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

  // Once every match in a league has been sitting "finished" past
  // the result-hold window, kick off that league's next full round
  // together, rather than staggering one-by-one replacements.
  LEAGUES.forEach(league => {
    const leagueMatches = matchState.filter(m => m.leagueId === league.id);
    if (!leagueMatches.length) return;
    const allDone = leagueMatches.every(
      m => m.status === "finished" && m.finishedAt && now - m.finishedAt > RESULT_HOLD_MS
    );
    if (allDone) {
      const nextRound = replaceLeagueRound(league.id, league.name, league.flag);
      matchState = [
        ...matchState.filter(m => m.leagueId !== league.id),
        ...nextRound,
      ];
    }
  });

  emit();
}

// ── INIT ────────────────────────────────────────────────────
export function initMatchManager() {
  if (initialized) return;
  initialized = true;

  LEAGUES.forEach(league => {
    const count = matchesForLeague(league.id);
    const fixtures = nextLeagueFixtures(league.id, count);
    fixtures.forEach((fix, i) => {
      const match = createMatch(league.id, league.name, league.flag, fix, `r1-${i}`, i * STAGGER_MS);
      matchState.push(match);
    });
  });

  tickInterval = setInterval(tick, 1000);

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
