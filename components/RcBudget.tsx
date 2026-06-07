import React from 'react';
import { Zap } from 'lucide-react';
import { AccountStats } from '../types';

interface RcBudgetProps {
  stats: AccountStats;
}

// Conservative RC cost estimates as % of max RC
const RC_COST_PCT = { vote: 0.3, comment: 2, post: 10, transfer: 0.5 };

const ops = (pct: number, cost: number) => Math.floor(pct / cost);

const ROWS: { label: string; icon: string; key: keyof typeof RC_COST_PCT }[] = [
  { label: 'Votes',     icon: '👍', key: 'vote'     },
  { label: 'Comments',  icon: '💬', key: 'comment'  },
  { label: 'Posts',     icon: '📝', key: 'post'     },
  { label: 'Transfers', icon: '💸', key: 'transfer' },
];

export const RcBudget: React.FC<RcBudgetProps> = ({ stats }) => {
  const pct = stats.rc.percentage;
  const rounded = Math.round(pct);

  const barColor =
    pct >= 60 ? 'bg-emerald-500' :
    pct >= 30 ? 'bg-amber-400'  :
                'bg-red-500';

  const textColor =
    pct >= 60 ? 'text-emerald-600' :
    pct >= 30 ? 'text-amber-500'   :
                'text-red-500';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-violet-100 rounded-lg p-1.5">
            <Zap size={13} className="text-violet-600" />
          </div>
          <span className="text-sm font-bold text-slate-800">RC Budget</span>
        </div>
        <span className={`text-sm font-bold ${textColor}`}>{rounded}%</span>
      </div>

      {/* Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(1, rounded)}%` }}
        />
      </div>

      {/* Operation estimates */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {ROWS.map(({ label, icon, key }) => {
          const count = ops(pct, RC_COST_PCT[key]);
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{icon} {label}</span>
              <span className="text-xs font-semibold text-slate-700">
                ~{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-slate-300 text-center mt-3 uppercase tracking-wide font-semibold">
        Estimates · actual costs vary by network load
      </p>
    </div>
  );
};
