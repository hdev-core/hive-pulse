
export {}; 

// This content script is kept as a placeholder or for potential future DOM interactions 
// that might require persistent listeners, but the login flow is now handled 
// by direct script execution from the popup for better reliability.

declare const chrome: any;

// Listen for messages from the Popup
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response: any) => void) => {
  // Placeholder for future message handling
});
