# HivePulse 1.14.1 — store submission

Packages are in `releases/` (gitignored). Rebuild any of them with:

```
npm ci && npm run build && npm run build:firefox
node scripts/make-source-zip.mjs
```

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.14.1-chrome.zip` | Chrome Web Store, Microsoft Edge Add-ons | 34 files, 336 KB |
| `hivepulse-1.14.1-firefox.zip` | Firefox AMO | 34 files, 337 KB |
| `hivepulse-1.14.1-source.zip` | Firefox AMO — **required** | 148 files, 7.0 MB |

Patch release. No new permissions, no manifest changes beyond the version, no new features — the
permission set is byte-identical to 1.14.0.

## What's in it

All of it is the post analyzer, from a bug report by **@ahmedabbaci** who published the same post
twice — once from PeakD's editor and once from Ecency's — and showed them scoring differently.

**HTML image tags no longer reach the readability maths.** `stripMd` did strip HTML, but in the
wrong order: the pass that removes markdown punctuation replaces every `>` with a space, and it
ran first, so every tag lost its closing bracket and `<[^>]+>` could no longer match it. A
PeakD-style `<img src="…/23wCbWaTEB….png" alt="…">` survived as roughly twelve words, one of
them a 60-character URL full of vowel groups with no sentence terminator. Markdown images were
dropped correctly, so the same post scored differently depending only on which editor wrote it.

Measured on the week 9 winning post, same body, images rewritten both ways:

| | words | ease | grade |
|---|---:|---:|---:|
| as published (HTML `<img>`) | 3,332 | 63 | 6.8 |
| markdown images | 3,227 | 67 | 6.2 |
| **after this fix — either form** | **3,217** | **68** | **6.2** |

The tag strip is now `<\/?[a-zA-Z][^>]*>` rather than `<[^>]+>`, so ordinary prose such as
"5 < 10 and 20 > 15" is not eaten.

**Bare URLs are stripped too.** An unlinked `https://…` is not prose and was being scored as a
very long, very dense word.

**Alt text is checked on HTML images.** `missingAltImages` only ever scanned `![alt](src)`, so a
post written entirely in PeakD's editor could not lose the five alt-text points however bad its
alt text was. Both syntaxes are checked now, and a missing `alt` attribute reads as empty.

**The word-count bar's scale numbers sit where they belong.** The fill is linear on 0–2,500
words, but the `0 / 300 / 1k / 2.5k` labels underneath were laid out with
`justify-content: space-between`, which spaces items evenly regardless of what they mean — so
`1k` sat at the halfway mark on a track where it belongs at 40%. A 1,000-word draft filled 40%
of the bar and therefore read as roughly 800 words. The geometry now lives in
`utils/wordBar.ts`, so the fill and the numbers derive from one constant and cannot drift apart
again.

**The words pill shows the exact count.** A writer at 1,087 words was shown `1.0k` and reasonably
read it as 1,000.

## Contest impact

