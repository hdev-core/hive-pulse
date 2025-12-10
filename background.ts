import { parseUrl, getTargetUrl } from './utils/urlHelpers';
import { ActionMode, AppSettings, FrontendId } from './types';

declare const chrome: any;

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false
};

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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