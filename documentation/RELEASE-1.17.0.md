# HivePulse 1.17.0 — store submission

> **SHIPPED.** Submitted 11 Nov 2026 and approved by Firefox AMO the same day,
> reviewed 17:46 UTC, now `public` as the current version. The live listing reports 18
> permissions and 29 host permissions — exactly the 7 manifest permissions plus the 11
> `content_scripts` match patterns predicted in Box 2, so the permission delta in the
> reviewer note was accurate as submitted. The signed XPI is 368,459 bytes against our
> 345,376-byte zip; the difference is Mozilla's signature block.
> **Next release measures its permission delta against 1.17.0, not 1.16.0.**
>
> **Chrome Web Store: also live, published 11 Nov 2026**, same day. Listing reports
> version 1.17.0, 342 KiB, 42 users. Both stores shipped 1.17.0 within hours of
> submission.
>
> Verifying a release without any store credentials, for next time:
>
> - **AMO** has a public REST API — `https://addons.mozilla.org/api/v5/addons/addon/hivepulse/`
>   returns `current_version.version`, the file status and the permission list.
> - **Chrome Web Store** has no public API (the Publish API needs OAuth tied to the
>   publisher account), but the *published* version is in the public listing HTML at
>   `https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg`
>   — the Details panel carries `Version` and `Updated`, and the page embeds the
>   manifest. Only the **review-queue** state (pending / in review / rejected) is truly
>   dashboard-only. Do not report a Chrome release as unverifiable; check the listing.

Packages are in `releases/` (gitignored). Rebuild any of them with:

```
npm ci && npm run build && npm run build:firefox
node scripts/make-source-zip.mjs
```

| File | Store | Notes |
|---|---|---|
| `hivepulse-1.17.0-chrome.zip` | Chrome Web Store, Microsoft Edge Add-ons, Opera | 34 files, 337 KiB |
| `hivepulse-1.17.0-firefox.zip` | Firefox AMO | 34 files, 337 KiB |
| `hivepulse-1.17.0-source.zip` | Firefox AMO — **required** | 175 files, 7.1 MiB · sha256 `7eb0d1d851287624` |

**Minor bump, not a patch.** There is a new setting and chat notifications behave
differently — they respect muting, they stop sticking to the screen, and clicking one
now goes somewhere useful. New behaviour and a new control, so minor.

**Previous published version on AMO: 1.16.0** (confirmed live via the AMO API, status
`public`). The manifest is byte-identical to it apart from the version string — **no
permission changes**, 7 permissions and 29 host permissions, unchanged.

Everything in this release is in the chat and notification area. All five items came out
of one bug report from **@ahmedabbaci**, who was getting desktop popups for a community
channel he had no interest in, and whose notifications led to a 404 when he clicked them.

## What's in it

**1. Chat notifications can be turned off.** There was no way to stop the desktop popups
short of signing out of chat entirely. `overrideBadgeWithUnreadMessages` only controls the
number on the toolbar icon, so turning it off left the popups coming. There is now a
separate switch for the popups, default on, so nobody loses a notification by upgrading.

**2. Muted channels are respected.** Ecency's chat API returns `is_muted` on every
channel and their own sorter buckets muted channels last. **We referenced that field zero
times.** So muting a channel in Ecency silenced it in their app, on their site and on
mobile — everywhere except here, where the popups carried on. Muting is exactly what you
reach for on a busy community channel you do not care about, and we were the one surface
ignoring it.

**3. Notification popups no longer stick to the screen.** They were created with
`requireInteraction: true`, which on Chrome means the popup stays until it is dismissed by
hand. Seven of those in three days is what prompted the report. They now behave like
every other notification and fade.

**4. Clicking a notification opens the conversation.** We opened
`https://ecency.com/chat`. Ecency's route is **`/chats`** — the singular 404s, which is
the error screenshotted in the report. The channel id was already sitting unused in the
notification id, so the click now lands on `/chats/{channelId}`: the actual conversation,
not a listing and not an error page.

