import React, { useState, useEffect } from 'react';
import { AppSettings, AccountStats } from '../../types';
import { fetchAccountStats } from '../../utils/hiveHelpers';
import { Search, Activity } from 'lucide-react';
import { PortfolioCard } from '../PortfolioCard';

interface WalletViewProps {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  onDataFetched?: (data: AccountStats) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ settings, updateSettings, onDataFetched }) => {
  const [prices, setPrices] = useState<{ hive: number; hbd: number } | null>(null);
  const [username, setUsername] = useState(settings.rcUser || '');
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd');
        const data = await response.json();
        if (data && data.hive && data.hive_dollar) {
          setPrices({ hive: data.hive.usd, hbd: data.hive_dollar.usd });
        }
      } catch (e) {
        console.error('Error fetching prices:', e);
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    if (settings.rcUser && !stats && !loading && !error) {
      handleFetch(undefined, settings.rcUser);
    }
  }, [settings.rcUser]);

  const handleFetch = async (e?: React.FormEvent, userToFetch?: string) => {
    if (e) e.preventDefault();
    const targetUser = userToFetch || username;
    if (!targetUser) return;

    setLoading(true);
    setError(null);

    try {
      const cleanUser = targetUser.replace('@', '').trim();
      const data = await fetchAccountStats(cleanUser, settings);
      if (data) {
        setStats(data);
        if (!userToFetch) updateSettings({ rcUser: data.username });
        if (onDataFetched) onDataFetched(data);
      } else {
        setError('Account not found');
      }
    } catch {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {prices ? (
        <div className="flex items-center justify-center gap-8 py-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-red-600">HIVE</span>
            <span className="text-lg font-bold text-slate-700">${prices.hive.toFixed(3)}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-green-600">HBD</span>
            <span className="text-lg font-bold text-slate-700">${prices.hbd.toFixed(3)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-4 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400 text-xs">Loading market data...</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
        <form onSubmit={handleFetch} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button type="submit" disabled={loading} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors">
            <Search size={18} />
          </button>
        </form>

        {loading && <div className="py-8 flex justify-center"><Activity className="animate-spin text-slate-300" size={32} /></div>}
        {error && <div className="py-4 text-center text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">{error}</div>}

        {!loading && stats && stats.balances && prices && (
          <PortfolioCard
            balances={stats.balances}
            hivePrice={prices.hive}
            hbdPrice={prices.hbd}
            username={stats.username}
            heRpcNode={settings.heRpcNode}
          />
        )}

        {!loading && !stats && !error && (
          <div className="text-center py-6 text-slate-400 text-sm">{settings.rcUser ? 'Loading saved user...' : 'Enter a Hive username to view wallet.'}</div>
        )}
      </div>
    </div>
  );
};