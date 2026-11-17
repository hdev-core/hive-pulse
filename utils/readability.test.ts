import { describe, it, expect } from 'vitest';
import { readability, analyze, stripMd } from '../scripts/lib/seo-score.mjs';

/**
 * Reading ease used to depend on where the author's editor happened to wrap, and on how
 * many word-less lines they left lying about. `readability` turned every newline into a
 * sentence boundary, so the same prose scored higher hard-wrapped than written as unbroken
 * paragraphs — and it scored differently in a WYSIWYG editor than it did once published,
 * because TipTap holds blocks and has no wraps to find. @ahmedabbaci reported that gap.
 *
 * Ease is one of the SEO bands and it is the podium tiebreak, so this is prize money.
 *
 * EVERY invariant below is asserted twice: that it holds now, and that it did NOT hold
 * under the 1.16.0 rule. A review of the first version of this file found 7 of its 14
 * cases passing unchanged against the old engine — they read like guards and guarded
 * nothing. `fixedByThisChange` makes that impossible: if the old rule already satisfied an
 * invariant, the test fails and says so.
 */

/** The rule as it shipped in 1.16.0. Kept verbatim so the claims above are checkable. */
const oldEase = (text: string): number => {
  const syllables = (word: string) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return 1;
    const s = w.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const g = s.match(/[aeiouy]{1,2}/g);
    return g ? g.length : 1;
  };
  const plain = stripMd(text).replace(/\n+/g, '. ');
  const sentences = Math.max(1, (plain.match(/[.!?]+/g) || []).length);
  const words = plain.split(/\s+/).filter((w: string) => w.length > 0);
  const wc = words.length || 1;
  const syl = words.reduce((s: number, w: string) => s + syllables(w), 0);
  return Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (wc / sentences) - 84.6 * (syl / wc))));
};

const ease = (text: string): number => readability(text).ease;

/**
 * `a` and `b` render the same, so they must score the same — and the old rule scored them
 * differently, which is what made this change necessary. The second assertion is the
 * anti-tautology guard: it fails if the case does not actually exercise the fix.
 */
const fixedByThisChange = (a: string, b: string) => {
  expect(oldEase(a), 'this case does not discriminate — the old rule agreed too')
    .not.toBe(oldEase(b));
  expect(ease(a)).toBe(ease(b));
};

/** Holds under both rules. A regression guard, labelled as one rather than dressed up. */
const alreadyHeld = (a: string, b: string) => {
  expect(oldEase(a)).toBe(oldEase(b));
  expect(ease(a)).toBe(ease(b));
};

const PROSE =
  'The post analyzer scores a Hive draft while you write it, and it reads the editor on a ' +
  'one second debounce so the number keeps up with the words. It looks at the title, the ' +
  'preview description, the headings, the images and their alt text, the links and the tags, ' +
  'and it says which of them are costing points. Nothing is sent anywhere and nothing is ' +
  'stored, because the whole analysis happens inside the page you are already looking at.';

const DENSE =
  'The analyzer evaluates a draft against the same rubric the contest judge applies after ' +
  'the round closes, which means the number shown while writing is the number that decides ' +
  'the prize, provided the text that reaches the chain is the text that was measured.';

/** The same text, hard-wrapped at roughly `cols` columns. */
const lines = (text: string, cols: number): string[] => {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > cols) { out.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out;
};
const wrap = (text: string, cols: number): string => lines(text, cols).join('\n');

