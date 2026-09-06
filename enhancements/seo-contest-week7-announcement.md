# HivePulse SEO Contest — Week 6 Results + Week 7 Campaign Pack

**Status: DRAFT — not publishable yet.** Week 6 closes **8 September 2026, 12:00 UTC**, and
judging happens after that. Everything marked `⟦PENDING⟧` below is a real number that does
not exist yet. Do not guess any of them, and do not publish with a placeholder still in the
text — search the file for `⟦` before posting.

What *is* final and can be written now: the week 7 rules, the dates, the prize ladder, the X
prize format, and the HivePulse 1.14.0 news.

---

## ⟦PENDING⟧ — fill on Tuesday 8 September, after judging

| Field | Where it goes |
|---|---|
| Valid entrant count | Decides the tier, and the "two entries short" style framing |
| Prize tier actually reached | Payout sheet + blog post |
| 1st / 2nd / 3rd (/4th) winners and scores | Winners section, payout sheet, X thread |
| Full score table, every entry | "Every score" section |
| Rulings — anyone disqualified, and why | "Rulings" section |
| Referral pairs claimed | Payout sheet at 25 + 25 |
| X quote-RT winner + engagement count | The 🐦 section — or "rolls over" if nobody qualified |
| Week-7 announcement tweet URL | Quote-RT target link, in three places |
| Cover image URL after upload | `PASTE_UPLOADED_COVER_URL_HERE` |

Run `node scripts/judge-contest.mjs` after 12:00 UTC — and **update its window to 8 → 15 Sep
first**, the same edit that was needed last round. Archive `contest-results.csv` to
`contest-results-week6.csv` before it is overwritten.

Two traps that have bitten before, both worth re-reading:
- **Scan referrals by concept, not by the literal phrase.** Week 5 nearly missed
  @les90's "referred **from** @nabbas0786". The rule asks for exact wording; the judging
  must not.
- **Check `#hivepulse` on every entry yourself.** The judge does not enforce the tag, and it
  has cost someone their entry in five of six rounds.

---

## 💰 Payout sheet — template

| Recipient | Amount | Memo |
|---|---|---|
| ⟦1st⟧ | ⟦150 / 200 / 250⟧ HIVE | HivePulse SEO Contest week 6 — 1st place |
| ⟦2nd⟧ | ⟦100 / 120⟧ HIVE | HivePulse SEO Contest week 6 — 2nd place |
| ⟦3rd⟧ | ⟦50 / 60 / 80⟧ HIVE | HivePulse SEO Contest week 6 — 3rd place |
| ⟦4th, only at 10+ entrants⟧ | ⟦40 / 50⟧ HIVE | HivePulse SEO Contest week 6 — 4th place |
| ⟦referrer⟧ | 25 HIVE | HivePulse SEO Contest — referral bonus |
| ⟦referred⟧ | 25 HIVE | HivePulse SEO Contest — referral bonus |
| ⟦X quote-RT winner⟧ | 50 HIVE | HivePulse SEO Contest week 6 — X prize |

Pay with `tools/contest-payouts.html` (serve on :8899). Edit only its data block. It pays in
**two atomic transactions** and detects anyone already paid. Every payment must appear in the
**published** copy of the post, not only in the tool.

---

## ⚠️ Pre-publish checklist

- [ ] Update the judge window to 8 → 15 Sep in `scripts/judge-contest.mjs`
- [ ] Archive `contest-results.csv` → `contest-results-week6.csv`
- [ ] Run the judge; verify `#hivepulse` on every entry by hand
- [ ] Scan comments for referrals **by concept**, not by the exact phrase
- [ ] Check X directly for quote-retweets — including ones nobody told us about
- [ ] Fill every `⟦PENDING⟧` field; search the file for `⟦` and confirm zero hits
- [ ] Generate the week 7 cover (`scripts/brand_style.py` house language — gold mosaic,
      crimson badge; do **not** use a generic AI plate)
- [ ] Upload the cover via the editor — **drag the file, never paste** (pasting inflates it
      5–8×) — and replace `PASTE_UPLOADED_COVER_URL_HERE`
- [ ] Post the X thread first, then paste its URL into the quote-RT section (three places)
- [ ] Pay winners, referrals and the X prize
- [ ] Upvote + reblog every winning post from @hdev
- [ ] Post into **Hdev Contests** (`hive-177727`), tags: `hivepulse` `seo` `contest` `hive`
      `writing`
- [ ] Paste the meta description into the preview-description field
- [ ] Reply to any entrant who was disqualified, explaining why and inviting them into week 7

---

## The Hive blog post

> ⚠️ **Paste this section as-is.** Every paragraph below is a single unbroken line on
> purpose. Hive frontends treat a newline inside a paragraph as a real line break, so
> hard-wrapping the source splits sentences at arbitrary points in the published post.
> Do not re-wrap it to a column width when editing.

