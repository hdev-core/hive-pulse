# AGENTS.md

## Project Type

Chrome Extension (Manifest V3) — not a standard web app. The popup and side panel both load `index.html`; background and content scripts are separate entry points.

## Build & Dev

- `npm run build` — production build to `dist/`; load `dist/` as unpacked extension in `chrome://extensions`
- `npm run dev` — Vite dev server (useful for UI work, but Chrome extension APIs require the built extension)
- `npm run preview` — preview production build locally

- `npm test` — vitest, 233 tests covering the scoring engines, URL helpers, tag scanner, the contest ranking rule, the prize structure and rollover, that the judge is wired to the prize library, the chat-session identity gate, and the readability block splitter
- `npx tsc --noEmit` — typecheck

No lint or format command. No CI pipeline, so the checks above are run by hand.

## Contest Judging

The weekly SEO contest is judged with `scripts/judge-contest.mjs`. Before running it:

1. Put one submitted Hive URL or `@author/permlink` per line in an entries file.
2. Set `WINDOW_START` and `WINDOW_END` in the script to the contest's published UTC window.
3. **Set `CARRIED_FORWARD`** to the pool a previous round carried in, or 0 on a normal round.
4. Run `node scripts/judge-contest.mjs entries-weekN.txt` from the repository root.
5. Review `contest-results.csv`, then archive it as `contest-results-weekN.csv` before the next round.
6. **Run `node scripts/check-proposal.mjs` before writing the announcement post**, and carry
   the DHF ask if it is still needed — see below.
7. **Read `enhancements/week<N>-post-notes.md`** if one exists. It is the single list of
   what that week's post must carry, written while the reasons were fresh.

**The weekly post carries the DHF proposal ask, conditionally.** The contest prize money
comes from Hdev DHF proposal #391, whose budget sets aside 18% for "outreach and growth
(socials, marketing and contest payouts)". Entrants are entitled to know that, so from week
18 the announcement says so. `scripts/check-proposal.mjs` reports whether the proposal is
above or below the return proposal, and `enhancements/week18-proposal-plan.md` holds a
prepared section for each case plus the hard rules for how it is asked — chiefly that a
vote is never a condition of entry and never touches a score. **Never quote a gap figure
from the plan file; it moves daily, and a stale number is wrong in whichever direction it
has moved.**

**Step 3 nearly cost week 16 half its pool.** `withRollover` shipped in `lib/rank.mjs` for
week 15, was unit-tested on the exact week 16 numbers, and had week 16 named in its own
worked example — and the judge never imported it. Week 16 was announced to entrants at 600
HIVE and the judge printed 300. This is the SECOND prize rule to ship in the library and
never reach the judge; the threshold and tie-splitting were the first. A library the
shipping code does not call proves nothing, so `utils/ranking.test.ts` now reads
`judge-contest.mjs` itself and fails if it hands a bare tier to `allocatePrizes`.
The judge also refuses to run when the previous week's archive shows fewer than
`MIN_ENTRANTS` qualifying rows while `CARRIED_FORWARD` is 0, and it prints the pool
derivation (`600 = 300 base + 300 carried forward`) so a wrong carry is visible.

**Week 16 was judged from `develop` on 17 Nov 2026 and is archived as
`contest-results-week16.csv`.** That was the precondition for merging PR #18, and it is
done, so the readability change may now land and applies from week 17 onward.

Week 16 also set a ruling worth keeping: @ahmedabbaci linked a post carrying no
`#hivepulse` tag and scoring SEO 60, but had published a tagged, in-window post scoring
200/200 that he never linked. Rule 6 as published says "You may enter more than one post.
Your highest-scoring tagged post counts", so the tagged post was counted and the field was
5 rather than 4 — the difference between paying 600 and paying nothing for a second round
running. **Rules 4 and 6 contradict each other here and must be reconciled before week 17.**
This is the second round in a row where a qualifying post nearly went uncounted on a
submission formality (@ekads, week 15).

Step 2 is now partly enforced rather than merely documented. The script refuses to run when
`contest-results-weekN.csv` already exists for the week named in the entries filename, and
when its own `WINDOW_END` closed more than three days ago. `--allow-stale-window` overrides
both, and a result produced that way must never be published or paid from. Neither guard
replaces setting the window: a window left on the *previous* round still passes the date
check for that round's entries, and marks every entry of the current round out-of-window —
which is exactly what would have voided week 16.

The judge fetches each post from Hive and uses the shared `scripts/lib/seo-score.mjs` engine. It
uses the best title-derived keyword because the author's editor keyword is not stored on-chain.
Verify tags, referrals, and any social-media prize requirements separately. Do not rerun an old
round with the current script without restoring that round's date window; the script is rolled
forward for the active contest.

