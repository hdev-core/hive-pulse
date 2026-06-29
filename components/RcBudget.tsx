import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { AccountStats, AppSettings } from '../types';
import { fetchRcOperationCosts, RcOperationCosts } from '../utils/hiveHelpers';

interface RcBudgetProps {
  stats: AccountStats;
  settings: AppSettings;
}

const ROWS: { label: string; icon: string; key: keyof RcOperationCosts }[] = [
  { label: 'Votes',     icon: '👍', key: 'vote'     },
  { label: 'Comments',  icon: '💬', key: 'comment'  },
  { label: 'Posts',     icon: '📝', key: 'post'     },
  { label: 'Transfers', icon: '💸', key: 'transfer' },
];

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` :
  `${n}`;

// RC values run into the trillions — render with G/T suffixes (Hive RC convention).
const fmtRc = (n: number) =>
  n >= 1e12 ? `${(n / 1e12).toFixed(2)}T` :
  n >= 1e9  ? `${(n / 1e9).toFixed(2)}G` :
  n >= 1e6  ? `${(n / 1e6).toFixed(2)}M` :
  `${Math.round(n)}`;

const RC_COSTS_CACHE_KEY = 'rcOperationCosts';
const RC_COSTS_TS_KEY    = 'rcOperationCostsTs';
const CACHE_TTL          = 60 * 60 * 1000; // 1 hour

export const RcBudget: React.FC<RcBudgetProps> = ({ stats, settings }) => {
  const [costs, setCosts] = useState<RcOperationCosts | null>(null);

  useEffect(() => {
    const cacheKey = `${RC_COSTS_CACHE_KEY}:${stats.username}`;
    const tsKey    = `${RC_COSTS_TS_KEY}:${stats.username}`;
    chrome.storage.local.get([cacheKey, tsKey], async (stored) => {
      const ts: number | undefined = stored[tsKey];
      if (stored[cacheKey] && ts && Date.now() - ts < CACHE_TTL) {
        setCosts(stored[cacheKey]);
        return;
      }
      const fresh = await fetchRcOperationCosts(stats.username);
      if (fresh) {
        setCosts(fresh);
        chrome.storage.local.set({ [cacheKey]: fresh, [tsKey]: Date.now() });
      }
    });
  }, [stats.username]);

  const pct     = stats.rc.percentage;
  const current = stats.rc.current;
  const rounded = Math.round(pct);

  const barColor =
    pct >= 60 ? 'bg-emerald-500' :
    pct >= 30 ? 'bg-amber-400'   :
                'bg-red-500';

  const textColor =
    pct >= 60 ? 'text-emerald-600' :
    pct >= 30 ? 'text-amber-500'   :
                'text-red-500';

  const opCount = (cost: number) =>
    cost > 0 ? Math.floor(current / cost) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 rounded-lg p-1.5">
            <Zap size={13} className="text-violet-600" />
          </div>
          <span className="text-sm font-bold text-slate-800">RC Budget</span>
        </div>
        <span className={`text-sm font-bold ${textColor}`}>{rounded}%</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 mb-1.5">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(1, rounded)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-700">
          {fmtRc(current)} <span className="text-slate-400 font-normal">RC available</span>
        </span>
        <span className="text-[11px] text-slate-400">of {fmtRc(stats.rc.max)}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {ROWS.map(({ label, icon, key }) => {
          const cost = costs?.[key];
          const count = cost != null ? opCount(cost) : null;
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{icon} {label}</span>
              <span className="text-xs font-semibold text-slate-700">
                {count != null ? `~${fmt(count)}` : '…'}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-slate-300 text-center mt-3 uppercase tracking-wide font-semibold">
        Live network costs · actual usage may vary
      </p>
    </div>
  );
};
