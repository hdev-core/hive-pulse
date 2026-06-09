export {};
declare const chrome: any;

// Wrapped in IIFE so Rollup/terser keeps all vars in one closure scope,
// preventing duplicate const $ declarations from minifier name reuse.
(function () {

// ── Config ──────────────────────────────────────────────────────────────────
const HIVE_API = 'https://api.hive.blog';
const PANEL_ID = 'hivepulse-smart-compose';

const COMPOSE_HOSTS: Record<string, RegExp> = {
  'peakd.com':      /\/publish|\/e\/@/,
  'ecency.com':     /\/submit/,
  'hive.blog':      /\/submit\.html/,
  'inleo.io':       /\/publish|\/post/,
  'leofinance.io':  /\/submit/,
  '3speak.tv':      /\/upload/,
  'actifit.io':     /\/blog\/new|\/videos\/new/,
};

// ── RPC helper ───────────────────────────────────────────────────────────────
const rpc = async (method: string, params: any): Promise<any> => {
  try {
    const r = await fetch(HIVE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    });
    return (await r.json()).result ?? null;
  } catch { return null; }
};

// ── Analysis ─────────────────────────────────────────────────────────────────
interface PayoutRange { min: number; median: number; max: number; count: number; }

const analyzePayouts = (posts: any[]): PayoutRange | null => {
  if (!posts?.length) return null;
  const vals = posts
    .map(p => {
      const pending = parseFloat((p.pending_payout_value || '0').replace(/[^\d.]/g, ''));
      const author  = parseFloat((p.total_payout_value  || '0').replace(/[^\d.]/g, ''));
      const curator = parseFloat((p.curator_payout_value || '0').replace(/[^\d.]/g, ''));
      return pending > 0 ? pending : (author + curator);
    })
    .filter(v => !isNaN(v) && v >= 0)
    .sort((a, b) => a - b);

  if (!vals.length) return null;
  const n = vals.length;
  return {
    min:    vals[Math.floor(n * 0.15)] ?? vals[0],
    median: vals[Math.floor(n * 0.50)],
    max:    vals[Math.floor(n * 0.85)] ?? vals[n - 1],
    count:  n,
  };
};

const topPublishHoursUTC = (posts: any[]): number[] => {
  if (!posts?.length) return [];
  const byHour: { payout: number[]; count: number }[] =
    Array.from({ length: 24 }, () => ({ payout: [], count: 0 }));
  for (const p of posts) {
    const d = new Date((p.created || '') + (p.created?.endsWith?.('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) continue;
    const val = parseFloat((p.pending_payout_value || p.total_payout_value || '0').replace(/[^\d.]/g, ''));
    const h = d.getUTCHours();
    byHour[h].count++;
    if (!isNaN(val) && val > 0) byHour[h].payout.push(val);
  }
  const scored = byHour.map((b, h) => ({
    h,
    avg: b.payout.length ? b.payout.reduce((a, v) => a + v, 0) / b.payout.length : 0,
    count: b.count,
  })).filter(x => x.count > 0);
  // Sort by avg payout if available, otherwise by post count (busiest hours)
  const hasPayouts = scored.some(x => x.avg > 0);
  return scored
    .sort((a, b) => hasPayouts ? b.avg - a.avg : b.count - a.count)
    .slice(0, 3)
    .map(x => x.h);
};

const fmtHour = (h: number) => {
  const ampm = h < 12 ? 'am' : 'pm';
  const d    = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${d}${ampm}`;
};

// ── DOM helpers ──────────────────────────────────────────────────────────────
const HIVE_TAG = /\bhive-\d{6}\b/;

const detectCommunityTag = (): string | null => {
  // 1. Direct ID targets for known frontends (most reliable)
  const directIds = ['targetCommunity', 'community', 'category'];
  for (const id of directIds) {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (el?.value) { const m = el.value.match(HIVE_TAG); if (m) return m[0]; }
  }
  // 2. All <select> elements
  for (const sel of document.querySelectorAll<HTMLSelectElement>('select')) {
    if (sel.value) { const m = sel.value.match(HIVE_TAG); if (m) return m[0]; }
  }
  // 3. Broad element scan — inputs, chips, tag widgets (case-insensitive class match)
  const selectors = [
    'input', 'textarea',
    '[class*="tag" i]', '[class*="chip" i]', '[class*="community" i]',
    '[class*="category" i]', '[class*="TagInput" i]',
  ];
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      const text = (el as HTMLInputElement).value || el.textContent || '';
      const m = text.match(HIVE_TAG);
      if (m) return m[0];
    }
  }
  // 4. Any selected <option> value as last resort
  for (const opt of document.querySelectorAll<HTMLOptionElement>('option:checked')) {
    const m = (opt.value || opt.textContent || '').match(HIVE_TAG);
    if (m) return m[0];
  }
  return null;
};

// Auto-detect the logged-in Hive username from the page without requiring
// manual extension settings configuration
const detectPageUsername = (): string | null => {
  const hiveUser = /^[a-z][a-z0-9.-]{2,15}$/;
  // Common localStorage keys used by Hive frontends
  const lsKeys = ['username', 'user_name', 'hive_username', 'active_user', 'current_user'];
  for (const k of lsKeys) {
    try {
      const v = localStorage.getItem(k);
      if (v && hiveUser.test(v)) return v;
    } catch {}
  }
  // Vuex-persisted state (Nuxt/Vue apps — actifit uses this)
  try {
    const vuex = localStorage.getItem('vuex');
    if (vuex) {
      const s = JSON.parse(vuex);
      const n = s?.user?.account?.name || s?.user?.name || s?.username;
      if (n && hiveUser.test(n)) return n;
    }
  } catch {}
  // DOM: look for a profile link containing /@username (PeakD, Ecency, etc.)
  try {
    for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="/@"]')) {
      const m = a.getAttribute('href')?.match(/\/@([a-z0-9.-]{3,16})/);
      if (m && hiveUser.test(m[1])) return m[1];
    }
  } catch {}
  return null;
};

const hasBeneficiarySet = (): boolean =>
  /beneficiar/i.test(document.body.innerText) && /%/.test(document.body.innerText);

// Per-host beneficiary programme suggestions
const HOST_BENE: Record<string, { account: string; pct: string; reason: string }> = {
  'ecency.com':    { account: '@ecency',     pct: '1%', reason: 'qualify for Ecency boost votes' },
  'inleo.io':      { account: '@leofinance', pct: '2%', reason: 'qualify for Leo curation rewards' },
  'leofinance.io': { account: '@leofinance', pct: '2%', reason: 'qualify for Leo curation rewards' },
};

// ── Panel creation ───────────────────────────────────────────────────────────
const createPanel = (): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.id = PANEL_ID;
  Object.assign(wrap.style, {
    position: 'fixed', top: '80px', right: '16px',
    width: '258px', zIndex: '2147483647',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '12px', color: '#f1f5f9',
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
    overflow: 'hidden', userSelect: 'none',
  });

  // header
  const hdr = document.createElement('div');
  Object.assign(hdr.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', cursor: 'pointer', background: '#1e293b',
    borderBottom: '1px solid #2d3f55',
  });
  hdr.innerHTML =
    `<span style="color:#f97316;font-weight:700;font-size:13px">&#9889; Smart Compose</span>` +
    `<span id="${PANEL_ID}-toggle" style="color:#64748b;font-size:10px">&#9660; hide</span>`;

  hdr.addEventListener('click', () => {
    const body = document.getElementById(`${PANEL_ID}-body`);
    const tog  = document.getElementById(`${PANEL_ID}-toggle`);
    if (!body || !tog) return;
    const hidden = body.style.display === 'none';
    body.style.display = hidden ? 'block' : 'none';
    tog.innerHTML = hidden ? '&#9660; hide' : '&#9650; show';
  });

  // body
  const body = document.createElement('div');
  body.id = `${PANEL_ID}-body`;
  Object.assign(body.style, { padding: '12px 14px' });

  const loading = document.createElement('div');
  loading.id = `${PANEL_ID}-loading`;
  Object.assign(loading.style, { color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '6px 0' });
  loading.textContent = 'Analyzing your post history…';
  body.appendChild(loading);

  wrap.appendChild(hdr);
  wrap.appendChild(body);
  return wrap;
};

const section = (id: string, extraStyles: Partial<CSSStyleDeclaration> = {}): HTMLDivElement => {
  const d = document.createElement('div');
  d.id = `${PANEL_ID}-${id}`;
  Object.assign(d.style, extraStyles);
  return d;
};

const updatePanel = (data: {
  payout:      PayoutRange | null;
  hours:       number[];
  hoursLabel:  string;
  community:   { title: string; subscribers: number; sum_pending: number } | null;
  noBene:      boolean;
  beneInfo:    { account: string; pct: string; reason: string } | null;
  noUsername:  boolean;
}) => {
  const body = document.getElementById(`${PANEL_ID}-body`);
  if (!body) return;

  // Remove loading + stale sections
  ['loading', 'payout', 'timing', 'community', 'bene', 'nodata', 'footer'].forEach(k =>
    document.getElementById(`${PANEL_ID}-${k}`)?.remove()
  );

  const hasAny = data.payout || data.hours.length || data.community;
  if (!hasAny) {
    const s = section('nodata', { color: '#475569', fontSize: '11px', textAlign: 'center', padding: '8px 0 4px' });
    s.textContent = 'Add a community tag to see insights.';
    body.appendChild(s);
  }

  // ── Payout range ──────────────────────────────────────
  if (data.payout) {
    const s = section('payout', { marginBottom: '12px' });
    s.innerHTML = `
      <div style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">Expected Payout</div>
      <div style="color:#10b981;font-size:22px;font-weight:700;line-height:1">
        $${data.payout.min.toFixed(2)} – $${data.payout.max.toFixed(2)}
      </div>
      <div style="color:#64748b;font-size:10px;margin-top:3px">
        median $${data.payout.median.toFixed(2)} &nbsp;·&nbsp; ${data.payout.count} recent posts
      </div>`;
    body.appendChild(s);
  } else if (data.noUsername) {
    const s = section('payout', { marginBottom: '10px', padding: '7px 10px', borderRadius: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid #2d3f55' });
    s.innerHTML = `<div style="color:#475569;font-size:10px">Set your Hive username in HivePulse settings to see payout predictions.</div>`;
    body.appendChild(s);
  }

  // ── Best publish times ────────────────────────────────
  if (data.hours.length > 0) {
    const s = section('timing', { marginBottom: '12px', paddingTop: '10px', borderTop: '1px solid #2d3f55' });
    s.innerHTML = `
      <div style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">${data.hoursLabel}</div>
      <div style="display:flex;gap:5px">
        ${data.hours.map((h, i) => `
          <span style="
            background:${i === 0 ? '#f97316' : '#2d3f55'};
            color:${i === 0 ? '#fff' : '#94a3b8'};
            font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;
          ">${fmtHour(h)} UTC</span>`).join('')}
      </div>`;
    body.appendChild(s);
  }

  // ── Community info ────────────────────────────────────
  if (data.community) {
    const s = section('community', {
      marginBottom: '10px', padding: '8px 10px',
      background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.07)',
    });
    s.innerHTML = `
      <div style="color:#f1f5f9;font-size:11px;font-weight:600">${data.community.title}</div>
      <div style="color:#94a3b8;font-size:10px;margin-top:3px">
        ${data.community.subscribers.toLocaleString()} subscribers
        ${data.community.sum_pending > 0
          ? ` &nbsp;·&nbsp; $${Math.round(data.community.sum_pending).toLocaleString()} pending`
          : ''}
      </div>`;
    body.appendChild(s);
  }

  // ── Beneficiary nudge — only for hosts that have a known programme ─────────
  if (data.noBene && data.beneInfo) {
    const { account, pct, reason } = data.beneInfo;
    const s = section('bene', {
      padding: '8px 10px', borderRadius: '8px',
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.22)',
      marginBottom: '10px',
    });
    s.innerHTML = `
      <div style="color:#f59e0b;font-size:11px;font-weight:600">&#128161; Boost tip</div>
      <div style="color:#fcd34d;font-size:10px;margin-top:3px">
        Add <strong>${account}</strong> (${pct}) as a beneficiary to ${reason}.
      </div>`;
    body.appendChild(s);
  }

  // ── Footer ────────────────────────────────────────────
  const foot = section('footer', {
    paddingTop: '8px', borderTop: '1px solid #1e293b',
    color: '#334155', fontSize: '9px', textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: '.05em',
  });
  foot.textContent = 'HivePulse Smart Compose · live Hive data';
  body.appendChild(foot);
};

// ── Main ─────────────────────────────────────────────────────────────────────
const host = location.hostname.replace(/^www\./, '');
const composePattern = COMPOSE_HOSTS[host];

if (composePattern) {
  let active       = false;
  let lastCommunity: string | null = null;
  let username: string | null      = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // Load username — extension settings first, then page auto-detection
  const loadUsername = (): Promise<void> =>
    new Promise(res => chrome.storage.local.get(['settings'], (r: any) => {
      const s = r?.settings;
      username = s?.ecencyUsername || s?.rcUser || detectPageUsername() || null;
      res();
    }));

  const isComposePage = () => composePattern.test(location.pathname);

  const runIntelligence = async (community: string | null) => {
    if (!document.getElementById(PANEL_ID)) return;
    if (username === null) await loadUsername();

    const [authorPosts, communityPosts, communityInfo] = await Promise.all([
      username ? rpc('bridge.get_account_posts', { sort: 'posts', account: username, limit: 30 }) : Promise.resolve(null),
      community ? rpc('bridge.get_ranked_posts', { sort: 'created', tag: community, limit: 100 }) : Promise.resolve(null),
      community ? rpc('bridge.get_community', { name: community }) : Promise.resolve(null),
    ]);

    const postPool = communityPosts ?? authorPosts ?? [];
    const hasPayoutData = postPool.some((p: any) => {
      const v = parseFloat((p.pending_payout_value || p.total_payout_value || '0').replace(/[^\d.]/g, ''));
      return !isNaN(v) && v > 0;
    });
    updatePanel({
      payout:     analyzePayouts(authorPosts),
      hours:      topPublishHoursUTC(postPool),
      hoursLabel: hasPayoutData ? 'Best Publish Times (UTC)' : 'Most Active Hours (UTC)',
      community:  communityInfo
        ? { title: communityInfo.title ?? community, subscribers: communityInfo.subscribers ?? 0, sum_pending: communityInfo.sum_pending ?? 0 }
        : null,
      noBene:     !hasBeneficiarySet(),
      beneInfo:   HOST_BENE[host] ?? null,
      noUsername: !username,
    });
  };

  const injectPanel = () => {
    if (document.getElementById(PANEL_ID)) return;
    document.body.appendChild(createPanel());
    active = true;
    lastCommunity = detectCommunityTag();
    runIntelligence(lastCommunity);
  };

  const removePanel = () => {
    document.getElementById(PANEL_ID)?.remove();
    active = false;
    lastCommunity = null;
  };

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (!isComposePage()) {
        removePanel();
        clearInterval(pollTimer!);
        pollTimer = null;
        return;
      }
      const newCommunity = detectCommunityTag();
      if (newCommunity !== lastCommunity) {
        lastCommunity = newCommunity;
        runIntelligence(newCommunity);
      }
      // Refresh beneficiary nudge every 15s (user might have added one)
      if (active) {
        const bene = document.getElementById(`${PANEL_ID}-bene`);
        if (bene && hasBeneficiarySet()) bene.remove();
      }
    }, 3000);
  };

  const checkAndMount = () => {
    if (isComposePage()) {
      if (!active) { injectPanel(); startPolling(); }
    } else {
      if (active) removePanel();
    }
  };

  // Intercept pushState AND replaceState — SPAs use both
  const origPush    = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  const onNav = () => {
    setTimeout(checkAndMount, 300);
    setTimeout(checkAndMount, 900);
    setTimeout(checkAndMount, 2200);
  };
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    origPush(...args); onNav();
  };
  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    origReplace(...args); onNav();
  };
  window.addEventListener('popstate', onNav);

  // Re-inject if PeakD's React app removes our panel
  new MutationObserver(() => {
    if (active && isComposePage() && !document.getElementById(PANEL_ID)) {
      injectPanel();
    }
  }).observe(document.body, { childList: true });

  // Initial mount — retry once in case SPA hasn't settled yet
  const initialMount = () => { checkAndMount(); setTimeout(checkAndMount, 1200); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialMount);
  } else {
    initialMount();
  }

} // end if (composePattern)

})(); // end IIFE
