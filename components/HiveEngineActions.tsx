import React, { useState, useEffect, useCallback } from 'react';
import { Send, ArrowUpCircle, ArrowDownCircle, Loader, CheckCircle, XCircle, Gamepad2 } from 'lucide-react';
import { AppSettings } from '../types';
import { validateHiveAccount } from '../utils/hiveHelpers';
import {
  fetchHiveEngineHoldings, HiveEngineHolding,
  heTransferOp, heStakeOp, heUnstakeOp,
} from '../utils/hiveEngineHelpers';
import { broadcastKeychainOp } from '../utils/keychainHelpers';
import { assessRecipient, RiskAssessment, riskToastMessage } from '../utils/scamShield';
import { ScamWarning } from './ScamWarning';

type Tab = 'send' | 'stake' | 'unstake';

interface HiveEngineActionsProps {
  username: string;
  settings: AppSettings;
  onSuccess?: () => void;
  focusSignal?: { tab?: Tab; symbol?: string; nonce: number };
  refreshKey?: number;
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'send',    label: 'Send',    icon: <Send size={13} /> },
  { key: 'stake',   label: 'Stake',   icon: <ArrowUpCircle size={13} /> },
  { key: 'unstake', label: 'Unstake', icon: <ArrowDownCircle size={13} /> },
];

