# HivePulse

**The heartbeat of your Hive experience.**

HivePulse (formerly HiveKit) is a browser extension for **Chrome, Firefox, Brave, Edge, Opera — and Firefox for Android** that turns your browser into a dashboard for the Hive blockchain. Wallet actions, scam protection, chat, feeds, notifications, frontend switching, and a live SEO/AI analyzer for your posts — all in one place.

## Get HivePulse

- **Chrome / Brave / Edge:** https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg
- **Firefox (desktop & Android):** https://addons.mozilla.org/en-US/firefox/addon/hivepulse/
- **Opera:** listing pending review — in the meantime, install the Chrome Web Store build using Opera's *Install Chrome Extensions* add-on.

> Maintainer note — manage/submit builds at:
> Chrome Web Store Developer Dashboard · [Firefox AMO Developer Hub](https://addons.mozilla.org/en-US/developers/addon/hivepulse/) · Opera Add-ons Developer Portal

## Key Capabilities

### 1. The Pulse (Stats & Health)
*   **Vital Signs:** Monitor your **Voting Power (VP)** and **Resource Credits (RC)** in real-time.
*   **Smart Badge:** The extension icon changes color (Green/Orange/Red) based on your energy levels, or switches to a **Blue Counter** when you have unread messages.
*   **On-Page Overlay:** An optional, configurable RC/VP overlay on every supported Hive frontend, with an RC-cost breakdown (how many votes, comments, posts and transfers you can still afford).
*   **Auto-Sync:** Simply log in to chat, and HivePulse automatically tracks stats for that user.

### 2. The Wallet (Full Action Center)
Every transaction is signed locally through **Hive Keychain** — no keys are ever stored or transmitted.
*   **Send & receive** HIVE/HBD with recipient validation, memos and a paginated transfer history.
*   **Claim rewards** (HIVE, HBD, HP) and **HBD savings interest** in one tap.
*   **Power Up / Power Down** (with a stop-power-down control), **delegate HP**, and manage **savings**.
*   **Hive-Engine tokens:** send, stake and unstake, with staking controls shown only for tokens that support it.
*   **Portfolio & history:** live USD valuations, a balance-history chart, and an "unstaking in progress" panel for anything still cooking.

### 3. Scam Shield (Fund Protection)
*   **Blocks transfers to known scam accounts** — checked on transfers, delegations and Hive-Engine sends, enforced at the single point every signed action passes through.
*   **Two tiers**, compiled from the community [`watchmen`](https://gitlab.syncad.com/hive/watchmen) aggregator (condenser, denser, Ecency, HiveWatchers and others): ~1,000 **scam** accounts (hard block, overridable with an explicit confirmation) and ~14,000 **watchlisted** accounts (soft caution).
*   **Impersonation warnings:** flags recipients that closely resemble accounts *you* have paid before — the most common way Hive funds are stolen.
*   **@username hover cards:** hover any profile link on a Hive frontend to see reputation, account age, Hive Power and post count, with warnings for scam-listed or brand-new low-reputation accounts.
*   **Recipient autocomplete:** suggests accounts you've paid before, with scam/watchlist entries clearly flagged.

### 4. The Signal (Ecency Chat)
*   **Full-Featured Messenger:** Access your Ecency DMs and Community Channels from any tab.
*   **Side Panel Mode:** Pin HivePulse to the browser's side panel to keep your chats and stats visible while you browse.
*   **Robust Unread Tracking:** Never miss a message. We use a dual-verification system (API counts + Timestamp comparison) to ensure the **Blue Dot** indicator is always accurate.
*   **Background Monitoring:** HivePulse actively checks for new messages even when the popup is closed, updating the extension badge. *(Checks run periodically based on the interval configured in Settings.)*
*   **Secure:** Log in via **Hive Keychain** (client-side signing). No password entry required.
*   **Manage:** Edit, delete, and react to messages directly from the extension.

### 5. Notifications & Feeds
*   **Hive blockchain notifications** — replies, mentions, follows, transfers, delegations and reblogs — with a badge, desktop notifications, filtering by type, and deep links that open in *your* preferred frontend.
*   **✨ For You feed:** a personalized stream powered by HAF FYP, alongside the classic **Trending / Hot / New** and **Communities** tabs.

### 6. The Nexus (Frontend Switcher)
*   **Context Aware:** Viewing a post on PeakD but want to read it on Ecency? Switch instantly. HivePulse detects the current author, permlink, or feed and redirects you to the exact same spot on the target interface.
*   **Supported frontends:** PeakD, Ecency, Hive.blog, InLeo, Actifit, 3Speak, Waivio, Liketu, HiveScan, **Ureka**, **SlothBuzz**.
*   **Custom frontends:** add any Hive frontend of your own with configurable post/profile/wallet URL patterns.
*   **Action Modes:** Jump straight to the **Wallet** or **Post Editor** of your favorite frontend, and optionally auto-redirect all Hive links.

### 7. The Analyzer (Post SEO & GEO Scoring)
*   **Real-Time Feedback:** As you write in a Hive post editor (PeakD, Ecency, Hive.blog, InLeo, Actifit, **SlothBuzz**), HivePulse injects a live **Post Analyzer** that scores your draft out of 100.
*   **SEO Tab:** Grades focus-keyword placement, title & meta-description length, heading structure, media/alt text, internal & external links, tags, and readability — each row with an ⓘ explainer.
*   **AI · GEO Tab:** Scores **Generative Engine Optimization** (how extractable your content is for AI answer engines), and is **content-type aware** so personal/creative posts aren't nagged for stats, FAQs, or definitions.
*   **Keyword Auto-Detection:** If you don't set a focus keyword, HivePulse infers a likely long-tail keyword from your title and body.
*   **Works with rich-text editors:** reconstructs markdown from WYSIWYG editors (Ecency, InLeo), so headings, links and images are scored accurately — including across Ecency's two-step publish flow.

### 8. Nodes & Accounts
*   **Multi-account switcher** with per-account settings and a full data reload on switch.
*   **Node control:** choose your Hive and Hive-Engine RPC nodes, add custom ones, or let HivePulse auto-switch on failure.

## How the Scores Work

The Post Analyzer's SEO and GEO scores are **entirely custom** — built from scratch in [`compose.ts`](compose.ts). There is **no third-party SEO or readability library** (no Yoast, no npm scoring package); the analyzer script imports nothing and runs fully client-side. Here's an honest breakdown of what's principled versus what's our own heuristic judgment.

**Based on established formulas / industry standards:**
*   **Readability** uses the real **Flesch Reading Ease** and **Flesch–Kincaid Grade** formulas (public-domain), implemented by hand — including a heuristic **syllable counter** (regex-based vowel-group counting). The syllable estimate is an approximation, not a dictionary lookup.
*   **The SEO checks** map to widely-accepted best practices: title ~50–60 chars (Google's SERP truncation point), meta description ~120–160 chars, focus keyword in title / first 100 words / a subheading / the URL, keyword density under ~3%, `##` heading hierarchy, image alt text, and internal vs. external links.
*   **Transition words** are matched against a hardcoded connector list (the same concept Yoast uses).

**Our own custom heuristics (not from any library or validated dataset):**
*   **All point weights and thresholds** — e.g. Keyword 35 / Title 12 / Meta 10 / Structure 11 / Media 9 / Links 7 / Tags 8 / Readability 8, summing to 100. These were chosen as reasonable; they are not calibrated against ranking data.
*   **The entire GEO / AI score** — hook detection, "self-contained sentences" (pronoun-start ratio), named-entity proxying (third-person pronoun density), definitional-sentence regex, and the content-type detector. These are sensible proxies we designed, not an established methodology.
*   **Keyword auto-detection** — extracts adjacent title phrases ranked by body frequency.

**The honest caveat:** this is a transparent, explainable rules engine — every number is visible (which is why each row has an ⓘ explainer) — but it is **heuristic, not machine-learned or benchmarked** against real SERP or AI-citation outcomes. It reliably catches the obvious wins (missing meta, short title, no keyword in headings, thin content) and is genuinely useful for that, but it won't perfectly predict ranking, and the GEO checks especially are English-only and pattern-based. Realistic future upgrades would be swapping the syllable heuristic for a small syllable dictionary and calibrating the weights/thresholds against actual Hive post performance.

## Installation (Development)

1.  **Initialize:**
    ```bash
    npm install
    ```

2.  **Build:**
    ```bash
    npm run build           # Chrome/Brave/Edge/Opera → dist/
    npm run build:firefox   # Firefox → dist-firefox/
    ```

3.  **Load in Chrome / Brave / Edge / Opera:**
    *   Go to `chrome://extensions` (or `brave://extensions`, `opera://extensions`)
    *   Enable **Developer Mode**
    *   Click **Load unpacked** → select the `dist` folder.

> The Post Analyzer panel shows the running extension version in its header — handy for confirming an update actually loaded (browsers cache unpacked extensions; use the **Reload** button on the extensions page after a rebuild).

## Firefox Development

The Firefox build outputs to `dist-firefox/` (using `manifest.firefox.json`, which adds the sidebar, Gecko settings and Android support).

**Run it (one command):**
```bash
npm run firefox          # build dist-firefox/, then launch Firefox with the add-on loaded
```

**Live-reload dev loop:**
```bash
npm run firefox:watch    # rebuild on every source edit AND auto-reload the add-on
```
Edit any `.ts`/`.tsx` → Vite rebuilds `dist-firefox/` → `web-ext` reloads the extension automatically.

**Run with your real profile (Hive Keychain + existing extensions):**
```bash
npm run firefox:real          # launch on your default-release profile (persists changes)
npm run firefox:watch:real    # same, with live-reload on source edits
```
These use `--firefox-profile=default-release --keep-profile-changes`, so your installed extensions (including Hive Keychain) are present and any changes persist.

> ⚠️ **Close your normal Firefox first.** A profile can only be open in one Firefox instance at a time; running this while your daily Firefox is open will fail with a profile-lock error. `web-ext` also temporarily adjusts dev-related prefs in that profile.

**Notes:**
*   The plain `npm run firefox` / `firefox:watch` commands launch a **clean throwaway profile** (nothing but HivePulse) — safe, but **Hive Keychain is not there**. Use the `:real` variants above when you need Keychain.
*   To target Developer Edition / Nightly, append `--firefox=firefoxdeveloperedition` (or a binary path) to the script.
*   Prefer loading manually? Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select `dist-firefox/manifest.json` (requires Firefox 115+).

> For upload-ready store packages (Chrome + Firefox zips), run `package.bat`. The Chrome zip is also what you submit to Opera. Build instructions for add-on reviewers live in [`REVIEWERS.md`](REVIEWERS.md).

## Mobile (Firefox for Android)

HivePulse runs on **Firefox for Android** — install it from the Firefox Add-ons link above. Reading features work fully: feeds, portfolio view, notifications, the RC/VP overlay and the **Post Analyzer** (no login required to score a post).

> **Signing is desktop-only for now.** Wallet actions rely on the Hive Keychain *browser extension*, which doesn't exist on mobile browsers (Keychain Mobile is a separate app with its own in-app browser). Chrome and Safari don't support extensions on mobile at all.

## Privacy & Security

*   **No Keys Stored:** HivePulse uses Hive Keychain for authentication. Your private keys never touch this application.
*   **No Tracking:** No analytics and no user data is collected or sent to us. Settings are stored locally in `chrome.storage.local`.
*   **Direct Connection:** Chat messages go directly to Ecency APIs; RPC calls go directly to Hive nodes.
*   **Scam lists are local:** the bundled anti-scam account list ([`utils/scamLists.ts`](utils/scamLists.ts)) is public community data, checked entirely on your device — recipient addresses are never sent anywhere.

---
*Stay connected. Stay charged. Keep your finger on the Pulse.*
