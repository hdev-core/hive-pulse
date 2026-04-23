import React, { useState } from 'react';
import { ChevronDown, TrendingUp, Wallet, Zap, Lock, Clock, Coins } from 'lucide-react';
import { BalanceInfo } from '../types';
import { formatUSD } from '../utils/hiveHelpers';

interface PortfolioCardProps {
  balances: BalanceInfo;
  hivePrice: number;
  hbdPrice?: number;
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
  hbdPrice = 1.0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    liquid: true,
    staked: true,
    savings: balances.savingsHive > 0 || balances.savingsHbd > 0,
    pending: balances.pendingHive > 0 || balances.pendingHbd > 0,
    'hive-engine': false
  });

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

  const totalValue = Object.values(breakdown).reduce((a, b) => a + b, 0);

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

          {/* Hive-Engine Section (Placeholder) */}
          <div className="border-b border-slate-200">
            <button
              onClick={() => toggleSection('hive-engine')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left"
            >
              <span className="font-semibold text-slate-800 text-sm">🎮 Hive-Engine Assets</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections['hive-engine'] ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections['hive-engine'] && (
              <div className="px-4 pb-3">
                <div className="bg-slate-100/50 border border-slate-300 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-600">Hive-Engine tokens coming soon</p>
                  <p className="text-xs text-slate-500 mt-1">Integration in progress...</p>
                </div>
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
