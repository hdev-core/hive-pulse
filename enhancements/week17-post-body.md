![HivePulse SEO Contest Week 17 cover: 600 HIVE paid out in week 16 to three writers who tied on a perfect 200/200, and week 17 is open with 300 HIVE at five entrants rising to 600 at twenty](COVER_IMAGE_URL_HERE)

**Summary:** Five writers entered week 16, three tied on a perfect 200/200, and **600 HIVE paid out at 200 each**. Below: the ruling we made, a bug that would have paid you half, and how Reading Ease changes today.

## HivePulse SEO Contest week 16 results

Five writers entered. The threshold is five. Because the field reached it, the pool paid.

| # | Author | Post | SEO | GEO | Ease | Prize |
|---|---|---|---|---|---|---|
| 🥇 | @ahmedabbaci | [7 Days Time Table, The biggest [Proven] delusion of life](https://ecency.com/@ahmedabbaci/7-days-time-table-the-biggest-proven-delusion-of-life-) | 100 | 100 | 60 | **200 HIVE** |
| 🥇 | @nursejoe | [How to Prevent Food Poisoning (7 Simple Ways)](https://peakd.com/@nursejoe/food-poisoning-7-simple-ways-to-prevent-it-stay-healthy) | 100 | 100 | 60 | **200 HIVE** |
| 🥇 | @nabbas0786 | [How Does Homeopathy Help in Daily Life? 4 Ways](https://ecency.com/@nabbas0786/how-does-homeopathy-help-in-daily-life-4-ways-engurdu) | 100 | 100 | 60 | **200 HIVE** |
| 4 | @itx.wardah | [1 of The Best Well Spent Days](https://peakd.com/@itx.wardah/1-of-the-best-well-spent-dayshad-good-time-with-my-sister) | 96 | 100 | 60 | - |
| 5 | @fluer | [The No.1 Best Way To Spend Weekends: Crochet For My Mother](https://peakd.com/@fluer/the-no1-best-way-to-spend-weekends-crochet-for-my-mother) | 89 | 79 | 73 | - |

Three entries finished on an exact SEO 100 / GEO 100. Under the tie rule they share the three slots they span - 300 + 200 + 100 = 600, divided three ways, **200 each**. Nobody was separated by who published first, and nobody was pushed off the board by a tiebreak nobody can see.

**The pool was 600 because week 15 fell one entrant short and its 300 rolled forward.** However, that rollover is now spent, so week 17 is worth less - more on that below, and it is an honest number rather than a flattering one.

**A welcome to @fluer, who is new.** This contest gained exactly one new entrant across weeks 11 to 14, and the five-entrant threshold exists precisely because the constraint here is discovery, not writing quality. @fluer entering is the difference between this round paying 600 and paying nothing.

**Nobody claimed a referral again.** That is 25 HIVE each way, for both of you, sitting unclaimed for the fourth round running. If someone brought you here, name them in your entry comment.

### The judgement call on @ahmedabbaci's entry

He commented with a link to a post that carried no `#hivepulse` tag and scored SEO 60, below the 70 bar. On the strictest reading that is not a qualifying entry, the field is four, and **nobody gets paid for the second round running**.

He had also published a different post inside the window - tagged `#hivepulse`, scoring a perfect 200/200 - which he never linked. Rule 6 as published says *"You may enter more than one post. Your highest-scoring tagged post counts."* We applied rule 6. The tagged post was judged, the field was five, and the round paid.

**We are telling you this because a precedent set quietly is not a precedent.** If we had buried it, the next person in the same position would have no way of knowing which way it goes. The ruling also means four other writers did not lose 600 HIVE over somebody else's formatting mistake.

It is the second round running that a tagged, in-window, qualifying post nearly went uncounted on a submission technicality - @ekads lost week 15 the same way. **So rules 4 and 6 are rewritten below.** Read them.

### We found a bug that would have paid you half

While judging this round, the prize pool printed as 300 HIVE, not 600.

The rollover logic was written for week 15, tested on these exact numbers, and had week 16 named in its own worked example - and the judging script never actually called it. Every winner would have received 100 instead of 200. Worse, because this makes the second time a prize rule has been written, tested, and then never wired into the thing that uses it.

It is fixed, and the fix is not just the one line. The script now refuses to run at all when the previous round paid nothing and no carried-over pool has been set, and it prints how the pool was arrived at - `600 = 300 base + 300 carried forward` - so a wrong number is visible rather than silent. The tests now read the judging script itself rather than the library it is supposed to use, because **a tested library that the shipping code never calls proves nothing.**

## Reading Ease is measured differently from today

@ahmedabbaci reported that one of his posts showed **60** in the HivePulse panel while he was writing and **57** once published, and asked which was right.

**57 was right the whole time.** We were counting every line break as the end of a sentence. A line break inside a paragraph is not a sentence ending - it is the width of your editor window, and it vanishes the moment the post renders. So the panel was inflating the score with something that does not exist in the published post.

That is fixed from today. Two things follow, and they are different sizes:

- **The Reading Ease number drops a little.** On week 16's five entries it fell by 3, 3, 3, 3 and 1 - an average of 2.6. Across every post ever entered in this contest the average fall is about 4.
- **Your SEO score barely moves.** Those same five posts went 100, 100, 100, 96, 89 to 99, 99, 99, 95, 89. Readability is 8 of the 100 SEO points. **The week 16 podium would be identical under the new rule.**

What it actually removes is free score that had nothing to do with writing:

- **Five lines of `---` - fifteen characters, no words - were worth enough to move an entry from 99.5 to a perfect 100.** That is the exact margin that moved 100 HIVE in week 14.
- Hard-wrapping a post at 60 columns was worth up to **17 points of Reading Ease**.
- A fenced code block was measured as one enormous sentence, so your score depended on whether the comments inside it started with `#` or `//`.

All three now pay exactly nothing, because none of them is writing. **The top band still starts at 60 and we did not move it to compensate.** 60 is the standard plain-English line, and shifting the ruler to protect a pass rate would make the number meaningless. A perfect 5/5 on readability is genuinely harder this week than it was last week, and we would rather say that than quietly re-grade.

## Week 17 is open - 300 HIVE, rising to 600

**Week 17 runs from 17 November to 24 November 2026, 12:00 UTC.**

| Qualifying entries | Pool | Split |
|---|---|---|
| Fewer than 5 | **Nothing - the pool rolls into week 18** | - |
| 5 - 9 | **300 HIVE** | 150 · 100 · 50 |
| 10 - 14 | **400 HIVE** | 200 · 100 · 60 · 40 |
| 15 - 19 | **500 HIVE** | 250 · 120 · 80 · 50 |
| 20 or more | **600 HIVE** | 250 · 150 · 100 · 60 · 40 |

**Last week said 600 and this week says 300, so here is the honest explanation.** The 600 was 300 for the round plus 300 that rolled over from week 15, which paid nothing. Week 16 paid, so there is nothing left to roll. The base pool depends on how many of you enter, and it always has - **five of you makes it 300, twenty of you makes it 600.** The number is not a reward we decide, it is a function of the field.

### How to enter

1. Install [HivePulse for Chrome](https://chromewebstore.google.com/detail/hivepulse/hakcpohpejoejmlhiphpkjobpjeckdlg) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/hivepulse/).
2. Write and publish a new post on any supported Hive frontend with the analyzer open.
3. **Publish it inside the round window** - between the two dates above.
4. **Tag the post `#hivepulse`** - one word, no space, in the tags and not only in the body. **An untagged post cannot be judged, however good it is.**
5. **Comment below to enter the round.** Include your post link; a screenshot of the SEO and GEO panel is welcome but not required.
6. **Your highest-scoring tagged post from inside the window counts** - whether or not it is the one you linked. Enter as many as you like. **Commenting is what enters you; the tag is what makes a post eligible.**
7. If someone referred you, say so in your entry comment and name them. When the entry qualifies, **both of you receive 25 HIVE**. The referred person must be new to the contest, with an account at least 30 days old.

The minimum qualifying score is **SEO 70**. Any language is welcome. Every entry is re-scored from the blockchain after the round closes.

**Rules 4, 5 and 6 changed this week** and they are the three above in bold. Previously the post you linked was the only one considered, which twice nearly cost everybody the whole pool over a missing tag or a wrong link. Now: comment to enter, tag to qualify, best tagged post wins. Nothing else changed.

**Ties split the prize.** Two tied for first share 1st and 2nd and take half each. Three tied share all three places - that is week 16, 200 each. **And if more of you tie than there are places, everyone in the tie is paid**: five writers tied for three slots share all three, 120 each. The total paid never changes, only how many of you receive it. There is no advantage to publishing first, so take the week - draft it, score it, fix it, then publish.

**Reading Ease is the whole number HivePulse shows you,** and from today it is the same number your published post receives. The combined score is `(SEO% + GEO)/2`, compared exactly: 99.5 is not a tie with 100.

### The 50 HIVE X prize

Quote-retweet the Week 17 announcement tweet with your own words about your HivePulse experience. The quote-retweet with the most likes, reposts and replies combined at the close wins 50 HIVE. Your quote-retweet must target the announcement itself, not a reply or your own post. No engagement farming.

**Paste the link in your entry comment** - and you need an entry for it to count.

👉 **This is the tweet to quote:** WEEK17_TWEET_URL_HERE

@nabbas0786 won it again this round, unopposed, for the second week running. The prize is 50 HIVE for one quote-retweet, and four of you are leaving that on the table every week.

### What this is, in case you are new here

**HivePulse is a free browser extension** that scores a Hive post for Google and for AI assistants before you publish it. No paywall, no token, nothing to buy.

**We run this contest for two reasons, both true.** Hive's writing is close to invisible to Google and to ChatGPT, and we want more of it optimised. And every round tells us where our own scoring is wrong. This round told us three things, for example: our panel had been inflating Reading Ease for everyone, our payout code would have paid half the pool, and our entry rules contradicted each other badly enough to nearly void two rounds running. We found all three, fixed all three, and are telling you about all three - because you would want to know, and because a scoring tool that hides its own mistakes is not worth installing.
