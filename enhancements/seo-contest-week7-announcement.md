# HivePulse SEO Contest — Week 6 Results + Week 7 Campaign Pack

**Status: READY TO PUBLISH.** Week 6 closed 8 September 2026, 12:00 UTC. All nine entries
judged, tag-verified by hand, referrals scanned by concept. Payout sheet is loaded into
`tools/contest-payouts.html`.

## The numbers

| | |
|---|---|
| Valid entries | **9** (up from 8) — one short of the 400 tier |
| Qualified (SEO ≥ 70) | **9 of 9** |
| Correctly tagged `#hivepulse` | **9 of 9** — first round ever with no tag casualty |
| Prize pool | **300 HIVE** (under-10 tier, honoured exactly) |
| Referral bonuses | **200 HIVE** across 4 pairs |
| X quote-RT prize | **50 HIVE** |
| **Total out** | **550 HIVE** |

## Final standings

| # | Author | SEO | GEO | Sum | Prize |
|---|---|---|---|---|---|
| 🥇 | @wardah | 100 | 100 | 200 | 150 |
| 🥈 | @nabbas0786 | 100 | 100 | 200 | 100 |
| 🥉 | @ahmedabbaci | 100 | 100 | 200 | 50 |
| 4 | @les90 | 99 | 100 | 199 | — (won the X prize) |
| 5 | @angeluxx | 81 | 77 | 158 | — |
| 6 | @militadigital01 | 77 | 80 | 157 | — |
| 7 | @al-hamad | 77 | 78 | 155 | — |
| 8 | @aimet | 79 | 60 | 139 | — |
| 9 | @cositav | 77 | 57 | 134 | — |

**The top three tied at a perfect 200/200.** No published tiebreak existed, so it was decided
on the quality pass the judge script itself asks for — which post reads most like a person
talking to another person. Measured, for the record: transition-word density per 1,000 words
was 0.0 (@wardah), 6.5 (@nabbas0786), 25.5 (@ahmedabbaci); first-person density 64.6 / 8.7 /
9.5. **A tiebreak rule is published in the week 7 post so this is never a judgement call
again.** Do not publish the per-author transition numbers — the rule is enough, and naming
who scored worst on it would be a public shaming of a first-time entrant who did nothing
against the rules.

## Rulings

- **No disqualifications.** All nine tagged `#hivepulse`, all nine root posts, all nine
  inside the window, all nine above the score floor.
- **@aimet's referral was claimed in Spanish** — *"mi compañera @militadigital01 me invitó"*.
  A literal `referred by` search would have missed it and cost two people 25 HIVE each.
  Scan by concept, every round, in every language.
- **@nabbas0786's X entry did not qualify.** It replied to @HdevCore mentioning the tool
  rather than quote-retweeting the announcement, then quote-tweeted its own reply from a
  second account. Good content, wrong format, 0 engagement. The rule was rewritten this round
  specifically to be objective, so it is applied as written — and credited warmly in the post.

## 💰 Payout sheet — loaded, ready to send

| Recipient | Amount | For |
|---|---|---|
| @wardah | **175** | 1st (150) + referral (25) |
| @nabbas0786 | **175** | 2nd (100) + 3 referrals (75) |
| @ahmedabbaci | **75** | 3rd (50) + referral (25) |
| @les90 | **50** | X quote-RT prize |
| @militadigital01 | **25** | Referral — brought @aimet |
| @al-hamad | **25** | Referral — referred by @nabbas0786 |
| @aimet | **25** | Referral — referred by @militadigital01 |
| | **550** | |

Serve `tools/contest-payouts.html` on :8899. It upvotes + reblogs the three winning posts,
then pays in **two atomic transactions**, and detects anyone already paid.

## ⚠️ Pre-publish checklist

- [x] Judge run; window corrected to the published 12:00 UTC close
- [x] `contest-results.csv` archived to `contest-results-week6.csv`
- [x] `#hivepulse` verified by hand on all 9 — the judge does not enforce it
- [x] Referrals scanned by concept (caught the Spanish claim)
- [x] X quote-retweets checked directly
- [x] Judge window rolled forward to 8 → 15 Sep
- [x] Payout data block updated in `tools/contest-payouts.html`
- [ ] **Eyeball the Quotes tab on the anchor tweet** — the public embed API exposes likes
      only, so an unannounced quote-RT with more than 5 engagements cannot be ruled out
      from here
