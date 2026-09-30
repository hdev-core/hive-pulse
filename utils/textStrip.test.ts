import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The scoring engine is duplicated between the extension (compose.ts, a content script that
// cannot be imported under Node) and scripts/lib/seo-score.mjs, which the judging tools use.
// The behaviour tests below run against the importable copy; the last test pins the two
// implementations together so they cannot drift apart again.
import { stripMd, readability, missingAltImages } from '../scripts/lib/seo-score.mjs';

const URL_ = 'https://files.peakd.com/file/peakd-hive/ahmedabbaci/23wCbWaTEBwTh9YPXGt7LPxFBUyRivkUYT8YLe9x5dgJjzrPbnKBhz9iieAbc.png';
const ALT  = 'HivePulse by @mcfarhat on Firefox webstore (Screenshot taken by me)';
const HTML_IMG = `<img src="${URL_}" alt="${ALT}">`;
const MD_IMG   = `![${ALT}](${URL_})`;

const words = (s: string) => stripMd(s).split(/\s+/).filter(Boolean).length;

describe('stripMd — images must not reach the readability maths', () => {
  it('drops a PeakD-style HTML <img> entirely', () => {
    // Before the fix this left 12 "words", including the 60-character URL. The punctuation
    // pass ran first and ate the tag's closing '>', so the tag strip could no longer match.
    expect(words(HTML_IMG)).toBe(0);
  });

  it('drops a markdown image entirely', () => {
    expect(words(MD_IMG)).toBe(0);
  });

  it('scores the same post identically whichever image syntax it uses', () => {
    // The reporter's two drafts: same prose, one written by PeakD's editor and one by
    // Ecency's. They scored 60/30 and 67/33 for reading ease and transitions.
    const prose = (
      'HivePulse extension is like a teacher who helps your article pass the exam. ' +
      'After passing the algorithm exam, an article can rank on search engines. ' +
      'The tool is free and it works on every supported Hive frontend today. '
    ).repeat(8);
    const withHtml = `${prose}\n\n${HTML_IMG}\n\n${prose}\n\n${HTML_IMG}\n\n${prose}`;
    const withMd   = `${prose}\n\n${MD_IMG}\n\n${prose}\n\n${MD_IMG}\n\n${prose}`;

    expect(words(withHtml)).toBe(words(withMd));
    expect(readability(withHtml)).toEqual(readability(withMd));
  });

  it('drops a bare URL — an unlinked https:// is not prose', () => {
    expect(words(`See ${URL_} for the file`)).toBe(4);  // See / for / the / file
  });

  it('keeps the visible text of a markdown link and discards its target', () => {
    expect(stripMd(`read [the full guide](${URL_}) now`).split(/\s+/).filter(Boolean))
      .toEqual(['read', 'the', 'full', 'guide', 'now']);
  });

  it('leaves ordinary prose containing < and > alone', () => {
    // `<[^>]+>` would have eaten "< 10 and 20 >"; requiring a letter after '<' does not.
    expect(stripMd('5 < 10 and 20 > 15 apples')).toContain('5 < 10 and');
    expect(words('5 < 10 and 20 > 15 apples')).toBe(7);
  });

  it('strips real HTML markup that is not an image', () => {
    expect(stripMd('<center><b>Hello</b></center>').trim()).toBe('Hello');
  });
});

describe('the two copies of the engine', () => {
  // compose.ts ships in the extension; seo-score.mjs judges the contest. A post must not
  // score differently depending on which one looked at it.
  const chain = (src: string) => {
    const at = src.indexOf('const stripMd');
    const end = src.indexOf(';', at);
    return src.slice(at, end)
      .replace(/const stripMd = \(s(: string)?\) => s/, '')
      .replace(/\s+/g, '');
  };

  it('define stripMd identically', () => {
    const root = resolve(__dirname, '..');
    expect(chain(readFileSync(resolve(root, 'compose.ts'), 'utf8')))
      .toBe(chain(readFileSync(resolve(root, 'scripts/lib/seo-score.mjs'), 'utf8')));
  });
});

describe('missingAltImages — both image syntaxes', () => {
  it('flags an HTML <img> with no alt attribute', () => {
    expect(missingAltImages(`<img src="${URL_}">`)).toHaveLength(1);
  });

  it('flags an HTML <img> whose alt is a generic editor default', () => {
    expect(missingAltImages(`<img src="${URL_}" alt="image">`)).toHaveLength(1);
    expect(missingAltImages(`<img src="${URL_}" alt='screenshot'>`)).toHaveLength(1);
  });

  it('accepts a descriptive alt in either syntax', () => {
    expect(missingAltImages(HTML_IMG)).toHaveLength(0);
    expect(missingAltImages(MD_IMG)).toHaveLength(0);
  });

  it('still flags a markdown image with no alt', () => {
    expect(missingAltImages(`![](${URL_})`)).toHaveLength(1);
  });

  it('judges the same images the same way in either syntax', () => {
    const doc = (img: (alt: string) => string) =>
      `${img('A red fox on a fence post at dusk')}\n${img('image')}\n${img('')}`;
    const asHtml = doc(alt => `<img src="${URL_}" alt="${alt}">`);
    const asMd   = doc(alt => `![${alt}](${URL_})`);
    expect(missingAltImages(asHtml)).toHaveLength(missingAltImages(asMd).length);
  });
});
