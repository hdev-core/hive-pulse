# HivePulse

**The heartbeat of your Hive experience.**

HivePulse (formerly HiveKit) is a Chrome Extension that transforms your browser into a powerful dashboard for the Hive Blockchain. It combines real-time communication, vital account statistics, and seamless interoperability into one sleek overlay.

## Key Capabilities

### 1. The Pulse (Stats & Health)
*   **Vital Signs:** Monitor your **Voting Power (VP)** and **Resource Credits (RC)** in real-time.
*   **Smart Badge:** The extension icon changes color (Green/Orange/Red) based on your energy levels, or shows a counter when you have unread messages.
*   **Auto-Sync:** Simply log in to chat, and HivePulse automatically tracks stats for that user.

### 2. The Signal (Ecency Chat)
*   **Full-Featured Messenger:** Access your Ecency DMs and Community Channels from any tab.
*   **Real-Time:** Receive notifications immediately when someone messages you.
*   **Secure:** Log in via **Hive Keychain** (client-side signing). No password entry required.
*   **Manage:** Edit and delete messages directly from the extension.

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

## Privacy & Security

*   **No Keys Stored:** HivePulse uses Hive Keychain for authentication. Your private keys never touch this application.
*   **Direct Connection:** Chat messages go directly to Ecency APIs; RPC calls go directly to Hive nodes.

---
*Stay connected. Stay charged. Keep your finger on the Pulse.*