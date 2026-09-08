# HivePulse — Viral Growth Feature Research
**Date:** 2026-06-08  
**Method:** Two independent research agents (crypto extension market + Hive ecosystem deep dive) running in parallel, cross-examined and synthesized.

---

## Research Scope

- What drove organic growth in successful crypto/Web3 browser extensions (MetaMask, Phantom, Rabby, DeBank, Honey)
- What Hive users actively discuss needing that no tool currently provides
- What features are physically impossible to replicate outside a browser extension
- What "shareable moment" mechanics cause word-of-mouth in crypto tools
- Hive ecosystem tooling gaps confirmed via community posts, forums, and existing tool landscape

---

## Key Findings

### What Makes Crypto Extensions Go Viral

Three proven mechanics from successful extensions:

1. **Status display** — DeBank (3.2M users) turned wallet addresses into social profiles. People share things that make them look smart or wealthy. Portfolio cards and wallet identity drove installs.
2. **Protection moments** — Rabby's pre-transaction simulation ("here's what you're actually signing") generated massive Twitter/X sharing: "This extension saved me from a hack." Protection stories spread fastest.
3. **Savings moments** — Honey's "We saved you $14!" popup is the gold standard. Delight at a specific moment, immediately shareable. Each share is a free install ad.

The common thread: **the product creates a moment the user immediately wants to tell someone about.**

### Hive-Specific Confirmed Pain Points

- **HBD savings APR (15–20%)** is Hive's best-kept secret. Multiple Hive.blog posts explicitly argue it should be the platform's primary marketing angle. No tool makes it shareable or comparable to external yields. Community members call it underexplored.
- **RC confusion is the #1 new user killer.** New accounts can't comment because they have no Resource Credits. Community members constantly try to explain this, but there's no consumer-friendly tool surfacing it in-browser.
- **Publish-time optimization doesn't exist.** No tool in the entire Hive ecosystem tells you when to post, which community to target, or what payout to expect — before you publish. All analytics are retrospective.
- **No persistent shareable identity card.** "Hive Recap/Wrapped" exists as an annual web tool. No in-extension, always-available shareable stats card exists for Twitter/X.
- **Supporter intelligence gap.** VoteView (basic web page) exists but has no cumulative value tracking, no "at-risk supporter" alerts, and no one-click reciprocation. Confirmed gap by community analytics posts.

### Hive Tooling Landscape (What Already Exists)

Existing tools confirmed by research — **do not duplicate these:**

| Tool | Covers |
|------|--------|
| hive.vote | Auto-vote trails, fanbase, mana floors |
| HiveEarnings (hiveearnings.botlord.eu) | Historical earnings analytics |
| HiveStats (hivestats.io) | Account stats, retrospective |
| VoteView (cryptocompany.ceo/voteview.php) | Basic vote relationships |
| DLease | Delegation marketplace |
| HiveVote | Post scheduling |
| Hive Recap (recap.hivecreators.co) | Annual "Wrapped" stats — web only |
| HiveTips | Basic HIVE tipping on external sites |

**HivePulse already covers:** notifications, wallet, RC/VP, trending, account switching, HBD savings dashboard, Ecency chat.

---

## Feature Candidates

### Ranked by: audience × virality × extension-exclusivity

---

### #1 — Smart Compose: Publish-Time Intelligence Panel
**Both agents converged on this as the deepest, stickiest innovation.**

**What it is:** When a user is drafting a post on PeakD, Ecency, or InLeo, the extension injects a collapsible intelligence panel showing:
- **Expected payout range** based on author's last 30 posts in this community
- **Optimal publish window** — heatmap of when curators with VP are active in this community (last 7 days by hour)
- **Community/tag intelligence** — as tags are typed, shows 7-day avg payout for that community + top active curators there right now
- **Beneficiary alert** — if no beneficiary set, surfaces communities that offer curation boosts (OCD, Ecency, curangel)
- **Post-publish card** — "Predicted $3–$8 · Check back in 7 days" with a share button

**Why this is the breakthrough:**
- Fires at the moment of maximum anxiety — right before publishing, when guidance has maximum value
- Every Hive blog post written with its help becomes content marketing for HivePulse — recursive loop on the platform itself
- Directly attacks the #1 Hive retention problem: new users earn $0.03 and leave; this gives them a fighting chance
- Creates a daily dependency: once you publish with it, you won't publish without it

**Extension-exclusive:** Yes, completely. Content script DOM injection into another domain's compose page is physically impossible from a website. This is the core moat.

**Implementation path:**
1. Content script targeting `peakd.com/publish*`, `ecency.com/*publish*`, `inleo.io/*submit*`
2. Inject collapsible floating panel alongside the editor
3. `condenser_api.get_discussions_by_created` → aggregate by hour-of-day for timing heatmap
4. `condenser_api.get_account_history` → author's payout curve baseline
5. MutationObserver on tag input → live community stats update
6. Existing `background.ts` polling and `hiveHelpers.ts` utilities give a 6–8 week head start vs any competitor

**Estimated build:** 3–4 weeks

---

### #2 — Hive Proof Card: One-Click Shareable Stats Card
**Agent 1's top pick. Fastest to ship. Best for outsider acquisition.**

**What it is:** A button in the Wallet tab that generates a branded image card:
> `@username · 119,077 HP · Earning 15% APR on HBD Savings · Powered by HivePulse`

Pre-fills a Twitter/X share intent. The headline number — HBD APR — is the hook for non-Hive users.

**Why it works:**
- Targets both insiders (status display) and outsiders (15% APR is genuinely shocking to DeFi users used to 3–5%)
- DeBank's portfolio sharing drove 3.2M users on the same mechanic
- Every share is an install ad with social proof
- Hive community already argues HBD APR is their best marketing story — this is the tool to execute it
- Data already exists in the wallet tab — no new infrastructure needed

