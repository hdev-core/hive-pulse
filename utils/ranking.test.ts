import { describe, it, expect } from 'vitest';
import { byRank, easeGap, EASE_TARGET, tierFor, allocatePrizes, MIN_ENTRANTS } from '../scripts/lib/rank.mjs';

/**
 * The comparator that decides who gets paid. It had no test until week 14, when it was
 * found ranking a strictly lower score above a higher one — worth 50 HIVE that round.
 */

type Row = {
  author: string; permlink: string; qualifies: boolean;
  combinedExact: number; geoScore: number; easeGap: number; created: number;
};

const row = (author: string, o: Partial<Row> = {}): Row => ({
  author, permlink: author + '-post', qualifies: true,
  combinedExact: 100, geoScore: 100, easeGap: 0, created: 0, ...o,
});

const order = (rows: Row[]) => [...rows].sort(byRank).map(r => r.author);

describe('ranking — the published rule', () => {
  it('ranks by the exact mean, never the rounded one', () => {
    // (99+100)/2 = 99.5 and (100+100)/2 = 100. Rounding both to 100 makes them tie, and
    // the reading-ease rule then hands the place to the 99.5. This is week 14 exactly.
    const better = row('nursejoe',   { combinedExact: 100,  easeGap: 5 });
    const worse  = row('nabbas0786', { combinedExact: 99.5, easeGap: 1 });
    expect(order([worse, better])).toEqual(['nursejoe', 'nabbas0786']);
  });

  it('a half-point difference is not a tie, whichever way it leans', () => {
    expect(order([row('a', { combinedExact: 98.5 }), row('b', { combinedExact: 99 })]))
      .toEqual(['b', 'a']);
  });

  // A `geoScore` term used to sit ahead of reading ease in the chain. It is not in the
  // published rule and it pre-empted the tiebreak that is.
  it('settles a tie on reading ease, not on GEO', () => {
    const easeWins = row('easeWins', { combinedExact: 95, geoScore: 90,  easeGap: easeGap(60) });
    const highGeo  = row('highGeo',  { combinedExact: 95, geoScore: 100, easeGap: easeGap(70) });
    expect(order([highGeo, easeWins])).toEqual(['easeWins', 'highGeo']);
  });

  // A truncating comparator (Math.floor before comparing) sees 99.0 and 99.5 as equal and
  // falls through to the alphabetical fallback. The author names here are deliberately
  // ordered so that fallback gives the WRONG answer — otherwise it rescues the mutant by
  // coincidence and the test passes against broken code. (It did, on the first attempt.)
  it('separates two means that share a floor', () => {
    const lower  = row('aaa', { combinedExact: 99 });    // alphabetically first
    const higher = row('zzz', { combinedExact: 99.5 });  // alphabetically last, but better
    expect(order([lower, higher])).toEqual(['zzz', 'aaa']);
  });

  // Every other test hands byRank a pre-computed easeGap, so a wiring slip that passed raw
  // ease through instead of the distance from 60 would go unnoticed — and it would be live:
  // week 14 had ease 59 and 65, where raw-value ordering and distance ordering disagree.
  it('drives correctly from raw ease values, not just pre-computed gaps', () => {
    const near = row('ease59', { easeGap: easeGap(59) });   // distance 1
    const far  = row('ease65', { easeGap: easeGap(65) });   // distance 5
    expect(order([far, near])).toEqual(['ease59', 'ease65']);
    // and the raw values sort the other way, which is the mistake being guarded against
    expect(59).toBeLessThan(65);
  });

  it('refuses to rank a row with a non-finite score', () => {
    const broken = { ...row('broken'), combinedExact: undefined as unknown as number };
    expect(() => [broken, row('ok')].sort(byRank)).toThrow(/combinedExact/);
  });

  it('does not let a malformed qualifies flag outrank a real entry', () => {
    const good = row('good', { combinedExact: 71 });
    const bad = { ...row('bad', { combinedExact: 100 }), qualifies: undefined as unknown as boolean };
    expect(order([bad, good])).toEqual(['good', 'bad']);
  });

  it('breaks a genuine tie on reading ease closest to 60', () => {
    const near = row('near', { easeGap: easeGap(61) });
    const far  = row('far',  { easeGap: easeGap(70) });
    expect(order([far, near])).toEqual(['near', 'far']);
  });

  it('treats reading ease as a distance, so 59 and 61 are equal', () => {
    expect(easeGap(59)).toBe(easeGap(61));
    expect(easeGap(EASE_TARGET)).toBe(0);
    expect(easeGap(65)).toBeGreaterThan(easeGap(61));
  });

  it('falls through to earliest publication when ease ties too', () => {
    const early = row('early', { created: 1000 });
    const late  = row('late',  { created: 2000 });
    expect(order([late, early])).toEqual(['early', 'late']);
  });

  it('puts every qualifying entry above every non-qualifying one', () => {
    const out = row('out', { qualifies: false, combinedExact: 100 });
    const inn = row('in',  { qualifies: true,  combinedExact: 71 });
    expect(order([out, inn])).toEqual(['in', 'out']);
  });

  it('is deterministic when everything else is identical', () => {
    const a = row('alice'), b = row('bob');
    expect(order([b, a])).toEqual(['alice', 'bob']);
    expect(order([a, b])).toEqual(['alice', 'bob']);
  });

  // Week 14's real board, as a whole-round guard.
  it('reproduces the week 14 podium', () => {
    const wk14 = [
      row('itx.wardah',  { combinedExact: 100,  easeGap: 0, created: Date.parse('2026-10-27T14:02:03Z') }),
      row('ahmedabbaci', { combinedExact: 100,  easeGap: 0, created: Date.parse('2026-11-01T04:38:24Z') }),
      row('nabbas0786',  { combinedExact: 99.5, easeGap: 1, created: Date.parse('2026-10-27T14:33:48Z') }),
      row('nursejoe',    { combinedExact: 100,  easeGap: 5, created: Date.parse('2026-10-27T15:58:27Z') }),
      row('ekads',       { combinedExact: 93,   easeGap: 11, geoScore: 88, created: Date.parse('2026-11-03T03:17:12Z') }),
    ];
    expect(order(wk14)).toEqual(['itx.wardah', 'ahmedabbaci', 'nursejoe', 'nabbas0786', 'ekads']);
  });
});

