
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchRC } from './utils/hiveHelpers';
import { ActionMode, AppSettings, FrontendId } from './types';

declare const chrome: any;

const ALARM_NAME = 'checkRC';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false
};

// --- INITIALIZATION ---

chrome.runtime.onInstalled.addListener(() => {
  // Create alarm for periodic RC checks (every 15 minutes)
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 15
  });
  // Check immediately on install/reload
  updateRCBadge();
});

chrome.runtime.onStartup.addListener(() => {
  // Check immediately on browser startup
  updateRCBadge();
});

// --- RC MONITORING ---

const updateRCBadge = async () => {
  try {
    const stored = await chrome.storage.local.get(['settings']);
    const settings: AppSettings = stored.settings;
    
    if (settings && settings.rcUser) {
      const data = await fetchRC(settings.rcUser);
      if (data) {
        const percent = Math.round(data.percentage);
        
        // Set text
        chrome.action.setBadgeText({ text: `${percent}%` });
        
        // Set color based on level
        let color = '#22c55e'; // Green
        if (percent < 20) color = '#ef4444'; // Red
        else if (percent < 50) color = '#f97316'; // Orange
        
        chrome.action.setBadgeBackgroundColor({ color });
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    console.error('Failed to update RC badge', e);
  }
};

// Check on alarm
chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === ALARM_NAME) {
    updateRCBadge();
  }
});

// Check when settings change (e.g. user sets a new RC user)
chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
  if (areaName === 'local' && changes.settings) {
    updateRCBadge();
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
