import React from 'react';
import { PanelRight, LogOut, LogIn, ThumbsUp, Zap } from 'lucide-react';
import { AccountStats } from '../types';
import { Gauge } from './Gauge';

declare const chrome: any;

interface HeaderProps {
  username?: string | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
  stats?: AccountStats | null;
}

export const Header: React.FC<HeaderProps> = ({ username, onLoginClick, onLogoutClick, stats }) => {
  const openSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      chrome.windows.getCurrent((window: any) => {
         chrome.sidePanel.open({ windowId: window.id });
      });
    } else {
      alert("Side Panel not supported in this browser version.");
    }
  };

  return (
    <div className="flex flex-col sticky top-0 z-20 shadow-sm bg-white">
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
            {username ? (
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
                <div className="flex items-center gap-2" title="Voting Power">
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
                        <span className="text-[10px] font-bold text-slate-600">VP</span>
                        <span className="text-[10px] text-slate-400">{stats.vp.percentage.toFixed(0)}%</span>
                    </div>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div className="flex items-center gap-2" title="Resource Credits">
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
                        <span className="text-[10px] font-bold text-slate-600">RC</span>
                        <span className="text-[10px] text-slate-400">{stats.rc.percentage.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};