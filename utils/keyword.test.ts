import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyze, isStopwordKeyword } from '../scripts/lib/seo-score.mjs';

/**
 * A focus keyword made only of stopwords is not a focus keyword.
 *
 * Reported by @itx.wardah on 17 Nov 2026: the panel showed SEO 100 while she wrote and the
 * results gave 96. The keyword was "the", which scored a perfect 35/35 — not because the
 * post was optimised for it, but because "the" is in every title, slug, subheading, opening
 * and description by construction. `judge-contest.mjs` has always filtered stopwords out of
 * its own candidates, so the contest could never award the number the panel promised.
 *
 * On her week 16 entry the gap was the round: judged on "sister" she took 4th with a
 * combined 98, while three entries tied at 100 and took 200 HIVE each.
 */

const post = [
  '# The Best Well Spent Days',
  '',
  'I always share numbers with my sister, and our plans for the day.',
  '',
  '## Morning with my sister',
  '',
  'We woke early. My sister made breakfast and we counted the cost together.',
].join('\n');
const title = 'The Best Well Spent Days With My Sister';

// seoMax is the tell: 100 when a keyword is in play and the 35-point gate is live, 65 when
// there is effectively no keyword. A rejected stopword must land on 65, exactly as if the
// field had been left empty.
const scored = (kw: string) => {
  const a = analyze(post, title, ['hivepulse'], 'A day with my sister, and what it cost.', kw);
  return { score: a.seoScore, max: a.seoMax };
};

describe('stopword-only keywords are refused', () => {
  it('rejects a single stopword', () => {
    expect(isStopwordKeyword('the')).toBe(true);
  });

  it('rejects a phrase that is entirely stopwords', () => {
    // "the best" reads like a keyword and is not one — both words are stopwords.
    expect(isStopwordKeyword('the best')).toBe(true);
  });

  it('accepts a phrase that contains a real word', () => {
    // The check is "every word", not "any word", so a generic qualifier beside a real
    // noun still counts. Rejecting "best sister" would punish ordinary phrasing.
    expect(isStopwordKeyword('best sister')).toBe(false);
    expect(isStopwordKeyword('sister')).toBe(false);
  });

  it('treats an empty or whitespace keyword as absent, not as a stopword', () => {
    expect(isStopwordKeyword('')).toBe(false);
    expect(isStopwordKeyword('   ')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isStopwordKeyword('The')).toBe(true);
    expect(isStopwordKeyword('THE BEST')).toBe(true);
  });

  it('does not open the 35-point keyword gate for a stopword', () => {
    // The whole defect in one assertion: before this, "the" scored the full 35/35 because
    // it is present everywhere a keyword is checked for. A rejected keyword must score out
    // of 65, exactly as if the field were empty.
    expect(scored('the').max).toBe(65);
    expect(scored('the').max).toBe(scored('').max);
  });

  it('still opens it for a real keyword in the same post', () => {
    expect(scored('sister').max).toBe(100);
  });

  it('gives a stopword no more raw points than an empty field', () => {
    // She picked "the" and the panel rewarded it. The stopword must now be worth exactly
    // what typing nothing is worth — no better, and no worse as a punishment either.
    expect(scored('the').score).toBe(scored('').score);
    expect(scored('sister').score).toBeGreaterThan(scored('').score);
  });
});

describe('the judge cannot pick a keyword the engine then refuses', () => {
  it('shares one stopword set with judge-contest.mjs', () => {
    // judge-contest.mjs kept its own 45-word KW_SKIP while the engine checks against the
    // 163-word KW_STOP. Words in one and not the other — "above", "well", "time",
    // "first" and 118 more — could be CHOSEN by the judge and then scored 0/35 by the
    // engine, on a keyword the judge itself selected. @angeluxx's week 6 entry was judged
    // on "above", so this was not hypothetical.
    const src = readFileSync(resolve(__dirname, '../scripts/judge-contest.mjs'), 'utf8');
    expect(src).toMatch(/const KW_SKIP = KW_STOP;/);
    expect(src).toMatch(/KW_STOP[^\n]*from '\.\/lib\/seo-score\.mjs'|KW_STOP\s*\}/);
  });
});
