import React, { useEffect, useState } from 'react';
import { FRONTENDS, DAPPS } from './constants';
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats, formatRCNumber } from './utils/hiveHelpers';
import { CurrentTabState, FrontendId, ActionMode, AppSettings, AccountStats, AppView } from './types';
import { FrontendCard } from './components/FrontendCard';
import { FrontendIcon } from './components/FrontendIcon';
import { 
  ArrowLeftRight, Activity, PenLine, Wallet, Link as LinkIcon, 
  ExternalLink, Settings, Share2, Grid, Check, Copy, Info, 
  Sword, Coins, ShoppingCart, Video, Gamepad2, Vote,
  MessageCircle, MonitorPlay, Plane, Palette, Music, Zap, Search,
  Gauge, ThumbsUp
} from 'lucide-react';

// Declare chrome to avoid TypeScript errors
declare const chrome: any;

const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  rcUser: '',
  badgeMetric: 'VP'
};

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>(AppView.SWITCHER);
  
  // Data State
  const [tabState, setTabState] = useState<CurrentTabState>({
    url: '',
    isHiveUrl: false,
    detectedFrontendId: null,
    path: '/',
    username: null
  });
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Switcher UI State
  const [actionMode, setActionMode] = useState<ActionMode>(ActionMode.SAME_PAGE);

  // Stats Watcher State
  const [statsUsername, setStatsUsername] = useState<string>('');
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Load Settings
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const stored = await chrome.storage.local.get(['settings']);
          if (stored.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...stored.settings });
            
            // Pre-fill stats username and Fetch Stats Immediately if user exists
            if (stored.settings.rcUser) {
              setStatsUsername(stored.settings.rcUser);
              fetchAccountStats(stored.settings.rcUser).then(data => {
                if (data) setAccountStats(data);
              });
            }
          }
        }

        // 2. Load Current Tab
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          // Dev fallback
          const dummyUrl = 'https://peakd.com/@alice/hive-is-awesome';
          const parsed = parseUrl(dummyUrl);
          setTabState(parsed);
          // If no saved user, default to tab user in dev mode
          setStatsUsername(prev => prev || parsed.username || 'alice');
          setLoading(false);
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
          const parsed = parseUrl(tab.url);
          setTabState(parsed);
          
          // If no saved user in settings, but we are on a user profile, suggest that user
          setStatsUsername(prev => {
            if (prev) return prev; // Keep saved user if exists
            return parsed.username || '';
          });
        }
      } catch (error) {
        console.error("Error initializing:", error);
        setError("Could not read extension state.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Save Settings Helper
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ settings: updated });
    }
  };

  // Update badge helper
  const updateBadgeFromData = (data: AccountStats, metric: 'RC' | 'VP') => {
    if (typeof chrome !== 'undefined' && chrome.action) {
       const percent = metric === 'RC' ? data.rc.percentage : data.vp.percentage;
       const rounded = Math.round(percent);
       chrome.action.setBadgeText({ text: `${rounded}%` });
       
       let color = '#22c55e';
       if (rounded < 20) color = '#ef4444'; 
       else if (rounded < 50) color = '#f97316';
       chrome.action.setBadgeBackgroundColor({ color });
    }
  };

  // Stats Fetcher
  const handleCheckStats = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!statsUsername) return;

    setLoadingStats(true);
    setStatsError(null);
    try {
      const cleanUsername = statsUsername.replace('@', '').trim();
      const data = await fetchAccountStats(cleanUsername);
      if (data) {
        setAccountStats(data);
        // Save the successfully fetched user as the default for next time
        updateSettings({ rcUser: data.username });

        // Update badge immediately based on current preference
        updateBadgeFromData(data, settings.badgeMetric);
      } else {
        setStatsError('Account not found');
      }
    } catch (err) {
      setStatsError('Failed to fetch data');
    } finally {
      setLoadingStats(false);
    }
  };

  // Auto-fetch Stats when switching to view if username exists and no data loaded yet
  useEffect(() => {
    if (currentView === AppView.STATS && statsUsername && !accountStats && !loadingStats && !statsError) {
      handleCheckStats();
    }
  }, [currentView]);

  // If user toggles badge metric in UI, update badge immediately if data is present
  useEffect(() => {
    if (accountStats) {
      updateBadgeFromData(accountStats, settings.badgeMetric);
    }
  }, [settings.badgeMetric]);

  const handleSwitch = (targetId: FrontendId) => {
    const newUrl = getTargetUrl(targetId, tabState.path, actionMode, tabState.username);
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (settings.openInNewTab) {
        chrome.tabs.create({ url: newUrl });
      } else {
        chrome.tabs.update({ url: newUrl });
        window.close();
      }
    } else {
      window.open(newUrl, '_blank');
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 1500);
  };

  const detectedName = tabState.detectedFrontendId 
    ? FRONTENDS.find(f => f.id === tabState.detectedFrontendId)?.name 
    : 'Unknown';

  // --- RENDER HELPERS ---

  const renderGauge = (percentage: number, isLow: boolean, label: string, icon: React.ReactNode, subValue?: string) => (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28 flex items-center justify-center mb-2">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="8" fill="none" />
          {/* Progress Circle */}
          <circle
            cx="56" cy="56" r="48"
            stroke={isLow ? '#ef4444' : percentage > 50 ? '#10b981' : '#f59e0b'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 301.6, // 2 * pi * 48
              strokeDashoffset: 301.6 - (301.6 * percentage) / 100,
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          {icon}
          <span className="text-xl font-bold text-slate-800 mt-1">{percentage.toFixed(2)}%</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</span>
      {subValue && <span className="text-[10px] text-slate-400 mt-0.5">{subValue}</span>}
    </div>
  );

  const renderDAppIcon = (name: string) => {
    const props = { size: 20, className: "text-slate-600" };
    switch(name) {
      case 'Sword': return <Sword {...props} />;
      case 'Coins': return <Coins {...props} />;
      case 'ShoppingCart': return <ShoppingCart {...props} />;
      case 'Video': return <Video {...props} />;
      case 'Gamepad2': return <Gamepad2 {...props} />;
      case 'Vote': return <Vote {...props} />;
      case 'MessageCircle': return <MessageCircle {...props} />;
      case 'MonitorPlay': return <MonitorPlay {...props} />;
      case 'Plane': return <Plane {...props} />;
      case 'Activity': return <Activity {...props} />;
      case 'Palette': return <Palette {...props} />;
      case 'Music': return <Music {...props} />;
      default: return <ExternalLink {...props} />;
    }
  };

  if (error) {
     return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-[500px] w-full bg-slate-50 text-slate-800 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-1.5 rounded-lg shadow-sm">
             <ArrowLeftRight size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">HiveKit</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Activity className="text-slate-300 animate-spin" size={32} />
          </div>
        ) : (
          <div className="p-4 pb-20">
            
            {/* --- VIEW: SWITCHER (HOME) --- */}
            {currentView === AppView.SWITCHER && (
              <div className="flex flex-col gap-4">
                 
                 {/* Mini Stats View */}
                 {accountStats && (
                    <div className="grid grid-cols-2 gap-2">
                       {/* VP Mini */}
                       <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                           <ThumbsUp size={16} className={accountStats.vp.isLow ? "text-red-500" : "text-slate-600"} />
                           <div className="flex flex-col leading-none">
                              <span className="text-xs font-bold text-slate-800">{accountStats.vp.percentage.toFixed(0)}%</span>
                              <span className="text-[10px] text-slate-400 font-medium">Voting Power</span>
                           </div>
                       </div>
                       {/* RC Mini */}
                       <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                           <Zap size={16} className={accountStats.rc.isLow ? "text-red-500" : "text-slate-600"} fill="currentColor" />
                           <div className="flex flex-col leading-none">
                              <span className="text-xs font-bold text-slate-800">{accountStats.rc.percentage.toFixed(0)}%</span>
                              <span className="text-[10px] text-slate-400 font-medium">Resource Credits</span>
                           </div>
                       </div>
                    </div>
                 )}

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
                      {tabState.isHiveUrl ? `On ${detectedName}` : 'No Hive frontend detected'}
                    </span>
                  </div>
                  {tabState.username && (
                    <span className="text-xs font-mono bg-white/50 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-100">
                      @{tabState.username}
                    </span>
                  )}
                </div>

                {/* Action Mode Control */}
                <div className="bg-slate-200/60 p-1 rounded-lg flex gap-1">
                  {[
                    { mode: ActionMode.SAME_PAGE, icon: LinkIcon, label: 'Link' },
                    { mode: ActionMode.WALLET, icon: Wallet, label: 'Wallet' },
                    { mode: ActionMode.COMPOSE, icon: PenLine, label: 'Post' }
                  ].map((item) => (
                    <button
                      key={item.mode}
                      onClick={() => setActionMode(item.mode)}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all
                        ${actionMode === item.mode 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }
                      `}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Frontend List */}
                <div className="flex flex-col gap-2">
                  {FRONTENDS.map((frontend) => (
                    <FrontendCard 
                      key={frontend.id}
                      config={frontend}
                      isActive={tabState.detectedFrontendId === frontend.id && actionMode === ActionMode.SAME_PAGE}
                      onSwitch={handleSwitch}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* --- VIEW: SHARE (COPY LINKS) --- */}
            {currentView === AppView.SHARE && (
              <div className="flex flex-col gap-4">
                {!tabState.isHiveUrl ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <div className="bg-slate-100 p-4 rounded-full mb-3">
                      <LinkIcon size={24} className="opacity-50" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No Hive Context Detected</p>
                    <p className="text-xs mt-1 max-w-[200px]">
                      Navigate to a Hive frontend (like PeakD or Ecency) to generate shareable links for the current page.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 flex gap-2">
                      <Info size={16} className="shrink-0" />
                      <p>Generate links for this page on other frontends to share with friends.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {FRONTENDS.map((frontend) => {
                         const url = getTargetUrl(frontend.id, tabState.path, ActionMode.SAME_PAGE, tabState.username);
                         const isCopied = copiedLink === frontend.id;
                         return (
                          <div key={frontend.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded">
                               <FrontendIcon id={frontend.id} color={frontend.color} size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{frontend.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{url}</p>
                            </div>
                            <button 
                              onClick={() => handleCopy(url, frontend.id)}
                              className={`
                                p-2 rounded-md transition-all
                                ${isCopied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                              `}
                            >
                              {isCopied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                         );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* --- VIEW: ACCOUNT STATS --- */}
            {currentView === AppView.STATS && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
                  <form onSubmit={handleCheckStats} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                      <input 
                        type="text" 
                        value={statsUsername}
                        onChange={(e) => setStatsUsername(e.target.value)}
                        placeholder="username"
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loadingStats}
                      className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      <Search size={18} />
                    </button>
                  </form>

                  {loadingStats && (
                    <div className="py-8 flex justify-center">
                      <Activity className="animate-spin text-slate-300" size={32} />
                    </div>
                  )}

                  {statsError && (
                    <div className="py-4 text-center text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
                      {statsError}
                    </div>
                  )}

                  {!loadingStats && accountStats && (
                    <div className="flex flex-col items-center py-2 animate-in fade-in zoom-in-95 duration-200">
                      
                      <h3 className="text-lg font-bold text-slate-800 mb-4">@{accountStats.username}</h3>

                      {/* Gauges Row */}
                      <div className="flex justify-between w-full px-2 mb-4">
                        {renderGauge(
                          accountStats.vp.percentage, 
                          accountStats.vp.isLow, 
                          'Voting Power', 
                          <ThumbsUp size={20} className={accountStats.vp.isLow ? 'text-red-500' : 'text-slate-400'} />,
                          `${(accountStats.vp.percentage).toFixed(2)}%`
                        )}
                        {renderGauge(
                          accountStats.rc.percentage, 
                          accountStats.rc.isLow, 
                          'Resource Credits', 
                          <Zap size={20} className={accountStats.rc.isLow ? 'text-red-500' : 'text-slate-400'} fill="currentColor" />,
                          `${formatRCNumber(accountStats.rc.current)} Mana`
                        )}
                      </div>

                      {/* Badge Control */}
                      <div className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Extension Badge</span>
                        <div className="flex bg-slate-200 rounded p-0.5">
                           <button
                             onClick={() => updateSettings({ badgeMetric: 'RC' })}
                             className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${settings.badgeMetric === 'RC' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                           >
                             RC
                           </button>
                           <button
                             onClick={() => updateSettings({ badgeMetric: 'VP' })}
                             className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${settings.badgeMetric === 'VP' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                           >
                             VP
                           </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {!loadingStats && !accountStats && !statsError && (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      {settings.rcUser ? 'Loading saved user...' : 'Enter a Hive username to monitor.'}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* --- VIEW: APPS (LAUNCHER) --- */}
            {currentView === AppView.APPS && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Ecosystem DApps</p>
                <div className="grid grid-cols-2 gap-3">
                  {DAPPS.map((app) => (
                    <a 
                      key={app.name}
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center text-center p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                      <div className="mb-3 p-3 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-200">
                        {renderDAppIcon(app.icon)}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{app.name}</span>
                      <span className="text-[10px] text-slate-400 mt-1 leading-tight">{app.description}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* --- VIEW: SETTINGS --- */}
            {currentView === AppView.SETTINGS && (
              <div className="flex flex-col gap-6">
                
                {/* Auto Redirect Section */}
                <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-800">Auto-Redirect</span>
                      <span className="text-xs text-slate-500">Always open Hive links in...</span>
                    </div>
                    <button 
                      onClick={() => updateSettings({ autoRedirect: !settings.autoRedirect })}
                      className={`
                        w-11 h-6 rounded-full transition-colors relative
                        ${settings.autoRedirect ? 'bg-emerald-500' : 'bg-slate-200'}
                      `}
                    >
                      <div className={`
                        w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm
                        ${settings.autoRedirect ? 'left-6' : 'left-1'}
                      `} />
                    </button>
                  </div>

                  {settings.autoRedirect && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                       <label className="text-xs font-medium text-slate-500 uppercase">Preferred Frontend</label>
                       <div className="grid grid-cols-1 gap-2">
                         {FRONTENDS.map(f => (
                           <button
                             key={f.id}
                             onClick={() => updateSettings({ preferredFrontendId: f.id })}
                             className={`
                               flex items-center gap-3 p-2 rounded-lg border text-left transition-all
                               ${settings.preferredFrontendId === f.id 
                                 ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
                                 : 'bg-white border-slate-200 hover:bg-slate-50'}
                             `}
                           >
                              <FrontendIcon id={f.id} color={f.color} size={18} />
                              <span className="text-sm font-medium">{f.name}</span>
                              {settings.preferredFrontendId === f.id && <Check size={16} className="ml-auto text-emerald-600" />}
                           </button>
                         ))}
                       </div>
                     </div>
                  )}
                </section>

                {/* General Behavior */}
                <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <span className="font-semibold text-sm text-slate-800 block mb-3">General Behavior</span>
                  <label className="flex items-center justify-between cursor-pointer mb-3">
                    <span className="text-sm text-slate-600">Open links in new tab</span>
                    <input 
                      type="checkbox" 
                      checked={settings.openInNewTab} 
                      onChange={(e) => updateSettings({ openInNewTab: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                  </label>
                  
                  {/* Show saved RC user in settings */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                     <span className="text-sm text-slate-600">Monitored User (Stats)</span>
                     <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                       {settings.rcUser || 'None'}
                     </span>
                  </div>
                </section>

              </div>
            )}

          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-200 flex justify-between p-2 pb-3 sticky bottom-0 z-30">
        {[
          { id: AppView.SWITCHER, icon: ArrowLeftRight, label: 'Switcher' },
          { id: AppView.SHARE, icon: Share2, label: 'Share' },
          { id: AppView.STATS, icon: Activity, label: 'Stats' },
          { id: AppView.APPS, icon: Grid, label: 'Apps' },
          { id: AppView.SETTINGS, icon: Settings, label: 'Settings' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`
              flex flex-col items-center gap-1 flex-1 p-1 rounded-lg transition-colors
              ${currentView === item.id ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
            `}
          >
            <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
};

export default App;