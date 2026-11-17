# HivePulse 1.18.0 — store submission

> **STATUS: PACKAGED AND READY TO SUBMIT.** Built 17 Nov 2026, after week 16 was judged,
> published and archived as `contest-results-week16.csv`, and after PR #18 was merged. The
> release-ordering precondition below is satisfied; it is kept as the record of why it
> mattered. Everything in Verification has been run, not assumed.

**Minor bump.** Reading ease is computed differently, and `AGENTS.md` is explicit that a
scoring change is a minor bump. The number users see in the analyzer panel moves.

**Previous published version: 1.17.0**, live on Firefox AMO (confirmed `public` via the AMO
API) and on the Chrome Web Store (listing shows 1.17.0, updated 11 Nov 2026). The manifest
differs from it in the version string alone, on both targets — **no permission changes**.
Diffed from the shipped packages rather than asserted; see Verification.

## Release ordering — the part that matters

Week 17 opens **17 Nov 2026 12:00 UTC**, which is the same moment week 16 **closes**, and
week 16 is judged *after* that. "Effective from week 17" is therefore an ordering, not a
date:

1. ~~Tag `develop` as **`v1.17.0`**.~~ Done.
2. ~~Judge, publish and archive week 16, producing `contest-results-week16.csv`.~~ Done
   17 Nov — judged from `develop`, **not** from the tag, which predates the judging-window
   roll-forward and would have marked every entry out of window.
3. ~~Only then merge, build and submit.~~ PR #18 merged 17 Nov 14:23 UTC; built after.

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

## Also in this release — two keyword fixes and a GEO fix

The readability change above is the headline, but three other defects were found and fixed
after it, and two of them change what the panel shows.

### The focus keyword, reported by @itx.wardah

She reported that her focus keyword changed when she reloaded the editor, and that her SEO
score changed with it: `the` / 100 before the reload, `sister` / 96 after. Three separate
defects, all ours.

**A stopword scored a perfect 35/35.** `the` is in every title, slug, subheading, opening
and preview description by construction, so it took full marks on every keyword placement
check and showed SEO 100. `judge-contest.mjs` has always filtered stopwords out of its own
candidates, so the contest could never award that number — **the panel was wrong, not the
result.** `analyze()` now refuses a keyword whose *every* word is a stopword, so
"best sister" still counts while `the` and `the best` do not, and the panel says why
rather than silently scoring zero.

**The keyword was never persisted.** It lived in a closure, so every reload discarded the
author's choice and auto-detected a replacement, with nothing in the UI to say so. It is
now stored per draft URL in `chrome.storage.local` and restored *before* the first
analysis, so a remembered choice beats auto-detection instead of racing it.

**Auto-detection ran on a half-loaded editor.** The guard was `title > 3 || content > 80`.
`autoDetectKeyword` draws candidates from the title but ranks them by occurrences in the
body, so an unloaded body ranks every candidate against empty text. Measured on her post:
`sister` with the body loaded, `spent days` with it empty, `faiza sister` with a truncated
title — three answers for one draft, decided by what had painted when the debounce fired.
It now requires both fields.

Fixing the first exposed a worse latent bug: `judge-contest.mjs` kept its own 45-word
`KW_SKIP` while the engine validates against the 163-word `KW_STOP`, so a word in one and
not the other — `above`, `well`, `time` and 119 more — could be **chosen** by the judge and
then scored 0/35 by the engine, on a keyword the judge itself picked. @angeluxx's week 6
entry was judged on `above`, so it was not hypothetical. They now share one set.

**Scope, measured rather than asserted:** removing candidates can only change a pick whose
candidate was removed, and exactly **1 of the 94 archived entries** was judged on a
stopword. That round is closed and is not re-scored.

### The GEO opening-hook check could never match "Summary:"

GEO awards up to 10 points for opening with an explicit summary, recognising `TL;DR`,
`In short`, `Key takeaway`, `Overview` — and `Summary:`. The last one sat inside the same
trailing `` as the others, which made it **unmatchable**: `` after a colon needs a word
character next, and a colon is always followed by a space or markdown. So `Summary: ...`
and `**Summary:** ...` both missed. Our own contest announcements have opened that way
since week 14 and lost the points every time.

**Across all 94 archived entries this changes exactly one post.** It mostly fixes our own.

