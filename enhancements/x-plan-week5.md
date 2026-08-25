# X plan — week 5 (26 Aug → 1 Sep 2026)

Account **@HdevCore**. Contest closes **Tue 1 Sep, 23:59 UTC**.

Every tweet below is inside a ` ```tweet ` block and verified against X's weighted-length
rules — URLs charged the flat 23, emoji charged 2:

```
python scripts/check_tweet_lengths.py enhancements/x-plan-week5.md
```

---

## Where the week actually stands

Checked on-chain 26 Aug, one day into a seven-day window:

| | |
|---|---|
| Entries so far | **2** (@cositav, @yusmelys) |
| Prize tier | **300 HIVE** — the bottom rung |
| Entrants needed for 400 HIVE | **8 more** |
| Entrants needed for 500 HIVE | 18 more |
| Unique entrants, weeks 2–4 | 7 → 7 → 7 (flat) |
| New entrants per round | 7 → 2 → 1 → 1 (falling) |
| Launch thread | [posted 25 Aug](https://x.com/HdevCore/status/2092261884963467626) — this is the quote-RT anchor |
| Shipped | v1.13.1 submitted to Chrome, AMO and Opera |

## The one thing this plan optimises for

**Entrant count.** Not impressions, not engagement — headcount.

Three rounds at exactly seven entrants says the contest has found its regulars and
stopped recruiting. The tiered pool exists to break that, and it only works if people
can see the dial. So the tier card is the spine of the week and gets re-rendered with
the live number every time it is posted.

The strategic shift worth understanding: **the tier turns a competition into a
collective goal.** "Come win 150 HIVE" gives a reader's audience no reason to care.
"We're 8 writers away from unlocking +100 HIVE for everyone in it" gives them a reason
to share — and the referral bonus means sharing pays the sharer twice, once in HIVE and
once in a bigger pool. Nothing else in this contest has ever given anyone a reason to
recruit. Lead with it every time.

Order of value this week:

1. **Entrants** — the tier is public, visible, and moves
2. **Quote-RTs** on the anchor tweet — 50 HIVE, and it is the only thing that reaches past our own followers
3. **Referrals** — highest-yield per person, but needs explaining, so it gets its own day

## Rules carried over

These held for three rounds and the week-3 thread outperformed every contest post, so
they stay:

- Every post useful to someone who will never touch Hive.
- Every image carries information the tweet does not.
- **No links in the main post** — link goes in the first reply, always.
- One hard CTA in the week, plus thread tails.

New for week 5:

- **Every post ends pointing somewhere that compounds** — the anchor tweet, the entry
  count, or a reply we will actually answer.
- **Answer every reply the same day.** With numbers this small, one real conversation is
  worth more than a thousand impressions.

---

## Wed 26 Aug, 14:00 — the tier, stated plainly

*Image: `social/w5-tier.jpg` — re-render first: `python scripts/make_week5_charts.py --entries 2`*

```tweet wed-main
2 people have entered week 5 of the HivePulse SEO Contest.

At 10 entrants the pool goes from 300 HIVE to 400. At 20 it is 500, top prize 250.

Not a target we hope to hit. A rule.

Every writer who enters makes the prize bigger for everyone already in.
```

```tweet wed-reply
6 days left. Write a post, run the analyzer, comment your link and score, tag #hivepulse.

Full rules and the running count: https://peakd.com/@hdev/hivepulse-seo-contest-new-week-5-prize-pool-500-hive
```

## Thu 27 Aug, 14:00 — the data post, no ask

*Image: `social/w5-correlation.jpg`*

This is the reach post. It has no CTA on purpose — it earned the best numbers of any
week-4 content and it is the only thing we publish that a non-Hive SEO audience will
share.

```tweet thu-main
We have scored 28 blog posts twice: once the way Google reads them, once the way an AI answer engine does.

The correlation keeps falling as we add data.

0.73 at 14 posts
0.58 at 25
0.47 at 28

A strong SEO score tells you less about AI visibility than anyone assumes.
```

```tweet thu-reply
Both scores come from the same free extension, run inside your editor as you write.

Every number above is re-derived from published posts, not self-reported: https://peakd.com/@hdev/hivepulse-seo-contest-new-week-5-prize-pool-500-hive
```

## Fri 28 Aug, 14:00 — the friction remover

*Image: `social/w5-keyword.jpg`*

⚠️ **Check the stores before posting.** v1.13.1 was submitted, not confirmed live. If it
has not cleared review, post the alternate below instead — do not claim availability we
cannot verify.

```tweet fri-main
The focus keyword is worth 35 of the 100 SEO points, and choosing it was the step people got wrong most.

HivePulse v1.13.1 now picks it for you: it reads your draft, ranks the candidates, and scores each one before you commit.

Also new, blog.suseona.com support.
```

```tweet fri-alt
The focus keyword is worth 35 of the 100 SEO points, and it was the step people got wrong most often.

So we stopped making you guess. HivePulse v1.13.1 reads your draft, ranks the candidates and scores each one.

