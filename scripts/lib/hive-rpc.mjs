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

/** Fetch a post and normalise the fields the scorer needs. */
export const getPost = async (author, permlink, opts) => {
  const r = await rpc('condenser_api.get_content', [author, permlink], opts);
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
