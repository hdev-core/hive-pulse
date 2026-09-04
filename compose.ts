import { scanChipTags } from './utils/tagScan';
export {};
declare const chrome: any;

(function () {

const PANEL_ID = 'hivepulse-post-analyzer';

// Shown next to the panel title so the running build is identifiable at a glance — useful
// for support ("which version are you on?") and for confirming an update actually landed.
const extVersion = (() => {
  try { return chrome.runtime.getManifest().version; } catch { return '?'; }
})();

const COMPOSE_HOSTS: Record<string, RegExp> = {
  'peakd.com':      /\/publish|\/e\/@/,
  'ecency.com':     /\/submit|\/publish|\/@[\w.\-]+\/[\w.\-]+\/edit/,
  'hive.blog':      /\/submit\.html/,
  'inleo.io':       /\/publish|\/post/,
  'leofinance.io':  /\/submit/,
  '3speak.tv':      /\/upload/,
  'actifit.io':     /\/blog\/new|\/videos\/new/,
  'slothbuzz.com':  /\/publish|\/submit/,
  'blog.suseona.com': /\/create/,
};

// ── Hive RPC (trending tag suggestions only) ─────────────────────────────────
// Node is user-configurable — same settings.hiveRpcNode the rest of the extension uses
const DEFAULT_HIVE_API = 'https://api.hive.blog';
let hiveApi = DEFAULT_HIVE_API;
let hiveApiFallbacks: string[] = [];

const isValidNode = (n: any): n is string => typeof n === 'string' && /^https?:\/\//.test(n);

const applyNodeSettings = (s: any) => {
  hiveApi = isValidNode(s?.hiveRpcNode) ? s.hiveRpcNode.replace(/\/+$/, '') : DEFAULT_HIVE_API;
  const custom: string[] = Array.isArray(s?.customHiveRpcNodes) ? s.customHiveRpcNodes.filter(isValidNode) : [];
  hiveApiFallbacks = [DEFAULT_HIVE_API, ...custom].filter(n => n !== hiveApi);
};

const loadHiveApi = (): Promise<void> =>
  new Promise(res => {
    try {
      chrome.storage.local.get(['settings'], (r: any) => { applyNodeSettings(r?.settings); res(); });
    } catch { res(); }
  });

// Opt-out switch. Read before the first mount so a disabled panel never flashes on, and
// kept live so toggling it in the popup takes effect in open compose tabs without a reload.
let analyzerEnabled = true;
let onAnalyzerToggle: (() => void) | null = null;

const readAnalyzerSetting = (): Promise<void> =>
  new Promise(res => {
    try {
      chrome.storage.local.get(['settings'], (r: any) => {
        analyzerEnabled = r?.settings?.postAnalyzerEnabled !== false;
        res();
      });
    } catch { res(); }
  });

// Stay in sync if the user changes the node, or flips the analyzer off, while a compose
// tab is open
try {
  chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area !== 'local' || !changes.settings) return;
    applyNodeSettings(changes.settings.newValue);
    const next = changes.settings.newValue?.postAnalyzerEnabled !== false;
    if (next !== analyzerEnabled) { analyzerEnabled = next; onAnalyzerToggle?.(); }
  });
} catch {}

