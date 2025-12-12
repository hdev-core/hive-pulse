import React from 'react';
import { PanelRight } from 'lucide-react';

declare const chrome: any;

export const Header: React.FC = () => {
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
    <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-2.5">
        <img 
          src="/icon.png" 
          alt="HivePulse" 
          className="w-8 h-8 object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/icon.svg';
            target.onerror = null;
          }}
        />
        <h1 className="text-lg font-bold tracking-tight text-slate-900">HivePulse</h1>
      </div>
      <button 
         onClick={openSidePanel} 
         className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
         title="Open in Side Panel"
      >
         <PanelRight size={18} />
      </button>
    </header>
  );
};