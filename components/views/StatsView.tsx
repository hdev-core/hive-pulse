
import React, { useState, useEffect } from 'react';
import { AccountStats, AppSettings } from '../../types';
import { fetchAccountStats, formatRCNumber } from '../../utils/hiveHelpers';
import { Search, Activity, ThumbsUp, Zap } from 'lucide-react';

interface StatsViewProps {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  // If parent wants to update badge based on fetched data
  onDataFetched?: (data: AccountStats) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ settings, updateSettings, onDataFetched }) => {
  const [statsUsername, setStatsUsername] = useState<string>(settings.rcUser || '');
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch if we have a saved user and no data
  useEffect(() => {
    if (settings.rcUser && !accountStats && !loading && !error) {
       handleCheckStats(undefined, settings.rcUser);
    }
  }, [settings.rcUser]);

  const handleCheckStats = async (e?: React.FormEvent, overrideUser?: string) => {
    if (e) e.preventDefault();
    const target = overrideUser || statsUsername;
    if (!target) return;

    setLoading(true);
    setError(null);
    try {
      const cleanUsername = target.replace('@', '').trim();
      const data = await fetchAccountStats(cleanUsername);
      if (data) {
        setAccountStats(data);
        // Only update setting if user explicitly searched
        if (!overrideUser) {
           updateSettings({ rcUser: data.username });
        }
        if (onDataFetched) onDataFetched(data);
      } else {
        setError('Account not found');
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const renderGauge = (percentage: number, isLow: boolean, label: string, icon: React.ReactNode, subValue?: string) => (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28 flex items-center justify-center mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="8" fill="none" />
          <circle
            cx="56" cy="56" r="48"
            stroke={isLow ? '#ef4444' : percentage > 50 ? '#10b981' : '#f59e0b'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 301.6, 
              strokeDashoffset: 301.6 - (301.6 * percentage) / 100,
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          {icon}
          <span className="text-xl font-bold text-slate-800 mt-1">{percentage.toFixed(2)}%</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</span>
      {subValue && <span className="text-[10px] text-slate-400 mt-0.5">{subValue}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
        <form onSubmit={(e) => handleCheckStats(e)} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
            <input 
              type="text" 
              value={statsUsername}
              onChange={(e) => setStatsUsername(e.target.value)}
              placeholder="username"
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Search size={18} />
          </button>
        </form>

        {loading && (
          <div className="py-8 flex justify-center">
            <Activity className="animate-spin text-slate-300" size={32} />
          </div>
        )}

        {error && (
          <div className="py-4 text-center text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {!loading && accountStats && (
          <div className="flex flex-col items-center py-2 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">@{accountStats.username}</h3>
            <div className="flex justify-between w-full px-2 mb-4">
              {renderGauge(
                accountStats.vp.percentage, 
                accountStats.vp.isLow, 
                'Voting Power', 
                <ThumbsUp size={20} className={accountStats.vp.isLow ? 'text-red-500' : 'text-slate-400'} />,
                `${(accountStats.vp.percentage).toFixed(2)}%`
              )}
              {renderGauge(
                accountStats.rc.percentage, 
                accountStats.rc.isLow, 
                'Resource Credits', 
                <Zap size={20} className={accountStats.rc.isLow ? 'text-red-500' : 'text-slate-400'} fill="currentColor" />,
                `${formatRCNumber(accountStats.rc.current)} Mana`
              )}
            </div>
            <div className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Extension Badge</span>
              <div className="flex bg-slate-200 rounded p-0.5">
                 <button onClick={() => updateSettings({ badgeMetric: 'RC' })} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${settings.badgeMetric === 'RC' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>RC</button>
                 <button onClick={() => updateSettings({ badgeMetric: 'VP' })} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${settings.badgeMetric === 'VP' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>VP</button>
              </div>
            </div>
          </div>
        )}

        {!loading && !accountStats && !error && (
          <div className="text-center py-6 text-slate-400 text-sm">
            {settings.rcUser ? 'Loading saved user...' : 'Enter a Hive username to monitor.'}
          </div>
        )}
      </div>
    </div>
  );
};
