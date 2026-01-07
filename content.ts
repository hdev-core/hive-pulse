export {}; 

// This content script is kept as a placeholder.
// The login flow is now handled by direct script injection from the popup 
// using chrome.scripting.executeScript for better reliability and CSP bypass.

declare const chrome: any;

// Listen for messages from the Popup (optional, future use)
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response: any) => void) => {
  // Placeholder
});