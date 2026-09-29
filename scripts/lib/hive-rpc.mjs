/**
 * Hive RPC with node fallback.
 *
 * A single hard-coded node makes the scoring tools fail entirely whenever that node is
 * slow or unreachable (api.hive.blog intermittently times out on IPv6). Try nodes in
 * order and use the first that answers.
 */

export const HIVE_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://anyx.io',
  'https://api.openhive.network',
  'https://rpc.mahdiyari.info',
];

/** Call a Hive JSON-RPC method, falling back across nodes. Returns `result`, or null. */
export const rpc = async (method, params, { nodes = HIVE_NODES, timeoutMs = 8000, quiet = true } = {}) => {
  const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
  let lastErr;
  for (const node of nodes) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeoutMs);
      const res = await fetch(node, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ac.signal,
      });
      clearTimeout(t);
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} from ${node}`); continue; }
      const json = await res.json();
      if (json.error) { lastErr = new Error(json.error.message || 'rpc error'); continue; }
      return json.result ?? null;
    } catch (e) {
      lastErr = e;
      if (!quiet) console.error(`  (node unreachable: ${node})`);
    }
  }
  throw lastErr || new Error('all Hive nodes failed');
};

/**
 * Some editors publish headings as setext underline — the heading text on one line and
 * `---` (h2) or `===` (h1) on the next. The extension never sees that form: it scores the
 * editor DOM, which serialises every <h2>/<h3> as `## `/`### ` (see compose.ts domToMarkdown).
 * So an on-chain re-score that only matches ATX headings reads zero subheadings for a setext
 * post and silently strips the entire structure block the author saw earned. Normalise setext
 * back to ATX here, at the fetch boundary, so the re-score sees exactly what the panel saw.
 *
 * The guard keeps this from touching ATX headings, list items, blockquotes, code or ordered
 * lists — a `---` after any of those is not a setext underline.
 */
const normalizeSetextHeadings = (md) => {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim();
    const next = lines[i + 1];
    const prose = cur && !/^(?:#{1,6}\s|>|[-*+]\s|\d+\.\s|`)/.test(cur);
    if (prose && next && /^={3,}\s*$/.test(next)) { out.push('# ' + cur); i++; continue; }
    if (prose && next && /^-{3,}\s*$/.test(next)) { out.push('## ' + cur); i++; continue; }
    out.push(lines[i]);
  }
  return out.join('\n');
};

/** Fetch a post and normalise the fields the scorer needs. */
export const getPost = async (author, permlink, opts) => {
  const r = await rpc('condenser_api.get_content', [author, permlink], opts);
  if (!r || !r.author) return null;
  let meta = {};
  try { meta = JSON.parse(r.json_metadata || '{}'); } catch { /* ignore */ }
  return {
    title: r.title || '',
    body: normalizeSetextHeadings(r.body || ''),
    tags: Array.isArray(meta.tags) ? meta.tags.map(t => String(t).toLowerCase()) : [],
    description: typeof meta.description === 'string' ? meta.description : '',
    created: Date.parse((r.created || '') + 'Z'),
    author: r.author,
    permlink: r.permlink,
  };
};