> **Focus keyword** (set this in the analyzer's focus-keyword field): `hivepulse seo contest`
>
> Meta description (paste into the preview-description field — keep it 140–155 chars):
> `HivePulse SEO Contest week 6 winners, re-scored on-chain. Week 7 is open: 300 HIVE now, 400 at ten entrants, 500 at twenty. Plus HivePulse 1.14.0.`

**Title:** HivePulse SEO Contest: Week 7 Open (Up To 500 HIVE)

---

![HivePulse SEO Contest week 7 cover: three prize tiers on a dark gold background reading 300 HIVE under 10 entrants, 400 HIVE at 10 to 19 and 500 HIVE at 20 or more, above a 25 HIVE referral bonus and a 50 HIVE prize for the most engaged quote-retweet](PASTE_UPLOADED_COVER_URL_HERE)

**Summary:** Week 6 of the HivePulse SEO Contest is settled — ⟦N⟧ valid entries, ⟦M⟧ creators paid, ⟦tier⟧ HIVE out the door. Week 7 opens today and runs to 15 September. And HivePulse 1.14.0 shipped this week, including a fix to a bug that was quietly costing entrants points in this very contest.

## Week 6 winners

⟦PENDING — winners, scores and one specific sentence each about what that post did well. Not "great post": name the thing. Last round's examples: opened with the answer in the first 40 words; 24 images every one carrying a real description; a preview description that took 15 seconds and paid 10 points.⟧

## Every score

⟦PENDING — the full table, every entry, SEO and GEO. Publishing every score is the reason people trust the ranking; do not trim it to the winners.⟧

## Rulings

⟦PENDING — anyone disqualified and exactly why. If the reason was the tag, say so plainly and say it is fixable in two seconds next round.⟧

## 🚀 HivePulse 1.14.0 is out — and one fix was costing you points

The tool this contest is built around got a substantial update this week. Two changes matter directly to anyone entering.

**If you write on SlothBuzz, your tags were being read as zero.** SlothBuzz hides its tag input once you hit its ten-tag limit — which is exactly when you have finished tagging properly — and the analyzer was anchored to that input. So a fully tagged post scored **0 out of 8 on Tags**, at the precise moment it deserved full marks. That is fixed. If you entered from SlothBuzz in an earlier round, this is part of why your score looked lower than your post deserved.

**The analyzer now has an off switch.** Settings → Post Analyzer. On by default, but if you would rather draft without a panel watching, it is one toggle.

The rest of 1.14.0, briefly:

- **Your internal-market activity now shows up in Pulse** — limit orders, fills, cancellations, expiries and HBD↔HIVE conversions, in their own Market tab so order traffic does not bury your mentions and replies.
- **Frontend switching stops sending you to pages that do not exist.** Switching from a page a frontend has no equivalent of now lands on that frontend's home page instead of a server error — which, with auto-redirect on, you were being sent to automatically.
- **Ureka links open at the right URLs**, and its composer opens where it actually lives.
- **Turning a frontend off in Settings now genuinely turns it off.** The toggle used to go green and change nothing.
- **Mixed-case links** like `peakd.com/@Alice/My-Post` are recognised; they were being ignored outright.
- **The side panel follows the page you are on** as you browse, instead of the page it was opened on.
- **Slow Hive nodes now time out and fall back** instead of leaving the feed spinning, and a failed load no longer clears what you had already loaded.
- **A sharper toolbar icon**, one permission removed that let any website detect the extension, and two host permissions dropped that were requested but never used.
- **The privacy policy has been rewritten** to describe exactly what the extension reads and which services it contacts.

Update from [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/) — the Chrome build also covers Opera, Brave and Edge.

## The prize ladder has not moved

The rule is published before every round and it is a rule, not a hope: under 10 valid entries pays 300 HIVE, 10 to 19 pays 400, 20 or more pays 500 with a 250 top prize.

| Entrants | Prize pool | Places paid |
|---|---|---|
| Under 10 | **300 HIVE** | 150 · 100 · 50 |
| 10 – 19 | **400 HIVE** | 200 · 100 · 60 · 40 |
| 20+ | **500 HIVE** | 250 · 120 · 80 · 50 |

⟦PENDING — one line on how close week 6 came to the next rung, in the same plain terms as last round. If it cleared 10 for the first time, that is the headline of the whole post and it belongs in the summary too.⟧

We post the running entry count in the comments, so you always know where the field stands.

## 🚀 Week 7 — how to enter

1. Install HivePulse — [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/). Free; the Chrome build covers Opera, Brave and Edge.
2. Write and publish a **new** post on any supported Hive frontend, with the analyzer open as you write.
3. **Comment below** with a link to the post **and** a screenshot of your SEO and GEO panel. Both are required.
4. **Tag the post `#hivepulse`.** Enforced. It has cost someone their entry in five of six rounds.
5. Referred by someone? Write **exactly** `referred by @username` in your comment — that wording, so nothing gets missed — and you both earn 25 HIVE.

**Runs 8 September → 15 September 2026, 12:00 UTC.** Minimum SEO score of 70. One entry per person; post several and your best tagged one counts. Any language welcome.

## Where the points actually are

Six rounds in, ⟦N⟧ posts scored on both axes. The pattern has not shifted: SEO scores cluster high because Hive creators already write decent titles and headings. GEO — whether an AI answer engine can lift a passage out of your post and cite it — is where the gap sits.

1. **Open with the answer.** First 8–60 words, before any preamble. This single habit separates the top of the table from the middle of it, every round.
2. **Write self-contained sentences.** "This shows…" means nothing when quoted alone. Name the subject inside the sentence.
3. **Describe your images.** Not `IMG_1234.png`. A real sentence about what is in the picture.

And the cheapest points on the board: **fill in the preview description** — 10 SEO points for about 15 seconds of work. PeakD calls it "Short preview description", under the editor. On Ecency it is in the Story preview step.

## 🐦 The 50 HIVE X prize

**The quote-retweet with the most engagement wins 50 HIVE.** Likes + reposts + replies added together, counted when week 7 closes. No taste, no debate — the number decides and you can watch it yourself.

👉 **This is the tweet to quote:** ⟦PASTE_WEEK7_TWEET_URL⟧

You do not need to be clever, you need to be specific. Four angles that travel:

**1. Your score, with the screenshot.** The most shareable thing you have.
> *"First draft: 62. I fixed three things it flagged. 94. The whole edit took four minutes."*

**2. The thing that surprised you.**
> *"I've written on Hive for two years and had no idea an image with no description was costing me points."*

**3. One sentence, before and after.**
> *"Before: 'In today's world, many people wonder about this topic.' After: 'Heat neutralises a mosquito-bite itch in about 30 seconds.' Same paragraph, 20 points apart."*

**4. What you'd tell a Hive writer who has never heard of it.**
> *"It reads your draft while you write and tells you what Google and ChatGPT will each ignore. Free. That's it, that's the tool."*

The only rules: it has to **quote-retweet the week 7 announcement** rather than be a standalone post, it has to be **your own words and your own experience**, and **no engagement farming** — follow-for-follow, like-for-like, reply rings and bought engagement are disqualified, and we look before we pay. Counted at week 7 close, **15 September 12:00 UTC**.

⟦PENDING — if the week 6 X prize went unclaimed again, say so here and roll it over. If someone won it, name them and the number they hit; a real winner is far better proof that the format works than any explanation of the format.⟧

## Join in

- ⭐ **Subscribe to [Hdev Contests](https://peakd.com/c/hive-177727/created)** — every round lands here.
- 💬 **Discord:** https://discord.gg/wnpR8Rafcf
- 🐦 **X:** https://x.com/HdevCore
- 🧩 **Get HivePulse:** [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) · [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/)

Bring someone with you — it pays you both, and it moves the whole field one rung closer to a bigger pool. 🚀

*— The HivePulse Team (@hdev)*

---

## X thread

Post this **before** the Hive post, then paste tweet 1's URL into the quote-RT section above
and into the Discord announcement. Lengths are X-weighted (a URL counts 23, an emoji 2) —
re-check with `scripts/check_tweet_lengths.py` after filling the placeholders.

**1/**
> Week 6 of the HivePulse SEO Contest is settled. ⟦N⟧ entries, ⟦tier⟧ HIVE paid out.
>
> Week 7 is open now → up to 500 HIVE.
>
> And 1.14.0 shipped, with a fix to a bug that was costing SlothBuzz writers points in this contest. 🧵

**2/**
> ⟦PENDING — winners, one line each with the specific thing their post did. Names and numbers travel; adjectives do not.⟧

**3/**
> The bug: SlothBuzz hides its tag input once you hit 10 tags — exactly when you've finished tagging properly.
>
> The analyzer was anchored to that input. Result: a fully tagged post scored 0/8 on Tags.
>
> Fixed in 1.14.0.

**4/**
> Also in 1.14.0:
> • Your internal-market orders and trades now show in Pulse
> • Frontend switching stops landing on broken pages
> • The analyzer has an off switch
> • Sharper icon, fewer permissions, rewritten privacy policy

**5/**
> Week 7: write a post with HivePulse open, tag it #hivepulse, comment with the link + your panel screenshot.
>
> 300 HIVE. 400 at ten entrants. 500 at twenty.
> Min score 70. Any language.
>
> Closes 15 Sep, 12:00 UTC 👇
> ⟦HIVE_POST_URL⟧

**6/**
> The 50 HIVE X prize: quote-retweet tweet 1 of this thread with something true about using it.
>
> Most engagement wins. Likes + reposts + replies, counted at close.
>
> No farming — we look before we pay.
>
> #Hive #HivePulse #SEO

---

## Discord announcement

**#announcements**

> **🏆 HivePulse SEO Contest — week 6 results, week 7 open**
>
> ⟦N⟧ entries, ⟦tier⟧ HIVE paid.
> ⟦winners, one line each⟧
>
> **Week 7 is live and runs to 15 September, 12:00 UTC.**
> 300 HIVE · 400 at 10 entrants · 500 at 20 · 25 HIVE each for a referral · 50 HIVE for the most-engaged quote-RT
>
> **Also: HivePulse 1.14.0 is out.** If you write on SlothBuzz, your tags were being scored as zero once you hit its 10-tag cap — that is fixed, along with market activity in Pulse, frontend-switch routing, and an off switch for the analyzer.
>
> Full post: ⟦HIVE_POST_URL⟧
> Update: <https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg>