export const HiveEngineActions: React.FC<HiveEngineActionsProps> = ({ username, settings, onSuccess, focusSignal, refreshKey }) => {
  const [holdings, setHoldings] = useState<HiveEngineHolding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [symbol, setSymbol]     = useState('');
  const [tab, setTab]           = useState<Tab>('send');
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);

  const [amount, setAmount]     = useState('');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo]         = useState('');
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; msg: string } | null>(null);

  const loadHoldings = useCallback(async () => {
    setLoading(true);
    const h = await fetchHiveEngineHoldings(username, settings.heRpcNode);
    setHoldings(h);
    setSymbol(prev => (prev && h.some(t => t.symbol === prev)) ? prev : (h[0]?.symbol || ''));
    setLoading(false);
  }, [username, settings.heRpcNode]);

  useEffect(() => { loadHoldings(); }, [loadHoldings]);

  // Re-pull holdings after a signed action elsewhere in the wallet.
  useEffect(() => { if (refreshKey) loadHoldings(); }, [refreshKey]);

  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  // Debounced recipient validation (send tab only)
  useEffect(() => {
    setRecipientValid(null);
    setRisk(null);
    setRiskAcknowledged(false);
    if (tab !== 'send' || !recipient.trim() || recipient.trim().length < 3) return;

    // Local + synchronous: flag the risk immediately rather than after the network check.
    setRisk(assessRecipient(recipient, [username]));

    const t = setTimeout(async () => {
      setValidating(true);
      const valid = await validateHiveAccount(recipient.replace('@', '').trim().toLowerCase(), settings);
      setRecipientValid(valid);
      setValidating(false);
    }, 600);
    return () => clearTimeout(t);
  }, [recipient, tab, username]);

  const selected = holdings.find(h => h.symbol === symbol);
  const parsed = parseFloat(amount);
  const max = !selected ? 0 : (tab === 'unstake' ? selected.stake : selected.balance);

  const reset = () => { setAmount(''); setRecipient(''); setMemo(''); setRecipientValid(null); };
  const switchTab = (t: Tab) => { setTab(t); setResult(null); reset(); };

  // Preselect tab + token when an asset-row pill is tapped. Holdings may still be
  // loading, so defer the symbol until it's actually available.
  useEffect(() => {
    if (!focusSignal) return;
    if (focusSignal.tab) switchTab(focusSignal.tab);
    if (focusSignal.symbol) setPendingSymbol(focusSignal.symbol);
  }, [focusSignal?.nonce]);

  useEffect(() => {
    if (pendingSymbol && holdings.some(h => h.symbol === pendingSymbol)) {
      setSymbol(pendingSymbol);
      setPendingSymbol(null);
    }
  }, [pendingSymbol, holdings]);

  // If the selected token doesn't support the current tab (e.g. picked a
  // non-stakeable token while on Stake), fall back to Send.
  useEffect(() => {
    const sel = holdings.find(h => h.symbol === symbol);
    if (!sel) return;
    if (tab === 'stake' && !sel.stakingEnabled) setTab('send');
    if (tab === 'unstake' && !(sel.stake > 0)) setTab('send');
  }, [symbol, holdings]);

  const submit = async () => {
    if (!selected) return;
    if (isNaN(parsed) || parsed <= 0) return setResult({ ok: false, msg: 'Enter a valid amount.' });
    if (parsed > max) return setResult({ ok: false, msg: `Amount exceeds available ${selected.symbol}.` });

    const quantity = parsed.toFixed(selected.precision);
    let op: any[];
    let successMsg: string;

    if (tab === 'send') {
      const to = recipient.replace('@', '').trim().toLowerCase();
      if (!to) return setResult({ ok: false, msg: 'Enter a recipient account.' });
      if (recipientValid === false) return setResult({ ok: false, msg: 'Recipient account not found.' });

      // Scam Shield: HE tokens are just as drainable as HIVE.
      const currentRisk = assessRecipient(to, [username]);
      if (currentRisk.level !== 'ok' && !riskAcknowledged) {
        setRisk(currentRisk);
        return setResult({ ok: false, msg: riskToastMessage(currentRisk) });
      }

      op = heTransferOp(username, selected.symbol, to, quantity, memo);
      successMsg = `Sent ${quantity} ${selected.symbol} to @${to}.`;
    } else if (tab === 'stake') {
      op = heStakeOp(username, selected.symbol, quantity);
      successMsg = `Staked ${quantity} ${selected.symbol}.`;
    } else {
      op = heUnstakeOp(username, selected.symbol, quantity);
      successMsg = `Unstake of ${quantity} ${selected.symbol} started.`;
    }

    setBusy(true);
    setResult(null);
    const r = await broadcastKeychainOp(username, [op], 'Active', { acknowledgedRisk: riskAcknowledged });
    setBusy(false);
    if (r.success) {
      setResult({ ok: true, msg: successMsg });
      reset();
      onSuccess?.();
      // Refresh holdings so the available maxes reflect the new state (node lags a moment).
      setTimeout(() => { loadHoldings(); }, 3500);
    } else {
      setResult({ ok: false, msg: r.error || 'Transaction failed.' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center gap-2 text-slate-400">
        <Loader size={15} className="animate-spin" />
        <span className="text-xs">Loading Hive-Engine tokens…</span>
      </div>
    );
  }
  if (holdings.length === 0) return null;

  const submitLabel = tab === 'send' ? 'Send Token' : tab === 'stake' ? 'Stake Token' : 'Unstake Token';
  const submitDisabled = busy || !selected || isNaN(parsed) || parsed <= 0 ||
    (tab === 'send' && (!recipient.trim() || recipientValid === false));

  // Only show actions the selected token actually supports.
  const visibleTabs = TABS.filter(t =>
    t.key === 'send' ||
    (t.key === 'stake' && !!selected?.stakingEnabled) ||
    (t.key === 'unstake' && (selected?.stake ?? 0) > 0)
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-purple-50/50">
        <Gamepad2 size={14} className="text-purple-600" />
        <span className="text-xs font-bold text-slate-800">Hive-Engine Tokens</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.key ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Token selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Token</label>
          <select
            value={symbol}
            onChange={e => { setSymbol(e.target.value); setAmount(''); setResult(null); }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          >
            {holdings.map(h => (
              <option key={h.symbol} value={h.symbol}>
                {h.symbol} — {(tab === 'unstake' ? h.stake : h.balance).toFixed(Math.min(h.precision, 4))} available
              </option>
            ))}
          </select>
        </div>

        {/* Recipient (send only) */}
        {tab === 'send' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Recipient</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="hive-username"
                className="w-full pl-7 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {validating && <Loader size={14} className="animate-spin text-slate-400" />}
                {!validating && recipientValid === true  && <CheckCircle size={14} className="text-green-500" />}
                {!validating && recipientValid === false && <XCircle size={14} className="text-red-400" />}
              </span>
            </div>
            {recipientValid === false && <p className="text-[11px] text-red-400 mt-1">Account not found on Hive</p>}
            {risk && (
              <div className="mt-2">
                <ScamWarning risk={risk} acknowledged={riskAcknowledged} onAcknowledge={setRiskAcknowledged} />
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.000" min="0" step="any"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
          <p className="text-[11px] text-slate-400 mt-1">
            {tab === 'unstake' ? 'Staked' : 'Available'}: {max.toFixed(Math.min(selected?.precision ?? 3, 6))} {symbol}
            <button type="button" onClick={() => setAmount(String(max))} className="ml-2 text-purple-500 hover:underline font-semibold">Max</button>
          </p>
        </div>

        {/* Memo (send only) */}
        {tab === 'send' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Memo <span className="font-normal text-slate-400">(optional)</span></label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Add a note..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
          </div>
        )}

        {tab === 'unstake' && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            Unstaking has a cooldown set by each token (often days to weeks) before tokens become liquid.
          </p>
        )}

        {result && (
          <div className={`text-xs text-center font-medium py-2 px-3 rounded-lg ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {result.msg}
          </div>
        )}

        <button type="button" onClick={submit} disabled={submitDisabled}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
          {busy ? <Loader size={15} className="animate-spin" /> : TABS.find(t => t.key === tab)?.icon}
          {busy ? 'Broadcasting…' : submitLabel}
        </button>
      </div>
    </div>
  );
};
