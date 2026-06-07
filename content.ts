export {};

declare const chrome: any;

// Hive frontend hostnames where the RC indicator is shown
const HIVE_HOSTS = new Set([
  'peakd.com',
  'ecency.com',
  'hive.blog',
  'wallet.hive.blog',
  'inleo.io',
  'leofinance.io',
  'waivio.com',
  'liketu.com',
  '3speak.tv',
]);

const host = location.hostname.replace(/^www\./, '');

if (HIVE_HOSTS.has(host)) {
  // Conservative RC cost estimates as % of max RC
  const RC_COST_PCT = { vote: 0.3, comment: 2, post: 10, transfer: 0.5 };

  let widget: HTMLElement | null = null;

  const colorForPct = (pct: number) =>
    pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

  const fmtRC = (n: number) => {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
    return n.toString();
  };

  const buildWidget = (pct: number, current: number, max: number) => {
    const ops = (cost: number) => Math.floor(pct / cost);
    const color = colorForPct(pct);
    const rounded = Math.round(pct);

    if (widget) { widget.remove(); widget = null; }

    widget = document.createElement('div');
    widget.id = 'hivepulse-rc-widget';
    widget.setAttribute('style', [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:12px', 'cursor:default', 'user-select:none',
    ].join(';'));

    const badge = document.createElement('div');
    badge.setAttribute('style', [
      `background:${color}`, 'color:#fff', 'border-radius:999px',
      'padding:4px 10px', 'font-weight:700', 'font-size:11px',
      'box-shadow:0 2px 8px rgba(0,0,0,0.25)',
      'display:flex', 'align-items:center', 'gap:5px',
    ].join(';'));
    badge.innerHTML = `<span style="opacity:0.8;font-size:10px">⚡RC</span><span>${rounded}%</span>`;

    const tooltip = document.createElement('div');
    tooltip.setAttribute('style', [
      'display:none', 'position:absolute', 'bottom:calc(100% + 8px)', 'right:0',
      'background:#1e293b', 'color:#f1f5f9', 'border-radius:10px',
      'padding:10px 12px', 'min-width:185px',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)', 'line-height:1.6',
    ].join(';'));
    tooltip.innerHTML = [
      `<div style="font-weight:700;font-size:12px;margin-bottom:4px;color:${color}">⚡ Resource Credits</div>`,
      `<div style="font-size:10px;color:#94a3b8;margin-bottom:8px">${fmtRC(current)} / ${fmtRC(max)}</div>`,
      `<div style="font-size:10px;border-top:1px solid #334155;padding-top:7px;color:#cbd5e1;margin-bottom:4px">Approx. operations remaining:</div>`,
      `<div style="font-size:11px;display:grid;grid-template-columns:1fr auto;gap:2px 8px">`,
      `<span style="color:#94a3b8">👍 Votes</span><span style="font-weight:600;text-align:right">~${ops(RC_COST_PCT.vote).toLocaleString()}</span>`,
      `<span style="color:#94a3b8">💬 Comments</span><span style="font-weight:600;text-align:right">~${ops(RC_COST_PCT.comment).toLocaleString()}</span>`,
      `<span style="color:#94a3b8">📝 Posts</span><span style="font-weight:600;text-align:right">~${ops(RC_COST_PCT.post).toLocaleString()}</span>`,
      `<span style="color:#94a3b8">💸 Transfers</span><span style="font-weight:600;text-align:right">~${ops(RC_COST_PCT.transfer).toLocaleString()}</span>`,
      `</div>`,
      `<div style="font-size:9px;color:#475569;margin-top:8px">HivePulse · estimates only</div>`,
    ].join('');

    widget.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
    widget.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

    widget.appendChild(tooltip);
    widget.appendChild(badge);
    document.body.appendChild(widget);
  };

  const refresh = () => {
    chrome.storage.local.get(['rcStats'], (result: any) => {
      const rc = result?.rcStats;
      if (!rc || typeof rc.percentage !== 'number') return;
      buildWidget(rc.percentage, rc.current, rc.max);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  // Re-render whenever background refreshes RC data
  chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local' && changes.rcStats) refresh();
  });
}
