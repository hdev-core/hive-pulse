# GEO rubric v2

**Effective from contest week 12 — the round opening 13 October 2026.**

Weeks 1 to 11 were judged on v1 and are not reopened. This must be announced in the week 11
results post *before* it takes effect, the same way the Reading Ease tiebreak was announced in
the week 10 results post. The contest's one durable promise is that rules are published before
a round and do not move during it.

## What was wrong

GEO scores whether an AI engine would quote a post. It had stopped doing that.

Across **all 70 contest entries ever scored**, **40 of them (57%) held a perfect 100**, and every
individual gate was maxed by **77–91%** of posts. Nothing failed and nothing warned; the number
simply stopped carrying information.

That is also the real reason the contest needed a tiebreak at all. When five entries finish on
200/200, something outside the score has to pick a winner.

## The diagnosis that was wrong

An agent review concluded the cause was structural: personal posts are judged on three checks
where informational posts get six, so personal posts were easier to max.

Measured, both branches saturate equally — **56% and 58%**. The rubric had gone soft everywhere,
not in one half.

## What changed

The same six ideas and the same labels, with harder top bands, plus one new gate.

| Gate | v1 full marks | v2 full marks |
|---|---|---|
| Opening hook | first paragraph 8–60 words | 12–45 words, or an explicit TL;DR |
| Self-contained sentences | under 10% open with a pronoun | under 8% |
| Clear subjects | pronoun density under 4% | under 3% |
| Q&A structure *(informational)* | one question heading | two |
| Definitions *(informational)* | two | three |
| Data & citations *(informational)* | 3 numbers + a source | 5 numbers + a source |
| **Concrete detail** *(personal, new, 15 pts)* | — | numbers and proper nouns ≥ 7.5% of words |

Two smaller corrections that previously inflated scores: a post with fewer than three sentences,
or fewer than forty words, used to receive **full** marks on the sentence and subject checks for
having shown nothing. Both now score 0.5.

**Concrete detail** is the one genuinely new thing an entrant will see. A story an AI can quote
names things — people, places, dates, numbers. "My friend helped me" is unquotable; "Ahmed walked
me through it on Discord for four hours" is a fact an engine can lift and attribute. Personal
posts previously cleared three easy gates and took 100, which is why half the field sat there.

## Measured effect, on the same 70 entries

| | v1 | v2 |
|---|---:|---:|
| At GEO 100 | 40 (57%) | **6 (9%)** |
| Median | 100 | 86 |
| Range | 60–100 | 57–100 |
| Personal branch at 100 | 22 / 39 | 3 / 38 |
| Informational at 100 | 18 / 31 | 3 / 31 |

Perfect stays reachable — six posts in the whole history still get there — but it has to be
earned. A first calibration put **nobody** at 100 with a median of 67, which is as useless in the
other direction. The bands above are the result of retuning against the corpus, not of judgement.

## Why this matters more than the tiebreak

Entries sharing the top combined score, and therefore needing a tiebreak at all:

| | wk 6 | wk 7 | wk 8 | wk 9 | wk 10 |
|---|---:|---:|---:|---:|---:|
| v1 | 4 | 3 | 4 | **5** | **5** |
| v2 | 2 | 1 | 2 | **1** | **1** |

Reading Ease was a workaround for a scoring engine that could not separate good from excellent.
With v2 it becomes a rare fallback rather than the thing quietly deciding the contest.

Applied to past rounds the top three moves in all five — which is the point, and also why it
cannot be applied retroactively.

## Parity

`compose.ts` shows the score while you write; `scripts/lib/seo-score.mjs` decides prize money. If
they disagree, an author sees one number and is paid on another — the worst bug class in this
repo.

`utils/geoRubric.test.ts` pins every band and asserts both files carry an identical set of
threshold→score pairs. Run against v1 it fails 10 of 11, so it is testing the change rather than
restating it.

It also asserts neither file contains stray control characters. A heredoc once turned four `\b`
word boundaries in `compose.ts` into literal backspace bytes (0x08) — invisible in a terminal,
and they silently changed what the regexes matched.

## Still open

- The **Concrete detail** row needs its hint copy reviewed before release; it is the only gate
  entrants have not seen before.
- Shipping it is a normal release: version bump, both builds, three store submissions.