- [x] ~~Generate the week 7 cover~~ — `enhancements/images/contest-week7-cover.jpg`
      (1920x1080, 198 KB). Rendered by `scripts/make_week7_cover.py`, not AI-generated:
      the prize figures have to be exactly right and a cover with a wrong number is
      permanent once it is on-chain. Checked visually — the first render still carried
      week 6's "Closes 8 September" footer.
- [ ] Upload BOTH images via the editor — **drag the file, never paste** (pasting inflates
      them 5–8×) — and replace `PASTE_UPLOADED_COVER_URL_HERE` and
      `PASTE_UPLOADED_CHART_URL_HERE`
      · cover: `enhancements/images/contest-week7-cover.jpg`
      · chart: `enhancements/images/social/geo-vs-seo-week6.jpg`
- [x] ~~X thread drafted~~ — all 7 tweets measured against X's weighted-length spec,
      max 240/280
- [ ] Post the X thread first, then paste tweet 1's URL into the two `⟦WEEK7_TWEET_URL⟧` spots
- [ ] Pay the sheet above; upvote + reblog the three winning posts
- [ ] Post into **Hdev Contests** (`hive-177727`), tags: `hivepulse` `seo` `contest` `hive`
      `writing`
- [ ] Paste the meta description into the preview-description field
- [ ] Reply to @katriel1, who said they would enter and did not — week 7 is open

---

## The Hive blog post

> ⚠️ **Paste this section as-is.** Every paragraph below is a single unbroken line on
> purpose. Hive frontends treat a newline inside a paragraph as a real line break, so
> hard-wrapping the source splits sentences at arbitrary points in the published post.
> Do not re-wrap it to a column width when editing.