describe('a wrap is not a sentence end', () => {
  it('scores one paragraph the same at every wrap width', () => {
    const unwrapped = ease(PROSE);
    const olds = new Set<number>();
    for (const cols of [40, 50, 60, 72, 80, 100, 120]) {
      expect(ease(wrap(PROSE, cols)), `wrapped at ${cols}`).toBe(unwrapped);
      olds.add(oldEase(wrap(PROSE, cols)));
    }
    // The old rule gave several different answers for the identical prose.
    expect(olds.size, 'the old rule should have varied here').toBeGreaterThan(1);
    expect(Math.max(...olds)).toBeGreaterThan(unwrapped + 10);
  });

  it('carries the same immunity into the grade level', () => {
    expect(readability(wrap(PROSE, 55)).grade).toBe(readability(PROSE).grade);
    expect(oldEase(wrap(PROSE, 55))).not.toBe(oldEase(PROSE));
  });

  // The loophole the first attempt left wide open. Marker-prefixed lines were each
  // treated as a block, so wrapping INSIDE a quote or a list paid exactly what wrapping
  // used to pay: +42 ease on this very paragraph, a 2-to-5 band jump. The fix was
  // asymmetric — it took the bonus from plain writers and left it with quote-heavy ones.
  it('scores a wrapped blockquote the same as a one-line blockquote', () => {
    fixedByThisChange(lines(DENSE, 40).map(l => '> ' + l).join('\n'), '> ' + DENSE);
  });

  it('scores a blockquote the same at every wrap width', () => {
    const one = ease('> ' + DENSE);
    for (const cols of [40, 60, 80, 100]) {
      expect(ease(lines(DENSE, cols).map(l => '> ' + l).join('\n')), `quote at ${cols}`).toBe(one);
    }
  });

  it('scores a wrapped list item the same as a one-line list item', () => {
    fixedByThisChange('- ' + lines(DENSE, 40).join('\n  '), '- ' + DENSE);
  });

  it('does not mistake a year for an ordered-list marker', () => {
    // `\d+[.)]\s` matched the "2024. " landing at the start of a wrapped line, which left
    // plain prose wrap-sensitive by up to 6 points — in the one case the headline test
    // above claims is immune.
    const stats =
      'The contest paid out six hundred HIVE in the round that closed in 2024. Participation ' +
      'then doubled across the following three rounds and the figure comes 2026. The totals ' +
      'are published after every round so anyone can check them.';
    const seen = new Set<number>();
    for (let cols = 30; cols <= 130; cols += 1) seen.add(ease(wrap(stats, cols)));
    expect([...seen], 'ease still depends on wrap width').toEqual([ease(stats)]);
  });

  // What this change does NOT claim, pinned so nobody reads more into it than is true.
  //
  // Turning every wrap into a blank line still pays, and on this paragraph it pays 19
  // points — exactly what the old rule paid for the wraps themselves. The difference is
  // not the size of the prize, it is that the old rule paid for an INVISIBLE edit (a wrap
  // is gone the moment markdown renders) while this one pays only for a visible structural
  // one: real one-line paragraphs, which genuinely do read more easily and genuinely do
  // look shredded. Flesch is supposed to reward short units; it is not supposed to reward
  // the width of your editor window.
  //
  // Measured over the 99 real contest entries, converting every newline to a blank line
  // gains a mean of 0.6 ease, at most 13, and pushes NO post across the band — because a
  // real post's newlines are already paragraph breaks, so there is almost nothing left to
  // convert.
  it('still pays for genuine paragraph structure, and says so', () => {
    const shredded = lines(PROSE, 60).join('\n\n');
    expect(ease(shredded)).toBeGreaterThan(ease(PROSE));
    // but the invisible version of the same edit now pays nothing
    expect(ease(wrap(PROSE, 60))).toBe(ease(PROSE));
    expect(oldEase(wrap(PROSE, 60))).toBeGreaterThan(oldEase(PROSE));
  });
});

