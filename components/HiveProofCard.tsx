import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Share2, Download, Copy, Check } from 'lucide-react';
import { AccountStats, AppSettings } from '../types';
import { fetchHbdInterestRate } from '../utils/hiveHelpers';

interface HiveProofCardProps {
  stats: AccountStats;
  prices: { hive: number; hbd: number };
  settings: AppSettings;
}

const W = 600, H = 315;

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const fmtHP = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
  : n.toFixed(0);

export const HiveProofCard: React.FC<HiveProofCardProps> = ({ stats, prices, settings }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [hbdApr, setHbdApr]   = useState<number | null>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    fetchHbdInterestRate({ hiveRpcNode: settings.hiveRpcNode })
      .then(r => { if (r !== null) setHbdApr(r); })
      .catch(() => {});
  }, [settings.hiveRpcNode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { username, balances, rc, vp } = stats;
    const hp      = balances?.hivepower          ?? 0;
    const hive    = balances?.hive               ?? 0;
    const hbd     = balances?.hbd                ?? 0;
    const sHbd    = balances?.savingsHbd         ?? 0;
    const sHive   = balances?.savingsHive        ?? 0;
    const recvd   = balances?.receivedDelegations ?? 0;
    const delgd   = balances?.delegatedHp        ?? 0;
    const effHp   = hp - delgd + recvd;
    const totalUSD =
      hive  * prices.hive +
      hbd   * prices.hbd  +
      sHive * prices.hive +
      sHbd  * prices.hbd  +
      hp    * prices.hive;
    const aprPct  = hbdApr != null ? `${(hbdApr * 100).toFixed(1)}%` : '—';
    const font    = (size: number, weight = '400') =>
      `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const M   = 28;   // horizontal margin
    const gap = 14;   // gap between stat boxes
    const bW  = (W - M * 2 - gap) / 2;
    const bY  = 114, bH = 116;

    // ── Background ───────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // top accent bar
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, W, 4);

    // ── Header row ───────────────────────────────────────────
    ctx.font = font(13, 'bold');
    ctx.fillStyle = '#f97316';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ HivePulse', M, 34);

    ctx.font = font(11);
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    ctx.fillText(
      new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      W - M, 34
    );

    // ── Username ─────────────────────────────────────────────
    ctx.font = font(28, 'bold');
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText('@' + username, W / 2, 79);

    ctx.font = font(11);
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `RC ${Math.round(rc.percentage)}%  •  VP ${Math.round(vp.percentage)}%`,
      W / 2, 98
    );

    // ── Left box  — Hive Power ───────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    roundRect(ctx, M, bY, bW, bH, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    roundRect(ctx, M, bY, bW, bH, 10); ctx.stroke();

    ctx.font = font(9);    ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
    ctx.fillText('HIVE POWER', M + 14, bY + 20);

    ctx.font = font(27, 'bold'); ctx.fillStyle = '#f1f5f9';
    ctx.fillText(fmtHP(effHp), M + 14, bY + 56);

    ctx.font = font(11); ctx.fillStyle = '#f59e0b';
    ctx.fillText('HP • effective voting weight', M + 14, bY + 75);

    ctx.font = font(11); ctx.fillStyle = '#475569';
    ctx.fillText(
      '$' + (hp * prices.hive).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' USD staked',
      M + 14, bY + 93
    );

    ctx.font = font(9); ctx.fillStyle = '#334155';
    ctx.fillText('HIVE @ $' + prices.hive.toFixed(3), M + 14, bY + 109);

    // ── Right box — HBD Savings APR ──────────────────────────
    const rX = M + bW + gap;
    ctx.fillStyle = 'rgba(16,185,129,0.07)';
    roundRect(ctx, rX, bY, bW, bH, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(16,185,129,0.18)'; ctx.lineWidth = 1;
    roundRect(ctx, rX, bY, bW, bH, 10); ctx.stroke();

    ctx.font = font(9); ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
    ctx.fillText('HBD SAVINGS APR', rX + 14, bY + 20);

    ctx.font = font(38, 'bold'); ctx.fillStyle = '#10b981';
    ctx.fillText(aprPct, rX + 14, bY + 62);

    ctx.font = font(11); ctx.fillStyle = '#6ee7b7';
    ctx.fillText(
      sHbd > 0
        ? `${sHbd.toLocaleString(undefined, { maximumFractionDigits: 0 })} HBD earning`
        : 'Hive stablecoin yield',
      rX + 14, bY + 81
    );

    if (sHbd > 0 && hbdApr) {
      const yearly = sHbd * hbdApr;
      ctx.font = font(10); ctx.fillStyle = '#475569';
      ctx.fillText(
        '+' + yearly.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' HBD / yr est.',
        rX + 14, bY + 98
      );
    }
    ctx.font = font(9); ctx.fillStyle = '#334155';
    ctx.fillText('HBD ≈ $1.00 USD soft-peg', rX + 14, bY + 112);

    // ── Portfolio total ───────────────────────────────────────
    ctx.font = font(12); ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    ctx.fillText(
      'Portfolio (ex. HE tokens): $' +
        totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD',
      W / 2, 253
    );

    // divider
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M, 263); ctx.lineTo(W - M, 263); ctx.stroke();

    // ── Footer ────────────────────────────────────────────────
    ctx.font = font(10); ctx.fillStyle = '#334155'; ctx.textAlign = 'left';
    ctx.fillText('Hive Blockchain • Zero fees • 3-second finality', M, 288);

    ctx.font = font(10, 'bold'); ctx.fillStyle = '#f97316'; ctx.textAlign = 'right';
    ctx.fillText('HivePulse', W - M, 288);
    ctx.textAlign = 'left';
  }, [stats, prices, hbdApr]);

  useEffect(() => { draw(); }, [draw]);

  const getBlob = (): Promise<Blob | null> =>
    new Promise(res => canvasRef.current?.toBlob(res, 'image/png') ?? res(null));

  const handleCopy = async () => {
    const blob = await getBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* popup may not be focused — silently fail */ }
  };

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hivepulse-${stats.username}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const aprStr = hbdApr != null ? `${(hbdApr * 100).toFixed(1)}%` : null;
    const hp     = stats.balances?.hivepower   ?? 0;
    const sHbd   = stats.balances?.savingsHbd  ?? 0;
    const lines: string[] = [
      aprStr
        ? `I'm earning ${aprStr} APR on HBD stablecoin savings on @hiveblockchain 🏦`
        : `Tracking my @hiveblockchain portfolio with HivePulse 🐝`,
      '',
      `⚡ ${fmtHP(hp)} HP staked`,
      ...(aprStr && sHbd > 0
        ? [`💰 ${sHbd.toLocaleString(undefined, { maximumFractionDigits: 0 })} HBD earning ${aprStr} APR`]
        : []),
      '',
      'Track yours free 👇',
    ];
    const text = lines.join('\n');
    const url  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 rounded-lg p-1.5">
            <Share2 size={13} className="text-orange-600" />
          </div>
          <span className="text-sm font-bold text-slate-800">Share Your Stats</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
          shareable card
        </span>
      </div>

      {/* Card preview — click to copy */}
      <div
        className="rounded-lg overflow-hidden mb-3 cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
        onClick={handleCopy}
        title="Click to copy image to clipboard"
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-slate-700"
        >
          {copied
            ? <Check size={12} className="text-emerald-500" />
            : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-slate-700"
        >
          <Download size={12} />
          Download
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg bg-slate-900 hover:bg-slate-700 text-white transition-all"
        >
          <Share2 size={12} />
          Post on X
        </button>
      </div>

      <p className="text-[9px] text-slate-300 text-center mt-2.5 uppercase tracking-wide">
        APR is set by Hive witnesses &amp; subject to change
      </p>
    </div>
  );
};