Fixing it surfaced a test gap worth naming: the GEO threshold parity test extracts only
numeric `>= x ? y` pairs, and the declaration parity test stops at module scope, so **every
regex inside `analyzeGeo` had no sync protection at all**. Demonstrated rather than
reasoned about — reverting `explicitSummary` in `compose.ts` alone left all 31 parity tests
green while the two engines disagreed by 10 GEO points. Seven `analyzeGeo` locals are now
pinned across both engines.

## Verification

Done:

- **242 tests pass** (`npm test`), up from 199. 28 cover the readability splitter and 9 the stopword-keyword rule.
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

- The stopword rule is mutation-checked: removing the rejection from `analyze()` fails
  two of the new tests by name. `isStopwordKeyword` is pinned across both engines.

Build, run 17 Nov 2026 on **Node 20.20.2 / npm 10.8.2**:

- [x] `npm run build && npm run build:firefox` — both green
- [x] `npx web-ext build` for both store zips
- [x] `node scripts/make-source-zip.mjs` — 181 files
- [x] **source archive rebuilds `dist-firefox` byte-identically** — extracted into an
      empty directory, `npm ci`, `npm run build:firefox`, all **34/34 files** compared by
      SHA-256, zero differences and no file present in one and not the other. Verified
      for this build, not assumed.
- [x] `npx web-ext lint --source-dir=dist-firefox` — **0 errors, 0 notices, 21 warnings**,
      unchanged from 1.17.0
- [x] live version re-checked: **1.17.0** on AMO (`public`) and on the Chrome Web Store
- [x] manifest diffed from the shipped 1.17.0 and 1.18.0 packages: **one differing line,
      the version string**, on both Chrome and Firefox
- [x] all three fixes confirmed present in the built bundles, not just in source:
      `is a stopword`, `hp-kw:` and `summary\s*:` each grep out of `dist/assets/` and
      `dist-firefox/assets/`

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.18.0-chrome.zip` | Chrome Web Store, Edge, Opera | 34 files, sha256 `b2cceba42059cedb` |
| `hivepulse-1.18.0-firefox.zip` | Firefox AMO | 34 files, sha256 `74e1e23fb96cb0eb` |
| `hivepulse-1.18.0-source.zip` | Firefox AMO — **required** | 181 files, 7.1 MiB, sha256 `bdbbfbdefc746734` |

---

# AMO submission — paste these two blocks

## Box 1 — Release Notes (public)

```
The readability score is fixed. It no longer depends on where your lines happen to break.

Reading ease is a standard measure that needs to know where your sentences end. HivePulse was treating every line break as the end of a sentence — but a line break inside a paragraph is just your editor wrapping the text, and it disappears the moment the post is published. So the score was partly measuring your editor window instead of your writing. The same paragraph could score up to 16 points apart depending on how it was wrapped.

This also meant the number moved between writing and publishing. If you write on Ecency or InLeo, their editor stores paragraphs rather than line breaks, so the score you saw while writing was not the score your published post had. That is what one user reported, and it is now fixed: the panel and the published post agree.

Three related fixes come with it. Lines with no words in them — a row of dashes, an image on its own line, a bare link, a table separator — no longer count as sentences, because they are not. Code blocks are no longer measured as prose, so the score no longer depends on what style of comments your snippet uses. And a quoted paragraph is treated as one paragraph.

What this means for your score: your readability number will usually read LOWER than before, by about 4 points on average. Nothing about your writing changed — the old number was counting things it should not have. The readability band is harder to top than it was, and reading ease is now measuring what it always said it was.

Your focus keyword is also fixed, three ways. It is remembered now, so reloading the page no longer throws away the keyword you chose. The keyword the analyzer suggests no longer depends on how much of your post had finished loading when it ran. And it will no longer let you use a word like "the" as your focus keyword.

That last one matters if you enter the contest. "the" used to score a perfect 35 out of 35 — not because your post was optimised for it, but because "the" is in every title, every link, every subheading and every description by definition. Nobody searches for it, so it cannot be a focus keyword, and the contest has always refused words like it. The analyzer was showing a score the contest would never award. It now tells you instead.

One more, in your favour: a post that opens with "Summary:" now gets credit for opening with a summary. It should always have done, and a mistake in the check meant it never did.

No new permissions. Nothing outside the post analyzer changed.
```

## Box 2 — Notes to Reviewer (private)

```
BUILD INSTRUCTIONS (reproduces the submitted package exactly)

Environment: Node 20.20.2, npm 10.8.2. No global tooling required.

