# AGENTS.md

## Project Type

Chrome Extension (Manifest V3) — not a standard web app. The popup and side panel both load `index.html`; background and content scripts are separate entry points.

## Build & Dev

- `npm run build` — production build to `dist/`; load `dist/` as unpacked extension in `chrome://extensions`
- `npm run dev` — Vite dev server (useful for UI work, but Chrome extension APIs require the built extension)
- `npm run preview` — preview production build locally

- `npm test` — vitest, 124 tests covering the scoring engines, URL helpers and tag scanner
- `npx tsc --noEmit` — typecheck

No lint or format command. No CI pipeline, so the checks above are run by hand.

## Contest Judging

The weekly SEO contest is judged with `scripts/judge-contest.mjs`. Before running it:

1. Put one submitted Hive URL or `@author/permlink` per line in an entries file.
2. Set `WINDOW_START` and `WINDOW_END` in the script to the contest's published UTC window.
3. Run `node scripts/judge-contest.mjs entries-weekN.txt` from the repository root.
4. Review `contest-results.csv`, then archive it as `contest-results-weekN.csv` before the next round.

The judge fetches each post from Hive and uses the shared `scripts/lib/seo-score.mjs` engine. It
uses the best title-derived keyword because the author's editor keyword is not stored on-chain.
Verify tags, referrals, and any social-media prize requirements separately. Do not rerun an old
round with the current script without restoring that round's date window; the script is rolled
forward for the active contest.

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
- `DEFAULT_SETTINGS` is duplicated in `App.tsx` and `background.ts` — keep both in sync when modifying settings.
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