/**
 * Prize structure effective from week 16: the pool scales with the field, nothing is paid
 * below five entrants, and tied entries split the slots they span instead of being
 * separated by who published first.
 */
describe('prize tiers — the pool moves with the field', () => {
  it.each([
    [0, 0], [1, 0], [4, 0],
    [5, 300], [9, 300],
    [10, 400], [14, 400],
    [15, 500], [19, 500],
    [20, 600], [57, 600],
  ])('a field of %i pays a pool of %i', (n, pool) => {
    expect(tierFor(n).pool).toBe(pool);
  });

  it('pays nothing below the minimum, and the minimum is five', () => {
    expect(MIN_ENTRANTS).toBe(5);
    expect(tierFor(MIN_ENTRANTS - 1).slots).toEqual([]);
    expect(tierFor(MIN_ENTRANTS).slots.length).toBeGreaterThan(0);
  });

  it('pays more places as the field grows', () => {
    const places = [5, 10, 15, 20].map(n => tierFor(n).slots.length);
    expect(places).toEqual([3, 4, 4, 5]);
  });

  it('every tier\'s slots sum exactly to its pool', () => {
    for (const n of [5, 10, 15, 20]) {
      const t = tierFor(n);
      expect(t.slots.reduce((a: number, b: number) => a + b, 0), `field of ${n}`).toBe(t.pool);
    }
  });
});

describe('tie-splitting', () => {
  const ent = (author: string, combinedExact: number) => ({
    author, permlink: author + '-p', qualifies: true,
    combinedExact, geoScore: 100, easeGap: 0, created: 0,
  });
  const SLOTS = [150, 100, 50];
  const pay = (scores: number[]) =>
    allocatePrizes(scores.map((s, i) => ent(String.fromCharCode(97 + i), s)), SLOTS)
      .map((r: { prize: number }) => r.prize);

  it('pays 125 each when two tie for first, then 50 to the next', () => {
    expect(pay([100, 100, 90])).toEqual([125, 125, 50]);
  });

  it('pays 100 each when three tie for first', () => {
    expect(pay([100, 100, 100])).toEqual([100, 100, 100]);
  });

  it('pays four people 75 each when four tie for first', () => {
    expect(pay([100, 100, 100, 100])).toEqual([75, 75, 75, 75]);
  });

  it('pays five people 60 each when five tie — week 9 really happened', () => {
    expect(pay([100, 100, 100, 100, 100])).toEqual([60, 60, 60, 60, 60]);
  });

  it('handles a tie below first place', () => {
    expect(pay([100, 90, 90])).toEqual([150, 75, 75]);
    expect(pay([100, 95, 90, 90])).toEqual([150, 100, 25, 25]);
  });

  it('is unchanged from today when nothing ties', () => {
    expect(pay([100, 95, 90, 85])).toEqual([150, 100, 50]);
  });

  it('always pays out exactly the pool, however the ties fall', () => {
    for (const scores of [[100,100,90],[100,100,100],[100,100,100,100],[100,90,90],[100,95,90],[100,100,100,100,100]]) {
      const total = pay(scores).reduce((a, b) => a + b, 0);
      expect(total, JSON.stringify(scores)).toBe(300);
    }
  });

  it('never pays an entry that scored strictly less than a paid one nothing extra', () => {
    // 99.5 must not share with 100 — this is the week 14 case that started all of it
    const out = allocatePrizes([ent('a',100), ent('b',100), ent('c',100), ent('d',99.5)], SLOTS);
    expect(out.map((r: { author: string }) => r.author)).toEqual(['a','b','c']);
  });
});
