/**
 * The contest ranking comparator.
 *
 * Extracted from judge-contest.mjs so it can be tested, because it is the single piece of
 * code that decides who gets paid. It had no test until week 14, when it was found to be
 * ranking a strictly lower score above a higher one.
 *
 * The published rule, in the announcement post every week:
 *
 *   "Rank = (SEO% + GEO)/2 ... If two or more entries tie, the podium goes to the post
 *    whose Reading Ease is closest to 60, then to the earlier publication time."
 *
 * Two things follow from that wording and are easy to get wrong:
 *
 *  1. The mean is compared EXACTLY. Rounding first invents ties between scores that are
 *     not tied, and the reading-ease rule then breaks a tie that should never have existed
 *     — handing the place to the lower score. Week 14: @nabbas0786 on (99+100)/2 = 99.5
 *     rounded to 100, drew level with @nursejoe's true 100, won on reading ease and took
 *     3rd place and 50 HIVE from a better post. The displayed score stays rounded; only
 *     the comparison uses the exact value.
 *
 *  2. Reading ease is compared by DISTANCE FROM 60, not by raw value. 59 and 61 are
 *     equally good; 65 is worse than both.
 */

export const EASE_TARGET = 60;

/**
 * Prize structure, EFFECTIVE FROM CONTEST WEEK 15 (round opening 3 November 2026).
 *
 * Announced in the post that OPENS week 15, so every entrant reads it before they enter.
 * That is what "announced before the round it applies to" means, and it is the same
 * pattern the week 12 GEO change used. It is the opposite of what went wrong in week 14,
 * where a ranking change was applied to a round that had already closed.
 *
 * The pool moves in both directions with the size of the field. Below the minimum nothing
 * is paid and the pool rolls into the next round, capped so the headline stays believable.
 * The reason is measured, not a hunch: across weeks 11-14 the contest gained one new
 * entrant, and only two entries in fourteen rounds ever failed the qualifying bar. The
 * constraint is discovery, not writing quality, so the reward now depends on the field.
 */
export const MIN_ENTRANTS = 5;
export const ROLLOVER_CAP = 300;
const TIERS = [
  { min: 20, pool: 600, slots: [250, 150, 100, 60, 40] },
  { min: 15, pool: 500, slots: [250, 120, 80, 50] },
  { min: 10, pool: 400, slots: [200, 100, 60, 40] },
  { min: 5,  pool: 300, slots: [150, 100, 50] },
];

/** The tier a field of n qualifying entries earns. Below MIN_ENTRANTS: nothing. */
export const tierFor = (n) =>
  n < MIN_ENTRANTS ? { pool: 0, slots: [] } : TIERS.find(t => n >= t.min);

/**
 * Apply a rolled-over pool from a round that fell below the threshold.
 *
 * The carried amount is added to whatever tier the field earns, and every slot is scaled
 * by the same factor so the places keep their published proportions and still sum to the
 * pool exactly. Week 16 is the worked example: week 15 drew four entrants, so 300 carried,
 * and a field of 5-9 now pays 600 split 300 / 200 / 100 instead of 150 / 100 / 50.
 *
 * Rounding is taken out of the top slot rather than spread, so the total is always exact
 * and first place absorbs the remainder — never a lower place being quietly short-changed.
 */
export const withRollover = (tier, carried = 0) => {
  if (!tier.pool || !carried) return tier;
  const pool = tier.pool + Math.min(carried, ROLLOVER_CAP);
  const scale = pool / tier.pool;
  const slots = tier.slots.map(s => Math.round(s * scale));
  slots[0] += pool - slots.reduce((a, b) => a + b, 0);
  return { pool, slots };
};

/**
 * Split the prize slots across ranked entries, sharing equally within a tied group.
 *
 * Replaces breaking ties on publication time, which had decided the top of the board four
 * rounds running. That rule rewarded publishing on day one of a seven-day window and
 * punished anyone who drafted, re-scored and improved first — the opposite of what the
 * tool is for.
 *
 * A tied group takes the slots it SPANS and shares their sum equally, so the total paid is
 * always the pool and only the number of recipients changes. A group may run past the last
 * slot — four entries tied for three slots are paid 75 each, which is deliberate: they are
 * genuinely tied and there is no honest way to pick three of them.
 *
 * `ranked` must already be sorted by byRank. Returns [{ ...row, prize }] for paid entries.
 */
export const allocatePrizes = (ranked, slots) => {
  const paid = [];
  let i = 0, slot = 0;
  while (slot < slots.length && i < ranked.length) {
    const score = ranked[i].combinedExact;
    const group = [];
    while (i < ranked.length && ranked[i].combinedExact === score) group.push(ranked[i++]);
    const take = slots.slice(slot, slot + group.length);
    const share = take.reduce((a, b) => a + b, 0) / group.length;
    for (const row of group) paid.push({ ...row, prize: share });
    slot += group.length;
  }
  return paid;
};

/** Distance from the reading-ease target. Lower is better. */
export const easeGap = (ease) => Math.abs(ease - EASE_TARGET);

/**
 * Sort comparator for scored entries, best first. Each row needs:
 *   qualifies (bool), combinedExact (number), geoScore, easeGap, created (ms), author, permlink
 */
/**
 * Every key this comparator reads must be a real number before it is compared. A NaN or an
 * undefined silently poisons the chain: `(NaN) || next` is falsy, so the term is skipped
 * and the comparator stops being a total order — the same three rows sort into different
 * orders depending on the order they arrive in, with no error raised anywhere.
 */
const num = (v, field, row) => {
  if (!Number.isFinite(v))
    throw new TypeError(`byRank: ${field} is ${v} for @${row?.author ?? '(unknown)'} — refusing to rank`);
  return v;
};

export const byRank = (x, y) =>
  // Number(!!v) rather than a bare subtraction: an undefined `qualifies` makes the term NaN,
  // which is falsy, so the chain would fall through and a disqualified entry could outrank a
  // qualifying one.
  (Number(!!y.qualifies) - Number(!!x.qualifies)) ||
  (num(y.combinedExact, 'combinedExact', y) - num(x.combinedExact, 'combinedExact', x)) ||
  // NOTE: a `(y.geoScore - x.geoScore)` term used to sit here, ahead of reading ease. It is
  // not in the published rule, and it pre-empted the tiebreak that is: two entries on the
  // same mean, one with GEO 90 / ease 60 and one with GEO 100 / ease 70, would be settled on
  // GEO when the rule says reading ease decides. Removed so the code matches what we publish.
  //
  // It never changed a PAID result, but it was reachable: week 5 positions 7 and 8 were
  // @cositav (SEO 83 / GEO 73) and @ekads (SEO 79 / GEO 77) — both exactly 78.0, different
  // GEO. The term did not exist until week 9, and no equal-mean/different-GEO pair has
  // occurred since, so no round was ever decided by it.
  (num(x.easeGap, 'easeGap', x) - num(y.easeGap, 'easeGap', y)) ||
  (x.created - y.created) ||
  x.author.localeCompare(y.author) ||
  x.permlink.localeCompare(y.permlink);
