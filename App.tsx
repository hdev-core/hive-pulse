
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
import { CurrentTabState, FrontendId, ActionMode, AppSettings, AccountStats, AppView, Channel, Message, Reaction } from './types';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats Data
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);

  // Chat State
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatSessionExpired, setChatSessionExpired] = useState(false);
  const [dmTarget, setDmTarget] = useState('');
  const [creatingDm, setCreatingDm] = useState(false);
  
  // Chat Data State
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // User Cache: Maps internal ID -> Hive Username
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // Login State
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const stored = await chrome.storage.local.get(['settings']);
          if (stored.settings) {
            const savedSettings = { ...DEFAULT_SETTINGS, ...stored.settings };
            setSettings(savedSettings);
            
            // Populate user cache with self if known
            if (savedSettings.ecencyUserId && savedSettings.ecencyUsername) {
              setUserMap(prev => ({ 
                ...prev, 
                [savedSettings.ecencyUserId!]: savedSettings.ecencyUsername! 
              }));
            }
            
            if (savedSettings.rcUser) {
              fetchAccountStats(savedSettings.rcUser).then(data => {
                if (data) setAccountStats(data);
              });
            }
          }
        }

        if (typeof chrome === 'undefined' || !chrome.tabs) {
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
    
    // Update local user map if self-user changes
    if (updated.ecencyUserId && updated.ecencyUsername) {
       setUserMap(prev => ({ 
         ...prev, 
         [updated.ecencyUserId!]: updated.ecencyUsername! 
       }));
    }

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
      return null;
    }

    const doFetch = async (authToken?: string) => {
      // Fetch "Me" ID if missing
      if (!settings.ecencyUserId && authToken) {
         const me = await fetchMe(authToken);
         if (me && me.id) {
           updateSettings({ ecencyUserId: me.id });
         }
      }

      const list = await fetchChannels(authToken);
      if (list === null) return null;

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
      return sorted;
    };
    
    try {
      if (!forceBootstrap && token) {
         const list = await doFetch(token);
         if (list) {
           setLoadingChat(false);
           return list;
         }
      }

      const result = await bootstrapEcencyChat(username, accessToken);
      
      if (result && result.token) {
         const { token: newToken, userId } = result;
         updateSettings({ 
             ecencyChatToken: newToken,
             ecencyUserId: userId || settings.ecencyUserId // Prefer new ID, fallback to old
         });
         
         const list = await doFetch(newToken);
         if (!list) setChatSessionExpired(true);
         return list;
      } else {
         setChatSessionExpired(true);
         return null;
      }
    } catch (e) {
      console.error("Chat refresh failed", e);
      setChatSessionExpired(true);
      return null;
    } finally {
      setLoadingChat(false);
    }
  };

  /**
   * Helper to resolve IDs that are not yet in the userMap.
   * Updates state once resolved.
   */
  const resolveUnknownUsers = useCallback(async (ids: string[], knownCache?: Record<string, string>) => {
    if (!settings.ecencyChatToken) return;
    
    const missing = ids.filter(id => {
       if (userMap[id]) return false;
       if (knownCache && knownCache[id]) return false;
       return true;
    });

    if (missing.length === 0) return;

    const resolved = await fetchUsersByIds(missing, settings.ecencyChatToken);

    if (Object.keys(resolved).length > 0) {
       setUserMap(prev => ({ ...prev, ...resolved }));
    }
  }, [userMap, settings.ecencyChatToken]);

  const loadChannelMessages = async (channel: Channel) => {
    const myId = settings.ecencyUserId;
    
    if (channel.type === 'D' && myId && channel.name.includes('__')) {
       const parts = channel.name.split('__');
       if (parts.length === 2) {
         const otherId = parts.find(p => p !== myId);
         if (otherId && channel.display_name) {
            setUserMap(prev => ({ ...prev, [otherId]: channel.display_name }));
         }
       }
    }
    
    const { messages, users } = await fetchChannelPosts(channel.id, settings.ecencyChatToken);
    
    if (Object.keys(users).length > 0) {
       setUserMap(prev => ({ ...prev, ...users }));
    }

    setActiveMessages(messages);
    setLoadingMessages(false);

    const authorIds = [...new Set(messages.map(m => m.user_id))];
    resolveUnknownUsers(authorIds, users);
  };

  const handleSelectChannel = async (channel: Channel | null) => {
     setActiveChannel(channel);
     if (channel) {
        setLoadingMessages(true);
        setActiveMessages([]); // clear old
        await loadChannelMessages(channel);
     }
  };

  const handleRefreshActiveChat = async () => {
    if (!activeChannel) {
      refreshChat(true);
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
       const msgWithUser: Message = { 
         ...result, 
         message: text,
         create_at: result.create_at || Date.now(),
         user_id: settings.ecencyUserId || result.user_id
       };
       setActiveMessages(prev => [...prev, msgWithUser]);

       // Silent Refetch
       const { messages, users } = await fetchChannelPosts(activeChannel.id, settings.ecencyChatToken);
       if (Object.keys(users).length > 0) {
          setUserMap(prev => ({ ...prev, ...users }));
       }
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
    if (!activeChannel) return;

    let userId = settings.ecencyUserId;
    
    // Fallback ID Resolution
    if (!userId) {
       console.log('[App] User ID missing, attempting resolution...');
       
       // 1. Try to find myself in userMap
       if (settings.ecencyUsername) {
          const foundId = Object.entries(userMap).find(([id, name]) => name === settings.ecencyUsername)?.[0];
          if (foundId) {
             userId = foundId;
             updateSettings({ ecencyUserId: foundId });
          }
       }

       // 2. Try API fetchMe or fetchUserByUsername
       if (!userId && settings.ecencyChatToken) {
         try {
           const me = await fetchMe(settings.ecencyChatToken);
           if (me && me.id) {
             userId = me.id;
             updateSettings({ ecencyUserId: me.id });
           } else if (settings.ecencyUsername) {
             // Fallback: fetch user by username directly
             const user = await fetchUserByUsername(settings.ecencyUsername, settings.ecencyChatToken);
             if (user && user.id) {
                 userId = user.id;
                 updateSettings({ ecencyUserId: user.id });
             }
           }
         } catch (e) { console.error('[App] ID resolution failed', e); }
       }
    }

    if (!userId) {
       console.error('[App] Cannot toggle reaction: Unable to resolve User ID');
       return;
    }
    
    const originalMessages = [...activeMessages];
    
    // Optimistic Update
    setActiveMessages(prev => {
        const msgIndex = prev.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return prev;

        const message = prev[msgIndex];
        const reactions = message.metadata?.reactions || [];
        const myReaction = reactions.find(r => r.user_id === userId && r.emoji_name === emojiName);

        let newReactions = [...reactions];
        if (myReaction) {
           newReactions = newReactions.filter(r => r !== myReaction);
        } else {
           newReactions.push({ 
               user_id: userId!, 
               post_id: messageId, 
               emoji_name: emojiName, 
               create_at: Date.now() 
           });
        }

        const updatedMessage = {
           ...message,
           metadata: { ...message.metadata, reactions: newReactions }
        };

        const next = [...prev];
        next[msgIndex] = updatedMessage;
        return next;
    });

    try {
        const message = originalMessages.find(m => m.id === messageId);
        const hasReaction = message?.metadata?.reactions?.some(r => r.user_id === userId && r.emoji_name === emojiName);
        
        // If we have it, we remove it (shouldAdd=false). If we don't, we add it (shouldAdd=true).
        const shouldAdd = !hasReaction;
        
        const success = await toggleReaction(activeChannel.id, messageId, emojiName, shouldAdd, settings.ecencyChatToken);

        if (!success) {
            console.warn('[App] Reaction API failed, reverting.');
            setActiveMessages(originalMessages);
        }
    } catch (e) {
        console.error('[App] Reaction Error', e);
        setActiveMessages(originalMessages);
    }
  };

  const handleCreateDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmTarget.trim()) return;

    const targetUser = dmTarget.trim().toLowerCase().replace('@', '');

    const existing = channels.find(c => {
        if (c.type !== 'D') return false;
        if (c.teammate && c.teammate.username.toLowerCase() === targetUser) return true;
        if (c.display_name && c.display_name.toLowerCase().replace('@','').includes(targetUser)) return true;
        return false;
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
      
      if (!result.success && settings.ecencyUsername && settings.ecencyAccessToken) {
         if (!token || result.error?.toLowerCase().includes('session') || result.error?.toLowerCase().includes('expired')) {
           const bootstrapRes = await bootstrapEcencyChat(settings.ecencyUsername, settings.ecencyAccessToken);
           if (bootstrapRes && bootstrapRes.token) {
             const { token: newToken, userId } = bootstrapRes;
             updateSettings({ ecencyChatToken: newToken, ecencyUserId: userId || settings.ecencyUserId });
             result = await getOrCreateDirectChannel(targetUser, newToken);
           }
         }
      }

      if (result.success && result.channel) {
        setDmTarget('');
        const newChannel = result.channel;
        setChannels(prev => {
            const exists = prev.find(c => c.id === newChannel.id);
            if (exists) return prev;
            return [newChannel, ...prev];
        });
        handleSelectChannel(newChannel);
        refreshChat(true);

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

  // --- LOGIN ---
  
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
      const bootstrapRes = await bootstrapEcencyChat(userToLogin, hiveToken);
      
      if (bootstrapRes && bootstrapRes.token) {
         const { token: chatToken, userId: internalId } = bootstrapRes;
         const finalToken = chatToken === 'cookie-session' ? '' : chatToken;
         
         // If we didn't get ID from bootstrap, try fetching me or fallback
         let finalUserId = internalId;
         if (!finalUserId && finalToken) {
            const me = await fetchMe(finalToken);
            if (me) {
              finalUserId = me.id;
            } else {
              // Try fallback username lookup
              const user = await fetchUserByUsername(userToLogin, finalToken);
              if (user) finalUserId = user.id;
            }
         }

         updateSettings({ 
           ecencyUsername: userToLogin, 
           ecencyAccessToken: hiveToken,
           ecencyChatToken: finalToken,
           ecencyUserId: finalUserId || '',
           rcUser: userToLogin // SYNC STATS USER
         });

         if (finalUserId) {
            setUserMap(prev => ({ ...prev, [finalUserId]: userToLogin }));
         }

         fetchAccountStats(userToLogin).then(data => {
            if (data) {
                setAccountStats(data);
                updateBadgeFromData(data);
            }
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
      ecencyUsername: '', ecencyAccessToken: '', ecencyChatToken: '', ecencyRefreshToken: '', ecencyUserId: '' 
    });
    setUnreadMessages(null);
    setChannels([]);
    setActiveChannel(null);
    setUserMap({});
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