Week 9 was re-judged on-chain with the fixed engine before this shipped. No SEO or GEO score
changed except **@intishar, 80 → 75** — one HTML image with no `alt` attribute at all, a correct
deduction. Still qualifies, was not on the podium, no payout changes. Word counts fall where
HTML images were inflating them (@ahmedabbaci's 3,332 is really 3,217), and the published
word-count tiebreak order is unchanged, so the week 9 podium stands exactly as paid.

## Verification

- **89 tests pass** (`npm test`) — `urlHelpers`, `tagScan`, `hiveHelpers`, and new
  `textStrip` and `wordBar` suites.
- The new tests were run against the pre-fix commit in a throwaway worktree: **4 of 8 strip
  tests fail there**, so they would have caught this.
- `npx tsc --noEmit` — 0 errors.
- Both builds green from a clean `npm ci` on Node 20.20.2.
- `npx web-ext lint --source-dir=dist-firefox` — **0 errors, 21 warnings**, unchanged from
  1.14.0 (20 `UNSAFE_VAR_ASSIGNMENT`, 1 `UNSUPPORTED_API`).
- The source archive rebuilds `dist-firefox` **byte-identically** to the submitted package —
  34/34 files, no digest differences — from a clean extract and `npm ci` in an empty directory.

### Manual check

`enhancements/analyzer-test-drafts/` holds four fixtures for checking this by hand in a real
editor. A and B are the same post word for word, differing only in image markup, and must score
identically; C drops the alt attributes and should cost five media points; D lands on exactly
1,000 words so the bar has a number to be checked against. Expected values are in its README,
derived from the engine rather than estimated.

## Packaging

`scripts/make-source-zip.mjs` replaces the by-hand step and puts both of the 1.14.0 packaging
rules into code:

- **The file list comes from `git ls-files`, never a filesystem walk.** A walk is governed by
  whatever skip list you remembered to write rather than by `.gitignore`, and one such walk
  swept an untracked `.env.local` holding a live API key into an archive bound for Mozilla. The
  script refuses to build if any tracked path looks like a secret.
- **Not PowerShell 5.1 `Compress-Archive`**, which writes backslash path separators in
  violation of the ZIP spec. The script writes entries itself, with forward slashes, and
  refuses any name containing a backslash.

It also excludes three tracked directories that cannot affect the build — `enhancements/`,
`screenshots/`, `documentation/`. They are 18.5 MB of contest cover art, charts and release
notes, and including them would have made a 25.6 MB archive for a reviewer who needs 7.0 MB.
This is safe only because the reproducibility check above rebuilds from the archive alone.

The Chrome and Firefox zips carry two directory entries (`assets/`, `logos/`) that 1.14.0's did
not. That is a `web-ext` version difference, not a content change: the file count is 34 either
way.

## Store-by-store

### Chrome Web Store
Upload `hivepulse-1.14.1-chrome.zip`. **No permission changes from 1.14.0.**

### Microsoft Edge Add-ons
Same `hivepulse-1.14.1-chrome.zip`.

### Firefox AMO
Upload `hivepulse-1.14.1-firefox.zip`, then `hivepulse-1.14.1-source.zip` when asked for source.

Note for the reviewer:

> Build: `npm ci && npm run build:firefox` on Node 20.x. Output is `dist-firefox/`, which
> reproduces the submitted package byte-for-byte.
>
> The 20 `UNSAFE_VAR_ASSIGNMENT` warnings are `innerHTML` assignments in `compose.js` (14),
> `popup.js` (4) and `content.js` (2). Every one builds an extension-authored template string,
> and each untrusted value — post title, meta description, permlink, user keyword, image
> filename, chain-derived tag — is passed through the `esc()` helper in `compose.ts` first. The
> hover card in `content.ts` interpolates a username already constrained to
> `^[a-z][a-z0-9.-]{2,15}$` plus numeric fields. There is no `insertAdjacentHTML` or
> `outerHTML` anywhere.
>
> The `UNSUPPORTED_API` warning for `sidePanel.open` is a false positive from static analysis:
> the call is guarded by `if (chrome.sidePanel)` and Firefox takes the `sidebarAction.toggle()`
> branch instead (`components/Header.tsx`).

## Known and accepted

Carried over from 1.14.0 and unchanged by this release, except where noted:

- **21 lint warnings**, all pre-existing. See the reviewer note above.
- **`PRIVACY.md` was refreshed** since the 1.14.0 notes flagged it (now dated 5 September 2026).
  It covers the tab URL being read on every navigation, the analyzer reading drafts locally, and
  the CoinGecko, `hivescan.info` and RPC traffic. Firefox's
  `data_collection_permissions: {required: ["none"]}` is still worth a second look, since the
  user's Hive username does reach third-party hosts — a publisher decision, not a code bug.
- **Firefox extension id is an email address** (`browser_specific_settings.gecko.id`). Valid and
  accepted by AMO. Changing it would orphan every existing Firefox user, so it stays. Accepted
  cost, not a fix.
- **`testapi.hivescan.info`** backs `FYP_API_BASE`, `BALANCE_API_BASE` and `HAF_STATS_API_BASE`
  and is not in `host_permissions`. Deliberate: the host returns `Access-Control-Allow-Origin: *`
  so the requests succeed without a declaration. Worth revisiting only because a *test* host is
  serving production traffic.
- **`financeHistory` is uncapped** — the derived lists are memoised, but the array grows without
  bound at 1000 rows per "Load older".
- **`components/NotificationList.tsx` has no component tests.**
- **Market rows link to the wallet, not to order history**, because no configured frontend has a
  market route to link to.
- **The scoring engine is duplicated** between `compose.ts` (the extension) and
  `scripts/lib/seo-score.mjs` (the judging tools), kept in sync by hand. `utils/textStrip.test.ts`
  now pins `stripMd` across both so that one function cannot drift; the rest is still manual.

## Not done

`develop` is not merged to `main` and no tag is cut — PR #11 is still open for that, and is
`BLOCKED` on branch protection pending an admin override. Do it when you are ready to release
rather than as part of preparing the packages.
