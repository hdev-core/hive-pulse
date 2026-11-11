# HivePulse 1.18.0 — store submission

> **STATUS: NOT YET PACKAGED, AND MUST NOT BE SUBMITTED YET.**
>
> This release changes contest scores. It may only be built, merged and submitted **after
> contest week 16 has been judged, published and archived** — see "Release ordering" below.
> Everything in the Verification section marked *outstanding* has to be run at that point;
> nothing in it is claimed as done when it is not.

**Minor bump.** Reading ease is computed differently, and `AGENTS.md` is explicit that a
scoring change is a minor bump. The number users see in the analyzer panel moves.

**Previous published version on AMO: 1.16.0** at the time of writing. 1.17.0 is built and
awaiting submission, so by the time this ships the delta is measured against whichever of
the two is live. The manifest differs from both in the version string alone — no permission
changes.

## Release ordering — the part that matters

Week 17 opens **17 Nov 2026 12:00 UTC**, which is the same moment week 16 **closes**, and
week 16 is judged *after* that. "Effective from week 17" is therefore an ordering, not a
date:

1. Tag `develop` (the 1.17.0 release commit) as **`v1.17.0`**.
2. Judge, publish and archive week 16 **from that tag**, producing
   `contest-results-week16.csv`.
3. Only then merge this branch, build, and submit.

The judge imports the engine from the working tree. Merging before week 16 is archived
would silently re-score a round whose entrants were told, in the published week-16 post,
that reading ease is the number HivePulse shows them. That is the hard rule in `AGENTS.md`
and it is the mistake that had to be corrected by hand in week 14.

## What's in it

Reading ease is the Flesch score, which needs a sentence count — and the engine was taking
every newline as the end of a sentence. A newline inside a paragraph is a **wrap**: the
width of the author's editor window, invisible the moment markdown renders. So the score
was paying for keystrokes.

Measured across all 99 posts ever entered in the contest:

| | |
|---|---|
| posts banking some ease on wraps or word-less lines | **96 of 99** (none gained nothing) |
| worth, on average | **4.16** ease points |
| worth, at most | **16** ease points |
| hard-wrapping an entire post at 60 columns was worth | mean **+5.5**, up to **+17**, pushing 8 posts into the top band |

It also made the analyzer panel disagree with the published post, which is what
**@ahmedabbaci** reported: 60 while writing, 57 once published, not a word changed. A
WYSIWYG editor (Ecency, InLeo) stores blocks and has no wraps to find, so the round trip
through the DOM dropped them. PeakD matched all along because its textarea is already
markdown.

Reading ease is now computed over **blocks** — paragraphs, headings, list items, table rows
— with wraps inside a block rejoined. Three further things follow from doing that properly:

**A line with no words is not a sentence.** `---` survives the markdown stripper (`-` is
not in its character set) while `***` does not, so two spellings of the same divider scored
differently — and **five lines of `---`, fifteen characters and no words, bought an entry
from 99.5 to a perfect 100**. That is the exact margin that moved 100 HIVE in week 14.
Image-only lines, bare URLs and table separator rows were all worth points too. None of
them are now.

**Fenced code is not prose.** It was being measured as one enormous sentence, and the score
depended on whether the snippet's comments began with `#`, `//`, `>` or `*` — an 8-point
swing on identical prose, because those are all markdown block markers. Code blocks are
excluded.

**A blockquote is a container, not a sentence end.** `> line` + `> line` is one paragraph
inside a quote.

### Effect

| | 1.16.0 | 1.18.0 |
|---|---:|---:|
| ease falls / rises / unchanged | — | **96 / 0 / 3** |
| mean shift | — | **4.16** points |
| posts crossing an SEO readability band | — | **29 of 99** |
| in the top band (ease ≥ 60) | 79 of 99 | **51 of 99** |
| panel-vs-published drift, mean | 1.60 | **0.26** |
| panel-vs-published drift, posts over 2 points | 20 of 99 | **1 of 99** |

Every cheap edit that used to pay now pays nothing:

| edit, no better writing | 1.16.0 gain | 1.18.0 gain |
|---|---|---|
| +20 lines of `---` | mean +3.4, max +9, 7 posts into the top band | **0.00, 0, none** |
| +5 image-only lines | mean +1.0, max +3, 2 posts | **0.00, 0, none** |
| a bare URL on its own line | mean +0.1, max +1, 2 posts | **0.00, 0, none** |
| hard-wrap the whole post at 60 | mean +5.5, max +17, 8 posts | **0.04, +2, none** |

### What it does not claim