Rolling out to Chrome, Firefox and Opera this week.
```

```tweet fri-reply
Free, no account, no signup. Chrome build covers Brave, Edge and Opera.

Chrome: https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg
Firefox: https://addons.mozilla.org/en-US/firefox/addon/hivepulse/
```

## Sat 29 Aug, 14:00 — the saveable one

*Image: `social/w5-audit.jpg`*

No product in the tweet, deliberately. This has to be worth keeping to someone who will
never install anything — that is what makes it travel.

```tweet sat-main
A 30-second audit for anything you have published. No tools.

1. Read your first sentence alone. Does it answer the title, or clear its throat?

2. Find a sentence starting with This or It. Read it alone. Does it still mean anything?

3. Count the "it"s that should be nouns.
```

```tweet sat-reply
Those three questions are most of what an AI answer engine is actually testing when it decides whether to quote you.

We score them automatically, but you do not need us to run the audit.
```

## Sun 30 Aug, 14:00 — the referral mechanic

*Image: `social/w5-referral.jpg`*

```tweet sun-main
Most contests make you compete with everyone you tell about them.

This one pays you for it.

They write "referred by @you" → you both get 25 HIVE.
The field grows → the pool everyone competes for grows.

Bringing a rival is the highest-yield move on the board.
```

```tweet sun-reply
Two referrals each, they have to be genuinely new to the contest, and the entry has to be real. We check both.

Rules: https://peakd.com/@hdev/hivepulse-seo-contest-new-week-5-prize-pool-500-hive
```

## Mon 31 Aug, 14:00 — the one hard CTA

*Image: re-render the tier card with the live count first —
`python scripts/make_week5_charts.py --entries N`*

Highest-intent post of the week. Last round this format produced the only real
conversations on the account. **Block out the evening to answer every reply.**

```tweet mon-main
48 hours left on the HivePulse SEO Contest.

Reply with a link to your draft or published post and we will tell you exactly what is costing you points. Free, whether or not you enter.

Twice this month the top-scoring post of the week won nothing. It missed one tag.
```

```tweet mon-reply
Current count is N entrants, so the pool sits at X HIVE. Ten gets it to 400.

https://peakd.com/@hdev/hivepulse-seo-contest-new-week-5-prize-pool-500-hive
```

## Tue 1 Sep, 13:00 — close

*Image: `social/w5-final.jpg`*

```tweet tue-main
Final day. Closes tonight, 23:59 UTC.

Publish, score it, comment your link and your screenshot, tag #hivepulse.

The tag is not optional and it is not a formality. It has decided the podium in two of the last four rounds.
```

```tweet tue-reply
Referred by someone? Add "referred by @name" to your comment and you both get 25 HIVE if your post qualifies.

https://peakd.com/@hdev/hivepulse-seo-contest-new-week-5-prize-pool-500-hive
```

---

## Running the quote-RT contest

The 50 HIVE prize is attached to [the launch thread](https://x.com/HdevCore/status/2092261884963467626)
and that tweet is the only valid anchor. Everything else this week should feed it.

**Bump it twice**, as a quote-RT of our own anchor — Wed and Sun. A self-quote resurfaces
the anchor in timelines without burning a new slot, and every new QRT of the anchor
raises the odds someone's followers see it:

```tweet qrt-bump-1
Still open: 50 HIVE for the best answer to this.

One line from your last post that you would change. The sentence that buries your point, or the one an AI would never quote.

Quote this tweet with it. We are replying to every single one with what we would change.
```

```tweet qrt-bump-2
Closing this one Tuesday. 50 HIVE for the single most useful answer.

The sentence in your last post you would take back — and why.

No tagging friends, no follow-for-follow. Just the answer.
```

**Judging it:** pick the one that teaches the most people, not the most self-deprecating.
Reply publicly with the rewrite, and quote the winner when you announce — the winner's
own audience is the reach you are actually buying with the 50 HIVE.

## Reusable copy

**Hive comment (post under the announcement, Wed and again Sun):**

> **Running count: 2 entries.** Eight more and the pool goes from 300 to 400 HIVE — 200 / 100 / 60 / 40 instead of 150 / 100 / 50.
>
> That is automatic. Every person who enters raises what everyone else can win, which is why the referral bonus exists: bring someone genuinely new, they write "referred by @yourname", and **you both get 25 HIVE** when their entry qualifies.
>
> Closes 1 September, 23:59 UTC.

**Discord (`#announcements`, Wed):**

> 📊 **Week 5 entry count: 2.**
>
> 8 more entrants and the pool goes **300 → 400 HIVE**. 20 and it is **500**, top prize 250. Automatic, not a maybe.
>
> 💸 Bring someone new → **you both get 25 HIVE**
> 🐦 50 HIVE for the best quote-RT on X: <https://x.com/HdevCore/status/2092261884963467626>
>
> Closes **1 Sept, 23:59 UTC**. Link + screenshot in the comments, tag `#hivepulse`.

---

## Images

All six exist. Regenerate with:

```
python scripts/make_week5_charts.py --entries N    # tier + correlation
python scripts/make_week5_cards.py                 # the four text cards
```