**5. Another account's chat session is no longer adopted.** Found while ruling out a
cross-account explanation for the above, and it is the most serious of the five.

**CONFIRMED IN THE WILD, 12 Nov 2026.** This was written up as unreported and theoretical.
The reporter's own follow-up says otherwise, and it is worth correcting rather than leaving
the flattering version on the record. @ahmedabbaci states he **never followed and never
muted** the "Black And White" channel he was being notified about — so the muting gap in
item 2 does not explain his report — and that the messages **stopped once he logged into
Ecency**. That is this bug precisely: with no session of his own, the extension fell back
to whatever `mm_pat` cookie answered on ecency.com and adopted a stranger's session, which
is why he saw a channel he had never joined. Logging in replaced the cookie with his own
and the stranger's conversations disappeared.

So item 5 is not a hardening measure found during a hunt — it is the root cause of the
original report, and item 2 is a real but separate gap. The severity in the AMO reviewer
note was stated correctly; only its discovery story was wrong.

Ecency chat authenticates with a single `mm_pat` cookie on `ecency.com`. The cookie
belongs to the **browser** — it is not ours and it is not per-account. Three code paths
treated a session that answered as proof it was the right session:

| path | what it did |
|---|---|
| background cookie fallback | probed the cookie and adopted whatever session replied |
| background refresh | stored the id from `/users/me` — an endpoint that authenticates by **cookie** and ignores the Bearer, so it answers for whoever `ecency.com` is signed in as, not for the token just refreshed |
| chat bootstrap | read the cookie straight after a `200`. A `200` does not prove the `Set-Cookie` landed; if it did not, the value read and saved was the account already signed in |

So: be signed into Ecency in a tab as one account while the extension holds another, and
the wrong session was picked up silently. The unread count and the desktop popups then
described a stranger's inbox under your own name, and the bad value was saved and replayed
on every later switch to that account.

All three paths now confirm identity before trusting a session, preferring the stored
Mattermost user id (an opaque id settles this without any assumption about how Hive names
map to chat names) and falling back to the username on first run. **Identity that cannot
be established is a refusal, not a pass** — otherwise the check is decorative on exactly
the flaky network where the recovery path runs.

### Not in this release

The reading-ease half of @ahmedabbaci's report — the analyzer panel showing a different
readability on Ecency than the published post receives — is fixed on the branch
`fix/readability-wrap-independence` and deliberately **held back**. It changes contest
scores (reading ease falls on 97 of 99 corpus posts, 28 of them across a scoring band),
and contest week 16 is open until 17 November 12:00 UTC. A rubric must not move under a
round that entrants have already written for. It is recorded in `AGENTS.md` as effective
from week 17.

## Verification

- **199 tests pass** (`npm test`), up from 188 — 11 new, covering the chat-session
  identity gate.
- The identity gate was **mutation-checked**: replacing the comparison with "accept
  whatever came back" fails two of the new tests by name. The gate's fail-closed
  behaviour on an unanswerable `/users/me` is covered separately, because a check that
  passes when it cannot tell is not a check.
- `npx tsc --noEmit` — 0 errors.
- Both builds green from a clean `npm ci` on **Node 20.20.2 / npm 10.8.2**.
- `npx web-ext lint --source-dir=dist-firefox` — **0 errors, 0 notices, 21 warnings**,
  unchanged from 1.16.0.
- The source archive rebuilds `dist-firefox` **byte-identically** — 34/34 files, zero
  digest differences, from a clean extract and `npm ci` in an empty directory. Verified
  for this build, not assumed.
- All five changes confirmed present in the shipped bundle, not just in source:
  `ecency.com/chats`, `is_muted`, the `chatNotificationsEnabled` read, and the identity
  comparison are each grepped out of `dist-firefox/assets/`.

---

# AMO submission — paste these two blocks

## Box 1 — Release Notes (public)

