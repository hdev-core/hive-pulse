# HivePulse Feature Suggestions

This document outlines proposed enhancements to HivePulse, segmented by user cohort and implementation complexity.

---

## For Hive Community Members (Power Users)

### 1. Unified Notification Hub ⭐⭐⭐ HIGH PRIORITY
**Problem:** Users must check multiple frontends (PeakD, Ecency, InLeo) separately to catch replies, transfers, and account events.

**Solution:** Centralized notification feed in the extension that aggregates:
- **Social:** Mentions, replies, comments, follows
- **Finance:** Incoming transfers, HBD interest claims, rewards claimed
- **Governance:** Witness vote expiry warnings, proposal updates
- **Engagement:** Upvotes on your content, reblogs

**UX Flow:**
- Red badge on extension icon shows unread count
- Clicking notification deep-links to relevant frontend (e.g., reply → PeakD, transfer → wallet)
- Filter by type (Social/Finance/Governance/Engagement)
- Mark as read/snooze options

**Technical Requirements:**
- Poll Hive blockchain for account notifications
- Aggregate Ecency notifications
- Deep-link routing to correct frontend

**Estimated Effort:** HIGH (3-4 weeks)

---

### 2. HBD Savings Dashboard ⭐⭐⭐ HIGH PRIORITY
**Problem:** Hive's 20% APR on HBD savings is a killer feature but hidden. Users forget to claim interest or move HBD to savings.

**Solution:** Finance widget showing:
- **Liquid HBD** balance
- **Savings HBD** balance (with earned interest)
- **Claim Interest** button (auto-detects if > $0.01 owed)
- **APR Calculator:** "At $X balance, you'll earn $Y per month"
- **Historical Interest Earned:** Graph showing compound growth over time

**UX Flow:**
1. User opens extension, sees "HBD Widget" card
2. Sees breakdown: "$500 liquid | $1000 savings (earning 20% APR)"
3. Clicks "Claim Interest" → transaction is submitted via Keychain
4. Views projected earnings: "Next month: +$17.50"

**Technical Requirements:**
- Fetch account balances (savings_balance from blockchain)
- Calculate earned but unclaimed interest
- Build transaction for interest claim

**Estimated Effort:** MEDIUM (2 weeks)

---

### 3. Rewards Claim Aggregator ⭐⭐ MEDIUM PRIORITY
**Problem:** Users have pending rewards scattered across posts/curation over 7 days. They must manually visit each frontend to claim.

**Solution:** One-click "Claim All Rewards" button that:
- Detects all pending rewards from user's posts/curation
- Aggregates total pending HIVE + HBD
- Submits single transaction (if possible) or batch

**UX Flow:**
1. Extension shows "Pending Rewards: 2.5 HIVE + 0.8 HBD"
2. User clicks "Claim All"
3. Keychain prompts once; transaction submitted
4. Badge updates automatically

**Technical Requirements:**
- Parse user's post history for pending rewards
- Calculate total claimable amounts
- Build claim transaction

**Estimated Effort:** MEDIUM (2 weeks)

---

### 4. Multi-Account Switcher ⭐⭐⭐ HIGH PRIORITY
**Problem:** Power users (bot farm operators, curation trail managers) must log out and back in to switch accounts. Extremely tedious.

**Solution:** Quick account switcher dropdown showing:
- List of logged-in accounts (from Keychain)
- One-click to switch
- Persist settings per account (preferred frontend, notification interval, etc.)

**UX Flow:**
1. User clicks username in extension header
2. Dropdown shows: "account1 | account2 | account3 | + Add Account"
3. Clicks "account2" → entire extension reloads stats/chat for account2
4. Settings automatically switch to account2's preferences

**Technical Requirements:**
- Fetch available Keychain accounts
- Store account-specific settings
- Reload all data on account switch

**Estimated Effort:** MEDIUM (2 weeks)

---

### 5. Witness Voting Dashboard ⭐⭐ MEDIUM PRIORITY
**Problem:** Witness voting is scattered across frontends and most users can't find it easily. No visibility into vote expiry or witness performance.

**Solution:** Dedicated card/view showing:
- List of accounts you're voting for (up to 30 witnesses)
- Witness name + current rank
- Your vote weight contribution
- Vote expiry date (voting expires after 30 days of inactivity)
- Quick "Revoke Vote" button

**UX Flow:**
1. User sees "Witness Votes" card
2. Shows: "voting_manabar witness_list" with icons
3. Hovers over witness → shows rank, version, missed blocks
4. Clicks "Revoke" → Keychain confirms, vote removed

**Technical Requirements:**
- Fetch user's witness votes from blockchain
- Parse witness metadata (rank, performance)
- Build revoke transaction

**Estimated Effort:** MEDIUM (2 weeks)

---

### 6. RC Burn Predictive Warnings ⭐ LOW PRIORITY
**Problem:** Users run out of RC unexpectedly and can't transact.

**Solution:** Predictive alert system:
- Track user's RC burn rate (comments/posts per hour)
- Alert: "At your current posting rate, RC depletes in 3 hours"
- Suggest: "Pause posting, or use alt account"

