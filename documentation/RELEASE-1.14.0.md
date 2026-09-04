# HivePulse 1.14.0 — store submission

Packages are in `releases/` (gitignored). Rebuild any of them with:

```
npm ci && npm run build && npm run build:firefox
```

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.14.0-chrome.zip` | Chrome Web Store, Microsoft Edge Add-ons | 34 files, 335 KB |
| `hivepulse-1.14.0-firefox.zip` | Firefox AMO | 34 files, 335 KB |
| `hivepulse-1.14.0-source.zip` | Firefox AMO — **required** | 129 files, 7.0 MB |

Minor version bump, not a patch: this release adds a feature (internal-market activity in Pulse).

## What's in it

**Pulse — internal market activity** (PR #12). Limit orders, fills, cancellations and HBD↔HIVE conversions now appear in the Pulse feed, with a dedicated Market tab.

**Frontend link resolution** (PR #14).
- Ureka is routed correctly: posts are `/@author/permlink` and its composer is `/create`, not `/submit`. It is deliberately **not** flagged as sharing condenser routes — its bundle declares no `/created`, `/witnesses` or `/proposals` (it links those out to hivehub.dev), so bare paths are not carried onto it.
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

- 71 tests pass (`npm test`) — `urlHelpers`, `tagScan`, `hiveHelpers`.
- `npx tsc --noEmit` — 0 errors.
- Both builds green.
- `npx web-ext lint --source-dir=dist-firefox` — **0 errors**, 21 warnings (see below).
- The source archive rebuilds `dist-firefox` **byte-identical** to the submitted package (34/34 files, no digest differences), from a clean `npm ci` on Node 20.20.2.

Two packaging rules, both learned the hard way:

- **Build the source archive from `git ls-files`, never by walking the directory.** A filesystem walk is governed by whatever skip list you remember to write, not by `.gitignore` — and it swept an untracked `.env.local` holding a live API key straight into the archive that goes to Mozilla. Anything git does not track is not a build input.
- **Do not use PowerShell 5.1 `Compress-Archive`** — it writes backslash path separators, which violates the ZIP spec and stores can reject.

## Store-by-store

### Chrome Web Store
Upload `hivepulse-1.14.0-chrome.zip`.

**Permission delta versus the published 1.12.0: +13 host permissions, −2.** The additions are all Hive and Hive-Engine RPC endpoints plus `blog.suseona.com`, and every one is used. Removed: `s3.amazonaws.com` and `files.peakd.com`, which appeared in no source file and no bundle — a blanket grant over all of AWS S3 is a predictable reviewer question, so it is gone. `web_accessible_resources` was also dropped: nothing in a content script loaded `icon.png`, and exposing it to `<all_urls>` let any page fingerprint the extension by its id.

In practice Chrome will not re-prompt existing users, because the `<all_urls>` content script already produces the maximal host warning — but the earlier claim in this document that there were "no new permissions" was simply wrong.

### Microsoft Edge Add-ons
Same `hivepulse-1.14.0-chrome.zip`.

### Firefox AMO
Upload `hivepulse-1.14.0-firefox.zip`, then `hivepulse-1.14.0-source.zip` when asked for source (required because the submitted code is bundled and minified).

Notes for the reviewer:

> Build: `npm ci && npm run build:firefox` on Node 20.x. Output is `dist-firefox/`, which reproduces the submitted package byte-for-byte.
>
> The 20 `UNSAFE_VAR_ASSIGNMENT` warnings are `innerHTML` assignments split across `compose.js` (14), `popup.js` (4) and `content.js` (2). Every one builds an extension-authored template string, and each untrusted value — post title, meta description, permlink, user keyword, image filename, chain-derived tag — is passed through the `esc()` helper in `compose.ts` first. The hover card in `content.ts` interpolates a username already constrained to `^[a-z][a-z0-9.-]{2,15}$` plus numeric fields. There is no `insertAdjacentHTML` or `outerHTML` anywhere.
>
> The `UNSUPPORTED_API` warning for `sidePanel.open` is a false positive from static analysis: the call is guarded by `if (chrome.sidePanel)` and Firefox takes the `sidebarAction.toggle()` branch instead (`components/Header.tsx`).

## Known and accepted

- **21 lint warnings**, all pre-existing and unchanged by this release: 20 `UNSAFE_VAR_ASSIGNMENT`, 1 `UNSUPPORTED_API`. Reviewed individually — see the reviewer note above.
- **`PRIVACY.md` is out of date** (last revised December 2025) and should be refreshed before or alongside submission. It says the `activeTab` permission reads the active tab's URL "only when you interact with the extension"; the extension now reads `tab.url` on every tab update in `background.ts`, and the side panel registers a continuous `tabs.onUpdated` listener. It also does not mention that the post analyzer reads draft content on nine frontends — that content never leaves the machine, the only outbound call in `compose.ts` sends `{limit: 25}` — nor the `testapi.hivescan.info`, CoinGecko and RPC traffic. Firefox's `data_collection_permissions: {required: ["none"]}` deserves a second look on the same pass, since the user's Hive username does reach third-party hosts.
- **Firefox extension id is an email address** (`browser_specific_settings.gecko.id`). Valid and accepted by AMO, so not a policy problem, but it publishes a personal address in every shipped XPI. Changing it would orphan every existing Firefox user — a new id is a new add-on listing — so it stays. Accepted cost, not a fix.
- **`testapi.hivescan.info`** backs `FYP_API_BASE`, `BALANCE_API_BASE` and `HAF_STATS_API_BASE` and is not in `host_permissions`. This is deliberate and not broken: the host returns `Access-Control-Allow-Origin: *`, so the requests succeed from extension pages without a declaration, and adding one would request a permission the extension does not need. Worth revisiting only because a *test* host is serving production traffic.
- **`financeHistory` is uncapped.** The derived lists are memoised now, so paging deep no longer costs a re-render, but the array itself grows without bound at 1000 rows per "Load older".
- **`components/NotificationList.tsx` has no component tests.** `urlHelpers`, `tagScan` and `hiveHelpers` are covered; the list component is not, and the merge/resolution logic in it is the subtlest code in this release.
- **Market rows link to the wallet, not to order history**, because no configured frontend has a market route to link to. Giving them a real destination means adding a `market` entry to `LinkStructureConfig` per frontend — a feature.

## Not done

`develop` is not merged to `main` and no tag is cut — PR #11 is still open for that. Do it when you're ready to release rather than as part of preparing the packages.
