import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { RiskAssessment } from '../utils/scamShield';

interface ScamWarningProps {
  risk: RiskAssessment;
  /** Set once the user has explicitly accepted the risk. */
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}

/**
 * Inline Scam Shield banner. A `blocked` recipient is on Hive's canonical bad-actor list;
 * a `warn` recipient is a lookalike of an account the user trusts. Both are overridable —
 * it is the user's money and the list is a third-party feed — but only after an explicit,
 * deliberate opt-in, never by just clicking Send again.
 */
export const ScamWarning: React.FC<ScamWarningProps> = ({ risk, acknowledged, onAcknowledge }) => {
  if (risk.level === 'ok') return null;

  const blocked = risk.level === 'blocked';
  const tone = blocked
    ? { box: 'bg-red-50 border-red-300', title: 'text-red-800', body: 'text-red-700', accent: 'text-red-600' }
    : { box: 'bg-amber-50 border-amber-300', title: 'text-amber-900', body: 'text-amber-800', accent: 'text-amber-600' };

  return (
    <div className={`rounded-lg border p-3 ${tone.box}`}>
      <div className="flex gap-2">
        <span className={`shrink-0 mt-0.5 ${tone.accent}`}>
          {blocked ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-bold ${tone.title}`}>
            {blocked ? 'Known scam account' : 'Possible impersonation'}
          </p>
          <p className={`text-[11px] mt-0.5 leading-relaxed ${tone.body}`}>{risk.reason}</p>

          <label className={`flex items-center gap-1.5 mt-2 cursor-pointer ${tone.body}`}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => onAcknowledge(e.target.checked)}
              className="accent-red-600"
            />
            <span className="text-[11px] font-semibold">
              I know this account and want to send anyway
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