**UX Flow:**
1. If RC < 50% and burn rate is high, show orange banner
2. Banner shows: "⚠ RC depletes in ~2 hours"
3. User dismisses or pauses activity

**Technical Requirements:**
- Log RC % over time (background service)
- Calculate burn rate trend
- Show predictive alert

**Estimated Effort:** LOW (1 week)

---

### 7. Custom Notification Sounds ⭐ LOW PRIORITY
**Problem:** Users want distinct audio cues for different notifications (reply vs. transfer).

**Solution:** Notification sound settings:
- Different sound per notification type
- Volume slider
- Test button

**UX Flow:**
1. Settings → Notifications section
2. "Sound on reply" (dropdown: chime/ding/none)
3. "Sound on transfer" (dropdown: alert/none)
4. Test button plays sample

**Technical Requirements:**
- Store sound preferences
- Use Chrome notifications API with audio

**Estimated Effort:** LOW (1 week)

---

## For Outsiders (Blockchain-Curious Newcomers)

### 1. "What is Hive?" Onboarding Tooltips ⭐⭐⭐ HIGH PRIORITY
**Problem:** First-time users see "VP", "RC", "HBD" with zero context.

**Solution:** Contextual tooltips on first launch:
- Hover over "VP" → "Voting Power: Your influence to earn rewards. Recovers daily."
- Hover over "RC" → "Resource Credits: Needed to post/comment. Recovers over 5 days."
- Hover over "HBD" → "Hive Backed Dollar: Stablecoin pegged to $1 USD."
- Optional: Guided tour (Step 1/3, Step 2/3, etc.)

**UX Flow:**
1. First-time user opens extension
2. Sees banner: "Welcome! Hover for quick tips."
3. Hovers over stat → tooltip appears
4. After 3 tips, banner disappears (remembers localStorage)

**Technical Requirements:**
- Add tooltip component
- Store "onboarded" flag
- Write glossary content

**Estimated Effort:** LOW (1 week)

---

### 2. Portfolio Value Display in USD ⭐⭐⭐ HIGH PRIORITY
**Problem:** Outsiders care about fiat value ("How much is my account worth?"), not token abstractions.

**Solution:** Prominent USD card showing:
- **Total Account Value:** $X USD
- **Breakdown:** "$Y HIVE + $Z HBD + $W PowerUP + $V NFTs"
- Real-time price updates

**UX Flow:**
1. Main dashboard shows large card: "Account Value: $1,234.56"
2. Click card → expands to show breakdown
3. Prices update every 60 seconds

**Technical Requirements:**
- Fetch live HIVE/HBD prices (already done in `fetchHivePrice`)
- Calculate account value (assets × prices)
- Format USD display

**Estimated Effort:** LOW (1 week)

---

### 3. Hive Earning Explainer Module ⭐⭐ MEDIUM PRIORITY
**Problem:** Outsiders don't understand how Hive rewards work.

**Solution:** Interactive explainer showing:
- **Content Earning:** "Post content → 7-day payout window → Earn HIVE"
- **Curation (Voting):** "Upvote good content within 30 min → Earn 50% of reward pool"
- **Saving:** "Keep HBD in savings account → 20% APR"
- **Witness Voting:** "Vote for 30 witnesses → Help secure network"
- Visual timeline showing reward flow

**UX Flow:**
1. "How I Earn" button in extension
2. Shows 4 card deck (Content / Curation / Saving / Governance)
3. Each card has icon + 2-sentence explanation
4. Learn More → links to external guides

**Technical Requirements:**
- Static content cards
- Store "viewed" state to avoid repetition

**Estimated Effort:** LOW (1.5 weeks)

---

### 4. Quick Wallet (Send/Receive UI) ⭐⭐ MEDIUM PRIORITY
**Problem:** Users must leave extension and go to PeakD/Ecency to send HIVE/HBD. Friction point.

**Solution:** In-extension wallet UI:
- **Send Tab:** Input recipient, amount, memo; confirm via Keychain
- **Receive Tab:** Shows user's address + QR code (if applicable)
- **History Tab:** Recent transactions (last 10)

**UX Flow:**
1. New "Wallet" tab in extension (or section in Stats view)
2. User enters: "Recipient: alice | Amount: 10 | Token: HIVE"
3. Clicks Send → Keychain prompts → transaction submitted
4. Toast: "Sent 10 HIVE to alice"

**Technical Requirements:**
- Build transfer form component
- Validate recipient, amount, token
- Submit via Keychain
- Fetch transaction history

**Estimated Effort:** MEDIUM (2.5 weeks)

---

### 5. DApp Discovery Hub ⭐⭐ MEDIUM PRIORITY
**Problem:** Newcomers have no idea "What can I do with HIVE?"

**Solution:** Gallery view showing:
- **Games:** Splinterlands, Rising Star
- **DeFi:** HBD savings, Hive-Engine tokens
- **Social:** DTube, Ecency
- **Tools:** HiveScan, DexTools
- Each item: icon + name + 1-line description + "Launch" button

