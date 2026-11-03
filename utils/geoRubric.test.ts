import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeGeo, detectIntent } from '../scripts/lib/seo-score.mjs';

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

  // The gate finds names by matching capitalised words, so before CAP_STOPWORDS every
  // sentence-initial The/But/Thus scored as a named entity. Across the 77 contest entries
  // scored to date that was ~35% of each post's "proper nouns" — one entry banked But x15
  // and The x15 as concrete detail. Sentences are not specifics.
  it('does not count sentence-initial common words as names', () => {
    const filler = 'But that was fine. Thus we moved on. The day went by. However it was late. ';
    expect(part(rest(filler), 'Concrete detail').got).toBeLessThan(8);
  });

  // Deliberately uses Spanish openers that no stopword list of ours ever contained. An
  // earlier version of this check WAS a hand-written word list, and a test that picked its
  // words from that same list passed while "Que"/"Entonces"/"Luego" still scored a full
  // 15/15 on prose naming nothing. The counter is positional now, so language is irrelevant
  // — this test is what proves that, and it must not be rewritten to use listed words.
  it('does not count Spanish sentence openers as names, whatever the word', () => {
    for (const opener of ['Que', 'Entonces', 'Luego', 'Tambien', 'Siempre', 'Pero']) {
      const esp = `${opener} fue un dia tranquilo y no paso nada especial aqui. `;
      expect(part(rest(esp), 'Concrete detail').got, opener).toBeLessThan(8);
    }
  });

  // The stopword list zeroed a real name that happened to collide with a common word:
  // Will, Les, Del and Como all scored 2/15 where Omar scored 11/15, decided purely by
  // which words someone had thought to type. Position does not care what the word is.
  it('treats every mid-sentence name alike, common word or not', () => {
    const scores = ['Omar', 'Will', 'Como', 'Les', 'Del'].map(n =>
      part(rest(`We met ${n} at the market in Lahore on 4 March and it was good. `),
           'Concrete detail').got);
    expect(new Set(scores).size, `scores diverged: ${scores}`).toBe(1);
    expect(scores[0]).toBeGreaterThan(8);
  });

  it('still counts real names sitting next to that filler', () => {
    const mixed = 'But Ahmed met Maria in Lahore on 4 March. Thus Faiza joined Discord too. ';
    expect(part(rest(mixed), 'Concrete detail').got).toBe(15);
  });
});

describe('intent routing — a trailing tag must not hide the question mark', () => {
  // "How Was Our Crazy 1 Day Canal Adventure? [Eng/Urdu]" scored as a personal story,
  // because `\?$` sees "]" and "how was" is not "how to". That skipped the harder
  // informational gates entirely. Four of the 77 entries scored to date took that route.
  const q = 'How Was Our Crazy 1 Day Canal Adventure?';

  it('routes a question title to the informational branch', () => {
    expect(detectIntent(q, SENT).type).toBe('Question / Informational');
  });

  it.each(['[Eng/Urdu]', '[Eng]', '(Part 2)', '| ENG-ESP'])(
    'still routes it there with a trailing %s', (suffix) => {
      expect(detectIntent(`${q} ${suffix}`, SENT).type).toBe('Question / Informational');
    });

  // The suffix is stripped ONLY for the question-mark test. Strip it before everything and
  // three genuine guides in the corpus get reclassified as personal, because the word
  // "Guide" lives inside the suffix.
  it('keeps a guide a guide when "Guide" is inside the trailing tag', () => {
    const steps = '\n1. one\n2. two\n3. three\n';
    expect(detectIntent('Daily Habits: Simple Ways to Improve Your Life [Guide]', steps).type)
      .toBe('How-to / Guide');
    expect(detectIntent('Stop Spending More Than Income | Guide To Save Your Future', steps).type)
      .toBe('How-to / Guide');
  });

  it('leaves a plain personal title alone', () => {
    expect(detectIntent('Best Crochet Journey Part 2: Lets Go Shopping Yarns', SENT).type)
      .toBe('General / Personal');
  });

  // Stripping the trailing segment is only correct when the question mark sits BEFORE it.
  // A first attempt stripped unconditionally and silently broke the opposite shape — the
  // tag leads and the headline follows — which is just as common on Hive. These titles
  // routed correctly before that change and must keep routing correctly after it.
  it.each([
    'My Story | Why Did I Quit Sugar?',
    'Crochet Diary | Was It Worth The Yarn?',
    'Mi Semana | Vale La Pena El Esfuerzo?',
  ])('keeps routing when the question is AFTER the separator: %s', (title) => {
    expect(detectIntent(title, SENT).type).toBe('Question / Informational');
  });

  it('handles a question mark inside the trailing bracket', () => {
    expect(detectIntent('My Week (Did I Make It To Friday?)', SENT).type)
      .toBe('Question / Informational');
  });

  // "[ENG] [ESP]" is an ordinary Hive title, so one strip is not enough.
  it.each([
    'How Was Our Canal Adventure? [ENG] [ESP]',
    'How Was Our Canal Adventure? [Eng/Urdu] (Part 2)',
  ])('strips more than one trailing tag: %s', (title) => {
    expect(detectIntent(title, SENT).type).toBe('Question / Informational');
  });

  it('does not hang on pathological bracket input', () => {
    const t0 = Date.now();
    detectIntent('['.repeat(5000), SENT);
    detectIntent('('.repeat(5000) + '?', SENT);
    expect(Date.now() - t0).toBeLessThan(1000);
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

  // The threshold check above slices `analyzeGeo` only, so anything at module scope — which
  // is where the name counter and the title router both live — had NO sync protection at
  // all. Both are hand-duplicated, and a one-word divergence would change who wins a round
  // while the whole suite stayed green.
  it('carry identical regexes and helpers outside analyzeGeo', () => {
    const root = resolve(__dirname, '..');
    // Normalise CRLF FIRST. These files are checked out with CRLF on Windows, and a
    // slice that ends at ";\n" or "\n};" silently matches nothing there — the same defect
    // that once left the sibling parity test comparing '' to '' and passing on nothing.
    const slurp = (f: string) =>
      readFileSync(resolve(root, f), 'utf8').split('\r\n').join('\n');
    const ts = slurp('compose.ts');
    const mjs = slurp('scripts/lib/seo-score.mjs');
    // Strip TS type annotations and all whitespace so only the logic is compared.
    const norm = (s: string) => s
      .replace(/:\s*(?:string|number|boolean)\b/g, '')
      .replace(/\s+/g, '');
    const grab = (src: string, name: string) => {
      const a = src.indexOf(`const ${name}`);
      expect(a, `${name} not found`).toBeGreaterThan(-1);
      const multi = src.indexOf('\n};', a);
      const one = src.indexOf(';\n', a);
      // a multi-line arrow body ends at "\n};", a one-liner at the first ";" ending a line
      const end = multi > -1 && multi < one ? multi : one;
      expect(end, `${name}: could not find the end of the declaration`).toBeGreaterThan(a);
      return norm(src.slice(a, end));
    };
    for (const name of ['NAMED_ENTITY', 'countNames', 'TITLE_SUFFIX',
                        'Q_THROUGH_BRACKETS', 'bareTitle', 'isQuestionTitle']) {
      expect(grab(ts, name), `${name} differs between the two engines`).toBe(grab(mjs, name));
    }
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
