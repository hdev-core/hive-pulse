import React, { useState, useEffect, useCallback } from 'react';
import { Hourglass, Loader, X, Lock } from 'lucide-react';
import { AppSettings } from '../types';
import { fetchPowerDownStatus, PowerDownStatus } from '../utils/hiveHelpers';
import {
  fetchHiveEnginePendingUnstakes, HivePendingUnstake, heCancelUnstakeOp,
} from '../utils/hiveEngineHelpers';
import { broadcastKeychainOp } from '../utils/keychainHelpers';

interface UnstakingStatusProps {
  username: string;
  settings: AppSettings;
  onSuccess?: () => void;
  refreshKey?: number;
}

const fmtDate = (ms: number) => {
  if (!ms) return '—';
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 3 });

export const UnstakingStatus: React.FC<UnstakingStatusProps> = ({ username, settings, onSuccess, refreshKey }) => {
  const [powerDown, setPowerDown] = useState<PowerDownStatus | null>(null);
  const [unstakes, setUnstakes]   = useState<HivePendingUnstake[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busyId, setBusyId]       = useState<string | null>(null);  // 'hp' or a txID
  const [result, setResult]       = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pd, us] = await Promise.all([
      fetchPowerDownStatus(username, settings),
      fetchHiveEnginePendingUnstakes(username, settings.heRpcNode),
    ]);
    setPowerDown(pd);
    setUnstakes(us);
    setLoading(false);
  }, [username, settings.heRpcNode]);

  useEffect(() => { load(); }, [load]);

  // Re-pull after a signed action elsewhere in the wallet (e.g. a new unstake).
  useEffect(() => { if (refreshKey) load(); }, [refreshKey]);

  const cancelPowerDown = async () => {
    setBusyId('hp');
    setResult(null);
    const r = await broadcastKeychainOp(
      username,
      [['withdraw_vesting', { account: username, vesting_shares: '0.000000 VESTS' }]],
      'Active'
    );
    setBusyId(null);
    if (r.success) {
      setResult({ ok: true, msg: 'Power-down stopped.' });
      onSuccess?.();
      setTimeout(load, 3500);
    } else {
      setResult({ ok: false, msg: r.error || 'Failed to stop power-down.' });
    }
  };

  const cancelUnstake = async (u: HivePendingUnstake) => {
    setBusyId(u.txID);
    setResult(null);
    const r = await broadcastKeychainOp(username, [heCancelUnstakeOp(username, u.txID)], 'Active');
    setBusyId(null);
    if (r.success) {
      setResult({ ok: true, msg: `Cancelled ${u.symbol} unstake — ${fmtNum(u.quantityLeft)} returned to stake.` });
      onSuccess?.();
      setTimeout(load, 3500);
    } else {
      setResult({ ok: false, msg: r.error || 'Failed to cancel unstake.' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-center gap-2 text-slate-400">
        <Loader size={15} className="animate-spin" />
        <span className="text-xs">Checking for power-downs…</span>
      </div>
    );
  }

  const hasHp = !!powerDown?.active;
  if (!hasHp && unstakes.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 bg-amber-50/70">
        <Hourglass size={14} className="text-amber-600" />
        <span className="text-xs font-bold text-slate-800">Unstaking in Progress</span>
      </div>

      <div className="p-4 space-y-2.5">
        {/* HP power-down */}
        {hasHp && powerDown && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Hive Power down</p>
                  <p className="text-[11px] text-slate-500">
                    {fmtNum(powerDown.remainingHp)} HP left of {fmtNum(powerDown.totalHp)} · ~{fmtNum(powerDown.weeklyRateHp)} HP/wk · {powerDown.weeksLeft} wk left
                  </p>
                  <p className="text-[11px] text-slate-400">Next: {powerDown.nextDate ? fmtDate(new Date(powerDown.nextDate + 'Z').getTime()) : '—'}</p>
                </div>
              </div>
              <button
                onClick={cancelPowerDown}
                disabled={busyId !== null}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {busyId === 'hp' ? <Loader size={12} className="animate-spin" /> : <X size={12} />}
                Stop
              </button>
            </div>
          </div>
        )}

        {/* HE token unstakes */}
        {unstakes.map(u => (
          <div key={u.txID} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{u.symbol} unstake</p>
                <p className="text-[11px] text-slate-500">
                  {fmtNum(u.quantityLeft)} left of {fmtNum(u.quantity)} · {u.periodsLeft} payout{u.periodsLeft === 1 ? '' : 's'} left
                </p>
                <p className="text-[11px] text-slate-400">Next: {fmtDate(u.nextTimestamp)}</p>
              </div>
              <button
                onClick={() => cancelUnstake(u)}
                disabled={busyId !== null}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
              >
                {busyId === u.txID ? <Loader size={12} className="animate-spin" /> : <X size={12} />}
                Cancel
              </button>
            </div>
          </div>
        ))}

        {result && (
          <div className={`text-xs text-center font-medium py-2 px-3 rounded-lg ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {result.msg}
          </div>
        )}

        <p className="text-[10px] text-slate-400 italic">
          Cancelling returns the remaining amount to your staked balance. HP power-downs restart from scratch if you begin again.
        </p>
      </div>
    </div>
  );
};
