/**
 * BLOCKBET Match Manager — Phase 2
 * Manages full lifecycle of virtual matches.
 *
 * SHARED STATE ACROSS ALL VISITORS, WITHOUT A BACKEND:
 * simulate.js already produces a fully deterministic result from a
 * seed (same seed = same match, always). Previously each browser
 * seeded itself using its own page-load time (Date.now()), so every
 * visitor computed different fixtures and scores from the same code.
 *
 * Fixed here by anchoring everything to the real-world clock instead:
 * time is divided into fixed-length "rounds" (ROUND_PERIOD_MS), and
 * which fixtures play + when they kick off is a pure function of
 * (league, current round number) — not of when any individual browser
 * happened to load the page. Any two visitors loading at the same
 * real moment compute the identical matches, scores, and timers.
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
const CHAIN_SYNC_MS     = 45 * 1000; // was 15s — reduced to ease RPC rate-limit pressure

// A full round needs to comfortably fit: the last (most-staggered)
// match's kickoff delay + its full 90-minute cycle + the result-hold
// window, with margin. 12 minutes covers up to 10 staggered matches
// (the max for a 20-club league) safely.
const ROUND_PERIOD_MS = 12 * 60 * 1000;

function matchesForLeague(leagueId) {
  const count = CLUBS.filter((c) => c.leagueId === leagueId).length;
  return Math.max(1, Math.floor(count / 2));
}

// The current round number, shared by every visitor since it's derived
// purely from the real clock, not from when this browser loaded.
function currentRoundEpoch() {
  return Math.floor(Date.now() / ROUND_PERIOD_MS);
}

function roundStartTime(epoch) {
  return epoch * ROUND_PERIOD_MS;
}

// ── MODULE STATE ────────────────────────────────────────────
let matchState     = [];
let listeners       = new Set();
let initialized      = false;
let tickInterval     = null;
let chainInterval    = null;
let paused           = false;
let adminOverrides   = {};
let fixtureListCache = {}; // { leagueId: shuffledFixtures } — fixed order, not time-based
let leagueRoundEpoch = {}; // { leagueId: epoch currently loaded }

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

// ── CHAIN SYNC (on-demand, called from BetSlipContext) ───────
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

// ── FIXTURE SELECTION — pure function of (league, round epoch) ──────
// Fixed shuffle order (no time-based seed), so it's identical for
// every visitor forever. Which fixtures play in a given round is a
// sliding window into that fixed list, indexed purely by epoch —
// no stored "cursor" that depends on how many times this specific
// browser has advanced through rounds.
function getLeagueFixtureList(leagueId) {
  if (!fixtureListCache[leagueId]) {
    const raw = generateLeagueFixtures(leagueId);
    // Fixed seed derived only from the league id — same order for
    // every visitor, forever, not tied to any clock.
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
  for (let i = 0; i < count; i++) {
    picked.push(fixtures[(startIdx + i) % fixtures.length]);
  }
  return picked;
}

// ── CREATE MATCH ────────────────────────────────────────────
// baseTime is the shared round start time (same for every visitor),
// not each browser's own Date.now() — this is what makes kickoff
// timers, and therefore live minute/score display, line up exactly
// across every visitor watching the same round.
function createMatch(leagueId, leagueName, leagueFlag, fixture, round, baseTime, delayMs = 0) {
  const home = applyClubAdjustments(fixture.home);
  const away = applyClubAdjustments(fixture.away);
  const odds = calculateOdds(home.ratings, away.ratings);
  const sim  = simulateMatch(home, away, round);

  return {
    id:           `${leagueId}-${round}-${fixture.home.id}-${fixture.away.id}`,
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
    bettingEndsAt: baseTime + delayMs + BETTING_WINDOW_MS,
    kickOffAt:     baseTime + delayMs + BETTING_WINDOW_MS,
    htAt:          baseTime + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS,
    secondHalfAt:  baseTime + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS + HT_DURATION_MS,
    ftAt:          baseTime + delayMs + BETTING_WINDOW_MS + HALF_DURATION_MS * 2 + HT_DURATION_MS,
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

// Builds every match for one league's current round — deterministic
// given only (leagueId, epoch), so any visitor computing this for the
// same epoch gets byte-for-byte the same set of matches.
function buildLeagueRound(leagueId, leagueName, leagueFlag, epoch) {
  const count = matchesForLeague(leagueId);
  const fixtures = getFixturesForRound(leagueId, epoch, count);
  const baseTime = roundStartTime(epoch);
  return fixtures.map((fix, i) =>
    createMatch(leagueId, leagueName, leagueFlag, fix, `epoch${epoch}-${i}`, baseTime, i * STAGGER_MS)
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
        recordResult(finished);
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
  const epoch = currentRoundEpoch();

  matchState = matchState.map(m => tickMatch(m, now));

  // A league's round advances exactly when the real-world clock
  // crosses into a new round period — identical moment for every
  // visitor, so nobody's browser ever falls out of sync with anyone
  // else's, regardless of when they loaded the page.
  LEAGUES.forEach(league => {
    if (leagueRoundEpoch[league.id] === epoch) return;
    leagueRoundEpoch[league.id] = epoch;
    const fresh = buildLeagueRound(league.id, league.name, league.flag, epoch);
    matchState = [
      ...matchState.filter(m => m.leagueId !== league.id),
      ...fresh,
    ];
  });

  emit();
}

// ── INIT ────────────────────────────────────────────────────
export function initMatchManager() {
  if (initialized) return;
  initialized = true;

  const epoch = currentRoundEpoch();
  LEAGUES.forEach(league => {
    leagueRoundEpoch[league.id] = epoch;
    const matches = buildLeagueRound(league.id, league.name, league.flag, epoch);
    matchState.push(...matches);
  });

  tickInterval = setInterval(tick, 1000);

  chainInterval = setInterval(syncChainIds, CHAIN_SYNC_MS);
  syncChainIds();

  emit();
}

export function stopMatchManager() {
  clearInterval(tickInterval);
  clearInterval(chainInterval);
  initialized      = false;
  matchState        = [];
  fixtureListCache  = {};
  leagueRoundEpoch  = {};
  paused            = false;
}