Breaking prose into one-line paragraphs still raises ease, and on a single paragraph it
raises it by the same amount hard-wrapping used to. The difference is that a wrap is
invisible once rendered, while one-line paragraphs are a visible structural choice that
genuinely does read more easily — Flesch is meant to reward short units, just not the width
of an editor window. Over the corpus that gain is a mean of **0.37**, at most **4**, and it
moves one post across the band.

### The band threshold stays at 60 — confirmed, not defaulted

`EASE_TARGET` is 60 and the top SEO band also starts at 60. Under the old rule **19 of the
99 corpus posts scored ease exactly 60** — 14 of the 20 entries from weeks 11-15, against 4
of the 80 from weeks 1-10. That is entrants tuning to the number the panel showed them, and
after this change none of those 19 stay in the top band.

Lowering the thresholds from 60/40/20 to 55/35/15 would restore the old pass rate almost
exactly (90% for the weeks 11-15 field). It was put to the owner as an explicit
choice rather than decided here, and the answer on 11 Nov 2026 was **keep 60**. 60 is the
standard Flesch "plain English" line, and moving it to preserve a pass rate is fitting the
ruler to the result.
**The consequence must be stated plainly in the week 17 opening post instead** — readability
numbers now read lower, and 5/5 readability is genuinely harder than it was. Three of last
round's entries were described in print as "perfect 200/200"; that will be rarer now, and
saying so is part of shipping this.

### Past rounds are not reopened

Like-for-like on the same posts, the readability rule alone changes the paid allocation in
**3 of the 15 closed rounds** (weeks 1, 3 and 14 — about 175 HIVE, modelled with the current
comparator, which only shipped for week 15, so that is magnitude rather than history).
Those rounds are closed and paid. `AGENTS.md` records the change as effective from week 17
and the archived CSVs remain the record of what was paid.

## Verification

Done:

- **228 tests pass** (`npm test`), up from 199. 28 of them cover the readability splitter.
- `npx tsc --noEmit` — 0 errors.
- Every invariant in `utils/readability.test.ts` asserts **twice**: that it holds now, and
  that it did *not* hold under the 1.16.0 rule, whose implementation is kept in the test
  file for exactly that purpose. An independent review of the first attempt found 7 of its
  14 cases passing unchanged against the old engine — they read like guards and guarded
  nothing. A test that does not discriminate now fails and says so.
- The two engines are pinned **whole**, between sentinel comments, by
  `utils/geoRubric.test.ts`. The previous declaration-by-declaration pin was reducing
  `toSentences` to its own first line, because its slice ended at the first `;\n`; four
  separate divergences worth up to 13 ease points passed it. The replacement was
  mutation-checked against all four, and the normaliser now collapses whitespace rather
  than deleting it, because the spaces inside `' ' + line` and `join('. ')` are
  load-bearing and were invisible to the old comparison. Fixing the slice also restored the
  pins on `countNames` (30 characters compared, now 582) and `bareTitle`.
- Figures above measured with the shipped engine on normalised bodies, as the judge sees
  them, over all 99 corpus posts; panel-vs-published drift measured through `compose.ts`'s
  own `domToMarkdown` over a TipTap-shaped DOM.

Outstanding, to be run at merge:

- [ ] `npm run build && npm run build:firefox`
- [ ] `npx web-ext build` for both store zips
- [ ] `node scripts/make-source-zip.mjs`
- [ ] prove the source archive rebuilds `dist-firefox` byte-identically from a clean
      `npm ci` in an empty directory
- [ ] `npx web-ext lint --source-dir=dist-firefox` — expect 0 errors
- [ ] re-check the live AMO version so the permission delta is measured against what is
      actually published
- [ ] fill in the package table below

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.18.0-chrome.zip` | Chrome Web Store, Edge, Opera | _to be filled at build_ |
| `hivepulse-1.18.0-firefox.zip` | Firefox AMO | _to be filled at build_ |
| `hivepulse-1.18.0-source.zip` | Firefox AMO — **required** | _to be filled at build_ |

---

# AMO submission — paste these two blocks

## Box 1 — Release Notes (public)

```
The readability score is fixed. It no longer depends on where your lines happen to break.

Reading ease is a standard measure that needs to know where your sentences end. HivePulse was treating every line break as the end of a sentence — but a line break inside a paragraph is just your editor wrapping the text, and it disappears the moment the post is published. So the score was partly measuring your editor window instead of your writing. The same paragraph could score up to 16 points apart depending on how it was wrapped.

