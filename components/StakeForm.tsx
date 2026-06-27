import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, PiggyBank, Download, Loader, AlertTriangle, Share2, CheckCircle, XCircle } from 'lucide-react';
import { AppSettings } from '../types';
import { fetchHpVestConversion, validateHiveAccount } from '../utils/hiveHelpers';
import { broadcastKeychainOp } from '../utils/keychainHelpers';

type Tab = 'powerup' | 'powerdown' | 'savings' | 'withdraw' | 'delegate';

interface StakeBalances {
  hive: number;
  hbd: number;
  hivepower: number;   // own HP (power-downable)
  savingsHive: number;
  savingsHbd: number;
}

interface StakeFormProps {
  username: string;
  balances: StakeBalances;
  settings: AppSettings;
  onSuccess?: () => void;
  focusSignal?: { tab?: Tab; nonce: number };
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'powerup',   label: 'Power Up',   icon: <ArrowUpCircle size={13} /> },
  { key: 'powerdown', label: 'Power Down', icon: <ArrowDownCircle size={13} /> },
  { key: 'delegate',  label: 'Delegate',   icon: <Share2 size={13} /> },
  { key: 'savings',   label: 'Savings',    icon: <PiggyBank size={13} /> },
  { key: 'withdraw',  label: 'Withdraw',   icon: <Download size={13} /> },
];

