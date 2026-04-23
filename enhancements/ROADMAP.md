# HivePulse Development Roadmap

**Current Version:** 1.4.0  
**Target Horizon:** 12 months (v1.5.0 → v2.0.0)  
**Updated:** April 2026

---

## 📍 Roadmap Overview

This roadmap prioritizes features by **business impact**, **technical feasibility**, and **user cohort timeline**. We recommend a **phased approach** with releases every 4-6 weeks.

### Release Strategy
- **Phase 1 (v1.5.0):** Power User Essentials + Outsider Onboarding
- **Phase 2 (v1.6.0):** Power User Advanced + Outsider Discovery
- **Phase 3 (v1.7.0):** Monetization & Community Features
- **Phase 4 (v2.0.0):** Premium Features & Advanced Analytics

---

## 🚀 Phase 1: Foundations (Weeks 1-10) → **v1.5.0**

### Sprint 1 (Weeks 1-3): Outsider Onboarding Foundation
**Goal:** Lower barrier to entry for new users; make "first 5 minutes" frictionless.

#### Features to Implement:
1. **Portfolio Value Display (USD)** ⭐⭐⭐
   - *Why First:* Quick win; outsiders immediately see account worth
   - *Task Breakdown:*
     - Add USD conversion to existing `fetchHivePrice()` 
     - Create `PortfolioCard` component
     - Format: "Total Account Value: $X"
   - *Effort:* 1 week
   - *Acceptance Criteria:*
     - USD value updates every 60 seconds
     - Shows breakdown on click (HIVE / HBD / PowerUP)
     - Mobile-responsive

2. **"What is Hive?" Onboarding Tooltips** ⭐⭐⭐
   - *Why First:* Dramatically improves UX comprehension for newcomers
   - *Task Breakdown:*
     - Create `Tooltip` component (reusable)
     - Write glossary (VP, RC, HBD, Voting Power, Resource Credits, etc.)
     - Add first-run detection (localStorage flag)
     - Integrate into Header and StatsView
   - *Effort:* 1.5 weeks
   - *Acceptance Criteria:*
     - Tooltips appear on first launch only
     - Covers 8+ key terms
     - Desktop + mobile optimized

3. **Hive Earning Explainer Module** ⭐⭐
   - *Why First:* Context for why HIVE matters; builds excitement
   - *Task Breakdown:*
     - Create 4-card explainer (Content / Curation / Saving / Governance)
     - Add "How I Earn" button to main dashboard
     - Static content (no API required initially)
     - Add illustrations (use Lucide icons)
   - *Effort:* 1 week
   - *Acceptance Criteria:*
     - Card deck displays horizontally
     - Each card has icon + title + description
     - "Learn More" link goes to external guide

**Sprint 1 Deliverable:** Outsiders can now understand what HivePulse is and how Hive works in under 2 minutes.

---

### Sprint 2 (Weeks 4-7): Power User Essentials
**Goal:** Make HivePulse indispensable for active Hive users.

#### Features to Implement:
1. **Multi-Account Switcher** ⭐⭐⭐
   - *Why Early:* Unblocks power users immediately; major QoL improvement
   - *Task Breakdown:*
     - Query Hive Keychain for available accounts
     - Add dropdown in Header component
     - Store account-specific settings (localStorage)
     - Reload all data on switch (stats, chat, etc.)
     - Persist last active account
   - *Effort:* 2 weeks
   - *Acceptance Criteria:*
     - Switching accounts takes <500ms
     - Settings migrate per account
     - Logout & re-login flow works seamlessly

2. **HBD Savings Dashboard** ⭐⭐⭐
   - *Why Early:* High engagement; drives stickiness (users check APR earnings)
   - *Task Breakdown:*
     - Extend `AccountStats` interface to include savings data
     - Create `HBDWidget` component
     - Show: Liquid HBD / Savings HBD / Earned Interest / APR Calculator
     - Add "Claim Interest" button (transaction via Keychain)
     - Build interest history chart (micro Chart.js or Recharts)
   - *Effort:* 2 weeks
   - *Acceptance Criteria:*
     - Displays savings balance + earned interest
     - "Claim Interest" button functional
     - APR calculator accurate
     - History chart shows last 30 days

**Sprint 2 Deliverable:** Power users can manage multiple accounts and passive income (HBD savings) directly from extension.

---

### Sprint 3 (Weeks 8-10): Launch Preparation
**Goal:** Polish, testing, and soft launch.

#### Tasks:
- QA testing (all 3 new features on Windows/Mac/Linux)
- Performance optimization (background service should not drain battery)
- Accessibility audit (a11y: keyboard nav, screen readers)
- Security review (no secrets logged, no XSS vectors)
- Write release notes & update README
- Beta testing with 20 power users + 20 newcomers
- Gather feedback & iterate

**Sprint 3 Deliverable:** v1.5.0 ready for production release.

