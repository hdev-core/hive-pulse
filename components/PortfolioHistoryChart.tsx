import React, { useState, useEffect } from 'react';
import { LineChart, Loader } from 'lucide-react';
import { AppSettings } from '../types';
import { fetchHiveBalanceHistory, fetchHpVestConversion, BalancePoint } from '../utils/hiveHelpers';

type Coin = 'HIVE' | 'HBD' | 'HP';

interface PortfolioHistoryChartProps {
  username: string;
  settings: AppSettings;
}

const COINS: { key: Coin; label: string }[] = [
  { key: 'HIVE', label: 'HIVE' },
  { key: 'HBD',  label: 'HBD' },
  { key: 'HP',   label: 'HP' },
];

const fmt = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
            : n.toLocaleString(undefined, { maximumFractionDigits: 3 });

const monthLabel = (iso: string) => {
  const d = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

export const PortfolioHistoryChart: React.FC<PortfolioHistoryChartProps> = ({ username, settings }) => {
  const [coin, setCoin] = useState<Coin>('HIVE');
  const [points, setPoints] = useState<BalancePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      const raw = await fetchHiveBalanceHistory(username, coin === 'HP' ? 'VESTS' : coin, 18);
      let series = raw;
      if (coin === 'HP') {
        const conv = await fetchHpVestConversion(settings);
        const hivePerVests = conv?.hivePerVests ?? 0;
        series = raw.map(p => ({ ...p, value: p.value * hivePerVests }));
      }
      if (!cancelled) { setPoints(series); setLoading(false); }
    };
    run();
    return () => { cancelled = true; };
  }, [username, coin]);

  // SVG geometry
  const W = 300, H = 76, PAD = 4;
  const values = points.map(p => p.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const span = max - min || 1;
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const x = (i: number) => PAD + i * stepX;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${x(points.length - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`
    : '';

  const latest = values.length ? values[values.length - 1] : 0;
  const first = values.length ? values[0] : 0;
  const change = first > 0 ? ((latest - first) / first) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <LineChart size={14} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Balance History</span>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {COINS.map(c => (
            <button key={c.key} onClick={() => setCoin(c.key)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${coin === c.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-[100px] flex items-center justify-center gap-2 text-slate-400">
            <Loader size={15} className="animate-spin" />
            <span className="text-xs">Loading history…</span>
          </div>
        ) : points.length < 2 ? (
          <div className="h-[100px] flex items-center justify-center text-xs text-slate-400">
            Not enough history to chart {coin}.
          </div>
        ) : (
          <>
            {/* Current value + change */}
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-lg font-bold text-slate-900">{fmt(latest)} <span className="text-xs font-semibold text-slate-400">{coin}</span></span>
              <span className={`text-xs font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% <span className="text-slate-400 font-normal">since {monthLabel(points[0].date)}</span>
              </span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[76px]">
              <defs>
                <linearGradient id="hp-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              {areaPath && <path d={areaPath} fill="url(#hp-area)" />}
              <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Axis labels */}
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>{monthLabel(points[0].date)}</span>
              <span className="text-slate-300">peak {fmt(max)}</span>
              <span>{monthLabel(points[points.length - 1].date)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
