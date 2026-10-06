import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The judging engine mirrors compose.ts, which cannot be imported under Node (content
// script). Behaviour is tested here; the last block pins the two copies together.
import { classifyLinks, headingHierarchy, headingLevels, analyze, analyzeKeyword, analyzeGeo } from '../scripts/lib/seo-score.mjs';

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
  // score differently depending on which one looked at it — this is the repo's worst bug
  // class, because an author sees one number and is paid on another.
  //
  // The first version of this check compared ONE LINE of each regex declaration. A review
  // injected nine plausible drifts into the function BODIES: it caught one, and failed on a
  // harmless reflow. Compare whole declarations instead, with TypeScript annotations and
  // comments normalised away.
  const root = resolve(__dirname, '..');

  const normalise = (src: string) =>
    src
      .replace(/\/\/[^\n]*/g, '')                                      // line comments
      .replace(/:\s*\{[^}]*\}\s*=>/g, '=>')                            // `: { a: number } =>`
      .replace(/:\s*(string|number|boolean|RegExp|Heading)(\[\])?\s*(?=[,)=])/g, '')
      .replace(/\s+/g, '');

  /** The whole declaration, from `const NAME` to the `};` or bare `;` that closes it. */
  const decl = (src: string, name: string) => {
    const at = src.indexOf(`const ${name}`);
    expect(at, `${name} missing`).toBeGreaterThan(-1);
    const block = src.indexOf('\n};', at);
    const line = src.indexOf(';\n', at);
    const end = block !== -1 && block < line ? block + 3 : line + 1;
    return normalise(src.slice(at, end));
  };

  // Every function that reads post text and feeds a score.
  const SHARED = [
    'MD_LINK', 'HTML_A', 'A_HREF', 'ANY_HEADING',
    'linkUrls', 'classifyLinks', 'scanHeadings', 'headingLevels', 'bodyHeadings',
    'headingHierarchy', 'stripMd',
  ];

  const read = () => [
    readFileSync(resolve(root, 'compose.ts'), 'utf8'),
    readFileSync(resolve(root, 'scripts/lib/seo-score.mjs'), 'utf8'),
  ] as const;

  it('define every shared text-scanning function identically', () => {
    const [ts, mjs] = read();
    for (const name of SHARED) expect(decl(ts, name), name).toBe(decl(mjs, name));
  });

  it('would notice a change inside a function body, not just its first line', () => {
    // Guards the guard. The old check compared one line and would have passed this.
    const [ts] = read();
    const drifted = ts.replace('hive-engine)/i', 'hive-engine|example-host)/i');
    expect(drifted, 'drift fixture no longer applies').not.toBe(ts);
    expect(decl(drifted, 'classifyLinks')).not.toBe(decl(ts, 'classifyLinks'));
  });

  it('ignores reformatting that changes no behaviour', () => {
    // The old check failed when a declaration was reflowed across two lines.
    const [ts] = read();
    const reflowed = ts.replace('let internal = 0, external = 0;', 'let internal = 0,\n    external = 0;');
    expect(reflowed).not.toBe(ts);
    expect(decl(reflowed, 'classifyLinks')).toBe(decl(ts, 'classifyLinks'));
  });
});

describe('the property this whole class of bug violates', () => {
  // The suites above pin the primitives that were fixed. They do NOT assert the thing the
  // fixes are FOR: the same article must score the same in either syntax. That test was
  // missing, which is why two further markdown-only scans shipped in 1.14.2 — the keyword
  // in a heading (7 SEO) and the GEO question-heading check (20 GEO). Assert the property.
  const prose = 'The post analyzer scores a draft while you write it, and the score updates as you type. '.repeat(14);
  const build = (h: (t: string) => string, link: (t: string, u: string) => string) => [
    prose,
    h('How the post analyzer works'),
    prose,
    h('Does the post analyzer read HTML?'),   // a question heading — the GEO check
    prose,
    `${link('a past post', 'https://peakd.com/@x/y')} and ${link('a source', 'https://example.com/study')}`,
    '![a chart of SEO scores over ten weeks](https://images.hive.blog/x.png)',
  ].join('\n\n');

  const MD   = build(t => `## ${t}`, (t, u) => `[${t}](${u})`);
  const HTML = build(t => `<h2>${t}</h2>`, (t, u) => `<a href="${u}">${t}</a>`);

  const TITLE = 'How To Use The Post Analyzer: Complete Guide [2026]';
  const TAGS  = ['hivepulse', 'seo', 'guide', 'hive', 'writing'];
  const DESC  = 'The post analyzer scores your Hive draft for SEO and GEO while you write it. A guide to every check it runs.';
  const KW    = 'post analyzer';

  it('scores the same article identically in markdown and HTML', () => {
    const md   = analyze(MD,   TITLE, TAGS, DESC, KW);
    const html = analyze(HTML, TITLE, TAGS, DESC, KW);
    expect(html.breakdown).toEqual(md.breakdown);
    expect(html.seoScore).toBe(md.seoScore);
    expect(html.geoScore).toBe(md.geoScore);
  });

  it('finds the keyword in an HTML heading', () => {
    // Worth 7 SEO. Was markdown-only through 1.14.2.
    expect(analyzeKeyword(KW, `<h2>How the ${KW} works</h2>`, 'T', '').inHeading).toBe(true);
    expect(analyzeKeyword(KW, `## How the ${KW} works`, 'T', '').inHeading).toBe(true);
  });

  it('credits a question heading written as HTML', () => {
    // Worth 20 GEO. Was markdown-only through 1.14.2.
    // analyzeGeo takes the intent TYPE, not the title/tags/desc — 'How-to / Guide' is the
    // rubric that actually scores question headings.
    const q = (h: string) => analyzeGeo(`${prose}\n\n${h}\n\n${prose}`, 'How-to / Guide').score;
    expect(q('<h2>Does the post analyzer read HTML?</h2>')).toBe(q('## Does the post analyzer read HTML?'));
  });
});

describe('the link scanner is linear', () => {
  it('does not blow up on an unclosed-tag body', () => {
    // The first HTML_LINK pattern was cubic: 23 KB of this took 45 SECONDS, and the contest
    // judge runs classifyLinks ~44x per post on arbitrary on-chain bodies.
    const body = '<a href="https://peakd.com/@me/post"&gt;my post&lt;/a&gt; '.repeat(800);
    expect(body.length).toBeGreaterThan(20000);
    const t0 = performance.now();
    classifyLinks(body);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it('does not blow up on an unclosed markdown link', () => {
    const body = '[a post](https://peakd.com/@me/post '.repeat(800);
    const t0 = performance.now();
    classifyLinks(body);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('anchors that are not citations', () => {
  it('ignores a lightbox anchor wrapping an image', () => {
    // The standard Hive gallery pattern. It was scoring +4 internal-link points on photo
    // posts that contain no real links.
    expect(classifyLinks('<a href="https://images.hive.blog/DQmX1/photo.jpg"><img src="x.jpg" alt="a cat"></a>'))
      .toEqual({ internal: 0, external: 0 });
  });

  it('still counts a real link to a Hive post', () => {
    expect(classifyLinks('<a href="https://peakd.com/@me/my-post">my post</a>').internal).toBe(1);
  });
});
