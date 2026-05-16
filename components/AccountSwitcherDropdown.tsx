import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, UserPlus } from 'lucide-react';
import { SavedAccount } from '../types';

interface AccountSwitcherDropdownProps {
  savedAccounts: SavedAccount[];
  activeUsername: string | null;
  onSwitch: (username: string) => void;
  onRemove: (username: string) => void;
  onAddAccount: () => void;
}

export const AccountSwitcherDropdown: React.FC<AccountSwitcherDropdownProps> = ({
  savedAccounts,
  activeUsername,
  onSwitch,
  onRemove,
  onAddAccount,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const displayName = activeUsername || savedAccounts[0]?.username || '';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-1.5 pl-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 max-w-[90px] truncate" title={displayName}>
            @{displayName}
          </span>
        </div>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[190px] overflow-hidden">
          <div className="py-1">
            {savedAccounts.map(account => {
              const isActive = account.username === activeUsername;
              return (
                <div
                  key={account.username}
                  className={`flex items-center gap-2 px-3 py-2 group ${isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                >
                  {isActive ? (
                    <Check size={13} className="text-blue-500 shrink-0" />
                  ) : (
                    <button
                      onClick={() => { onSwitch(account.username); setOpen(false); }}
                      className="w-[13px] shrink-0 flex items-center justify-center"
                      title={`Switch to @${account.username}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors" />
                    </button>
                  )}
                  <button
                    onClick={() => { if (!isActive) { onSwitch(account.username); setOpen(false); } }}
                    className={`flex-1 text-left text-xs font-semibold truncate ${isActive ? 'text-blue-700 cursor-default' : 'text-slate-700 hover:text-blue-600'}`}
                    disabled={isActive}
                  >
                    @{account.username}
                  </button>
                  <button
                    onClick={() => { onRemove(account.username); setOpen(false); }}
                    className="text-slate-300 hover:text-red-400 transition-colors p-0.5 rounded shrink-0"
                    title={`Remove @${account.username}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-100">
            <button
              onClick={() => { onAddAccount(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <UserPlus size={13} />
              Add Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
