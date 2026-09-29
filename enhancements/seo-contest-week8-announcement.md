# HivePulse SEO Contest — Week 7 Results + Week 8 Campaign Pack

**Status: READY TO PUBLISH.** Week 7 closed 15 September 2026, 12:00 UTC. All six entries
judged, tag-verified by hand, X quote-retweets checked directly. Payout sheet is loaded into
`tools/contest-payouts.html`.

## The numbers

| | |
|---|---|
| Valid entries | **6** (down from 9) |
| Qualified (SEO ≥ 70) | **6 of 6** |
| Correctly tagged `#hivepulse` | **6 of 6** — second round running with no tag casualty |
| Prize pool | **300 HIVE** (under-10 tier, honoured exactly) |
| Referral bonuses | **0** — none claimed |
| X quote-RT prize | **50 HIVE** |
| **Total out** | **350 HIVE** |

## Final standings

| # | Author | SEO | GEO | Sum | Prize |
|---|---|---|---|---|---|
| 🥇 | @nabbas0786 | 100 | 100 | 200 | 150 |
| 🥈 | @les90 | 100 | 100 | 200 | 100 |
| 🥉 | @wardah | 100 | 100 | 200 | 50 |
| 4 | @ahmedabbaci | 98 | 100 | 198 | — |
| 5 | @cositav | 96 | 93 | 189 | — |
| 6 | @ekads | 79 | 80 | 159 | — (won the X prize) |

**The top three tied at a perfect 200/200 for the second round running.** This time a
published rule existed to settle it: when posts tie on SEO + GEO, the order is (1) higher
GEO, (2) higher word count, (3) earlier publication. All three sat at GEO 100, so word
count decided it — 1,096 (@nabbas0786), 631 (@les90), 561 (@wardah). No judgement call,
and every number was checkable before publishing.

## Rulings

- **No disqualifications.** All six tagged `#hivepulse`, all six root posts, all six
  inside the window, all six above the score floor.
- **No referral bonuses this round.** Not one of the six entry comments claimed a referral.
  This is the first round the bonus went unused since it launched, and it is the same
  mechanic that grew week 6 from eight to nine. Scan by concept, every round, in every
  language — there was simply nothing to find.
- **The tiebreak rule earned its keep on its first outing.** Published in the week-7 post
  precisely because week 6 forced a hand-broken tie, and used here. Worth saying so in the
  post: the rule was not decoration.
- **X quote-retweets: all three submitted correctly this round.** @nabbas0786, @les90 and
  @ekads each quote-retweeted the anchor tweet (id `2097327842325410165`), not a reply and
  not a standalone post — the distinction that cost someone the prize in week 6. Engagement
  decided it: @ekads 5 (3 likes + 1 reply + 1 repost), @les90 3 (3 likes), @nabbas0786 0.

## 💰 Payout sheet — loaded, ready to send

| Recipient | Amount | For |
|---|---|---|
| @nabbas0786 | **150** | 1st |
| @les90 | **100** | 2nd |
| @wardah | **50** | 3rd |
| @ekads | **50** | X quote-RT prize |
| | **350** | |

Serve `tools/contest-payouts.html` on :8899. It upvotes + reblogs the three winning posts,
then pays in **one atomic transaction**, and detects anyone already paid.

## ⚠️ Pre-publish checklist

- [x] Judge run; window corrected to the published 12:00 UTC close
- [x] **Re-scored after the setext-heading fix.** @ahmedabbaci and @cositav publish headings as
      setext underline (`Heading` + `---`), which the raw-markdown re-score read as **zero
      subheadings** and stripped the whole structure block. The extension never saw that form —
      it scores the editor DOM, which serialises every `<h2>` as `## `. Normalising setext → ATX
      at the fetch boundary (`scripts/lib/hive-rpc.mjs`) brings @cositav to **96** (matching the
      panel exactly) and @ahmedabbaci to **98**. Podium unchanged: the top three are still 200/200,
      so the paid winners stand.
