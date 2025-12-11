
import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { fetchAccountStats } from './utils/hiveHelpers';
import { ActionMode, AppSettings, FrontendId } from './types';

declare const chrome: any;

const ALARM_NAME = 'checkRC';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  badgeMetric: 'VP'
};

// --- INITIALIZATION ---

chrome.runtime.onInstalled.addListener(() => {
  // Create alarm for periodic RC/VP checks (every 15 minutes)
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 15
  });
  // Check immediately on install/reload
  updateStatsBadge();
});

chrome.runtime.onStartup.addListener(() => {
  // Check immediately on browser startup
  updateStatsBadge();
});

// --- STATS MONITORING ---

const updateStatsBadge = async () => {
  try {
    const stored = await chrome.storage.local.get(['settings']);
    const settings: AppSettings = stored.settings || DEFAULT_SETTINGS;
    
    if (settings && settings.rcUser) {
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
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (e) {
    console.error('Failed to update stats badge', e);
  }
};

// Check on alarm
chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === ALARM_NAME) {
    updateStatsBadge();
  }
});

// Check when settings change (e.g. user sets a new user or changes badge preference)
chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
  if (areaName === 'local' && changes.settings) {
    updateStatsBadge();
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
