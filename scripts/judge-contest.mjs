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
const WINDOW_START = Date.parse('2026-07-15T00:00:00Z');
const WINDOW_END   = Date.parse('2026-08-04T23:59:59Z');
const MIN_SEO_QUALIFY = 70;              // headline SEO score entrants must hit
const HIVE_API = 'https://api.hive.blog';

// ══════════════════════════════════════════════════════════════════════════════
// Scoring core — mirrored from compose.ts, DOM refs removed (published markdown is
// the source of truth on-chain).
// ══════════════════════════════════════════════════════════════════════════════

const stripMd = (s) => s
  .replace(/!\[.*?\]\(.*?\)/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1 ')
  .replace(/^#{1,6}\s+/gm, ' ')
  .replace(/[*_`~>|#]/g, ' ')
  .replace(/<[^>]+>/g, ' ');
const reSafe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toPermlink = (title) => title.toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const KW_STOP = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','into','through','during','before','after','above','below','between','up','out','off','over','under','as','if','about','like','since','until','while','although','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','need','not','no','nor','get','make','take','use','go','come','say','tell','see','know','think','look','want','give','find','keep','let','put','feel','become','show','start','also','i','me','my','we','us','our','you','your','he','his','she','her','it','its','they','them','their','this','that','these','those','what','which','who','whom','very','really','much','just','now','then','here','there','when','where','why','how','all','any','each','every','both','than','more','most','less','only','own','same','other','such','some','few','so','yet','still','even','post','blog','article','update','share','today','day','time','way','thing','things','new','old','first','last','good','great','best','well','again','once','never']);

const autoDetectKeyword = (title, content) => {
  const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const bodyPlain = stripMd(content).toLowerCase();
  const countIn = (phrase, text) => (text.match(new RegExp(`\\b${reSafe(phrase)}\\b`, 'g')) || []).length;
  const candidates = new Map();
  let run = [];
  const flushRun = () => {
    for (let len = Math.min(3, run.length); len >= 1; len--) {
      for (let i = 0; i + len <= run.length; i++) {
        const phrase = run.slice(i, i + len).join(' ');
        if (!candidates.has(phrase)) {
          const multiWordBonus = len >= 2 ? 2 : 0;
          candidates.set(phrase, countIn(phrase, bodyPlain) * 2 + 1 + multiWordBonus);
        }
      }
    }
    run = [];
  };
  for (const w of tokenize(title)) { if (w.length >= 3 && !KW_STOP.has(w)) run.push(w); else flushRun(); }
  flushRun();
  if (candidates.size > 0) return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const bodyWords = tokenize(bodyPlain).filter(w => w.length >= 3 && !KW_STOP.has(w));
  const freq = {};
  bodyWords.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]).join(' ');
};

const getImageCount = (content) =>
  (content.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length + (content.match(/<img[\s>]/gi) || []).length;

const missingAltImages = (content) => {
  const out = []; const re = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g; let m;
  while ((m = re.exec(content)) !== null) if (!m[1].trim()) out.push(m[2]);
  return out;
};

const classifyLinks = (content) => {
  const links = [...content.matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)[^)]*\)/g)].map(m => m[1]);
  const hiveHosts = /(peakd\.com|ecency\.com|hive\.blog|inleo\.io|leofinance\.io|3speak\.tv|actifit\.io|hive-engine)/i;
  let internal = 0, external = 0;
  for (const url of links) {
    if (/^\/?@/.test(url) || /\/@[a-z0-9.\-]+/.test(url) || hiveHosts.test(url)) internal++;
    else if (/^https?:\/\//.test(url)) external++;
    else if (/^\//.test(url)) internal++;
  }
  return { internal, external };
};

const headingHierarchy = (content) => {
  const levels = [...content.matchAll(/^(#{1,6})\s+\S/gm)].map(m => m[1].length);
  let skips = false, prev = 1;
  for (const lvl of levels) { if (lvl > prev + 1) skips = true; prev = lvl; }
  return { hasH1: levels.includes(1), skips, count: levels.filter(l => l >= 2).length };
};

const POWER_WORDS = ['ultimate','best','how','why','guide','tips','easy','proven','essential','complete','secret','simple','quick','free','new','top','review','vs','beginner','step'];
const titleCtr = (title) => {
  const lower = title.toLowerCase();
  return { hasNumber: /\d/.test(title), hasPower: POWER_WORDS.some(w => new RegExp(`\\b${w}\\b`).test(lower)), hasBracket: /[\[\(]/.test(title) };
};

const detectIntent = (title, content) => {
  const t = title.toLowerCase();
  if (/^how to|^how i|\bguide\b|\btutorial\b|step[- ]by[- ]step/.test(t)) {
    const steps = (content.match(/^(?:\d+\.|[-*])\s+/gm) || []).length;
    const heads = (content.match(/^#{2,4}\s+/gm) || []).length;
    return { type: 'How-to / Guide', matched: steps >= 3 || heads >= 2 };
  }
  if (/^\d+\s|\btop\s+\d+|\bbest\s+\d+|\blist of\b|\d+\s+(ways|tips|reasons|things)/.test(t)) {
    const items = (content.match(/^(?:\d+\.|[-*])\s+/gm) || []).length;
    return { type: 'List', matched: items >= 3 };
  }
  if (/\?$|^what\b|^why\b|^when\b|^where\b|^who\b|^which\b|^is\b|^are\b|^can\b|^should\b/.test(t)) return { type: 'Question / Informational', matched: true };
  if (/\breview\b|\bvs\.?\b|\bcomparison\b|\bcompared\b/.test(t)) return { type: 'Review / Comparison', matched: true };
  return { type: 'General / Personal', matched: true };
};

const syllables = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const s = w.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const g = s.match(/[aeiouy]{1,2}/g);
  return g ? g.length : 1;
};
const readability = (text) => {
  const plain = stripMd(text).replace(/\n+/g, '. ');
  const sentences = Math.max(1, (plain.match(/[.!?]+/g) || []).length);
  const words = plain.split(/\s+/).filter(w => w.length > 0);
  const wc = words.length || 1;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return {
    ease: Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (wc / sentences) - 84.6 * (syl / wc)))),
    grade: Math.max(0, Math.round((0.39 * (wc / sentences) + 11.8 * (syl / wc) - 15.59) * 10) / 10),
  };
};

const TRANSITIONS = ['also','although','because','besides','but','consequently','despite','even though','finally','first','for example','for instance','furthermore','hence','however','in addition','in conclusion','in contrast','in fact','instead','likewise','meanwhile','moreover','nevertheless','next','on the other hand','otherwise','similarly','since','so','still','subsequently','therefore','though','thus','ultimately','whereas','while','yet'];
const transitionRatio = (text) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 8);
  if (sentences.length < 3) return 100;
  const hits = sentences.filter(s => TRANSITIONS.some(tw => s.toLowerCase().includes(tw))).length;
  return Math.round((hits / sentences.length) * 100);
};

const analyzeKeyword = (kw, content, title, metaDesc) => {
  const k = kw.toLowerCase().trim();
  if (!k) return { inTitle: false, frontLoaded: false, inFirst100: false, inHeading: false, inMetaDesc: false, inPermlink: false, density: 0, isLongTail: false };
  const titleL = title.toLowerCase();
  const inTitle = titleL.includes(k);
  const frontLoaded = inTitle && titleL.indexOf(k) < title.length * 0.5;
  const plain = stripMd(content);
  const inFirst100 = plain.split(/\s+/).slice(0, 100).join(' ').toLowerCase().includes(k);
  const mdHeads = content.match(/^#{2,4}\s+.+/mg) || [];
  const inHeading = mdHeads.some(h => h.toLowerCase().includes(k));
  const inMetaDesc = metaDesc.toLowerCase().includes(k);
  const inPermlink = !!title && toPermlink(title).includes(toPermlink(k));
  const allW = plain.split(/\s+/).filter(w => w.length > 0);
  const hits = (plain.toLowerCase().match(new RegExp(`\\b${reSafe(k)}\\b`, 'g')) || []).length;
  const density = allW.length > 0 ? Math.round((hits / allW.length) * 1000) / 10 : 0;
  return { inTitle, frontLoaded, inFirst100, inHeading, inMetaDesc, inPermlink, density, isLongTail: k.includes(' ') };
};

const THIRD_PRON = /\b(it|this|that|these|those|they|them|their|theirs|he|she|him|her|hers|his|its)\b/gi;
const START_PRON = /^(it|this|that|these|those|they|there|here)\b/i;

const analyzeGeo = (content, intentType) => {
  const informational = intentType !== 'General / Personal';
  const plain = stripMd(content);
  const words = plain.split(/\s+/).filter(Boolean);
  const sentences = plain.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10);
  const head = content.slice(0, 700);
  const explicitSummary = /\b(tl;?dr|in summary|in short|summary:|key takeaway|overview)\b/i.test(head);
  const firstPara = content.split(/\n{2,}/).map(p => stripMd(p).trim()).find(p => p.length > 30) || '';
  const fpWords = firstPara.split(/\s+/).filter(Boolean).length;
  let hookScore01 = 0;
  if (explicitSummary || (fpWords >= 8 && fpWords <= 60)) hookScore01 = 1;
  else if (fpWords > 60 && fpWords <= 100) hookScore01 = 0.5;
  const startPron = sentences.filter(s => START_PRON.test(s)).length;
  const startRatio = sentences.length ? startPron / sentences.length : 0;
  let scScore01 = startRatio < 0.1 ? 1 : startRatio < 0.2 ? 0.8 : startRatio < 0.3 ? 0.5 : 0.2;
  if (sentences.length < 3) scScore01 = 1;
  const pronTotal = (plain.match(THIRD_PRON) || []).length;
  const pronRatio = words.length ? pronTotal / words.length : 0;
  let entScore01 = pronRatio < 0.04 ? 1 : pronRatio < 0.07 ? 0.7 : 0.4;
  if (words.length < 40) entScore01 = 1;

  let score = 0;
  const add = (s01, max) => { score += Math.round(s01 * max); };
  if (!informational) {
    add(hookScore01, 40); add(scScore01, 35); add(entScore01, 25);
  } else {
    add(hookScore01, 20); add(scScore01, 15); add(entScore01, 10);
    const qHeads = (content.match(/^#{2,4}\s+.*\?\s*$/mg) || []).length;
    const faqMark = /\bfaq\b|^\s*q[:.]/im.test(content);
    const qa01 = qHeads >= 1 || faqMark ? 1 : (content.match(/^#{2,4}\s+/gm) || []).length >= 2 ? 0.5 : 0;
    add(qa01, 20);
    const defs = (plain.match(/\b[A-Za-z][\w-]+ (?:is|are|refers to|means|is defined as) (?:a|an|the|when|where|the process|any)\b/gi) || []).length;
    add(defs >= 2 ? 1 : defs === 1 ? 0.5 : 0, 15);
    const nums = (plain.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []).length;
    const { external } = classifyLinks(content);
    let data01 = 0;
    if (nums >= 3 && external > 0) data01 = 1; else if (nums >= 3) data01 = 0.7; else if (nums >= 1) data01 = 0.4;
    add(data01, 20);
  }
  return { informational, score };
};

const analyze = (content, title, tags, metaDesc, keyword) => {
  const plain = stripMd(content);
  const wordCount = plain.split(/\s+/).filter(w => w.length > 0).length;
  const imageCount = getImageCount(content);
  const titleChars = title.length;
  const subheadings = (content.match(/^#{2,4}\s+.+/mg) || []).length;
  const hierarchy = headingHierarchy(content);
  const { ease } = wordCount > 20 ? readability(content) : { ease: 0 };
  const kw = analyzeKeyword(keyword, content, title, metaDesc);
  const links = classifyLinks(content);
  const noAltFiles = missingAltImages(content);
  const transitionPct = wordCount > 50 ? transitionRatio(plain) : 100;
  const intent = detectIntent(title, content);
  const ctr = titleCtr(title);
  const hasKw = keyword.trim().length > 0;
  const contentTags = tags.filter(t => !/^hive-\d+$/.test(t));

  let kwScore = 0;
  if (hasKw) kwScore = (kw.inTitle ? 8 : 0) + (kw.frontLoaded ? 4 : 0) + (kw.inFirst100 ? 10 : 0) + (kw.inHeading ? 7 : 0) + (kw.inPermlink ? 3 : 0) + (kw.inMetaDesc ? 3 : 0);

  let titleLen = 0;
  if (!title) titleLen = 0;
  else if (titleChars < 20) titleLen = 2;
  else if (titleChars < 50) titleLen = 5;
  else if (titleChars <= 60) titleLen = 8;
  else if (titleChars <= 70) titleLen = 5;
  else titleLen = 3;
  const ctrScore = Math.min(4, (ctr.hasNumber ? 2 : 0) + (ctr.hasPower ? 1 : 0) + (ctr.hasBracket ? 1 : 0));
  const titleScore = title ? titleLen + ctrScore : 0;

  const metaLen = metaDesc.length;
  let metaScore = 0;
  if (!metaDesc) metaScore = 0;
  else if (metaLen < 50) metaScore = 4;
  else if (metaLen < 120) metaScore = 7;
  else if (metaLen <= 160) metaScore = 10;
  else metaScore = 7;

  let subScore = 0;
  if (subheadings > 0) subScore = 7; else if (wordCount < 400) subScore = 5; else subScore = 0;
  const hierScore = subheadings > 0 ? Math.max(0, 4 - (hierarchy.hasH1 ? 2 : 0) - (hierarchy.skips ? 2 : 0)) : 0;
  const structScore = subScore + hierScore;

  let mediaScore = 0;
  if (imageCount === 0) mediaScore = 0; else if (noAltFiles.length === 0) mediaScore = 9; else mediaScore = 4;

  const linkScore = (links.external > 0 ? 3 : 0) + (links.internal > 0 ? 4 : 0);

  const nTags = contentTags.length;
  let tagScore = 0;
  if (nTags === 0) tagScore = 0; else if (nTags < 3) tagScore = 3; else if (nTags <= 5) tagScore = 8; else tagScore = 5;

  let readScore = 0;
  if (wordCount < 50) readScore = 4;
  else {
    const easeScore = ease >= 60 ? 5 : ease >= 40 ? 4 : ease >= 20 ? 2 : 1;
    const transScore = transitionPct >= 30 ? 3 : transitionPct >= 15 ? 2 : 0;
    readScore = easeScore + transScore;
  }

  const seoMax = hasKw ? 100 : 65;
  const seoScore = kwScore + titleScore + metaScore + structScore + mediaScore + linkScore + tagScore + readScore;
  const geo = analyzeGeo(content, intent.type);

  return {
    seoScore, seoMax, geoScore: geo.score, geoInformational: geo.informational,
    wordCount, imageCount, subheadings, intentType: intent.type, keyword,
    breakdown: { keyword: kwScore, title: titleScore, meta: metaScore, structure: structScore, media: mediaScore, links: linkScore, tags: tagScore, readability: readScore },
  };
};

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
