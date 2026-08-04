# Product Requirements Document: HivePulse Extension Enhancements

## 1. Competitive Analysis & Market Benchmark
**The Landscape:** Currently, Hive users rely heavily on **Hive Keychain** (Extension) for security/signing and web-based frontends (PeakD, Ecency, InLeo) for interaction.

*   **Hive Keychain (The Standard):**
    *   *Strengths:* Secure key management, simple transfers, browser integration for signing.
    *   *Gaps:* It is utilitarian. It lacks "social aliveness." It doesn't aggregate notifications well, show detailed dApp stats, or offer content discovery. It is a key, not a dashboard.
*   **Phantom / MetaMask (Industry Standard):**
    *   Modern wallets are moving towards "Portfolio Dashboards." They show NFT galleries, detailed token breakdowns, and transaction history in a readable format.
*   **The HivePulse Opportunity:**
    *   HivePulse shouldn't try to replace Keychain as the *signer* (unless you plan to audit complex security). Instead, it should be the **"Heads-up Display" (HUD)** for the Hive ecosystem—filling the gap between the raw blockchain data and the user's active browsing session.

## 2. Feature Deep-Dive & Enhancements
Based on the file structure (`StatsView`, `AppsView`, `ChatView`), you have a solid foundation. Here are 3 specific enhancements to make it "Enterprise Ready":

### A. The "Mana & Resource" Health Bar (Must-Have)
*   **Logic:** Hive users are obsessed with Voting Power (VP) and Resource Credits (RC). Running out of RC stops them from transacting.
*   **Improvement:** Instead of burying this in `StatsView`, place a **Global Sticky Header** visible on every view.
    *   *Visual:* Two thin progress bars (Blue for VP, Green for RC) right under the username in the header.
    *   *Interaction:* Hovering shows exact percentage and "Time to 100%."

### B. Unified "Pulse" Notification Center (Must-Have)
*   **Logic:** Users currently have to check PeakD, then Hive.blog, then InLeo to see interactions.
*   **Improvement:** A centralized feed in the extension that aggregates:
    *   Mentions & Replies (Social).
    *   Wallet Transfers (Finance).
    *   Witness Vote expiry warnings (Governance).
    *   *Action:* Clicking a notification deep-links directly to the relevant frontend (e.g., clicking a Splinterlands transfer opens Splinterlands, a reply opens PeakD).

### C. HBD Savings & APR Compounder (Nice-to-Have / differentiated)
*   **Logic:** Hive's 20% APR on HBD is a killer feature, but users often forget to claim interest or move HBD to savings.
*   **Improvement:** A "Finance" widget that:
    *   Shows separate Liquid HBD vs. Savings HBD.
    *   Includes a "Claim Interest" button if the unpaid interest > $0.01.
    *   Projected Monthly Earnings calculator based on current balance.

## 3. UX Direction & Wireframe Description

**Design Philosophy:** "Information at a Glance, Action in a Click."

**Proposed User Flow (Daily Check-in):**
1.  **Trigger:** User clicks extension icon.
2.  **State 1 (Dashboard/Home):** User immediately sees their "Health" (VP/RC) and a "Red Dot" notification count.
3.  **Action:** User clicks the "Claim Rewards" button (aggregated from all posts/curation).
4.  **Navigation:** User taps "Apps" tab to launch a game or "Chat" to check Discord/Sting messages.

**Wireframe Layout Description:**

*   **Global Header (Fixed Top):**
    *   *Left:* Logo (`hivepulse_logo_small.png`) + Current User Avatar.
    *   *Center:* **$HIVE Price** (Live ticker) & **$HBD Price**.
    *   *Right:* Network Indicator (Green dot) + Settings Gear.
    *   *Sub-Header:* The **VP/RC Progress Bars** spanning full width.

*   **Main Content Area (Scrollable):**
    *   **Section 1: The Pulse (Notifications):** The last 3 interactions (Reply/Transfer). Item layout: `[Icon] [User] [Action Summary] [Time]`.
    *   **Section 2: Quick Stats (Cards):**
        *   *Card A:* Account Value (USD).
        *   *Card B:* Pending Rewards (Coming in 7 days).
    *   **Section 3: DApp Launcher (Grid):** A 4x2 grid of the logos found in your `logos/` folder (Ecency, PeakD, Splinterlands). These should be customizable bookmarks.

*   **Global Bottom Navigation (Fixed Bottom):**
    *   Using your existing `BottomNav.tsx`:
    *   `[Dashboard (Home)]` `[Wallet/Stats]` `[Chat]` `[Switcher]`
    *   *Recommendation:* Add a prominent "Floating Action Button" (FAB) style or highlight for the **Switcher** if users manage multiple accounts (bot farms, curation trails), as this is a heavy use case on Hive.