describe('a line with no words is not a sentence', () => {
  it('ignores horizontal rules, in every spelling', () => {
    // Five `---` lines — 15 characters, no words — took @nursejoe's week 15 entry from
    // 99.5 to a perfect 100, which is the exact margin that moved 100 HIVE in week 14.
    // `-` is not in stripMd's strip set, so `---` survived as a phantom one-word sentence
    // while `***` did not: two spellings of one construct, scored differently.
    fixedByThisChange(PROSE, `${PROSE}\n\n---\n\n---\n\n---\n\n---\n\n---`);
    fixedByThisChange(PROSE, PROSE + '\n\n' + Array(20).fill('---').join('\n\n'));
    for (const rule of ['---', '***', '___', '- - -', '* * *', '=====']) {
      expect(ease(`${PROSE}\n\n${rule}\n\n${PROSE}`), `rule ${rule}`)
        .toBe(ease(`${PROSE}\n\n${PROSE}`));
    }
  });

  it('ignores an image-only line', () => {
    fixedByThisChange(
      `${PROSE}\n\n${PROSE}`,
      `${PROSE}\n\n![a chart of the weekly scores](https://images.hive.blog/x.png)\n\n${PROSE}`,
    );
  });

  it('ignores a bare URL on its own line', () => {
    fixedByThisChange(`${PROSE}\n\n${PROSE}`, `${PROSE}\n\nhttps://hivepulse.app/guide\n\n${PROSE}`);
  });

  it('ignores a table separator row', () => {
    fixedByThisChange(PROSE, `${PROSE}\n\n|---|---|\n`);
    expect(ease(`${PROSE}\n\n|:--|--:|\n`)).toBe(ease(PROSE));
  });
});

describe('formatting that renders the same scores the same', () => {
  const para = 'Reading ease is one of the bands. It is also the tiebreak that decides the podium.';

  it('does not let a heading swallow the paragraph beneath it', () => {
    // In CommonMark a heading is a leaf block and always ends at its own line. The first
    // attempt glued it to the next line, so omitting one blank line cost 10 ease points.
    const spaced = ['## Alpha', para, '## Beta', para].join('\n\n');
    const tight = ['## Alpha', para, '## Beta', para].join('\n');
    alreadyHeld(spaced, tight);   // the OLD rule got this right; the first attempt broke it
  });

  it('scores a setext heading like an ATX heading', () => {
    fixedByThisChange(`Why it moved\n------------\n\n${para}`, `## Why it moved\n\n${para}`);
  });

  it('treats a hard line break as the line break it renders as', () => {
    fixedByThisChange(
      'Send it to:  \nHivePulse Ltd  \nUnit four, Beirut  \nLebanon',
      'Send it to:\n\nHivePulse Ltd\n\nUnit four, Beirut\n\nLebanon',
    );
  });

  it('does not measure fenced code, whatever its comment style', () => {
    // Leaving the fence in made the score depend on whether the snippet's comments began
    // with `#`, `//`, `>` or `*` — an 8-point swing on identical prose, because those are
    // all markdown block markers.
    const post = (code: string) => `${PROSE}\n\n\`\`\`js\n${code}\n\`\`\`\n\n${PROSE}`;
    const bare = `${PROSE}\n\n${PROSE}`;
    for (const code of [
      '# fetch the head\nnpm run build\n# done',
      '// fetch the head\nnpm run build\n// done',
      '> npm ci\n> npm test',
      '$ npm ci\n$ npm test',
      '/**\n * Scores a draft.\n */',
      '| a | b |\n|---|---|',
      '1. first\n2. second',
    ]) {
      expect(ease(post(code)), `fence containing ${JSON.stringify(code.slice(0, 18))}`).toBe(ease(bare));
    }
    // And the old rule was measuring the code as prose: 61 without the fence, 75 with it.
    for (const code of ['# fetch the head\nnpm run build\n# done', '> npm ci\n> npm test']) {
      expect(oldEase(post(code)), 'this case does not discriminate — the old rule agreed too')
        .not.toBe(oldEase(bare));
    }
  });

  it('closes an unterminated fence at the end of the post', () => {
    expect(() => readability('```js\nconst a = 1;')).not.toThrow();
    expect(ease(`${PROSE}\n\n\`\`\`js\nconst a = 1;`)).toBe(ease(PROSE));
  });

  it('scores a quote the same as the same words unquoted', () => {
    alreadyHeld(DENSE, '> ' + DENSE);
  });
});