**Release Criteria:**
- [ ] All features tested on Chrome 120+
- [ ] Zero critical bugs
- [ ] Accessibility score ≥ 90 (Lighthouse)
- [ ] Performance: <1s popup load time
- [ ] Security scan passes (Snyk, Dependabot)

---

## 📍 Phase 2: Power User Advanced + Outsider Discovery (Weeks 11-20) → **v1.6.0**

### Sprint 4 (Weeks 11-14): Notifications & Finance
**Goal:** Unify notifications; make Hive a real hub (not scattered).

#### Features to Implement:
1. **Unified Notification Hub** ⭐⭐⭐
   - *Why:* Highest-impact feature; users no longer need multiple frontends
   - *Task Breakdown:*
     - Design notification schema (type, timestamp, action_link, etc.)
     - Background service: poll Hive blockchain every 5 minutes for account events
     - Ecency API integration: fetch DM/channel activity
     - Build `NotificationCenter` view
     - Implement filtering (Social / Finance / Governance / Engagement)
     - Add deep-linking to correct frontend + post/wallet
     - Red badge shows unread count
   - *Effort:* 3-4 weeks
   - *Acceptance Criteria:*
     - Notifications appear within 5 minutes of event
     - Deep-links work to all 9 frontends
     - Filtering logic is fast (<200ms)
     - "Mark as read" persists in localStorage
     - No duplicate notifications

2. **Rewards Claim Aggregator** ⭐⭐
   - *Why:* Reduce friction; one-click to claim all pending rewards
   - *Task Breakdown:*
     - Parse user's post history for pending rewards
     - Aggregate total HIVE + HBD
     - Build claim transaction
     - Add "Claim All" button to StatsView
     - Show pending rewards before confirming
   - *Effort:* 2 weeks
   - *Acceptance Criteria:*
     - Accurate reward calculation (matches blockchain)
     - Transaction confirmation shows breakdown
     - Success toast on claim completion
     - Handle edge case: no pending rewards

**Sprint 4 Deliverable:** Power users have a single source of truth for all notifications and can claim rewards in 1 click.

---

### Sprint 5 (Weeks 15-18): Outsider Friction Reduction
**Goal:** Make Hive feel "safe and easy" for newcomers.

#### Features to Implement:
1. **Quick Wallet (Send/Receive)** ⭐⭐
   - *Why:* Lower friction for first transaction; builds confidence
   - *Task Breakdown:*
     - Create `Wallet` view/tab
     - Build Send form: recipient, amount, token dropdown, memo
     - Build Receive tab: shows address + QR code (if applicable)
     - Add transaction history (last 10 transfers)
     - Integrate Hive Keychain for signing
     - Validate recipient (check if account exists)
   - *Effort:* 2.5 weeks
   - *Acceptance Criteria:*
     - Send transaction completes in <3 seconds
     - Recipient validation is instant
     - History shows last 10 transfers with timestamps
     - Mobile-responsive form

2. **Energy Cost Estimator** ⭐⭐
   - *Why:* Prevents bad UX ("transaction failed: out of RC")
   - *Task Breakdown:*
     - Content script injection to detect comment boxes
     - Estimate RC cost based on content length (Hive docs formula)
     - Inject UI banner: "RC Cost: X | Available: Y% | Status: 🟢 OK"
     - Color coding: Green (OK) / Orange (Caution) / Red (Insufficient)
     - Auto-update as user types
   - *Effort:* 2 weeks
   - *Acceptance Criteria:*
     - Works on all 9 supported frontends
     - Cost estimate accurate within 10%
     - Injects banner in <200ms
     - No lag while typing (debounce input)

**Sprint 5 Deliverable:** Newcomers can send their first transfer and post content with confidence.

---

### Sprint 6 (Weeks 19-20): Quality & Polish
**Goal:** Stabilize v1.6.0 for production.

#### Tasks:
- End-to-end testing (all features + interactions)
- Performance profiling (background service, notification polling)
- Bug fixes & minor UX improvements
- Prepare release notes
- Beta testing: 50 users (diverse experience levels)

**Release Criteria:**
- [ ] All v1.6 features tested
- [ ] Zero blocking bugs
- [ ] Notification accuracy ≥ 95%
- [ ] Background service CPU usage <5%
- [ ] Security scan passes

---

## 📍 Phase 3: Community & Monetization (Weeks 21-32) → **v1.7.0**

### Sprint 7-8 (Weeks 21-28): Advanced Power User Features
**Goal:** Deepen engagement for active users.

#### Features to Implement:
1. **Witness Voting Dashboard** ⭐⭐
   - Fetch witness votes, display rank + performance
   - "Revoke Vote" button for each witness
   - *Effort:* 2 weeks

2. **Performance Metrics & Trending** ⭐⭐
   - Show trending posts, tags, top earners
   - Leaderboard UI (auto-refresh every 60 min)
   - *Effort:* 3 weeks

