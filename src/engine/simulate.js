/**
 * BLOCKBET Virtual Football Simulation Engine
 *
 * Uses club ratings to generate realistic match outcomes.
 * No Math.random() for result determination — outcomes are
 * weighted by Attack, Defence, Midfield, Form ratings.
 *
 * Architecture:
 *   1. computeStrength()   — convert ratings into match strength
 *   2. simulateHalf()      — simulate 45 minutes of football
 *   3. simulateMatch()     — full 90 min with HT, added time
 *   4. buildTimeline()     — ordered event list
 */

// ─── SEEDED PRNG ──────────────────────────────────────────────────────────────
// We use a seeded PRNG so results are deterministic per matchId.
// This is NOT crypto-random — it is designed to produce repeatable
// but varied outcomes from ratings-based weights.

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeSeed(homeId, awayId, round) {
  // Convert string ids to numeric seed
  const str = `${homeId}-${awayId}-${round}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Clamp value between min and max */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** Weighted random integer between lo and hi, biased by weight 0–1 */
function weightedInt(rng, lo, hi, weight) {
  const base = rng() * (hi - lo) + lo;
  return Math.round(clamp(base * weight, lo, hi));
}

// ─── STRENGTH COMPUTATION ─────────────────────────────────────────────────────

/**
 * computeStrength
 * Converts a club's ratings object into a single normalised strength [0–1].
 * Weights derived from football analytics research.
 */
function computeStrength(ratings, isHome) {
  const {
    attack, midfield, defence, goalkeeping,
    overall, form, homeAdvantage, awayPerformance,
  } = ratings;

  const base =
    attack      * 0.28 +
    midfield    * 0.22 +
    defence     * 0.22 +
    goalkeeping * 0.12 +
    overall     * 0.10 +
    form        * 0.06;

  const locationMod = isHome
    ? 1 + homeAdvantage / 200      // e.g. homeAdv=8 → +4%
    : awayPerformance / 100;       // normalise away perf

  return clamp((base / 100) * locationMod, 0.1, 1.5);
}

// ─── POSSESSION ───────────────────────────────────────────────────────────────

/**
 * computePossession
 * Returns [homePct, awayPct] based on midfield strength ratio.
 */
function computePossession(rng, home, away) {
  const hMid = home.ratings.midfield + home.ratings.form * 0.3;
  const aMid = away.ratings.midfield + away.ratings.form * 0.3;
  const total = hMid + aMid;
  const base  = clamp(hMid / total, 0.3, 0.7);
  const noise = (rng() - 0.5) * 0.06; // ±3%
  const h = Math.round(clamp(base + noise, 0.3, 0.7) * 100);
  return [h, 100 - h];
}

// ─── HALF SIMULATION ──────────────────────────────────────────────────────────

/**
 * simulateHalf
 * Simulates one half (45 min) and returns goals and events.
 * Goals are derived from attack strength vs opponent defence.
 */
function simulateHalf(rng, home, away, isFirstHalf, homeStrength, awayStrength) {
  const events    = [];
  const startMin  = isFirstHalf ? 1 : 46;
  const endMin    = isFirstHalf ? 45 : 90;

  let homeGoals = 0;
  let awayGoals = 0;

  // Normalise attack/defence matchup
  const hAttack  = (home.ratings.attack + home.ratings.midfield * 0.4) / 140 * homeStrength;
  const aDefence = (away.ratings.defence + away.ratings.goalkeeping * 0.6) / 160;
  const aAttack  = (away.ratings.attack + away.ratings.midfield * 0.4) / 140 * awayStrength;
  const hDefence = (home.ratings.defence + home.ratings.goalkeeping * 0.6) / 160;

  // Expected goals per half (xG model)
  const hXG = clamp(hAttack / (aDefence + 0.5) * 1.2, 0.2, 2.5);
  const aXG = clamp(aAttack / (hDefence + 0.5) * 1.0, 0.1, 2.2);

  // Simulate minute by minute
  for (let min = startMin; min <= endMin; min++) {
    const minProb = 1 / 45; // per-minute base

    // Home goal attempt
    if (rng() < hXG * minProb) {
      if (rng() < 0.42) { // shots-to-goals conversion
        homeGoals++;
        events.push({ minute: min, type: "goal", team: "home", detail: pickGoalType(rng) });
      } else {
        events.push({ minute: min, type: "shot_saved", team: "home" });
      }
    }

    // Away goal attempt
    if (rng() < aXG * minProb) {
      if (rng() < 0.38) {
        awayGoals++;
        events.push({ minute: min, type: "goal", team: "away", detail: pickGoalType(rng) });
      } else {
        events.push({ minute: min, type: "shot_saved", team: "away" });
      }
    }

    // Yellow card (low prob)
    if (rng() < 0.015) {
      events.push({ minute: min, type: "yellow_card", team: rng() < 0.5 ? "home" : "away" });
    }

    // Red card (very low prob)
    if (rng() < 0.002) {
      events.push({ minute: min, type: "red_card", team: rng() < 0.5 ? "home" : "away" });
    }

    // Corner
    if (rng() < 0.06) {
      events.push({ minute: min, type: "corner", team: rng() < 0.5 ? "home" : "away" });
    }
  }

  return { homeGoals, awayGoals, events };
}

/** Pick a goal type label */
function pickGoalType(rng) {
  const types = ["Open play", "Header", "Set piece", "Penalty", "Counter attack", "Long range"];
  const weights = [0.45, 0.15, 0.18, 0.08, 0.10, 0.04];
  let r = rng(), sum = 0;
  for (let i = 0; i < types.length; i++) {
    sum += weights[i];
    if (r < sum) return types[i];
  }
  return "Open play";
}

// ─── ADDED TIME ───────────────────────────────────────────────────────────────

function addedTime(rng, goals) {
  const base = 1 + Math.floor(rng() * 3); // 1–3 base
  const goalBonus = Math.floor(goals * 0.5);
  return clamp(base + goalBonus, 1, 7);
}

// ─── STATISTICS ───────────────────────────────────────────────────────────────

function buildStats(rng, home, away, possession, homeStrength, awayStrength, events) {
  // Derive shots from events
  const homeShots = events.filter(e => (e.type === "goal" || e.type === "shot_saved") && e.team === "home").length;
  const awayShots = events.filter(e => (e.type === "goal" || e.type === "shot_saved") && e.team === "away").length;
  const homeGoals = events.filter(e => e.type === "goal" && e.team === "home").length;
  const awayGoals = events.filter(e => e.type === "goal" && e.team === "away").length;

  const homeShotsOnTarget = Math.max(homeGoals, Math.floor(homeShots * (0.35 + rng() * 0.15)));
  const awayShotsOnTarget = Math.max(awayGoals, Math.floor(awayShots * (0.32 + rng() * 0.15)));

  const homeCorners = events.filter(e => e.type === "corner" && e.team === "home").length;
  const awayCorners = events.filter(e => e.type === "corner" && e.team === "away").length;

  const homeYellow = events.filter(e => e.type === "yellow_card" && e.team === "home").length;
  const awayYellow = events.filter(e => e.type === "yellow_card" && e.team === "away").length;
  const homeRed    = events.filter(e => e.type === "red_card" && e.team === "home").length;
  const awayRed    = events.filter(e => e.type === "red_card" && e.team === "away").length;

  const homeFouls  = clamp(Math.floor(rng() * 8 + awayStrength * 6), 4, 20);
  const awayFouls  = clamp(Math.floor(rng() * 8 + homeStrength * 5), 3, 18);

  return {
    possession,
    shots:         [homeShots + Math.floor(rng() * 4), awayShots + Math.floor(rng() * 3)],
    shotsOnTarget: [homeShotsOnTarget, awayShotsOnTarget],
    corners:       [homeCorners, awayCorners],
    fouls:         [homeFouls, awayFouls],
    yellowCards:   [homeYellow, awayYellow],
    redCards:      [homeRed, awayRed],
  };
}

// ─── MAIN SIMULATE FUNCTION ───────────────────────────────────────────────────

/**
 * simulateMatch
 *
 * @param {object} homeClub  — club object with ratings
 * @param {object} awayClub  — club object with ratings
 * @param {string} round     — unique round identifier for seeding
 * @returns {MatchResult}
 */
export function simulateMatch(homeClub, awayClub, round = "1") {
  // Seed ensures the SAME matchup in the SAME round always gives the same result.
  const seed = makeSeed(homeClub.id, awayClub.id, round);
  const rng  = mulberry32(seed);

  const homeStrength = computeStrength(homeClub.ratings, true);
  const awayStrength = computeStrength(awayClub.ratings, false);

  // Possession
  const possession = computePossession(rng, homeClub, awayClub);

  // First half
  const first = simulateHalf(rng, homeClub, awayClub, true, homeStrength, awayStrength);

  // Added time first half
  const htAdded = addedTime(rng, first.homeGoals + first.awayGoals);
  const htEvents = simulateHalf(rng, homeClub, awayClub, false, homeStrength, awayStrength);
  // Inject HT added time goals
  const htAddedEvents = [];
  for (let m = 46; m <= 45 + htAdded; m++) {
    if (rng() < 0.04) {
      const team = rng() < homeStrength / (homeStrength + awayStrength) ? "home" : "away";
      htAddedEvents.push({ minute: `45+${m - 45}`, type: "goal", team, detail: "Added time" });
      if (team === "home") first.homeGoals++;
      else first.awayGoals++;
    }
  }

  // Second half
  const second = simulateHalf(rng, homeClub, awayClub, false, homeStrength, awayStrength);

  // Added time second half
  const ftAdded = addedTime(rng, second.homeGoals + second.awayGoals);
  const ftAddedEvents = [];
  for (let m = 1; m <= ftAdded; m++) {
    if (rng() < 0.05) {
      const team = rng() < homeStrength / (homeStrength + awayStrength) ? "home" : "away";
      ftAddedEvents.push({ minute: `90+${m}`, type: "goal", team, detail: "Added time" });
      if (team === "home") second.homeGoals++;
      else second.awayGoals++;
    }
  }

  const homeScore = first.homeGoals + second.homeGoals;
  const awayScore = first.awayGoals + second.awayGoals;

  // Determine result
  const result = homeScore > awayScore ? 1 : homeScore < awayScore ? 3 : 2;

  // Build full event timeline
  const allEvents = [
    ...first.events, ...htAddedEvents,
    { minute: "HT", type: "halftime", score: `${first.homeGoals}-${first.awayGoals}` },
    ...second.events, ...ftAddedEvents,
    { minute: "FT", type: "fulltime", score: `${homeScore}-${awayScore}` },
  ].sort((a, b) => {
    const toNum = m => {
      if (m === "HT") return 45.5;
      if (m === "FT") return 91;
      if (typeof m === "string" && m.includes("+")) {
        const [base, extra] = m.split("+").map(Number);
        return base + extra * 0.1;
      }
      return Number(m);
    };
    return toNum(a.minute) - toNum(b.minute);
  });

  // Full statistics
  const stats = buildStats(
    rng, homeClub, awayClub, possession,
    homeStrength, awayStrength, allEvents
  );

  return {
    homeTeam:    homeClub.name,
    awayTeam:    awayClub.name,
    homeScore,
    awayScore,
    result,          // 1=home, 2=draw, 3=away
    firstHalf:   { home: first.homeGoals,  away: first.awayGoals },
    addedTimeHT: htAdded,
    addedTimeFT: ftAdded,
    stats,
    timeline:    allEvents,
    homeStrength: +homeStrength.toFixed(3),
    awayStrength: +awayStrength.toFixed(3),
    seed,
  };
}

// ─── SUMMARY HELPER ───────────────────────────────────────────────────────────

/**
 * matchSummary — human-readable result string
 */
export function matchSummary(result) {
  const { homeTeam, awayTeam, homeScore, awayScore } = result;
  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : "Draw";
  return `${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${winner})`;
}