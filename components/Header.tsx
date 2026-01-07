import React from 'react';
import { PanelRight, LogOut, LogIn } from 'lucide-react';

declare const chrome: any;

interface HeaderProps {
  username?: string | null;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ username, onLoginClick, onLogoutClick }) => {
  const openSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      chrome.windows.getCurrent((window: any) => {
         chrome.sidePanel.open({ windowId: window.id });
         // Optional: close popup if opening side panel
         // window.close(); 
      });
    } else {
      alert("Side Panel not supported in this browser version.");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
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
  );
};