import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, TrendingUp, Wallet, Zap, Lock, Clock, Coins, Loader, Search, ArrowUpDown, ExternalLink, Calculator, Sparkles, History } from 'lucide-react';
import { BalanceInfo } from '../types';
import { formatUSD, fetchHbdInterestRate, fetchHbdInterestHistory, HbdInterestRecord } from '../utils/hiveHelpers';
import { getHiveEnginePortfolioValue, HiveEngineToken, loadIconAsDataUrl } from '../utils/hiveEngineHelpers';
import { Tooltip } from './Tooltip';

interface HbdSavingsWidgetProps {
  savingsHbd: number;
  liquidHbd: number;
  hbdPrice: number;
  apr: number | null;
  lastInterestPayment?: string;
  interestHistory?: HbdInterestRecord[];
  loadingHistory?: boolean;
  onClaimInterest?: () => Promise<void>;
}

const HbdSavingsWidget: React.FC<HbdSavingsWidgetProps> = ({
  savingsHbd, liquidHbd, hbdPrice, apr,
  lastInterestPayment, interestHistory, loadingHistory, onClaimInterest,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Hive compounds HBD savings interest once every 30 days.
  // The blockchain will not credit interest if fewer than 30 days have elapsed.
  const COMPOUND_DAYS = 30;

  if (savingsHbd <= 0) return null;

  const displayApr = apr ?? 0.20;
  const monthly = savingsHbd * (displayApr / 12);
  const yearly = savingsHbd * displayApr;

  // Estimate accrued interest since last payment
  let accruedHbd = 0;
  let daysSince = 0;
  if (lastInterestPayment) {
    const lastMs = new Date(lastInterestPayment + (lastInterestPayment.endsWith('Z') ? '' : 'Z')).getTime();
    daysSince = (Date.now() - lastMs) / 86_400_000;
    accruedHbd = savingsHbd * (displayApr / 365) * daysSince;
  }

  const daysUntilEligible = Math.max(0, COMPOUND_DAYS - daysSince);
  const isEligible = daysUntilEligible === 0;
  const canClaim = !!onClaimInterest && isEligible && liquidHbd >= 0.001;

  const handleClaim = async () => {
    if (!onClaimInterest) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      await onClaimInterest();
      setClaimResult({ ok: true, msg: 'Interest claimed successfully!' });
    } catch (e: any) {
      setClaimResult({ ok: false, msg: e.message || 'Claim failed.' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
      {/* APR header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-green-800">
          <Calculator size={13} />
          APR Calculator
        </div>
        {apr !== null ? (
          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            {(displayApr * 100).toFixed(1)}% APR
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Loading rate...</span>
        )}
      </div>

      {/* Projected earnings */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-md p-2 border border-green-100 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Monthly</p>
          <p className="text-sm font-bold text-green-700">+{monthly.toFixed(3)} HBD</p>
          <p className="text-[10px] text-slate-400">{formatUSD(monthly * hbdPrice)}</p>
        </div>
        <div className="bg-white rounded-md p-2 border border-green-100 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Yearly</p>
          <p className="text-sm font-bold text-green-700">+{yearly.toFixed(3)} HBD</p>
          <p className="text-[10px] text-slate-400">{formatUSD(yearly * hbdPrice)}</p>
        </div>
      </div>

      {/* Accrued interest + claim button */}
      {accruedHbd > 0.001 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <Sparkles size={12} />
              Accrued Interest
            </div>
            <span className="text-[10px] text-slate-500">{Math.round(daysSince)}d since last payment</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-700">~{accruedHbd.toFixed(3)} HBD</p>
              <p className="text-[10px] text-slate-500">{formatUSD(accruedHbd * hbdPrice)} estimated</p>
            </div>
            {onClaimInterest && isEligible ? (
              <button
                onClick={handleClaim}
                disabled={claiming || !canClaim}
                title={!canClaim ? 'Need ≥0.001 liquid HBD to trigger interest claim' : undefined}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {claiming ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {claiming ? 'Claiming…' : 'Claim'}
              </button>
            ) : onClaimInterest && (
              <span className="text-[10px] text-slate-500 shrink-0 text-right">
                Eligible in<br />
                <span className="font-semibold text-slate-600">{Math.ceil(daysUntilEligible)}d</span>
              </span>
            )}
          </div>
          {claimResult && (
            <p className={`text-[11px] font-medium ${claimResult.ok ? 'text-emerald-700' : 'text-red-500'}`}>
              {claimResult.msg}
            </p>
          )}
          {onClaimInterest && isEligible && !canClaim && (
            <p className="text-[10px] text-amber-600 italic">
              Need ≥0.001 liquid HBD in wallet to trigger interest credit.
            </p>
          )}
        </div>
      )}

      {/* Recent interest payments */}
      {(loadingHistory || (interestHistory && interestHistory.length > 0)) && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-700 uppercase tracking-wide">
            <History size={11} />
            Recent Payments
          </div>
          {loadingHistory ? (
            <div className="flex items-center gap-1.5 py-1 text-[10px] text-slate-400">
              <Loader size={10} className="animate-spin" /> Loading history…
            </div>
          ) : interestHistory?.map((rec, i) => {
            const date = new Date(rec.timestamp + (rec.timestamp.endsWith('Z') ? '' : 'Z'));
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={i} className="flex items-center justify-between bg-white rounded px-2 py-1 border border-green-100 text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="font-semibold text-green-700">+{rec.amount.toFixed(3)} HBD</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 italic">
        Rate set by Hive witnesses. Accrued amount is an estimate.
      </p>

      {/* Idle liquid HBD nudge */}
      {liquidHbd >= 0.001 && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-md px-2.5 py-2 text-xs">
          <span className="text-yellow-800">
            <span className="font-semibold">{liquidHbd.toFixed(3)} liquid HBD</span> not earning interest
          </span>
          <a
            href="https://peakd.com/market"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold shrink-0 ml-2"
          >
            Move <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
};

type HESortMode = 'value' | 'name' | 'balance';

interface PortfolioCardProps {
  balances: BalanceInfo;
  hivePrice: number;
  hbdPrice?: number;
  username?: string;
  heRpcNode?: string;
  hiveRpcNode?: string;
  onClaimRewards?: () => Promise<void>;
  onClaimInterest?: () => Promise<void>;
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
  heRpcNode,
  hiveRpcNode,
  onClaimRewards,
  onClaimInterest,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hiveEngineTokens, setHiveEngineTokens] = useState<HiveEngineToken[]>([]);
  const [hbdApr, setHbdApr] = useState<number | null>(null);
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
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [interestHistory, setInterestHistory] = useState<HbdInterestRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Fetch live HBD interest rate from chain
  useEffect(() => {
    if (balances.savingsHbd <= 0) return;
    fetchHbdInterestRate({ hiveRpcNode })
      .then(rate => { if (rate !== null) setHbdApr(rate); })
      .catch(() => {});
  }, [hiveRpcNode, balances.savingsHbd]);

  // Fetch HBD interest payment history when savings section is visible
  useEffect(() => {
    if (!username || balances.savingsHbd <= 0 || !expandedSections.savings) return;
    if (interestHistory.length > 0 || loadingHistory) return;
    setLoadingHistory(true);
    fetchHbdInterestHistory(username, { hiveRpcNode })
      .then(records => setInterestHistory(records))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [username, balances.savingsHbd, expandedSections.savings, hiveRpcNode]);

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
  const receivedDelegations = balances.receivedDelegations ?? 0;
  const delegatedHpVal = balances.delegatedHp ?? 0;
  const effectiveHp = balances.hivepower - delegatedHpVal + receivedDelegations;

  const breakdown = {
    hive: balances.hive * hivePrice,
    hbd: balances.hbd * hbdPrice,
    savingsHive: balances.savingsHive * hivePrice,
    savingsHbd: balances.savingsHbd * hbdPrice,
    hivepower: balances.hivepower * hivePrice,
    pendingHive: balances.pendingHive * hivePrice,
    pendingHbd: balances.pendingHbd * hbdPrice,
    delegatedHp: delegatedHpVal * hivePrice
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
    ...(delegatedHpVal > 0.01 ? [{
      icon: <Lock size={16} className="opacity-60" />,
      label: 'Delegated HP',
      amount: delegatedHpVal,
      token: 'HP',
      valueUSD: breakdown.delegatedHp,
      color: 'from-amber-50/60 to-amber-100/60 border-amber-200',
      section: 'staked' as const
    }] : []),
    ...(receivedDelegations > 0.01 ? [{
      icon: <Lock size={16} className="text-blue-400" />,
      label: 'Received Delegations',
      amount: receivedDelegations,
      token: 'HP',
      valueUSD: 0,
      color: 'from-blue-50/60 to-blue-100/60 border-blue-200',
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

  const ASSET_TOOLTIPS: Record<string, { term: string; definition: string }> = {
    'Liquid HIVE': { term: 'Liquid HIVE', definition: 'Freely transferable HIVE in your wallet. Use it to trade, stake as Hive Power, or send to others.' },
    'Liquid HBD': { term: 'HBD (Hive Backed Dollar)', definition: 'A stablecoin soft-pegged to $1 USD. Move it to Savings to earn interest at the current APR set by witnesses.' },
    'Hive Power (HP)': { term: 'Hive Power (HP)', definition: 'Staked HIVE that boosts your voting influence and curation rewards. Unstaking (power down) takes 13 weeks.' },
    'Delegated HP': { term: 'Delegated HP', definition: 'Hive Power you have lent to other accounts. It still counts toward your total but boosts the recipient\'s voting influence.' },
    'Received Delegations': { term: 'Received Delegations', definition: 'Hive Power delegated to you by other accounts. Boosts your voting influence but does not belong to you and can be withdrawn at any time.' },
    'Savings HIVE': { term: 'Savings HIVE', definition: 'HIVE locked in savings. Requires a 3-day waiting period to withdraw. Useful for security.' },
    'Savings HBD': { term: 'Savings HBD', definition: 'HBD in savings, earning interest at the network APR set by Hive witnesses. 3-day withdrawal delay applies.' },
    'Pending HIVE': { term: 'Pending HIVE', definition: 'HIVE rewards from your posts and curation that have not been claimed yet. Claim them on any Hive frontend.' },
    'Pending HBD': { term: 'Pending HBD', definition: 'HBD rewards from your posts and curation awaiting claim. Payouts unlock 7 days after the post was published.' },
  };

  const renderLabel = (label: string) => {
    const tip = ASSET_TOOLTIPS[label];
    if (!tip) return <span>{label}</span>;
    return (
      <Tooltip term={tip.term} definition={tip.definition} position="top">
        <span>{label}</span>
      </Tooltip>
    );
  };

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
                          <p className="text-sm font-medium text-slate-800">{renderLabel(asset.label)}</p>
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
                          <p className="text-sm font-medium text-slate-800">{renderLabel(asset.label)}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {asset.valueUSD > 0 ? formatUSD(asset.valueUSD) : '—'}
                      </span>
                    </div>
                  ))}
                  {/* Effective HP summary */}
                  <div className="mt-1 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <Tooltip term="Effective HP" definition="Your total active Hive Power = own HP + received delegations − delegated out. This is the voting weight you actually wield." position="top">
                        <p className="text-xs font-semibold text-violet-800">⚡ Effective HP</p>
                      </Tooltip>
                      <p className="text-[10px] text-violet-500 mt-0.5">
                        {balances.hivepower.toFixed(2)} own
                        {receivedDelegations > 0.01 ? ` + ${receivedDelegations.toFixed(2)} received` : ''}
                        {delegatedHpVal > 0.01 ? ` − ${delegatedHpVal.toFixed(2)} delegated` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-violet-700">{effectiveHp.toFixed(2)} HP</span>
                  </div>
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
                          <p className="text-sm font-medium text-slate-800">{renderLabel(asset.label)}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatUSD(asset.valueUSD)}</span>
                    </div>
                  ))}
                  <HbdSavingsWidget
                    savingsHbd={balances.savingsHbd}
                    liquidHbd={balances.hbd}
                    hbdPrice={hbdPrice}
                    apr={hbdApr}
                    lastInterestPayment={balances.savingsHbdLastInterestPayment}
                    interestHistory={interestHistory}
                    loadingHistory={loadingHistory}
                    onClaimInterest={onClaimInterest}
                  />
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
                <span className="font-semibold text-slate-800 text-sm">⚡ Pending Rewards</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSections.pending ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.pending && (
                <div className="px-4 pb-3 space-y-2">
                  {assets.filter(a => a.section === 'pending').map((asset, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${asset.color} border rounded-lg p-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className="text-slate-600">{asset.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{renderLabel(asset.label)}</p>
                          <p className="text-xs text-slate-600">{asset.amount.toFixed(2)} {asset.token}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatUSD(asset.valueUSD)}</span>
                    </div>
                  ))}
                  {onClaimRewards && (
                    <div className="pt-1 space-y-1.5">
                      <button
                        onClick={async () => {
                          setClaiming(true);
                          setClaimResult(null);
                          try {
                            await onClaimRewards();
                            setClaimResult({ ok: true, msg: 'Rewards claimed successfully!' });
                          } catch (e: any) {
                            setClaimResult({ ok: false, msg: e.message || 'Claim failed.' });
                          } finally {
                            setClaiming(false);
                          }
                        }}
                        disabled={claiming}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        {claiming ? <Loader size={13} className="animate-spin" /> : <Zap size={13} />}
                        {claiming ? 'Claiming…' : 'Claim All Rewards'}
                      </button>
                      {claimResult && (
                        <p className={`text-[11px] text-center font-medium ${claimResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                          {claimResult.msg}
                        </p>
                      )}
                    </div>
                  )}
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