const rpc = async (method: string, params: any): Promise<any> => {
  const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
  for (const node of [hiveApi, ...hiveApiFallbacks]) {
    try {
      const r = await fetch(node, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const result = (await r.json()).result;
      if (result !== undefined && result !== null) return result;
    } catch { /* try next node */ }
  }
  return null;
};

let trendingTags: string[] | null = null;
const loadTrendingTags = async (): Promise<void> => {
  if (trendingTags) return;
  const r = await rpc('bridge.get_trending_topics', { limit: 25 });
  if (Array.isArray(r)) {
    trendingTags = r
      .map((t: any) => (Array.isArray(t) ? t[0] : t))
      .filter((t: any) => typeof t === 'string' && /^[a-z0-9-]+$/.test(t) && !/^hive-\d+$/.test(t));
  }
};

const suggestTags = (text: string, used: string[]): string[] => {
  if (!trendingTags) return [];
  const usedSet = new Set(used);
  const avail = trendingTags.filter(t => !usedSet.has(t));
  const relevant = avail.filter(t =>
    new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
  const out = relevant.slice(0, 5);
  if (out.length < 3) out.push(...avail.filter(t => !out.includes(t)).slice(0, 3 - out.length));
  return out;
};

// ── Shared text helpers ──────────────────────────────────────────────────────
const stripMd = (s: string) => s
  .replace(/!\[.*?\]\(.*?\)/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1 ')
  .replace(/^#{1,6}\s+/gm, ' ')
  .replace(/[*_`~>|#]/g, ' ')
  .replace(/<[^>]+>/g, ' ');

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const reSafe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Hive permlink derived from the title — this becomes part of the URL and is
// PERMANENT once published. Keyword-in-URL is a real ranking signal.
const toPermlink = (title: string): string =>
  title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// ── Keyword auto-detection ───────────────────────────────────────────────────
const KW_STOP = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'into','through','during','before','after','above','below','between','up','out',
  'off','over','under','as','if','about','like','since','until','while','although',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','can','need','not','no','nor',
  'get','make','take','use','go','come','say','tell','see','know','think','look',
  'want','give','find','keep','let','put','feel','become','show','start','also',
  'i','me','my','we','us','our','you','your','he','his','she','her','it','its',
  'they','them','their','this','that','these','those','what','which','who','whom',
  'very','really','much','just','now','then','here','there','when','where','why','how',
  'all','any','each','every','both','than','more','most','less','only','own','same',
  'other','such','some','few','so','yet','still','even','than','then','just',
  'post','blog','article','update','share','today','day','time','way','thing','things',
  'new','old','first','last','good','great','best','well','again','once','never',
]);

const autoDetectKeyword = (title: string, content: string): string => {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const bodyPlain = stripMd(content).toLowerCase();
  const countIn = (phrase: string, text: string) =>
    (text.match(new RegExp(`\\b${reSafe(phrase)}\\b`, 'g')) || []).length;

  const candidates = new Map<string, number>();
  let run: string[] = [];
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
  for (const w of tokenize(title)) {
    if (w.length >= 3 && !KW_STOP.has(w)) run.push(w);
    else flushRun();
  }
  flushRun();

  if (candidates.size > 0) return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const bodyWords = tokenize(bodyPlain).filter(w => w.length >= 3 && !KW_STOP.has(w));
  const freq: Record<string, number> = {};
  bodyWords.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]).join(' ');
};

// ── Content extraction ───────────────────────────────────────────────────────
// Only consider VISIBLE editor surfaces. Hidden textareas often hold encoded
// state / tokens (e.g. Actifit) which would poison the analysis.
const isVisible = (el: Element): boolean => {
  if ((el as HTMLElement).closest(`#${PANEL_ID}`)) return false; // never scan our own panel
  const s = getComputedStyle(el as HTMLElement);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  const r = el.getBoundingClientRect();
  return r.width >= 2 && r.height >= 2;
};

// Combined searchable attributes of a field, for classifying what it is.
const fieldAttrs = (el: Element): string =>
  `${el.getAttribute('placeholder') || ''} ${el.getAttribute('name') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('data-placeholder') || ''} ${el.id || ''} ${el.className || ''}`.toLowerCase();
// Fields that are neither the title nor the body: subtitle/preview/excerpt (the meta
// description), tag inputs, search boxes. "subtitle" contains "title", so this must be
// checked BEFORE the title match or the preview field gets mistaken for the title.
// Includes localized stems so non-English UIs are classified too: "descri" covers
// en/es/pt/it/fr (description/descripción/descrição/descrizione), "subtít" Spanish
// subtítulo, "beschr" de/nl (Beschreibung/beschrijving), "resum" es/pt/fr summary
// (resumen/resumo/résumé). Non-Latin scripts fall back to the structural check in
// getMetaDescription (Ecency's description textarea has a maxlength).
const DECOY_RE = /subtitle|subtít|preview|descri|beschr|excerpt|summary|resum|\btag\b|search|add\s*more/;
const TITLE_MARK_RE = /title|what is/;

// Convert a WYSIWYG editor's DOM to markdown. Reading .innerText loses the structure the
// analyzer scores on — headings, links and images — so a TipTap/ProseMirror editor
// (Ecency, InLeo) would otherwise report 0 links, no headings, and miss image alt text.
// Walking the DOM back to markdown restores every signal for those editors.
const domToMarkdown = (root: HTMLElement): string => {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const kids = () => Array.from(el.childNodes).map(walk).join('');
    switch (el.tagName.toLowerCase()) {
      case 'h1': return `\n# ${kids()}\n\n`;
      case 'h2': return `\n## ${kids()}\n\n`;
      case 'h3': return `\n### ${kids()}\n\n`;
      case 'h4': return `\n#### ${kids()}\n\n`;
      case 'h5': case 'h6': return `\n##### ${kids()}\n\n`;
      case 'p': case 'div': return `${kids()}\n\n`;
      case 'br': return '\n';
      case 'strong': case 'b': return `**${kids()}**`;
      case 'em': case 'i': return `*${kids()}*`;
      case 'code': return `\`${kids()}\``;
      case 'a': return `[${kids()}](${el.getAttribute('href') || ''})`;
      case 'img': return `![${el.getAttribute('alt') || ''}](${el.getAttribute('src') || ''})`;
      case 'li': return `${el.parentElement?.tagName.toLowerCase() === 'ol' ? '1. ' : '- '}${kids()}\n`;
      case 'ul': case 'ol': return `\n${kids()}\n`;
      case 'blockquote': return `\n> ${kids()}\n\n`;
      case 'pre': return `\n\`\`\`\n${kids()}\n\`\`\`\n\n`;
      case 'hr': return '\n---\n\n';
      default: return kids();
    }
  };
  return walk(root).replace(/\n{3,}/g, '\n\n').trim();
};

const getEditorContent = (): string => {
  let best = '';
  const consider = (txt: string) => { if (txt.length > best.length) best = txt; };
  // Visible markdown textareas (PeakD, hive.blog) — already markdown. Skip the title and
  // the meta/subtitle/tag decoys, or on Ecency's step 2 the excerpt textarea would be
  // mistaken for the body.
  for (const t of document.querySelectorAll<HTMLTextAreaElement>('textarea')) {
    if (!isVisible(t)) continue;
    const a = fieldAttrs(t);
    if (DECOY_RE.test(a) || TITLE_MARK_RE.test(a)) continue;
    consider(t.value);
  }
  // Visible rich-text editors (Ecency/InLeo TipTap, etc.) — reconstruct markdown from the DOM.
  for (const ce of document.querySelectorAll<HTMLElement>('[contenteditable="true"]')) {
    if (isVisible(ce)) consider(domToMarkdown(ce));
  }
  // CodeMirror editors (Actifit/EasyMDE = CM5 .CodeMirror-code, CM6 = .cm-content)
  for (const cm of document.querySelectorAll<HTMLElement>('.CodeMirror-code, .cm-content')) {
    if (isVisible(cm)) consider((cm.innerText || '').replace(/​/g, ''));
  }
  return best;
};

const getTitle = (): string => {
  // Ecency's vision-next editor makes the title a <textarea> (step 1) or a bare <input>
  // (step 2), so scan both, match on a title marker, and skip decoys FIRST — the
  // "Preview subtitle" excerpt field contains "title" and would otherwise win.
  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) {
    if (!isVisible(el)) continue;
    const a = fieldAttrs(el);
    if (DECOY_RE.test(a)) continue;
    if (TITLE_MARK_RE.test(a) && el.value.trim()) return el.value.trim();
  }
  for (const el of document.querySelectorAll<HTMLElement>(
    '[contenteditable][placeholder*="title" i],[contenteditable][data-placeholder*="title" i],[contenteditable][aria-label*="title" i],[contenteditable][class*="title" i]'
  )) {
    if (!isVisible(el) || DECOY_RE.test(fieldAttrs(el))) continue;
    const t = el.innerText?.trim();
    if (t) return t;
  }
  // Ecency step-1 structural fallback: first visible non-decoy <textarea> in .publish-page,
  // above the ProseMirror body. Locale-proof (placeholders are translated).
  const pub = document.querySelector('.publish-page');
  if (pub) {
    for (const ta of pub.querySelectorAll<HTMLTextAreaElement>('textarea')) {
      if (isVisible(ta) && !DECOY_RE.test(fieldAttrs(ta)) && ta.value.trim()) return ta.value.trim();
    }
  }
  return '';
};

const getMetaDescription = (): string => {
  // English + localized stems, so a Spanish "Descripción breve" / "Subtítulo…" placeholder
  // is matched, not just the English "Preview subtitle".
  const sels = [
    'textarea[placeholder*="preview" i]', 'textarea[placeholder*="descri" i]', 'textarea[placeholder*="beschr" i]',
    'textarea[placeholder*="excerpt" i]', 'textarea[placeholder*="subtitle" i]',
    'textarea[placeholder*="subtít" i]',  'textarea[placeholder*="summary" i]',
    'textarea[placeholder*="resum" i]',   'input[placeholder*="descri" i]', 'input[name="description" i]',
  ];
  for (const sel of sels) {
    for (const el of document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(sel)) {
      if (isVisible(el) && el.value.trim()) return el.value.trim();
    }
  }
  // Ecency locale-proof fallback: its preview-description textarea carries a maxlength that
  // neither the title textarea nor the contenteditable body have, so it's identifiable
  // whatever the UI language.
  if (/ecency\.com/.test(location.hostname)) {
    for (const ta of document.querySelectorAll<HTMLTextAreaElement>('textarea[maxlength]')) {
      if (isVisible(ta) && !TITLE_MARK_RE.test(fieldAttrs(ta)) && ta.value.trim()) return ta.value.trim();
    }
  }
  return '';
};

const getTags = (): string[] => {
  const TAG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t.length >= 2 && t.length <= 32 && TAG_RE.test(t)) seen.add(t);
  };
  // Ecency vision-next: explicit tag chips. Read the leaves directly so the wrapping
  // .tag-list / .tag-selector containers don't get concatenated into one bogus tag.
  const items = document.querySelectorAll('.tag-item');
  if (items.length) {
    items.forEach(it => add((it.textContent || '').replace(/[×✕✗✖]/g, '').trim()));
    if (seen.size) return [...seen].slice(0, 10);
  }
  // Chips carrying a tag/chip/pill class — PeakD, hive.blog, Actifit and friends. Unchanged
  // from the long-standing implementation: the class is the signal and any button inside is
  // the remove control (PeakD's ✕ is an SVG, so it contributes no text to match on).
  for (const el of document.querySelectorAll('[class*="tag" i], [class*="chip" i], [class*="pill" i]')) {
    const raw = el.textContent || '';
    const hasClose = /[×✕✗✖]/.test(raw) || !!el.querySelector('button, [class*="close" i], [class*="remove" i], [class*="delete" i]');
    if (!hasClose) continue;
    const txt = raw.replace(/[×✕✗✖]/g, '').trim();
    if (!txt || txt.includes(' ') || txt.length > 32) continue;
    add(txt);
  }

  // Chips with no class-based signal (SlothBuzz). Runs only when the scan above came up
  // empty, and reads shape rather than names — see utils/tagScan.ts for why a denylist
  // could not work here.
  if (!seen.size) scanChipTags(document, `#${PANEL_ID}`).forEach(add);

  for (const el of document.querySelectorAll<HTMLInputElement>('input[class*="tag" i], input[placeholder*="tag" i]')) {
    el.value.split(/[\s,]+/).forEach(add);
  }
  for (const sel of document.querySelectorAll<HTMLSelectElement>('select')) {
    if (sel.value) add(sel.value);
  }
  return [...seen].slice(0, 10);
};

const getImageCount = (content: string): number => {
  const md   = (content.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length;
  const html = (content.match(/<img[\s>]/gi) || []).length;
  // Rendered images inside visible editor surfaces (WYSIWYG + CodeMirror widgets)
  let dom = 0;
  for (const r of document.querySelectorAll('[contenteditable="true"], .CodeMirror, .cm-editor')) {
    if ((r as HTMLElement).closest(`#${PANEL_ID}`)) continue;
    dom += r.querySelectorAll('img').length;
  }
  // Source markdown (md) and rendered DOM may describe the same images — take the
  // larger rather than summing, to avoid double-counting in split editor/preview views
  return Math.max(md + html, dom);
};

// Alt text that doesn't describe the image: empty, a single generic placeholder word
// ("image", "photo", "imagen", "grafik"…), or a bare upload filename (e.g. "1100993.png").
// Editors set these defaults automatically, so they give Google and screen readers nothing —
// a post whose published markdown saves them as ![](url) would otherwise over-report in the
// editor DOM, where Ecency etc. hold alt="image" on the <img> element.
const GENERIC_ALT_WORDS = new Set([
  'image', 'img', 'photo', 'picture', 'pic', 'foto', 'imagen', 'imagem', 'grafik', 'bild',
  'screenshot', 'capture', 'captura', 'thumbnail',
]);
const isGenericAlt = (alt: string): boolean => {
  const lower = alt.trim().toLowerCase();
  if (!lower) return true;
  if (GENERIC_ALT_WORDS.has(lower)) return true;
  // bare filename — name plus a common image extension, no descriptive words
  if (/^[\w.-]+\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(lower)) return true;
  return false;
};

const missingAltImages = (content: string): string[] => {
  const out: string[] = [];
  const re = /!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (isGenericAlt(m[1])) {
      const file = m[2].split('/').pop()?.split('?')[0] || m[2];
      out.push(file.length > 24 ? file.slice(0, 21) + '…' : file);
    }
  }
  return out;
};

// Links classified as internal (Hive) vs external — both matter, differently.
// Internal links keep readers on-chain and build topical authority; external
// links are a citation/trust signal.
const classifyLinks = (content: string): { internal: number; external: number } => {
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

// Heading hierarchy: the title is the page H1, so a `# ` in the body creates a
// duplicate H1 (bad). Skipping levels (## → ####) also weakens structure.
const headingHierarchy = (content: string): { hasH1: boolean; skips: boolean; count: number } => {
  const levels = [...content.matchAll(/^(#{1,6})\s+\S/gm)].map(m => m[1].length);
  let skips = false, prev = 1; // title counts as H1
  for (const lvl of levels) { if (lvl > prev + 1) skips = true; prev = lvl; }
  return { hasH1: levels.includes(1), skips, count: levels.filter(l => l >= 2).length };
};

// Title click-through signals — numbers, power words, brackets all lift CTR
const POWER_WORDS = ['ultimate','best','how','why','guide','tips','easy','proven','essential',
  'complete','secret','simple','quick','free','new','top','review','vs','beginner','step'];
const titleCtr = (title: string) => {
  const lower = title.toLowerCase();
  return {
    hasNumber:  /\d/.test(title),
    hasPower:   POWER_WORDS.some(w => new RegExp(`\\b${w}\\b`).test(lower)),
    hasBracket: /[\[\(]/.test(title),
  };
};

// Search intent / post format inferred from the title — drives the SEO "format
// match" check AND the GEO content-type detection
type IntentType = 'How-to / Guide' | 'List' | 'Question / Informational' | 'Review / Comparison' | 'General / Personal';
const detectIntent = (title: string, content: string): { type: IntentType; matched: boolean; hint: string } => {
  const t = title.toLowerCase();
  if (/^how to|^how i|\bguide\b|\btutorial\b|step[- ]by[- ]step/.test(t)) {
    const steps = (content.match(/^(?:\d+\.|[-*])\s+/gm) || []).length;
    const heads = (content.match(/^#{2,4}\s+/gm) || []).length;
    const ok = steps >= 3 || heads >= 2;
    return { type: 'How-to / Guide', matched: ok, hint: ok ? 'Has clear steps/sections' : 'Add numbered steps or step subheadings' };
  }
  if (/^\d+\s|\btop\s+\d+|\bbest\s+\d+|\blist of\b|\d+\s+(ways|tips|reasons|things)/.test(t)) {
    const items = (content.match(/^(?:\d+\.|[-*])\s+/gm) || []).length;
    return { type: 'List', matched: items >= 3, hint: items >= 3 ? `${items} list items` : 'Add a numbered/bulleted list' };
  }
  if (/\?$|^what\b|^why\b|^when\b|^where\b|^who\b|^which\b|^is\b|^are\b|^can\b|^should\b/.test(t)) {
    return { type: 'Question / Informational', matched: true, hint: 'Answer the question directly in the first paragraph' };
  }
  if (/\breview\b|\bvs\.?\b|\bcomparison\b|\bcompared\b/.test(t)) {
    return { type: 'Review / Comparison', matched: true, hint: 'Include pros/cons and a clear verdict' };
  }
  return { type: 'General / Personal', matched: true, hint: '' };
};

// ── Readability ──────────────────────────────────────────────────────────────
const syllables = (word: string): number => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const s = w.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const g = s.match(/[aeiouy]{1,2}/g);
  return g ? g.length : 1;
};
const readability = (text: string): { grade: number; ease: number } => {
  const plain = stripMd(text).replace(/\n+/g, '. ');
  const sentences = Math.max(1, (plain.match(/[.!?]+/g) || []).length);
  const words     = plain.split(/\s+/).filter(w => w.length > 0);
  const wc        = words.length || 1;
  const syl       = words.reduce((s, w) => s + syllables(w), 0);
  return {
    ease:  Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (wc / sentences) - 84.6 * (syl / wc)))),
    grade: Math.max(0, Math.round((0.39 * (wc / sentences) + 11.8 * (syl / wc) - 15.59) * 10) / 10),
  };
};

const TRANSITIONS = [
  'also','although','because','besides','but','consequently','despite','even though',
  'finally','first','for example','for instance','furthermore','hence','however',
  'in addition','in conclusion','in contrast','in fact','instead','likewise',
  'meanwhile','moreover','nevertheless','next','on the other hand','otherwise',
  'similarly','since','so','still','subsequently','therefore','though','thus',
  'ultimately','whereas','while','yet',
];
const transitionRatio = (text: string): number => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 8);
  if (sentences.length < 3) return 100;
  const hits = sentences.filter(s => TRANSITIONS.some(tw => s.toLowerCase().includes(tw))).length;
  return Math.round((hits / sentences.length) * 100);
};

// ── Keyword analysis ─────────────────────────────────────────────────────────
interface KwResult {
  inTitle: boolean; frontLoaded: boolean; inFirst100: boolean;
  inHeading: boolean; inMetaDesc: boolean; inPermlink: boolean;
  density: number; isLongTail: boolean;
}
const analyzeKeyword = (kw: string, content: string, title: string, metaDesc: string): KwResult => {
  const k = kw.toLowerCase().trim();
  if (!k) return { inTitle: false, frontLoaded: false, inFirst100: false, inHeading: false, inMetaDesc: false, inPermlink: false, density: 0, isLongTail: false };

  const titleL  = title.toLowerCase();
  const inTitle = titleL.includes(k);
  const frontLoaded = inTitle && titleL.indexOf(k) < title.length * 0.5;

  const plain = stripMd(content);
  const inFirst100 = plain.split(/\s+/).slice(0, 100).join(' ').toLowerCase().includes(k);

  const mdHeads = content.match(/^#{2,4}\s+.+/mg) || [];
  let inHeading = mdHeads.some(h => h.toLowerCase().includes(k));
  if (!inHeading) {
    document.querySelectorAll('[contenteditable="true"] h2, [contenteditable="true"] h3')
      .forEach(h => { if (h.textContent?.toLowerCase().includes(k)) inHeading = true; });
  }

  const inMetaDesc = metaDesc.toLowerCase().includes(k);
  const inPermlink = !!title && toPermlink(title).includes(toPermlink(k));

  const allW = plain.split(/\s+/).filter(w => w.length > 0);
  const hits = (plain.toLowerCase().match(new RegExp(`\\b${reSafe(k)}\\b`, 'g')) || []).length;
  const density = allW.length > 0 ? Math.round((hits / allW.length) * 1000) / 10 : 0;

  return { inTitle, frontLoaded, inFirst100, inHeading, inMetaDesc, inPermlink, density, isLongTail: k.includes(' ') };
};

// ── GEO / AEO analysis (AI extractability) ───────────────────────────────────
// Content-type aware: personal/creative posts are scored ONLY on the universal
// checks (so a poem can still score 100); informational posts add boosters.
interface GeoItem { label: string; score: number; max: number; hint: string; info: string; }
interface GeoResult { informational: boolean; score: number; items: GeoItem[]; }

const THIRD_PRON = /\b(it|this|that|these|those|they|them|their|theirs|he|she|him|her|hers|his|its)\b/gi;
const START_PRON = /^(it|this|that|these|those|they|there|here)\b/i;

const analyzeGeo = (content: string, intentType: IntentType): GeoResult => {
  const informational = intentType !== 'General / Personal';
  const plain = stripMd(content);
  const words = plain.split(/\s+/).filter(Boolean);
  const sentences = plain.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10);

  // Hook / summary near the top
  const head = content.slice(0, 700);
  const explicitSummary = /\b(tl;?dr|in summary|in short|summary:|key takeaway|overview)\b/i.test(head);
  const firstPara = content.split(/\n{2,}/).map(p => stripMd(p).trim()).find(p => p.length > 30) || '';
  const fpWords = firstPara.split(/\s+/).filter(Boolean).length;
  let hookScore01 = 0;
  if (explicitSummary || (fpWords >= 8 && fpWords <= 60)) hookScore01 = 1;
  else if (fpWords > 60 && fpWords <= 100) hookScore01 = 0.5;
  const hookHint = hookScore01 === 1 ? 'Clear opening summary' :
    hookScore01 === 0.5 ? 'Opening paragraph is long — tighten it to a 1–2 sentence hook' :
    'Open with a 1–2 sentence summary (or a TL;DR) of what the post covers';

  // Self-contained statements — sentences shouldn't open with a bare pronoun
  const startPron = sentences.filter(s => START_PRON.test(s)).length;
  const startRatio = sentences.length ? startPron / sentences.length : 0;
  let scScore01 = startRatio < 0.1 ? 1 : startRatio < 0.2 ? 0.8 : startRatio < 0.3 ? 0.5 : 0.2;
  if (sentences.length < 3) scScore01 = 1;
  const scHint = scScore01 >= 0.8 ? 'Sentences stand on their own' :
    `${Math.round(startRatio * 100)}% of sentences start with "it/this/that" — name the subject instead so AI can quote them`;

  // Clear entity naming — overall third-person pronoun density
  const pronTotal = (plain.match(THIRD_PRON) || []).length;
  const pronRatio = words.length ? pronTotal / words.length : 0;
  let entScore01 = pronRatio < 0.04 ? 1 : pronRatio < 0.07 ? 0.7 : 0.4;
  if (words.length < 40) entScore01 = 1;
  const entHint = entScore01 >= 0.7 ? 'Subjects are named clearly' :
    'Repeat key names/terms instead of "it/they" — AI engines extract named entities, not pronouns';

  const items: GeoItem[] = [];
  const add = (label: string, s01: number, max: number, hint: string, info: string) =>
    items.push({ label, score: Math.round(s01 * max), max, hint, info });

  if (!informational) {
    // Personal / creative — 3 universal checks total 100
    add('Opening hook',      hookScore01, 40, hookHint, 'AI assistants and previews lead with your first lines. A clear opening sentence makes your post quotable and shareable — even for a personal story.');
    add('Self-contained',    scScore01,   35, scHint,   'AI pulls individual sentences out of context. Sentences that start with "it/this" lose their meaning when quoted alone.');
    add('Clear subjects',    entScore01,  25, entHint,  'Retrieval systems index named entities (people, places, things). Naming them — instead of "it/they" — makes your post findable and citable.');
  } else {
    // Informational — universal (45) + boosters (55)
    add('Opening hook',   hookScore01, 20, hookHint, 'AI answer engines lead with a summary. A TL;DR or tight opening paragraph is the chunk most likely to be cited.');
    add('Self-contained', scScore01,   15, scHint,   'AI pulls individual sentences out of context. Sentences starting with "it/this" lose meaning when quoted alone.');
    add('Clear subjects', entScore01,  10, entHint,  'Retrieval systems index named entities. Naming them — not "it/they" — makes your facts citable.');

    // Q&A / answerable structure
    const qHeads = (content.match(/^#{2,4}\s+.*\?\s*$/mg) || []).length;
    const faqMark = /\bfaq\b|^\s*q[:.]/im.test(content);
    let qa01 = qHeads >= 1 || faqMark ? 1 : (content.match(/^#{2,4}\s+/gm) || []).length >= 2 ? 0.5 : 0;
    add('Answerable structure', qa01, 20,
      qa01 === 1 ? 'Has question-style headings' : qa01 === 0.5 ? 'Turn some headings into the questions readers ask' : 'Add question-style headings (e.g. "How does X work?") — AI matches these to user queries',
      'AI answer engines map content to the questions people ask. Headings phrased as questions get matched and surfaced directly.');

    // Definitional clarity
    const defs = (plain.match(/\b[A-Za-z][\w-]+ (?:is|are|refers to|means|is defined as) (?:a|an|the|when|where|the process|any)\b/gi) || []).length;
    const def01 = defs >= 2 ? 1 : defs === 1 ? 0.5 : 0;
    add('Definitional clarity', def01, 15,
      def01 === 1 ? 'Contains clear definitions' : def01 === 0.5 ? 'Add one more plain "X is …" definition' : 'State key terms plainly ("X is …") — AI extracts definitions verbatim',
      'Generative engines love clean definitional sentences ("A permlink is …"). They get quoted directly in AI answers.');

    // Concrete data / specifics
    const nums = (plain.match(/\b\d+(?:[.,]\d+)?%?\b/g) || []).length;
    const { external } = classifyLinks(content);
    let data01 = 0;
    if (nums >= 3 && external > 0) data01 = 1;
    else if (nums >= 3) data01 = 0.7;
    else if (nums >= 1) data01 = 0.4;
    add('Concrete data', data01, 20,
      data01 === 1 ? 'Specific figures with sources' : data01 >= 0.4 ? 'Add a source link next to your figures' : 'Add specific numbers/dates/stats — AI cites concrete facts over vague claims',
      'AI answers prefer specific, verifiable facts (numbers, dates, stats) — ideally with a source link. Vague claims rarely get cited.');
  }

  const score = items.reduce((s, i) => s + i.score, 0);
  return { informational, score, items };
};

// ── Full SEO analysis ────────────────────────────────────────────────────────
// Score max: 100 with keyword | 65 without
//   Keyword 35 · Title 13 · Meta 12 · Structure 12 · Links 8 · Tags 8 · Readability 12
interface Analysis {
  wordCount: number; readMinutes: number; imageCount: number;
  title: string; titleChars: number; subheadings: number; permlink: string;
  tags: string[]; metaDesc: string; grade: number; ease: number;
  kw: KwResult; hasKw: boolean; keyword: string;
  seoScore: number; seoMax: number;
  links: { internal: number; external: number }; noAltFiles: string[];
  longestPara: number; transitionPct: number; suggestedTags: string[];
  intent: { type: IntentType; matched: boolean; hint: string };
  geo: GeoResult;
  breakdown: { label: string; score: number; max: number; hint: string }[];
  checklist: { label: string; pass: boolean }[];
}

const analyze = (content: string, title: string, tags: string[], metaDesc: string, keyword: string): Analysis => {
  const plain = stripMd(content);
  const words = plain.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));
  const imageCount = getImageCount(content);
  const titleChars = title.length;
  const permlink = toPermlink(title);
  const subheadings = (content.match(/^#{2,4}\s+.+/mg) || []).length +
                      document.querySelectorAll('[contenteditable="true"] h2, [contenteditable="true"] h3').length;
  const hierarchy = headingHierarchy(content);
  const { grade, ease } = wordCount > 20 ? readability(content) : { grade: 0, ease: 0 };
  const kw = analyzeKeyword(keyword, content, title, metaDesc);
  const links = classifyLinks(content);
  const noAltFiles = missingAltImages(content);
  const suggestedTags = suggestTags(title + ' ' + plain, tags);
  const longestPara = (() => {
    const paras = content.split(/\n{2,}/).filter(p => p.trim().length > 0);
    const lens = paras.map(p => stripMd(p).split(/\s+/).filter(Boolean).length);
    return lens.length ? Math.max(...lens) : 0;
  })();
  const transitionPct = wordCount > 50 ? transitionRatio(plain) : 100;
  const intent = detectIntent(title, content);
  const ctr = titleCtr(title);
  const hasKw = keyword.trim().length > 0;
  // The community (hive-XXXXXX) is the posting destination, not a discovery tag —
  // exclude it from the "3–5 tags" recommendation
  const contentTags = tags.filter(t => !/^hive-\d+$/.test(t));

  // Keyword — 35
  let kwScore = 0, kwHint = '';
  if (hasKw) {
    kwScore = (kw.inTitle ? 8 : 0) + (kw.frontLoaded ? 4 : 0) + (kw.inFirst100 ? 10 : 0) +
              (kw.inHeading ? 7 : 0) + (kw.inPermlink ? 3 : 0) + (kw.inMetaDesc ? 3 : 0);
    const miss: string[] = [];
    if (!kw.inFirst100) miss.push('first 100 words');
    if (!kw.inHeading)  miss.push('a subheading');
    if (!kw.inTitle)    miss.push('title');
    if (!kw.inMetaDesc) miss.push('preview description');
    kwHint = miss.length === 0 ? `"${keyword}" well placed` : `Add "${keyword}" to: ${miss.slice(0, 2).join(', ')}`;
  } else {
    kwHint = 'Enter a keyword above to unlock 35 pts';
  }

  // Title — 12 (length 8 + CTR 4)
  let titleLen = 0, titleHint = '';
  if (!title)              { titleHint = 'Add a title'; }
  else if (titleChars < 20)   { titleLen = 2; titleHint = `${titleChars} chars — too short (aim 50–60)`; }
  else if (titleChars < 50)   { titleLen = 5; titleHint = `${titleChars} chars — slightly short for SERPs`; }
  else if (titleChars <= 60)  { titleLen = 8; titleHint = `${titleChars} chars — ideal SERP length`; }
  else if (titleChars <= 70)  { titleLen = 5; titleHint = `${titleChars} chars — may truncate in Google`; }
  else                        { titleLen = 3; titleHint = `${titleChars} chars — truncated by Google (>60)`; }
  const ctrScore = Math.min(4, (ctr.hasNumber ? 2 : 0) + (ctr.hasPower ? 1 : 0) + (ctr.hasBracket ? 1 : 0));
  const titleScore = title ? titleLen + ctrScore : 0;
  if (title && ctrScore < 2) titleHint += ' · add a number or power word for clicks';

  // Meta — 10
  const metaLen = metaDesc.length;
  let metaScore = 0, metaHint = '';
  if (!metaDesc)           { metaHint = 'Fill the preview description — Google shows it as your SERP snippet'; }
  else if (metaLen < 50)   { metaScore = 4;  metaHint = `${metaLen} chars — too short, aim 120–160`; }
  else if (metaLen < 120)  { metaScore = 7;  metaHint = `${metaLen} chars — good, could be fuller`; }
  else if (metaLen <= 160) { metaScore = 10; metaHint = `${metaLen} chars — ideal snippet length`; }
  else                     { metaScore = 7;  metaHint = `${metaLen} chars — may truncate (>160)`; }

  // Structure — 11 (subheadings 7 + hierarchy 4)
  let subScore = 0, structHint = '';
  if (subheadings > 0)      { subScore = 7; structHint = `${subheadings} subheading${subheadings > 1 ? 's' : ''}`; }
  else if (wordCount < 400) { subScore = 5; structHint = 'Short post — subheadings optional'; }
  else                      { subScore = 0; structHint = 'Add ## subheadings — Google uses them for rich snippets'; }
  let hierScore = subheadings > 0 ? Math.max(0, 4 - (hierarchy.hasH1 ? 2 : 0) - (hierarchy.skips ? 2 : 0)) : 0;
  if (hierarchy.hasH1) structHint += ' · avoid "# " in body (title is the H1)';
  else if (hierarchy.skips) structHint += ' · don’t skip heading levels';
  const structScore = subScore + hierScore;

  // Media — 9. All-or-nothing: any post with at least one image whose alt text is
  // descriptive scores full marks; a single image is enough. (The score does not
  // split 4/5 between 'has an image' and 'has alt text' — an earlier comment claimed
  // it did, but the code has never worked that way.)
  let mediaScore = 0, mediaHint = '';
  if (imageCount === 0)            { mediaHint = 'No image — posts with images get ~2× engagement'; }
  else if (noAltFiles.length === 0){ mediaScore = 9; mediaHint = `${imageCount} image${imageCount > 1 ? 's' : ''} · alt text OK`; }
  else                             { mediaScore = 4; mediaHint = `${noAltFiles.length} image(s) need descriptive alt text`; }

  // Links — 7 (external/citation 3 + internal/on-chain 4)
  const linkScore = (links.external > 0 ? 3 : 0) + (links.internal > 0 ? 4 : 0);
  let linkHint = '';
  if (linkScore === 0)            linkHint = 'Add links — cite a source and link one of your past posts';
  else if (links.internal === 0)  linkHint = 'Link one of your own past posts (keeps readers on Hive)';
  else if (links.external === 0)  linkHint = 'Cite an external source for added trust';
  else                            linkHint = `${links.internal} internal · ${links.external} external`;

  // Tags — 8 (community tag excluded from the count)
  const nTags = contentTags.length;
  let tagScore = 0, tagHint = '';
  if (nTags === 0)     { tagHint = 'No content tags detected'; }
  else if (nTags < 3)  { tagScore = 3; tagHint = `${nTags} content tag(s) — add 3–5`; }
  else if (nTags <= 5) { tagScore = 8; tagHint = `${nTags} content tags`; }
  else                 { tagScore = 5; tagHint = `${nTags} content tags — 5 max`; }

  // Readability — 8 (ease 5 + transitions 3)
  let readScore = 0, readHint = '';
  if (wordCount < 50) { readScore = 4; readHint = 'Not enough content yet'; }
  else {
    const easeScore  = ease >= 60 ? 5 : ease >= 40 ? 4 : ease >= 20 ? 2 : 1;
    const transScore = transitionPct >= 30 ? 3 : transitionPct >= 15 ? 2 : 0;
    readScore = easeScore + transScore;
    const parts: string[] = [];
    if (ease < 50) parts.push('shorter sentences');
    if (transitionPct < 20) parts.push('more connectors');
    readHint = parts.length ? `Improve: ${parts.join(', ')}` : `Ease ${ease}/100 · ${transitionPct}% transitions`;
  }

  const seoMax   = hasKw ? 100 : 65;
  const seoScore = kwScore + titleScore + metaScore + structScore + mediaScore + linkScore + tagScore + readScore;

  const breakdown: Analysis['breakdown'] = [
    ...(hasKw ? [{ label: 'Keyword', score: kwScore, max: 35, hint: kwHint }] : []),
    { label: 'Title',       score: titleScore,  max: 12, hint: titleHint },
    { label: 'Meta desc',   score: metaScore,   max: 10, hint: metaHint },
    { label: 'Structure',   score: structScore, max: 11, hint: structHint },
    { label: 'Media',       score: mediaScore,  max: 9,  hint: mediaHint },
    { label: 'Links',       score: linkScore,   max: 7,  hint: linkHint },
    { label: 'Tags',        score: tagScore,    max: 8,  hint: tagHint },
    { label: 'Readability', score: readScore,   max: 8,  hint: readHint },
  ];

  const checklist: Analysis['checklist'] = [
    { label: 'Title 50–60 characters',     pass: titleChars >= 50 && titleChars <= 60 },
    { label: 'Preview description filled',  pass: metaDesc.length >= 80 },
    ...(hasKw ? [
      { label: `"${keyword}" in title`,        pass: kw.inTitle },
      { label: `"${keyword}" in first 100 words`, pass: kw.inFirst100 },
      { label: `"${keyword}" in the URL slug`, pass: kw.inPermlink },
    ] : []),
    ...(intent.type !== 'General / Personal' ? [{ label: `${intent.type} format`, pass: intent.matched }] : []),
    { label: 'Has ## subheadings',         pass: subheadings > 0 },
    { label: 'Links a past/own post',      pass: links.internal > 0 },
    { label: '3–5 content tags',           pass: nTags >= 3 && nTags <= 5 },
    { label: '1,000+ words',               pass: wordCount >= 1000 },
    { label: 'Images have descriptive alt text', pass: imageCount === 0 || noAltFiles.length === 0 },
    { label: 'At least 1 image',           pass: imageCount >= 1 },
  ];

  const geo = analyzeGeo(content, intent.type);

  return { wordCount, readMinutes, imageCount, title, titleChars, subheadings, permlink, tags, metaDesc, grade, ease, kw, hasKw, keyword, seoScore, seoMax, links, noAltFiles, longestPara, transitionPct, suggestedTags, intent, geo, breakdown, checklist };
};

// ── Keyword suggestions ──────────────────────────────────────────────────────
// Skims the draft and ranks candidate focus keywords by what they would actually score.
//
// Deliberately a SHORTLIST, not an auto-pick. The score measures keyword *placement* —
// title, first 100 words, a subheading, the URL slug — not whether anyone searches the
// term. On our own contest post the top-scoring candidate was "week" (92%), which is
// worthless as a keyword, while the real target "hivepulse seo contest" scored 75%.
// Auto-applying the winner would confidently hand out bad SEO advice, so the button
// surfaces the options with their scores and the writer chooses.
const GENERIC_KW = new Set([
  'week','day','days','today','time','times','part','update','news','post','blog','thing',
  'things','way','ways','now','then','here','there','more','most','back','next','last',
  'first','one','two','three','year','month','edition','round','issue',
]);

interface KwSuggestion { keyword: string; pct: number; generic: boolean; }

const suggestKeywords = (
  content: string, title: string, tags: string[], metaDesc: string,
): KwSuggestion[] => {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !KW_STOP.has(w));
  const cands = new Set<string>();
  const auto = autoDetectKeyword(title, content);
  if (auto) cands.add(auto);
  for (let n = 1; n <= 3; n++)
    for (let i = 0; i + n <= words.length; i++) cands.add(words.slice(i, i + n).join(' '));

  const plain = stripMd(content).toLowerCase();
  const out: KwSuggestion[] = [];
  for (const kw of cands) {
    if (!kw) continue;
    // must actually appear in the body — a keyword the post never uses is not a keyword
    if (!plain.includes(kw)) continue;
    const a = analyze(content, title, tags, metaDesc, kw);
    const parts = kw.split(' ');
    out.push({
      keyword: kw,
      pct: Math.round((a.seoScore / a.seoMax) * 100),
      generic: parts.length === 1 && GENERIC_KW.has(kw),
    });
  }
  // Non-generic first, then by score, then prefer the longer (more specific) phrase.
  out.sort((x, y) =>
    (Number(x.generic) - Number(y.generic)) ||
    (y.pct - x.pct) ||
    (y.keyword.split(' ').length - x.keyword.split(' ').length));
  return out.slice(0, 5);
};

// ── Colours ──────────────────────────────────────────────────────────────────
const scoreColor = (pct: number) => pct >= 70 ? '#34d399' : pct >= 45 ? '#fbbf24' : '#f87171';
const wcColor    = (n: number)   => n >= 1500 ? '#34d399' : n >= 1000 ? '#6ee7b7' : n >= 300 ? '#fbbf24' : '#f87171';
const gradeInfo  = (g: number)   =>
  g <= 6  ? { label: 'Easy',        color: '#34d399' } :
  g <= 9  ? { label: 'Accessible',  color: '#34d399' } :
  g <= 12 ? { label: 'Standard',    color: '#fbbf24' } :
  g <= 16 ? { label: 'Academic',    color: '#fbbf24' } :
            { label: 'Dense',       color: '#f87171' };

// ── Panel shell ──────────────────────────────────────────────────────────────
let activeTab: 'seo' | 'geo' = 'seo';
let openInfo: string | null = null;
// Last render args so tab/info clicks can re-render without recomputing
let lastArgs: { a: Analysis; kw: string; auto: boolean; onKw: (k: string) => void } | null = null;
// Raw inputs kept alongside, so the keyword suggester can re-score the draft against
// candidate keywords without the caller having to thread them through renderPanel.
let lastInputs: { content: string; title: string; tags: string[]; metaDesc: string } | null = null;
let kwSuggestions: KwSuggestion[] | null = null;   // non-null while the shortlist is open
const rerender = () => { if (lastArgs) renderPanel(lastArgs.a, lastArgs.kw, lastArgs.auto, lastArgs.onKw); };

const styleTabs = () => {
  (['seo', 'geo'] as const).forEach(tab => {
    const el = document.getElementById(`${PANEL_ID}-tab-${tab}`);
    if (!el) return;
    const on = activeTab === tab;
    Object.assign(el.style, {
      background: on ? '#0f172a' : 'transparent',
      color: on ? '#f97316' : '#94a3b8',
      borderBottom: on ? '2px solid #f97316' : '2px solid transparent',
      fontWeight: on ? '700' : '600',
    });
  });
};

const createPanel = (): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.id = PANEL_ID;
  Object.assign(wrap.style, {
    position: 'fixed', top: '80px', right: '16px', width: '278px', zIndex: '2147483647',
    maxHeight: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '12px', color: '#e2e8f0',
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    overflow: 'hidden', userSelect: 'none',
  });
  const sbStyle = document.createElement('style');
  sbStyle.textContent =
    `#${PANEL_ID}-body::-webkit-scrollbar{width:6px}` +
    `#${PANEL_ID}-body::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}` +
    `#${PANEL_ID}-body::-webkit-scrollbar-track{background:transparent}`;
  wrap.appendChild(sbStyle);

  // Header
  const hdr = document.createElement('div');
  Object.assign(hdr.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #334155', background: '#162032',
    flex: '0 0 auto',
  });
  hdr.innerHTML =
    `<span style="color:#f97316;font-weight:700;font-size:13px">&#9889; Post Analyzer</span>` +
    `<span style="color:#64748b;font-weight:600;font-size:10px;margin-left:6px">v${extVersion}</span>` +
    `<span id="${PANEL_ID}-tog" style="color:#94a3b8;font-size:10px">&#9660;</span>`;
  hdr.addEventListener('click', () => {
    const bodyWrap = document.getElementById(`${PANEL_ID}-scroll`);
    const tabs = document.getElementById(`${PANEL_ID}-tabs`);
    const tog  = document.getElementById(`${PANEL_ID}-tog`);
    if (!bodyWrap || !tog || !tabs) return;
    const hide = bodyWrap.style.display !== 'none';
    bodyWrap.style.display = hide ? 'none' : 'flex';
    tabs.style.display = hide ? 'none' : 'flex';
    tog.innerHTML = hide ? '&#9650;' : '&#9660;';
  });
  wrap.appendChild(hdr);

  // Tab bar
  const tabs = document.createElement('div');
  tabs.id = `${PANEL_ID}-tabs`;
  Object.assign(tabs.style, { display: 'flex', flex: '0 0 auto', borderBottom: '1px solid #334155' });
  const mkTab = (id: 'seo' | 'geo', label: string) => {
    const b = document.createElement('div');
    b.id = `${PANEL_ID}-tab-${id}`;
    b.textContent = label;
    Object.assign(b.style, {
      flex: '1', textAlign: 'center', padding: '9px 4px', cursor: 'pointer',
      fontSize: '11px', letterSpacing: '.02em',
    });
    b.addEventListener('click', () => { activeTab = id; openInfo = null; styleTabs(); rerender(); });
    return b;
  };
  tabs.appendChild(mkTab('seo', '📊 SEO'));
  tabs.appendChild(mkTab('geo', '🤖 AI / GEO'));
  wrap.appendChild(tabs);

  // Scroll body
  const body = document.createElement('div');
  body.id = `${PANEL_ID}-scroll`;
  Object.assign(body.style, { display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: '1 1 auto', minHeight: '0' });
  const inner = document.createElement('div');
  inner.id = `${PANEL_ID}-body`;
  Object.assign(inner.style, { padding: '12px 14px', overflowY: 'auto', overscrollBehavior: 'contain', flex: '1 1 auto', minHeight: '0' });
  inner.innerHTML = `<div style="color:#94a3b8;font-size:11px;text-align:center;padding:10px 0">Start writing to see analysis…</div>`;
  body.appendChild(inner);
  wrap.appendChild(body);

  styleTabs();
  return wrap;
};

// ── Render helpers ───────────────────────────────────────────────────────────
const sec = (border = true) => {
  const d = document.createElement('div');
  Object.assign(d.style, { paddingTop: '10px', marginBottom: '10px', ...(border ? { borderTop: '1px solid #334155' } : {}) });
  return d;
};
const sectionHeader = (text: string) =>
  `<div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">${text}</div>`;
const checkRow = (label: string, pass: boolean) =>
  `<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;font-size:11px;color:${pass ? '#cbd5e1' : '#fca5a5'}">
    <span style="font-size:12px;color:${pass ? '#34d399' : '#f87171'};flex-shrink:0">${pass ? '✓' : '✗'}</span>
    <span>${esc(label)}</span>
  </div>`;

// Crisp CSS-drawn info icon — the Unicode ⓘ renders blurry across fonts
const infoIcon = (attr: string, val: string, open: boolean) => {
  const c = open ? '#f97316' : '#64748b';
  return `<span ${attr}="${esc(val)}" style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:1.2px solid ${c};color:${c};border-radius:50%;font-size:9px;font-weight:700;font-style:italic;font-family:Georgia,'Times New Roman',serif;line-height:1;cursor:pointer;flex-shrink:0">i</span>`;
};

// SEO indicator explanations
const INFO: Record<string, { what: string; how: string }> = {
  'Keyword': { what: 'Whether your focus keyword sits where search engines weight it most: title, the first 100 words, a subheading, the URL slug, and the preview description.', how: 'Work the exact phrase naturally into those spots. Never force it — if it reads awkwardly, rephrase.' },
  'Title': { what: 'Google shows ~50–60 characters of a title. Numbers, power words and brackets also lift click-through rate.', how: 'Aim for 50–60 chars, keyword near the start, and add a number or word like "guide"/"best".' },
  'Meta desc': { what: 'The preview description becomes the grey snippet under your link in Google. 120–160 characters is ideal.', how: 'Summarise the post in 1–2 sentences, include the keyword, and give a reason to click.' },
  'Structure': { what: 'Subheadings (##) plus a correct heading hierarchy. The title is the page H1, so a "# " in the body creates a duplicate H1.', how: 'Use ## / ### only in the body, one section every 200–300 words, never skip a level.' },
  'Media': { what: 'Whether the post has images and whether they carry alt text. Images lift engagement and dwell time; alt text is a direct image-search and accessibility signal Google reads.', how: 'Add at least one relevant image and describe each: ![a hiking trail at sunset](url) — not ![](url), ![image](url) or ![IMG_1234.png](url). Editors often fill the filename in for you; replace it with a real description.' },
  'Links': { what: 'Internal links (to your own/other Hive posts) keep readers on-chain and build topical authority; external links cite sources and add trust.', how: 'Link at least one past post of yours and cite one external source.' },
  'Tags': { what: 'Hive tags drive discovery in frontends — topic feeds, trending, communities. 3–5 relevant tags is best.', how: 'Pick 3–5 specific tags. The first tag is permanent after publishing — choose carefully.' },
  'Readability': { what: 'Flesch reading ease (sentence/word length) plus transition-word usage. Easier text keeps readers longer.', how: 'Shorter sentences, everyday words, connectors like "however"/"for example".' },
};

// ── Shared top (pills + word bar) ────────────────────────────────────────────
const renderShared = (body: HTMLElement, a: Analysis) => {
  const wc = a.wordCount, col = wcColor(wc);
  const wlbl = wc >= 2500 ? 'Optimal' : wc >= 1500 ? 'Great' : wc >= 1000 ? 'Good' : wc >= 600 ? 'Building' : wc >= 300 ? 'Short' : 'Very short';
  const pct = Math.min(100, (wc / 2500) * 100).toFixed(1);

  const health = document.createElement('div');
  Object.assign(health.style, { display: 'flex', gap: '6px', marginBottom: '10px' });
  const pill = (val: string, sub: string, c: string) =>
    `<div style="flex:1;text-align:center;padding:7px 4px;background:#0f172a;border-radius:8px;border:1px solid #334155">` +
    `<div style="font-size:14px;font-weight:700;color:${c}">${val}</div>` +
    `<div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:2px">${sub}</div></div>`;
  health.innerHTML =
    pill(wc >= 1000 ? `${(wc / 1000).toFixed(1)}k` : `${wc}`, 'words', col) +
    pill(`~${a.readMinutes}m`, 'read', '#94a3b8') +
    pill(`${a.imageCount}`, 'imgs', a.imageCount > 0 ? '#94a3b8' : '#f87171');
  body.appendChild(health);

  const bar = document.createElement('div');
  Object.assign(bar.style, { marginBottom: '12px' });
  bar.innerHTML = `
    <div style="background:#0f172a;border-radius:4px;height:6px;overflow:hidden;margin-bottom:4px;border:1px solid #334155">
      <div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width .4s"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b">
      <span>0</span><span>300</span><span>1k</span><span>2.5k</span>
      <span style="color:${col};font-weight:700">${wlbl}</span>
    </div>`;
  body.appendChild(bar);
};

// ── SEO tab ──────────────────────────────────────────────────────────────────
const renderSeoTab = (body: HTMLElement, a: Analysis, keyword: string, isAuto: boolean, onKeyword: (kw: string) => void) => {
  // Focus keyword input
  const kwWrap = document.createElement('div');
  Object.assign(kwWrap.style, { marginBottom: '12px', padding: '8px 10px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' });
  const kwInput = document.createElement('input');
  kwInput.type = 'text'; kwInput.placeholder = 'e.g. hive blockchain tips'; kwInput.value = keyword;
  Object.assign(kwInput.style, { width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: '11px', fontFamily: 'inherit', boxSizing: 'border-box' });
  kwInput.addEventListener('input',   () => onKeyword(kwInput.value));
  kwInput.addEventListener('keydown', e => e.stopPropagation());
  kwInput.addEventListener('click',   e => e.stopPropagation());
  kwWrap.innerHTML =
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">` +
    `<span style="font-size:10px;color:#94a3b8;font-weight:600">🎯 Focus keyword</span>` +
    `<span style="display:flex;align-items:center;gap:6px">` +
    (isAuto ? `<span style="font-size:9px;color:#64748b;border:1px solid #334155;padding:1px 6px;border-radius:4px">auto · edit to override</span>` : '') +
    `<button id="${PANEL_ID}-kw-suggest" style="font-size:9px;color:#fbbf24;background:transparent;border:1px solid #78350f;padding:1px 7px;border-radius:4px;cursor:pointer;font-family:inherit">${kwSuggestions ? 'hide' : '✨ suggest'}</button>` +
    `</span></div>`;
  kwWrap.appendChild(kwInput);

  // Ranked shortlist of candidate keywords, scored against this draft.
  if (kwSuggestions) {
    const list = document.createElement('div');
    list.style.cssText = 'margin-top:8px;border-top:1px solid #334155;padding-top:7px';
    if (!kwSuggestions.length) {
      list.innerHTML = `<div style="font-size:10px;color:#64748b">Not enough content yet — write a title and a few lines first.</div>`;
    } else {
      list.innerHTML =
        `<div style="font-size:9px;color:#64748b;margin-bottom:6px">Scored against your draft. Pick the term you want to rank for — the highest score is not always the best keyword.</div>` +
        kwSuggestions.map(s => {
          const col = s.pct >= 70 ? '#34d399' : s.pct >= 45 ? '#fbbf24' : '#f87171';
          return `<button class="${PANEL_ID}-kw-pick" data-kw="${esc(s.keyword)}" style="display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;background:#1e293b;border:1px solid #334155;border-radius:5px;padding:4px 8px;margin-bottom:4px;cursor:pointer;font-family:inherit;text-align:left">` +
            `<span style="font-size:10px;color:#e2e8f0">${esc(s.keyword)}${s.generic ? ` <span style="color:#64748b">· generic</span>` : ''}</span>` +
            `<span style="font-size:10px;font-weight:700;color:${col}">${s.pct}%</span></button>`;
        }).join('');
    }
    kwWrap.appendChild(list);
  }
  body.appendChild(kwWrap);

  const suggestBtn = document.getElementById(`${PANEL_ID}-kw-suggest`);
  suggestBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (kwSuggestions) { kwSuggestions = null; rerender(); return; }
    kwSuggestions = lastInputs
      ? suggestKeywords(lastInputs.content, lastInputs.title, lastInputs.tags, lastInputs.metaDesc)
      : [];
    rerender();
  });
  kwWrap.querySelectorAll<HTMLElement>(`.${PANEL_ID}-kw-pick`).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const kw = btn.getAttribute('data-kw') || '';
      kwSuggestions = null;
      // Re-score and repaint straight away. onKeyword only schedules the debounced
      // analysis pass, so on its own the shortlist would stay open and the score stale
      // for a second or more, which reads as the click having done nothing.
      if (lastInputs) {
        renderPanel(analyze(lastInputs.content, lastInputs.title, lastInputs.tags, lastInputs.metaDesc, kw),
                    kw, false, onKeyword);
      } else {
        rerender();
      }
      onKeyword(kw);
    });
  });

  // Score
  const sc = a.seoScore, scMax = a.seoMax, scPct = Math.round((sc / scMax) * 100);
  const scCol = scoreColor(scPct), scLbl = scPct >= 70 ? 'Strong' : scPct >= 45 ? 'Needs work' : 'Weak';
  const hints = a.breakdown.filter(b => b.score < b.max && b.hint).sort((x, y) => (y.max - y.score) - (x.max - x.score)).slice(0, 2);

  const seoDiv = sec(false);
  seoDiv.style.paddingTop = '0';
  seoDiv.innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px">
      <span style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.06em">SEO Score</span>
      <span><span style="font-size:26px;font-weight:700;color:${scCol};line-height:1">${sc}</span><span style="font-size:12px;color:#64748b">/${scMax}</span><span style="font-size:10px;color:${scCol};margin-left:5px;font-weight:600">${scLbl}</span></span>
    </div>
    ${a.breakdown.map(b => {
      const bPct = Math.round((b.score / b.max) * 100), bCol = scoreColor(bPct), info = INFO[b.label];
      const explainer = info && openInfo === b.label ? `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:6px;padding:8px 10px;margin:2px 0 8px">
          <div style="font-size:10px;color:#cbd5e1;line-height:1.5">${info.what}</div>
          ${b.hint ? `<div style="font-size:10px;color:#fbbf24;line-height:1.5;margin-top:5px"><strong>Now:</strong> ${esc(b.hint)}</div>` : ''}
          <div style="font-size:10px;color:#34d399;line-height:1.5;margin-top:5px">&#128161; ${info.how}</div>
        </div>` : '';
      return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px" title="${esc(b.hint)}">
        <div style="font-size:10px;color:#cbd5e1;width:78px;flex-shrink:0;display:flex;align-items:center;gap:4px">
          <span>${b.label}</span>
          ${info ? infoIcon('data-info', b.label, openInfo === b.label) : ''}
        </div>
        <div style="flex:1;background:#0f172a;border-radius:3px;height:5px;border:1px solid #334155">
          <div style="width:${bPct}%;height:100%;background:${bCol};border-radius:3px;transition:width .4s"></div>
        </div>
        <div style="font-size:9px;color:${bCol};width:30px;text-align:right;font-weight:700">${b.score}/${b.max}</div>
      </div>${explainer}`;
    }).join('')}
    ${hints.map(b => `<div style="font-size:10px;color:#94a3b8;margin-top:4px;padding-left:2px">&#8227; ${esc(b.hint)} <span style="color:#34d399;font-weight:600">+${b.max - b.score}</span></div>`).join('')}
    ${!keyword.trim() ? `<div style="font-size:10px;color:#fbbf24;margin-top:6px">&#128274; Add a keyword above to unlock +35 pts</div>` : ''}`;
  body.appendChild(seoDiv);
  seoDiv.querySelectorAll('[data-info]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    const label = (el as HTMLElement).getAttribute('data-info')!;
    openInfo = openInfo === label ? null : label;
    rerender();
  }));

  // Keyword placement
  if (keyword.trim()) {
    const kwDiv = sec();
    const dCol = a.kw.density > 3 ? '#f87171' : a.kw.density > 0.5 ? '#34d399' : '#fbbf24';
    const dNote = a.kw.density > 3 ? `${a.kw.density}% — over-optimised (aim < 3%)` : a.kw.density === 0 ? 'keyword not in body text' : `${a.kw.density}% density — good`;
    const ltNote = !a.kw.isLongTail ? `<div style="font-size:10px;color:#fbbf24;margin-top:5px;padding-left:19px">&#128161; Single words are hard to rank — try "<strong>${esc(keyword)} for beginners</strong>"</div>` : '';
    kwDiv.innerHTML = sectionHeader('Keyword placement') +
      checkRow('In title', a.kw.inTitle) +
      checkRow('Front-loaded in title', a.kw.frontLoaded) +
      checkRow('In first 100 words', a.kw.inFirst100) +
      checkRow('In a ## subheading', a.kw.inHeading) +
      checkRow('In the URL slug (permanent!)', a.kw.inPermlink) +
      checkRow('In preview description', a.kw.inMetaDesc) +
      `<div style="font-size:10px;color:${dCol};margin-top:4px;padding-left:19px">&#8227; ${dNote}</div>` + ltNote;
    body.appendChild(kwDiv);
  }

  // Tag ideas
  if (a.suggestedTags.length > 0 && a.tags.length < 5 && a.wordCount >= 50) {
    const stDiv = sec();
    stDiv.innerHTML = sectionHeader('Tag ideas') +
      `<div style="display:flex;flex-wrap:wrap;gap:5px">` +
      a.suggestedTags.map(t => `<span data-tagcopy="${esc(t)}" style="cursor:pointer;background:#0f172a;border:1px solid #334155;color:#cbd5e1;font-size:10px;padding:3px 9px;border-radius:12px">#${esc(t)}</span>`).join('') +
      `</div><div style="font-size:9px;color:#64748b;margin-top:5px">Trending on Hive · click to copy · only use tags that fit</div>`;
    body.appendChild(stDiv);
    stDiv.querySelectorAll('[data-tagcopy]').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag = (el as HTMLElement).getAttribute('data-tagcopy')!;
      navigator.clipboard?.writeText(tag).catch(() => {});
      (el as HTMLElement).textContent = '✓ copied';
      setTimeout(() => { (el as HTMLElement).textContent = '#' + tag; }, 1200);
    }));
  }

  // Google preview (with real URL slug)
  if (a.title) {
    const gpTitle = a.title.length > 60 ? a.title.slice(0, 57) + '…' : a.title;
    const gpDesc = a.metaDesc ? (a.metaDesc.length > 160 ? a.metaDesc.slice(0, 157) + '…' : a.metaDesc) : 'No preview description set — Google will auto-generate this snippet.';
    const slug = a.permlink ? (a.permlink.length > 40 ? a.permlink.slice(0, 40) + '…' : a.permlink) : '';
    const gpDiv = sec();
    gpDiv.innerHTML = sectionHeader('Google preview') + `
      <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:9px 11px">
        <div style="font-size:9px;color:#34d399;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${location.hostname} &rsaquo; @you &rsaquo; ${esc(slug)}</div>
        <div style="font-size:12px;color:#8ab4f8;line-height:1.35;margin-bottom:3px">${esc(gpTitle)}</div>
        <div style="font-size:10px;color:${a.metaDesc ? '#94a3b8' : '#fbbf24'};line-height:1.45">${esc(gpDesc)}</div>
      </div>`;
    body.appendChild(gpDiv);
  }

  // Pre-publish checklist
  if (a.wordCount >= 100) {
    const clDiv = sec();
    clDiv.innerHTML = sectionHeader('Pre-publish') +
      a.checklist.map(c => checkRow(c.label, c.pass)).join('') +
      (a.noAltFiles.length > 0
        ? `<div style="font-size:10px;color:#fbbf24;margin-top:4px;padding-left:19px;line-height:1.5">Missing alt text: ${esc(a.noAltFiles.join(', '))}<br>Use <span style="color:#cbd5e1;font-family:monospace">![describe](url)</span> not <span style="color:#cbd5e1;font-family:monospace">![](url)</span></div>`
        : '');
    body.appendChild(clDiv);
  }
};

