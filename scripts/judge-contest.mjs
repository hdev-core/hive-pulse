#!/usr/bin/env node
/**
 * HivePulse SEO Contest — objective judge.
 *
 * Re-runs the extension's SEO + GEO scoring on each entry's ON-CHAIN content, so the score
 * is reproducible and tamper-proof — a faked screenshot can't win, because we re-derive the
 * real number from the post itself. The scoring here mirrors compose.ts; because Hive stores
 * markdown, the DOM-based checks in the extension (headings, images, subheadings) map exactly
 * to the published markdown, so the on-chain re-score is the authoritative version of what the
 * author saw in the editor.
 *
 * IN SYNC WITH: compose.ts (analyze / analyzeGeo / analyzeKeyword / readability). If the
 * extension's scoring changes, update the mirrored functions below.
 *
 * Usage:
 *   node scripts/judge-contest.mjs entries.txt
 *
 * entries.txt: one entry per line — a frontend URL or @author/permlink. Blank lines and
 * lines starting with # are ignored. Example lines:
 *   https://peakd.com/hive-100/@alice/my-great-post
 *   @bob/another-post
 *
 * Config below sets the contest window and qualifying threshold.
 */

// ── Contest config ────────────────────────────────────────────────────────────
// Week 8: 15 → 22 September 2026. Results for earlier rounds are archived in
// contest-results-week{1,2,4,5,6,7}.csv.
//
// The start date deliberately overlaps the day the week-3 announcement publishes. In week 2
// @angeluxx published a properly tagged post ~3h AFTER the announcement went live but ~2.5h
// before the nominal window opened, and fell into a gap between rounds — too late to be judged
// with week 1, too early to count for week 2. Starting the window on announcement day closes
// that gap: anyone who reads the post and publishes the same day is in. Cross-check against the
// previous round's archived CSV so a post can't be awarded twice.
const WINDOW_START = Date.parse('2026-11-10T00:00:00Z');
const WINDOW_END   = Date.parse('2026-11-17T12:00:00Z');   // week 16 closes 12:00 UTC, not 23:59
const MIN_SEO_QUALIFY = 70;              // headline SEO score entrants must hit

// Tiebreak target, from week 11. The engine's own readability check stops caring once a post
// clears Flesch reading ease 60 - every entry that tied at 100/100 in weeks 9 and 10 had an
// identical SEO breakdown including a maxed 8/8 readability block. So the tiebreak reads the
// same number at full resolution: closest to 60 wins.
//
// It replaces word count, which was unbounded and had turned the contest into a length race -
// winning posts ran 1,730 then 3,217 then 7,569 words over three rounds. Ease has a finish
// line: at 60 there is nothing further to gain, and padding does not move it at all, because
// it is a ratio of words per sentence and syllables per word. Back-tested over weeks 6-10,
// 21 tied entries, it separated every field with no collisions.

// Scoring engine lives in ./lib/seo-score.mjs — shared with scripts/score-post.mjs so the
// two tools can never disagree. Keep that file in sync with compose.ts.
import { analyze, autoDetectKeyword, readability } from './lib/seo-score.mjs';
import { byRank, easeGap, tierFor, allocatePrizes, MIN_ENTRANTS } from './lib/rank.mjs';
import { getPost } from './lib/hive-rpc.mjs';

// ══════════════════════════════════════════════════════════════════════════════
// Hive fetch + entry parsing
// ══════════════════════════════════════════════════════════════════════════════

const parseEntry = (line) => {
  const s = line.trim();
  // @author/permlink anywhere in the string (covers every frontend URL shape)
  const m = s.match(/@([a-z0-9][a-z0-9.\-]{1,15})\/([a-z0-9-]+)/i);
  if (m) return { author: m[1].toLowerCase(), permlink: m[2].toLowerCase() };
  return null;
};

// Post fetching (with node fallback) lives in ./lib/hive-rpc.mjs.
const getContent = (author, permlink) => getPost(author, permlink);

