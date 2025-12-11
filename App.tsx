
import React, { useEffect, useState } from 'react';
import { FRONTENDS, DAPPS } from './constants';
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats, formatRCNumber } from './utils/hiveHelpers';
import { 
  fetchUnreadChatCount, 
  bootstrapEcencyChat, 
  fetchChannels, 
  getOrCreateDirectChannel,
  getAvatarUrl
} from './utils/ecencyHelpers';
import { createEcencyLoginPayload, createEcencyToken } from './utils/ecencyLogin';
import { CurrentTabState, FrontendId, ActionMode, AppSettings, AccountStats, AppView, Channel } from './types';
import { FrontendCard } from './components/FrontendCard';
import { FrontendIcon } from './components/FrontendIcon';
import { 
  ArrowLeftRight, Activity, PenLine, Wallet, Link as LinkIcon, 
  ExternalLink, Settings, Share2, Grid, Check, Copy, Info, 
  Sword, Coins, ShoppingCart, Video, Gamepad2, Vote,
  MessageCircle, MonitorPlay, Plane, Palette, Music, Zap, Search,
  ThumbsUp, User, KeyRound, LogIn, LogOut, ShieldCheck,
  Plus, Send, RefreshCw, PanelRight
} from 'lucide-react';

// Declare chrome to avoid TypeScript errors
declare const chrome: any;

