# Week 18 post — everything it has to carry

One place to look on judging day. Two topics, and the proposal ask has its own file.

1. **The focus keyword disclosure and the bug bounty** — below.
2. **The DHF proposal ask** — `enhancements/week18-proposal-plan.md`, gated on
   `node scripts/check-proposal.mjs`.

---

## The focus keyword, and why the panel and the result can differ

@itx.wardah reported on 17 Nov that her focus keyword changed when she reloaded the page,
and her score changed with it: `the` / SEO 100 before, `sister` / SEO 96 after. She was
right, three times over, and all three were ours. Fixed in 1.18.0.

**This has to be said in the post rather than left in a Discord thread**, because the
panel/result gap affects everyone and is currently documented nowhere an entrant reads. It
is the same class of surprise as the readability mismatch @ahmedabbaci reported, and that
one we explained publicly.

### Draft section

```markdown
### Your focus keyword, and why the panel and the result can differ

@itx.wardah reported that her focus keyword changed when she reloaded the editor, and that her score changed with it. She was right, and there were three separate bugs behind it.

**Your keyword was never saved.** It lived only in the open page, so a reload threw it away and the analyzer quietly picked a new one. It is now remembered per draft.

**The keyword it picked depended on timing.** The analyzer takes candidates from your title but ranks them by how often they appear in your body - so if it ran before your post had finished loading, it ranked them against an empty page. One of her drafts produced three different keywords depending on when it fired. It now waits for both.

**And it let "the" be a focus keyword, scoring it a perfect 35/35.** That is the one worth understanding, because it means a number some of you have seen was too high. "the" scores perfectly for a reason that has nothing to do with writing: it is in your title, your URL, your subheading, your first sentence and your description - because it is in everyone's. Nobody searches for "the". The contest judge has always refused stopwords, which is why the published result was lower than the panel. **The panel was wrong, not the result.** It now tells you a stopword cannot be a focus keyword instead of showing you a score you cannot win with.

**One thing that is not a bug and is worth knowing.** The judge cannot see the keyword you chose, because it is not stored on the blockchain - only your post is. So it picks the best keyword it can derive from your title. Panel and result can therefore differ slightly even when everything works, and the judge will never pick a stopword for you.

**We paid @itx.wardah 100 HIVE for the report.** To be exact about what that is: a bounty for finding the bugs, not a change to her placing. Her 4th place in week 16 stands, because re-scoring a paid round would be unfair to the four people judged alongside her - that is the mistake that cost @nursejoe third place in week 14 and we are not repeating it. We would rather pay openly for a good bug report than fix it quietly and say nothing.
```

### Why the 100 HIVE must appear in the post

It is a **discretionary** payment and it is labelled as one everywhere it exists — in the
payout console's comment, in the on-chain memo, and here. Booking it as a prize adjustment,
a referral, or an unexplained "top-up" would tell every other entrant that placings are
negotiable after the fact, and it would do that silently. A payment that only appears in the
internal sheet is the problem; @katerinaramm's 25 HIVE nearly went out that way.

## Still open, decide before publishing

- **The no-keyword denominator.** A post with no valid keyword is scored out of 65 rather
  than 100, so rejecting a stopword can leave the *percentage* slightly higher than a weak
  real keyword would give — `the` lands at 98% against `sister` at 95% on her post. It
  changes no contest result, because the judge picks its own keyword and never sees the
  author's, but it is odd and a sharp entrant will spot it. Not changed here: it is a
  rubric change and week 17 is open.
