import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeGeo } from '../scripts/lib/seo-score.mjs';

/**
 * GEO rubric v2 — effective from contest week 12 (round opening 13 October 2026).
 *
 * These tests pin the thresholds. They exist because the v1 rubric drifted into
 * uselessness without anyone noticing: 57% of all 70 contest entries ever scored held a
 * perfect 100, and every gate was maxed by 77-91% of posts. Nothing failed, nothing
 * warned — the number simply stopped carrying information. A band moved by accident now
 * breaks a test instead.
 */

const SENT = 'The post analyzer scores a Hive draft while Ahmed writes it in Lahore. ';
const body = (opening: string, rest = SENT.repeat(30)) => `${opening}\n\n${rest}`;

// A first paragraph of 12-45 words is the band that now takes full marks.
const para = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ') + '.';

const geo = (content: string, type = 'General / Personal') => analyzeGeo(content, type);
const part = (content: string, label: string, type?: string) =>
  geo(content, type).parts.find(p => p.label === label)!;

describe('GEO v2 — opening hook', () => {
  it('gives full marks to a 12-45 word opening', () => {
    expect(part(body(para(20)), 'Opening hook').got).toBe(35);
  });

  it('part-marks an opening outside that band but still short', () => {
    const got = part(body(para(60)), 'Opening hook').got;
    expect(got).toBeLessThan(35);
    expect(got).toBeGreaterThan(0);
  });

  it('still rewards an explicit TL;DR at any length', () => {
    expect(part(body('TL;DR — ' + para(70)), 'Opening hook').got).toBe(35);
  });

  it('is harder than v1, where 8-60 words took full marks', () => {
    // 55 words maxed the old rubric. It must not max this one.
    expect(part(body(para(55)), 'Opening hook').got).toBeLessThan(35);
  });
});

describe('GEO v2 — concrete detail (the new gate)', () => {
  const rest = (s: string) => body(para(20), s.repeat(25));

  it('rewards naming people, places and numbers', () => {
    const specific = 'Ahmed walked Maria through Keychain on Discord for 4 hours in Lahore. ';
    expect(part(rest(specific), 'Concrete detail').got).toBe(15);
  });

  it('penalises prose with nothing an AI could quote', () => {
    const vague = 'it was a thing that happened and then it was fine and we moved on. ';
    expect(part(rest(vague), 'Concrete detail').got).toBeLessThan(8);
  });

  it('applies only to personal posts', () => {
    const p = geo(body(para(20)), 'General / Personal').parts.map(x => x.label);
    const i = geo(body(para(20)), 'How-to / Guide').parts.map(x => x.label);
    expect(p).toContain('Concrete detail');
    expect(i).not.toContain('Concrete detail');
  });
});

describe('GEO v2 — informational gates are harder', () => {
  const info = (extra: string) => body(para(20), SENT.repeat(30) + '\n\n' + extra);

  it('needs two question headings for full Q&A marks, not one', () => {
    const one = part(info('## How does it work?'), 'Q&A structure', 'How-to / Guide');
    const two = part(info('## How does it work?\n\n## Why does it matter?'), 'Q&A structure', 'How-to / Guide');
    expect(two.got).toBe(20);
    expect(one.got).toBeLessThan(20);   // v1 gave full marks for one
  });

  it('needs three definitions for full marks, not two', () => {
    const d = (n: number) => Array.from({ length: n },
      (_, i) => `Term${i} is a thing that matters.`).join(' ');
    expect(part(info(d(3)), 'Definitions', 'How-to / Guide').got).toBe(15);
    expect(part(info(d(2)), 'Definitions', 'How-to / Guide').got).toBeLessThan(15);
  });
});

describe('the two engines must not drift', () => {
  // compose.ts shows the score while you write; seo-score.mjs decides the prize money.
  // compose.ts cannot be imported under Node, so compare every threshold->score pair.
  const block = (src: string, marker: string) => {
    const a = src.indexOf(marker);
    expect(a, `${marker} not found`).toBeGreaterThan(-1);
    return src.slice(a, src.indexOf('\n};', a));
  };
  const pairs = (block: string) =>
    (block.match(/(?:>=|===|>|<)\s*[\d.]+\s*\?\s*[\d.]+/g) || [])
      .map(s => s.replace(/\s+/g, '')).sort();

  it('carry identical GEO thresholds', () => {
    const root = resolve(__dirname, '..');
    const ts = block(readFileSync(resolve(root, 'compose.ts'), 'utf8'),
                     'const analyzeGeo = (content: string');
    const mjs = block(readFileSync(resolve(root, 'scripts/lib/seo-score.mjs'), 'utf8'),
                      'const analyzeGeo = (rawContent, intentType)');
    expect(pairs(ts).length).toBeGreaterThan(10);
    expect(pairs(ts)).toEqual(pairs(mjs));
  });

  it('contain no stray control characters', () => {
    // A heredoc once turned four `\b` word boundaries in compose.ts into literal backspace
    // bytes (0x08). Invisible in a terminal, and they silently changed what matched.
    const root = resolve(__dirname, '..');
    for (const f of ['compose.ts', 'scripts/lib/seo-score.mjs']) {
      const src = readFileSync(resolve(root, f), 'utf8');
      expect([...src].filter(c => c < ' ' && c !== '\n' && c !== '\r' && c !== '\t'), f).toEqual([]);
    }
  });
});