**The scoring engine is rolled forward too, and that is a sharper trap than the date window.**
A round is judged on the rubric that was live during that round, and `contest-results-weekN.csv`
is the authoritative record of what was actually paid. Re-running an old entries file against a
newer engine will produce different numbers and can reorder the podium — week 12 is the worked
example: under 1.15.0 all three entries tied on GEO 100, and under 1.16.0 @nabbas0786 drops to
71 and swaps places with @wardah, a 50 HIVE difference. That re-score is not a correction to
week 12 and must never be published or paid from. If you need to know what a past round scored,
read its archived CSV; do not regenerate it.

**Rubric changes, newest first.** Each one applies from the round named and to no round
before it.

| From | Change | Effect measured on the 99-post corpus |
|---|---|---|
| week 17 | Reading ease counts BLOCKS, not newlines: a wrap inside a paragraph is no longer a sentence end, and neither is a line carrying no words (a horizontal rule in any spelling, an image on its own line, a bare URL, a table separator row). Fenced code is not measured as prose at all. | ease falls on 96 of 99 posts and rises on none, mean 4.16 and up to 16 points; 29 posts cross an SEO readability band; the top band (ease >= 60) goes from 79 of 99 to 51; the tiebreak reorders. |
| 1.16.0 (week 13) | GEO: positional name counting, three-shape question-title test. | week 12 re-scored would move @nabbas0786 100 -> 71 and swap the podium. Do not. |

**This ordering is now SATISFIED — kept as the record of why it mattered.** Week 17 opened
17 Nov 2026 12:00 UTC, the same moment week 16 closed, and week 16 was judged after that:
judged from `develop` and archived as `contest-results-week16.csv` on 17 Nov, and only then
was this change merged. So "effective from week 17" was never a date, it was an ordering.

The judge imports the scoring engine from the working tree, so merging first would have
silently re-scored a round whose entrants were told, in `enhancements/week16-post-body.md`,
that reading ease is the number HivePulse shows them. It was also **not** judged from the
`v1.17.0` tag — an earlier version of this file said the tag, which was wrong: the tag
predates the judging-window roll-forward and would have marked every week-16 entry out of
window, voiding the round. The tag remains the reproducibility anchor for the submitted
1.17.0 package and the fallback if the old engine is ever needed again.

**Apply the same ordering to every future rubric change:** judge and archive the open round
first, merge second.

**And a scoring change applies only from the first round that OPENS AFTER the new version
is live in both stores — never from the round it ships in.** Week 17 broke this, and it cost
two entrants the podium. The week 17 post went live 15:21 UTC on 17 Nov and told entrants
"Reading Ease is the whole number HivePulse shows you, and from today it is the same number
your published post receives." 1.18.0 was committed at 18:21 and approved on AMO at 18:36,
so no browser had it when that sentence was published, and the post never said an update was
needed. @itx.wardah posted at 17:29 and @fluer at 19:07; both panels ran 1.17.0 and showed
SEO 100, which is what the post had promised they would get. The judge used 1.18.0 and gave
them 99.5. On the engine they had, the round was a five-way tie at 60 each. They were paid
that 60 each as a discretionary correction, and the placings stood.

In practice:

1. Ship the release and confirm it is live in BOTH stores before the round that uses the
   new rubric opens: AMO's `current_version` at
   `https://addons.mozilla.org/api/v5/addons/addon/hivepulse/`, and the "Version" field on
   `https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg`.
2. The announcement for that round must say the update is required, which version, and that
   browsers update on their own schedule. "From today" is a promise about software; do not
   make it about software that is not yet installable.
3. Never write that the panel number and the judged number are the same unless the round's
   whole window falls after the release reached both stores. Entrants read that literally,
   and they are right to.

Weeks 1-16 were judged with every newline counting as a sentence end, which is why their
archived ease figures sit higher than the current engine produces. That is not an error in
the archive. Like-for-like on the same posts, the readability rule alone changes the paid
allocation in 3 of the 15 closed rounds (weeks 1, 3 and 14 — about 175 HIVE, modelled with
the current comparator, which only shipped for week 15, so that figure is magnitude and not
history). Those rounds are closed and paid. They are not reopened.

**The 60 cluster.** `EASE_TARGET` is 60 and the top SEO band also starts at 60, and under
the old rule 19 of the 99 corpus posts scored ease exactly 60 — 14 of the 20 entries from
weeks 11-15, against 4 of the 80 from weeks 1-10. That is entrants tuning to the number the
panel showed them, and after this change none of those 19 stay in the top band. The
thresholds were NOT moved to compensate. That was put to the owner as an explicit choice —
keep 60 and accept a lower pass rate, or drop the bands to 55/35/15 and keep it — and the
answer on 11 Nov 2026 was **keep 60**. So it is a decision on record, not a default nobody
examined: 60 is the standard Flesch "plain English" line, and lowering it to 55 to preserve
a pass rate would be fitting the ruler to the result. Do not quietly recalibrate the bands
later to lift the pass rate; reopen the question with the owner instead. The consequence has to be said plainly in the week 17 opening post instead —
readability numbers now read lower, and 5/5 is genuinely harder than it was.

