declare const chrome: any;

export interface KeychainResult {
  success: boolean;
  error?: string;
}

// Injects a function into the active tab's MAIN world and calls a hive_keychain method.
// Returns a promise that resolves with the Keychain callback result.
async function executeKeychainScript<TArgs extends any[]>(
  tabId: number,
  func: (...args: TArgs) => Promise<KeychainResult>,
  args: TArgs
): Promise<KeychainResult> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func,
    args,
  });
  const r = results?.[0]?.result as KeychainResult | undefined;
  if (!r) return { success: false, error: 'No response from Keychain.' };
  if ((r as any).error === 'KEYCHAIN_NOT_FOUND') return { success: false, error: 'Hive Keychain not found. Is it installed and unlocked?' };
  return r;
}

async function getActiveTabId(): Promise<number | null> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const tab = tabs?.[0];
      if (!tab?.id) { resolve(null); return; }
      const url = tab.url || '';
      if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('edge://')) {
        resolve(null);
      } else {
        resolve(tab.id);
      }
    });
  });
}

// Fallback for web/dev context where Keychain is on window directly
function webKeychainBroadcast(
  username: string,
  operations: any[],
  keyType: string
): Promise<KeychainResult> {
  return new Promise(resolve => {
    const kc = (window as any).hive_keychain;
    if (!kc) { resolve({ success: false, error: 'Hive Keychain not found.' }); return; }
    kc.requestBroadcast(username, operations, keyType, (r: any) => {
      resolve({ success: r.success, error: r.message });
    });
  });
}

function webKeychainTransfer(
  from: string, to: string, amount: string, memo: string, currency: string
): Promise<KeychainResult> {
  return new Promise(resolve => {
    const kc = (window as any).hive_keychain;
    if (!kc) { resolve({ success: false, error: 'Hive Keychain not found.' }); return; }
    kc.requestTransfer(from, to, amount, memo, currency, (r: any) => {
      resolve({ success: r.success, error: r.message });
    });
  });
}

export async function broadcastKeychainOp(
  username: string,
  operations: any[],
  keyType: 'Posting' | 'Active' = 'Active'
): Promise<KeychainResult> {
  if (typeof chrome !== 'undefined' && chrome.scripting) {
    const tabId = await getActiveTabId();
    if (!tabId) return { success: false, error: 'Please open a regular website tab first, then retry.' };
    try {
      return await executeKeychainScript(
        tabId,
        (u: string, ops: any[], kt: string): Promise<KeychainResult> => new Promise(resolve => {
          const kc = (window as any).hive_keychain;
          if (!kc) { resolve({ success: false, error: 'KEYCHAIN_NOT_FOUND' }); return; }
          kc.requestBroadcast(u, ops, kt, (r: any) => resolve({ success: r.success, error: r.message }));
        }),
        [username, operations, keyType]
      );
    } catch (e: any) {
      return { success: false, error: e.message || 'Script injection failed.' };
    }
  }
  return webKeychainBroadcast(username, operations, keyType);
}

export async function requestKeychainTransfer(
  from: string,
  to: string,
  amount: string,
  memo: string,
  currency: 'HIVE' | 'HBD'
): Promise<KeychainResult> {
  if (typeof chrome !== 'undefined' && chrome.scripting) {
    const tabId = await getActiveTabId();
    if (!tabId) return { success: false, error: 'Please open a regular website tab first, then retry.' };
    try {
      return await executeKeychainScript(
        tabId,
        (f: string, t: string, a: string, m: string, c: string): Promise<KeychainResult> => new Promise(resolve => {
          const kc = (window as any).hive_keychain;
          if (!kc) { resolve({ success: false, error: 'KEYCHAIN_NOT_FOUND' }); return; }
          kc.requestTransfer(f, t, a, m, c, (r: any) => resolve({ success: r.success, error: r.message }));
        }),
        [from, to, amount, memo, currency]
      );
    } catch (e: any) {
      return { success: false, error: e.message || 'Script injection failed.' };
    }
  }
  return webKeychainTransfer(from, to, amount, memo, currency);
}