**Extension-exclusive:** No — a website can replicate this. But speed-to-ship makes it valuable as Phase 1.

**Estimated build:** 2–3 days

---

### #3 — Supporter Intelligence Dashboard: Know Your True Fans

**What it is:** A dedicated view showing: who has voted your content most consistently, cumulative USD vote value per supporter over 30–90 days, which supporters you haven't voted back, and "at-risk" alerts when a regular voter goes quiet. One-click "reciprocate" action upvotes their latest post via Keychain (already wired in `keychainHelpers.ts`).

**Why it works:**
- Every content creator on Hive has the same emotional hook: "who are my real fans, am I losing them?"
- Shareable as a screenshot ("my top 10 supporters on Hive")
- Creates a recursive install loop: creator shares → their supporters see it → those supporters install to see their own supporter dashboards
- VoteView (the closest existing tool) is a bare-bones static web page with no alerts, no cumulative value, no reciprocation

**Extension-exclusive:** Partially. The one-click Keychain action from any page is extension-native; the dashboard itself could be a website.

**Estimated build:** 2–3 weeks

---

### #4 — Contextual Author Card on Any Website

**What it is:** When browsing any page that contains a Hive username or a link to a Hive frontend (PeakD, Ecency, etc.), the extension injects a floating sidebar showing that author's Hive profile: reputation, HP, recent posts, pending payouts, and a one-click "Tip with HIVE" button. Inspired by how Twemex surfaces Twitter author context inside Twitter.

**Why it works:**
- Hive content gets shared outside Hive (Twitter/X, Reddit, Medium cross-posts). This catches those moments.
- Authors would tell their audiences "install HivePulse to see my profile on any link I share"
- Creator evangelist mechanic — content creators drive installs through their own promotion

**Extension-exclusive:** Yes, completely. Cross-site DOM injection is the mechanism.

**Estimated build:** 2 weeks

---

### #5 — Delegation ROI Optimizer

**What it is:** Given your HP amount, calculates and ranks real APR from every major delegation destination — `@leo.voter`, `@curangel`, DLease market rates, self-curation baseline — updated live.

**Confirmed gap:** Community posts explicitly ask "do you know a good interface to track delegation earnings?" and the answer is no.

**Limitation:** A website can do this equally well. No extension-exclusive advantage.

**Estimated build:** 1 week

---

## Synthesis: Two-Phase Recommendation

The two strongest features are not competitors — they're a funnel:

```
Phase 1 (Days)    →    Phase 2 (Weeks)
Hive Proof Card        Smart Compose
  ↓                      ↓
Drives installs         Makes users stay
from outsiders          Can't publish without it
HBD APR story           Recursive Hive blog posts
Fast to ship            Permanent moat
```

**Phase 1 — Hive Proof Card** (2–3 days)
Turns every existing user into a distribution channel. The HBD APR headline attracts DeFi-native outsiders who've never heard of Hive. Ships fast, generates installs while Phase 2 is being built.

**Phase 2 — Smart Compose** (3–4 weeks)
The actual moat. Extension-exclusive by architecture. Fires at the highest-value moment in a Hive creator's workflow. Creates daily dependency. Every success story becomes a Hive blog post about HivePulse — the virality loop runs on the platform the tool serves.

---

## Sources

- DeBank Review 2026: https://cryptoadventure.com/debank-review-2026-defi-portfolio-tracking-wallet-research-and-web3-social-features/
- Phantom Wallet Statistics 2026: https://coinlaw.io/phantom-wallet-statistics/
- Rabby Wallet Statistics 2026: https://coinlaw.io/rabby-wallet-statistics/
- Hive Onboarding Challenges: https://ecency.com/hive-11060/@burlarj/challenges-that-comes-with-onboarding
- Make Onboarding New People to HIVE Great Again: https://hive.blog/hive/@titusfrost/make-onboarding-new-people-to-hive-great-again
- HBD 15% APR analysis: https://inleo.io/@behiver/is-the-hbd-savings-15-apr-still-competitive-amongst-stablecoins-hgd
- Interest rate on HBD as Hive marketing: https://hive.blog/hive-167922/@phortun/interest-rate-on-hbd-savings-as-a-new-way-of-promoting-hive
- Hive Wrapped/Recap: https://recap.hivecreators.co/
- Top Hive Frontends Feb 2026: https://hive.blog/hive-133987/@dalz/a-look-at-the-top-hive-frontends-or-feb-2026
- Delegation V2 earnings gap: https://hive.blog/hive-120019/@vimukthi/delegation-v2-earnings-are-incredible-do-you-know-a-great-interface-to-track-them
- LeoFinance Delegation Tiers (up to 22% APR): https://hive.blog/hive-167922/@leofinance/introducing-delegation-tiers-earn-up-to-22-on-your-hive-power-delegation
- Curation rewards explained: https://testnet.peakd.com/@calamus056/curation-rewards-explained-in-great-detail
- Top Hive Curators analytics: https://hive.blog/hive-167922/@dalz/top-hive-curators-or-hive-power-votes-authors-voted-and-vote-diversification
- Web3 Consistency — Intract Streaks: https://www.blogs.intract.io/p/unleash-web3-consistency-intract-streaks
- Hive Projects directory: https://hiveprojects.io/projects/
- Browser extension marketing guide: https://extensionbooster.com/blog/marketing-browser-extension-complete-guide/
- Twemex / Tweet Hunter X sidebar: https://tweethunter.io/twemex
- Hive Blockchain Review 2026: https://cryptoadventure.com/hive-blockchain-review-2026-zero-fee-social-chain-with-3-second-finality-and-hbd/
