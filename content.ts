export {};

declare const chrome: any;

// Show the RC/VP overlay on every Hive frontend the extension supports.
// This is a content script (a classic, non-module script), so it must stay
// fully self-contained — it cannot `import` shared modules without Vite
// emitting a chunk reference that fails to load. Keep this list in sync with
// the FRONTENDS domains/aliases in constants.ts. (www. is stripped before
// matching, so bare domains are enough.)
const HIVE_HOSTS = new Set([
  'peakd.com',
  'ecency.com',
  'hive.blog',
  'wallet.hive.blog',
  'inleo.io',
  'leofinance.io',
  'actifit.io',
  'waivio.com',
  'liketu.com',
  'hivescan.info',
  '3speak.tv',
]);

const host = location.hostname.replace(/^www\./, '');

if (HIVE_HOSTS.has(host)) {
  const WIDGET_ID = 'hivepulse-rc-widget';
  let widget: HTMLElement | null = null;

  const colorForPct = (pct: number) =>
    pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';

  const fmtRC = (n: number) => {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M';
    return n.toString();
  };

  const fmtOps = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` :
    `${n}`;

  const removeWidget = () => {
    if (widget) { widget.remove(); widget = null; }
    document.getElementById(WIDGET_ID)?.remove();
  };

  const pill = (icon: string, label: string, pct: number) => {
    const color = colorForPct(pct);
    return (
      `<div style="background:${color};color:#fff;border-radius:999px;padding:4px 10px;` +
      `font-weight:700;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.25);` +
      `display:flex;align-items:center;gap:5px">` +
      `<span style="opacity:0.8;font-size:10px">${icon}${label}</span><span>${Math.round(pct)}%</span></div>`
    );
  };

  const buildWidget = (opts: {
    showRc: boolean;
    showVp: boolean;
    rcPct: number;
    rcCur: number;
    rcMax: number;
    vpPct: number | null;
    costs: { vote: number; comment: number; post: number; transfer: number } | null;
  }) => {
    const { showRc, showVp, rcPct, rcCur, rcMax, vpPct, costs } = opts;
    removeWidget();
    if (!showRc && !showVp) return;

    const opCount = (cost: number | undefined) =>
      cost && cost > 0 ? Math.floor(rcCur / cost) : null;
    const opLine = (emoji: string, label: string, count: number | null) =>
      `<span style="color:#94a3b8">${emoji} ${label}</span>` +
      `<span style="font-weight:600;text-align:right">` +
      (count != null ? `~${fmtOps(count)}` : '…') + `</span>`;

    widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.setAttribute('style', [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'font-size:12px', 'cursor:default', 'user-select:none',
    ].join(';'));

    // Badge row — one or two pills
    const badgeRow = document.createElement('div');
    badgeRow.setAttribute('style', 'display:flex;gap:6px;align-items:center;justify-content:flex-end');
    badgeRow.innerHTML =
      (showRc ? pill('⚡', 'RC', rcPct) : '') +
      (showVp && vpPct != null ? pill('👍', 'VP', vpPct) : '');

    // Tooltip — combined sections for whatever is shown
    const tooltip = document.createElement('div');
    tooltip.setAttribute('style', [
      'display:none', 'position:absolute', 'bottom:calc(100% + 8px)', 'right:0',
      'background:#1e293b', 'color:#f1f5f9', 'border-radius:10px',
      'padding:10px 12px', 'min-width:185px',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)', 'line-height:1.6',
    ].join(';'));

    const sections: string[] = [];
    if (showRc) {
      sections.push(
        `<div style="font-weight:700;font-size:12px;margin-bottom:4px;color:${colorForPct(rcPct)}">⚡ Resource Credits</div>`,
        `<div style="font-size:10px;color:#94a3b8;margin-bottom:8px">${fmtRC(rcCur)} / ${fmtRC(rcMax)}</div>`,
        `<div style="font-size:10px;border-top:1px solid #334155;padding-top:7px;color:#cbd5e1;margin-bottom:4px">Approx. operations remaining:</div>`,
        `<div style="font-size:11px;display:grid;grid-template-columns:1fr auto;gap:2px 8px">`,
        opLine('👍', 'Votes',     costs ? opCount(costs.vote)     : null),
        opLine('💬', 'Comments',  costs ? opCount(costs.comment)  : null),
        opLine('📝', 'Posts',     costs ? opCount(costs.post)     : null),
        opLine('💸', 'Transfers', costs ? opCount(costs.transfer) : null),
        `</div>`,
      );
    }
    if (showVp && vpPct != null) {
      sections.push(
        `<div style="font-weight:700;font-size:12px;margin-bottom:4px;color:${colorForPct(vpPct)}${showRc ? ';border-top:1px solid #334155;padding-top:8px;margin-top:8px' : ''}">👍 Voting Power</div>`,
        `<div style="font-size:10px;color:#94a3b8">${Math.round(vpPct)}% of full mana. Regenerates ~20% per day; full votes cost ~2%.</div>`,
      );
    }
    sections.push(`<div style="font-size:9px;color:#475569;margin-top:8px">HivePulse · live network data</div>`);
    tooltip.innerHTML = sections.join('');

    widget.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
    widget.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

    widget.appendChild(tooltip);
    widget.appendChild(badgeRow);
    document.body.appendChild(widget);
  };

  const refresh = () => {
    chrome.storage.local.get(['rcStats', 'rcOperationCosts', 'settings'], (result: any) => {
      const mode: 'RC' | 'VP' | 'both' | 'off' = result?.settings?.overlayMetric ?? 'RC';
      if (mode === 'off') { removeWidget(); return; }

      const rc    = result?.rcStats;
      const costs = result?.rcOperationCosts ?? null;
      if (!rc || typeof rc.percentage !== 'number') { removeWidget(); return; }

      buildWidget({
        showRc: mode === 'RC' || mode === 'both',
        showVp: mode === 'VP' || mode === 'both',
        rcPct:  rc.percentage,
        rcCur:  rc.current,
        rcMax:  rc.max,
        vpPct:  typeof rc.vp === 'number' ? rc.vp : null,
        costs,
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local' && (changes.rcStats || changes.rcOperationCosts || changes.settings)) refresh();
  });
}
