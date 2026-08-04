# HivePulse - Gemini CLI Context

HivePulse is a high-performance Chrome Extension (Manifest V3) designed as a "Heads-up Display" (HUD) for the Hive Blockchain. It aggregates real-time account health, social interactions via Ecency Chat, and a context-aware frontend switcher.

## Project Overview

- **Type:** Chrome Extension (Manifest V3)
- **Framework:** React 18 (TypeScript)
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **Authentication:** Hive Keychain (Client-side signing; no private keys stored locally)

## Core Architecture & Features

### 1. The Pulse (Health & Stats)
- **Monitoring:** Tracks Voting Power (VP) and Resource Credits (RC) in real-time using Hive RPC nodes.
- **Dynamic Badge:** Updates the extension icon badge color and text based on VP/RC levels or unread message counts.
- **Logic:** Handled in `utils/hiveHelpers.ts` (data fetching) and `background.ts` (background polling/badge management).

### 2. The Signal (Ecency Chat)
- **Integration:** Full-featured messenger for Ecency DMs and Community Channels.
- **Security:** Uses `hive_keychain.requestSignBuffer` to generate a secure login token for Mattermost-based chat services.
- **Logic:** Implementation details in `utils/ecencyHelpers.ts` and `utils/ecencyLogin.ts`.

### 3. The Nexus (Frontend Switcher)
- **Context Awareness:** Detects the current author, permlink, or profile on any Hive frontend and allows instant redirection to the same content on another interface (e.g., PeakD to InLeo).
- **Configuration:** Supported frontends and path mapping defined in `constants.ts` and `utils/urlHelpers.ts`.

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- Hive Keychain browser extension installed

### Commands
- **Install Dependencies:** `npm install`
- **Development:** `npm run dev` (Starts Vite dev server - useful for UI work, but requires manual reload in Chrome for extension-specific APIs).
- **Production Build:** `npm run build`
- **Installation:**
  1. Open `chrome://extensions`
  2. Enable **Developer Mode**.
  3. Click **Load unpacked** and select the `dist/` folder.

## Project Structure

- `manifest.json`: Extension configuration (permissions: `storage`, `tabs`, `sidePanel`, `notifications`).
- `background.ts`: Service worker for background monitoring, alarms, and badge updates.
- `content.ts`: Content script for URL detection across tabs.
- `App.tsx`: Main entry point for the extension UI (Popup and Sidepanel).
- `components/`:
  - `views/`: Functional tabs (Switcher, Chat, Stats, Apps, Settings).
  - `Header.tsx` & `BottomNav.tsx`: Global navigation and health bars.
- `utils/`:
  - `hiveHelpers.ts`: RPC communication with `api.hive.blog`.
  - `ecencyHelpers.ts`: Mattermost/Ecency chat API wrapper.
  - `urlHelpers.ts`: Regex-based parsing of Hive URLs.
- `types.ts`: Central TypeScript interfaces and enums.

## Development Conventions

- **State Management:** Uses React `useState` and `useEffect` with data persistence via `chrome.storage.local`.
- **Security:** Never store private keys. Always use `window.hive_keychain` for signing operations.
- **Styling:** Strict adherence to Tailwind CSS utility classes. Custom scrollbars and transitions defined in `index.css`.
- **Asset Management:** A custom Vite plugin in `vite.config.ts` handles the copying of `manifest.json`, `logos/`, and icons to the `dist/` folder during build.
- **Side Panel:** The app is designed to be fully functional in both the popup and the Chrome side panel.
