
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats } from './utils/hiveHelpers';
import { 
  bootstrapEcencyChat, 
  fetchChannels, 
  getOrCreateDirectChannel, 
  fetchChannelPosts,
  sendMessage,
  editMessage,
  deleteMessage,
  fetchMe,
  fetchUsersByIds,
  toggleReaction,
  fetchUnreads,
  UnauthorizedError
} from './utils/ecencyHelpers';
import { createEcencyLoginPayload, createEcencyToken } from './utils/ecencyLogin';
import { CurrentTabState, FrontendId, ActionMode, AppSettings, AccountStats, AppView, Channel, Message } from './types';
import { FRONTENDS } from './constants'; // Import FRONTENDS
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

declare global {
  interface Window {
    hive_keychain: any;
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  notificationsEnabled: true,
  notificationInterval: 1,
  rcUser: '',
  badgeMetric: 'VP',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
  ecencyUserId: '',
  ecencyRefreshToken: '',
  overrideBadgeWithUnreadMessages: true,
  activeFrontendIds: FRONTENDS.map(f => f.id) // Initialize with all frontend IDs
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
  const [initializing, setInitializing] = useState(true);

  // Stats Data
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);

  // Chat State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatSessionExpired, setChatSessionExpired] = useState(false);
  const [dmTarget, setDmTarget] = useState('');
  const [creatingDm, setCreatingDm] = useState(false);
  
  // Chat Data State
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // User Cache
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // Login State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Polling Reference
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- BADGE LOGIC ---
  const updateBadge = useCallback((stats: AccountStats | null, unreads: Record<string, number>) => {
    if (typeof chrome === 'undefined' || !chrome.action) return;

    const totalUnread = Object.values(unreads).reduce((sum, count) => sum + count, 0);

    // If overrideBadgeWithUnreadMessages is true, prioritize unread messages
    // Otherwise, skip message badge and go straight to stats badge logic
    if (settings.overrideBadgeWithUnreadMessages && totalUnread > 0) {
      const text = totalUnread > 9 ? `💬9+` : `💬${totalUnread}`;
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' }); // Blue for chat
    } else if (stats) {
      const metric = settings.badgeMetric || 'VP';
      const percent = metric === 'RC' ? stats.rc.percentage : stats.vp.percentage;
      const rounded = Math.round(percent);
      const isLow = rounded < 20;
      const icon = metric === 'RC' ? '⚡' : '👍';
      
      /**
       * Chrome badge width is fixed. Emojis occupy a lot of space.
       * Icon + 3 digits is the maximum reliable length (e.g., 👍100).
       * We remove the '%' symbol to ensure the number and icon are always fully visible.
       */
      const text = `${icon}${rounded}`;
      
      chrome.action.setBadgeText({ text });
      
      if (isLow) {
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); 
      } else {
        const color = metric === 'RC' ? '#a855f7' : '#10b981'; 
        chrome.action.setBadgeBackgroundColor({ color });
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }, [settings.badgeMetric, settings.overrideBadgeWithUnreadMessages]);

  // Reactive badge update effect
  useEffect(() => {
    updateBadge(accountStats, unreadCounts);
  }, [accountStats, unreadCounts, updateBadge]);

  // --- REFRESH CHAT ---
  const refreshChat = async () => {
    if (!settings.ecencyUsername) return;
    setLoadingChat(true);

    try {
      const [newChannels, unreadResp] = await Promise.all([
        fetchChannels(settings.ecencyChatToken),
        fetchUnreads(settings.ecencyChatToken)
      ]);

      if (newChannels) {
        setChannels(newChannels);
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ channels: newChannels });
        }
        setChatSessionExpired(false);
      }

      if (unreadResp && unreadResp.channels) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['channelReadState'], (result: any) => {
            const channelReadState = result.channelReadState || {};
            const counts: Record<string, number> = {};
            const newReadState = { ...channelReadState };
            const currentTotals: Record<string, number> = {};
            let stateChanged = false;
            
            unreadResp.channels.forEach(u => {
              if (u.channelId) {
                const currentTotal = u.message_count || 0;
                currentTotals[u.channelId] = currentTotal;

                if (newReadState[u.channelId] === undefined) {
                    newReadState[u.channelId] = currentTotal;
                    counts[u.channelId] = 0;
                    stateChanged = true;
                } else {
                    const diff = Math.max(0, currentTotal - newReadState[u.channelId]);
                    counts[u.channelId] = diff;
                }
              }
            });

            setUnreadCounts(counts);
            const storagePayload: any = { 
                unreadCounts: counts, 
                channelTotals: currentTotals
            };
            if (stateChanged) {
                storagePayload.channelReadState = newReadState;
            }
            chrome.storage.local.set(storagePayload);
          });
        }
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        setChatSessionExpired(true);
      }
      console.error("Chat polling failed", e);
    } finally {
      setLoadingChat(false);
    }
  };

  // --- FETCH ACTIVE MESSAGES ---
  const loadActiveMessages = useCallback(async (channelId: string) => {
    if (!settings.ecencyUsername) return;
    
    setLoadingMessages(true);
    try {
      const { messages, users } = await fetchChannelPosts(channelId, settings.ecencyChatToken, 40);
      
      if (Object.keys(users).length > 0) {
        setUserMap(prev => ({ ...prev, ...users }));
      }
      
      setActiveMessages(messages);
      setChatSessionExpired(false);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        setChatSessionExpired(true);
      }
      console.error("Failed to load messages", e);
    } finally {
      setLoadingMessages(false);
    }
  }, [settings.ecencyChatToken, settings.ecencyUsername]);

  // --- HEARTBEAT EFFECT ---
  useEffect(() => {
    const shouldPoll = currentView === AppView.CHAT && settings.ecencyUsername;
    
    if (!shouldPoll) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const heartbeat = async () => {
      try {
        if (activeChannel) {
          const { messages, users } = await fetchChannelPosts(activeChannel.id, settings.ecencyChatToken, 40);
          if (Object.keys(users).length > 0) {
            setUserMap(prev => ({ ...prev, ...users }));
          }
          
          setActiveMessages(prev => {
            if (prev.length === messages.length && 
                prev.length > 0 && 
                prev[prev.length - 1].id === messages[messages.length - 1].id &&
                prev[prev.length - 1].update_at === messages[messages.length - 1].update_at) {
              return prev;
            }
            return messages;
          });
        }
        await refreshChat();
      } catch (e) {
        if (e instanceof UnauthorizedError) setChatSessionExpired(true);
      }
    };

    heartbeat();
    pollingIntervalRef.current = setInterval(heartbeat, activeChannel ? 4000 : 12000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentView, activeChannel?.id, settings.ecencyChatToken, settings.ecencyUsername]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const hydrate = async () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
           chrome.storage.local.get(['settings', 'channels', 'unreadCounts'], (result: any) => {
              if (result.settings) {
                 const saved = { ...DEFAULT_SETTINGS, ...result.settings };
                 setSettings(saved);
                 if (saved.ecencyUserId && saved.ecencyUsername) {
                    setUserMap(prev => ({ ...prev, [saved.ecencyUserId!]: saved.ecencyUsername! }));
                 }
                 if (saved.rcUser) {
                    fetchAccountStats(saved.rcUser).then(data => data && setAccountStats(data));
                 }
              }
              if (result.channels) setChannels(result.channels);
              if (result.unreadCounts) setUnreadCounts(result.unreadCounts);
              setInitializing(false);
           });
        } catch (e) { setInitializing(false); }
      } else { setInitializing(false); }

      if (typeof chrome !== 'undefined' && chrome.tabs) {
         try {
           chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
              if (tabs && tabs.length > 0 && tabs[0].url) setTabState(parseUrl(tabs[0].url));
           });
         } catch (e) { }
      }
    };
    hydrate();

    const storageListener = (changes: any, areaName: string) => {
      if (areaName === 'local') {
        if (changes.channels) setChannels(changes.channels.newValue || []);
        if (changes.unreadCounts) setUnreadCounts(changes.unreadCounts.newValue || {});
        if (changes.settings) setSettings(prev => ({ ...prev, ...changes.settings.newValue }));
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(storageListener);
    }
  }, []);

  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (updated.ecencyUserId && updated.ecencyUsername) {
       setUserMap(prev => ({ ...prev, [updated.ecencyUserId!]: updated.ecencyUsername! }));
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ settings: updated });
    }
  };

  const updateBadgeFromData = (data: AccountStats) => {
    setAccountStats(data);
  };

  const handleSwitch = (id: FrontendId, mode: ActionMode) => {
    const url = getTargetUrl(id, tabState.path, mode, tabState.username);
    if (settings.openInNewTab) {
      window.open(url, '_blank');
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.update({ url });
    } else {
      window.location.href = url;
    }
  };

  const handleLogin = async () => {
    if (!settings.ecencyUsername) {
      setLoginError("Please enter a username.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const payload = createEcencyLoginPayload(settings.ecencyUsername);
      const messageStr = JSON.stringify(payload);

      // Helper to try login via Script Injection (Extension) or direct (Web)
      const performLogin = () => new Promise<any>((resolve, reject) => {
         if (typeof chrome !== 'undefined' && chrome.scripting) {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs: any[]) => {
               if (!tabs || tabs.length === 0 || !tabs[0].id) {
                  reject("No active tab found. Please open a website.");
                  return;
               }

               // Check for restricted URLs
               const url = tabs[0].url || '';
               if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('brave://') || url.startsWith('about:') || url.startsWith('moz-extension://')) {
                   reject("Login requires an active website tab. Please open any website (e.g. google.com) and try again.");
                   return;
               }

               try {
                   // Inject script into MAIN world to access window.hive_keychain
                   const results = await chrome.scripting.executeScript({
                       target: { tabId: tabs[0].id },
                       world: 'MAIN',
                       func: (u: string, m: string) => {
                           return new Promise((res) => {
                               const win = window as any;
                               if (typeof win.hive_keychain === 'undefined') {
                                   res({ success: false, error: 'KEYCHAIN_NOT_FOUND' });
                                   return;
                               }
                               try {
                                   win.hive_keychain.requestSignBuffer(
                                       u, m, 'Posting',
                                       (resp: any) => res({ success: true, result: resp })
                                   );
                               } catch (err: any) {
                                   res({ success: false, error: err.message || 'KEYCHAIN_EXCEPTION' });
                               }
                           });
                       },
                       args: [settings.ecencyUsername!, messageStr]
                   });
                   
                   if (results && results[0] && results[0].result) {
                       resolve(results[0].result);
                   } else {
                       // If result is null/undefined, it usually means the script returned undefined or failed silently
                       reject("Script execution returned no result. Refresh page?");
                   }
               } catch (e: any) {
                   const msg = e.message || '';
                   if (msg.includes('Cannot access a chrome:// URL') || msg.includes('Cannot access contents of url')) {
                        reject("Login requires an active website tab. Please open a regular website.");
                   } else {
                        reject(msg || "Script injection failed.");
                   }
               }
            });
         } else if (typeof window.hive_keychain !== 'undefined') {
            // Fallback for Web Mode
            window.hive_keychain.requestSignBuffer(
               settings.ecencyUsername,
               messageStr,
               'Posting',
               (resp: any) => resolve({ success: true, result: resp })
            );
         } else {
            reject("Hive Keychain not found.");
         }
      });

      const wrapperResp = await performLogin();

      if (!wrapperResp.success) {
         if (wrapperResp.error === 'KEYCHAIN_NOT_FOUND') {
            setLoginError("Hive Keychain not detected. Is it installed and unlocked?");
         } else {
            setLoginError(wrapperResp.error || "Login communication failed.");
         }
         return;
      }

      const response = wrapperResp.result;

      if (response.success) {
        const token = createEcencyToken(payload, response.result);
        const bootstrap = await bootstrapEcencyChat(settings.ecencyUsername, token);
        if (bootstrap && bootstrap.token) {
          updateSettings({
            ecencyAccessToken: token,
            ecencyChatToken: bootstrap.token,
            ecencyUserId: bootstrap.userId,
            ecencyRefreshToken: bootstrap.refreshToken
          });
          setChatSessionExpired(false);
          refreshChat();
        } else {
          setLoginError("Failed to bootstrap chat session.");
        }
      } else {
        setLoginError(response.message || "Login failed");
      }
    } catch (e: any) {
      setLoginError(typeof e === 'string' ? e : "An unexpected error occurred.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    updateSettings({
      ecencyAccessToken: '',
      ecencyChatToken: '',
      ecencyUserId: '',
      ecencyRefreshToken: '',
      rcUser: '' // Clear rcUser as well
    });
    setChannels([]);
    setUnreadCounts({}); // Clear unread counts
    setActiveChannel(null);
    setActiveMessages([]);
    setAccountStats(null); // Clear account stats
    if (typeof chrome !== 'undefined' && chrome.action) {
        chrome.action.setBadgeText({ text: '' });
    }
    // Clear persisted unread counts and channel states from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['unreadCounts', 'channelTotals', 'channelReadState']);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeChannel) return;
    setSendingMessage(true);
    try {
      const msg = await sendMessage(activeChannel.id, text, settings.ecencyChatToken);
      if (msg) {
        setActiveMessages(prev => [...prev, msg]);
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) setChatSessionExpired(true);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResolveUsers = async (ids: string[]) => {
    try {
      const resolved = await fetchUsersByIds(ids, settings.ecencyChatToken);
      if (Object.keys(resolved).length > 0) {
        setUserMap(prev => ({ ...prev, ...resolved }));
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) setChatSessionExpired(true);
    }
  };

  const handleEditMessage = async (id: string, text: string) => {
    if (!activeChannel) return;
    try {
      await editMessage(activeChannel.id, id, text, settings.ecencyChatToken);
    } catch (e) {
      if (e instanceof UnauthorizedError) setChatSessionExpired(true);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!activeChannel) return;
    try {
      const ok = await deleteMessage(activeChannel.id, id, settings.ecencyChatToken);
      if (ok) {
        setActiveMessages(prev => prev.filter(m => m.id !== id));
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) setChatSessionExpired(true);
    }
  };

  const handleToggleReaction = async (id: string, emoji: string) => {
    if (!activeChannel) return;
    try {
      const msg = activeMessages.find(m => m.id === id);
      const existing = msg?.metadata?.reactions?.find(r => r.emoji_name === emoji && r.user_id === settings.ecencyUserId);
      await toggleReaction(activeChannel.id, id, emoji, !existing, settings.ecencyChatToken);
    } catch (e) {
      if (e instanceof UnauthorizedError) setChatSessionExpired(true);
    }
  };

  const handleCreateDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmTarget) return;
    setCreatingDm(true);
    try {
      const result = await getOrCreateDirectChannel(dmTarget, settings.ecencyChatToken);
      if (result.success && result.channel) {
        handleSelectChannel(result.channel);
        setDmTarget('');
      } else {
        alert(result.error || "Failed to create DM");
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) setChatSessionExpired(true);
    } finally {
      setCreatingDm(false);
    }
  };

  const handleSelectChannel = (channel: Channel | null) => {
    setActiveChannel(channel);
    if (channel) {
      setActiveMessages([]);
      loadActiveMessages(channel.id);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const newUnreads = { ...unreadCounts, [channel.id]: 0 };
        setUnreadCounts(newUnreads);

        chrome.storage.local.get(['channelTotals', 'channelReadState'], (result: any) => {
          const totals = result.channelTotals || {};
          const readState = result.channelReadState || {};
          const currentTotal = totals[channel.id] || channel.total_msg_count || 0;
          const updatedReadState = { ...readState, [channel.id]: currentTotal };
          
          chrome.storage.local.set({ 
              channelReadState: updatedReadState,
              unreadCounts: newUnreads
          });
        });
      }
    }
  };

  if (initializing) {
    return (
      <div className="w-[380px] h-[600px] flex items-center justify-center bg-slate-50">
        <Activity className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="w-[380px] h-[600px] flex flex-col bg-slate-50 overflow-hidden font-sans border border-slate-200">
      <Header 
        username={settings.ecencyAccessToken ? settings.ecencyUsername : null}
        onLoginClick={() => setCurrentView(AppView.SETTINGS)}
        onLogoutClick={handleLogout}
      />
      
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {currentView === AppView.SWITCHER && (
            <SwitcherView 
              tabState={tabState} 
              onSwitch={handleSwitch} 
              frontendsList={settings.activeFrontendIds
                .map(id => FRONTENDS.find(f => f.id === id))
                .filter(Boolean)
              }
              updateSettings={updateSettings} // Pass updateSettings to SwitcherView
            />
            )}
            {currentView === AppView.SHARE && (
            <ShareView tabState={tabState} />
            )}
            {currentView === AppView.STATS && (
            <StatsView settings={settings} updateSettings={updateSettings} onDataFetched={updateBadgeFromData} />
            )}
            {currentView === AppView.CHAT && (
            <ChatView 
                settings={settings}
                channels={channels}
                loadingChat={loadingChat}
                chatSessionExpired={chatSessionExpired}
                isLoggingIn={isLoggingIn}
                refreshChat={refreshChat}
                onRefresh={() => activeChannel && loadActiveMessages(activeChannel.id)}
                handleCreateDM={handleCreateDM}
                handleKeychainLogin={handleLogin}
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
                userMap={userMap}
                onResolveUsers={handleResolveUsers}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleReaction={handleToggleReaction}
                unreadCounts={unreadCounts}
            />
            )}
            {currentView === AppView.APPS && (
            <AppsView />
            )}
            {currentView === AppView.SETTINGS && (
            <SettingsView 
                settings={settings} 
                updateSettings={updateSettings}
                onLogin={handleLogin}
                onLogout={handleLogout}
                isLoggingIn={isLoggingIn}
                loginError={loginError}
                allFrontends={FRONTENDS} // Pass the full FRONTENDS array
            />
            )}
        </div>
      </main>

      <BottomNav 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        unreadMessages={totalUnreadMessages}
      />
    </div>
  );
};

export default App;
