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
export const byRank = (x, y) =>
  (y.qualifies - x.qualifies) ||
  (y.combinedExact - x.combinedExact) ||
  (y.geoScore - x.geoScore) ||
  (x.easeGap - y.easeGap) ||
  (x.created - y.created) ||
  x.author.localeCompare(y.author) ||
  x.permlink.localeCompare(y.permlink);
