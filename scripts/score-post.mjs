#!/usr/bin/env node
/**
 * Score a Hive post for SEO + GEO and say exactly what to fix.
 *
 * Uses the same engine as the contest judge (./lib/seo-score.mjs, mirrored from compose.ts),
 * so the number here is the number the extension shows and the number the contest awards.
 *
 * Usage:
 *   node scripts/score-post.mjs draft.md
 *   node scripts/score-post.mjs @author/permlink
 *   node scripts/score-post.mjs https://peakd.com/hive-100/@alice/my-post
 *
 * Local files may carry YAML front matter (any subset):
 *   ---
 *   title: My Post Title
 *   description: The preview description / meta description.
 *   tags: hive, seo, writing
 *   keyword: focus keyword
 *   ---
 *
 * Flags override front matter:
 *   --title "..."  --desc "..."  --tags a,b,c  --keyword "..."  --json
 */

import fs from 'node:fs';
import {
  analyze, autoDetectKeyword, analyzeKeyword, analyzeGeo, classifyLinks,
  headingHierarchy, missingAltImages, getImageCount, readability, transitionRatio,
  detectIntent, stripMd, titleCtr,
} from './lib/seo-score.mjs';
import { getPost } from './lib/hive-rpc.mjs';

// Per-component maxima, matching analyze() in the engine.
const MAX = { keyword: 35, title: 12, meta: 10, structure: 11, media: 9, links: 7, tags: 8, readability: 8 };

const C = { dim: '\x1b[2m', red: '\x1b[31m', yel: '\x1b[33m', grn: '\x1b[32m', bold: '\x1b[1m', off: '\x1b[0m' };
const colour = (got, max) => got >= max ? C.grn : got >= max * 0.6 ? C.yel : C.red;
const bar = (got, max, w = 18) => {
  const filled = Math.round((got / max) * w);
  return colour(got, max) + '█'.repeat(filled) + C.dim + '░'.repeat(w - filled) + C.off;
};

const parseArgs = (argv) => {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') { out.json = true; continue; }
    if (a.startsWith('--')) { out[a.slice(2)] = argv[++i]; continue; }
    out._.push(a);
  }
  return out;
};

const parseFrontMatter = (raw) => {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: raw.slice(m[0].length) };
};

const fetchOnChain = async (author, permlink) => {
  const p = await getPost(author, permlink);
  return p ? { ...p, source: `@${p.author}/${p.permlink}` } : null;
};