**UX Flow:**
1. "Explore Apps" button in AppsView (or new tab)
2. Grid of 8-12 major DApps (categorized)
3. Click "Launch" → Opens in new tab
4. Users can favorite apps

**Technical Requirements:**
- Maintain DApp registry (name, URL, category, logo)
- Build gallery component
- Store favorites in localStorage

**Estimated Effort:** MEDIUM (2 weeks)

---

### 6. Energy Cost Estimator ⭐⭐ MEDIUM PRIORITY
**Problem:** Newcomers don't know if they have enough RC to post/comment.

**Solution:** RC cost preview:
- On any Hive frontend, content editor shows: "This comment costs ~50 RC (you have 75% available)"
- Green/orange/red indicator based on sufficiency
- Content script injects cost estimate

**UX Flow:**
1. User navigates to PeakD and opens comment box
2. Content script detects comment box
3. Extension injects banner: "RC Cost: 50 | Your RC: 75% | ✅ OK to post"
4. User posts with confidence

**Technical Requirements:**
- Content script to inject UI
- Estimate RC cost based on content length
- Real-time RC polling

**Estimated Effort:** MEDIUM (2 weeks)

---

### 7. Referral/Share System ⭐ LOW PRIORITY
**Problem:** Outsiders are hesitant without social proof. No easy way to invite friends.

**Solution:** Share feature:
- Generate referral link: "hive-pulse.app/ref/myusername"
- "Invite a Friend" button → copies link
- Button shows "You've referred X people" (tracks clicks)
- Friend signs up → both get bonus (if applicable)

**UX Flow:**
1. Settings → "Invite Friends" section
2. Shows: "Your referral link: [copy]"
3. "You've referred 3 people"
4. Share button → copies to clipboard

**Technical Requirements:**
- Generate referral links
- Track referral clicks (optional: Firebase/backend)
- Display referral count

**Estimated Effort:** LOW (1 week)

---

### 8. Performance Metrics & Trending ⭐⭐ MEDIUM PRIORITY
**Problem:** Newcomers don't know where to start (what to read, who to follow, what's trending).

**Solution:** Trending dashboard showing:
- **Trending Posts:** Top 10 posts by engagement (last 24h)
- **Trending Tags:** Top 20 tags by post volume
- **Top Earners:** Highest earning creators (last week)
- **Most Followed:** Most followed accounts

**UX Flow:**
1. New "Trending" view in extension
2. Shows 4 cards with leaderboards
3. Click item → deep-link to content on preferred frontend
4. Auto-refreshes every 60 minutes

**Technical Requirements:**
- Poll Hive blockchain for trending data
- Cache results
- Format leaderboards

**Estimated Effort:** HIGH (3 weeks)

---

## Summary Table

| Feature | Cohort | Priority | Effort | Impact |
|---------|--------|----------|--------|--------|
| Unified Notification Hub | Power Users | ⭐⭐⭐ HIGH | 3-4 weeks | 🔥 Game-changer |
| HBD Savings Dashboard | Power Users | ⭐⭐⭐ HIGH | 2 weeks | 🔥 High engagement |
| Rewards Claim Aggregator | Power Users | ⭐⭐ MEDIUM | 2 weeks | 📈 QoL improvement |
| Multi-Account Switcher | Power Users | ⭐⭐⭐ HIGH | 2 weeks | 🔥 Heavy use case |
| Witness Voting Dashboard | Power Users | ⭐⭐ MEDIUM | 2 weeks | 📈 QoL improvement |
| RC Burn Warnings | Power Users | ⭐ LOW | 1 week | 💡 Niche feature |
| Custom Notification Sounds | Power Users | ⭐ LOW | 1 week | 💡 Polish |
| Onboarding Tooltips | Outsiders | ⭐⭐⭐ HIGH | 1 week | 🔥 Adoption driver |
| Portfolio Value (USD) | Outsiders | ⭐⭐⭐ HIGH | 1 week | 🔥 Immediate clarity |
| Earning Explainer | Outsiders | ⭐⭐ MEDIUM | 1.5 weeks | 📈 Education |
| Quick Wallet | Outsiders | ⭐⭐ MEDIUM | 2.5 weeks | 📈 Friction reduction |
| DApp Discovery Hub | Outsiders | ⭐⭐ MEDIUM | 2 weeks | 📈 Exploration |
| Energy Cost Estimator | Outsiders | ⭐⭐ MEDIUM | 2 weeks | 📈 Confidence builder |
| Referral/Share System | Outsiders | ⭐ LOW | 1 week | 💡 Growth loop |
| Performance Metrics | Outsiders | ⭐⭐ MEDIUM | 3 weeks | 📈 Discovery |

---

## Implementation Notes

- **Technical Stack:** All features use existing dependencies (React, Tailwind, Lucide icons)
- **No New Dependencies Needed** (unless performance metrics requires external data source)
- **Backward Compatible:** All features are additive; no breaking changes to existing functionality
- **Progressive Rollout:** Features can be released independently or in themed batches (e.g., "Power User Sprint", "Onboarding Sprint")
