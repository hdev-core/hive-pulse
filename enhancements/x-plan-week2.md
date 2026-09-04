# X plan — HivePulse SEO Contest, week 2 (5–11 Aug 2026)

Account: **@HdevCore** · Contest closes **Tue 11 Aug, 23:59 UTC** · Announcement thread posted Tue 4 Aug.

---

## Strategy

### The problem this week has to solve

Week 1 drew **19 comments but only 7 entrants**. Interest was never the bottleneck — conversion was. The comments name the friction precisely:

- *"when I tried to download it through Chrome, it wouldn't let me"* — @militadigital01
- *"didn't found the description button"* — @nabbas0786
- *"where can i add Preview Description?"* — @mein-senf-dazu
- *"this also should be available for Android/Mobile"* — @nabbas0786 (now shipped)

Every one of those is a solvable, teachable obstacle. **The single highest-leverage thing this week is friction-removal content, not more hype.** Three of the seven posts below exist purely to convert a lurker into an entrant.

Second structural fact: week 1 entries clustered in the back half (two by 1 Aug, five between 2–4 Aug). Plan accordingly — **educate early, create urgency late**.

### The growth loop week 1 left on the table

Entries went into Hive comments only. The score screenshot is exactly the "shareable moment" that drives extension installs — a specific number the user is proud of. It never reached X.

**Change for week 2: ask entrants to post their score on X and tag @HdevCore.** Then quote-tweet them. Every entrant becomes distribution, entrants get extra visibility for their post, and the timeline fills with social proof that costs nothing to produce. This is the single biggest addition to the plan.

### Pillars

| Pillar | Share | Purpose |
|---|---|---|
| GEO education | 35% | Reach **beyond** Hive — AI-search is a hot topic, this travels |
| Friction removal | 25% | Convert lurkers → entrants |
| Social proof | 25% | Winners, entries, quote-tweets |
| Product / v1.12.0 | 15% | Installs |

### Cadence and timing

**Two posts a day**: an anchor at **14:00 UTC** (US morning + EU afternoon) and a lighter one at **19:00 UTC** (US midday + LATAM). Threads on Thu and Sun only — over-threading burns the audience.

**Keep links out of the main post.** Put the URL in the first reply; X suppresses reach on posts with external links. The only exception is the final-day urgency post, where the click matters more than the reach.

**Pin the week-2 announcement thread** for the whole week.

---

## The week

### Wed 5 Aug — Week 2 opens

**14:00 — anchor** (attach the cover image)

> Week 2 of the HivePulse SEO Contest is open. 300 HIVE.
>
> Optimize your next Hive post with the free analyzer, comment your score, tag #hivepulse.
>
> Last week's winner scored 97 SEO / 100 GEO. That's the bar.
>
> Closes Tue 11 Aug, 23:59 UTC.

*Reply with:* link to the announcement post.

**19:00 — friction killer #1**

> Empty preview description = 10 lost points. 15 seconds to fix.
>
> PeakD → "Short preview description", under the editor.
> Ecency → Story preview step, the box under the greyed title. Pre-filled from your post, so it looks like your text — it isn't.
>
> HivePulse flags it when empty.

*275 characters. Attach `enhancements/images/social/wed-description.jpg`.*

**Verified — PeakD from a live screenshot, Ecency from its open source (`ecency/vision-web`):**

- **PeakD** — input labelled "Short preview description", directly below the editor body and above Topics, 0/120 counter.
- **Ecency** — in the step-2 "Story preview" modal. `PublishValidatePostMeta` renders exactly two controls: the title as `disabled` (read-only), then a textarea bound to `metaDescription` with `maxLength`, placeholder `publish.preview-subtitle` = **"Preview subtitle.."**. The note beneath is `publish.description-hint` = *"Helps to search engine systems to find out this post"*.
  **Why it confuses everyone:** Ecency pre-fills that box from the body summary (`postBodySummary(content, …)`), so it displays your post text and reads as a content field. Typing in it writes to `metaDescription` only — your post is untouched.