- [x] `contest-results.csv` archived to `contest-results-week7.csv`
- [x] `#hivepulse` verified by hand on all 6 — the judge does not enforce it
- [x] Referrals scanned by concept — none claimed
- [x] X quote-retweets checked directly via the fxtwitter API (likes + reposts + replies)
- [x] Judge window rolled forward to 15 → 22 Sep
- [x] Payout data block updated in `tools/contest-payouts.html`
- [ ] **Eyeball the Quotes tab on the anchor tweet** — the public API exposes likes, replies
      and reposts for a *known* tweet, but an unannounced quote-RT with more engagement than
      @ekads's 5 cannot be ruled out from here
- [x] ~~Generate the week 8 cover~~ — `enhancements/images/contest-week8-cover.jpg`
      (1920x1080, 200 KB). Rendered by `scripts/make_week8_cover.py`, not AI-generated:
      the prize figures have to be exactly right and a cover with a wrong number is
      permanent once it is on-chain. Checked visually — footer reads "Closes 22 September
      2026, 12:00 UTC".
- [ ] Upload BOTH images via the editor — **drag the file, never paste** (pasting inflates
      them 5–8×) — and replace `PASTE_UPLOADED_COVER_URL_HERE` and
      `PASTE_UPLOADED_CHART_URL_HERE`
      · cover: `enhancements/images/contest-week8-cover.jpg`
      · chart: `enhancements/images/social/geo-vs-seo-week7.jpg`
- [x] ~~X thread drafted~~ — 8 tweets, all measured with
      `python scripts/check_tweet_lengths.py enhancements/seo-contest-week8-announcement.md`.
      Image plan is in the thread section: cover on 1/, chart on 5/, the rest text-only.
- [ ] Post the X thread first, then paste tweet 1's URL into the two `⟦WEEK8_TWEET_URL⟧` spots
- [ ] Pay the sheet above; upvote + reblog the three winning posts
- [ ] Post into **Hdev Contests** (`hive-177727`), tags: `hivepulse` `seo` `contest` `hive`
      `writing`
- [ ] Paste the meta description into the preview-description field
- [ ] Reply to @katriel1 (said they would enter in week 6, still has not) and @aimet
      (thanked us on the week-7 post but did not enter) — week 8 is open

---

## The Hive blog post

> ⚠️ **Paste this section as-is.** Every paragraph below is a single unbroken line on
> purpose. Hive frontends treat a newline inside a paragraph as a real line break, so
> hard-wrapping the source splits sentences at arbitrary points in the published post.
> Do not re-wrap it to a column width when editing.