**What this change does not claim.** Breaking prose into one-line paragraphs still raises
ease, and on a single paragraph it raises it by the same amount hard-wrapping used to. The
difference is that a wrap is invisible once markdown renders, while one-line paragraphs are
a visible structural choice that genuinely does read more easily — Flesch is meant to reward
short units, just not the width of an editor window. Measured over the corpus the available
gain is a mean of 0.37 ease, at most 4, and it pushes one post across the band.

## Releasing a new version

**Every version bump MUST produce `documentation/RELEASE-<version>.md` before the packages
are handed over.** It is not optional and it is not a nice-to-have: without it the AMO
submission form cannot be filled in, and the person submitting has to invent the reviewer
notes under time pressure. Copy the previous release doc and edit it.

That file must contain, as literal paste-ready blocks:

1. **Release Notes (public)** — what changed, written for a user of the extension, not for
   us. No internal vocabulary, no commit hashes, no file paths. If a score is going to
   change, say so and say why, in the user's terms.
2. **Notes to Reviewer (private)** — AMO *requires* step-by-step build instructions that
   reproduce the submitted package exactly. Node version, `npm ci`, the build command, the
   output directory, and the statement that it was verified. Then the lint warnings
   explained one by one, the manifest/permission delta against the currently published
   version, and what changed in this release.

Checklist for the bump itself:

1. `npm test`, `npx tsc --noEmit` — both clean.
2. Bump the version in `package.json`, `package-lock.json` (BOTH the top-level and the
   `packages[""]` entry), `manifest.json` and `manifest.firefox.json`.
3. `npm run build && npm run build:firefox`.
4. `npx web-ext build` for the chrome and firefox zips into `releases/`.
5. `node scripts/make-source-zip.mjs` for the AMO source archive.
6. **Prove reproducibility**: extract the source zip into an empty directory, `npm ci`,
   `npm run build:firefox`, and compare every file to `dist-firefox` by hash. The reviewer
   note claims this; do not claim it without running it.
7. `npx web-ext lint --source-dir=dist-firefox` — expect 0 errors.
8. Check the published version on AMO
   (`https://addons.mozilla.org/api/v5/addons/addon/hivepulse/`) so the permission delta in
   the reviewer note is measured against what is actually live, not against the last thing
   built locally.
9. Write `documentation/RELEASE-<version>.md`.

Minor bump when behaviour changes for users (a scoring change counts), patch when only
defects are fixed.

## Build Architecture

`vite.config.ts` defines a multi-entry Rollup build:
- `popup`: `index.html` (React app — popup & side panel)
- `background`: `background.ts` (service worker)
- `content`: `content.ts` (content script, currently a placeholder)

A custom Vite plugin (`copy-assets`) copies `manifest.json`, `icon.svg`, `icon.png`, and `logos/` to `dist/` after bundling. Output files land at `assets/[name].js`.

## Path Alias

`@/*` maps to the project root (`tsconfig.json` paths). Use `@/utils/...`, `@/components/...`, etc.

## Key Conventions

- `chrome` is typed as `any` everywhere — this is intentional, not a mistake to fix.
- State management is React `useState`/`useEffect` with `chrome.storage.local` for persistence. No external state library.
- Styling: Tailwind CSS utility classes only. Custom scrollbars/transitions in `index.css`.
- `DEFAULT_SETTINGS` lives in `utils/settingsStore.ts` and is imported everywhere; it is no longer duplicated in `App.tsx`/`background.ts`. Adding a setting means the type in `types.ts`, the default in `settingsStore.ts`, a control in `SettingsView.tsx`, and wherever it is read.
- Never store private keys; all signing uses `window.hive_keychain` (content script injection via `chrome.scripting.executeScript`).
- The extension icon badge displays VP/RC percentage or unread message count — badge logic exists in both `App.tsx` and `background.ts`.

## Architecture Overview

- `App.tsx` — Main React component; manages all UI state and view routing (`AppView` enum)
- `background.ts` — Service worker: alarms for periodic status checks, badge updates, notifications, auto-redirect via `tabs.onUpdated`
- `content.ts` — Minimal content script (placeholder); login uses `chrome.scripting.executeScript` instead
- `utils/hiveHelpers.ts` — Hive RPC calls (account stats, prices)
- `utils/ecencyHelpers.ts` — Ecency/Mattermost chat API wrapper
- `utils/ecencyLogin.ts` — Keychain signing and token creation
- `utils/urlHelpers.ts` — URL parsing and frontend-switching logic
- `constants.ts` — Frontend configs (`FRONTENDS`), dApp listings (`DAPPS`), regex patterns
- `types.ts` — Central TypeScript interfaces and enums
- `components/views/` — Functional tab views: Switcher, Chat, Stats, Apps, Settings, Share