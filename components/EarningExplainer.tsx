import React, { useState, useEffect } from 'react';
import { ChevronDown, FileText, ThumbsUp, PiggyBank, Shield, ExternalLink } from 'lucide-react';
import { fetchHbdInterestRate } from '../utils/hiveHelpers';

export const EarningExplainer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [hbdApr, setHbdApr] = useState<number | null>(null);

  useEffect(() => {
    if (!open || hbdApr !== null) return;
    fetchHbdInterestRate()
      .then(rate => { if (rate !== null) setHbdApr(rate); })
      .catch(() => {});
  }, [open]);

  const aprLabel = hbdApr !== null ? `${(hbdApr * 100).toFixed(1)}% APR` : 'Loading…';
  const aprDetail = hbdApr !== null
    ? `Move your HBD to the Savings account and earn ${(hbdApr * 100).toFixed(1)}% APR. Interest accrues continuously. There's a 3-day waiting period to withdraw. Rate is set by Hive witnesses and may change.`
    : `Move your HBD to the Savings account and earn interest (fetching current rate…). There's a 3-day waiting period to withdraw. Rate is set by Hive witnesses and may change.`;

  const CARDS = [
    {
      icon: <FileText size={18} />,
      title: 'Content Rewards',
      description: 'Post content and earn HIVE + HBD',
      detail: 'Publish posts or short-form content on any Hive frontend. Upvotes from the community allocate rewards from the Hive reward pool. Payouts happen 7 days after publishing.',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      learnUrl: 'https://hive.io',
    },
    {
      icon: <ThumbsUp size={18} />,
      title: 'Curation Rewards',
      description: 'Vote on posts and earn 50% of rewards',
      detail: "When you upvote a post, you earn a share of the curation reward pool — roughly 50% of the post's payout goes to curators. Voting earlier (within 24h) generally earns more.",
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      learnUrl: 'https://hive.io',
    },
    {
      icon: <PiggyBank size={18} />,
      title: `HBD Savings (${aprLabel})`,
      description: `Deposit HBD to savings and earn ${aprLabel}`,
      detail: aprDetail,
      color: 'bg-green-50 border-green-200 text-green-700',
      learnUrl: 'https://peakd.com/market',
    },
    {
      icon: <Shield size={18} />,
      title: 'Witness Voting',
      description: 'Vote for witnesses to secure the network',
      detail: 'Witnesses are the block producers who run the Hive network. You can vote for up to 30 witnesses. While not a direct income stream, it gives you governance influence.',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      learnUrl: 'https://hivescan.info/witnesses',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span className="text-sm font-semibold text-slate-800">How to Earn on Hive</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100 animate-in fade-in duration-200">
          {CARDS.map((card, i) => (
            <div key={i} className="px-4 py-3">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className={`p-1.5 rounded-lg border ${card.color}`}>
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                  <p className="text-xs text-slate-500 truncate">{card.description}</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 shrink-0 transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                />
              </button>
              {expanded === i && (
                <div className="mt-2 ml-10 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-xs text-slate-600 leading-relaxed">{card.detail}</p>
                  <a
                    href={card.learnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Learn more <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