> **Focus keyword** (set this in the analyzer's focus-keyword field): `hivepulse seo contest`
>
> Meta description (paste into the preview-description field — 134 chars):
> `HivePulse SEO Contest week 6: three perfect scores, 550 HIVE paid. Week 7 is open — 300 HIVE now, 400 at ten entrants, 500 at twenty.`

**Title:** HivePulse SEO Contest: New Week 7 Round (Up To 500 HIVE)

---

![HivePulse SEO Contest week 7 cover: three prize tiers on a dark gold background reading 300 HIVE under 10 entrants, 400 HIVE at 10 to 19 and 500 HIVE at 20 or more, above a 25 HIVE referral bonus and a 50 HIVE prize for the most engaged quote-retweet](PASTE_UPLOADED_COVER_URL_HERE)

**Summary:** Week 6 of the HivePulse SEO Contest is settled. Nine entries, nine qualified, **three perfect 100/100 scores**, and — for the first time in six rounds — nobody lost an entry to a missing tag. 550 HIVE is going out. The field finished **one single entry short** of the 400 pool.

## One entry short of a bigger pool

The rule was published before the round started, as it always is: under 10 valid entries pays 300 HIVE, 10 to 19 pays 400, 20 or more pays 500.

Nine people entered. Every one of them qualified. And the pool stayed at 300, because that is what the rule says.

Last round the field was two short. Week 6 came up one short. We are telling you this plainly for the same reason as last time — quietly paying 400 anyway would make the ladder meaningless, and a ladder nobody believes is worth nothing to the people climbing it.

**One more writer next round and every prize on the board goes up.**

| Entrants | Prize pool | Places paid |
|---|---|---|
| Under 10 | **300 HIVE** | 150 · 100 · 50 |
| 10 – 19 | **400 HIVE** | 200 · 100 · 60 · 40 |
| 20+ | **500 HIVE** | 250 · 120 · 80 · 50 |

## HivePulse SEO Contest week 6 winners

Three posts finished on a perfect 200 out of 200 — 100 SEO and 100 GEO, all three. No previous round has produced a single perfect score, let alone three, and the result was a genuine dead heat at the top of the table.

### 🥇 First place — @wardah (150 HIVE)

[Best Spider Man Movie Trip: 2 Hours (of Joy) With My Sister](https://peakd.com/hive-155014/@wardah/best-spider-man-movie-trip-2-hours-of-joy-with-my-sister) — **SEO 100 · GEO 100**

A cinema trip with her sister. No keywords hunted, no formula — just a day described properly, with five images every one of which carries a real description instead of a filename. The post opens with the answer in the first sentence, every heading marks a real section, and the preview description is filled in. Study this post if you assume a high score requires a technical subject. A high score requires a *clear* one.

### 🥈 Second place — @nabbas0786 (100 HIVE)

[HivePulse SEO Guide: Boost Your Hive Blog Visibility [2026]](https://ecency.com/@nabbas0786/hivepulse-seo-guide-boost-your-hive-blog-visibility-2026) — **SEO 100 · GEO 100**

An explainer of the difference between SEO and GEO that stands on real numbers — 8.5 billion Google searches a day, 60% of AI answers citing sources with direct links — instead of vague claims. Concrete figures are exactly what a generative engine can lift and cite, which is why the GEO score is perfect. @nabbas0786 also brought three new entrants into this round on their own. More on that below.

### 🥉 Third place — @ahmedabbaci (50 HIVE)

[AI E-Commerce Guide [2026]: Automations and Operations](https://ecency.com/@ahmedabbaci/ai-e-commerce-guide-2026) — **SEO 100 · GEO 100**

A first ever entry, and it landed on a perfect score. 1,361 words, seven images every one with a real description, nine sections. Their comment read *"took me a long way just to turn those red & yellow lights into green"* — and that is precisely the point of the tool. Turning the panel green on your first attempt is genuinely hard.

## How the tie was broken — and the rule we are publishing because of it

Three posts, identical scores. The score could not separate them, so we read them, and gave first place to the one that reads most like a person talking to another person rather than to a search engine.

Choosing on readability was a judgement call, and judgement calls are exactly what this contest exists to avoid. So here is the rule, from week 7 onward:

**When two posts tie on SEO + GEO, the tiebreak order is: (1) higher GEO score, (2) higher word count, (3) earlier publication time.** All three are numbers you can check yourself before you publish. No taste, no debate.

## Every score

| # | Author | SEO | GEO | Combined |
|---|---|---|---|---|
| 1 | @wardah | 100 | 100 | 100 |
| 2 | @nabbas0786 | 100 | 100 | 100 |
| 3 | @ahmedabbaci | 100 | 100 | 100 |
| 4 | @les90 | 99 | 100 | 100 |
| 5 | @angeluxx | 81 | 77 | 79 |
| 6 | @militadigital01 | 77 | 80 | 79 |
| 7 | @al-hamad | 77 | 78 | 78 |
| 8 | @aimet | 79 | 60 | 70 |
| 9 | @cositav | 77 | 57 | 67 |

Every score is re-derived from the post's on-chain content, not from the screenshot — a screenshot cannot win this contest, because we recompute the number ourselves.

## Nobody lost their entry to the tag this round

In five of the previous six rounds, at least one person wrote a good post, forgot `#hivepulse`, and lost an entry over the omission. Week 6: nine entries, nine tags, zero casualties.

Keep doing that.

## The referral bonus is why this round grew

@nabbas0786 brought **three** new entrants — @wardah, @al-hamad and @ahmedabbaci. @militadigital01 brought @aimet. Four referral pairs, 200 HIVE in bonuses, and a field that grew from eight to nine because individual people went and asked someone.

One of those referrals was nearly missed. @aimet claimed it in Spanish — *"mi compañera @militadigital01 me invitó"* — and a search for the exact English phrase would have found nothing. We check by meaning, in any language, and we always will. But writing it as **`referred by @username`** is still the way to make certain, and it takes three seconds.

## 🐦 The 50 HIVE X prize goes to @les90

[@les90's quote-retweet](https://x.com/Lesly90420/status/2096226725265027500) was the only one that actually quote-retweeted the announcement, and it earned real engagement doing it: *"I have been writing on Hive since 3.5 years but I never had idea that my common writing blogs can be searched from Google from different countries."*

**50 HIVE, paid.**

One honest note. @nabbas0786 also posted about the tool on X — a genuinely good post, with a specific before-and-after and a screenshot. But it was a **reply** mentioning us rather than a quote-retweet of the announcement, so it did not qualify. Missing out on a format technicality is frustrating, and we are saying so publicly, because the format rule is the whole reason the prize is objective. Quote-retweet the announcement tweet, and you are in.

## 🚀 Week 7 — how to enter

1. Install HivePulse — [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/). Free; the Chrome build covers Opera, Brave and Edge.
2. Write and publish a **new** post on any supported Hive frontend, with the analyzer open as you write.
3. **Comment below** with a link to the post **and** a screenshot of your SEO and GEO panel. Both are required.
4. **Tag the post `#hivepulse`.** Enforced. Nine out of nine managed it last round — keep the streak.
5. Referred by someone? Write **exactly** `referred by @username` in your comment — and you both earn 25 HIVE.

**Runs 8 September → 15 September 2026, 12:00 UTC.** Minimum SEO score of 70. One entry per person; post several and your best tagged one counts. Any language welcome.

## 🚀 And HivePulse 1.14.0 is out — one fix was costing you points

The tool this contest is built around shipped a substantial update this week, and two changes matter directly to anyone entering.

**If you write on SlothBuzz, your tags were being read as zero.** SlothBuzz hides its tag input once you hit its ten-tag limit — which is exactly when you have finished tagging properly — and the analyzer was anchored to that input. So a fully tagged post scored **0 out of 8 on Tags**, at the precise moment full marks were deserved. Version 1.14.0 fixes the bug. If your score ever looked lower than your post deserved, the tag reader may be why.

**The analyzer now has an off switch.** Settings → Post Analyzer. On by default, but if you would rather draft without a panel watching, it is one toggle.

The rest of it, briefly:

- **Your internal-market activity now shows in Pulse** — limit orders, fills, cancellations, expiries and HBD↔HIVE conversions, in their own Market tab so order traffic does not bury your mentions and replies.
- **Frontend switching stops sending you to pages that do not exist.** Switching from a page a frontend has no equivalent of now lands on that frontend's home page instead of a server error.
- **Ureka links open at the right URLs**, and its composer opens where it actually lives.
- **Turning a frontend off in Settings now genuinely turns it off.** The toggle used to go green and change nothing.
- **Mixed-case links** like `peakd.com/@Alice/My-Post` are recognised; they were being ignored outright.
- **The side panel follows the page you are on** as you browse, instead of the page it was opened on.
- **Slow Hive nodes now time out and fall back** instead of leaving the feed spinning, and a failed load no longer clears what you had already loaded.
- **A sharper toolbar icon**, one permission removed that let any website detect the extension, and two host permissions dropped that were requested but never used.
- **The privacy policy has been rewritten** to describe exactly what the extension reads and which services it contacts.

Update from [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/).

## Where the points actually are

Six rounds in, 46 posts scored on both axes. The pattern has not shifted: SEO scores cluster high because Hive creators already write decent titles and headings. GEO — whether an AI answer engine can lift a passage out of your post and cite it — is where the gap sits, and GEO is where week 6 separated 4th place from 9th.

![Dumbbell chart of 39 scored Hive contest posts, each showing its SEO score in orange and its GEO score in green joined by a line, sorted with the widest gap at the top where one post scored 93 for SEO but only 60 for GEO; the correlation between the two measures is 0.60](PASTE_UPLOADED_CHART_URL_HERE)

Across every post we have scored, the correlation between the two measures is just **0.60** — SEO explains about a third of GEO. A high SEO score is not evidence that an AI engine will quote you. Those are two different jobs, and most entrants are already winning the first one.

1. **Open with the answer.** First 8–60 words, before any preamble. All three perfect scores did this.
2. **Write self-contained sentences.** "This shows…" means nothing when quoted alone. Name the subject inside the sentence.
3. **Describe your images.** Not `IMG_1234.png`. A real sentence about what is in the picture. @wardah won this round partly on five images that all did exactly that.

And the cheapest points on the board: **fill in the preview description** — 10 SEO points for about 15 seconds of work. PeakD calls it "Short preview description", under the editor. On Ecency it is in the Story preview step.

## 🐦 The 50 HIVE X prize — week 7

**The quote-retweet with the most engagement wins 50 HIVE.** Likes + reposts + replies, added together, counted when week 7 closes. The number decides.

👉 **This is the tweet to quote:** ⟦WEEK7_TWEET_URL⟧

Your post has to **quote-retweet that tweet** — not a reply, not a standalone post, not a quote of your own tweet. The difference between a quote-retweet and a reply cost someone the prize in week 6. Write **your own words about your own experience**. **No engagement farming** — follow-for-follow, like-for-like, reply rings and bought engagement are disqualified, and we look before we pay. Counted at **15 September, 12:00 UTC**.

Four angles that travel, if you want a starting point: your score with the screenshot; the thing that surprised you; one sentence before and after; or what you would tell a Hive writer who has never heard of it.

## Join in

- ⭐ **Subscribe to [Hdev Contests](https://peakd.com/c/hive-177727/created)** — every round lands here.
- 💬 **Discord:** https://discord.gg/wnpR8Rafcf
- 🐦 **X:** https://x.com/HdevCore
- 🧩 **Get HivePulse:** [Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) · [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/)

One entrant is the whole gap between 300 HIVE and 400. Bring someone with you — the referral pays you both, and week 6 proves the mechanism works. 🚀

*— The HivePulse Team (@hdev)*

---

## X thread

Post this **before** the Hive post, then paste tweet 1's URL into the two `⟦WEEK7_TWEET_URL⟧`
spots above and into the Discord announcement. Lengths are X-weighted (a URL counts 23, an
emoji 2) — re-check with `scripts/check_tweet_lengths.py` before posting.

**1/**
> Week 6 of the HivePulse SEO Contest is settled.
>
> 9 entries. 9 qualified. Three perfect 100/100 scores — a first.
>
> 550 HIVE paid out.
>
> And the field finished ONE entry short of the bigger pool. 🧵

**2/**
> 🥇 @wardah — 100/100
> A cinema trip with her sister. No keyword hunting, no formula. Five images, every one properly described.
>
> Proof that a perfect score doesn't need a technical topic. It needs a clear one.

**3/**
> 🥈 @nabbas0786 — 100/100
> Built an SEO vs GEO explainer on real numbers instead of vague claims. That's exactly what an AI engine can quote.
>
> 🥉 @ahmedabbaci — 100/100
> First ever entry. Landed a perfect score.

**4/**
> The thing nobody expected: in 5 of the previous 6 rounds, someone wrote a great post, forgot the #hivepulse tag, and lost their entry.
>
> This round: 9 entries, 9 tags, zero casualties.

**5/**
> Week 7 is open now.
>
> Write a post with HivePulse open, tag it #hivepulse, comment with the link + your panel screenshot.
>
> 300 HIVE. 400 at ten entrants. 500 at twenty.
> Closes 15 Sep, 12:00 UTC 👇
> ⟦HIVE_POST_URL⟧

**6/**
> Also shipped: HivePulse 1.14.0.
>
> If you write on SlothBuzz, your tags were scored as ZERO once you hit its 10-tag cap — exactly when you'd finished tagging properly.
>
> Fixed. Plus market activity in Pulse, and an off switch for the analyzer.

**7/**
> 50 HIVE for the quote-retweet of this thread with the most engagement.
>
> Quote-retweet it — not a reply, not a standalone post. That distinction decided it this round.
>
> No farming. We look before we pay.
>
> #Hive #HivePulse #SEO

---

## Discord announcement

**#announcements**

> **🏆 HivePulse SEO Contest — week 6 results, week 7 open**
>
> **9 entries, 9 qualified, three perfect 100/100 scores — and 550 HIVE going out.**
>
> 🥇 @wardah — 150 · 🥈 @nabbas0786 — 100 · 🥉 @ahmedabbaci — 50
> 🐦 @les90 takes the 50 HIVE X prize
> 🤝 200 HIVE in referral bonuses across four pairs
>
> We finished **one entry short** of the 400 pool. One. The rule stands, so the pool stayed at 300 — and one more writer next round moves every prize up.
>
> Also: nobody lost their entry to a missing tag this round. First time in six.
>
> **Week 7 is live and runs to 15 September, 12:00 UTC.**
> 300 HIVE · 400 at 10 entrants · 500 at 20 · 25 HIVE each for a referral · 50 HIVE for the most-engaged quote-RT
>
> **And HivePulse 1.14.0 is out.** If you write on SlothBuzz, your tags were being scored as zero once you hit its 10-tag cap — fixed, along with market activity in Pulse and an off switch for the analyzer.
>
> Full post: ⟦HIVE_POST_URL⟧
> Update: <https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg>
