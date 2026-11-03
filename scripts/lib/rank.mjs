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
