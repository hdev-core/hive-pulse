# HivePulse 1.16.0 — store submission

Packages are in `releases/` (gitignored). Rebuild any of them with:

```
npm ci && npm run build && npm run build:firefox
node scripts/make-source-zip.mjs
```

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.16.0-chrome.zip` | Chrome Web Store, Microsoft Edge Add-ons, Opera | 34 files, 337 KiB |
| `hivepulse-1.16.0-firefox.zip` | Firefox AMO | 34 files, 337 KiB |
| `hivepulse-1.16.0-source.zip` | Firefox AMO — **required** | 157 files, 7.1 MiB · sha256 `5e62e8ba06073217` |

**Minor bump, not a patch.** Two GEO checks were measuring the wrong thing, and correcting them moves the score users see. That is behaviour, not a defect, even though both changes are corrections.

**Previous published version on AMO: 1.15.0** (confirmed live via the AMO API, status `public`). The manifest is byte-identical to it apart from the version string — **no permission changes**, 7 permissions and 29 host permissions, unchanged.

## What's in it

Two GEO checks were not measuring what their names claim. Neither threshold moved; both checks now count the right things.

**1. "Concrete detail" counted ordinary sentences as specifics.** The check finds named entities by matching capitalised words, so every sentence-initial *The*, *But*, *Thus* and *First* was scored as a name. Measured over the 77 contest entries scored to date, **51.8% of all capitalised matches were in that position** (4,709 of 9,093); one entry banked *But* ×15 and *The* ×15 as concrete detail. The counter now ignores a capitalised word when a sentence, line or list item begins there, so the check rewards naming people, places and dates, which is what it was added to do.

This is **positional, not a stopword list.** A list was built and rejected first, and the reason matters: it is language-specific. A Spanish entrant opening sentences with *Que*, *Entonces* or *Luego* still scored a full 15/15 on prose naming nothing, while an English entrant writing about someone called **Will**, **Les** or **Del** had a real name zeroed — a 13-point swing in either direction, decided by which words happened to be on the list. Position is language-agnostic and needs no maintenance. The cost is that a name opening a sentence is not counted; that is deliberate and symmetric, since the check is a ratio over the whole post and a real entity recurs mid-sentence.

**2. A trailing tag could hide a title's question mark.** Content type is detected from the title, and a question post is one ending in `?`. A title like *"How Was Our Crazy 1 Day Canal Adventure? **[Eng/Urdu]**"* ends in `]`, so it was classified as a personal story and skipped the harder informational GEO checks entirely. Four of the 77 entries took that route.

Three title shapes have to route correctly, and fixing one alone regresses the others:

| shape | example | handled by |
|---|---|---|
| mark before the tag | `Adventure? [Eng/Urdu]` | strip up to 3 trailing tags, then test |
| mark at the very end | `My Story \| Why Quit Sugar?` | test the raw title |
| mark inside the tag | `My Week (Did I Make It?)` | allow trailing brackets after the `?` |

Only the question test consults the stripped title. Everything else still matches the full title, because a suffix such as `[Guide]` or `(Guide & Info)` legitimately makes a post a guide — stripping the suffix before all the checks reclassified three genuine guides as personal posts.

### Effect on scores

Across all 77 contest entries ever scored:

| | 1.15.0 | 1.16.0 |
|---|---:|---:|
| At GEO 100 | 10 of 77 (13%) | **6 (8%)** |
| Median | 86 | 83 |
| Range | 57–100 | 50–100 |

This brings the measured field to roughly the 9% the week 11 announcement predicted for the v2 rubric. More importantly it balances the two branches: posts scored on personal-story checks were at **16%** perfect against **9%** for informational posts, and both now sit at **8%** (3 of 40 personal, 3 of 37 informational — the branch split itself moves because the title fix reclassifies four posts).

**Rejected alternative:** adding the question-heading check to the personal branch as well. Calibrated against the same corpus on the whole field it gives **5% perfect, median 79**, and on the personal branch alone 2% with a median of 74 — the same overcorrection as the first v2 attempt, which put nobody at 100. Personal posts should not be asked for question headings.

## Verification

- **143 tests pass** (`npm test`), up from 124 — 19 new tests covering both corrections and the cross-engine sync guard.
- The new behaviour tests were run against the pre-fix scorer and fail there, so they would have caught both bugs. The cross-engine sync guard was verified by deliberately diverging one constant: the suite fails and names it.
- `npx tsc --noEmit` — 0 errors.
- Both builds green from a clean `npm ci` on **Node 24.14.1**.
- `npx web-ext lint --source-dir=dist-firefox` — **0 errors, 0 notices, 21 warnings**, unchanged from 1.15.0.
- The source archive rebuilds `dist-firefox` **byte-identically** — 34/34 files, no digest differences, from a clean extract and `npm ci` in an empty directory. Verified for this build, not assumed.

---

# AMO submission — paste these two blocks

## Box 1 — Release Notes (public)

```
Two corrections to the GEO (AI-quotability) score.

