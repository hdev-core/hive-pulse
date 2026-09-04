
import { parseUrl, getTargetUrl, frontendIsStandard } from './utils/urlHelpers';
import { fetchAccountStats, fetchAccountCard, fetchNotifications, fetchRcOperationCosts } from './utils/hiveHelpers';
import { assessRecipient } from './utils/scamShield';
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
import { readSettings, patchSettings } from './utils/settingsStore';

import { HIVE_RPC_NODES, HIVE_ENGINE_RPC_NODES } from './constants';

declare const chrome: any;

// Firefox clips wide emoji in the toolbar badge — strip them there; Chrome renders them fine.
const IS_FIREFOX = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);

const ALARM_NAME = 'checkStatus';

const setupAlarm = async () => {
  const settings = await readSettings();

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

// checkStatus writes unreadCounts/channelReadState, which the storage listener below also
// watches — without a guard the two feed each other into a permanent loop of overlapping
// runs, and every overlapping run is another chance to persist a stale settings snapshot.
let checkInFlight = false;
let checkQueued = false;

const checkStatus = async () => {
  if (checkInFlight) {
    checkQueued = true;
    return;
  }
  checkInFlight = true;
  try {
    await runCheckStatus();
  } finally {
    checkInFlight = false;
    if (checkQueued) {
      checkQueued = false;
      checkStatus();
    }
  }
};

const runCheckStatus = async () => {
  try {
    const stored = await chrome.storage.local.get(['channelState', 'channelReadState', 'lastSeenHiveNotifId', 'lastShownHiveNotifId']);
    let settings: AppSettings = await readSettings();
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
             // Persist only the token keys. `settings` was read before several seconds of
             // network calls above; writing that whole snapshot back would revert anything
             // the popup changed in the meantime (e.g. a just-added custom frontend).
             const updatedSettings = await patchSettings({
                ecencyChatToken: newTokens.token === 'cookie-session' ? '' : newTokens.token,
                ecencyRefreshToken: newTokens.refreshToken || settings.ecencyRefreshToken,
                ecencyUserId: newTokens.userId || settings.ecencyUserId
             });
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
           const text = `${IS_FIREFOX ? '' : '💬'}${totalUnread > 9 ? '9+' : totalUnread}`;
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
              const text = `${IS_FIREFOX ? '' : '🔔'}${freshNotifs.length > 9 ? '9+' : freshNotifs.length}`;
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
        // Refresh the calibrated per-op RC costs for the on-page overlay tooltip.
        // (The popup caches these per-account; the overlay reads this global key.)
        const costs = await fetchRcOperationCosts(data.username);
        if (costs) chrome.storage.local.set({ rcOperationCosts: costs });
        // Only drive the icon badge if nothing higher-priority (chat/notifications) claimed it
        if (!badgeSet) {
          const metric = settings.badgeMetric || 'VP';
          const percent = metric === 'RC' ? data.rc.percentage : data.vp.percentage;
          const rounded = Math.round(percent);
          const isLow = rounded < 20;
          const icon = IS_FIREFOX ? '' : (metric === 'RC' ? '⚡' : '👍');
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

// Settings keys checkStatus actually depends on. Anything else — a custom frontend, a
// redirect preference — must not kick off a network poll.
const CHECK_RELEVANT_SETTINGS: (keyof AppSettings)[] = [
  'notificationsEnabled', 'notificationInterval', 'ecencyUsername', 'ecencyAccessToken',
  'ecencyChatToken', 'ecencyRefreshToken', 'ecencyUserId', 'overrideBadgeWithUnreadMessages',
  'hiveNotificationBadgeEnabled', 'hiveNotificationFilterTypes', 'badgeMetric', 'rcUser',
  'hiveRpcNode',
];

const changed = (change: any): boolean =>
  !!change && JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue);

chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
  if (areaName !== 'local') return;

  if (changed(changes.settings)) {
    const before = changes.settings.oldValue || {};
    const after = changes.settings.newValue || {};
    const relevant = CHECK_RELEVANT_SETTINGS.some(
      k => JSON.stringify(before[k]) !== JSON.stringify(after[k])
    );
    if (relevant) {
      setupAlarm();
      checkStatus();
    }
  }

  // unreadCounts is deliberately not watched: checkStatus writes it itself, so reacting to
  // it re-triggers checkStatus forever. The read-state keys are only written by the popup
  // (mark-as-read), and the equality check stops a no-op write from re-arming the poll.
  if (changed(changes.channelReadState) || changed(changes.lastSeenHiveNotifId)) {
    checkStatus();
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

// ── Username hover cards ─────────────────────────────────────────────────────
// content.ts is a classic script and cannot import shared modules, so it asks us for the
// card instead of pulling in the RPC helpers and the 900-entry bad-actor list on every
// page. Doing it here also means one cache rather than one per tab.
const CARD_TTL_MS = 5 * 60 * 1000;
const cardCache = new Map<string, { at: number; card: any }>();

const getAccountCard = async (username: string) => {
  const key = username.toLowerCase();
  const hit = cardCache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CARD_TTL_MS) return hit.card;

  const settings = await readSettings();
  const profile = await fetchAccountCard(key, settings);
  if (!profile) return null;

  const risk = assessRecipient(key);
  const card = { ...profile, risk: risk.level, riskReason: risk.reason };
  cardCache.set(key, { at: now, card });
  return card;
};

chrome.runtime.onMessage.addListener((msg: any, _sender: any, sendResponse: (r: any) => void) => {
  if (msg?.type === 'HP_ACCOUNT_CARD' && typeof msg.username === 'string') {
    getAccountCard(msg.username)
      .then(card => sendResponse({ ok: true, card }))
      .catch(() => sendResponse({ ok: false, card: null }));
    return true; // keep the message channel open for the async reply
  }
  return false;
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const settings: AppSettings = await readSettings();

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
        allFrontends,
        tabState.isHiveUrl,
        frontendIsStandard(allFrontends.find(f => f.id === tabState.detectedFrontendId))
      );

      // '#' is getTargetUrl's "no such frontend" answer — reachable whenever
      // preferredFrontendId outlives its config (a removed custom frontend, settings
      // carried over from another profile). Redirecting to it is never right.
      if (newUrl && newUrl !== '#' && newUrl !== tab.url) {
        chrome.tabs.update(tabId, { url: newUrl });
      }
    }
  }
});
