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
// Week 2: 5 → 11 August 2026. (Week 1 was 28 Jul → 4 Aug 2026 — results archived in
// contest-results-week1.csv. Keep the window tight to the announced dates; a loose start
// date lets pre-contest posts slip through as "in window".)
const WINDOW_START = Date.parse('2026-08-05T00:00:00Z');
const WINDOW_END   = Date.parse('2026-08-11T23:59:59Z');
const MIN_SEO_QUALIFY = 70;              // headline SEO score entrants must hit
const HIVE_API = 'https://api.hive.blog';

// Scoring engine lives in ./lib/seo-score.mjs — shared with scripts/score-post.mjs so the
// two tools can never disagree. Keep that file in sync with compose.ts.
import { analyze, autoDetectKeyword } from './lib/seo-score.mjs';

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

const getContent = async (author, permlink) => {
  const res = await fetch(HIVE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'condenser_api.get_content', params: [author, permlink], id: 1 }),
  });
  const json = await res.json();
  const r = json.result;
  if (!r || !r.author) return null;
  let meta = {};
  try { meta = JSON.parse(r.json_metadata || '{}'); } catch { /* ignore */ }
  return {
    title: r.title || '',
    body: r.body || '',
    tags: Array.isArray(meta.tags) ? meta.tags.map(t => String(t).toLowerCase()) : [],
    description: typeof meta.description === 'string' ? meta.description : '',
    created: Date.parse((r.created || '') + 'Z'),
    author: r.author,
    permlink: r.permlink,
  };
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

    const keyword = autoDetectKeyword(post.title, post.body);
    const a = analyze(post.body, post.title, post.tags, post.description, keyword);
    const seoPct = Math.round((a.seoScore / a.seoMax) * 100);
    const combined = Math.round((seoPct + a.geoScore) / 2);
    const inWindow = post.created >= WINDOW_START && post.created <= WINDOW_END;
    const qualifies = inWindow && seoPct >= MIN_SEO_QUALIFY;

    rows.push({
      author: post.author, permlink: post.permlink, created: post.created,
      seoScore: a.seoScore, seoMax: a.seoMax, seoPct, geoScore: a.geoScore, combined,
      wordCount: a.wordCount, keyword: a.keyword, inWindow, qualifies,
      geoType: a.geoInformational ? 'info' : 'personal', breakdown: a.breakdown,
    });
  }

  rows.sort((x, y) => (y.qualifies - x.qualifies) || (y.combined - x.combined) || (y.seoPct - x.seoPct));

  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  console.log('\n══ HivePulse SEO Contest — objective re-score ══');
  console.log(`window ${fmtDate(WINDOW_START)} → ${fmtDate(WINDOW_END)} · qualify: SEO ≥ ${MIN_SEO_QUALIFY}% · ranked by combined (SEO+GEO)/2\n`);
  console.log(`${pad('#', 3)} ${pad('author/permlink', 42)} ${padL('SEO', 7)} ${padL('GEO', 4)} ${padL('COMB', 5)} ${padL('words', 6)} ${pad('  date', 12)} ok`);
  console.log('─'.repeat(92));
  rows.forEach((r, i) => {
    const id = `@${r.author}/${r.permlink}`;
    const seo = `${r.seoScore}/${r.seoMax}(${r.seoPct}%)`;
    const flag = r.qualifies ? '✓' : (!r.inWindow ? '⌛' : '✗');
    console.log(`${pad(i + 1, 3)} ${pad(id.length > 42 ? id.slice(0, 41) + '…' : id, 42)} ${padL(seo, 7)} ${padL(r.geoScore, 4)} ${padL(r.combined, 5)} ${padL(r.wordCount, 6)} ${pad(fmtDate(r.created), 12)} ${flag}`);
  });

  const winners = rows.filter(r => r.qualifies).slice(0, 3);
  console.log('\n── Provisional top 3 (qualified, by combined score) ──');
  const medals = ['🥇 150 HIVE', '🥈 100 HIVE', '🥉 50 HIVE'];
  if (!winners.length) console.log('  (no qualifying entries yet)');
  winners.forEach((r, i) => console.log(`  ${medals[i]}  @${r.author}/${r.permlink}  — SEO ${r.seoPct}% · GEO ${r.geoScore} · combined ${r.combined}`));

  console.log('\nLegend: ✓ qualifies · ✗ below SEO threshold · ⌛ outside contest window');
  console.log('NOTE: keyword is auto-detected (same default as the tool). Ranking is objective;');
  console.log('      do a human quality + originality pass on the top entries before finalizing.');
  if (problems.length) { console.log('\n⚠ Problems:'); problems.forEach(p => console.log('  - ' + p)); }

  // CSV alongside
  const csv = ['author,permlink,created,seo_score,seo_max,seo_pct,geo_score,combined,word_count,in_window,qualifies,keyword']
    .concat(rows.map(r => `${r.author},${r.permlink},${fmtDate(r.created)},${r.seoScore},${r.seoMax},${r.seoPct},${r.geoScore},${r.combined},${r.wordCount},${r.inWindow},${r.qualifies},"${r.keyword}"`))
    .join('\n');
  fs.writeFileSync('contest-results.csv', csv);
  console.log('\n📄 Full results written to contest-results.csv');
};

main().catch(e => { console.error(e); process.exit(1); });
