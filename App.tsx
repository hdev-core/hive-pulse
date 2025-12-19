
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
            
            unreadResp.channels.forEach(u => {
              if (u.channelId) {
                const currentTotal = u.message_count || 0;
                currentTotals[u.channelId] = currentTotal;

                if (newReadState[u.channelId] === undefined) {
                    newReadState[u.channelId] = currentTotal;
                    counts[u.channelId] = 0;
                } else {
                    const diff = Math.max(0, currentTotal - newReadState[u.channelId]);
                    counts[u.channelId] = diff;
                }
              }
            });

            setUnreadCounts(counts);
            chrome.storage.local.set({ 
                unreadCounts: counts, 
                channelReadState: newReadState,
                channelTotals: currentTotals
            });
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
    if (typeof chrome !== 'undefined' && chrome.action) {
       // Only update badge if there are no chat unreads
       if (totalUnreadMessages === 0) {
           const metric = settings.badgeMetric || 'VP';
           const percent = metric === 'RC' ? data.rc.percentage : data.vp.percentage;
           const rounded = Math.round(percent);
           chrome.action.setBadgeText({ text: `${rounded}%` });
           let color = '#22c55e';
           if (rounded < 20) color = '#ef4444';
           else if (rounded < 50) color = '#f97316';
           chrome.action.setBadgeBackgroundColor({ color });
       }
    }
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
      if (typeof window.hive_keychain !== 'undefined') {
        window.hive_keychain.requestSignBuffer(
          settings.ecencyUsername,
          JSON.stringify(payload),
          'Posting',
          async (response: any) => {
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
            setIsLoggingIn(false);
          }
        );
      } else {
        setLoginError("Hive Keychain not found.");
        setIsLoggingIn(false);
      }
    } catch (e) {
      setLoginError("An unexpected error occurred.");
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    updateSettings({
      ecencyAccessToken: '',
      ecencyChatToken: '',
      ecencyUserId: '',
      ecencyRefreshToken: ''
    });
    setChannels([]);
    setActiveChannel(null);
    setActiveMessages([]);
    if (typeof chrome !== 'undefined' && chrome.action) {
        chrome.action.setBadgeText({ text: '' });
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
        chrome.storage.local.get(['channelTotals', 'channelReadState'], (result: any) => {
          const totals = result.channelTotals || {};
          const readState = result.channelReadState || {};
          
          // Get current absolute total from recently fetched state or channel object
          const currentTotal = totals[channel.id] || channel.total_msg_count || 0;
          
          // Commit new read point to storage so background script sees it as read
          const updatedReadState = { ...readState, [channel.id]: currentTotal };
          
          // Optimistically clear unreads for this channel in UI
          const newUnreads = { ...unreadCounts, [channel.id]: 0 };
          setUnreadCounts(newUnreads);

          // Calculate total remaining across all channels
          const totalRemaining = Object.values(newUnreads).reduce((a, b) => a + b, 0);
          
          chrome.storage.local.set({ 
              channelReadState: updatedReadState,
              unreadCounts: newUnreads
          });

          // Immediate badge cleanup if everything is read
          if (totalRemaining === 0) {
              chrome.action.setBadgeText({ text: '' });
          } else {
              const text = totalRemaining > 99 ? '99+' : totalRemaining.toString();
              chrome.action.setBadgeText({ text });
          }
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
      <Header />
      
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {currentView === AppView.SWITCHER && (
            <SwitcherView tabState={tabState} onSwitch={handleSwitch} />
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
