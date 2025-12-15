import React, { useEffect, useState, useCallback } from 'react';
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
  fetchUserByUsername,
  fetchUsersByIds,
  toggleReaction
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

  const refreshChat = async (forceBootstrap = false) => {
    // This function can now be simplified or just trigger a background refresh
    // For now, we'll keep a simplified version for immediate UI feedback
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.getBackgroundPage((bg: any) => {
        bg.checkStatus();
      });
    }
  };

  // --- INITIALIZATION & STORAGE SYNC ---
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
              if (result.channels) {
                setChannels(result.channels);
              }
              if (result.unreadCounts) {
                setUnreadCounts(result.unreadCounts);
              }
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

    // Listen for storage changes from the background script
    const storageListener = (changes: any, areaName: string) => {
      if (areaName === 'local') {
        if (changes.channels) {
          setChannels(changes.channels.newValue || []);
        }
        if (changes.unreadCounts) {
          setUnreadCounts(changes.unreadCounts.newValue || {});
        }
        if (changes.settings) {
          setSettings(prev => ({ ...prev, ...changes.settings.newValue }));
        }
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
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
       if (totalUnreadMessages > 0) return;

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

  const resolveUnknownUsers = useCallback(async (ids: string[], knownCache?: Record<string, string>) => {
    if (!settings.ecencyChatToken) return;
    
    const missing = ids.filter(id => !(userMap[id] || (knownCache && knownCache[id])));
    if (missing.length === 0) return;

    const resolved = await fetchUsersByIds(missing, settings.ecencyChatToken);
    if (Object.keys(resolved).length > 0) {
       setUserMap(prev => ({ ...prev, ...resolved }));
    }
  }, [userMap, settings.ecencyChatToken]);

  const loadChannelMessages = async (channel: Channel) => {
    if (channel.type === 'D' && settings.ecencyUserId && channel.name.includes('__')) {
       const otherId = channel.name.split('__').find(p => p !== settings.ecencyUserId);
       if (otherId && channel.display_name) {
          setUserMap(prev => ({ ...prev, [otherId]: channel.display_name }));
       }
    }
    
    const { messages, users } = await fetchChannelPosts(channel.id, settings.ecencyChatToken);
    
    if (Object.keys(users).length > 0) setUserMap(prev => ({ ...prev, ...users }));

    setActiveMessages(messages);
    setLoadingMessages(false);

    const authorIds = [...new Set(messages.map(m => m.user_id))];
    resolveUnknownUsers(authorIds, users);
  };

  const handleSelectChannel = async (channel: Channel | null) => {
     setActiveChannel(channel);
     if (channel) {
        // Mark channel as read
        chrome.storage.local.get(['channelTotals', 'channelReadState'], (result: any) => {
          const totals = result.channelTotals || {};
          const readState = result.channelReadState || {};
          if (totals[channel.id]) {
            const updatedReadState = { ...readState, [channel.id]: totals[channel.id] };
            chrome.storage.local.set({ channelReadState: updatedReadState });
          }
        });
        // Optimistically update UI
        setUnreadCounts(prev => ({ ...prev, [channel.id]: 0 }));

        setLoadingMessages(true);
        setActiveMessages([]); 
        await loadChannelMessages(channel);
     }
  };

  const handleRefreshActiveChat = async () => {
    if (!activeChannel) {
      refreshChat();
      return;
    }
    setLoadingMessages(true);
    await loadChannelMessages(activeChannel);
  };

  const handleSendMessage = async (text: string) => {
    if (!activeChannel) return;
    setSendingMessage(true);
    
    const result = await sendMessage(activeChannel.id, text, settings.ecencyChatToken);
    
    if (result) {
       setActiveMessages(prev => [...prev, { ...result, message: text, create_at: result.create_at || Date.now(), user_id: settings.ecencyUserId || result.user_id }]);
       // Silent refetch for consistency
       const { messages, users } = await fetchChannelPosts(activeChannel.id, settings.ecencyChatToken);
       if (Object.keys(users).length > 0) setUserMap(prev => ({ ...prev, ...users }));
       setActiveMessages(messages);
    } else {
       alert("Failed to send message.");
    }
    setSendingMessage(false);
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!activeChannel) return;
    const originalMessages = [...activeMessages];
    setActiveMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: newText } : m));
    const result = await editMessage(activeChannel.id, messageId, newText, settings.ecencyChatToken);
    if (!result) {
        setActiveMessages(originalMessages);
        alert("Failed to edit message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeChannel) return;
    const originalMessages = [...activeMessages];
    setActiveMessages(prev => prev.filter(m => m.id !== messageId));
    const success = await deleteMessage(activeChannel.id, messageId, settings.ecencyChatToken);
    if (!success) {
         setActiveMessages(originalMessages);
         alert("Failed to delete message");
    }
  };

  const handleToggleReaction = async (messageId: string, emojiName: string) => {
    let userId = settings.ecencyUserId;
    if (!userId && settings.ecencyUsername) {
      const foundId = Object.entries(userMap).find(([, name]) => name === settings.ecencyUsername)?.[0];
      if (foundId) {
        userId = foundId;
        updateSettings({ ecencyUserId: foundId });
      }
    }
    if (!activeChannel || !userId) return;
    
    const originalMessages = [...activeMessages];
    setActiveMessages(prev => {
        const msgIndex = prev.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return prev;
        const message = prev[msgIndex];
        const reactions = message.metadata?.reactions || [];
        const myReaction = reactions.find(r => r.user_id === userId && r.emoji_name === emojiName);
        const newReactions = myReaction ? reactions.filter(r => r !== myReaction) : [...reactions, { user_id: userId!, post_id: messageId, emoji_name: emojiName, create_at: Date.now() }];
        const updatedMessage = { ...message, metadata: { ...message.metadata, reactions: newReactions } };
        return [...prev.slice(0, msgIndex), updatedMessage, ...prev.slice(msgIndex + 1)];
    });

    try {
        const message = originalMessages.find(m => m.id === messageId);
        const hasReaction = message?.metadata?.reactions?.some(r => r.user_id === userId && r.emoji_name === emojiName);
        await toggleReaction(activeChannel.id, messageId, emojiName, !hasReaction, settings.ecencyChatToken);
    } catch (e) {
        setActiveMessages(originalMessages);
    }
  };

  const handleCreateDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmTarget.trim()) return;
    const targetUser = dmTarget.trim().toLowerCase().replace('@', '');
    const existing = channels.find(c => {
        if (c.type !== 'D') return false;
        if (c.teammate?.username.toLowerCase() === targetUser) return true;
        return c.display_name?.toLowerCase().replace('@','').includes(targetUser);
    });
    if (existing) {
        setDmTarget('');
        handleSelectChannel(existing);
        return;
    }
    setCreatingDm(true);
    try {
      let token = settings.ecencyChatToken;
      let result = await getOrCreateDirectChannel(targetUser, token);
      if (!result.success && settings.ecencyUsername && settings.ecencyAccessToken && (!token || result.error?.toLowerCase().includes('session') || result.error?.toLowerCase().includes('expired'))) {
         const bootstrapRes = await bootstrapEcencyChat(settings.ecencyUsername, settings.ecencyAccessToken);
         if (bootstrapRes?.token) {
           const { token: newToken, userId } = bootstrapRes;
           updateSettings({ ecencyChatToken: newToken, ecencyUserId: userId || settings.ecencyUserId });
           result = await getOrCreateDirectChannel(targetUser, newToken);
         }
      }
      if (result.success && result.channel) {
        setDmTarget('');
        const newChannel = result.channel;
        setChannels(prev => [newChannel, ...prev.filter(c => c.id !== newChannel.id)]);
        handleSelectChannel(newChannel);
        refreshChat();
      } else {
        alert(result.error || 'Could not create DM.');
      }
    } catch (e) {
      alert('Error creating chat.');
    } finally {
      setCreatingDm(false);
    }
  };

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
      if (!tab?.id || tab.url?.match(/^(chrome|edge|about|data|chrome-extension):/)) {
        setLoginError("Please open a regular website to use Keychain.");
        setIsLoggingIn(false);
        return;
      }
      const payload = createEcencyLoginPayload(userToLogin);
      const messageToSign = JSON.stringify(payload);
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: (username: string, message: string) => new Promise((resolve) => {
          // @ts-ignore
          if (!window.hive_keychain) return resolve({ success: false, error: 'Hive Keychain not found.' });
          // @ts-ignore
          window.hive_keychain.requestSignBuffer(username, message, 'Posting', (resp: any) => resolve(resp));
        }),
        args: [userToLogin, messageToSign]
      });
      if (!result?.result?.success) {
        setLoginError(result?.result?.error || "Login canceled.");
        setIsLoggingIn(false);
        return;
      }
      const { result: signature } = result.result;
      const hiveToken = createEcencyToken(payload, signature);
      const bootstrapRes = await bootstrapEcencyChat(userToLogin, hiveToken);
      if (bootstrapRes?.token) {
         const { token: chatToken, userId, refreshToken } = bootstrapRes;
         updateSettings({ 
           ecencyUsername: userToLogin, 
           ecencyAccessToken: hiveToken,
           ecencyChatToken: chatToken === 'cookie-session' ? '' : chatToken,
           ecencyUserId: userId || '',
           ecencyRefreshToken: refreshToken || '',
           rcUser: userToLogin
         });
         if (userId) setUserMap(prev => ({ ...prev, [userId]: userToLogin }));
         fetchAccountStats(userToLogin).then(data => {
            if (data) {
                setAccountStats(data);
                updateBadgeFromData(data);
            }
         });
         setLoginError(null);
         setChatSessionExpired(false);
         if (currentView === AppView.CHAT) {
           setTimeout(() => refreshChat(), 100);
         } else {
           setCurrentView(AppView.CHAT);
         }
      } else {
         setLoginError("Failed to initialize chat session.");
      }
    } catch (e) {
      setLoginError("Unexpected error.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    updateSettings({ ecencyUsername: '', ecencyAccessToken: '', ecencyChatToken: '', ecencyRefreshToken: '', ecencyUserId: '' });
    setChannels([]);
    setActiveChannel(null);
    setUserMap({});
    setUnreadCounts({});
  };

  useEffect(() => {
    if (accountStats) {
      updateBadgeFromData(accountStats);
    }
  }, [settings.badgeMetric, accountStats, totalUnreadMessages]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 text-slate-800 font-sans">
      <Header />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
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
                unreadCounts={unreadCounts}
                loadingChat={loadingChat}
                chatSessionExpired={chatSessionExpired}
                isLoggingIn={isLoggingIn}
                refreshChat={refreshChat}
                onRefresh={handleRefreshActiveChat}
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
                userMap={userMap}
                onResolveUsers={resolveUnknownUsers}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleReaction={handleToggleReaction}
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
