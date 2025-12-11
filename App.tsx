
import React, { useEffect, useState } from 'react';
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats } from './utils/hiveHelpers';
import { 
  bootstrapEcencyChat, 
  fetchChannels, 
  getOrCreateDirectChannel,
  fetchChannelPosts,
  sendMessage
} from './utils/ecencyHelpers';
import { createEcencyLoginPayload, createEcencyToken } from './utils/ecencyLogin';
import { CurrentTabState, FrontendId, ActionMode, AppSettings, AccountStats, AppView, Channel, Message } from './types';
import { Activity } from 'lucide-react';

// Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SwitcherView } from './components/views/SwitcherView';
import { ShareView } from './components/views/ShareView';
import { StatsView } from './components/views/StatsView';
import { ChatView } from './components/views/ChatView';
import { AppsView } from './components/views/AppsView';
import { SettingsView } from './components/views/SettingsView';

declare const chrome: any;

const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  rcUser: '',
  badgeMetric: 'VP',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
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

  // Stats Data for Badge
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);

  // Chat State
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatSessionExpired, setChatSessionExpired] = useState(false);
  const [dmTarget, setDmTarget] = useState('');
  const [creatingDm, setCreatingDm] = useState(false);
  
  // Chat Active Channel State
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Login State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Load Settings
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const stored = await chrome.storage.local.get(['settings']);
          if (stored.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...stored.settings });
            
            // Pre-fill stats if user exists
            if (stored.settings.rcUser) {
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
          setTabState(parseUrl(dummyUrl));
          setLoading(false);
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url) {
          setTabState(parseUrl(tab.url));
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

  // --- HELPERS ---

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ settings: updated });
    }
  };

  const updateBadgeFromData = (data: AccountStats) => {
    if (typeof chrome !== 'undefined' && chrome.action) {
       const percent = settings.badgeMetric === 'RC' ? data.rc.percentage : data.vp.percentage;
       const rounded = Math.round(percent);
       chrome.action.setBadgeText({ text: `${rounded}%` });
       
       let color = '#22c55e';
       if (rounded < 20) color = '#ef4444'; 
       else if (rounded < 50) color = '#f97316';
       chrome.action.setBadgeBackgroundColor({ color });
    }
  };

  const handleSwitch = (targetId: FrontendId, mode: ActionMode) => {
    const newUrl = getTargetUrl(targetId, tabState.path, mode, tabState.username);
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

  // --- CHAT LOGIC ---

  const refreshChat = async (forceBootstrap = false) => {
    setLoadingChat(true);
    setChatSessionExpired(false);
    
    let token = settings.ecencyChatToken;
    let username = settings.ecencyUsername;
    let accessToken = settings.ecencyAccessToken;

    if (!username || !accessToken) {
      setLoadingChat(false);
      return;
    }

    const doFetch = async (authToken?: string) => {
      const list = await fetchChannels(authToken);
      if (list === null) return false;

      const sorted = list.sort((a, b) => {
        const aUnread = a.unread_count || 0;
        const bUnread = b.unread_count || 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return b.last_post_at - a.last_post_at;
      });
      setChannels(sorted);
      
      const totalUnread = sorted.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadMessages(totalUnread);
      
      if (typeof chrome !== 'undefined' && chrome.action && totalUnread > 0) {
        chrome.action.setBadgeText({ text: totalUnread > 99 ? '99+' : totalUnread.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
      }
      return true;
    };
    
    try {
      if (!forceBootstrap && token) {
         const success = await doFetch(token);
         if (success) {
           setLoadingChat(false);
           return;
         }
      }

      console.log('Refreshing Chat Session via Bootstrap...');
      const newToken = await bootstrapEcencyChat(username, accessToken);
      
      if (newToken) {
         updateSettings({ ecencyChatToken: newToken });
         token = newToken;
         const retrySuccess = await doFetch(newToken);
         if (!retrySuccess) setChatSessionExpired(true);
      } else {
         console.warn("Bootstrap returned no token");
         setChatSessionExpired(true);
      }
    } catch (e) {
      console.error("Chat refresh failed", e);
      setChatSessionExpired(true);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSelectChannel = async (channel: Channel | null) => {
     setActiveChannel(channel);
     if (channel) {
        setLoadingMessages(true);
        setActiveMessages([]);
        const msgs = await fetchChannelPosts(channel.id, settings.ecencyChatToken);
        // API returns newer first, we want older first for display
        setActiveMessages(msgs.reverse());
        setLoadingMessages(false);
     }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeChannel) return;
    setSendingMessage(true);
    const result = await sendMessage(activeChannel.id, text, settings.ecencyChatToken);
    
    if (result) {
       // Append message optimistically or from result
       setActiveMessages(prev => [...prev, result]);
    } else {
       alert("Failed to send message. Please check connection.");
    }
    setSendingMessage(false);
  };

  const handleCreateDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmTarget.trim()) return;

    setCreatingDm(true);
    try {
      let token = settings.ecencyChatToken;
      let result = await getOrCreateDirectChannel(dmTarget.trim(), token);
      
      // Auto-retry bootstrap if failed with session error
      if (!result.success && settings.ecencyUsername && settings.ecencyAccessToken) {
         // Only retry if it looks like a session issue or if token was missing
         if (!token || result.error?.toLowerCase().includes('session') || result.error?.toLowerCase().includes('expired')) {
           console.log("Retrying DM with fresh bootstrap...");
           const newToken = await bootstrapEcencyChat(settings.ecencyUsername, settings.ecencyAccessToken);
           if (newToken) {
             updateSettings({ ecencyChatToken: newToken });
             result = await getOrCreateDirectChannel(dmTarget.trim(), newToken);
           }
         }
      }

      if (result.success) {
        setDmTarget('');
        
        // If we got an ID, select it immediately
        if (result.id) {
            const newChannel: Channel = {
               id: result.id,
               display_name: dmTarget.trim(), 
               name: `${settings.ecencyUsername}__${dmTarget.trim()}`,
               type: 'D',
               create_at: Date.now(),
               update_at: Date.now(),
               delete_at: 0,
               team_id: '',
               header: '',
               purpose: '',
               last_post_at: Date.now(),
               total_msg_count: 0,
               extra_update_at: 0,
               creator_id: ''
            };
            handleSelectChannel(newChannel);
        } else {
            // Fallback: If we created it but didn't get ID, force a refresh
            // The new channel should appear in the list now
            await refreshChat(false);
            // We can't auto-select because we don't know the ID, but the user will see it in the list
        }
      } else {
        alert(result.error || 'Could not create DM.');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating chat.');
    } finally {
      setCreatingDm(false);
    }
  };

  // --- LOGIN LOGIC ---
  
  const handleKeychainLogin = async () => {
    const userToLogin = settings.ecencyUsername || settings.rcUser || tabState.username;

    if (!userToLogin) {
      setLoginError("Please enter a username in Settings first.");
      if (currentView !== AppView.SETTINGS) setCurrentView(AppView.SETTINGS);
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || tab.url?.match(/^(chrome|edge|about|data|chrome-extension):/)) {
        setLoginError("Please open a regular website to use Keychain.");
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
            window.hive_keychain.requestSignBuffer(username, message, 'Posting', (resp: any) => resolve(resp));
          });
        },
        args: [userToLogin, messageToSign]
      });

      if (!results?.[0]?.result?.success) {
        setLoginError(results?.[0]?.result?.error || "Login canceled.");
        setIsLoggingIn(false);
        return;
      }

      const response = results[0].result;
      const hiveToken = createEcencyToken(payload, response.result);
      const chatToken = await bootstrapEcencyChat(userToLogin, hiveToken);
      
      if (chatToken) {
         updateSettings({ 
           ecencyUsername: userToLogin, 
           ecencyAccessToken: hiveToken,
           ecencyChatToken: chatToken === 'cookie-session' ? '' : chatToken,
         });

         setLoginError(null);
         setChatSessionExpired(false);
         
         if (currentView === AppView.CHAT) {
           setTimeout(() => refreshChat(true), 100); 
         } else {
           setTimeout(() => setCurrentView(AppView.CHAT), 500);
         }
      } else {
         setLoginError("Failed to initialize chat session.");
      }
    } catch (e) {
      console.error(e);
      setLoginError("Unexpected error.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    updateSettings({ 
      ecencyUsername: '', ecencyAccessToken: '', ecencyChatToken: '', ecencyRefreshToken: '' 
    });
    setUnreadMessages(null);
    setChannels([]);
    setActiveChannel(null);
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (currentView === AppView.CHAT && settings.ecencyUsername) {
      refreshChat(false);
    }
  }, [currentView]);

  useEffect(() => {
    if (accountStats) {
      updateBadgeFromData(accountStats);
    }
  }, [settings.badgeMetric]);

  // --- RENDER ---

  if (error) {
     return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col h-[500px] w-full bg-slate-50 text-slate-800 font-sans">
      
      <Header />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Activity className="text-slate-300 animate-spin" size={32} />
          </div>
        ) : (
          <div className="p-4 pb-20">
            {currentView === AppView.SWITCHER && (
              <SwitcherView tabState={tabState} onSwitch={handleSwitch} />
            )}
            
            {currentView === AppView.SHARE && (
              <ShareView tabState={tabState} />
            )}

            {currentView === AppView.STATS && (
              <StatsView 
                settings={settings} 
                updateSettings={updateSettings} 
                onDataFetched={(data) => {
                  setAccountStats(data);
                  updateBadgeFromData(data);
                }}
              />
            )}

            {currentView === AppView.CHAT && (
              <ChatView 
                settings={settings}
                channels={channels}
                loadingChat={loadingChat}
                chatSessionExpired={chatSessionExpired}
                isLoggingIn={isLoggingIn}
                refreshChat={refreshChat}
                handleCreateDM={handleCreateDM}
                handleKeychainLogin={handleKeychainLogin}
                dmTarget={dmTarget}
                setDmTarget={setDmTarget}
                creatingDm={creatingDm}
                onNavigateSettings={() => setCurrentView(AppView.SETTINGS)}
                activeChannel={activeChannel}
                activeMessages={activeMessages}
                loadingMessages={loadingMessages}
                onSelectChannel={handleSelectChannel}
                onSendMessage={handleSendMessage}
                sendingMessage={sendingMessage}
              />
            )}

            {currentView === AppView.APPS && (
              <AppsView />
            )}

            {currentView === AppView.SETTINGS && (
              <SettingsView 
                settings={settings}
                updateSettings={updateSettings}
                onLogin={handleKeychainLogin}
                onLogout={handleLogout}
                isLoggingIn={isLoggingIn}
                loginError={loginError}
              />
            )}
          </div>
        )}
      </main>

      <BottomNav 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        unreadMessages={unreadMessages} 
      />
    </div>
  );
};

export default App;