describe('the metric still measures something', () => {
  const plain = 'reading ease is one of the scoring bands and it is also the tiebreak that decides who takes the podium each week';

  it('still rewards genuinely shorter sentences', () => {
    const short = 'Dogs bark. Cats nap. Birds sing. Fish swim. Mice run. Bees buzz.';
    const long =
      'The comprehensive implementation of the aforementioned architectural considerations ' +
      'necessitates a fundamentally reconsidered approach to the underlying infrastructure.';
    expect(ease(short)).toBeGreaterThan(ease(long));
  });

  it('still counts a paragraph break as a boundary', () => {
    expect(ease(`${plain}\n\n${plain}`)).toBeGreaterThan(ease(`${plain} ${plain}`));
  });

  it('still counts each list item as its own unit', () => {
    const list = '- alpha beta gamma\n- delta epsilon zeta\n- eta theta iota\n- kappa lambda mu';
    expect(ease(list)).toBeGreaterThan(ease('alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu'));
  });

  it('still counts a heading as its own unit', () => {
    // Isolated deliberately: with headings of one word and a paragraph that already
    // carries two full stops, the structural boundaries are swamped and the comparison
    // reads as a false negative. No internal punctuation here, so every boundary is
    // structural.
    const withHeadings = ['## what the analyzer checks', plain, '## how the tiebreak works', plain].join('\n\n');
    expect(ease(withHeadings)).toBeGreaterThan(ease(`${plain} ${plain}`));
  });

  it('still counts a table row as its own unit', () => {
    expect(ease('| alpha beta | gamma delta |\n| epsilon zeta | eta theta |'))
      .toBeGreaterThan(ease('alpha beta gamma delta epsilon zeta eta theta'));
  });

  it('keeps a wrapped list item as ONE unit, not two', () => {
    // The first version of this test compared two inputs with no terminal punctuation, so
    // the old rule's `Math.max(1, …)` floor made both 34 and it passed against the broken
    // engine. Three lines and a real full stop, so the floor cannot rescue it.
    const tight = '- alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu.';
    const wrapped = '- alpha beta gamma delta\n  epsilon zeta eta theta\n  iota kappa lambda mu nu.';
    fixedByThisChange(tight, wrapped);
  });
});

describe('degenerate input', () => {
  it('survives bodies with nothing to measure', () => {
    for (const body of ['', '   ', '\n\n', '\r', '---', '###', '![](x.png)', '```\n\n```', '<center></center>']) {
      const r = readability(body);
      expect(Number.isFinite(r.ease), JSON.stringify(body)).toBe(true);
      expect(r.ease).toBeGreaterThanOrEqual(0);
      expect(r.ease).toBeLessThanOrEqual(100);
      expect(Number.isFinite(r.grade)).toBe(true);
    }
  });

  it('survives CRLF, which is how these files arrive on Windows', () => {
    const lf = `${PROSE}\n\n- one item\n- two item\n\n${PROSE}`;
    expect(ease(lf.split('\n').join('\r\n'))).toBe(ease(lf));
    expect(oldEase(lf.split('\n').join('\r\n'))).not.toBe(oldEase(lf));
  });

  it('never leaves ease outside 0..100', () => {
    for (const body of ['a', 'Supercalifragilisticexpialidocious '.repeat(50), PROSE.repeat(20)]) {
      const { ease: e } = readability(body);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(100);
    }
  });
});

describe('the whole analyzer agrees with itself', () => {
  const tags = ['hivepulse', 'seo', 'hive', 'writing', 'test'];
  const desc = 'A preview description sitting comfortably inside the hundred and twenty to hundred and sixty character band for Google.';
  const title = 'How to Score a Hive Post Before You Publish It';
  const body = `${PROSE}\n\n## A section\n\n${PROSE}`;

  it('gives a wrapped and an unwrapped draft the same readability points', () => {
    const a = analyze(body, title, tags, desc, 'post analyzer');
    const b = analyze(wrap(body, 64), title, tags, desc, 'post analyzer');
    expect(b.breakdown.readability).toBe(a.breakdown.readability);
    expect(b.seoScore).toBe(a.seoScore);
  });

  it('gives no SEO points for padding a draft with dashes', () => {
    const a = analyze(body, title, tags, desc, 'post analyzer');
    const padded = body + '\n\n' + Array(20).fill('---').join('\n\n');
    const b = analyze(padded, title, tags, desc, 'post analyzer');
    expect(b.breakdown.readability).toBe(a.breakdown.readability);
    expect(b.seoScore).toBe(a.seoScore);
  });
});
