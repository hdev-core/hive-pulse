import React, { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { BalanceInfo } from '../types';
import { formatUSD } from '../utils/hiveHelpers';

interface PortfolioCardProps {
  balances: BalanceInfo;
  hivePrice: number;
  hbdPrice?: number;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ 
  balances, 
  hivePrice,
  hbdPrice = 1.0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate breakdown
  const breakdown = {
    hive: balances.hive * hivePrice,
    hbd: balances.hbd * hbdPrice,
    savingsHive: balances.savingsHive * hivePrice,
    savingsHbd: balances.savingsHbd * hbdPrice
  };

  const totalValue = breakdown.hive + breakdown.hbd + breakdown.savingsHive + breakdown.savingsHbd;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      {/* Main Card */}
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
        <div className="border-t border-blue-200 bg-white/50 p-4 space-y-3 animate-in fade-in duration-200">
          {/* Liquid HIVE */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-sm text-slate-700">Liquid HIVE</span>
              <span className="text-xs text-slate-500">({balances.hive.toFixed(2)})</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{formatUSD(breakdown.hive)}</span>
          </div>

          {/* Liquid HBD */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-slate-700">Liquid HBD</span>
              <span className="text-xs text-slate-500">({balances.hbd.toFixed(2)})</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">{formatUSD(breakdown.hbd)}</span>
          </div>

          {/* Savings HIVE */}
          {balances.savingsHive > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-sm text-slate-700">Savings HIVE</span>
                <span className="text-xs text-slate-500">({balances.savingsHive.toFixed(2)})</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{formatUSD(breakdown.savingsHive)}</span>
            </div>
          )}

          {/* Savings HBD */}
          {balances.savingsHbd > 0 && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-sm text-slate-700">Savings HBD</span>
                <span className="text-xs text-slate-500">({balances.savingsHbd.toFixed(2)})</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{formatUSD(breakdown.savingsHbd)}</span>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-blue-100 pt-3 flex justify-between items-center">
            <span className="font-semibold text-slate-900">Total Value</span>
            <span className="text-lg font-bold text-blue-600">{formatUSD(totalValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