- **InLeo** — unverified, deliberately omitted. All eight week-1 entries came from Ecency or PeakD.

*This also explains `compose.ts`: it matches `textarea[placeholder*="subtitle" i]` because Ecency's English placeholder is "Preview subtitle..", and needs the `textarea[maxlength]` fallback because localised builds render it "Voorbeeld ondertitel.." / "Anteprima sottotitolo..".*

⚠️ **Never assert a per-frontend UI path without checking the live editor or the frontend's source.** An earlier draft invented "PeakD → Post Options / Ecency → step 2 / InLeo → Preview Description"; all three were wrong and the post was pulled.

⚠️ **Do not add per-frontend menu paths to this post without opening each frontend and confirming.** An earlier draft asserted "PeakD → Post Options / Ecency → step 2 / InLeo → Preview Description"; all three were invented and the post was pulled. The analyzer itself never looks for a menu path — `getMetaDescription()` in `compose.ts` matches the field by placeholder text (`preview`, `descri`, `beschr`, `excerpt`, `subtitle`, `summary`, `resum`), plus an Ecency fallback that finds the `textarea[maxlength]`. Frontend-agnostic wording is safer and ages better.

---

### Thu 6 Aug — GEO thread (the reach play)

**14:00 — thread, 6 posts.** Aimed at the wider SEO/AI-search audience, not just Hive. This is the post most likely to travel.