```
Chat notifications, fixed five ways. All of this came from one user's bug report.

You can now turn chat notification popups off. Until now the only way to stop them was to sign out of chat completely — the existing setting only controlled the number on the toolbar icon, not the popups. There is now a separate switch for the popups in Settings. It starts on, so nothing changes unless you turn it off.

Muted channels are now actually muted. If you muted a chat channel in Ecency, it went quiet in the Ecency app and on their website — but not here. We were not reading the "muted" flag at all, so this extension kept popping up messages from channels you had already silenced. It now respects them.

Notification popups no longer stay on screen until you dismiss them. They were set to require a click; they now fade like any other notification.

Clicking a notification takes you to the conversation. It used to open a page that did not exist, so you got a 404. It now opens the specific chat the message came from.

And a privacy fix: if you were signed into Ecency in a browser tab as one account while the extension was set up with a different one, the extension could pick up the wrong chat session. Your unread count and your popups would then show the other account's messages under your name. The extension now checks whose session it has before using it, and refuses any session it cannot confirm belongs to you.

No new permissions. Nothing outside chat and notifications changed.
```

## Box 2 — Notes to Reviewer (private)

```
BUILD INSTRUCTIONS (reproduces the submitted package exactly)

Environment: Node 20.20.2, npm 10.8.2. No global tooling required.

1. Extract hivepulse-1.17.0-source.zip into an empty directory.
2. cd into that directory.
3. npm ci
4. npm run build:firefox
5. The output is in dist-firefox/ — 34 files.

This produces dist-firefox byte-for-byte identical to the contents of
hivepulse-1.17.0-firefox.zip. We verified this for THIS build, not as a general
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
warnings. The warnings are unchanged from version 1.16.0 and fall into two groups:

- innerHTML assignment warnings in assets/popup.js. These come from React's
  compiled output (dangerouslySetInnerHTML is not used anywhere in our source).
  No user-supplied or network-supplied string is written to innerHTML.
- UNSUPPORTED_API: sidePanel.open is not implemented in Firefox. This is guarded
  at runtime; the side panel entry point is Chrome-only and the Firefox build
  falls back to the popup. The call is never reached under Firefox.

MANIFEST / PERMISSION DELTA vs THE CURRENTLY PUBLISHED VERSION

Published version on AMO at the time of this submission: 1.16.0 (status: public,
confirmed via the AMO API).

manifest.firefox.json differs from 1.16.0 in exactly one line — the version
string, 1.16.0 -> 1.17.0. Nothing else changed.

  permissions:      7  (activeTab, tabs, storage, alarms, cookies,
                        notifications, scripting)   — UNCHANGED
  host_permissions: 29                              — UNCHANGED

The AMO listing page for 1.16.0 shows 18 permissions, not 7. Those 18 are the
7 manifest permissions above plus the 11 match patterns declared in
content_scripts (<all_urls> and ten Hive frontend origins), which AMO folds
into a single displayed list. The content_scripts block is unchanged in this
release, so that displayed count of 18 is unchanged too.

Method, so this is checkable rather than asserted: the manifest was extracted
from the submitted hivepulse-1.17.0-firefox.zip and diffed against the
manifest inside the published 1.16.0 package. Exactly one line differs — the
version string. The same diff on the Chrome packages gives the same single
line. (Chrome declares one permission more than Firefox, sidePanel; that is a
long-standing difference between the two manifests, not a change here.)

No new permissions, no new hosts, no new content scripts, no change to the
background service worker's registration.

WHAT CHANGED IN THIS RELEASE

Five changes, all in the Ecency chat and notification code (background.ts,
utils/ecencyHelpers.ts, components/views/SettingsView.tsx, types.ts,
utils/settingsStore.ts). No network endpoint was added. No new data is read,
stored or transmitted; one existing API field that was already being received is
now actually used, and one existing endpoint is now called for an additional
reason (see 5).

1. New setting chatNotificationsEnabled (boolean, default true), stored in
   chrome.storage.local alongside the other settings, with a control in the
   settings view. Gates chrome.notifications.create for chat messages. It exists
   because the only previous way to stop the popups was to sign out of chat.

2. The channel objects returned by Ecency's chat API carry an is_muted field
   that the extension was not reading. Notifications are now suppressed for
   muted channels. This is a field already present in responses we already
   receive — nothing new is requested.

3. chrome.notifications.create no longer passes requireInteraction: true for
   chat and Hive notifications, so popups auto-dismiss.

4. The notification click handler opened https://ecency.com/chat, which is not a
   route on that site and returned 404. It now opens
   https://ecency.com/chats/<channelId>, parsing the channel id out of the
   notification id the handler already receives.

5. PRIVACY-RELEVANT, and the reason the "cookies" permission matters here.
   Ecency chat authenticates with a single mm_pat cookie on ecency.com. That
   cookie belongs to the browser, not to this extension and not to a particular
   account. Three code paths previously treated any session that answered as
   proof it was the right session: a cookie fallback in the background worker, a
   token-refresh path that read the user id from /users/me (which authenticates
   by cookie and ignores the Bearer header, so it answers for whoever ecency.com
   is signed in as), and chat bootstrap, which read the cookie immediately after
   a 200 without confirming the Set-Cookie had landed.

   Consequence: a user signed into ecency.com in a tab as account A, with the
   extension configured for account B, could have account A's chat session
   adopted silently — unread counts and desktop notifications for A's messages
   shown under B's name, and the value persisted and replayed on later account
   switches.

   All three paths now call the existing /users/me endpoint and compare the
   answer against the account the extension holds (preferring the stored
   Mattermost user id, falling back to the username on first run) before using
   the session. A session whose owner cannot be established is refused rather
   than assumed. This adds no new permission and no new endpoint; /users/me was
   already in use.

Test coverage went from 188 to 199 tests, all passing. The 11 new tests drive the
identity check through a stubbed /users/me and were mutation-checked: removing the
comparison fails two of them by name.

No private keys are handled by this extension; all signing is delegated to the
Hive Keychain extension via window.hive_keychain.
```

