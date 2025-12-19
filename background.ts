import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats } from './utils/hiveHelpers';
// Fixed error: Removed fetchMyChannelMembers as it is not exported from ecencyHelpers and is unused
import { 
  fetchChannels, 
  bootstrapEcencyChat, 
  refreshEcencySession, 
  getMmPatCookie, 
  fetchChannelPosts,
  fetchUnreads,
  fetchMe
} from './utils/ecencyHelpers';
import { ActionMode, AppSettings, FrontendId, Channel } from './types';

declare const chrome: any;

const ALARM_NAME = 'checkStatus';

const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  notificationsEnabled: true,
  notificationInterval: 1,
  badgeMetric: 'VP',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
  ecencyRefreshToken: ''
};

const setupAlarm = async () => {
  const stored = await chrome.storage.local.get(['settings']);
  const settings: AppSettings = stored.settings || DEFAULT_SETTINGS;

  await chrome.alarms.clear(ALARM_NAME);

  if (settings.notificationsEnabled) {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: settings.notificationInterval || 1
    });
  }
};

chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  checkStatus();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
  checkStatus();
});

const checkStatus = async () => {
  try {
    const stored = await chrome.storage.local.get(['settings', 'channelState', 'channelReadState']);
    let settings: AppSettings = stored.settings || DEFAULT_SETTINGS;
    const lastChannelState: Record<string, number> = stored.channelState || {};
    const channelReadState: Record<string, number> = stored.channelReadState || {};

    if (!settings.notificationsEnabled) {
      await chrome.storage.local.set({ unreadCounts: {} });
      chrome.action.setBadgeText({ text: '' });
      return;
    };

    let badgeSet = false;
    let authFailed = false;

    if (settings.ecencyUsername) {
       let tokenToUse = settings.ecencyChatToken;
       
       let channels = await fetchChannels(tokenToUse);
       let unreadResponse = channels ? await fetchUnreads(tokenToUse) : null;
       
       if (channels === null || unreadResponse === null) {
          let newTokens: { token: string; refreshToken?: string; userId?: string } | null = null;
          const cookieToken = await getMmPatCookie();

          if (cookieToken) {
              const validChannels = await fetchChannels(cookieToken);
              if (validChannels) {
                  const me = await fetchMe(cookieToken);
                  newTokens = { token: 'cookie-session', userId: me?.id };
              }
          }
          if (!newTokens && settings.ecencyRefreshToken) {
             const refreshed = await refreshEcencySession(settings.ecencyRefreshToken);
             if (refreshed) {
                const me = await fetchMe(refreshed.token);
                newTokens = { ...refreshed, userId: me?.id };
             }
          }
          if (!newTokens && settings.ecencyAccessToken) {
             const result = await bootstrapEcencyChat(
                settings.ecencyUsername,
                settings.ecencyAccessToken
             );
             if (result && result.token) {
                newTokens = {
                   token: result.token,
                   refreshToken: result.refreshToken,
                   userId: result.userId
                };
             }
          }

          if (newTokens) {
             const updatedSettings: AppSettings = { 
                ...settings, 
                ecencyChatToken: newTokens.token === 'cookie-session' ? '' : newTokens.token,
                ecencyRefreshToken: newTokens.refreshToken || settings.ecencyRefreshToken,
                ecencyUserId: newTokens.userId || settings.ecencyUserId
             };
             await chrome.storage.local.set({ settings: updatedSettings });
             settings = updatedSettings;
             
             tokenToUse = updatedSettings.ecencyChatToken;
             channels = await fetchChannels(tokenToUse);
             unreadResponse = channels ? await fetchUnreads(tokenToUse) : null;

          } else {
             authFailed = true;
          }
       }
       
       if (channels && unreadResponse) {
         const currentChannelTotals: Record<string, number> = {};
         if (unreadResponse.channels && Array.isArray(unreadResponse.channels)) {
            unreadResponse.channels.forEach((u) => {
                 if (u.channelId) {
                    currentChannelTotals[u.channelId] = u.message_count || 0;
                 }
             });
         }

         const unreadMap: Record<string, number> = {};
         let totalUnread = 0;
         for (const ch of channels) {
            const currentTotal = currentChannelTotals[ch.id] || 0;
            const readTotal = channelReadState[ch.id] || currentTotal; // On first run, assume all are read
            const unreadCount = Math.max(0, currentTotal - readTotal);
            
            if (unreadCount > 0) {
              unreadMap[ch.id] = unreadCount;
              totalUnread += unreadCount;
            }
         }
         
         await chrome.storage.local.set({ 
            unreadCounts: unreadMap,
            channelTotals: currentChannelTotals
         });
         
         const currentMap: Record<string, number> = {};
         const updates: Channel[] = [];

         for (const ch of channels) {
             const count = unreadMap[ch.id] || 0;
             ch.unread_count = count;

             const prev = lastChannelState[ch.id] || 0;
             const isFirstRunOrMigration = prev < 1000000000000;

             if (ch.last_post_at > prev) {
                 currentMap[ch.id] = ch.last_post_at;

                 if (!isFirstRunOrMigration && count > 0) {
                     try {
                         const { messages } = await fetchChannelPosts(ch.id, tokenToUse, 1);
                         
                         if (messages && messages.length > 0) {
                             const lastMsg = messages[messages.length - 1]; 
                             
                             let isMe = false;
                             if (settings.ecencyUserId && lastMsg.user_id === settings.ecencyUserId) {
                                isMe = true;
                             }

                             if (!isMe) {
                                 updates.push(ch);
                             }
                         } else {
                             updates.push(ch);
                         }
                     } catch (e) {
                         updates.push(ch);
                     }
                 }
             } else {
                 currentMap[ch.id] = Math.max(prev, ch.last_post_at);
             }
         }

         await chrome.storage.local.set({ channelState: currentMap, channels });

         if (totalUnread > 0) {
           const text = totalUnread > 99 ? '99+' : totalUnread.toString();
           chrome.action.setBadgeText({ text });
           chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
           badgeSet = true;
         }

         if (updates.length > 0) {
             handleNotifications(updates, settings.ecencyUserId);
         }
       }
    }

    if (!badgeSet && settings.rcUser) {
      if (authFailed) {
         chrome.action.setBadgeText({ text: '!' });
         chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
         badgeSet = true;
      } else {
          const data = await fetchAccountStats(settings.rcUser);
          if (data) {
            const metric = settings.badgeMetric || 'VP';
            const percent = metric === 'RC' ? data.rc.percentage : data.vp.percentage;
            const rounded = Math.round(percent);
            
            chrome.action.setBadgeText({ text: `${rounded}%` });
            
            let color = '#22c55e';
            if (rounded < 20) color = '#ef4444';
            else if (rounded < 50) color = '#f97316';
            
            chrome.action.setBadgeBackgroundColor({ color });
            badgeSet = true;
          }
      }
    } else if (authFailed && !badgeSet) {
       chrome.action.setBadgeText({ text: '!' });
       chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
       badgeSet = true;
    }

    if (!badgeSet) {
      chrome.action.setBadgeText({ text: '' });
    }

  } catch (e) {
    console.error('Failed to check status', e);
  }
};

