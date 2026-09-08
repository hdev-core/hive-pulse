// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { scanChipTags } from './tagScan';

/**
 * The markup below is copied from SlothBuzz's own bundle (chunk 3cnp39x25-_co.js), not
 * guessed. Its tag editor renders:
 *
 *   <div class="flex flex-wrap gap-2">
 *     <span class="inline-flex items-center gap-1 …">
 *       <span>#</span><span>{tag}</span>
 *       <button type="button" aria-label="{remove}">×</button>   ← omitted when disabled
 *     </span>…
 *   </div>
 *   <input placeholder="Add a tag…">        ← rendered only while tags.length < max
 *   <div class="flex flex-wrap items-center gap-1.5">   ← suggestions, same condition
 *     <span class="text-xs">Suggestions:</span><button>#foo</button>…
 *   </div>
 *   <p class="text-xs">{n}/{max} tags • First tag is the main category</p>
 *
 * The bug this covers: at the cap both the input AND the suggestions row unmount, so a
 * fallback anchored on the input reported a fully tagged post as 0 tags.
 */
const chip = (tag: string, withClose = true) =>
  `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm bg-bg-hover">
     <span>#</span><span>${tag}</span>
     ${withClose ? `<button type="button" aria-label="Remove ${tag}">\u00d7</button>` : ''}
   </span>`;

const slothbuzz = (tags: string[], { input = true, suggestions = [] as string[] } = {}) => `
  <div class="space-y-2">
    <div class="flex flex-wrap gap-2">${tags.map(t => chip(t)).join('')}</div>
    ${input ? '<input type="text" placeholder="Add a tag..." />' : ''}
    ${suggestions.length ? `<div class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-text-muted">Suggestions:</span>
        ${suggestions.map(s => `<button type="button">#${s}</button>`).join('')}
      </div>` : ''}
    <p class="text-xs text-text-muted">${tags.length}/10 tags • First tag is the main category</p>
  </div>`;

const scan = (html: string) => {
  document.body.innerHTML = html;
  return scanChipTags(document, '#hivepulse-post-analyzer');
};

beforeEach(() => { document.body.innerHTML = ''; });

describe('SlothBuzz tag chips', () => {
  it('reads all 10 when the cap has removed the input and the suggestions', () => {
    const tags = ['tag1','tag2','tag3','tag4','tag5','tag6','tag7','tag8','tag9','tag10'];
    expect(scan(slothbuzz(tags, { input: false }))).toEqual(tags);
  });

  it('reads a partial set while the input is still present', () => {
    expect(scan(slothbuzz(['hive', 'seo']))).toEqual(['hive', 'seo']);
  });

  it('reads a single tag', () => {
    expect(scan(slothbuzz(['hive']))).toEqual(['hive']);
  });

  it('does not count suggestion buttons as selected tags', () => {
    // Same "#word" text as a chip; an offer, not a selection.
    expect(scan(slothbuzz(['hive'], { suggestions: ['photography', 'travel'] })))
      .toEqual(['hive']);
  });

  it('returns nothing when no tag has been entered', () => {
    expect(scan(slothbuzz([]))).toEqual([]);
  });

  it('does not concatenate the whole row into one tag', () => {
    // The row's own text is "#tag1×#tag2×" → "tag1tag2", which has no whitespace and
    // passes the tag grammar. Only the one-close-control rule rejects it.
    expect(scan(`<div><div class="flex flex-wrap gap-2">${chip('tag1')}${chip('tag2')}</div></div>`))
      .toEqual(['tag1', 'tag2']);
  });

  it('reads chips that render without a close control as no tags rather than as prose', () => {
    // The editor disables removal while publishing; nothing is better than something wrong.
    expect(scan(`<div class="flex flex-wrap gap-2">${chip('a1', false)}${chip('b2', false)}</div>`))
      .toEqual([]);
  });
});

describe('the false positives that sank three earlier attempts', () => {
  it('does not read hashtags out of a CodeMirror body', () => {
    // This is the regression that broke PeakD and hive.blog: #posh in a draft was scraped
    // as a tag and evicted the real ones.
    expect(scan(`
      <div class="cm-editor"><div class="cm-content" contenteditable="true">
        <div class="cm-line">#posh</div><div class="cm-line">#hive</div>
        <div class="cm-line">#travel</div>
      </div></div>`)).toEqual([]);
  });

  it('does not read hashtags out of a contenteditable body', () => {
    expect(scan(`<div contenteditable="true"><p>#posh</p><p>#hive</p></div>`)).toEqual([]);
  });

  it('does not read a rendered post body full of hashtag links', () => {
    expect(scan(`<div class="post-body">
      <a href="/trending/posh">#posh</a><a href="/trending/hive">#hive</a>
    </div>`)).toEqual([]);
  });

  it('does not read the editor toolbar as tags', () => {
    // Matching "contains a button" pulled these in as phantom tags.
    expect(scan(`<div class="toolbar">
      <button>H1</button><button>H2</button><button>H3</button>
    </div>`)).toEqual([]);
  });

  it('does not read a navigation row as tags', () => {
    expect(scan(`<nav><a href="/feed">Feed</a><a href="/about">About</a></nav>`)).toEqual([]);
  });

  it('ignores chips rendered inside our own panel', () => {
    expect(scan(`<div id="hivepulse-post-analyzer">
      <div class="flex">${chip('mine')}</div></div>`)).toEqual([]);
  });
});