## Store-by-store

### Chrome Web Store
Upload `hivepulse-1.17.0-chrome.zip`. Paste Box 1 into the release notes field. No
permission justification changes needed — the permission set is identical to 1.16.0.

### Microsoft Edge Add-ons / Opera
Same package as Chrome.

### Firefox AMO
Upload `hivepulse-1.17.0-firefox.zip`, then `hivepulse-1.17.0-source.zip` when prompted
for source. Paste Box 1 into release notes and Box 2 into "Notes to Reviewer". The source
archive is **required** because the build is bundled and minified.

## Known and accepted

- The 21 web-ext lint warnings are unchanged and explained in Box 2.
- The source archive carries 52 files the build never reads: the weekly contest
  entries and archived results, the cover-image scripts, and internal notes
  (`AGENTS.md`, `PRD.md`, `GEMINI.md`, `REVIEWERS.md`). The archive is
  reviewer-only rather than public, and it was audited for credentials before
  submission — none, the sole grep hit being a substring of a `@babel/template`
  integrity hash. Five earlier releases shipped the same way and passed review,
  so this is not a blocker. `scripts/make-source-zip.mjs` should still be
  narrowed to what `npm ci && npm run build:firefox` actually reads; 1.18.0
  rebuilds the archive anyway and is the place to do it.
- `sidePanel.open` remains Chrome-only; the Firefox build uses the popup.
- `compose.ts` and `scripts/lib/seo-score.mjs` are still kept in sync by hand.
  `utils/geoRubric.test.ts` compares the shared regexes, helpers and every
  threshold→score pair between them, so a divergence breaks the build rather than
  silently changing contest results.
- The reading-ease fix is held for week 17 (see "Not in this release"). If it is merged
  before this package is submitted, re-cut from `develop` and fold its release notes in
  rather than shipping two versions in one week.