// ── Best-keyword scoring ─────────────────────────────────────────────────────
// The analyzer lets an author set their own focus keyword, and that choice is NOT stored
// on-chain — so re-scoring here would otherwise auto-detect a different one and report a
// lower number than the entrant saw. The keyword block is worth 35 of 100 points, so the
// spread is large: one week-4 post scored 67% / 95% / 99% depending on the keyword.
//
// Fix: score every plausible keyword and keep the best. An entrant can therefore never be
// ranked below what the tool showed them, and the rule is identical for everyone. Ties
// prefer the auto-detected keyword so results stay stable run to run.
const KW_SKIP = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','my','me','i','is','it','its','this','that','these','those','how','why','what','when',
  'best','guide','story','about','your','you','we','our','are','was','not','can','will','new']);

const keywordCandidates = (title, body) => {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !KW_SKIP.has(w));
  const out = new Set();
  for (let n = 1; n <= 3; n++)
    for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return [...out].filter(Boolean);
};

const bestKeywordAnalysis = (post) => {
  const autoKeyword = autoDetectKeyword(post.title, post.body);
  const score = (kw) => {
    const analysis = analyze(post.body, post.title, post.tags, post.description, kw);
    return { analysis, keyword: kw, pct: analysis.seoScore / analysis.seoMax };
  };
  let best = score(autoKeyword);
  for (const kw of keywordCandidates(post.title, post.body)) {
    const cand = score(kw);
    if (cand.pct > best.pct) best = cand;   // strict >, so auto-detected wins ties
  }
  return { analysis: best.analysis, keyword: best.keyword, autoKeyword };
};

// ══════════════════════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════════════════════

const fmtDate = (ms) => new Date(ms).toISOString().slice(0, 10);

