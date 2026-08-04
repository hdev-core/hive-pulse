import React from 'react';
import { ShieldAlert, AlertTriangle, Eye } from 'lucide-react';
import { RiskAssessment } from '../utils/scamShield';

interface ScamWarningProps {
  risk: RiskAssessment;
  /** Set once the user has explicitly accepted the risk. */
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}

const TITLE: Record<string, string> = {
  scam: 'Known scam account',
  impersonation: 'Possible impersonation',
  watchlist: 'On a Hive watchlist',
};

/**
 * Inline Scam Shield banner. Three kinds, two severities:
 *   scam          -> red, blocked, on the phishing/fund-theft list.
 *   impersonation -> amber, a lookalike of an account you trust.
 *   watchlist     -> amber, flagged by HiveWatchers for abuse (not confirmed fund theft).
 * All overridable — it is the user's money and these are third-party feeds — but only after
 * an explicit, deliberate opt-in, never by just clicking Send again.
 */
export const ScamWarning: React.FC<ScamWarningProps> = ({ risk, acknowledged, onAcknowledge }) => {
  if (risk.level === 'ok') return null;

  const blocked = risk.level === 'blocked';
  const tone = blocked
    ? { box: 'bg-red-50 border-red-300', title: 'text-red-800', body: 'text-red-700', accent: 'text-red-600' }
    : { box: 'bg-amber-50 border-amber-300', title: 'text-amber-900', body: 'text-amber-800', accent: 'text-amber-600' };

  const icon = risk.kind === 'scam'
    ? <ShieldAlert size={16} />
    : risk.kind === 'watchlist'
      ? <Eye size={16} />
      : <AlertTriangle size={16} />;

  // A watchlist flag is not a scam, so the accept-language is softer than for a known drainer.
  const acceptLabel = risk.kind === 'watchlist'
    ? 'I understand — send anyway'
    : 'I know this account and want to send anyway';

  return (
    <div className={`rounded-lg border p-3 ${tone.box}`}>
      <div className="flex gap-2">
        <span className={`shrink-0 mt-0.5 ${tone.accent}`}>{icon}</span>
        <div className="min-w-0">
          <p className={`text-xs font-bold ${tone.title}`}>{TITLE[risk.kind] ?? 'Warning'}</p>
          <p className={`text-[11px] mt-0.5 leading-relaxed ${tone.body}`}>{risk.reason}</p>

          <label className={`flex items-center gap-1.5 mt-2 cursor-pointer ${tone.body}`}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => onAcknowledge(e.target.checked)}
              className={blocked ? 'accent-red-600' : 'accent-amber-600'}
            />
            <span className="text-[11px] font-semibold">{acceptLabel}</span>
          </label>
        </div>
      </div>
    </div>
  );
};