This also meant the number moved between writing and publishing. If you write on Ecency or InLeo, their editor stores paragraphs rather than line breaks, so the score you saw while writing was not the score your published post had. That is what one user reported, and it is now fixed: the panel and the published post agree.

Three related fixes come with it. Lines with no words in them — a row of dashes, an image on its own line, a bare link, a table separator — no longer count as sentences, because they are not. Code blocks are no longer measured as prose, so the score no longer depends on what style of comments your snippet uses. And a quoted paragraph is treated as one paragraph.

What this means for your score: your readability number will usually read LOWER than before, by about 4 points on average. Nothing about your writing changed — the old number was counting things it should not have. The readability band is harder to top than it was, and reading ease is now measuring what it always said it was.

No new permissions. Nothing outside the post analyzer changed.
```

## Box 2 — Notes to Reviewer (private)

```
BUILD INSTRUCTIONS (reproduces the submitted package exactly)

  -- TO BE COMPLETED AT BUILD TIME --
  Node version, npm ci, npm run build:firefox, output directory, and the
  byte-identical comparison, all re-run and re-stated for this build. Do not
  copy the claim forward from 1.17.0.

LINT

  -- TO BE COMPLETED AT BUILD TIME --
  Expected: 0 errors, 0 notices, 21 warnings, unchanged from 1.17.0 (React
  innerHTML in compiled output, and sidePanel.open being Chrome-only).

MANIFEST / PERMISSION DELTA vs THE CURRENTLY PUBLISHED VERSION

manifest.firefox.json differs from the published version in exactly one line --
the version string. Nothing else changed.

  permissions:      7  (activeTab, tabs, storage, alarms, cookies,
                        notifications, scripting)   -- UNCHANGED
  host_permissions: 29                              -- UNCHANGED

No new permissions, no new hosts, no new content scripts, no change to the
background service worker's registration.

WHAT CHANGED IN THIS RELEASE

One change, inside the post-analysis scoring engine (compose.ts and its
Node-side twin scripts/lib/seo-score.mjs). Both are pure-function text analysis
run locally on the draft the user is editing. No network calls were added or
changed, and no new data is read, stored or transmitted.

The Flesch Reading Ease calculation needs a sentence count. The previous
implementation treated every newline in the markdown as a sentence boundary
(`stripMd(text).replace(/\n+/g, '. ')`). A newline inside a paragraph is a soft
wrap, which markdown renders as a space, so the score depended on the author's
editor width rather than on their prose -- measurably, by up to 16 points on
the same text. It also meant the figure shown in the analyzer panel disagreed
with the figure the published post produces, because WYSIWYG editors store
block structure and no wraps.

The text is now split into blocks (paragraphs, headings, list items, table
rows) with wraps inside a block rejoined by a space. Consequent fixes in the
same code path:

1. Lines carrying no words are not counted as sentences -- horizontal rules in
   any spelling, image-only lines, bare URLs, table separator rows.
2. Fenced code blocks are excluded from prose measurement.
3. Blockquote markers are stripped before splitting, since a blockquote is a
   container rather than a sentence terminator.
4. compose.ts's DOM-to-markdown converter now emits a markdown hard break
   (two trailing spaces) for a <br> element, as every converter does, instead
   of a bare newline.

This changes the readability number users see; it is announced in the release
notes above. Test coverage went from 199 to 228 tests, all passing. Each new
test asserts both that the new invariant holds and that it did not hold under
the previous implementation, so a test that fails to exercise the change fails
outright. The two copies of the engine are compared character for character by
utils/geoRubric.test.ts, which was itself strengthened after a review found its
previous slice was comparing only the first line of the function.

No private keys are handled by this extension; all signing is delegated to the
Hive Keychain extension via window.hive_keychain.
```

## Known and accepted

- `compose.ts` and `scripts/lib/seo-score.mjs` are still kept in sync by hand. The
  readability block is now pinned whole between sentinel comments, and the sentinel test
  additionally asserts that every declaration it needs to cover is inside the markers — a
  sentinel pair bracketing only comments would otherwise compare equal and protect nothing.
- The remaining panel-vs-published difference above 2 points is a single post containing
  fenced code, and it is an artefact of the measurement harness rather than the engine:
  `domToMarkdown` re-emits a `<pre>` as a fence, so a real editor strips it on both sides,
  whereas the harness's markdown-to-DOM model has no `<pre>`.
- Indented (4-space) code blocks are still measured as prose. Fenced blocks are the common
  form on Hive and detecting 4-space indentation risks swallowing deliberately indented
  text; left alone on purpose.