// ── GEO / AI tab ─────────────────────────────────────────────────────────────
const renderGeoTab = (body: HTMLElement, a: Analysis) => {
  if (a.wordCount < 40) {
    const d = document.createElement('div');
    Object.assign(d.style, { color: '#94a3b8', fontSize: '11px', lineHeight: '1.6', padding: '4px 0' });
    d.innerHTML = `Write a bit more to analyse AI extractability.<br><br><span style="color:#64748b">GEO (Generative Engine Optimization) measures how easily AI assistants like ChatGPT, Perplexity and Google AI Overviews can quote and cite your post.</span>`;
    body.appendChild(d);
    return;
  }
  const g = a.geo;
  const sc = g.score, scCol = scoreColor(sc), scLbl = sc >= 70 ? 'AI-ready' : sc >= 45 ? 'Improvable' : 'Hard to extract';

  // Intro + detected type
  const intro = document.createElement('div');
  Object.assign(intro.style, { marginBottom: '4px' });
  intro.innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.06em">AI Extractability</span>
      <span><span style="font-size:26px;font-weight:700;color:${scCol};line-height:1">${sc}</span><span style="font-size:12px;color:#64748b">/100</span><span style="font-size:10px;color:${scCol};margin-left:5px;font-weight:600">${scLbl}</span></span>
    </div>
    <div style="font-size:10px;color:#94a3b8;margin-bottom:10px">
      Detected type: <strong style="color:#cbd5e1">${esc(a.intent.type)}</strong>
      <span style="color:#64748b"> · ${g.informational ? 'informational checks active' : 'personal/creative — only universal checks apply'}</span>
    </div>`;
  body.appendChild(intro);

  // Item bars + explainers
  const itemsDiv = document.createElement('div');
  itemsDiv.innerHTML = g.items.map(it => {
    const pct = Math.round((it.score / it.max) * 100), col = scoreColor(pct);
    const open = openInfo === `geo:${it.label}`;
    const explainer = open ? `
      <div style="background:#0f172a;border:1px solid #334155;border-radius:6px;padding:8px 10px;margin:2px 0 8px">
        <div style="font-size:10px;color:#cbd5e1;line-height:1.5">${it.info}</div>
        <div style="font-size:10px;color:#34d399;line-height:1.5;margin-top:5px">&#128161; ${esc(it.hint)}</div>
      </div>` : '';
    return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px" title="${esc(it.hint)}">
      <div style="font-size:10px;color:#cbd5e1;width:100px;flex-shrink:0;display:flex;align-items:center;gap:4px">
        <span>${esc(it.label)}</span>
        ${infoIcon('data-ginfo', it.label, open)}
      </div>
      <div style="flex:1;background:#0f172a;border-radius:3px;height:5px;border:1px solid #334155">
        <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width .4s"></div>
      </div>
      <div style="font-size:9px;color:${col};width:30px;text-align:right;font-weight:700">${it.score}/${it.max}</div>
    </div>${explainer}`;
  }).join('');
  body.appendChild(itemsDiv);
  itemsDiv.querySelectorAll('[data-ginfo]').forEach(el => el.addEventListener('click', (e) => {
    e.stopPropagation();
    const label = `geo:${(el as HTMLElement).getAttribute('data-ginfo')}`;
    openInfo = openInfo === label ? null : label;
    rerender();
  }));

  // Top fixes
  const fixes = g.items.filter(i => i.score < i.max).sort((x, y) => (y.max - y.score) - (x.max - x.score)).slice(0, 2);
  if (fixes.length) {
    const fDiv = sec();
    fDiv.innerHTML = sectionHeader('Make it more AI-friendly') +
      fixes.map(f => `<div style="font-size:10px;color:#cbd5e1;margin-bottom:5px;line-height:1.5">&#8227; ${esc(f.hint)} <span style="color:#34d399;font-weight:600">+${f.max - f.score}</span></div>`).join('');
    body.appendChild(fDiv);
  }

  // Footnote
  const note = document.createElement('div');
  Object.assign(note.style, { borderTop: '1px solid #334155', paddingTop: '9px', marginTop: '4px', fontSize: '9px', color: '#64748b', lineHeight: '1.55' });
  note.innerHTML = `Hive content is public &amp; API-accessible, so it's unusually easy for AI engines to ingest. These checks help them quote you accurately.`;
  body.appendChild(note);
};