> **Focus keyword** (set this in the analyzer's focus-keyword field): `hivepulse seo contest`
>
> Meta description (paste into the preview-description field — 149 chars):
> `HivePulse SEO Contest week 7: three more perfect scores, 350 HIVE paid. Week 8 is open — 300 HIVE now, 400 at ten entrants, 500 at twenty.`

**Title:** HivePulse SEO Contest: New Week 8 Round (Up To 500 HIVE)

---
![HivePulse SEO Contest week 8 cover: three prize tiers on a dark gold background reading 300 HIVE under 10 entrants, 400 HIVE at 10 to 19 and 500 HIVE at 20 or more, above a 25 HIVE referral bonus and a 50 HIVE prize for the most engaged quote-retweet](https://usermedia.actifit.io/MU2QMO3VKBVZPCXWCCK9MG217LGPD)

**Summary:** Week 7 of the HivePulse SEO Contest is settled. Six entries, six qualified, **three more perfect 100/100 scores**, and — for the second round running — nobody lost an entry to a missing tag. 350 HIVE is going out. And the field got smaller.

## The field got smaller, let's switch it around

The week 7 post asked for one more writer to push the pool from 300 HIVE to 400. Instead, the field went from nine entries to six.

We could leave that sentence out. We are not going to. The rule was published before the round started: under 10 valid entries pays 300 HIVE, 10 to 19 pays 400, 20 or more pays 500. Six entered, so the pool is 300, and 300 is exactly what we paid.

Nobody claimed a referral bonus this round either. That is the mechanic that grew week 6 to nine entries, and this round it went unused.

The table does not change because the field did.

| Entrants | Prize pool | Places paid |
|---|---|---|
| Under 10 | **300 HIVE** | 150 · 100 · 50 |
| 10 – 19 | **400 HIVE** | 200 · 100 · 60 · 40 |
| 20+ | **500 HIVE** | 250 · 120 · 80 · 50 |

**Four more writers and every prize on the board goes up.**

## HivePulse SEO Contest week 7 winners

Three posts finished on a perfect 200 out of 200 — 100 SEO and 100 GEO, all three. That is six perfect scores across two rounds, and it says something the score alone cannot: the ceiling of this contest has become a crowded place.

### 🥇 First place — @nabbas0786 (150 HIVE)

[The 1 Trap: Why the Edge of Temptation Always Breaks [You]](https://ecency.com/@nabbas0786/the-1-trap-why-the-edge-of-temptation-always-breaks-you) — **SEO 100 · GEO 100**

1,096 words, the longest post in the round by a wide margin, opening with the answer in the first sentence the way every perfect score does. @nabbas0786 has now taken a podium place in each of the last four rounds, and this is his second win. The tiebreak is what put him first this time, and it put him first on the number he controlled: he wrote the longest post.

### 🥈 Second place — @les90 (100 HIVE)

[[Fear] 1 Best way to understand and overcome our fear](https://ecency.com/@les90/fear-1-best-way-to-understand-and-overcome-our-fear) — **SEO 100 · GEO 100**

A first perfect score and a first podium. 631 words on what fear does and how it is beaten, every section under its own heading and the preview description filled in. @les90 also took the X prize in week 6, so this is a second round on the board.

### 🥉 Third place — @wardah (50 HIVE)

[#Physiotherapist (Healing Others): 3 Best Things Saving Me](https://peakd.com/hivepulse/@wardah/physiotherapist-healing-others-3-best-things-saving-me) — **SEO 100 · GEO 100**

A second perfect score in two rounds, after winning week 6 outright. 561 words on a day spent healing other people while unwell herself. The score is identical to the two posts above it; only the word count separated them.

## The tiebreak rule was published last round. It just decided a podium.

Week 6 ended in a three-way tie at 200 out of 200, and we broke it by reading the posts and picking the one that read most like a person. That was a judgement call, and judgement calls are exactly what this contest exists to avoid. So we published a rule instead: **when two posts tie on SEO + GEO, the order is (1) higher GEO score, (2) higher word count, (3) earlier publication time.**

Week 7 produced the same situation — three posts, all 200/200, all GEO 100. The rule settled it on word count: 1,096 words, then 631, then 561. First, second, third. No taste, no debate, and any entrant could have checked every number before publishing.

## Every score

| # | Author | SEO | GEO | Combined |
|---|---|---|---|---|
| 1 | @nabbas0786 | 100 | 100 | 100 |
| 2 | @les90 | 100 | 100 | 100 |
| 3 | @wardah | 100 | 100 | 100 |
| 4 | @ahmedabbaci | 98 | 100 | 99 |
| 5 | @cositav | 96 | 93 | 95 |
| 6 | @ekads | 79 | 80 | 80 |

Every score is re-derived from the post's on-chain content, not from the screenshot — a screenshot cannot win this contest, because we recompute the number ourselves.

## Nobody lost their entry to the tag this round either

Week 6: nine entries, nine tags. Week 7: six entries, six tags. Two rounds running with no tag casualty, after a missing tag had decided or damaged an entry in four of the first five rounds.

It is the cheapest rule in the contest. Keep the streak going.

## 🐦 The 50 HIVE X prize goes to @ekads

Three quote-retweets this round, and — unlike week 6 — all three did it properly. Each one quote-retweeted the announcement rather than replying to it, which is the format the prize is built on. The prize is decided by engagement, so the numbers decide it:

| Entrant | Likes | Reposts | Replies | Total |
|---|---|---|---|---|
| @ekads | 3 | 1 | 1 | **5** |
| @les90 | 3 | 0 | 0 | 3 |
| @nabbas0786 | 0 | 0 | 0 | 0 |

**@ekads wins 50 HIVE.** One note for anyone planning next round: engagement follows reach, and a small account starts behind. That is the trade-off we accepted when we made the metric objective, and we are still watching whether it rewards the wrong thing.

## 🚀 Week 8 — how to enter

1. Install HivePulse — [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/). Free; the Chrome build covers Opera, Brave and Edge.
2. Write and publish a **new** post on any supported Hive frontend, with the analyzer open as you write.
3. **Comment below** with a link to the post **and** a screenshot of your SEO and GEO panel. Both are required.
4. **Tag the post `#hivepulse`.** Enforced. Six out of six managed it last round — keep the streak.
5. Referred by someone? Write **exactly** `referred by @username` in your comment — and you both earn 25 HIVE.

**Runs 15 September → 22 September 2026, 12:00 UTC.** Minimum SEO score of 70. One entry per person; post several and your best tagged one counts. Any language welcome.

## Where the points actually are

Seven rounds in, 45 posts scored on both axes. The pattern has not moved: SEO scores cluster high because Hive creators already write decent titles and headings, and GEO is where the gap sits.

![Scatter plot of 45 scored Hive contest posts with SEO score on the horizontal axis and GEO score on the vertical axis. A dashed diagonal marks where the two scores would be equal. Most dots sit above or near the line in green, six sit well below it in orange, and one post scored 93 for SEO but only 60 for GEO. Of the 20 posts that scored 90 or more for SEO, GEO scores ranged from 60 to 100.](PASTE_UPLOADED_CHART_URL_HERE)

Twenty of those posts scored **90 or more on SEO**. Their GEO scores ran from **60 to 100** — the full width of the range. Knowing a post did well on SEO tells you almost nothing about whether an AI engine will quote it, which is the same thing the correlation says more coldly: r = 0.64, so SEO explains about 41% of GEO. Two different jobs, and most entrants are already winning the first one.

1. **Open with the answer.** First 8–60 words, before any preamble. Every perfect score this round did this.
2. **Write self-contained sentences.** "This shows…" means nothing when quoted alone. Name the subject inside the sentence.
3. **Describe your images.** Not `IMG_1234.png`. A real sentence about what is in the picture.

And the cheapest points on the board: **fill in the preview description** — 10 SEO points for about 15 seconds of work. PeakD calls it "Short preview description", under the editor. On Ecency it is in the Story preview step.

## 🐦 The 50 HIVE X prize — week 8

**The quote-retweet with the most engagement wins 50 HIVE.** Likes + reposts + replies, added together, counted when week 8 closes. The number decides.

👉 **This is the tweet to quote:** https://x.com/HdevCore/status/2099862073773547891

Your post has to **quote-retweet that tweet** — not a reply, not a standalone post, not a quote of your own tweet. Write **your own words about your own experience**. **No engagement farming** — follow-for-follow, like-for-like, reply rings and bought engagement are disqualified, and we look before we pay. Counted at **22 September, 12:00 UTC**.

Four angles that travel, if you want a starting point: your score with the screenshot; the thing that surprised you; one sentence before and after; or what you would tell a Hive writer who has never heard of it.

## Join in

- ⭐ **Subscribe to [Hdev Contests](https://peakd.com/c/hive-177727/created)** — every round lands here.
- 💬 **Discord:** https://discord.gg/wnpR8Rafcf
- 🐦 **X:** https://x.com/HdevCore
- 🧩 **Get HivePulse:** [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) · [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/)

Four more writers is the whole gap between 300 HIVE and 400. Bring someone with you — the referral pays you both. 🚀

*— The HivePulse Team (@hdev)*


---

## X thread

Post this **before** the Hive post, then paste tweet 1's URL into the two `⟦WEEK8_TWEET_URL⟧`
spots above and into the Discord announcement. Lengths are X-weighted (a URL counts 23, an
emoji 2) — re-check with `python scripts/check_tweet_lengths.py enhancements/seo-contest-week8-announcement.md`, which reads the fenced tweet blocks below.

Each block is plain text with no blockquote markers, so it copies straight into X.

**Images — attach these two, nothing else:**

| Tweet | Image | Why there |
|---|---|---|
| **1/** | `enhancements/images/contest-week8-cover.jpg` | The anchor. This is the tweet people quote-retweet for the 50 HIVE prize, so it carries the prize ladder and has to look like something. |
| **5/** | `enhancements/images/social/geo-vs-seo-week7.jpg` | The chart *is* that tweet's argument — the numbers in the text are the numbers on the chart. |

Tweets 2, 3, 4, 6, 7 and 8 go out as text. Do not pad them with a repeat of the cover:
X shows a thread's first image prominently and reusing it further down reads as filler.

**1/**

```tweet
Week 7 of the HivePulse SEO Contest is settled.

6 entries. 6 qualified. Three more perfect 100/100 scores.

350 HIVE paid.

And the field got smaller. let us switch it around. 🧵
```

📎 **Attach:** `enhancements/images/contest-week8-cover.jpg`

**2/**

```tweet
🥇 @nabbas0786 — 100/100
🥈 @les90 — 100/100
🥉 @wardah — 100/100

Three perfect scores, again. The tiebreak we published last round decided it: most words wins when the scores are level. 1096 words took first.
```

**3/**

```tweet
We published a tiebreak rule one round ago because we had to break a tie by hand and hated it.

This round it decided the podium: higher GEO, then word count, then publication time.

No judgement call. Just numbers.
```

**4/**

```tweet
The field went from 9 entries to 6.

The pool stayed at 300 because the rule says under 10 pays 300. We said we would not quietly round up, and we did not.

Nobody claimed a referral bonus this round either — the mechanic that grew week 6.
```

**5/**

```tweet
45 Hive posts scored on both axes now.

20 of them scored 90+ on SEO. Their GEO scores ran from 60 to 100.

A strong SEO score tells you almost nothing about whether an AI engine will quote you. r = 0.64.
```

📎 **Attach:** `enhancements/images/social/geo-vs-seo-week7.jpg`

**6/**

```tweet
Week 8 is open now.

Write a post with HivePulse open, tag it #hivepulse, comment with the link + your panel screenshot.

300 HIVE. 400 at ten entrants. 500 at twenty.
Closes 22 Sep, 12:00 UTC 👇
https://actifit.io/hive-177727/@hdev/hivepulse-seo-contest-new-week-8-round-up-to-500-hive
```

**7/**

```tweet
Two rounds running now: nobody lost an entry to a missing tag.

Week 6: 9 of 9 tagged. Week 7: 6 of 6 tagged.

It is the cheapest rule in the contest and it used to decide podiums. Keep the streak.
```

**8/**

```tweet
50 HIVE for the quote-retweet of this thread with the most engagement.

@ekads won it this round with 5 (3 likes, 1 reply, 1 repost).

Quote-retweet it — not a reply. No farming. We look before we pay.

#Hive #HivePulse #SEO
```

---

## Discord announcement

**#announcements** — attach `enhancements/images/contest-week8-cover.jpg` to the message.
Discord will also unfurl the Hive link into a preview card, so the cover is the image
people actually see in the channel.

```text
**🏆 HivePulse SEO Contest — week 7 results, week 8 open**

**6 entries, 6 qualified, three more perfect 100/100 scores — and 350 HIVE going out.**

🥇 @nabbas0786 — 150 · 🥈 @les90 — 100 · 🥉 @wardah — 50
🐦 @ekads takes the 50 HIVE X prize

Three perfect scores, again — and the tiebreak rule we published last round decided the podium on word count. No judgement call.

The field went from 9 entries to 6, so the pool stayed at 300. The rule is the rule, and four more writers moves every prize up.

**Week 8 is live and runs to 22 September, 12:00 UTC.**
300 HIVE · 400 at 10 entrants · 500 at 20 · 25 HIVE each for a referral · 50 HIVE for the most-engaged quote-RT

Also: nobody lost an entry to a missing tag for the second round running.

Full post: ⟦HIVE_POST_URL⟧
```
