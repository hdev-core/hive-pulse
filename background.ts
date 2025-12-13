
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats } from './utils/hiveHelpers';
import { fetchUnreadChatCount, bootstrapEcencyChat } from './utils/ecencyHelpers';
import { ActionMode, AppSettings, FrontendId } from './types';

declare const chrome: any;

const ALARM_NAME = 'checkStatus';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  badgeMetric: 'VP',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
  ecencyRefreshToken: ''
};

// --- INITIALIZATION ---

chrome.runtime.onInstalled.addListener(() => {
  // Create alarm for periodic checks (every 15 minutes)
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 15
  });
  // Check immediately on install/reload
  updateGlobalBadge();
});

chrome.runtime.onStartup.addListener(() => {
  // Check immediately on browser startup
  updateGlobalBadge();
});

// --- UNIFIED BADGE MANAGER ---

const updateGlobalBadge = async () => {
  try {
    const stored = await chrome.storage.local.get(['settings']);
    const settings: AppSettings = stored.settings || DEFAULT_SETTINGS;

    // 1. Priority: Check Chat Unread Count
    if (settings.ecencyUsername && settings.ecencyAccessToken) {
       // Pass the stored chat token if available
       let unreadCount = await fetchUnreadChatCount(settings.ecencyChatToken);
       
       // If null, it might mean we are unauthorized (token expired or missing)
       // Try bootstrapping if we have the Hive access token
       if (unreadCount === null) {
          const result = await bootstrapEcencyChat(
             settings.ecencyUsername,
             settings.ecencyAccessToken
          );
          if (result && result.token) {
            const { token, userId } = result;
            // Save the new token for future use to avoid constant bootstrapping
            const newSettings = { 
                ...settings, 
                ecencyChatToken: token === 'cookie-session' ? '' : token,
                ecencyUserId: userId || settings.ecencyUserId 
            };
            await chrome.storage.local.set({ settings: newSettings });
            
            // Retry fetch
            unreadCount = await fetchUnreadChatCount(token === 'cookie-session' ? undefined : token);
          }
       }
       
       if (unreadCount !== null && unreadCount > 0) {
         // Show Message Badge (Blue)
         const text = unreadCount > 99 ? '99+' : unreadCount.toString();
         chrome.action.setBadgeText({ text });
         chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' }); // Ecency Blue
         return; // Stop here, messages take priority
       }
    }

    // 2. Secondary: Check RC/VP Stats
    if (settings.rcUser) {
      const data = await fetchAccountStats(settings.rcUser);
      if (data) {
        // Determine which metric to show
        const metric = settings.badgeMetric || 'VP';
        const percent = metric === 'RC' ? data.rc.percentage : data.vp.percentage;
        const rounded = Math.round(percent);
        
        // Set text
        chrome.action.setBadgeText({ text: `${rounded}%` });
        
        // Set color based on level
        let color = '#22c55e'; // Green
        if (rounded < 20) color = '#ef4444'; // Red
        else if (rounded < 50) color = '#f97316'; // Orange
        
        chrome.action.setBadgeBackgroundColor({ color });
        return;
      }
    }

    // 3. Fallback: Clear Badge
    chrome.action.setBadgeText({ text: '' });

  } catch (e) {
    console.error('Failed to update badge', e);
  }
};

// Check on alarm
chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === ALARM_NAME) {
    updateGlobalBadge();
  }
});

// Check when settings change (e.g. user sets a new user or changes badge preference)
chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
  if (areaName === 'local' && changes.settings) {
    updateGlobalBadge();
  }
});

// --- URL REDIRECT LOGIC ---

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: any, tab: any) => {
  // Only trigger when the page is loading to catch it early
  if (changeInfo.status === 'loading' && tab.url) {
    
    // 1. Fetch settings
    const stored = await chrome.storage.local.get(['settings']);
    const settings: AppSettings = stored.settings || DEFAULT_SETTINGS;

    // 2. Check if Auto-Redirect is enabled
    if (!settings.autoRedirect || !settings.preferredFrontendId) {
      return;
    }

    // 3. Analyze the current URL
    const tabState = parseUrl(tab.url);

    // 4. Conditions to redirect:
    // - It is a Hive URL
    // - We are not already on the preferred frontend
    // - We successfully detected which frontend we are currently on (to avoid redirecting generic sites)
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

      // 5. Perform Redirect
      if (newUrl && newUrl !== tab.url) {
        console.log(`[HiveSwitcher] Auto-redirecting from ${tabState.detectedFrontendId} to ${settings.preferredFrontendId}`);
        chrome.tabs.update(tabId, { url: newUrl });
      }
    }
  }
});