/** Concrete, prioritised fixes derived from the same signals the score uses. */
const buildFixes = (post, keyword, a) => {
  const fixes = [];
  const kw = analyzeKeyword(keyword, post.body, post.title, post.description);
  const links = classifyLinks(post.body);
  const hier = headingHierarchy(post.body);
  const noAlt = missingAltImages(post.body);
  const imgs = getImageCount(post.body);
  const subs = (post.body.match(/^#{2,4}\s+.+/mg) || []).length;
  const contentTags = post.tags.filter(t => !/^hive-\d+$/.test(t));
  const plain = stripMd(post.body);
  const words = plain.split(/\s+/).filter(Boolean).length;
  const push = (pts, what) => fixes.push({ pts, what });

  if (!kw.inTitle)      push(8,  `Put the focus keyword "${keyword}" in the title`);
  else if (!kw.frontLoaded) push(4, `Move "${keyword}" into the first half of the title`);
  if (!kw.inFirst100)   push(10, `Use "${keyword}" within the first 100 words`);
  if (!kw.inHeading)    push(7,  `Use "${keyword}" in at least one ## subheading`);
  if (!kw.inPermlink)   push(3,  `Work "${keyword}" into the title so it lands in the permlink`);
  if (!kw.inMetaDesc)   push(3,  `Include "${keyword}" in the preview description`);

  const tl = post.title.length;
  if (!post.title) push(12, 'Add a title');
  else if (tl < 50)  push(3, `Title is ${tl} chars — 50–60 scores best (currently short)`);
  else if (tl > 60)  push(tl <= 70 ? 3 : 5, `Title is ${tl} chars — trim to 60 or under`);

  // Click-through signals: number +2, power word +1, bracket +1, capped at 4.
  if (post.title) {
    const ctr = titleCtr(post.title);
    const ctrScore = Math.min(4, (ctr.hasNumber ? 2 : 0) + (ctr.hasPower ? 1 : 0) + (ctr.hasBracket ? 1 : 0));
    if (ctrScore < 4) {
      const want = [];
      if (!ctr.hasNumber)  want.push('a number');
      if (!ctr.hasPower)   want.push('a power word (guide, best, how, why, proven…)');
      if (!ctr.hasBracket) want.push('a (bracketed) qualifier');
      push(4 - ctrScore, `Make the title more clickable — add ${want.join(' or ')}`);
    }
  }

  const dl = post.description.length;
  if (!dl)            push(10, 'Fill the preview description — it becomes your Google snippet');
  else if (dl < 120)  push(dl < 50 ? 6 : 3, `Preview description is ${dl} chars — aim for 120–160`);
  else if (dl > 160)  push(3, `Preview description is ${dl} chars — trim to 160`);

  if (!subs)          push(words < 400 ? 2 : 7, 'Add ## subheadings to break up the post');
  if (subs && hier.hasH1)  push(2, 'Drop the single # H1 — the frontend renders your title as H1 already');
  if (subs && hier.skips)  push(2, 'Fix heading order — do not jump from ## straight to ####');

  if (!imgs)          push(9, 'Add at least one image');
  else if (noAlt.length) push(5, `${noAlt.length} image(s) missing alt text — write ![description](url)`);

  if (!links.internal) push(4, 'Add an internal link to another Hive post or author');
  if (!links.external) push(3, 'Add an external source link');

  const nt = contentTags.length;
  if (!nt)            push(8, 'Add 3–5 content tags');
  else if (nt < 3)    push(5, `Only ${nt} content tag(s) — 3–5 scores best`);
  else if (nt > 5)    push(3, `${nt} content tags — trim to 5`);

  if (words >= 50) {
    const { ease } = readability(post.body);
    const trans = transitionRatio(plain);
    if (ease < 60) push(ease >= 40 ? 1 : ease >= 20 ? 3 : 4, `Readability ease is ${ease} — shorten sentences and simplify wording`);
    if (trans < 30) push(trans >= 15 ? 1 : 3, `Only ${trans}% of sentences use connectors — add "however", "because", "for example"`);
  }
  return fixes.sort((x, y) => y.pts - x.pts);
};

const GEO_HINT = {
  'Opening hook': 'Open with a 8–60 word summary of the payoff, before any preamble.',
  'Self-contained sentences': 'Avoid starting sentences with It / This / That / They — name the subject.',
  'Clear subjects': 'Repeat the actual noun instead of leaning on pronouns.',
  'Q&A structure': 'Add a subheading phrased as a question.',
  'Definitions': 'Add plain "X is a …" definition sentences.',
  'Data & citations': 'Add concrete numbers and link an external source.',
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const target = args._[0];
  if (!target) {
    console.error('Usage: node scripts/score-post.mjs <draft.md | @author/permlink | url>');
    console.error('       optional: --title "..." --desc "..." --tags a,b,c --keyword "..." --json');
    process.exit(1);
  }

  let post;
  if (fs.existsSync(target)) {
    const { meta, body } = parseFrontMatter(fs.readFileSync(target, 'utf8'));
    post = {
      title: meta.title || '', body,
      tags: (meta.tags || '').split(/[,\s]+/).filter(Boolean).map(t => t.toLowerCase()),
      description: meta.description || meta.desc || '',
      source: target, keywordHint: meta.keyword || '',
    };
  } else {
    const m = target.match(/@([a-z0-9][a-z0-9.\-]{1,15})\/([a-z0-9-]+)/i);
    if (!m) { console.error(`✗ Not a file, and not a recognisable @author/permlink or Hive URL: ${target}`); process.exit(1); }
    post = await fetchOnChain(m[1].toLowerCase(), m[2].toLowerCase());
    if (!post) { console.error(`✗ Not found on-chain: @${m[1]}/${m[2]}`); process.exit(1); }
  }

  if (args.title) post.title = args.title;
  if (args.desc) post.description = args.desc;
  if (args.tags) post.tags = args.tags.split(/[,\s]+/).filter(Boolean).map(t => t.toLowerCase());

  const keyword = args.keyword || post.keywordHint || autoDetectKeyword(post.title, post.body);
  const a = analyze(post.body, post.title, post.tags, post.description, keyword);
  const geo = analyzeGeo(post.body, detectIntent(post.title, post.body).type);
  const seoPct = Math.round((a.seoScore / a.seoMax) * 100);
  const combined = Math.round((seoPct + a.geoScore) / 2);
  const fixes = buildFixes(post, keyword, a);

  if (args.json) {
    console.log(JSON.stringify({ source: post.source, keyword, seo: seoPct, geo: a.geoScore, combined,
      breakdown: a.breakdown, geoParts: geo.parts, wordCount: a.wordCount, fixes }, null, 2));
    return;
  }

  const verdict = combined >= 90 ? `${C.grn}excellent${C.off}` : combined >= 75 ? `${C.grn}strong${C.off}`
    : combined >= 60 ? `${C.yel}needs work${C.off}` : `${C.red}weak${C.off}`;

  console.log(`\n${C.bold}══ HivePulse post score ══${C.off}`);
  console.log(`${post.source}`);
  if (!post.title) console.log(`${C.red}⚠ No title supplied — pass --title or add YAML front matter. Title affects ~20 points.${C.off}`);
  console.log(`focus keyword: "${keyword}"${args.keyword || post.keywordHint ? '' : ' (auto-detected)'}   ·   ${a.wordCount} words   ·   ${a.intentType}\n`);
  console.log(`  ${C.bold}SEO${C.off}       ${String(seoPct).padStart(3)}%   ${bar(a.seoScore, a.seoMax)}`);
  console.log(`  ${C.bold}GEO${C.off}       ${String(a.geoScore).padStart(3)}    ${bar(a.geoScore, 100)}`);
  console.log(`  ${C.bold}COMBINED${C.off}  ${String(combined).padStart(3)}    ${verdict}   ${C.dim}(contest qualifies at SEO ≥ 70)${C.off}\n`);

  console.log(`${C.bold}SEO breakdown${C.off}`);
  for (const [k, got] of Object.entries(a.breakdown)) {
    const max = MAX[k] ?? got;
    console.log(`  ${k.padEnd(12)} ${String(got).padStart(2)}/${String(max).padEnd(3)} ${bar(got, max, 14)}`);
  }

  console.log(`\n${C.bold}GEO breakdown${C.off} ${C.dim}(${geo.informational ? 'informational' : 'personal'} post)${C.off}`);
  for (const p of geo.parts) {
    console.log(`  ${p.label.padEnd(26)} ${String(p.got).padStart(2)}/${String(p.max).padEnd(3)} ${bar(p.got, p.max, 14)}`);
  }
  const weakGeo = geo.parts.filter(p => p.got < p.max);
  if (weakGeo.length) {
    console.log(`\n${C.bold}To raise GEO${C.off}`);
    for (const p of weakGeo) console.log(`  ${C.yel}+${String(p.max - p.got).padStart(2)}${C.off}  ${GEO_HINT[p.label] || p.label}`);
  }

  console.log(`\n${C.bold}To raise SEO${C.off} ${C.dim}(highest value first)${C.off}`);
  if (!fixes.length) console.log(`  ${C.grn}Nothing left — full marks.${C.off}`);
  for (const f of fixes) console.log(`  ${C.yel}+${String(f.pts).padStart(2)}${C.off}  ${f.what}`);
  console.log();
};

main().catch(e => { console.error(e); process.exit(1); });