> **1/**
> We scored 8 blog posts on two axes last week: classic SEO, and whether an AI can quote them.
>
> SEO averaged 89%.
> The AI-quotability scores ranged from 60 to 100.
>
> Everyone is optimizing for the search engine they grew up with. 🧵

> **2/**
> Google ranks pages. ChatGPT, Perplexity and AI Overviews *quote passages*.
>
> Those are different games.
>
> A page can rank #1 and never get quoted once — because no paragraph in it survives being lifted out of context.

> **3/**
> The pattern in our data was blunt.
>
> All three winners scored a perfect 100 on quotability.
>
> The entries that lost weren't worse written. They were less *extractable*.

> **4/**
> Habit 1 — open with the answer.
>
> Put the payoff in the first 8–60 words, before any preamble.
>
> An answer engine reads the top of your page and decides in one pass whether there's anything worth lifting.

> **5/**
> Habit 2 — write self-contained sentences.
>
> "This shows a 40% improvement" means nothing quoted alone.
> "Switching to X improved retention 40%" survives on its own.
>
> Assume every sentence gets read with none of the others.

> **6/**
> Habit 3 — kill the pronoun fog.
>
> Repeat the actual noun where you'd normally write "it" or "they".
>
> Reads slightly repetitive to a human. Reads unambiguous to a machine. That trade is worth making.
>
> Free tool that scores this as you write 👉 (link in reply)

**19:00 — pull the strongest line out as a standalone**

> A page can rank #1 on Google and never get quoted by ChatGPT once.
>
> Ranking and being quoted are different games, and almost nobody is playing the second one yet.

---

### Fri 7 Aug — Product + first winner spotlight

**14:00 — v1.12.0**

> HivePulse v1.12.0 is out.
>
> 📱 Firefox for Android — it runs on your phone now
> 🌐 Opera support
> 🦥 SlothBuzz + Ureka frontends
> 🐞 Hover-card reputation showed 25 for everyone. Fixed.
>
> Every one of those came from a user telling us. Days, not quarters.

**19:00 — winner spotlight**

> Last week's winner wrote a guide to treating mosquito bites with a heat pen.
>
> Not a crypto post. Not an SEO post. A genuinely useful thing they'd actually tested.
>
> 97 SEO / 100 GEO.
>
> Optimization doesn't mean writing for robots. It means making good work findable.

---

### Sat 8 Aug — Community, lighter

**14:00 — the tutorial winner (this one converts)**

> Our 3rd place winner had never used HivePulse before.
>
> So they wrote a step-by-step install guide, in Spanish and English, with 20 screenshots — and scored 94/100 doing it.
>
> If you're not sure where to start, start there. (link in reply)

**19:00 — engagement, low effort**

> Honest question for anyone who writes online:
>
> Do you know whether your posts show up in ChatGPT or Perplexity answers?
>
> Most people have no idea. That's not a criticism — there's barely a tool for it.

---

### Sun 9 Aug — Tactical recap + halfway nudge

**14:00 — the 3 habits as one saveable post** (make a simple image of these three lines — saves and reshares beat text here)

> Three habits produced every perfect AI-quotability score in our contest:
>
> 1. Open with the answer, in the first 8–60 words
> 2. Write sentences that survive being quoted alone
> 3. Name your subjects — repeat the noun, drop the "it"
>
> That's it. That's the whole trick.

**19:00 — nudge**

> Two days left in the HivePulse SEO Contest. 300 HIVE.
>
> Seven people entered last week. Three won.
>
> Those are not bad odds.

---

### Mon 10 Aug — Urgency + open offer

**14:00 — the offer** (highest-conversion post of the week)

> 24 hours left.
>
> Reply with a link to your draft or published post and we'll tell you exactly what's costing you points — description, headings, links, quotability.
>
> No catch. We'd rather you enter with a good score than not enter.

*Answer every single reply. This is the post to clear your calendar for.*

**19:00 — checklist**

> Entering the HivePulse contest tomorrow? The 60-second checklist:
>
> ✅ Post published 5–11 Aug
> ✅ Tagged #hivepulse ← enforced this week
> ✅ Meta description filled
> ✅ Comment your link + score screenshot
> ✅ SEO 70+ to qualify

---

### Tue 11 Aug — Final day

**13:00**

> Final day. HivePulse SEO Contest closes tonight, 23:59 UTC.
>
> 🥇 150 HIVE
> 🥈 100 HIVE
> 🥉 50 HIVE
>
> Post, score, comment, tag #hivepulse. (link in reply)

**20:00 — last call** *(link in body is fine here — the click matters more than reach)*

> ~3 hours left. Anything published before 23:59 UTC counts.
>
> If your post is already live, you just need to comment the link and your score screenshot.

---

### Wed 12 Aug — Close and tease

**14:00**

> Week 2 is closed. Judging now — every entry re-scored directly from the blockchain, screenshots not taken on trust.
>
> Winners announced within 5 days.
>
> [entry count] entries this week, up from 7. Thank you.

*Fill in the real number. If it isn't up from 7, drop the comparison rather than spin it.*

---

## Reply templates

Keep these to hand — the same questions recur.

**"It won't install on Chrome"**
> Try the Firefox build, or Opera/Brave/Edge with the Chrome link — all Chromium browsers work. If it still fails, tell us the error and we'll fix it, that's happened before and it was on us.

**"Where's the description field?"**
> On PeakD it's "Short preview description", right under the editor. On Ecency it's the second box in the Story preview step — unlabelled, which is why it's easy to miss. Worth 10 points, takes 15 seconds.

**"Does it work on mobile?"**
> Yes, as of v1.12.0 — Firefox for Android. Someone asked for it in last week's contest and it shipped.

**"Is my language OK?"**
> Any language. Last week's winner wrote in English and German, third place in Spanish and English.

**"What's GEO?"**
> Whether an AI answer engine can lift a passage from your post and cite it. Google ranks you; GEO gets you quoted. It's the half most people are losing.

---

## What to measure

Judge the week on **entries**, not impressions. Everything else is a leading indicator.

| Metric | Why |
|---|---|
| **Entries vs 7** | The only number that matters |
| Replies to the Mon 10 Aug offer | Direct measure of intent |
| Quote-tweets of entrant scores | Is the growth loop working? |
| Extension installs across the week | Attributable to the Fri product post |
| Thu thread reach vs the rest | Does GEO content travel beyond Hive? |

**If the Thursday thread outperforms everything else**, that's the signal to make GEO education the permanent top pillar and let the contest ride on its back. Watch for it.

**If entries are still stuck near 7 by Sunday**, the problem is not awareness — it's friction. Post the install/description walkthrough again with a video instead of screenshots.
