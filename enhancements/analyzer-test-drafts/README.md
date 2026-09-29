# Analyzer test drafts — v1.14.1

Four drafts for checking the fixes in 1.14.1 by hand, in a real editor. Paste each one into a
**draft** on PeakD or Ecency. Do not publish them.

For every draft, set these so the scores are comparable:

- **Title:** `HivePulse Post Analyzer: Image Syntax Test [2026]`
- **Preview description:** `A test draft for the HivePulse post analyzer. Identical prose, published twice, with the images written in two different ways.`
- **Tags:** `hivepulse seo test hive writing`
- **Focus keyword:** `post analyzer`

Draft D is a separate test and needs none of that — only its own body.

---

## The test that matters: A and B must agree

`a-html-images.md` and `b-markdown-images.md` are **the same post, word for word**. The only
difference is that A writes its four images as PeakD-style `<img src alt>` tags and B writes them
as Ecency-style `![alt](src)`.

Open them side by side. Every number in the panel should match.

| | words | ease | SEO | GEO |
|---|---:|---:|---:|---:|
| **A** — HTML images | 474 | 74 | 89 | 66 |
| **B** — markdown images | 474 | 74 | 89 | 66 |

What it looked like in 1.14.0, same two files:

| | words | ease | SEO | GEO |
|---|---:|---:|---:|---:|
| A — HTML images | **534** | **63** | 88 | 66 |
| B — markdown images | 474 | 74 | 89 | 66 |

Sixty words that nobody wrote, eleven points of reading ease, and a point of SEO — bought or
lost purely by which editor produced the post.

**Read the comparison, not the absolute numbers.** The panel scores the live editor DOM, so it
can land a point or two away from the table above depending on how the editor renders the paste.
A and B agreeing with *each other* is the thing being tested.

---

## C — alt text on HTML images

`c-html-images-no-alt.md` is the same post again, with the `alt` attribute removed from all four
image tags.

- **Expected:** Media drops to **4/9**, the hint reads `4 image(s) need descriptive alt text`,
  and SEO lands around **84** — five points below A.
- **In 1.14.0** this scored the same as A: the alt check only ever looked at `![alt](url)`, so a
  post written entirely in PeakD's editor kept those points no matter how bad its alt text was.

---

## D — the word-count bar

`d-exactly-1000-words.md` is built to land on **exactly 1,000 words** as the analyzer counts
them. It has no images, so nothing else is in play.

- The words pill should read **`1,000`** — the exact number, not `1.0k`.
- The filled part of the bar should stop **directly beneath the `1k` mark**.

In 1.14.0 the fill was correct but the scale numbers underneath it were spaced evenly across the
track, which put `1k` at the halfway point. A thousand words filled 40% of the bar and so read as
roughly 800 against those numbers.

---

## If you edit the prose

The fixtures are fixed text, and A, B and C must stay word-for-word identical apart from their
image markup. If you change a paragraph, change it in all three and re-derive the counts with
the engine rather than adjusting the table by eye:

    node scripts/score-post.mjs enhancements/analyzer-test-drafts/a-html-images.md
