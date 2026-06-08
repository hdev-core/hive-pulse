import React, { useState, useEffect, useCallback } from 'react';
import { AppSettings, AccountStats } from '../../types';
import { fetchAccountStats } from '../../utils/hiveHelpers';
import { broadcastKeychainOp } from '../../utils/keychainHelpers';
import { Search, Activity } from 'lucide-react';
import { PortfolioCard } from '../PortfolioCard';
import { EarningExplainer } from '../EarningExplainer';
import { OnboardingBanner } from '../OnboardingBanner';
import { SendForm } from '../SendForm';
import { RcBudget } from '../RcBudget';

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

  // Refresh stats after a successful claim/send
  const refreshStats = useCallback(async () => {
    if (!stats) return;
    const data = await fetchAccountStats(stats.username, settings);
    if (data) {
      setStats(data);
      if (onDataFetched) onDataFetched(data);
    }
  }, [stats, settings]);

  // Only show claim button when viewing your own account
  const isOwnAccount = !!settings.ecencyUsername && stats?.username === settings.ecencyUsername;

  const handleClaimRewards = async () => {
    if (!stats?.balances || !stats.username) throw new Error('No account data.');
    const { pendingHive, pendingHbd, pendingVests } = stats.balances;
    if (pendingHive <= 0 && pendingHbd <= 0 && pendingVests <= 0) throw new Error('No rewards to claim.');

    const result = await broadcastKeychainOp(
      stats.username,
      [['claim_reward_balance', {
        account: stats.username,
        reward_hive: `${pendingHive.toFixed(3)} HIVE`,
        reward_hbd: `${pendingHbd.toFixed(3)} HBD`,
        reward_vests: `${pendingVests.toFixed(6)} VESTS`,
      }]],
      'Posting'
    );
    if (!result.success) throw new Error(result.error || 'Claim failed.');
    await refreshStats();
  };

  // Trigger HBD savings interest credit via a minimal transfer_to_savings.
  // Hive has no standalone claim-interest op; any savings transfer causes the chain
  // to credit accrued interest first.
  const handleClaimInterest = async () => {
    if (!stats?.balances || !stats.username) throw new Error('No account data.');
    const { savingsHbd, hbd } = stats.balances;
    if (savingsHbd <= 0) throw new Error('No HBD in savings.');
    if (hbd < 0.001) throw new Error('Need at least 0.001 liquid HBD to trigger interest credit.');

    const result = await broadcastKeychainOp(
      stats.username,
      [['transfer_to_savings', {
        from: stats.username,
        to: stats.username,
        amount: '0.001 HBD',
        memo: '',
      }]],
      'Active'
    );
    if (!result.success) throw new Error(result.error || 'Claim failed.');
    await refreshStats();
  };

  return (
    <div className="flex flex-col gap-4">
      <OnboardingBanner />
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
            hiveRpcNode={settings.hiveRpcNode}
            onClaimRewards={isOwnAccount ? handleClaimRewards : undefined}
            onClaimInterest={isOwnAccount ? handleClaimInterest : undefined}
          />
        )}

        {!loading && !stats && !error && (
          <div className="text-center py-6 text-slate-400 text-sm">{settings.rcUser ? 'Loading saved user...' : 'Enter a Hive username to view wallet.'}</div>
        )}
      </div>

      {/* RC Budget — shown whenever stats are loaded */}
      {!loading && stats && <RcBudget stats={stats} settings={settings} />}

      {/* Send / Receive / History — only shown for own account */}
      {isOwnAccount && stats?.balances && (
        <SendForm
          username={stats.username}
          balances={{ hive: stats.balances.hive, hbd: stats.balances.hbd }}
          settings={settings}
          onSuccess={refreshStats}
        />
      )}

      <EarningExplainer />
    </div>
  );
};
