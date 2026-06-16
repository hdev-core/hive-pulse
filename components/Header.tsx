import React from 'react';
import { PanelRight, LogOut, LogIn, ThumbsUp, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import { AccountStats, HivePrices, SavedAccount } from '../types';
import { Gauge } from './Gauge';
import { Tooltip } from './Tooltip';
import { AccountSwitcherDropdown } from './AccountSwitcherDropdown';

declare const chrome: any;

interface HeaderProps {
  username?: string | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  stats?: AccountStats | null;
  prices?: HivePrices;
  savedAccounts?: SavedAccount[];
  activeUsername?: string | null;
  onSwitchAccount?: (username: string) => void;
  onRemoveAccount?: (username: string) => void;
  onAddAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ username, onLoginClick, onLogoutClick, stats, prices, savedAccounts, activeUsername, onSwitchAccount, onRemoveAccount, onAddAccount }) => {
  const openSidePanel = () => {
    // Chrome: side panel API
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      chrome.windows.getCurrent((window: any) => {
         chrome.sidePanel.open({ windowId: window.id });
      });
      return;
    }
    // Firefox: sidebar action
    const ff = (globalThis as any).browser;
    if (ff?.sidebarAction) {
      ff.sidebarAction.toggle();
      return;
    }
    alert("Side panel not supported in this browser version.");
  };

  return (
    <div className="flex flex-col sticky top-0 z-20 shadow-sm bg-white">
        {/* Price Ticker Bar */}
        <div className="bg-slate-900 text-white px-4 py-1 flex items-center justify-between text-[10px] font-medium tracking-wide">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" title="HIVE Exchange Price (CoinGecko)">
                    <TrendingUp size={10} className="text-emerald-400" />
                    <span className="text-slate-400 uppercase">HIVE Market:</span>
                    <span>${prices?.exchange?.toFixed(3) || '---'}</span>
                </div>
                <div className="w-px h-2.5 bg-slate-700" />
                <div className="flex items-center gap-1.5" title="HIVE Internal Market Price (HBD)">
                    <BarChart3 size={10} className="text-blue-400" />
                    <span className="text-slate-400 uppercase">HIVE Internal:</span>
                    <span>${prices?.internal?.toFixed(3) || '---'}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-slate-500 uppercase font-bold tracking-tighter">Live</span>
            </div>
        </div>

        <header className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <img 
            src="/icon.png" 
            alt="HivePulse" 
            className="w-7 h-7 object-contain"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/icon.svg';
                target.onerror = null;
            }}
            />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">HivePulse</h1>
        </div>
        
        <div className="flex items-center gap-3">
            {username && savedAccounts && savedAccounts.length > 0 && onSwitchAccount && onRemoveAccount && onAddAccount ? (
                <AccountSwitcherDropdown
                    savedAccounts={savedAccounts}
                    activeUsername={activeUsername ?? null}
                    onSwitch={onSwitchAccount}
                    onRemove={onRemoveAccount}
                    onAddAccount={onAddAccount}
                />
            ) : username ? (
                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-full border border-slate-100">
                    <div className="flex items-center gap-1.5 pl-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate" title={username}>
                            @{username}
                        </span>
                    </div>
                    <button
                        onClick={onLogoutClick}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-all"
                        title="Logout"
                    >
                        <LogOut size={12} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={onLoginClick}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border border-blue-100"
                >
                    <LogIn size={14} />
                    <span>Login</span>
                </button>
            )}

            <button 
            onClick={openSidePanel} 
            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
            title="Open in Side Panel"
            >
            <PanelRight size={18} />
            </button>
        </div>
        </header>

        {/* Global Health Gauges (Status Deck) */}
        {stats && (
            <div className="flex items-center justify-around py-1.5 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Gauge
                        percentage={stats.vp.percentage}
                        isLow={stats.vp.isLow}
                        type="VP"
                        icon={<ThumbsUp size={10} className={stats.vp.isLow ? 'text-red-500' : 'text-slate-400'} />}
                        size={32}
                        strokeWidth={4}
                        showLabel={false}
                    />
                    <div className="flex flex-col">
                        <Tooltip
                            term="Voting Power (VP)"
                            definition="Your influence to upvote content and earn curation rewards. Depletes when you vote and regenerates to 100% over 5 days."
                            position="bottom"
                        >
                            <span className="text-[10px] font-bold text-slate-600">VP</span>
                        </Tooltip>
                        <span className="text-[10px] text-slate-400">{stats.vp.percentage.toFixed(0)}%</span>
                    </div>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div className="flex items-center gap-2">
                    <Gauge
                        percentage={stats.rc.percentage}
                        isLow={stats.rc.isLow}
                        type="RC"
                        icon={<Zap size={10} className={stats.rc.isLow ? 'text-red-500' : 'text-slate-400'} fill="currentColor" />}
                        size={32}
                        strokeWidth={4}
                        showLabel={false}
                    />
                    <div className="flex flex-col">
                        <Tooltip
                            term="Resource Credits (RC)"
                            definition="Required to post, comment, vote, and transact on Hive. Regenerates over 5 days. If critically low, wait before posting."
                            position="bottom"
                        >
                            <span className="text-[10px] font-bold text-slate-600">RC</span>
                        </Tooltip>
                        <span className="text-[10px] text-slate-400">{stats.rc.percentage.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};