
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats, fetchHivePrice, fetchInternalMarketPrice, fetchNotifications } from './utils/hiveHelpers';
import {
  fetchChannels,
  bootstrapEcencyChat,
  refreshEcencySession,
  getMmPatCookie,
  fetchChannelPosts,
  fetchUnreads,
  fetchMe,
  UnauthorizedError
} from './utils/ecencyHelpers';
import { ActionMode, AppSettings, FrontendId, Channel, HivePrices, HiveNotificationType } from './types';
import { FRONTENDS } from './constants';

import { HIVE_RPC_NODES, HIVE_ENGINE_RPC_NODES } from './constants';

declare const chrome: any;

const ALARM_NAME = 'checkStatus';

const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  notificationsEnabled: true,
  notificationInterval: 1,
  badgeMetric: 'VP',
  overlayMetric: 'RC',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
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
    const stored = await chrome.storage.local.get(['settings', 'channelState', 'channelReadState', 'lastSeenHiveNotifId', 'lastShownHiveNotifId']);
    let settings: AppSettings = stored.settings || DEFAULT_SETTINGS;
    const lastChannelState: Record<string, number> = stored.channelState || {};
    const channelReadState: Record<string, number> = stored.channelReadState || {};

    let badgeSet = false;
    let authFailed = false;

    if (settings.notificationsEnabled && settings.ecencyUsername) {
      try {
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
         const updatedReadState = { ...channelReadState };
         let stateChanged = false;

         for (const ch of channels) {
            const currentTotal = currentChannelTotals[ch.id] || 0;

            // Initialization baseline if not yet present in storage
            if (updatedReadState[ch.id] === undefined) {
               updatedReadState[ch.id] = currentTotal;
               stateChanged = true;
            }

            const readTotal = updatedReadState[ch.id];
            const unreadCount = Math.max(0, currentTotal - readTotal);

            if (unreadCount > 0) {
              unreadMap[ch.id] = unreadCount;
              totalUnread += unreadCount;
            }
         }

         const storageUpdate: any = {
            unreadCounts: unreadMap,
            channelTotals: currentChannelTotals
         };
         if (stateChanged) storageUpdate.channelReadState = updatedReadState;
         await chrome.storage.local.set(storageUpdate);

         const currentMap: Record<string, number> = {};
         const notificationChannels: Channel[] = [];

         for (const ch of channels) {
             const count = unreadMap[ch.id] || 0;
             ch.unread_count = count;

             const prevLastPost = lastChannelState[ch.id] || 0;
             const isFirstRun = prevLastPost < 1000000;

             if (ch.last_post_at > prevLastPost) {
                 currentMap[ch.id] = ch.last_post_at;

                 if (!isFirstRun && count > 0) {
                     try {
                         const { messages } = await fetchChannelPosts(ch.id, tokenToUse, 1);
                         if (messages && messages.length > 0) {
                             const lastMsg = messages[messages.length - 1];
                             const isMe = settings.ecencyUserId === lastMsg.user_id;
                             if (!isMe) notificationChannels.push(ch);
                         }
                     } catch (e) {
                         notificationChannels.push(ch);
                     }
                 }
             } else {
                 currentMap[ch.id] = prevLastPost;
             }
         }

         await chrome.storage.local.set({ channelState: currentMap, channels });

         if (settings.overrideBadgeWithUnreadMessages && totalUnread > 0) {
           const text = totalUnread > 9 ? `💬9+` : `💬${totalUnread}`;
           chrome.action.setBadgeText({ text });
           chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
           badgeSet = true;
         }

         if (notificationChannels.length > 0) {
             handleNotifications(notificationChannels, settings.ecencyUserId);
         }
       }
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          authFailed = true;
        } else {
          console.error('Chat check failed', e);
        }
      }
    }

    // Poll Hive blockchain notifications
    if (!badgeSet && settings.hiveNotificationBadgeEnabled && settings.rcUser) {
      const lastSeenId: number | undefined = stored.lastSeenHiveNotifId;
      const lastShownId: number | undefined = stored.lastShownHiveNotifId;
      const filterTypes: HiveNotificationType[] = settings.hiveNotificationFilterTypes?.length
        ? settings.hiveNotificationFilterTypes
        : [HiveNotificationType.REPLY, HiveNotificationType.MENTION, HiveNotificationType.FOLLOW,
           HiveNotificationType.TRANSFER, HiveNotificationType.DELEGATIONS, HiveNotificationType.REBLOG];
      try {
        const hiveNotifs = await fetchNotifications(settings.rcUser, 10, null, settings);
        if (hiveNotifs.length > 0) {
          const latestId = hiveNotifs[0].id;
          if (lastSeenId === undefined) {
            // First run: set baseline, no badge
            await chrome.storage.local.set({ lastSeenHiveNotifId: latestId, lastShownHiveNotifId: latestId });
          } else {
            // Notifications unread by the user
            const unreadNotifs = hiveNotifs.filter(n => n.id > lastSeenId && filterTypes.includes(n.type));
            // Of those, only ones we haven't already shown a badge for
            const freshNotifs = unreadNotifs.filter(n => n.id > (lastShownId ?? 0));
            if (freshNotifs.length > 0) {
              const text = freshNotifs.length > 9 ? '🔔9+' : `🔔${freshNotifs.length}`;
              chrome.action.setBadgeText({ text });
              chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
              badgeSet = true;
              // Advance the shown pointer so the same batch doesn't block VP/RC next tick
              await chrome.storage.local.set({ lastShownHiveNotifId: latestId });
              const iconPath = chrome.runtime.getURL('icon.png');
              chrome.notifications.create(`hive:${freshNotifs[0].id}`, {
                type: 'basic',
                iconUrl: iconPath,
                title: 'HivePulse — New Notification',
                message: freshNotifs[0].msg || 'You have new Hive notifications.',
                priority: 2,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to poll Hive notifications', e);
      }
    }

    // Always refresh RC/VP stats when a user is monitored — the on-page overlay
    // and content script depend on this data regardless of what the icon badge shows.
    if (settings.rcUser) {
      const data = await fetchAccountStats(settings.rcUser, settings);
      if (data) {
        // Persist RC + VP so the content script can read them without its own API call
        chrome.storage.local.set({
          rcStats: {
            username:   data.username,
            percentage: data.rc.percentage,
            current:    data.rc.current,
            max:        data.rc.max,
            vp:         data.vp.percentage,
          }
        });
        // Only drive the icon badge if nothing higher-priority (chat/notifications) claimed it
        if (!badgeSet) {
          const metric = settings.badgeMetric || 'VP';
          const percent = metric === 'RC' ? data.rc.percentage : data.vp.percentage;
          const rounded = Math.round(percent);
          const isLow = rounded < 20;
          const icon = metric === 'RC' ? '⚡' : '👍';
          const text = `${icon}${rounded}`;
          chrome.action.setBadgeText({ text });
          if (isLow) {
            chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
          } else {
            const color = metric === 'RC' ? '#a855f7' : '#10b981';
            chrome.action.setBadgeBackgroundColor({ color });
          }
          badgeSet = true;
        }
      }
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
  if (areaName === 'local') {
    if (changes.settings) {
        setupAlarm();
        checkStatus();
    }
    if (changes.channelReadState || changes.unreadCounts || changes.lastSeenHiveNotifId) {
        checkStatus();
    }
  }
});

chrome.notifications.onClicked.addListener((notificationId: string) => {
    if (notificationId.startsWith('chat:')) {
        chrome.tabs.create({ url: 'https://ecency.com/chat' });
        chrome.notifications.clear(notificationId);
    } else if (notificationId.startsWith('hive:')) {
        chrome.action.openPopup?.();
        chrome.notifications.clear(notificationId);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const stored = await chrome.storage.local.get(['settings']);
    const settings: AppSettings = stored.settings || DEFAULT_SETTINGS;

    if (!settings.autoRedirect || !settings.preferredFrontendId) return;

    const allFrontends = [...FRONTENDS, ...(settings.customFrontends || [])];
    const tabState = parseUrl(tab.url, allFrontends);

    if (
      tabState.isHiveUrl && 
      tabState.detectedFrontendId && 
      tabState.detectedFrontendId !== settings.preferredFrontendId
    ) {
      const newUrl = getTargetUrl(
        settings.preferredFrontendId,
        tabState.path,
        ActionMode.SAME_PAGE,
        tabState.username,
        tabState.author,
        tabState.permlink,
        allFrontends
      );

      if (newUrl && newUrl !== tab.url) {
        chrome.tabs.update(tabId, { url: newUrl });
      }
    }
  }
});
