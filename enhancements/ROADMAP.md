# HivePulse Development Roadmap

**Current Version:** 1.5.0  
**Target Horizon:** 12 months (v1.5.0 → v2.0.0)  
**Updated:** May 2026

---

## 📍 Roadmap Overview

This roadmap prioritizes features by **business impact**, **technical feasibility**, and **user cohort timeline**. We recommend a **phased approach** with releases every 4-6 weeks.

### Release Strategy
- **Phase 1 (v1.5.0):** Power User Essentials + Outsider Onboarding
- **Phase 2 (v1.6.0):** Power User Advanced + Outsider Discovery
- **Phase 3 (v1.7.0):** Monetization & Community Features
- **Phase 4 (v2.0.0):** Premium Features & Advanced Analytics

---

## ✅ Phase 1: Foundations (Weeks 1-10) → **v1.5.0 — SHIPPED**

### Sprint 1 (Weeks 1-3): Outsider Onboarding Foundation ✅ COMPLETE
**Goal:** Lower barrier to entry for new users; make "first 5 minutes" frictionless.

#### Features Delivered:
1. **Portfolio Value Display (USD)** ✅ Done — `PortfolioCard` component with live HIVE/HBD/HE token prices, full USD breakdown
2. **"What is Hive?" Onboarding Tooltips** ✅ Done — `Tooltip` + `OnboardingBanner` components, glossary for VP/RC/HBD/etc., first-run detection
3. **Hive Earning Explainer Module** ✅ Done — `EarningExplainer` 4-card component (Content / Curation / Saving / Governance)

**Sprint 1 Result:** Outsiders can understand HivePulse and Hive in under 2 minutes.

---

### Sprint 2 (Weeks 4-7): Power User Essentials ✅ COMPLETE (partial on HBD)
**Goal:** Make HivePulse indispensable for active Hive users.

#### Features Delivered:
1. **Multi-Account Switcher** ✅ Done — `AccountSwitcherDropdown`, `AddAccountModal`, Keychain account query, per-account settings, full data reload on switch

2. **HBD Savings Dashboard** ⚠️ Partial — `HbdSavingsWidget` in `PortfolioCard` shows savings balance + APR calculator + projected earnings; live APR fetched from chain. Still missing:
   - "Claim Interest" transaction button
   - 30-day history chart

**Sprint 2 Result:** Multi-account switching fully shipped. HBD display/APR done; claim interaction still needed.

---

### Sprint 3 (Weeks 8-10): Launch Preparation ✅ COMPLETE
**Goal:** Polish, testing, and soft launch.

**Sprint 3 Result:** v1.5.0 released.

**Release Criteria (achieved):**
- [x] Core features tested
- [x] Version bumped to 1.5.0
- [ ] Accessibility score ≥ 90 (Lighthouse) — not audited
- [ ] Security scan passes (Snyk, Dependabot) — not confirmed

---

## 🔄 Phase 2: Power User Advanced + Outsider Discovery (Weeks 11-20) → **v1.6.0 — IN PROGRESS**

### Sprint 4 (Weeks 11-14): Notifications & Finance ⚠️ Partial
**Goal:** Unify notifications; make Hive a real hub (not scattered).

#### Features Status:
1. **Unified Notification Hub** ⚠️ Partial
   - ✅ `NotificationList` + `NotificationItem` components with filter tabs (Social / Finance / Governance / Engagement)
   - Still needed:
     - Background service: poll Hive blockchain every 5 minutes
     - Deep-linking to correct frontend per notification type
     - Red badge on extension icon for unread count
     - "Mark as read" persistence
     - No-duplicate deduplication logic

2. **Rewards Claim Aggregator** ✅ Done
   - "Claim All Rewards" button in `PortfolioCard` via `claim_reward_balance` transaction through Keychain

**Sprint 4 Status:** Rewards claim shipped. Notification Hub UI shell done; blockchain polling + badge + deep-links still needed.

---

### Sprint 5 (Weeks 15-18): Outsider Friction Reduction ⚠️ Partial
**Goal:** Make Hive feel "safe and easy" for newcomers.

#### Features Status:
1. **Quick Wallet (Send/Receive)** ✅ Done
   - `WalletView` + `SendForm` with recipient validation, token dropdown, memo, paginated transfer history via Keychain

2. **Energy Cost Estimator** ❌ Pending
   - Content script injection to estimate RC cost before posting — not started

**Sprint 5 Status:** Quick Wallet shipped. Energy Cost Estimator remains for v1.6.

---

### Sprint 6: Quality & Polish
**Goal:** Stabilize v1.6.0 for production.

#### Remaining to complete v1.6:
- Complete Unified Notification Hub (blockchain polling, badge, deep-links)
- Implement Energy Cost Estimator
- Complete HBD Savings "Claim Interest" button (carryover from Phase 1)
- End-to-end testing + performance profiling

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
| **Phase 1** | v1.5.0 | 1-10 | Foundations (Onboarding + Multi-account) | ✅ Shipped |
| **Phase 2** | v1.6.0 | 11-20 | Power Users + Outsider Discovery | 🔄 In Progress |
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