1. Extract hivepulse-1.18.0-source.zip into an empty directory.
2. cd into that directory.
3. npm ci
4. npm run build:firefox
5. The output is in dist-firefox/ -- 34 files.

This produces dist-firefox byte-for-byte identical to the contents of
hivepulse-1.18.0-firefox.zip. We verified this for THIS build, not as a
general claim: the source archive was extracted into an empty directory,
npm ci was run from the committed package-lock.json, npm run build:firefox
was run, and all 34 output files were compared to the submitted build by
SHA-256. Zero differences, and no file present in one and not the other.

The build is Vite 7 with a small custom plugin (see vite.config.ts) that
copies manifest.firefox.json to dist-firefox/manifest.json and copies the
icon and logo assets. There is no minifier configuration beyond Vite's
defaults and no post-processing step.

LINT

npx web-ext lint --source-dir=dist-firefox reports 0 errors, 0 notices and 21
warnings. The warnings are unchanged from 1.17.0 and fall into two groups:

- innerHTML assignment warnings in assets/popup.js. These come from React's
  compiled output (dangerouslySetInnerHTML is not used anywhere in our
  source). No user-supplied or network-supplied string is written to
  innerHTML.
- UNSUPPORTED_API: sidePanel.open is not implemented in Firefox. This is
  guarded at runtime; the side panel entry point is Chrome-only and the
  Firefox build falls back to the popup. The call is never reached under
  Firefox.

MANIFEST / PERMISSION DELTA vs THE CURRENTLY PUBLISHED VERSION

Published version on AMO at the time of this submission: 1.17.0 (status:
public, confirmed via the AMO API).

manifest.firefox.json differs from 1.17.0 in exactly one line -- the version
string, 1.17.0 -> 1.18.0. Verified by extracting the manifest from the
submitted package and diffing it against the one in the published 1.17.0
package, rather than by assertion.

Note on the number shown on the AMO listing page: it lists 18 permissions,
not 7. Those 18 are the 7 manifest permissions below plus the 11 match
patterns declared in content_scripts (<all_urls> and ten Hive frontend
origins), which AMO folds into a single displayed list. That block is
unchanged in this release, so the displayed count of 18 is unchanged too.

  permissions:      7  (activeTab, tabs, storage, alarms, cookies,
                        notifications, scripting)   -- UNCHANGED
  host_permissions: 29                              -- UNCHANGED

No new permissions, no new hosts, no new content scripts, no change to the
background service worker's registration.

WHAT CHANGED IN THIS RELEASE

Three areas, all inside the post-analysis scoring engine (compose.ts and its
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

FOCUS KEYWORD (user-reported)

A user reported that the focus keyword in the analyzer changed when she
reloaded the editor, and that her score changed with it. Three defects:

5. The keyword was never persisted. It was held in a closure, so a page
   reload discarded the author's choice and silently auto-detected a
   replacement. It is now stored in chrome.storage.local under a key derived
   from the draft's own path, and restored before the first analysis runs.
   This is a new use of existing storage, not a new permission, and the value
   stored is the keyword string the user typed -- nothing else. Writes and
   reads are wrapped in try/catch, so storage being unavailable degrades to
   the previous behaviour rather than breaking the panel.
6. Auto-detection ran as soon as EITHER the title or the body had content,
   and it ranks title-derived candidates by their frequency in the body -- so
   running before the body had loaded ranked every candidate against empty
   text and produced a different answer. It now requires both.
7. A keyword consisting only of stopwords ("the", "the best") scored full
   marks on every keyword-placement check, because such words appear in every
   title, slug, subheading and description by construction. The analyzer now
   declines to score them and says why. This aligns the panel with the
   contest judge, which has always excluded such words.

GEO OPENING-HOOK CHECK

8. The check that recognises an explicit summary opening listed "summary:"
   inside a trailing word-boundary assertion, which made that alternative
   unmatchable -- a word boundary after a colon requires a following word
   character, and a colon is always followed by a space or markup. Posts
   opening with "Summary:" were denied points they had earned. Corrected.

This changes the readability and keyword numbers users see; both are
announced in the release notes above. Test coverage went from 199 to 242
tests, all passing. Each readability test asserts both that the new invariant
holds and that it did not hold under the previous implementation, so a test
that fails to exercise the change fails outright. The two copies of the engine
are compared character for character by utils/geoRubric.test.ts, which was
strengthened twice: once after a review found its slice was comparing only the
first line of a function, and again after it was found to cover no regex
inside the GEO rubric at all.

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
