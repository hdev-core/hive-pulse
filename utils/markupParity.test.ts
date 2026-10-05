import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The judging engine mirrors compose.ts, which cannot be imported under Node (content
// script). Behaviour is tested here; the last block pins the two copies together.
import { classifyLinks, headingHierarchy, headingLevels } from '../scripts/lib/seo-score.mjs';

const HIVE_URL = 'https://ecency.com/@ahmedabbaci/hivepulse-extension-guide-download-feed-and-features-2026';
const EXT_URL  = 'https://share.google/Wquzf4JHIU4Rgv05';

describe('classifyLinks — a link is a link in either syntax', () => {
  it('counts an HTML <a href>', () => {
    // Before the fix this was 0/0: only `[text](url)` was scanned, so a post written with
    // PeakD's toolbar lost all 7 link points for the identical article.
    expect(classifyLinks(`<a href="${EXT_URL}">blogs</a>`)).toEqual({ internal: 0, external: 1 });
    expect(classifyLinks(`<a href="${HIVE_URL}">proof</a>`)).toEqual({ internal: 1, external: 0 });
  });

  it('scores the reporter\'s two drafts identically', () => {
    const md   = `Read my [blogs](${EXT_URL}) and [see proof](${HIVE_URL})`;
    const html = `Read my <a href="${EXT_URL}">blogs</a> and <a href="${HIVE_URL}">see proof</a>`;
    expect(classifyLinks(html)).toEqual(classifyLinks(md));
    expect(classifyLinks(html)).toEqual({ internal: 1, external: 1 });
  });

  it('accepts single-quoted and unquoted href, and extra attributes', () => {
    expect(classifyLinks(`<a href='${EXT_URL}'>x</a>`).external).toBe(1);
    expect(classifyLinks(`<a href=${EXT_URL}>x</a>`).external).toBe(1);
    expect(classifyLinks(`<a class="btn" href="${EXT_URL}" target="_blank">x</a>`).external).toBe(1);
  });

  it('counts both forms when a post mixes them', () => {
    expect(classifyLinks(`[a](${EXT_URL}) <a href="${HIVE_URL}">b</a>`))
      .toEqual({ internal: 1, external: 1 });
  });

  it('does not mistake an image for a link', () => {
    expect(classifyLinks(`![alt](${EXT_URL})`)).toEqual({ internal: 0, external: 0 });
    expect(classifyLinks(`<img src="${EXT_URL}" alt="x">`)).toEqual({ internal: 0, external: 0 });
  });
});

describe('headings — markdown and HTML count the same', () => {
  it('reads <h2> as a subheading', () => {
    expect(headingLevels('<h2>Section</h2>')).toEqual([2]);
    expect(headingHierarchy('<h2>Section</h2>').count).toBe(1);
  });

  it('flags a duplicate H1 written as HTML', () => {
    // The post title is already the page H1.
    expect(headingHierarchy('<h1>Another title</h1>').hasH1).toBe(true);
    expect(headingHierarchy('# Another title').hasH1).toBe(true);
  });

  it('gives the same verdict for the same document in either syntax', () => {
    const md   = '## One\n\ntext\n\n### Two\n\ntext\n\n## Three';
    const html = '<h2>One</h2>\n\ntext\n\n<h3>Two</h3>\n\ntext\n\n<h2>Three</h2>';
    expect(headingLevels(html)).toEqual(headingLevels(md));
    expect(headingHierarchy(html)).toEqual(headingHierarchy(md));
  });

  it('detects a skipped level across mixed syntax, in document order', () => {
    // ## then <h4> skips h3 — only visible if both are read in one ordered pass.
    expect(headingHierarchy('## One\n\n<h4>Four</h4>').skips).toBe(true);
    expect(headingHierarchy('## One\n\n<h3>Three</h3>').skips).toBe(false);
  });

  it('ignores a bare # that is not a heading', () => {
    expect(headingLevels('C# is a language')).toEqual([]);
    expect(headingLevels('#hivepulse')).toEqual([]);
  });
});

describe('the two copies of the engine', () => {
  // compose.ts ships in the extension; seo-score.mjs judges the contest. A post must not
  // score differently depending on which one looked at it.
  const grab = (src: string, name: string) => {
    const at = src.indexOf(`const ${name}`);
    if (at < 0) throw new Error(`${name} not found`);
    return src.slice(at, src.indexOf('\n', at)).replace(/\s+/g, '');
  };

  it('define the same link and heading patterns', () => {
    const root = resolve(__dirname, '..');
    const ts = readFileSync(resolve(root, 'compose.ts'), 'utf8');
    const mjs = readFileSync(resolve(root, 'scripts/lib/seo-score.mjs'), 'utf8');
    for (const name of ['MD_LINK', 'HTML_LINK', 'ANY_HEADING']) {
      expect(grab(ts, name), name).toBe(grab(mjs, name));
    }
  });
});
