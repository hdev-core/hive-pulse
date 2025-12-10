import React, { useEffect, useState } from 'react';
import { FRONTENDS } from './constants';
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { CurrentTabState, FrontendId, ActionMode } from './types';
import { FrontendCard } from './components/FrontendCard';
import { ArrowLeftRight, Activity, PenLine, Wallet, Link as LinkIcon, ExternalLink } from 'lucide-react';

// Declare chrome to avoid TypeScript errors when @types/chrome is not present
declare const chrome: any;

const App: React.FC = () => {
  const [tabState, setTabState] = useState<CurrentTabState>({
    url: '',
    isHiveUrl: false,
    detectedFrontendId: null,
    path: '/',
    username: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New State for Features
  const [actionMode, setActionMode] = useState<ActionMode>(ActionMode.SAME_PAGE);
  const [openInNewTab, setOpenInNewTab] = useState<boolean>(false);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          // Dev fallback
          const dummyUrl = 'https://peakd.com/@alice/hive-is-awesome';
          setTabState(parseUrl(dummyUrl));
          setLoading(false);
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url) {
          setTabState(parseUrl(tab.url));
        }
      } catch (error) {
        console.error("Error fetching tab:", error);
        setError("Could not read current tab.");
      } finally {
        setLoading(false);
      }
    };

    getCurrentTab();
  }, []);

  const handleSwitch = (targetId: FrontendId) => {
    const newUrl = getTargetUrl(targetId, tabState.path, actionMode, tabState.username);
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (openInNewTab) {
        chrome.tabs.create({ url: newUrl });
      } else {
        chrome.tabs.update({ url: newUrl });
        window.close();
      }
    } else {
      window.open(newUrl, '_blank');
    }
  };

  const detectedName = tabState.detectedFrontendId 
    ? FRONTENDS.find(f => f.id === tabState.detectedFrontendId)?.name 
    : 'Unknown';

  if (error) {
     return (
       <div className="flex items-center justify-center h-full p-6 text-center">
         <p className="text-red-500 font-medium text-sm">{error}</p>
       </div>
     );
  }

  return (
    <div className="flex flex-col min-h-[450px] bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-1.5 rounded-lg shadow-sm">
             <ArrowLeftRight size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Hive Switcher</h1>
        </div>
        
        {/* Settings Toggle */}
        <button 
          onClick={() => setOpenInNewTab(!openInNewTab)}
          className={`
            p-2 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium border
            ${openInNewTab 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }
          `}
          title="Open in new tab"
        >
          <ExternalLink size={14} />
          {openInNewTab ? 'New Tab' : 'Same Tab'}
        </button>
      </header>

      {/* Main Content */}
      <main className="p-4 flex-1 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
            <Activity className="text-slate-300 animate-spin" size={32} />
            <span className="text-sm font-medium text-slate-400">Detecting context...</span>
          </div>
        ) : (
          <>
            {/* Context Status */}
            <div className={`
              text-sm px-3 py-2 rounded-lg border flex items-center justify-between shadow-sm
              ${tabState.isHiveUrl 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-white border-slate-200 text-slate-600'
              }
            `}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${tabState.isHiveUrl ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-xs font-semibold">
                  {tabState.isHiveUrl ? `Detected: ${detectedName}` : 'No Hive frontend detected'}
                </span>
              </div>
              {tabState.username && (
                <span className="text-xs font-mono bg-white/50 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-100">
                  @{tabState.username}
                </span>
              )}
            </div>

            {/* Action Mode Segmented Control */}
            <div className="bg-slate-200/60 p-1 rounded-lg flex gap-1">
              <button
                onClick={() => setActionMode(ActionMode.SAME_PAGE)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all
                  ${actionMode === ActionMode.SAME_PAGE 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }
                `}
              >
                <LinkIcon size={14} />
                Link
              </button>
              <button
                onClick={() => setActionMode(ActionMode.WALLET)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all
                  ${actionMode === ActionMode.WALLET
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }
                `}
              >
                <Wallet size={14} />
                Wallet
              </button>
              <button
                onClick={() => setActionMode(ActionMode.COMPOSE)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all
                  ${actionMode === ActionMode.COMPOSE
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }
                `}
              >
                <PenLine size={14} />
                Post
              </button>
            </div>

            {/* Helper Text */}
            <div className="text-[10px] text-slate-400 text-center -mt-1 font-medium">
              {actionMode === ActionMode.SAME_PAGE && "Switch frontend, keep current page"}
              {actionMode === ActionMode.WALLET && `Go to ${tabState.username ? `@${tabState.username}'s` : "your"} wallet on...`}
              {actionMode === ActionMode.COMPOSE && "Open post editor on..."}
            </div>

            {/* Grid of Options */}
            <div className="flex flex-col gap-3 pb-2">
              {FRONTENDS.map((frontend) => (
                <FrontendCard 
                  key={frontend.id}
                  config={frontend}
                  isActive={tabState.detectedFrontendId === frontend.id && actionMode === ActionMode.SAME_PAGE}
                  onSwitch={handleSwitch}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="px-5 py-3 text-center border-t border-slate-200 bg-white text-[10px] text-slate-400 font-medium flex justify-between items-center">
        <span>Hive Frontend Switcher v1.1</span>
        <a href="#" className="hover:text-slate-600 transition-colors">Feedback</a>
      </footer>
    </div>
  );
};

export default App;