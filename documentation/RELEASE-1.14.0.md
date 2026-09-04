# HivePulse 1.14.0 — store submission

Packages are in `releases/` (gitignored). Rebuild any of them with:

```
npm ci && npm run build && npm run build:firefox
```

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.14.0-chrome.zip` | Chrome Web Store, Microsoft Edge Add-ons | 34 files, 334 KB |
| `hivepulse-1.14.0-firefox.zip` | Firefox AMO | 34 files, 335 KB |
| `hivepulse-1.14.0-source.zip` | Firefox AMO — **required** | 135 files, 7.2 MB |

Minor version bump, not a patch: this release adds a feature (internal-market activity in Pulse).

## What's in it

**Pulse — internal market activity** (PR #12). Limit orders, fills, cancellations and HBD↔HIVE conversions now appear in the Pulse feed, with a dedicated Market tab.

**Frontend link resolution** (PR #14).
- Ureka is routed correctly. It is condenser-shaped (`/@author/permlink`), and its composer is `/create`, not `/submit`.
- `frontendIsStandard` no longer *infers* that a frontend shares condenser routes from the absence of a post template — it reads an explicit `sharesCondenserRoutes` flag, set only on the three frontends actually verified.
- The `active` flag had three dead ends: the preferred-frontend picker offered frontends that were switched off, the Settings toggle was inert (it wrote `activeFrontendIds` while the switcher re-checked a hardcoded flag), and a detected-but-disabled frontend rendered as "On Unknown".
- Deleting a custom frontend left `preferredFrontendId` dangling; `getTargetUrl` answers `'#'` for an unknown id and that went to `chrome.tabs.update` on every Hive page load.
- The side panel now tracks the active tab. It renders the same page as the popup but stays mounted across navigation, so its one-shot tab query left it describing the page it was opened on.

**Post analyzer**
- SlothBuzz tag chips are detected. The old fallback anchored on the tag `<input>`, which SlothBuzz unmounts at its 10-tag cap — so a fully tagged post scored zero.
- The analyzer can be switched off in Settings (on by default).

**Packaging**
- The manifests declared icons at 16/32/48/128 and pointed all four at one 100×100 file. Real sizes now ship. Firefox had three such blocks (`icons`, `action.default_icon`, `sidebar_action.default_icon`), all wrong.

## Verification

- 67 tests pass (`npm test`) — `urlHelpers`, `tagScan`, `hiveHelpers`.
- `npx tsc --noEmit` — 0 errors.
- Both builds green.
- `npx web-ext lint --source-dir=dist-firefox` — **0 errors**, 21 warnings (see below).
- The source archive rebuilds `dist-firefox` **byte-identical** to the submitted package (34/34 files, no digest differences), from a clean `npm ci` on Node 20.20.2.

Package the zips with the Python snippet in this repo's history, or any tool that writes forward-slash entry names. **Do not use PowerShell 5.1 `Compress-Archive`** — it writes backslash path separators, which violates the ZIP spec and stores can reject.

## Store-by-store

### Chrome Web Store
Upload `hivepulse-1.14.0-chrome.zip`. No new permissions versus the published version, so no extended review is expected.

### Microsoft Edge Add-ons
Same `hivepulse-1.14.0-chrome.zip`.

### Firefox AMO
Upload `hivepulse-1.14.0-firefox.zip`, then `hivepulse-1.14.0-source.zip` when asked for source (required because the submitted code is bundled and minified).

Notes for the reviewer:

> Build: `npm ci && npm run build:firefox` on Node 20.x. Output is `dist-firefox/`, which reproduces the submitted package byte-for-byte.
>
> The 20 `UNSAFE_VAR_ASSIGNMENT` warnings are in `content.js` and `popup.js`. Those `innerHTML` assignments use extension-authored template strings; no blockchain- or user-supplied value is interpolated into markup.
>
> The `UNSUPPORTED_API` warning for `sidePanel.open` is a false positive from static analysis: the call is guarded by `if (chrome.sidePanel)` and Firefox takes the `sidebarAction.toggle()` branch instead (`components/Header.tsx`).

## Known and accepted

- **21 lint warnings**, all pre-existing and unchanged by this release: 20 `UNSAFE_VAR_ASSIGNMENT`, 1 `UNSUPPORTED_API`.
- **`testapi.hivescan.info`** backs `FYP_API_BASE`, `BALANCE_API_BASE` and `HAF_STATS_API_BASE` and is not in `host_permissions`. This is deliberate and not broken: the host returns `Access-Control-Allow-Origin: *`, so the requests succeed from extension pages without a declaration, and adding one would request a permission the extension does not need. Worth revisiting only because a *test* host is serving production traffic.
- **No `useMemo` on the derived notification lists.** Measured ~8.6 ms per render at 1,000 rows and ~135 ms at 20,000. Only reachable by paging deep into history, and `financeHistory` is uncapped. Its own change.
- **No timeout or abort on Hive RPC calls.** A hung node leaves the Pulse spinner running. `utils/hiveEngineHelpers.ts` already has the `AbortController` pattern to copy.
- **`components/NotificationList.tsx` has no component tests.** `hiveHelpers` is now covered; the list itself is not.

## Not done

`develop` is not merged to `main` and no tag is cut — PR #11 is still open for that. Do it when you're ready to release rather than as part of preparing the packages.
