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
  'ureka.social',
  'slothbuzz.com',
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

  // ── @username hover cards ──────────────────────────────────────────────────
  // Reputation and account age at a glance on every frontend. Account data and the
  // bad-actor check come from the background over sendMessage — this script is a classic
  // (non-module) script and cannot import them.
  const CARD_ID = 'hivepulse-hover-card';
  const HOVER_DELAY_MS = 350;
  let hoverCardsOn = true;
  let card: HTMLElement | null = null;
  let hoverTimer: number | null = null;
  let activeAnchor: HTMLElement | null = null;

  chrome.storage.local.get(['settings'], (r: any) => {
    hoverCardsOn = r?.settings?.usernameHoverCards !== false;
  });
  chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area === 'local' && changes.settings) {
      hoverCardsOn = changes.settings.newValue?.usernameHoverCards !== false;
      if (!hoverCardsOn) hideCard();
    }
  });

  function hideCard() {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    card?.remove();
    card = null;
    activeAnchor = null;
  }

  // Only treat a link as a profile link when its href is a real Hive profile path.
  // Matching on visible "@name" text alone would fire on every mention inside post bodies.
  const usernameFromAnchor = (a: HTMLAnchorElement): string | null => {
    let path: string;
    try {
      path = new URL(a.href, location.origin).pathname;
    } catch {
      return null;
    }
    const m = path.match(/^\/@([a-z][a-z0-9.-]{2,15})\/?$/i);
    return m ? m[1].toLowerCase() : null;
  };

  const row = (label: string, value: string, color?: string) =>
    `<div style="display:flex;justify-content:space-between;gap:12px;padding:2px 0">
       <span style="color:#94a3b8">${label}</span>
       <span style="font-weight:600;color:${color || '#e2e8f0'}">${value}</span>
     </div>`;

  const renderCard = (anchor: HTMLElement, username: string, data: any) => {
    if (!hoverCardsOn) return;
    card?.remove();

    card = document.createElement('div');
    card.id = CARD_ID;
    card.style.cssText = [
      'position:absolute', 'z-index:2147483646', 'min-width:210px',
      'background:#0f172a', 'color:#e2e8f0', 'border:1px solid #334155',
      'border-radius:10px', 'padding:10px 12px', 'font-size:12px',
      'font-family:system-ui,-apple-system,sans-serif', 'line-height:1.45',
      'box-shadow:0 10px 30px rgba(0,0,0,.45)', 'pointer-events:none',
    ].join(';');

    if (!data) {
      card.innerHTML = `<div style="color:#94a3b8">@${username} — no data</div>`;
    } else {
      const danger = data.risk === 'blocked';
      // A low-reputation, days-old account is the signature of an impersonation attempt,
      // so call those out rather than making the user infer it from the numbers.
      const young = data.ageDays < 30;
      const lowRep = data.reputation < 40;

      const banner = danger
        ? `<div style="margin:-10px -12px 8px;padding:6px 12px;background:#7f1d1d;color:#fecaca;font-weight:700;border-radius:10px 10px 0 0">⚠ Known scam account</div>`
        : (young && lowRep)
          ? `<div style="margin:-10px -12px 8px;padding:6px 12px;background:#78350f;color:#fde68a;font-weight:700;border-radius:10px 10px 0 0">⚠ New account, low reputation</div>`
          : '';

      const age = data.ageDays >= 365
        ? `${Math.floor(data.ageDays / 365)}y ${Math.floor((data.ageDays % 365) / 30)}m`
        : data.ageDays >= 30 ? `${Math.floor(data.ageDays / 30)} months` : `${data.ageDays} days`;

      const hp = data.hp >= 1000 ? `${(data.hp / 1000).toFixed(1)}k HP` : `${data.hp.toFixed(0)} HP`;

      card.innerHTML =
        banner +
        `<div style="font-weight:700;margin-bottom:6px">@${username}</div>` +
        row('Reputation', String(data.reputation), lowRep ? '#fbbf24' : '#34d399') +
        row('Account age', age, young ? '#fbbf24' : undefined) +
        row('Hive Power', hp) +
        row('Posts', String(data.postCount));
    }

    document.body.appendChild(card);

    const r = anchor.getBoundingClientRect();
    const top = r.bottom + window.scrollY + 6;
    const left = Math.min(
      r.left + window.scrollX,
      window.scrollX + document.documentElement.clientWidth - card.offsetWidth - 8
    );
    card.style.top = `${top}px`;
    card.style.left = `${Math.max(8, left)}px`;
  };

  document.addEventListener('mouseover', (e: MouseEvent) => {
    if (!hoverCardsOn) return;
    const anchor = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null;
    if (!anchor || anchor === activeAnchor) return;

    const username = usernameFromAnchor(anchor);
    if (!username) return;

    hideCard();
    activeAnchor = anchor;
    hoverTimer = window.setTimeout(() => {
      // After the extension reloads/updates, this orphaned script's chrome.runtime is
      // invalidated; guard so it fails silently instead of throwing "Extension context
      // invalidated" on every hover.
      try {
        if (!chrome.runtime?.id) return;
        chrome.runtime.sendMessage({ type: 'HP_ACCOUNT_CARD', username }, (resp: any) => {
          if (chrome.runtime.lastError || activeAnchor !== anchor) return;
          renderCard(anchor, username, resp?.card ?? null);
        });
      } catch { /* extension context gone — ignore */ }
    }, HOVER_DELAY_MS);
  });

  document.addEventListener('mouseout', (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement)?.closest?.('a');
    if (anchor && anchor === activeAnchor) hideCard();
  });

  window.addEventListener('scroll', hideCard, { passive: true });
}
