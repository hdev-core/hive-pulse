import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { fetchAccountStats, fetchHivePrice, fetchInternalMarketPrice } from './utils/hiveHelpers';
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import {
  bootstrapEcencyChat,
  fetchChannels,
  getOrCreateDirectChannel,
  fetchChannelPosts,
  sendMessage,
  editMessage,
  deleteMessage,
  fetchUsersByIds,
  toggleReaction,
  fetchUnreads,
  setMmPatCookie,
  exchangeHsCode,
  UnauthorizedError
} from './utils/ecencyHelpers';
import { createEcencyLoginPayload, createEcencyToken } from './utils/ecencyLogin';
import { isHostPermissionError } from './utils/keychainHelpers';
import { CurrentTabState, FrontendId, ActionMode, AppSettings, AccountStats, AppView, Channel, Message, HivePrices, SavedAccount, HiveNotificationType } from './types';
import { FRONTENDS, HIVE_RPC_NODES, HIVE_ENGINE_RPC_NODES } from './constants';
import { Activity } from 'lucide-react';

// Components
import { Header } from './components/Header';
import { AddAccountModal } from './components/AddAccountModal';
import { BottomNav } from './components/BottomNav';
import { SwitcherView } from './components/views/SwitcherView';
import { ShareView } from './components/views/ShareView';
import { StatsView } from './components/views/StatsView';
import { ChatView } from './components/views/ChatView';
import { WalletView } from './components/views/WalletView';
import { TrendingView } from './components/views/TrendingView';
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
  overlayMetric: 'RC',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
  ecencyUserId: '',
  ecencyRefreshToken: '',
  overrideBadgeWithUnreadMessages: true,
  hiveNotificationBadgeEnabled: true,
  hiveNotificationFilterTypes: [
    HiveNotificationType.REPLY,
    HiveNotificationType.MENTION,
    HiveNotificationType.FOLLOW,
    HiveNotificationType.TRANSFER,
    HiveNotificationType.DELEGATIONS,
    HiveNotificationType.REBLOG,
  ],
  activeFrontendIds: FRONTENDS.map(f => f.id),
  customFrontends: [],
  hiveRpcNode: HIVE_RPC_NODES[0],
  heRpcNode: HIVE_ENGINE_RPC_NODES[0],
  customHiveRpcNodes: [],
  customHeRpcNodes: [],
  autoSwitchHiveNode: false,
  autoSwitchHeNode: false,
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
    username: null,
    author: null,
    permlink: null
  });
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [initializing, setInitializing] = useState(true);

  // Stats Data
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [hivePrices, setHivePrices] = useState<HivePrices>({ exchange: null, internal: null });

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

  // Multi-Account State
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  // Polling Reference
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const allFrontends = useMemo(() => [...FRONTENDS, ...settings.customFrontends], [settings.customFrontends]);

  // --- PRICE FETCHING ---
  const refreshPrices = useCallback(async () => {
    try {
      const [exchange, internal] = await Promise.all([
        fetchHivePrice(),
        fetchInternalMarketPrice()
      ]);
      setHivePrices({ exchange, internal });
    } catch (e) {
      console.error("Failed to refresh prices", e);
    }
  }, []);

  // --- BADGE LOGIC ---
  const updateBadge = useCallback((stats: AccountStats | null, unreads: Record<string, number>) => {
    if (typeof chrome === 'undefined' || !chrome.action) return;

    // Firefox clips wide emoji in the toolbar badge — drop them there and rely on
    // the badge colour + number (Chrome renders emoji fine, so keep them).
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

    const totalUnread = Object.values(unreads).reduce((sum, count) => sum + count, 0);

    // If overrideBadgeWithUnreadMessages is true, prioritize unread messages
    // Otherwise, skip message badge and go straight to stats badge logic
    if (settings.overrideBadgeWithUnreadMessages && totalUnread > 0) {
      const text = `${isFirefox ? '' : '💬'}${totalUnread > 9 ? '9+' : totalUnread}`;
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' }); // Blue for chat
    } else if (stats) {
      const metric = settings.badgeMetric || 'VP';
      const percent = metric === 'RC' ? stats.rc.percentage : stats.vp.percentage;
      const rounded = Math.round(percent);
      const isLow = rounded < 20;
      const icon = isFirefox ? '' : (metric === 'RC' ? '⚡' : '👍');

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
  // tokenOverride lets callers pass a fresh token when settings closure is stale (e.g. account switch)
  const refreshChat = async (tokenOverride?: string) => {
    const chatToken = tokenOverride || settings.ecencyChatToken;
    if (!chatToken) return;
    setLoadingChat(true);

    try {
      const [newChannels, unreadResp] = await Promise.all([
        fetchChannels(chatToken),
        fetchUnreads(chatToken)
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

  // Clear channels whenever the chat session becomes invalid so stale data is never shown
  useEffect(() => {
    if (chatSessionExpired) {
      setChannels([]);
      setUnreadCounts({});
    }
  }, [chatSessionExpired]);

  // --- HEARTBEAT EFFECT ---
  useEffect(() => {
    const shouldPoll = currentView === AppView.CHAT && settings.ecencyUsername && settings.ecencyChatToken && !chatSessionExpired;
    
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
  }, [currentView, activeChannel?.id, settings.ecencyChatToken, settings.ecencyUsername, chatSessionExpired]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const hydrate = async () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
           chrome.storage.local.get(['settings', 'channels', 'unreadCounts', 'savedAccounts'], (result: any) => {
              if (result.settings) {
                 const saved = { ...DEFAULT_SETTINGS, ...result.settings };
                 setSettings(saved);
                 if (saved.ecencyUserId && saved.ecencyUsername) {
                    setUserMap(prev => ({ ...prev, [saved.ecencyUserId!]: saved.ecencyUsername! }));
                 }
                 if (saved.rcUser) {
                    fetchAccountStats(saved.rcUser, saved).then(data => data && setAccountStats(data));
                 }
              }
              if (result.savedAccounts) {
                 setSavedAccounts(result.savedAccounts.accounts || []);
                 setActiveUsername(result.savedAccounts.activeUsername || null);
              }
              if (result.unreadCounts) setUnreadCounts(result.unreadCounts);
              setInitializing(false);
              const storedToken = result.settings?.ecencyChatToken;
              const hasVerifiedToken = storedToken && storedToken !== 'cookie-session' && storedToken !== '';
              if (hasVerifiedToken && result.settings?.ecencyUsername) {
                refreshChat(storedToken);
              } else if (result.settings?.ecencyUsername) {
                setChatSessionExpired(true);
              }
           });
        } catch (e) { setInitializing(false); }
      } else { setInitializing(false); }
    };
    hydrate();
    refreshPrices(); // Initial price fetch

    const storageListener = (changes: any, areaName: string) => {
      if (areaName === 'local') {
        if (changes.channels?.newValue) setChannels(changes.channels.newValue);
        if (changes.unreadCounts) setUnreadCounts(changes.unreadCounts.newValue || {});
        if (changes.settings) setSettings(prev => ({ ...prev, ...changes.settings.newValue }));
        if (changes.savedAccounts) {
          const store = changes.savedAccounts.newValue;
          if (store) {
            setSavedAccounts(store.accounts || []);
            setActiveUsername(store.activeUsername || null);
          }
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(storageListener);
    }
  }, []);

  // --- BACKGROUND STATS POLLING ---
  useEffect(() => {
    if (!settings.rcUser) return;

    const poll = async () => {
      const data = await fetchAccountStats(settings.rcUser!, settings);
      if (data) setAccountStats(data);
    };

    const interval = setInterval(poll, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [settings.rcUser]);

  // --- PRICE POLLING ---
  useEffect(() => {
    const interval = setInterval(refreshPrices, 60000); // Every 60 seconds
    return () => clearInterval(interval);
  }, [refreshPrices]);

  // Effect to parse URL when allFrontends or tab changes
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && allFrontends.length > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        if (tabs && tabs.length > 0 && tabs[0].url) {
          setTabState(parseUrl(tabs[0].url, allFrontends));
        }
      });
    }
  }, [allFrontends]); // Depend on allFrontends

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

  const persistSavedAccounts = (accounts: SavedAccount[], active: string | null) => {
    setSavedAccounts(accounts);
    setActiveUsername(active);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ savedAccounts: { accounts, activeUsername: active } });
    }
  };

  const handleSwitchAccount = async (username: string, accountsOverride?: SavedAccount[]) => {
    const list = accountsOverride ?? savedAccounts;
    const account = list.find(a => a.username === username);
    if (!account) return;

    // Kill the heartbeat immediately so the old token closure can't repopulate channels.
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setChannels([]);
    setUnreadCounts({});
    setActiveChannel(null);
    setActiveMessages([]);
    setAccountStats(null);
    setChatSessionExpired(false);

    const accountHasBearer = account.ecencyChatToken && account.ecencyChatToken !== 'cookie-session';
    if (account.mmPat) {
      await setMmPatCookie(account.mmPat);
    } else if (!accountHasBearer) {
      setChatSessionExpired(true);
    }

    const updatedSettings: AppSettings = {
      ...settings,
      ecencyUsername: account.username,
      ecencyAccessToken: account.ecencyAccessToken,
      ecencyChatToken: account.ecencyChatToken,
      ecencyUserId: account.ecencyUserId,
      ecencyRefreshToken: account.ecencyRefreshToken,
      rcUser: account.username,
    };

    setSettings(updatedSettings);
    if (account.ecencyUserId) {
      setUserMap(prev => ({ ...prev, [account.ecencyUserId]: account.username }));
    }
    persistSavedAccounts(list, username);
    fetchAccountStats(account.username, updatedSettings).then(data => data && setAccountStats(data));

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ settings: updatedSettings });
      chrome.storage.local.remove(['unreadCounts', 'channelTotals', 'channelReadState', 'channels'], () => {
        if (account.ecencyChatToken) refreshChat(account.ecencyChatToken);
      });
    } else if (account.ecencyChatToken) {
      refreshChat(account.ecencyChatToken);
    }
  };

  const handleRemoveAccount = (username: string) => {
    const filtered = savedAccounts.filter(a => a.username !== username);
    if (username === activeUsername) {
      if (filtered.length === 0) {
        handleLogout();
        persistSavedAccounts([], null);
      } else {
        handleSwitchAccount(filtered[0].username, filtered);
      }
    } else {
      persistSavedAccounts(filtered, activeUsername);
    }
  };


  const handleSwitch = (id: FrontendId | string, mode: ActionMode, usernameOverride?: string) => {
    const url = getTargetUrl(
      id,
      tabState.path,
      mode,
      usernameOverride || tabState.username,
      usernameOverride ? null : tabState.author, // Clear author if overriding user to avoid invalid post URLs
      usernameOverride ? null : tabState.permlink, // Clear permlink if overriding user
      allFrontends // New parameter
    );
    if (settings.openInNewTab) {
      window.open(url, '_blank');
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.update({ url });
    } else {
      window.location.href = url;
    }
  };

  const handleLogin = async (usernameOverride?: string) => {
    // usernameOverride must be a plain string; guard against React SyntheticEvent
    // being passed when handleLogin is used directly as an onClick handler
    const targetUsername = (typeof usernameOverride === 'string' ? usernameOverride : null) || settings.ecencyUsername;
    if (!targetUsername) {
      setLoginError("Please enter a username.");
      return;
    }
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const payload = createEcencyLoginPayload(targetUsername);
      const messageStr = JSON.stringify(payload);

      const performLogin = () => new Promise<any>((resolve, reject) => {
         if (typeof chrome !== 'undefined' && chrome.scripting) {

            const injectIntoTab = async (tabId: number, closeTabAfter?: number) => {
               try {
                  const results = await chrome.scripting.executeScript({
                     target: { tabId },
                     world: 'MAIN',
                     func: (u: string, m: string) => {
                        return new Promise((res) => {
                           const win = window as any;
                           if (typeof win.hive_keychain === 'undefined') {
                              res({ success: false, error: 'KEYCHAIN_NOT_FOUND' });
                              return;
                           }
                           try {
                              win.hive_keychain.requestSignBuffer(u, m, 'Posting', (resp: any) => res({ success: true, result: resp }));
                           } catch (err: any) {
                              res({ success: false, error: err.message || 'KEYCHAIN_EXCEPTION' });
                           }
                        });
                     },
                     args: [targetUsername, messageStr]
                  });
                  if (closeTabAfter) chrome.tabs.remove(closeTabAfter);
                  if (results && results[0] && results[0].result) {
                     resolve(results[0].result);
                  } else {
                     reject("Script execution returned no result.");
                  }
               } catch (e: any) {
                  const msg = e?.message || "Script injection failed.";
                  if (closeTabAfter) {
                     // Already in the fallback ecency tab — don't loop, give up.
                     chrome.tabs.remove(closeTabAfter);
                     reject(msg);
                     return;
                  }
                  // Active-tab injection failed. On Firefox, restricted hosts like
                  // addons.mozilla.org reject with a host-permission error even
                  // though the URL doesn't look restricted. Fall back to a
                  // background ecency.com tab (a host we always hold permission for).
                  if (isHostPermissionError(msg)) {
                     openBackgroundTabAndInject();
                  } else {
                     reject(msg);
                  }
               }
            };

            // Open ecency.com as a background tab (active: false keeps the popup open),
            // wait for it to load, inject, then close it.
            const openBackgroundTabAndInject = () => {
               chrome.tabs.create({ url: 'https://ecency.com', active: false }, (tab: any) => {
                  if (!tab?.id) { reject("Could not open background tab."); return; }
                  const tabId = tab.id;
                  const onUpdated = (updatedTabId: number, changeInfo: any) => {
                     if (updatedTabId === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(onUpdated);
                        injectIntoTab(tabId, tabId);
                     }
                  };
                  chrome.tabs.onUpdated.addListener(onUpdated);
               });
            };

            const isRestricted = (url: string) =>
               !url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('brave://') ||
               url.startsWith('about:') || url.startsWith('moz-extension://') || url.startsWith('chrome-extension://');

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
               const activeTab = tabs?.[0];
               if (activeTab?.id && !isRestricted(activeTab.url || '')) {
                  injectIntoTab(activeTab.id);
               } else {
                  // Active tab is restricted — open ecency.com silently in background
                  openBackgroundTabAndInject();
               }
            });

         } else if (typeof window.hive_keychain !== 'undefined') {
            window.hive_keychain.requestSignBuffer(targetUsername, messageStr, 'Posting', (resp: any) => resolve({ success: true, result: resp }));
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
        // The Keychain-signed payload is a HiveSigner "code". Chat bootstrap now
        // requires a real HiveSigner access token, so exchange the code first.
        const code = createEcencyToken(payload, response.result);
        const hsTokens = await exchangeHsCode(code);
        const accessToken = hsTokens?.access_token || code; // fall back to code if exchange is down
        const hsRefreshToken = hsTokens?.refresh_token;

        const bootstrap = await bootstrapEcencyChat(targetUsername, accessToken);
        const chatToken = bootstrap?.token || '';

        // Preserve any previously stored chat credentials — mm_pat tokens are valid for 30 days.
        // Discarding them on every re-login means losing a working session whenever bootstrap is down.
        const existingAccount = savedAccounts.find(a => a.username === targetUsername);
        const prevToken = existingAccount?.ecencyChatToken;
        const prevIsBearer = prevToken && prevToken !== 'cookie-session' && prevToken !== '';
        const effectiveChatToken = chatToken || (prevIsBearer ? prevToken : '') || '';
        const effectiveMmPat = bootstrap?.mmPat || existingAccount?.mmPat;
        const effectiveRefreshToken = hsRefreshToken || bootstrap?.refreshToken || existingAccount?.ecencyRefreshToken || '';

        const newAccount: SavedAccount = {
          username: targetUsername,
          ecencyAccessToken: accessToken,
          ecencyChatToken: effectiveChatToken,
          ecencyUserId: bootstrap?.userId || existingAccount?.ecencyUserId || '',
          ecencyRefreshToken: effectiveRefreshToken,
          mmPat: effectiveMmPat,
        };
        const updatedAccounts = [...savedAccounts.filter(a => a.username !== targetUsername), newAccount];
        const updatedSettings: AppSettings = {
          ...settings,
          ecencyUsername: targetUsername,
          ecencyAccessToken: accessToken,
          ecencyChatToken: effectiveChatToken,
          ecencyUserId: bootstrap?.userId || existingAccount?.ecencyUserId,
          ecencyRefreshToken: effectiveRefreshToken,
          rcUser: targetUsername,
        };
        setSettings(updatedSettings);
        const resolvedUserId = bootstrap?.userId || existingAccount?.ecencyUserId;
        if (resolvedUserId) setUserMap(prev => ({ ...prev, [resolvedUserId]: targetUsername }));
        persistSavedAccounts(updatedAccounts, targetUsername);
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ settings: updatedSettings });
        }
        setAddingAccount(false);

        // Chat is usable if bootstrap succeeded OR we preserved a valid Bearer token
        const hasUsableToken = !!bootstrap || (effectiveChatToken && effectiveChatToken !== 'cookie-session');
        if (hasUsableToken) {
          if (effectiveMmPat) await setMmPatCookie(effectiveMmPat);
          setChatSessionExpired(false);
          refreshChat(effectiveChatToken);
        } else {
          setChatSessionExpired(true);
          setChannels([]);
          setUnreadCounts({});
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(['channels', 'unreadCounts', 'channelTotals', 'channelReadState']);
          }
        }
      } else {
        setLoginError(response.message || "Login failed");
      }
    } catch (e: any) {
      setLoginError(typeof e === 'string' ? e : (e?.message || "An unexpected error occurred."));
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
      chrome.storage.local.remove(['unreadCounts', 'channelTotals', 'channelReadState', 'channels']);
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
        stats={accountStats}
        prices={hivePrices}
        savedAccounts={savedAccounts}
        activeUsername={activeUsername}
        onSwitchAccount={handleSwitchAccount}
        onRemoveAccount={handleRemoveAccount}
        onAddAccount={() => setAddingAccount(true)}
      />
      {addingAccount && (
        <AddAccountModal
          isLoggingIn={isLoggingIn}
          loginError={loginError}
          onLogin={handleLogin}
          onClose={() => { setAddingAccount(false); setLoginError(null); }}
        />
      )}
      
      <main className="flex-1 overflow-hidden relative flex flex-col isolate">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {currentView === AppView.SWITCHER && (
            <SwitcherView 
              tabState={tabState} 
              onSwitch={handleSwitch} 
              allFrontends={allFrontends} // Pass all frontends
              updateSettings={updateSettings}
              settings={settings} // Pass settings for filtering active frontends
            />
            )}
            {currentView === AppView.SHARE && (
            <ShareView tabState={tabState} allFrontends={allFrontends} />
            )}
            {currentView === AppView.NOTIFICATIONS && (
            <StatsView key={settings.rcUser || settings.ecencyUsername} settings={settings} allFrontends={allFrontends} />
            )}
            {currentView === AppView.CHAT && (
            <ChatView
                key={settings.ecencyUsername}
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
            {currentView === AppView.WALLET && (
            <WalletView key={settings.rcUser || settings.ecencyUsername} settings={settings} updateSettings={updateSettings} onDataFetched={updateBadgeFromData} />
            )}
            {currentView === AppView.TRENDING && (
            <TrendingView settings={settings} allFrontends={allFrontends} />
            )}
            {currentView === AppView.SETTINGS && (
            <SettingsView 
                settings={settings} 
                updateSettings={updateSettings}
                onLogin={handleLogin}
                onLogout={handleLogout}
                isLoggingIn={isLoggingIn}
                loginError={loginError}
                allFrontends={[...FRONTENDS, ...settings.customFrontends]} // Combine predefined and custom frontends
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
