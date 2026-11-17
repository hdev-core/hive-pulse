# Week 18 plan: carrying the Hdev proposal #3 ask into the contest

## The numbers, read off chain on 17 Nov 2026

| | |
|---|---|
| Proposal | **#391** — "Hdev team DHF proposal #3", [@hdev/hive-dev-proposal-3](https://peakd.com/@hdev/hive-dev-proposal-3) |
| Receiver | `@hdev.fund` |
| Ask | **275 HBD/day**, 1 Dec 2026 → 31 Dec 2027 (~108,625 HBD over 395 days) |
| Support now | **44,796,025 HP** from **98 voters** |
| Return proposal | **47,140,047 HP** |
| **Gap to cross** | **2,344,022 HP — 5.0% short** |
| Rank | **6th of 20 votable.** The return proposal is 5th, directly above us |
| Starts in | **13.4 days** |

**It is close, not hopeless.** Five percent is a handful of mid-sized stakeholders, or one
whale, or a few dozen ordinary accounts. It is not a rounding error either.

## Waiting for week 18 is the wrong call, and here is why

Week 17 closes **24 November**. Week 18 would therefore run 24 Nov → 1 Dec, and its
announcement publishes on the 24th. **The proposal starts paying on 1 December** — the same
day week 18 closes. That gives a week-18 ask seven days of runway, and it spends them
against a proposal that is already below the line.

Meanwhile the week 17 post went live today and has its largest audience in the next 48
hours, and the X thread is already out.

**So: ask now, and structure it into week 18.** Not one or the other.

### Do this week (no new post required)

1. **A comment from @hdev on the live week 17 post.** Normal practice, visible to everyone
   already reading, and costs nothing. Draft below.
2. **One reply tweet** on the existing thread. The thread is about the contest paying out;
   the reply says where that money comes from.
3. **The Discord announcement** has already gone out — a short follow-up message in the same
   channel is cheaper than editing it.

### Then in the week 18 post (published 24 Nov)

Give it a real section, not a footer link. By then the proposal is a week from starting and
the ask is concrete rather than abstract.

## The honest framing, and it is already true

The proposal's own budget table says:

> | Outreach and growth (socials, marketing and contest payouts) | 18% | 51 HBD/day |

**The 600 HIVE paid out last week came from there.** That is the whole argument and it needs
no spin: the contest is not free, it is funded, and this is the thing that funds it. The
proposal also lists "keep running its weekly contests" under upcoming work.

Entrants deserve to know where their prize money comes from. Telling them is transparency,
not salesmanship.

## Hard rules for how this is asked

These are not optional and they are the difference between an ask and a bribe.

1. **A vote must never be a condition of entry, and must never affect a score.** Not stated,
   not implied, not winked at. The contest is judged by an engine on published criteria, and
   the moment a vote could move a placing the whole thing is worthless.
2. **Do not tie it to prize money in the other direction either** — no "vote and the pool
   goes up", no "winners are expected to vote".
3. **Say what a vote costs: nothing.** It does not spend or lock HP, it can be removed at
   any time, and it does not reduce anyone's stake or curation. Most people who do not vote
   on proposals assume otherwise.
4. **Do not ask anyone to unvote the return proposal.** It would work, and it reads as
   gaming the mechanism rather than earning support.
5. **Link the proposal post, not just the vote button**, so people can read what they are
   funding and disagree with it.

## Draft — comment on the live week 17 post

```text
One thing worth saying out loud, since this round paid out 600 HIVE.

That money is not ours. It comes from the Hive DHF, through our team proposal, which has a line in its budget for exactly this: "Outreach and growth (socials, marketing and contest payouts) — 18%".

**Hdev team DHF proposal #3 is currently about 5% below the return proposal**, which means that as things stand it is not funded. It starts on 1 December. If it stays below the line, the contest gets smaller or it stops - and the rest of the work it pays for slows down too: haf_fyp, the block explorer, HivePulse itself, the public API nodes.

A proposal vote costs nothing. It does not spend or lock your HP, it does not touch your curation, and you can remove it whenever you like. Most people assume otherwise, which is part of why proposals sit below the line.

Read it first and disagree with it if you want to - that is the point of it being public:
👉 https://peakd.com/@hdev/hive-dev-proposal-3

And to be explicit, because it matters: **this has nothing to do with the contest.** Voting does not affect your score, your placing or your prize. The judge is a script and it does not know who voted. We are telling you where the money comes from because you should know, not to buy anything.
```

## Draft — reply tweet on the existing thread

```tweet
Worth saying where that 600 HIVE came from.

Not us. The Hive DHF funds it, through our team proposal — which is currently ~5% below the return proposal and starts 1 Dec.

A proposal vote costs nothing and is reversible.

https://peakd.com/@hdev/hive-dev-proposal-3
```

## Draft — section for the week 18 post

Place it after the results and before "Week 18 is open", so it sits in the body rather than
looking like a footer.

```markdown
### Where the prize money actually comes from

This contest has paid out thousands of HIVE this year and none of it came out of our pockets. It comes from the Hive DHF, through our team proposal, which sets aside 18% of its budget for outreach, socials and contest payouts.

**That proposal is currently below the return proposal**, which in practice means unfunded. It began on 1 December. If it stays under the line the contest shrinks or stops, and so does the work around it - the For You feed that PeakD and HivePulse both serve, the block explorer, the public API nodes other apps run on, and HivePulse itself.

A proposal vote costs nothing. It does not spend your HP, lock it, or touch your curation rewards, and you can withdraw it at any moment. Read it and judge it on its own merits:

👉 **https://peakd.com/@hdev/hive-dev-proposal-3**

**This is separate from the contest and stays separate.** Your vote does not change your score, your placing or your prize - the judge is a script that re-reads your post from the blockchain and has no idea who voted for anything. We are telling you where the money comes from because you are entitled to know.
```

## Check before each publication

The gap moves daily. Re-read it rather than repeating the figure from here:

```
node scripts/check-proposal.mjs      # see below, or inline the list_proposals call
```

Specifically re-check **whether it is still below the line** before saying so. If it crosses,
the ask changes from "it is not funded" to "keep it above the line", and claiming otherwise
would be the kind of inaccuracy this project keeps publicly correcting in others' favour.
