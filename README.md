# HivePulse

**The heartbeat of your Hive experience.**

HivePulse (formerly HiveKit) is a browser extension (Chrome & Firefox) that transforms your browser into a powerful dashboard for the Hive Blockchain. It combines real-time communication, vital account statistics, and seamless interoperability into one sleek overlay.

## Get HivePulse

- **Chrome Web Store:** https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg
- **Firefox Add-ons (AMO):** https://addons.mozilla.org/en-US/firefox/addon/hivepulse/

> Maintainer note — manage/submit builds at:
> Chrome Web Store Developer Dashboard · Firefox AMO Developer Hub: https://addons.mozilla.org/en-US/developers/addon/hivepulse/

## Key Capabilities

### 1. The Pulse (Stats & Health)
*   **Vital Signs:** Monitor your **Voting Power (VP)** and **Resource Credits (RC)** in real-time.
*   **Smart Badge:** The extension icon changes color (Green/Orange/Red) based on your energy levels, or switches to a **Blue Counter** when you have unread messages.
*   **Auto-Sync:** Simply log in to chat, and HivePulse automatically tracks stats for that user.

### 2. The Signal (Ecency Chat)
*   **Full-Featured Messenger:** Access your Ecency DMs and Community Channels from any tab.
*   **Side Panel Mode:** Pin HivePulse to the browser's side panel to keep your chats and stats visible while you browse.
*   **Robust Unread Tracking:** Never miss a message. We use a dual-verification system (API counts + Timestamp comparison) to ensure the **Blue Dot** indicator is always accurate.
*   **Background Monitoring:** HivePulse actively checks for new messages even when the popup is closed, updating the extension badge. *(Note: Checks are performed periodically based on the interval configured in Settings).*
*   **Secure:** Log in via **Hive Keychain** (client-side signing). No password entry required.
*   **Manage:** Edit, delete, and react to messages directly from the extension.

### 3. The Nexus (Frontend Switcher)
*   **Context Aware:** Viewing a post on PeakD but want to read it on Ecency? Switch instantly. HivePulse detects the current author, permlink, or feed and redirects you to the exact same spot on the target interface.
*   **Supported Frontends:** PeakD, Ecency, Hive.blog, InLeo, Actifit, Waivio, Liketu, HiveScan.
*   **Action Modes:** Jump straight to the **Wallet** or **Post Editor** of your favorite frontend.

## Installation

1.  **Initialize:**
    ```bash
    npm install
    ```

2.  **Build:**
    ```bash
    npm run build
    ```

3.  **Load in Chrome:**
    *   Go to `chrome://extensions`
    *   Enable **Developer Mode**
    *   Click **Load unpacked** -> Select the `dist` folder.

## Firefox Development

The Firefox build outputs to `dist-firefox/` (using `manifest.firefox.json`, which adds the sidebar and Gecko settings).

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

> For upload-ready store packages (Chrome + Firefox zips), run `package.bat`.

## Privacy & Security

*   **No Keys Stored:** HivePulse uses Hive Keychain for authentication. Your private keys never touch this application.
*   **Direct Connection:** Chat messages go directly to Ecency APIs; RPC calls go directly to Hive nodes.

---
*Stay connected. Stay charged. Keep your finger on the Pulse.*
