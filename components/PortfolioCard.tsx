import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, TrendingUp, Wallet, Zap, Lock, Clock, Coins, Loader, Search, ArrowUpDown } from 'lucide-react';
import { BalanceInfo } from '../types';
import { formatUSD } from '../utils/hiveHelpers';
import { getHiveEnginePortfolioValue, HiveEngineToken, loadIconAsDataUrl } from '../utils/hiveEngineHelpers';

type HESortMode = 'value' | 'name' | 'balance';

interface PortfolioCardProps {
  balances: BalanceInfo;
  hivePrice: number;
  hbdPrice?: number;
  username?: string;
  heRpcNode?: string;
}

interface AssetRow {
  icon: React.ReactNode;
  label: string;
  amount: number;
  token: string;
  valueUSD: number;
  color: string;
  section: 'liquid' | 'staked' | 'savings' | 'pending' | 'hive-engine';
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ 
  balances, 
  hivePrice,
  hbdPrice = 1.0,
  username,
  heRpcNode
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hiveEngineTokens, setHiveEngineTokens] = useState<HiveEngineToken[]>([]);
  const [hiveEngineTotal, setHiveEngineTotal] = useState(0);
  const [loadingHE, setLoadingHE] = useState(false);
  const [heSortMode, setHeSortMode] = useState<HESortMode>('value');
  const [heFilter, setHeFilter] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    liquid: true,
    staked: true,
    savings: balances.savingsHive > 0 || balances.savingsHbd > 0,
    pending: balances.pendingHive > 0 || balances.pendingHbd > 0,
    'hive-engine': true
  });

  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});
  const [iconDataUrls, setIconDataUrls] = useState<Record<string, string>>({});

  // Fetch Hive-Engine tokens when expanding the card
  useEffect(() => {
    if (isExpanded && username && hiveEngineTokens.length === 0 && !loadingHE && hivePrice > 0) {
      setLoadingHE(true);
      getHiveEnginePortfolioValue(username, hivePrice, heRpcNode)
        .then(result => {
          setHiveEngineTokens(result.tokens);
          setHiveEngineTotal(result.totalUSD);
        })
        .catch(err => {
          console.error('Error fetching Hive-Engine:', err);
          setHiveEngineTokens([]);
          setHiveEngineTotal(0);
        })
        .finally(() => setLoadingHE(false));
    }
  }, [isExpanded, username, hivePrice]);

  // Lazily load token icons as data URLs (non-blocking)
  useEffect(() => {
    if (hiveEngineTokens.length === 0) return;
    let cancelled = false;
    const loadIcons = async () => {
      for (const token of hiveEngineTokens) {
        if (cancelled) break;
        if (!token.iconUrl || iconDataUrls[token.symbol] || iconErrors[token.symbol]) continue;
        const dataUrl = await loadIconAsDataUrl(token.iconUrl);
        if (cancelled) break;
        if (dataUrl) {
          setIconDataUrls(prev => ({ ...prev, [token.symbol]: dataUrl }));
        } else {
          setIconErrors(prev => ({ ...prev, [token.symbol]: true }));
        }
      }
    };
    loadIcons();
    return () => { cancelled = true; };
  }, [hiveEngineTokens]);

  const filteredSortedTokens = useMemo(() => {
    let list = hiveEngineTokens;
    if (heFilter.trim()) {
      const q = heFilter.trim().toLowerCase();
      list = list.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (heSortMode) {
      case 'name':
        sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      case 'balance':
        sorted.sort((a, b) => b.balance - a.balance);
        break;
      case 'value':
      default:
        sorted.sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD));
        break;
    }
    return sorted;
  }, [hiveEngineTokens, heSortMode, heFilter]);

  // Calculate breakdown
  const breakdown = {
    hive: balances.hive * hivePrice,
    hbd: balances.hbd * hbdPrice,
    savingsHive: balances.savingsHive * hivePrice,
    savingsHbd: balances.savingsHbd * hbdPrice,
    hivepower: balances.hivepower * hivePrice,
    pendingHive: balances.pendingHive * hivePrice,
    pendingHbd: balances.pendingHbd * hbdPrice,
    delegatedHp: (balances.delegatedHp || 0) * hivePrice
  };

  const totalValue = Object.values(breakdown).reduce((a, b) => a + b, 0) + hiveEngineTotal;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const assets: AssetRow[] = [
    // Liquid Assets
    {
      icon: <Wallet size={16} />,
      label: 'Liquid HIVE',
      amount: balances.hive,
      token: 'HIVE',
      valueUSD: breakdown.hive,
      color: 'from-orange-50 to-orange-100 border-orange-200',
      section: 'liquid'
    },
    {
      icon: <Coins size={16} />,
      label: 'Liquid HBD',
      amount: balances.hbd,
      token: 'HBD',
      valueUSD: breakdown.hbd,
      color: 'from-green-50 to-green-100 border-green-200',
      section: 'liquid'
    },
    // Staked Assets
    {
      icon: <Lock size={16} />,
      label: 'Hive Power (HP)',
      amount: balances.hivepower,
      token: 'HP',
      valueUSD: breakdown.hivepower,
      color: 'from-amber-50 to-amber-100 border-amber-200',
      section: 'staked'
    },
    ...(balances.delegatedHp && balances.delegatedHp > 0.01 ? [{
      icon: <Lock size={16} className="opacity-60" />,
      label: 'Delegated HP',
      amount: balances.delegatedHp,
      token: 'HP',
      valueUSD: breakdown.delegatedHp,
      color: 'from-amber-50/60 to-amber-100/60 border-amber-200',
      section: 'staked' as const
    }] : []),
    // Savings
    ...(balances.savingsHive > 0 ? [{
      icon: <Clock size={16} />,
      label: 'Savings HIVE',
      amount: balances.savingsHive,
      token: 'HIVE',
      valueUSD: breakdown.savingsHive,
      color: 'from-orange-50/70 to-orange-100/70 border-orange-200',
      section: 'savings' as const
    }] : []),
    ...(balances.savingsHbd > 0 ? [{
      icon: <Clock size={16} />,
      label: 'Savings HBD',
      amount: balances.savingsHbd,
      token: 'HBD',
      valueUSD: breakdown.savingsHbd,
      color: 'from-green-50/70 to-green-100/70 border-green-200',
      section: 'savings' as const
    }] : []),
    // Pending Rewards
    ...(balances.pendingHive > 0 ? [{
      icon: <Zap size={16} />,
      label: 'Pending HIVE',
      amount: balances.pendingHive,
      token: 'HIVE',
      valueUSD: breakdown.pendingHive,
      color: 'from-yellow-50 to-yellow-100 border-yellow-200',
      section: 'pending' as const
    }] : []),
    ...(balances.pendingHbd > 0 ? [{
      icon: <Zap size={16} />,
      label: 'Pending HBD',
      amount: balances.pendingHbd,
      token: 'HBD',
      valueUSD: breakdown.pendingHbd,
      color: 'from-lime-50 to-lime-100 border-lime-200',
      section: 'pending' as const
    }] : [])
  ];

  const sections = [
    { key: 'liquid', label: '💧 Liquid Assets', icon: '💧' },
    { key: 'staked', label: '🔒 Staked Assets', icon: '🔒' },
    { key: 'savings', label: '⏰ Savings', icon: '⏰' },
    { key: 'pending', label: '⚡ Pending Rewards', icon: '⚡' },
    { key: 'hive-engine', label: '🎮 Hive-Engine', icon: '🎮' }
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      {/* Main Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-blue-100/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-lg p-2">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Account Value</p>
            <p className="text-2xl font-bold text-slate-900">{formatUSD(totalValue)}</p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <div className="border-t border-blue-200 bg-white/50 space-y-0 animate-in fade-in duration-200">
          {/* Liquid Assets Section */}
          {assets.filter(a => a.section === 'liquid').length > 0 && (
            <div className="border-b border-slate-200">
              <button
                onClick={() => toggleSection('liquid')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
              >
                <span className="font-semibold text-slate-800 text-sm">💧 Liquid Assets</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections.liquid ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.liquid && (
                <div className="px-4 pb-3 space-y-2">
                  {assets.filter(a => a.section === 'liquid').map((asset, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${asset.color} border rounded-lg p-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="text-slate-600">{asset.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{asset.label}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatUSD(asset.valueUSD)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staked Assets Section */}
          {assets.filter(a => a.section === 'staked').length > 0 && (
            <div className="border-b border-slate-200">
              <button
                onClick={() => toggleSection('staked')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
              >
                <span className="font-semibold text-slate-800 text-sm">🔒 Staked Assets</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections.staked ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.staked && (
                <div className="px-4 pb-3 space-y-2">
                  {assets.filter(a => a.section === 'staked').map((asset, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${asset.color} border rounded-lg p-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="text-slate-600">{asset.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{asset.label}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatUSD(asset.valueUSD)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Savings Section */}
          {assets.filter(a => a.section === 'savings').length > 0 && (
            <div className="border-b border-slate-200">
              <button
                onClick={() => toggleSection('savings')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
              >
                <span className="font-semibold text-slate-800 text-sm">⏰ Savings (20% APR on HBD)</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections.savings ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.savings && (
                <div className="px-4 pb-3 space-y-2">
                  {assets.filter(a => a.section === 'savings').map((asset, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${asset.color} border rounded-lg p-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="text-slate-600">{asset.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{asset.label}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatUSD(asset.valueUSD)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Rewards Section */}
          {assets.filter(a => a.section === 'pending').length > 0 && (
            <div className="border-b border-slate-200">
              <button
                onClick={() => toggleSection('pending')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
              >
                <span className="font-semibold text-slate-800 text-sm">⚡ Pending Rewards (Claim Soon!)</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections.pending ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.pending && (
                <div className="px-4 pb-3 space-y-2">
                  {assets.filter(a => a.section === 'pending').map((asset, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${asset.color} border rounded-lg p-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="text-slate-600">{asset.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{asset.label}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatUSD(asset.valueUSD)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hive-Engine Section */}
          <div className="border-b border-slate-200">
            <button
              onClick={() => toggleSection('hive-engine')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 text-sm">🎮 Hive-Engine Assets</span>
                {hiveEngineTotal > 0 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                    {formatUSD(hiveEngineTotal)}
                  </span>
                )}
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections['hive-engine'] ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections['hive-engine'] && (
              <div className="px-4 pb-3">
                {loadingHE ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader size={16} className="animate-spin text-slate-400" />
                    <p className="text-xs text-slate-600">Fetching tokens from Hive-Engine...</p>
                  </div>
                ) : hiveEngineTokens.length > 0 ? (
                  <div className="space-y-2">
                    {/* Filter & Sort Controls */}
                    <div className="flex flex-col gap-1.5 mb-1">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={heFilter}
                          onChange={e => setHeFilter(e.target.value)}
                          placeholder="Filter tokens..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowUpDown size={12} className="text-slate-400 mr-1" />
                        {(['value', 'name', 'balance'] as HESortMode[]).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setHeSortMode(mode)}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-all ${
                              heSortMode === mode
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {mode === 'value' ? 'Value' : mode === 'name' ? 'A-Z' : 'Balance'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredSortedTokens.length > 0 ? filteredSortedTokens.map((token, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-100 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {iconDataUrls[token.symbol] ? (
                            <img
                              src={iconDataUrls[token.symbol]}
                              alt={token.symbol}
                              className="w-7 h-7 rounded"
                            />
                          ) : !iconErrors[token.symbol] && token.iconUrl ? (
                            <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center animate-pulse" />
                          ) : (
                            <div className="text-xs font-bold text-purple-700 bg-purple-200 rounded px-2 py-1 min-w-[28px] text-center">
                              {token.symbol.length > 4 ? token.symbol.slice(0, 4) : token.symbol}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-slate-800">{token.name}</p>
                            <p className="text-xs text-slate-600">{token.balance.toFixed(2)} {token.symbol}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{formatUSD(token.balance * token.priceUSD)}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500 text-center py-2">No tokens match your filter.</p>
                    )}
                    <div className="border-t border-purple-200 pt-2 flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-800">Hive-Engine Total</span>
                      <span className="font-bold text-purple-600">{formatUSD(hiveEngineTotal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100/50 border border-slate-300 rounded-lg p-4 text-center space-y-2">
                    <p className="text-xs text-slate-700 font-medium">No Hive-Engine tokens in wallet</p>
                    <p className="text-xs text-slate-600">You can buy tokens on:</p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>Hive-Engine: https://hive-engine.com</li>
                      <li>Splinterlands.com (for DEC)</li>
                      <li>InLeo.io (for LEO)</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total Footer */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex justify-between items-center">
            <span className="font-semibold text-white text-sm">Total Portfolio Value</span>
            <span className="text-lg font-bold text-white">{formatUSD(totalValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
