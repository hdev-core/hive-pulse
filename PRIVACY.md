# Privacy Policy for HivePulse

**Last updated: September 5, 2026**

HivePulse is a browser extension for the Hive blockchain, available for Chrome, Edge, Brave and Firefox. It runs entirely on your own machine. There is no HivePulse server, no account to create, and no analytics, tracking or advertising of any kind.

This policy describes what the extension reads, what it stores, and what it sends over the network — including the parts that are unavoidable in a blockchain client, where the data you look up is public by design.

## What stays on your machine

Everything the extension stores is kept locally with the `chrome.storage` API and never uploaded to us:

* **Your Hive username**, so it can load your account and keep you signed in to chat.
* **Your settings** — chosen frontends, RPC nodes, notification preferences, custom frontends.
* **Chat session tokens** for the Ecency chat feature.

**Your private keys are never read, requested or stored.** HivePulse cannot sign anything by itself. Every transaction is handed to [Hive Keychain](https://hive-keychain.com), which holds your keys and asks for your approval.

## What the extension reads

* **The URL of your active tab.** This drives the frontend switcher, the post analyzer and the optional auto-redirect. To do that, the extension is notified whenever a tab navigates — not only when you click the extension icon — and the side panel watches the active tab for as long as it is open. **These URLs are never stored and never transmitted.** They are read in memory to work out which Hive page you are on.
* **Your draft post, while you are writing it.** On supported posting pages the post analyzer reads your title, body, tags and images to score them for SEO and readability. **This happens entirely in the page. No part of your draft is ever sent anywhere** — the analyzer's only network request asks a public Hive node for the current list of trending topics, and sends nothing but `{ limit: 25 }`. The analyzer can be switched off in Settings.

## What is sent over the network, and to whom

HivePulse talks to public Hive infrastructure and a small number of third-party services. It sends no personal data beyond what is described here, and everything it looks up on Hive is already public on the blockchain.

| Service | What is sent | Why |
|---|---|---|
| Hive RPC nodes (`api.hive.blog`, `api.openhive.network` and other nodes you select) | Your Hive username, and the accounts, posts and tags you view | Load your account, notifications, market activity and feeds |
| Hive-Engine RPC nodes | Your Hive username | Load your Hive-Engine token balances |
| `ecency.com` | Your chat messages and session cookie | The Ecency chat feature, if you use it |
| `hivescan.info` | Your Hive username | Recommended-posts feed, balance history and resource-credit stats |
| `api.coingecko.com` | Nothing identifying — a fixed price query | The HIVE/USD price shown in the header |
| `images.hive.blog`, `images.ecency.com`, `ipfs.io` | Image URLs found in posts | Displaying post images and avatars |

You choose which Hive and Hive-Engine nodes to use in Settings, and you can add your own.

Requests to these services carry your IP address, as any web request does. HivePulse adds no identifier of its own to them.

## Cookies

The extension reads the `mm_pat` cookie for `ecency.com`. It is used only to authenticate the Ecency chat feature on your behalf, and is not used for tracking.

## What we never do

* We do not collect, store or transmit your data to any server operated by us — there is none.
* We do not use analytics, telemetry, advertising or any tracking service.
* We do not sell or share your information with anyone.
* We do not read your private keys, and we cannot broadcast a transaction without Keychain asking you first.

## Permissions

Each permission the extension requests maps to a feature above: `tabs` and `activeTab` for detecting the Hive page you are on, `storage` for your settings, `notifications` and `alarms` for Hive notifications, `cookies` for Ecency chat, `scripting` for talking to Hive Keychain, `sidePanel` for the side panel, and host permissions for the Hive frontends and RPC nodes listed above.

## Changes

Material changes to this policy will be reflected here and in the extension's release notes, with the date above updated.

## Contact

Questions or corrections: open an issue at [github.com/hdev-core/hive-pulse](https://github.com/hdev-core/hive-pulse).
