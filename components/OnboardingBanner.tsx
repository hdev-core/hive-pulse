import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

declare const chrome: any;

const STORAGE_KEY = 'onboardingDismissed';

export const OnboardingBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEY], (result: any) => {
        if (!result[STORAGE_KEY]) setVisible(true);
      });
    } else {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEY]: true });
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  if (!visible) return null;

  return (
    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-300">
      <Sparkles size={15} className="text-blue-500 mt-0.5 shrink-0" />
      <div className="flex-1 text-slate-600">
        <span className="font-semibold text-blue-700">New to Hive?</span>{' '}
        Hover over the <span className="inline-flex items-center gap-0.5 font-semibold text-blue-600">? icons</span> next to terms like VP, RC, and HBD for quick explanations.
      </div>
      <button
        onClick={dismiss}
        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};