const main = async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/judge-contest.mjs entries.txt');
    process.exit(1);
  }

  // Refuse to run against a window that has long since closed. Both the date window AND
  // the scoring engine in this file are rolled forward for the ACTIVE round, so pointing
  // it at an old entries file re-scores a closed, paid round with today's rubric and
  // overwrites contest-results.csv with the answer. AGENTS.md warns about that in prose;
  // nothing enforced it, and the window guard it describes as the protection does not
  // help — a stale WINDOW_END passes every entry of the round it belongs to.
  //
  // This is also the other half of the trap: the window was still set to week 15 while
  // week 16 was open, so judging week 16 would have marked every entry out-of-window and
  // voided the round.
  // The sharper guard, because the staleness check below only catches a window that is
  // badly out of date -- it would happily have judged week 15's entries one day after
  // that round was paid. A round with an archived CSV is closed: that file is the record
  // of what was paid, and re-running the round can only disagree with it.
  const fsSync = await import('node:fs');
  const weekOfFile = /(?:^|[^0-9])week(\d+)\b/i.exec(file);
  if (weekOfFile) {
    const archive = `contest-results-week${weekOfFile[1]}.csv`;
    if (fsSync.existsSync(archive) && !process.argv.includes('--allow-stale-window')) {
      console.error(`\nREFUSING TO RUN: week ${weekOfFile[1]} is already archived as ${archive}`);
      console.error('\n  That file is the record of what was actually paid. This script rolls its date');
      console.error('  window AND its scoring engine forward for the active round, so re-running a');
      console.error('  closed round produces different numbers and can reorder the podium. Read the');
      console.error('  rubric-history note in AGENTS.md. If you genuinely mean to, pass');
      console.error('  --allow-stale-window -- and do not publish or pay from the result.\n');
      process.exit(1);
    }
  }

  const STALE_DAYS = (Date.now() - WINDOW_END) / 86400000;
  if (STALE_DAYS > 3 && !process.argv.includes('--allow-stale-window')) {
    console.error(`\nREFUSING TO RUN: the window in this script closed ${Math.floor(STALE_DAYS)} days ago`);
    console.error(`  (${fmtDate(WINDOW_START)} → ${fmtDate(WINDOW_END)})\n`);
    console.error('  Set WINDOW_START and WINDOW_END to the round you are judging. If you');
    console.error('  really do mean to re-score a closed round, pass --allow-stale-window');
    console.error('  and read the rubric-history note in AGENTS.md first: the engine has');
    console.error('  moved on since, so the numbers will NOT match the archived CSV, and');
    console.error('  they must never be published or paid from.\n');
    process.exit(1);
  }
  const fs = await import('node:fs');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  const rows = [];
  const problems = [];
  for (const line of lines) {
    const e = parseEntry(line);
    if (!e) { problems.push(`unparseable: ${line}`); continue; }
    let post;
    try { post = await getContent(e.author, e.permlink); }
    catch (err) { problems.push(`fetch failed @${e.author}/${e.permlink}: ${err.message}`); continue; }
    if (!post) { problems.push(`not found on-chain: @${e.author}/${e.permlink}`); continue; }

    const { analysis: a, keyword, autoKeyword } = bestKeywordAnalysis(post);
    const seoPct = Math.round((a.seoScore / a.seoMax) * 100);
    // Rank on the EXACT mean and show the rounded one. Rounding before comparing invents
    // ties between scores that are not tied, and the reading-ease tiebreak then promotes
    // the lower score over the higher one. Week 14 is the worked example: @nabbas0786 on
    // (99+100)/2 = 99.5 rounded up to 100 and tied @nursejoe's true 100, then won the
    // tiebreak on reading ease and took 3rd place and 50 HIVE from a strictly better post.
    // The published rule is "Rank = (SEO% + GEO)/2"; 99.5 is not a tie with 100.
    const combinedExact = (seoPct + a.geoScore) / 2;
    const combined = Math.round(combinedExact);
    const inWindow = post.created >= WINDOW_START && post.created <= WINDOW_END;
    const qualifies = inWindow && seoPct >= MIN_SEO_QUALIFY;

    const { ease } = readability(post.body);
    rows.push({
      author: post.author, permlink: post.permlink, created: post.created,
      seoScore: a.seoScore, seoMax: a.seoMax, seoPct, geoScore: a.geoScore, combined, combinedExact,
      wordCount: a.wordCount, ease, easeGap: easeGap(ease),
      keyword, autoKeyword, inWindow, qualifies,
      geoType: a.geoInformational ? 'info' : 'personal', breakdown: a.breakdown,
    });
  }

  rows.sort(byRank);

  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  console.log('\n══ HivePulse SEO Contest — objective re-score ══');
  console.log(`window ${fmtDate(WINDOW_START)} → ${fmtDate(WINDOW_END)} · qualify: SEO ≥ ${MIN_SEO_QUALIFY}% · ranked by combined (SEO+GEO)/2\n`);
  console.log(`${pad('#', 3)} ${pad('author/permlink', 42)} ${padL('SEO', 7)} ${padL('GEO', 4)} ${padL('COMB', 5)} ${padL('ease', 5)} ${padL('words', 6)} ${pad('  date', 12)} ok`);
  console.log('─'.repeat(92));
  rows.forEach((r, i) => {
    const id = `@${r.author}/${r.permlink}`;
    const seo = `${r.seoScore}/${r.seoMax}(${r.seoPct}%)`;
    const flag = r.qualifies ? '✓' : (!r.inWindow ? '⌛' : '✗');
    console.log(`${pad(i + 1, 3)} ${pad(id.length > 42 ? id.slice(0, 41) + '…' : id, 42)} ${padL(seo, 7)} ${padL(r.geoScore, 4)} ${padL(r.combinedExact % 1 ? r.combinedExact.toFixed(1) : r.combined, 5)} ${padL(r.ease, 5)} ${padL(r.wordCount, 6)} ${pad(fmtDate(r.created), 12)} ${flag}`);
  });

  // Report the prizes the PUBLISHED rules actually produce. This printed a flat
  // 150/100/50 for the top three long after the rules said otherwise — the threshold and
  // tie-splitting shipped in lib/rank.mjs for week 15 but were never wired in here, so the
  // judge was quietly contradicting the contest it judges.
  const qualified = rows.filter(r => r.qualifies);
  const tier = tierFor(qualified.length);
  console.log(`\n── Prizes (${qualified.length} qualifying ${qualified.length === 1 ? 'entry' : 'entries'}) ──`);

  if (!qualified.length) {
    console.log('  (no qualifying entries)');
  } else if (!tier.pool) {
    console.log(`  NO PAYOUT — ${qualified.length} qualifying entries, and the published`);
    console.log(`  threshold is ${MIN_ENTRANTS}. The pool rolls into the next round.`);
    console.log('  Every qualifying entry is still scored, listed, upvoted and reblogged.');
  } else {
    const paid = allocatePrizes(qualified, tier.slots);
    const medals = ['🥇', '🥈', '🥉'];
    console.log(`  pool ${tier.pool} HIVE · slots ${tier.slots.join(' / ')}`);
    paid.forEach((r, i) => console.log(
      `  ${medals[i] || '  '} ${String(Math.round(r.prize * 100) / 100).padStart(6)} HIVE  @${r.author}/${r.permlink}` +
      `  — SEO ${r.seoPct}% · GEO ${r.geoScore} · combined ${r.combinedExact % 1 ? r.combinedExact.toFixed(1) : r.combined}`));
    const out = paid.reduce((a, r) => a + r.prize, 0);
    if (Math.round(out) !== tier.pool)
      console.log(`  !! paid ${out} but the pool is ${tier.pool} — refusing to trust this, check allocatePrizes`);
    const shared = paid.length > tier.slots.length || new Set(paid.map(r => r.prize)).size < paid.length;
    if (shared) console.log(`  (${paid.length} paid — tied entries share the slots they span)`);
  }

  console.log('\nLegend: ✓ qualifies · ✗ below SEO threshold · ⌛ outside contest window');
  console.log('NOTE: each post is scored with its best-performing keyword, so a ranking can never');
  console.log('      be lower than what the extension showed the author. Ranking is objective;');
  console.log('      do a human quality + originality pass on the top entries before finalizing.');
  if (problems.length) { console.log('\n⚠ Problems:'); problems.forEach(p => console.log('  - ' + p)); }

  // CSV alongside
  const csv = ['author,permlink,created,seo_score,seo_max,seo_pct,geo_score,combined,combined_exact,ease,ease_gap,word_count,in_window,qualifies,keyword,auto_keyword']
    .concat(rows.map(r => `${r.author},${r.permlink},${fmtDate(r.created)},${r.seoScore},${r.seoMax},${r.seoPct},${r.geoScore},${r.combined},${r.combinedExact},${r.ease},${r.easeGap},${r.wordCount},${r.inWindow},${r.qualifies},"${r.keyword}","${r.autoKeyword}"`))
    .join('\n');
  // Keep the previous run recoverable. contest-results.csv is the working file every round
  // overwrites, and it holds the last round's result until someone remembers to archive it
  // as contest-results-weekN.csv. A single careless run replaces it, which is how the
  // week-15 result briefly became week-15 posts scored against the week-16 window.
  if (fs.existsSync('contest-results.csv')) {
    fs.copyFileSync('contest-results.csv', 'contest-results.csv.prev');
  }
  fs.writeFileSync('contest-results.csv', csv);
  console.log('\n📄 Full results written to contest-results.csv (previous run kept as contest-results.csv.prev)');
  const week = /(?:^|[^0-9])week(\d+)\b/i.exec(file);
  if (week && !fs.existsSync(`contest-results-week${week[1]}.csv`)) {
    console.log(`   ARCHIVE IT: cp contest-results.csv contest-results-week${week[1]}.csv`);
  }
};

main().catch(e => { console.error(e); process.exit(1); });