export const StakeForm: React.FC<StakeFormProps> = ({ username, balances, settings, onSuccess, focusSignal }) => {
  const [tab, setTab]           = useState<Tab>('powerup');
  const [amount, setAmount]     = useState('');
  const [memo, setMemo]         = useState('');
  const [recipient, setRecipient]     = useState('');
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [validating, setValidating]   = useState(false);
  const [savingsCur, setSavingsCur]   = useState<'HIVE' | 'HBD'>('HIVE');
  const [withdrawCur, setWithdrawCur] = useState<'HIVE' | 'HBD'>('HIVE');
  const [pdAck, setPdAck]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [vestsPerHive, setVestsPerHive] = useState<number | null>(null);

  useEffect(() => {
    fetchHpVestConversion(settings).then(c => { if (c) setVestsPerHive(c.vestsPerHive); });
  }, []);

  // Debounced recipient validation (delegate tab only)
  useEffect(() => {
    setRecipientValid(null);
    if (tab !== 'delegate' || !recipient.trim() || recipient.trim().length < 3) return;
    const t = setTimeout(async () => {
      setValidating(true);
      const clean = recipient.replace('@', '').trim().toLowerCase();
      const valid = await validateHiveAccount(clean, settings);
      setRecipientValid(valid);
      setValidating(false);
    }, 600);
    return () => clearTimeout(t);
  }, [recipient, tab]);

  const reset = () => { setAmount(''); setMemo(''); setPdAck(false); setRecipient(''); setRecipientValid(null); };
  const switchTab = (t: Tab) => { setTab(t); setResult(null); reset(); };

  // Jump to a specific tab when an asset-row pill is tapped (Power Up / Power Down / Delegate).
  useEffect(() => {
    if (focusSignal?.tab) switchTab(focusSignal.tab);
  }, [focusSignal?.nonce]);

  const finish = (ok: boolean, msg: string) => {
    setResult({ ok, msg });
    if (ok) { reset(); onSuccess?.(); }
    setBusy(false);
  };

  const parsed = parseFloat(amount);
  const liquidFor   = (c: 'HIVE' | 'HBD') => (c === 'HIVE' ? balances.hive : balances.hbd);
  const savingsFor  = (c: 'HIVE' | 'HBD') => (c === 'HIVE' ? balances.savingsHive : balances.savingsHbd);

  const broadcast = async (op: any[], successMsg: string) => {
    setBusy(true);
    setResult(null);
    const r = await broadcastKeychainOp(username, [op], 'Active');
    finish(r.success, r.success ? successMsg : (r.error || 'Transaction failed.'));
  };

  // ── Actions ────────────────────────────────────────────────
  const doPowerUp = () => {
    if (!parsed || parsed <= 0) return;
    if (parsed > balances.hive) return finish(false, 'Amount exceeds liquid HIVE.');
    broadcast(
      ['transfer_to_vesting', { from: username, to: username, amount: `${parsed.toFixed(3)} HIVE` }],
      `Powered up ${parsed.toFixed(3)} HIVE → HP`
    );
  };

  const doPowerDown = () => {
    if (!parsed || parsed <= 0) return;
    if (parsed > balances.hivepower) return finish(false, 'Amount exceeds your Hive Power.');
    if (!vestsPerHive) return finish(false, 'Conversion rate not loaded yet — try again in a moment.');
    const vests = parsed * vestsPerHive;
    broadcast(
      ['withdraw_vesting', { account: username, vesting_shares: `${vests.toFixed(6)} VESTS` }],
      `Power-down started: ${parsed.toFixed(3)} HP over ~13 weeks.`
    );
  };

  const stopPowerDown = () => {
    broadcast(
      ['withdraw_vesting', { account: username, vesting_shares: '0.000000 VESTS' }],
      'Power-down stopped.'
    );
  };

  const doSavings = () => {
    if (!parsed || parsed <= 0) return;
    if (parsed > liquidFor(savingsCur)) return finish(false, `Amount exceeds liquid ${savingsCur}.`);
    broadcast(
      ['transfer_to_savings', { from: username, to: username, amount: `${parsed.toFixed(3)} ${savingsCur}`, memo }],
      `Moved ${parsed.toFixed(3)} ${savingsCur} to savings.`
    );
  };

  const doWithdraw = () => {
    if (!parsed || parsed <= 0) return;
    if (parsed > savingsFor(withdrawCur)) return finish(false, `Amount exceeds savings ${withdrawCur}.`);
    const requestId = Math.floor(Date.now() % 2_000_000_000); // unique-enough uint32
    broadcast(
      ['transfer_from_savings', { from: username, request_id: requestId, to: username, amount: `${parsed.toFixed(3)} ${withdrawCur}`, memo }],
      `Withdrawal of ${parsed.toFixed(3)} ${withdrawCur} requested (3-day delay).`
    );
  };

  const doDelegate = () => {
    const clean = recipient.replace('@', '').trim().toLowerCase();
    if (!clean) return finish(false, 'Enter a recipient account.');
    if (recipientValid === false) return finish(false, 'Recipient account not found.');
    if (isNaN(parsed) || parsed < 0) return finish(false, 'Enter an amount (0 to remove a delegation).');
    if (parsed > balances.hivepower) return finish(false, 'Amount exceeds your Hive Power.');
    if (!vestsPerHive) return finish(false, 'Conversion rate not loaded yet — try again in a moment.');
    // delegate_vesting_shares takes an absolute target, not a delta. Delegating 0 removes it.
    const vests = parsed * vestsPerHive;
    broadcast(
      ['delegate_vesting_shares', { delegator: username, delegatee: clean, vesting_shares: `${vests.toFixed(6)} VESTS` }],
      parsed === 0 ? `Removed delegation to @${clean}.` : `Delegated ${parsed.toFixed(3)} HP to @${clean}.`
    );
  };

  // ── Shared field renderers ─────────────────────────────────
  const amountField = (max: number, unit: string, onMax?: () => void) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
      <input
        type="number" value={amount} onChange={e => setAmount(e.target.value)}
        placeholder="0.000" min="0.001" step="0.001"
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
      />
      <p className="text-[11px] text-slate-400 mt-1">
        Available: {max.toFixed(3)} {unit}
        <button type="button" onClick={() => setAmount(max.toFixed(3))} className="ml-2 text-blue-500 hover:underline font-semibold">Max</button>
      </p>
    </div>
  );

  const currencyToggle = (val: 'HIVE' | 'HBD', set: (c: 'HIVE' | 'HBD') => void) => (
    <div className="flex bg-slate-100 rounded-lg p-0.5">
      {(['HIVE', 'HBD'] as const).map(c => (
        <button key={c} type="button" onClick={() => set(c)}
          className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${val === c ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
          {c}
        </button>
      ))}
    </div>
  );

  const memoField = () => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">Memo <span className="font-normal text-slate-400">(optional)</span></label>
      <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="Add a note..."
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
    </div>
  );

  const submitBtn = (label: string, onClick: () => void, disabled: boolean, icon: React.ReactNode) => (
    <button type="button" onClick={onClick} disabled={busy || disabled}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
      {busy ? <Loader size={15} className="animate-spin" /> : icon}
      {busy ? 'Broadcasting…' : label}
    </button>
  );

  const resultBox = () => result && (
    <div className={`text-xs text-center font-medium py-2 px-3 rounded-lg ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      {result.msg}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {TABS.map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              tab === t.key ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.icon}<span className="leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Power Up */}
        {tab === 'powerup' && (<>
          <p className="text-xs text-slate-500">Stake liquid HIVE into Hive Power to boost your voting weight and curation rewards.</p>
          {amountField(balances.hive, 'HIVE')}
          {parsed > 0 && <p className="text-[11px] text-slate-400">≈ <span className="font-semibold text-violet-600">{parsed.toFixed(3)} HP</span> after power up</p>}
          {resultBox()}
          {submitBtn('Power Up', doPowerUp, !parsed || parsed <= 0, <ArrowUpCircle size={15} />)}
        </>)}

        {/* Power Down */}
        {tab === 'powerdown' && (<>
          <p className="text-xs text-slate-500">Unstake Hive Power back to liquid HIVE. Paid out in 13 equal weekly installments.</p>
          {amountField(balances.hivepower, 'HP')}
          {parsed > 0 && vestsPerHive && (
            <p className="text-[11px] text-slate-400">
              ≈ {(parsed * vestsPerHive).toFixed(6)} VESTS &nbsp;·&nbsp; ~{(parsed / 13).toFixed(3)} HP / week for 13 weeks
            </p>
          )}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">Power-down takes <strong>13 weeks</strong> to complete. You can stop it anytime below.</p>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
            <input type="checkbox" checked={pdAck} onChange={e => setPdAck(e.target.checked)} className="accent-blue-500 w-3.5 h-3.5" />
            I understand this takes 13 weeks.
          </label>
          {resultBox()}
          {submitBtn('Start Power Down', doPowerDown, !parsed || parsed <= 0 || !pdAck, <ArrowDownCircle size={15} />)}
          <button type="button" onClick={stopPowerDown} disabled={busy}
            className="w-full text-[11px] font-semibold text-slate-500 hover:text-red-500 disabled:opacity-50 transition-colors py-1">
            Stop an active power-down
          </button>
        </>)}

        {/* To Savings */}
        {tab === 'savings' && (<>
          <p className="text-xs text-slate-500">Move HIVE or HBD into savings. HBD in savings earns interest at the network APR.</p>
          {currencyToggle(savingsCur, setSavingsCur)}
          {amountField(liquidFor(savingsCur), savingsCur)}
          {memoField()}
          {resultBox()}
          {submitBtn('Move to Savings', doSavings, !parsed || parsed <= 0, <PiggyBank size={15} />)}
        </>)}

        {/* Withdraw from Savings */}
        {tab === 'withdraw' && (<>
          <p className="text-xs text-slate-500">Withdraw from savings back to your liquid balance.</p>
          {currencyToggle(withdrawCur, setWithdrawCur)}
          {amountField(savingsFor(withdrawCur), withdrawCur)}
          {memoField()}
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <AlertTriangle size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500">Savings withdrawals have a <strong>3-day</strong> security delay before the funds arrive.</p>
          </div>
          {resultBox()}
          {submitBtn('Request Withdrawal', doWithdraw, !parsed || parsed <= 0, <Download size={15} />)}
        </>)}

        {/* Delegate */}
        {tab === 'delegate' && (<>
          <p className="text-xs text-slate-500">Delegate Hive Power to another account to boost their voting weight. It stays yours — reclaim it anytime by removing the delegation.</p>
          {/* Recipient */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Delegate to</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input
                type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder="hive-username"
                className="w-full pl-7 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {validating && <Loader size={14} className="animate-spin text-slate-400" />}
                {!validating && recipientValid === true  && <CheckCircle size={14} className="text-green-500" />}
                {!validating && recipientValid === false && <XCircle size={14} className="text-red-400" />}
              </span>
            </div>
            {recipientValid === false && <p className="text-[11px] text-red-400 mt-1">Account not found on Hive</p>}
          </div>
          {amountField(balances.hivepower, 'HP')}
          {parsed > 0 && vestsPerHive && (
            <p className="text-[11px] text-slate-400">≈ {(parsed * vestsPerHive).toFixed(6)} VESTS delegated</p>
          )}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <Share2 size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700">Delegating sets a new <strong>total</strong> for this account (not additive). Enter <strong>0</strong> to remove an existing delegation — funds return after a 5-day cooldown.</p>
          </div>
          {resultBox()}
          {submitBtn(parsed === 0 ? 'Remove Delegation' : 'Delegate HP', doDelegate, !recipient.trim() || isNaN(parsed) || parsed < 0 || recipientValid === false, <Share2 size={15} />)}
        </>)}
      </div>
    </div>
  );
};