const getChannelName = (channel: Channel, myId?: string) => {
    if (channel.type === 'D') {
      if (channel.teammate) return channel.teammate.username;
      
      if (channel.name && channel.name.includes('__') && myId) {
         const parts = channel.name.split('__');
         const other = parts.find(p => p !== myId);
         if (other) return other; 
      }
      return channel.display_name || 'Direct Message';
    }
    return channel.display_name || channel.name;
};

const handleNotifications = (channels: Channel[], myId?: string) => {
    const iconPath = chrome.runtime.getURL('icon.png');
    console.log('[HivePulse] Triggering Notification with icon:', iconPath);

    if (channels.length === 1) {
        const ch = channels[0];
        const name = getChannelName(ch, myId);
        
        chrome.notifications.create(`chat:${ch.id}:${Date.now()}`, {
            type: 'basic',
            iconUrl: iconPath, 
            title: `New Message from ${name}`,
            message: `You have new messages from ${name}.`,
            priority: 2,
            requireInteraction: true 
        }, (id) => {
           if (chrome.runtime.lastError) {
             console.error("Notification Error:", chrome.runtime.lastError);
           }
        });
    } else {
        chrome.notifications.create(`chat:group:${Date.now()}`, {
            type: 'basic',
            iconUrl: iconPath,
            title: 'HivePulse',
            message: `You have new messages in ${channels.length} conversations.`,
            priority: 2,
            requireInteraction: true
        });
    }
};

chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === ALARM_NAME) {
    checkStatus();
  }
});

chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
  if (areaName === 'local' && changes.settings) {
    const oldInt = changes.settings.oldValue?.notificationInterval;
    const newInt = changes.settings.newValue?.notificationInterval;
    const oldEn = changes.settings.oldValue?.notificationsEnabled;
    const newEn = changes.settings.newValue?.notificationsEnabled;

    if (oldInt !== newInt || oldEn !== newEn) {
        setupAlarm();
        if (newEn && !oldEn) checkStatus();
    }
  }
});

chrome.notifications.onClicked.addListener((notificationId: string) => {
    if (notificationId.startsWith('chat:')) {
        chrome.tabs.create({ url: 'https://ecency.com/chat' });
        chrome.notifications.clear(notificationId);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const stored = await chrome.storage.local.get(['settings']);
    const settings: AppSettings = stored.settings || DEFAULT_SETTINGS;

    if (!settings.autoRedirect || !settings.preferredFrontendId) return;

    const tabState = parseUrl(tab.url);

    if (
      tabState.isHiveUrl && 
      tabState.detectedFrontendId && 
      tabState.detectedFrontendId !== settings.preferredFrontendId
    ) {
      const newUrl = getTargetUrl(
        settings.preferredFrontendId,
        tabState.path,
        ActionMode.SAME_PAGE,
        tabState.username
      );

      if (newUrl && newUrl !== tab.url) {
        console.log(`[HivePulse] Redirecting to ${settings.preferredFrontendId}`);
        chrome.tabs.update(tabId, { url: newUrl });
      }
    }
  }
});