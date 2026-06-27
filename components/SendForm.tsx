import React, { useState, useEffect, useCallback } from 'react';
import { Send, QrCode, History, ArrowRight, ArrowLeft, Loader, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { AppSettings, TransferRecord } from '../types';
import { validateHiveAccount, fetchTransferHistory } from '../utils/hiveHelpers';
import { requestKeychainTransfer } from '../utils/keychainHelpers';

type Tab = 'send' | 'receive' | 'history';

interface SendFormProps {
  username: string;
  balances: { hive: number; hbd: number };
  settings: AppSettings;
  onSuccess?: () => void;
  focusSignal?: { currency?: 'HIVE' | 'HBD'; nonce: number };
}

export const SendForm: React.FC<SendFormProps> = ({ username, balances, settings, onSuccess, focusSignal }) => {
  const [tab, setTab] = useState<Tab>('send');

  // Send state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'HIVE' | 'HBD'>('HIVE');
  const [memo, setMemo] = useState('');
  const [validating, setValidating] = useState(false);
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // History state
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  // Validate recipient with debounce
  useEffect(() => {
    setRecipientValid(null);
    if (!recipient.trim() || recipient.trim().length < 3) return;
    const t = setTimeout(async () => {
      setValidating(true);
      const clean = recipient.replace('@', '').trim().toLowerCase();
      const valid = await validateHiveAccount(clean, settings);
      setRecipientValid(valid);
      setValidating(false);
    }, 600);
    return () => clearTimeout(t);
  }, [recipient]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    setNextCursor(null);
    try {
      const { records, nextCursor: cursor } = await fetchTransferHistory(username, settings);
      setHistory(records);
      setNextCursor(cursor);
    } catch (e: any) {
      setHistoryError(e?.message || 'Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  }, [username]);

  const loadMore = useCallback(async () => {
    if (nextCursor === null) return;
    setLoadingMore(true);
    try {
      const { records, nextCursor: cursor } = await fetchTransferHistory(username, settings, nextCursor);
      setHistory(prev => [...prev, ...records]);
      setNextCursor(cursor);
    } catch (e: any) {
      setHistoryError(e?.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [username, nextCursor]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  // Jump to the Send tab and preselect a currency when an asset-row pill is tapped.
  useEffect(() => {
    if (!focusSignal) return;
    setTab('send');
    setSendResult(null);
    if (focusSignal.currency) setCurrency(focusSignal.currency);
  }, [focusSignal?.nonce]);

  const availableBalance = currency === 'HIVE' ? balances.hive : balances.hbd;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendResult(null);
    const clean = recipient.replace('@', '').trim().toLowerCase();
    const parsed = parseFloat(amount);
    if (!clean || !parsed || parsed <= 0) return;
    if (parsed > availableBalance) {
      setSendResult({ ok: false, msg: 'Amount exceeds available balance.' });
      return;
    }
    setSending(true);
    const formattedAmount = parsed.toFixed(3);
    const result = await requestKeychainTransfer(username, clean, formattedAmount, memo, currency);
    setSendResult({ ok: result.success, msg: result.success ? `Sent ${formattedAmount} ${currency} to @${clean}` : (result.error || 'Transfer failed.') });
    if (result.success) {
      setRecipient('');
      setAmount('');
      setMemo('');
      if (onSuccess) onSuccess();
    }
    setSending(false);
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'send',    label: 'Send',    icon: <Send size={13} /> },
    { key: 'receive', label: 'Receive', icon: <QrCode size={13} /> },
    { key: 'history', label: 'History', icon: <History size={13} /> },
  ];

  const formatDate = (ts: string) => {
    const d = new Date(ts + 'Z');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSendResult(null); setHistoryError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Send tab */}
      {tab === 'send' && (
        <form onSubmit={handleSend} className="p-4 space-y-3">
          {/* Recipient */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Recipient</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input
                type="text"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
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

          {/* Amount + Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.000"
                min="0.001"
                step="0.001"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {(['HIVE', 'HBD'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${currency === c ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Available: {availableBalance.toFixed(3)} {currency}
              <button type="button" onClick={() => setAmount(availableBalance.toFixed(3))} className="ml-2 text-blue-500 hover:underline font-semibold">Max</button>
            </p>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Memo <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="Add a note..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {sendResult && (
            <div className={`text-xs text-center font-medium py-2 px-3 rounded-lg ${sendResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {sendResult.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || !recipient.trim() || !amount || recipientValid === false}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {sending ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Sending…' : `Send ${currency}`}
          </button>
        </form>
      )}

      {/* Receive tab */}
      {tab === 'receive' && (
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center w-full">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-semibold">Your Hive address</p>
            <p className="text-xl font-bold text-slate-800">@{username}</p>
          </div>
          <p className="text-xs text-slate-500 text-center">
            Share your username with anyone to receive HIVE or HBD. Hive accounts are human-readable — there are no long wallet addresses.
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(username)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
          >
            Copy username
          </button>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-600">Recent transfers</span>
            <button onClick={loadHistory} disabled={loadingHistory} className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
              <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>
          {loadingHistory ? (
            <div className="py-8 flex justify-center"><Loader size={20} className="animate-spin text-slate-300" /></div>
          ) : historyError ? (
            <div className="py-6 px-4 text-center text-xs text-red-500 bg-red-50 rounded-lg m-4 border border-red-100 break-all">{historyError}</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No transfers found</div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
              {history.map((tx, i) => {
                const isOut = tx.from === username;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className={`p-1.5 rounded-full ${isOut ? 'bg-red-50' : 'bg-green-50'}`}>
                      {isOut
                        ? <ArrowRight size={13} className="text-red-500" />
                        : <ArrowLeft size={13} className="text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {isOut ? `To @${tx.to}` : `From @${tx.from}`}
                      </p>
                      {tx.memo && <p className="text-[10px] text-slate-400 truncate italic">"{tx.memo}"</p>}
                      <p className="text-[10px] text-slate-400">{formatDate(tx.timestamp)}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${isOut ? 'text-red-500' : 'text-green-600'}`}>
                      {isOut ? '-' : '+'}{tx.amount}
                    </span>
                  </div>
                );
              })}
              {nextCursor !== null && (
                <div className="px-4 py-3 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