// ── renderPanel ──────────────────────────────────────────────────────────────
function renderPanel(a: Analysis, keyword: string, isAutoDetected: boolean, onKeyword: (kw: string) => void) {
  lastArgs = { a, kw: keyword, auto: isAutoDetected, onKw: onKeyword };
  const body = document.getElementById(`${PANEL_ID}-body`);
  if (!body) return;
  body.innerHTML = '';
  renderShared(body, a);
  if (activeTab === 'seo') renderSeoTab(body, a, keyword, isAutoDetected, onKeyword);
  else renderGeoTab(body, a);
}

const showIdle = () => {
  const body = document.getElementById(`${PANEL_ID}-body`);
  if (body) body.innerHTML = `<div style="color:#94a3b8;font-size:11px;text-align:center;padding:10px 0">Start writing to see analysis…</div>`;
};

// ── Main ─────────────────────────────────────────────────────────────────────
const host = location.hostname.replace(/^www\./, '');
const composePattern = COMPOSE_HOSTS[host];

if (composePattern) {
  console.log('[HivePulse] Post Analyzer loaded on', location.hostname + location.pathname);

  let active = false;
  let focusKeyword = '';
  let kwSource: 'user' | 'auto' | 'none' = 'none';
  let debounce:  ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const isComposePage = () => composePattern.test(location.pathname);

  const saveKeyword = (kw: string) => { focusKeyword = kw; kwSource = kw.trim() ? 'user' : 'none'; };

  let lastSig = '';
  const contentSig = () =>
    `${getTitle().length}:${getEditorContent().length}:${getTags().join(',')}:${getMetaDescription().length}`;

  // Ecency splits authoring across two steps: step 1 has title + body, step 2 has tags +
  // meta (and unmounts the body editor). Reading fresh each tick would zero whichever half
  // isn't on screen. So: whenever a live body editor is present — which is EVERY other
  // frontend, always, and Ecency's step 1 — reflect all fields live (including cleared
  // ones, so single-step editors behave exactly as before). Only when the editor has
  // unmounted (Ecency step 2) do we fall back to the values captured while writing.
  const merged = { title: '', content: '', tags: [] as string[], metaDesc: '' };
  const hasBodyEditor = (): boolean => {
    for (const t of document.querySelectorAll<HTMLTextAreaElement>('textarea'))
      if (isVisible(t) && !DECOY_RE.test(fieldAttrs(t)) && !TITLE_MARK_RE.test(fieldAttrs(t))) return true;
    for (const ce of document.querySelectorAll<HTMLElement>('[contenteditable="true"]'))
      if (isVisible(ce)) return true;
    for (const cm of document.querySelectorAll<HTMLElement>('.CodeMirror-code, .cm-content'))
      if (isVisible(cm)) return true;
    return false;
  };
  const readMerged = () => {
    const t = getTitle(), c = getEditorContent(), tg = getTags(), m = getMetaDescription();
    if (hasBodyEditor()) {
      merged.title = t; merged.content = c; merged.tags = tg; merged.metaDesc = m;
    } else {
      if (t) merged.title = t;
      if (c && c.trim().length > 5) merged.content = c;
      if (tg.length) merged.tags = tg;
      if (m) merged.metaDesc = m;
    }
    return merged;
  };

  const runAnalysis = () => {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    if (document.activeElement && panel.contains(document.activeElement)) { schedule(); return; }
    const { title, content, tags, metaDesc } = readMerged();
    lastInputs = { content, title, tags, metaDesc };
    lastSig = `${title.length}:${content.length}:${tags.join(',')}:${metaDesc.length}`;
    if (title.length < 3 && content.trim().length < 5) { showIdle(); return; }
    if (kwSource !== 'user' && (title.length > 3 || content.length > 80)) {
      const detected = autoDetectKeyword(title, content);
      if (detected) { focusKeyword = detected; kwSource = 'auto'; }
    }
    renderPanel(analyze(content, title, tags, metaDesc, focusKeyword), focusKeyword, kwSource === 'auto',
      (kw) => { saveKeyword(kw); schedule(); });
  };

  const safeRun = () => { try { runAnalysis(); } catch (e) { console.error('[HivePulse] Analysis error:', e); } };
  const schedule = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(safeRun, 1000); };

  // One-time setup — document listeners and the trending-tag fetch must persist
  // across panel re-injects, so attach them exactly once (avoids stacking).
  let bootstrapped = false;
  const ensureBootstrap = () => {
    if (bootstrapped) return;
    bootstrapped = true;
    document.addEventListener('input',  schedule);
    document.addEventListener('change', schedule);
    loadHiveApi().then(loadTrendingTags).then(() => { if (active) schedule(); }).catch(() => {});
  };

  let mountCount = 0;
  const injectPanel = (reason = 'mount') => {
    if (document.getElementById(PANEL_ID)) return;
    try {
      document.body.appendChild(createPanel());
      active = true;
      mountCount++;
      console.log(`[HivePulse] panel mounted (#${mountCount}, ${reason})`);
    } catch (e) {
      console.error('[HivePulse] Failed to create panel:', e);
      return;
    }
    ensureBootstrap();
    try { runAnalysis(); } catch (e) { console.error('[HivePulse] Analysis error:', e); }
    [600, 1500, 3000, 6000].forEach(ms => setTimeout(() => {
      try { if (active && contentSig() !== lastSig) runAnalysis(); } catch {}
    }, ms));
  };

  const removePanel = () => { document.getElementById(PANEL_ID)?.remove(); active = false; };

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (!isComposePage()) { removePanel(); clearInterval(pollTimer!); pollTimer = null; return; }
      // React rebuilds may have wiped our panel — guarantee a re-mount within 3s
      if (active && !document.getElementById(PANEL_ID)) { injectPanel('poll'); return; }
      if (active && contentSig() !== lastSig) safeRun();
    }, 3000);
  };

  chrome.storage.local.remove(['composeKeyword']);

  const checkAndMount = () => {
    if (!analyzerEnabled) {
      // Stop the work we own: the panel, the 3s poll and any pending debounce. The document
      // input/change listeners and the MutationObserver stay attached — ensureBootstrap
      // installs them once and re-enabling relies on them — so keystrokes still schedule a
      // debounce, which then finds no panel and returns. Cheap, but not nothing: this is a
      // pause, not a full detach.
      removePanel();
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (debounce)  { clearTimeout(debounce);   debounce  = null; }
      return;
    }
    if (isComposePage()) { if (!active) { injectPanel('initial'); startPolling(); } }
    else { if (active) removePanel(); }
  };
  onAnalyzerToggle = checkAndMount;

  const origPush    = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  const onNav = () => { setTimeout(checkAndMount, 300); setTimeout(checkAndMount, 900); setTimeout(checkAndMount, 2200); };
  history.pushState    = function (...a: Parameters<typeof history.pushState>)    { origPush(...a);    onNav(); };
  history.replaceState = function (...a: Parameters<typeof history.replaceState>) { origReplace(...a); onNav(); };
  window.addEventListener('popstate', onNav);

  new MutationObserver(() => {
    if (active && isComposePage() && !document.getElementById(PANEL_ID)) injectPanel('observer');
  }).observe(document.body, { childList: true });

  const initialMount = () => { checkAndMount(); setTimeout(checkAndMount, 1200); };
  // Settings first: mounting before the read resolves would flash the panel for anyone who
  // has turned it off.
  // Race a timeout: the mount is now downstream of a storage callback, and if that callback
  // never fires (extension reloaded while a compose tab is open — an ordinary MV3 event) the
  // promise never settles and the panel never appears at all. analyzerEnabled defaults to
  // true, so timing out fails open.
  Promise.race([
    readAnalyzerSetting(),
    new Promise<void>(res => setTimeout(res, 500)),
  ]).then(() => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialMount);
    else initialMount();
  });

} // end if (composePattern)

})(); // end IIFE
