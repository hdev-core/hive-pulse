# HivePulse 1.15.0 — store submission

Packages are in `releases/` (gitignored). Rebuild any of them with:

```
npm ci && npm run build && npm run build:firefox
node scripts/make-source-zip.mjs
```

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.15.0-chrome.zip` | Chrome Web Store, Microsoft Edge Add-ons, Opera | 34 files, 337 KB |
| `hivepulse-1.15.0-firefox.zip` | Firefox AMO | 34 files, 337 KB |
| `hivepulse-1.15.0-source.zip` | Firefox AMO — **required** | 157 files, 7.2 MB |

**Minor bump, not a patch.** The GEO rubric change alters the score every user sees. That is behaviour, not a defect.

**Previous published version on AMO: 1.14.3.** The manifest is byte-identical to it apart from the version string — **no permission changes**, 7 permissions and 29 host permissions, unchanged.

## What's in it

**The GEO rubric is recalibrated.** Across all 70 contest entries ever scored, 57% held a perfect GEO 100 and every individual gate was maxed by 77–91% of posts. A score that most of a self-selecting field maxes has stopped measuring anything. The same six checks keep their names, with harder top bands, plus one new check for personal posts.

| | v1 | v2 |
|---|---:|---:|
| At GEO 100 | 40 of 70 (57%) | **6 (9%)** |
| Median | 100 | 86 |
| Range | 60–100 | 57–100 |

Full rationale, the per-gate table and the calibration method: `documentation/GEO-RUBRIC-V2.md`.

**Trailing whitespace no longer costs points.** A title of 61 characters with a trailing space was measured at its raw length, dropping the length band from 8/12 to 5/12 — three points for an invisible character. Titles and preview descriptions are now trimmed before measuring.

## Verification

- **124 tests pass** (`npm test`).
- `npx tsc --noEmit` — 0 errors.
- Both builds green from a clean `npm ci` on Node 20.x.
- `npx web-ext lint --source-dir=dist-firefox` — **0 errors, 21 warnings**, unchanged from 1.14.x.
- The source archive rebuilds `dist-firefox` **byte-identically** — 34/34 files, no digest differences, from a clean extract and `npm ci` in an empty directory.

---

# AMO submission — paste these two blocks

## Box 1 — Release Notes (public)

```text
This release makes the AI-readiness (GEO) score harder to max out.

Looking across every post the analyzer has scored in our weekly writing contest, 57% of them were hitting a perfect 100 on GEO. A score that most people max stops being useful — it can no longer tell a good post from an excellent one.

The same checks remain, with the same names. The top band on each is now harder to reach:

• Your opening paragraph has to be tighter to earn full marks.
• Question-style headings: two for full marks, where one used to be enough.
• Definitions: three, where two used to be enough.
• Numbers with a source: five figures, where three used to be enough.

There is also one new check, for personal and creative posts: Concrete detail. A story an AI can quote names things — people, places, dates, numbers. Posts that stay general score lower than posts that are specific.

Expect your GEO score to drop. The bar moved up; your writing did not get worse. A perfect 100 is still reachable, it just has to be earned.

Also fixed: a trailing space in your title or preview description no longer costs you points. The analyzer was measuring the raw length, so one invisible character could drop a 60-character title into the next band down and cost three points.

No new permissions, no new data collection, and no change to what the extension sends over the network.
```

## Box 2 — Notes to Reviewer (private)

```text
BUILD INSTRUCTIONS

The submitted package is bundled and minified by Vite. To reproduce it exactly:

  1. Install Node.js 20.x (built and verified on 20.20.2).
  2. Extract hivepulse-1.15.0-source.zip into an empty directory.
  3. cd into that directory.
  4. npm ci
  5. npm run build:firefox

Output is written to dist-firefox/. That directory is the submitted package:
34 files, identical to hivepulse-1.15.0-firefox.zip.

Verified before submission: extracting the source archive into an empty
directory and running the above produces dist-firefox with all 34 files
matching the submitted XPI by SHA-256, with no differences.

The build is npm ci + Vite only. There is no code generation, no network
fetch at build time, and no post-processing step.

MANIFEST

Byte-identical to the published version 1.14.3 apart from the version string.
No permissions were added or removed: permissions 7, host_permissions 29,
both unchanged.

LINTER WARNINGS

web-ext lint reports 0 errors and 21 warnings, unchanged across 1.14.0,
1.14.1, 1.14.3 and this release.

20 x UNSAFE_VAR_ASSIGNMENT — innerHTML assignments in compose.js (14),
popup.js (4) and content.js (2). Every one builds an extension-authored
template string. Each untrusted value — post title, meta description,
permlink, user-entered keyword, image filename, tag read from the
blockchain — is passed through the esc() helper in compose.ts first, which
escapes & < > ". There is no insertAdjacentHTML and no outerHTML anywhere
in the codebase. The hover card in content.ts interpolates a username
already constrained to ^[a-z][a-z0-9.-]{2,15}$ plus numeric values.

1 x UNSUPPORTED_API for sidePanel.open — a false positive from static
analysis. The call is guarded by `if (chrome.sidePanel)` and Firefox takes
the sidebarAction.toggle() branch instead. See components/Header.tsx.

WHAT CHANGED IN THIS VERSION

Scoring thresholds only. The analyzer rates a draft post for search-engine
and AI-answer readiness; this release raises the bar on the AI-readiness
half, because the previous thresholds were being maxed by the majority of
posts and had stopped discriminating. One new check was added for personal
posts, measuring how specific the writing is (named entities and numbers as
a share of words).

Also fixed: titles and preview descriptions are trimmed before their length
is measured, so trailing whitespace no longer changes a score.

All of this happens locally in the page. The analyzer reads the draft in the
editor and never transmits it. Its only network call asks a public Hive node
for the current list of trending topics and sends nothing but {limit: 25}.

The extension has no server, no analytics and no telemetry. Private keys are
never read; all signing is delegated to the Hive Keychain extension.
```

## Store-by-store

### Chrome Web Store
Upload `hivepulse-1.15.0-chrome.zip`. No permission changes from 1.14.3.

### Microsoft Edge Add-ons / Opera
Same `hivepulse-1.15.0-chrome.zip`.

### Firefox AMO
Upload `hivepulse-1.15.0-firefox.zip`, paste both boxes above, then
`hivepulse-1.15.0-source.zip` when asked for source.

## Known and accepted

Carried over and unchanged:

- **21 lint warnings**, all pre-existing. See the reviewer note above.
- **Firefox extension id is an email address** (`browser_specific_settings.gecko.id`). Valid and accepted by AMO. Changing it would orphan every existing Firefox user, so it stays — a decision reviewed and confirmed on 6 October 2026.
- **`testapi.hivescan.info`** backs three API bases and is not in `host_permissions`. Deliberate: the host returns `Access-Control-Allow-Origin: *`, so the requests succeed without a declaration.
- **`financeHistory` is uncapped** — the derived lists are memoised, but the array grows at 1000 rows per "Load older".
- **`components/NotificationList.tsx` has no component tests.**
- **The scoring engine is duplicated** between `compose.ts` and `scripts/lib/seo-score.mjs`. `utils/markupParity.test.ts` and `utils/geoRubric.test.ts` pin them together; the rest is manual.