3. **RC Burn Predictive Warnings** ⭐
   - Track RC burn rate
   - Alert user if RC depletes in <2 hours
   - *Effort:* 1 week

---

### Sprint 9 (Weeks 29-32): Monetization Prep
**Goal:** Prepare for premium features.

#### Tasks:
- Implement feature flags (Unleash/LaunchDarkly) for A/B testing
- Add user telemetry (what features are used most)
- Design premium tier (e.g., "Advanced Notifications", "Multi-account limit lift")
- Integrate Stripe for payments
- Document premium feature gates

---

## 📍 Phase 4: Premium & Scale (Weeks 33-48) → **v2.0.0**

### Sprint 10-12: Premium Features
**Goal:** Monetize while keeping core features free.

#### Potential Premium Features:
1. **DApp Discovery Hub** (Free tier: 10 apps | Premium: 50+ curated apps)
2. **Custom Notification Sounds** (Free: 3 presets | Premium: unlimited)
3. **Referral/Share System** (Free: basic | Premium: referral rewards, affiliate links)
4. **Advanced Analytics** (Premium: account growth tracking, voting ROI calculator)
5. **API Access** (Premium: 3rd-party integrations)

---

## 🎯 Success Metrics & Milestones

### v1.5.0 Success Criteria (Week 10)
- ✅ 500+ new users (onboarded via tooltips)
- ✅ <2min average first-use time
- ✅ 50+ power users on multi-account switcher
- ✅ 4.5+ star rating (Chrome Web Store)

### v1.6.0 Success Criteria (Week 20)
- ✅ 2,000+ total users
- ✅ Notification Hub adoption ≥ 60% (of daily active users)
- ✅ Avg. session time ≥ 5 min (from 2 min in v1.5)
- ✅ Retention rate (30-day) ≥ 40%

### v1.7.0 Success Criteria (Week 32)
- ✅ 5,000+ total users
- ✅ 4.7+ star rating
- ✅ 3+ partnerships with Hive dApps (integrations)
- ✅ Community feedback: "Essential tool" sentiment ≥ 80%

### v2.0.0 Success Criteria (Week 48)
- ✅ 10,000+ total users
- ✅ Premium tier adoption ≥ 10% of DAU
- ✅ Revenue target: $X/month
- ✅ Featured on Hive ecosystem map

---

## 🛠 Technical Debt & Optimization Tasks

**Throughout all phases, allocate 20% of sprint capacity to:**
- [ ] Type safety improvements (reduce `any` types)
- [ ] Test coverage (aim for 70%+ unit test coverage)
- [ ] Performance optimization (lazy-load views, memoization)
- [ ] Documentation (inline comments, architecture diagrams)
- [ ] Dependency updates (keep React, Tailwind, Vite current)

---

## 📊 Resource Allocation

**Recommended team structure:**
- **1 Full-Stack Developer** (Features)
- **1 Frontend Developer** (UI/UX, Polish)
- **1 QA Engineer** (Testing, bug reports)
- **Product Manager** (0.5 FTE, roadmap + prioritization)

**Total capacity:** ~3.5 people → 140 dev-weeks across 48 weeks = 2.9 weeks/feature on average.

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Hive API rate limits (notifications) | 🔴 Blocking | Use caching layer; implement exponential backoff |
| Keychain integration complexity | 🟡 Medium | Thorough testing; fallback to manual signing |
| Performance degradation (background service) | 🔴 Blocking | Profile memory usage; use Web Workers if needed |
| Chrome Web Store review delays | 🟡 Medium | Submit 2 weeks before planned release |
| User confusion (too many features) | 🟡 Medium | Progressive disclosure; feature flags for beta testing |
| Low adoption of premium tier | 🟡 Medium | Start with free-to-premium transition (30-day trial) |

---

## 📅 Timeline Summary

| Phase | Version | Weeks | Focus | Status |
|-------|---------|-------|-------|--------|
| **Phase 1** | v1.5.0 | 1-10 | Foundations (Onboarding + Multi-account) | 🎯 UP NEXT |
| **Phase 2** | v1.6.0 | 11-20 | Power Users + Outsider Discovery | 📅 Planned |
| **Phase 3** | v1.7.0 | 21-32 | Community + Monetization Prep | 📅 Planned |
| **Phase 4** | v2.0.0 | 33-48 | Premium Features + Scale | 📅 Planned |

---

## 🎬 Next Steps

1. **Approve Roadmap** (stakeholder sign-off)
2. **Create Sprint 1 Issues** in GitHub (Portfolio Value, Tooltips, Earning Explainer)
3. **Kick-off Meeting** with dev team (design review, task breakdown)
4. **Week 1 Starts:** Portfolio Value implementation begins
5. **Bi-weekly Sync:** Progress updates, blockers, retrospectives

---

**Questions?** Reach out to Product team. Last updated: April 2026.