**Both are free to re-run.** The artwork underneath is Gemini-generated and already
paid for — it lives in `social/plates/` and is reused, so re-rendering the tier card
with a new entry count costs nothing. Only a new *plate* bills.

| Plate | Generated | Used by |
|---|---|---|
| `plates/plate-ascend.jpg` | Nano Banana Pro, 2K, $0.134 | referral card, tier chart |
| `plates/plate-lines.jpg` | Nano Banana Pro, 2K, $0.134 | audit card, correlation chart |
| `plates/plate-shards.jpg` | Nano Banana Pro, 2K, $0.134 | keyword card, final-day card |
| `plates/gemini-text-test.jpg` | Nano Banana Pro, 2K, $0.134 | not used — see below |

**Why the text is composed rather than model-rendered.** `gemini-text-test.jpg` is a
control: the same audit card asked of the model as a finished poster, text and all. It
spelled every word correctly and the typography was good. It also invented a
card-within-a-card frame nobody asked for, could not place the real HivePulse mark, and
cost $0.134 for one attempt that would need a manual spell-check before every use. The
tier card alone is re-rendered several times a week with a live number. Model-rendered
plates plus composed type gets the visual quality without paying, or proof-reading,
on every regeneration.

| File | Used | Carries |
|---|---|---|
| `social/w5-tier.jpg` | **Wed, Mon** | The ladder, where the count sits on it, and both multipliers. Re-render for the live number before every use. |
| `social/w5-correlation.jpg` | Thu | 28 posts on both axes, plus the correlation trend 0.73 → 0.58 → 0.47 as its own panel. |
| `social/w5-keyword.jpg` | Fri | What the keyword button does and why 35 points ride on it. |
| `social/w5-audit.jpg` | Sat | The three audit questions, verbatim and saveable. |
| `social/w5-referral.jpg` | Sun | The referral arithmetic — both payouts, and the checks. |
| `social/w5-final.jpg` | Tue | The four entry steps and the deadline. |

### Alt text — paste into X's "Add description" field

X supports image descriptions and almost nobody uses them. Given that half this account's
subject is whether machines can read your writing, shipping images no screen reader can
parse would be an odd look.

| File | Alt text |
|---|---|
| `w5-tier.jpg` | Prize ladder for the HivePulse SEO Contest showing three tiers — 300 HIVE under 10 entrants, 400 HIVE at 10 to 19, 500 HIVE at 20 or more — with a progress bar marking the current count of 2 entrants in the bottom tier. |
| `w5-correlation.jpg` | Dumbbell chart of 28 Hive blog posts, each showing its SEO score and its AI-quotability score, sorted by the gap between them. A side panel gives the correlation falling from 0.73 at 14 posts to 0.58 at 25 to 0.47 at 28. |
| `w5-keyword.jpg` | HivePulse v1.13.1 release card headlined "It now picks the keyword for you", explaining that the focus keyword carries 35 of the 100 SEO points and that the suggest button reads the draft and scores each candidate. |
| `w5-audit.jpg` | Card titled "The 30-second audit" listing three checks: read your first sentence alone, test a sentence starting with This or It in isolation, and count the times you wrote "it" where a noun belongs. |
| `w5-referral.jpg` | Card explaining the contest referral bonus: an entrant writing "referred by @you" earns 25 HIVE for each of you, and a larger field raises the prize pool everyone competes for. |
| `w5-final.jpg` | Final-day card for the HivePulse SEO Contest listing the four entry steps — publish with the analyzer open, comment your link and screenshot, tag #hivepulse, score SEO 70 or above — above the 23:59 UTC deadline. |

**Dataset note.** The 28-post figure is weeks 1, 2 and 4 at one row per post, plus week 3
as the seven per-author rows published in the week-4 announcement — `contest-results.csv`
was overwritten with week 4 before week 3 was archived, so the raw week-3 rows are gone.
Every row is a real published score. Do not describe it as "every post we have scored";
it is every post whose row we still hold.

## What to watch

| Signal | Meaning |
|---|---|
| **Entrants at Sun 30** | The only number that matters. Under 6 and the tier mechanic has failed — say so publicly and change the offer for week 6 rather than repeating it. |
| Quote-RTs on the anchor | Whether 50 HIVE can buy reach past our own followers. If it draws under 5, stop paying for QRTs. |
| Replies to Mon 31 | Direct intent, and the best conversion lever the account has. |
| Whether Thu beats the tier posts | If data beats contest content for a third week running, the account's main product is the research and the contest should ride underneath it. |
| Referrals claimed | If zero, the bonus is too complicated, not too small. Simplify before raising it. |

**Standing decision to make on 1 Sep:** four rounds at seven entrants, with a tiered pool
and a referral bonus added, is enough evidence either way. If week 5 lands at seven
again, the constraint is not the prize — it is that the contest only reaches people who
already follow @hdev. Week 6 should then buy distribution (a community collab, a
delegation-backed partner, or an existing Hive contest curator) rather than raise the
pool again.