const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  rcUser: '',
  badgeMetric: 'VP',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyRefreshToken: ''
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

  // Chat State
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatSessionExpired, setChatSessionExpired] = useState(false);
  const [dmTarget, setDmTarget] = useState('');
  const [creatingDm, setCreatingDm] = useState(false);
  
  // Login State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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
          setStatsUsername(prev => prev || parsed.username || 'alice');
          setLoading(false);
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
          const parsed = parseUrl(tab.url);
          setTabState(parsed);
          setStatsUsername(prev => {
            if (prev) return prev; 
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
        updateSettings({ rcUser: data.username });
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

  // --- CHAT LOGIC ---

  const refreshChat = async () => {
    setLoadingChat(true);
    setChatSessionExpired(false);
    
    try {
      // 1. Fetch Channels
      const list = await fetchChannels();
      
      if (list === null) {
        // Null means fetch failed, likely auth error
        setChatSessionExpired(true);
      } else {
        // Sort: Unread first, then by last post
        const sorted = list.sort((a, b) => {
          const aUnread = a.unread_count || 0;
          const bUnread = b.unread_count || 0;
          if (aUnread !== bUnread) return bUnread - aUnread;
          return b.last_post_at - a.last_post_at;
        });
        setChannels(sorted);
        
        // Update total Badge
        const totalUnread = sorted.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadMessages(totalUnread);
        
        if (typeof chrome !== 'undefined' && chrome.action && totalUnread > 0) {
          chrome.action.setBadgeText({ text: totalUnread > 99 ? '99+' : totalUnread.toString() });
          chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
        }
      }
    } catch (e) {
      console.error("Chat refresh failed", e);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleCreateDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmTarget.trim()) return;

    setCreatingDm(true);
    try {
      const channelId = await getOrCreateDirectChannel(dmTarget.trim());
      if (channelId) {
        window.open(`https://ecency.com/chat/${channelId}`, '_blank');
        setDmTarget('');
      } else {
        alert('Could not find user or create chat.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingDm(false);
    }
  };

  const openSidePanel = () => {
    if (chrome && chrome.sidePanel) {
      // Using window.id requires the "windows" permission usually, but sidePanel.open 
      // is the main way. Note: This generally requires a user action context.
      chrome.windows.getCurrent((window: any) => {
         chrome.sidePanel.open({ windowId: window.id });
         window.close(); // Close popup
      });
    } else {
      alert("Side Panel not supported in this browser version.");
    }
  };

  // LOGIN HANDLER
  const handleKeychainLogin = async () => {
    const userToLogin = settings.ecencyUsername || statsUsername || tabState.username;

    if (!userToLogin) {
      setLoginError("Please enter a username first.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setLoginError("No active tab found. Please refresh the page.");
        setIsLoggingIn(false);
        return;
      }

      if (tab.url?.match(/^(chrome|edge|about|data|chrome-extension):/)) {
        setLoginError("Cannot login from this page. Please open a regular website.");
        setIsLoggingIn(false);
        return;
      }

      const payload = createEcencyLoginPayload(userToLogin);
      const messageToSign = JSON.stringify(payload);

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: (username: string, message: string) => {
          return new Promise((resolve) => {
            // @ts-ignore
            if (!window.hive_keychain) {
              resolve({ success: false, error: 'Hive Keychain not found. Please reload page.' });
              return;
            }
            // @ts-ignore
            window.hive_keychain.requestSignBuffer(
              username,
              message,
              'Posting',
              (resp: any) => resolve(resp)
            );
          });
        },
        args: [userToLogin, messageToSign]
      });

      if (!results || !results[0] || !results[0].result) {
        setLoginError("Script execution failed.");
        setIsLoggingIn(false);
        return;
      }

      const response = results[0].result;

      if (!response.success) {
        setLoginError(response.error || "Login canceled.");
        setIsLoggingIn(false);
        return;
      }

      try {
        const token = createEcencyToken(payload, response.result);
        const success = await bootstrapEcencyChat(userToLogin, token);
        
        if (success) {
           updateSettings({ 
             ecencyUsername: userToLogin, 
             ecencyAccessToken: token,
             ecencyRefreshToken: '' 
           });

           setLoginError(null);
           setChatSessionExpired(false);
           
           if (currentView === AppView.CHAT) {
             refreshChat();
           } else {
             setTimeout(() => setCurrentView(AppView.CHAT), 500);
           }
        } else {
           setLoginError("Failed to initialize chat session.");
        }
      } catch (err) {
         setLoginError("Error initializing chat.");
      } finally {
        setIsLoggingIn(false);
      }

    } catch (e) {
      console.error(e);
      setLoginError("Unexpected error.");
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    updateSettings({ ecencyUsername: '', ecencyAccessToken: '', ecencyRefreshToken: '' });
    setUnreadMessages(null);
    setChannels([]);
  };

  // Auto-fetch logic based on view
  useEffect(() => {
    if (currentView === AppView.STATS && statsUsername && !accountStats && !loadingStats && !statsError) {
      handleCheckStats();
    }
    if (currentView === AppView.CHAT && settings.ecencyUsername) {
      refreshChat();
    }
  }, [currentView]);

  // If user toggles badge metric in UI
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

  const renderGauge = (percentage: number, isLow: boolean, label: string, icon: React.ReactNode, subValue?: string) => (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28 flex items-center justify-center mb-2">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="8" fill="none" />
          <circle
            cx="56" cy="56" r="48"
            stroke={isLow ? '#ef4444' : percentage > 50 ? '#10b981' : '#f59e0b'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: 301.6, 
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
          <img 
            src="/icon.png" 
            alt="HiveKit" 
            className="w-8 h-8 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/icon.svg';
              target.onerror = null;
            }}
          />
          <h1 className="text-lg font-bold tracking-tight text-slate-900">HiveKit</h1>
        </div>
        {/* Side Panel Toggle */}
        <button 
           onClick={openSidePanel} 
           className="text-slate-400 hover:text-blue-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
           title="Open in Side Panel"
        >
           <PanelRight size={18} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Activity className="text-slate-300 animate-spin" size={32} />
          </div>
        ) : (
          <div className="p-4 pb-20">
            
            {/* --- VIEW: SWITCHER --- */}
            {currentView === AppView.SWITCHER && (
              <div className="flex flex-col gap-4">
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

            {/* --- VIEW: SHARE --- */}
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

            {/* --- VIEW: STATS --- */}
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
                      <div className="w-full bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Extension Badge</span>
                        <div className="flex bg-slate-200 rounded p-0.5">
                           <button onClick={() => updateSettings({ badgeMetric: 'RC' })} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${settings.badgeMetric === 'RC' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>RC</button>
                           <button onClick={() => updateSettings({ badgeMetric: 'VP' })} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${settings.badgeMetric === 'VP' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>VP</button>
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

            {/* --- VIEW: CHAT DASHBOARD --- */}
            {currentView === AppView.CHAT && (
              <div className="flex flex-col h-full relative">
                
                {/* NOT LOGGED IN STATE */}
                {!settings.ecencyUsername || !settings.ecencyAccessToken ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center p-6 space-y-4">
                     <div className="bg-slate-100 p-4 rounded-full">
                        <MessageCircle size={32} className="text-slate-400" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-800">Ecency Chat</h3>
                     <p className="text-sm text-slate-600">
                       To see your messages, please login with Hive Keychain in Settings.
                     </p>
                     <button
                       onClick={() => setCurrentView(AppView.SETTINGS)}
                       className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                     >
                       Go to Settings
                     </button>
                  </div>
                ) : (
                  // LOGGED IN DASHBOARD
                  <div className="flex flex-col h-full">
                    
                    {/* Chat Header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">Messages</h2>
                        {loadingChat && <Activity size={14} className="text-slate-400 animate-spin" />}
                      </div>
                      <button 
                        onClick={refreshChat} 
                        className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>

                    {/* Session Expired Alert */}
                    {chatSessionExpired && (
                       <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-lg flex flex-col gap-2">
                          <p className="text-xs text-red-600 font-medium">Session expired. Please re-verify.</p>
                          <button 
                             onClick={handleKeychainLogin}
                             disabled={isLoggingIn}
                             className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-1.5 rounded text-xs font-bold transition-colors"
                          >
                             {isLoggingIn ? 'Verifying...' : 'Verify with Keychain'}
                          </button>
                       </div>
                    )}

                    {/* Quick DM Launcher */}
                    <form onSubmit={handleCreateDM} className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                           type="text" 
                           placeholder="Message user..." 
                           value={dmTarget}
                           onChange={(e) => setDmTarget(e.target.value)}
                           className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={creatingDm || !dmTarget}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {creatingDm ? <Activity size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </form>

                    {/* Channel List */}
                    <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-1">
                      {channels.length === 0 && !loadingChat && !chatSessionExpired ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                           <p>No conversations yet.</p>
                           <p className="text-xs mt-1">Start a DM above!</p>
                        </div>
                      ) : (
                        channels.map(channel => {
                           // Determine Avatar and Name
                           let avatar = '';
                           let name = channel.display_name;
                           
                           if (channel.type === 'D') {
                              // Direct Message Logic
                              // Name is often "uid1__uid2" or provided display_name
                              // We try to find the other user's name
                              if (channel.teammate) {
                                name = channel.teammate.username;
                                avatar = getAvatarUrl(channel.teammate.username);
                              } else if (channel.display_name && !channel.display_name.includes('__')) {
                                name = channel.display_name;
                                avatar = getAvatarUrl(channel.display_name);
                              } else {
                                 // Fallback if we only have the raw name "userA__userB"
                                 const parts = channel.name.split('__');
                                 const other = parts.find(p => p !== settings.ecencyUsername);
                                 name = other || channel.display_name;
                                 avatar = getAvatarUrl(name);
                              }
                           } else {
                              // Community / Group
                              // Use Ecency default community image logic or generic
                              // For communities, name is usually "hive-123456"
                              avatar = `https://images.ecency.com/u/${channel.name}/avatar/small`;
                           }

                           return (
                             <a 
                               key={channel.id}
                               href={`https://ecency.com/chat/${channel.id}`}
                               target="_blank"
                               rel="noreferrer"
                               className="flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all group"
                             >
                               <img 
                                 src={avatar} 
                                 onError={(e) => (e.target as HTMLImageElement).src = 'https://images.ecency.com/u/hive-1/avatar/small'}
                                 alt={name}
                                 className="w-10 h-10 rounded-full bg-slate-200 object-cover border border-slate-100"
                               />
                               <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-center">
                                    <span className="font-semibold text-slate-800 text-sm truncate">{name}</span>
                                    {/* Unread Badge */}
                                    {(channel.unread_count || 0) > 0 && (
                                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                        {channel.unread_count}
                                      </span>
                                    )}
                                 </div>
                                 <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {channel.type === 'D' ? 'Direct Message' : 'Community Chat'}
                                 </p>
                               </div>
                             </a>
                           );
                        })
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* --- VIEW: APPS --- */}
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
                
                {/* Ecency Chat Config (Secure Automated Phase 2) */}
                <section className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm ring-1 ring-blue-50">
                   <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
                      <ShieldCheck size={18} className="text-blue-600" />
                      <span className="font-semibold text-sm text-slate-800">Ecency Chat</span>
                   </div>
                   
                   {!settings.ecencyAccessToken ? (
                     <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                            <User size={12} /> Hive Username
                          </label>
                          <input 
                            type="text" 
                            placeholder="username (no @)"
                            value={settings.ecencyUsername || ''}
                            onChange={(e) => updateSettings({ ecencyUsername: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>

                        {loginError && (
                          <div className="p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                            {loginError}
                          </div>
                        )}

                        <button
                          onClick={handleKeychainLogin}
                          disabled={isLoggingIn}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                           {isLoggingIn ? <Activity size={16} className="animate-spin" /> : <KeyRound size={16} />}
                           {isLoggingIn ? 'Verifying...' : 'Login with Keychain'}
                        </button>
                        
                        <p className="text-[10px] text-center text-slate-400">
                           Securely signs a message. Keys never leave Keychain.
                        </p>
                     </div>
                   ) : (
                     <div className="space-y-3">
                        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                             <span className="text-sm font-medium text-blue-900">Logged in as @{settings.ecencyUsername}</span>
                           </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-2 rounded-lg font-medium text-xs transition-colors"
                        >
                           <LogOut size={14} /> Disconnect
                        </button>
                     </div>
                   )}
                </section>

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
          { id: AppView.CHAT, icon: MessageCircle, label: 'Chat' },
          { id: AppView.SHARE, icon: Share2, label: 'Share' },
          { id: AppView.STATS, icon: Activity, label: 'Stats' },
          { id: AppView.APPS, icon: Grid, label: 'Apps' },
          { id: AppView.SETTINGS, icon: Settings, label: 'Settings' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`
              flex flex-col items-center gap-1 flex-1 p-1 rounded-lg transition-colors relative
              ${currentView === item.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
            `}
          >
            <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {/* Nav Badge for Chat */}
            {item.id === AppView.CHAT && unreadMessages !== null && unreadMessages > 0 && (
               <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>
        ))}
      </nav>

    </div>
  );
};

export default App;