"Concrete detail" was counting ordinary words as names. The check looks for capitalised words to find the people, places and dates in your writing — but the first word of a sentence is capitalised too, so "The", "But" and "Thus" were being scored as specifics. About half of what the check counted was capitalised only because a sentence started there. It now ignores those, so the score reflects the specifics you actually named. This works the same way in every language, and it no longer penalises you for writing about someone whose name happens to be an ordinary word.

Question posts with a language tag are now detected correctly. If your title ended with something like "[Eng/Esp]" or "(Part 2)", the question mark before it was hidden, and your post was scored as a personal story instead of an informational one. Those two post types are scored on different checks, so the wrong one was being applied. The tag is now ignored when looking for the question mark.

What this means for your score: if you write personal posts, your GEO score may drop slightly — the check is now measuring what it always said it was. If you write question posts with a language tag in the title, you will now be scored on the informational checks, which are stricter but better suited to that kind of post.

No new permissions. Nothing else changed.
```

## Box 2 — Notes to Reviewer (private)

```
BUILD INSTRUCTIONS (reproduces the submitted package exactly)

Environment: Node 24.14.1, npm 11.x. No global tooling required.

1. Extract hivepulse-1.16.0-source.zip into an empty directory.
2. cd into that directory.
3. npm ci
4. npm run build:firefox
5. The output is in dist-firefox/ — 34 files.

This produces dist-firefox byte-for-byte identical to the contents of
hivepulse-1.16.0-firefox.zip. We verified this for THIS build, not as a general
claim: the source archive was extracted into an empty directory, npm ci was run
from the committed package-lock.json, npm run build:firefox was run, and all 34
output files were compared to the submitted build by SHA-256. Zero differences,
no files present in one and not the other.

The build is Vite 7 with a small custom plugin (see vite.config.ts) that copies
manifest.firefox.json to dist-firefox/manifest.json and copies the icon and logo
assets. There is no minifier configuration beyond Vite's defaults and no
post-processing step.

LINT

npx web-ext lint --source-dir=dist-firefox reports 0 errors, 0 notices and 21
warnings. The warnings are unchanged from version 1.15.0 and fall into two groups:

- innerHTML assignment warnings in assets/popup.js. These come from React's
  compiled output (dangerouslySetInnerHTML is not used anywhere in our source).
  No user-supplied or network-supplied string is written to innerHTML.
- UNSUPPORTED_API: sidePanel.open is not implemented in Firefox. This is guarded
  at runtime; the side panel entry point is Chrome-only and the Firefox build
  falls back to the popup. The call is never reached under Firefox.

MANIFEST / PERMISSION DELTA vs THE CURRENTLY PUBLISHED VERSION

Published version on AMO at the time of this submission: 1.15.0 (status: public,
confirmed via the AMO API).

manifest.firefox.json differs from 1.15.0 in exactly one line — the version
string, 1.15.0 -> 1.16.0. Nothing else changed.

  permissions:      7  (activeTab, tabs, storage, alarms, cookies,
                        notifications, scripting)   — UNCHANGED
  host_permissions: 29                              — UNCHANGED

No new permissions, no new hosts, no new content scripts, no change to the
background service worker's registration.

WHAT CHANGED IN THIS RELEASE

Two corrections inside the post-analysis scoring engine (compose.ts and its
Node-side twin scripts/lib/seo-score.mjs). Both are pure-function text analysis
run locally on the draft the user is editing. No network calls were added or
changed, and no new data is read, stored or transmitted.

1. The "Concrete detail" check matched capitalised words to find named entities,
   which also matched sentence-initial common words. The counter now skips a match
   when a sentence, line or list item begins at that position. This is positional
   rather than a word list, so it behaves identically in every language.
2. Content-type detection tested whether a title ends in "?". A trailing
   "[Eng/Urdu]"-style tag defeated that test. The test now accepts a question mark
   at the end of the raw title, at the end of the title with up to three trailing
   bracketed/piped tags removed, or followed only by closing brackets. Only this
   one test consults the stripped title; every other test still matches the full
   title, deliberately, so that a tag containing the word "Guide" still makes a
   post a guide.

Test coverage went from 124 to 143 tests, all passing, including a guard that
compares the shared regexes and helper functions character for character between
the two copies of the engine. That guard was itself verified by deliberately
diverging one constant and confirming the suite fails and names it.

No private keys are handled by this extension; all signing is delegated to the
Hive Keychain extension via window.hive_keychain.
```

## Store-by-store

### Chrome Web Store
Upload `hivepulse-1.16.0-chrome.zip`. Paste Box 1 into the release notes field. No permission justification changes needed — the permission set is identical to 1.15.0.

### Microsoft Edge Add-ons / Opera
Same package as Chrome.

### Firefox AMO
Upload `hivepulse-1.16.0-firefox.zip`, then `hivepulse-1.16.0-source.zip` when prompted for source. Paste Box 1 into release notes and Box 2 into "Notes to Reviewer". The source archive is **required** because the build is bundled and minified.

## Known and accepted

- The 21 web-ext lint warnings are unchanged and explained in Box 2.
- `sidePanel.open` remains Chrome-only; the Firefox build uses the popup.
- `compose.ts` and `scripts/lib/seo-score.mjs` are still kept in sync by hand. `utils/geoRubric.test.ts` compares every threshold→score pair between them, so a divergence breaks the build rather than silently changing contest results.
