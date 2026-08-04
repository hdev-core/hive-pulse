import { assessOperations, assessRecipient } from './scamShield';

declare const chrome: any;

export interface KeychainResult {
  success: boolean;
  error?: string;
}

/** Raised when the Scam Shield refuses to sign. Callers surface `error` verbatim. */
export const SCAM_SHIELD_BLOCKED = 'SCAM_SHIELD_BLOCKED';

// Every signed operation in the extension funnels through broadcastKeychainOp or
// requestKeychainTransfer, so this is the one place a send to a known drainer can be
// stopped for good — including from op types added later, which is why the guard lives
// here and not in the individual forms. Only hard BLOCKS are enforced at this layer;
// softer impersonation warnings are a UI decision the user gets to overrule.
//
// The block is overridable, deliberately. It is the user's money, the list is a
// third-party feed (Hive condenser's BadActorList), and a false positive with no way
// through would just read as "the extension is broken". `acknowledgedRisk` is the caller
// promising it showed the warning and the user chose to proceed anyway — so the default
// stays safe for any call site that has not thought about it.
export interface SignOptions {
  acknowledgedRisk?: boolean;
}

const blockedRecipient = (assessments: { level: string; recipient: string; reason: string }[]) =>
  assessments.find(a => a.level === 'blocked');

const refuse = (recipient: string, reason: string): KeychainResult => ({
  success: false,
  error: `${SCAM_SHIELD_BLOCKED}: @${recipient} — ${reason}`,
});

function isRestrictedUrl(url: string): boolean {
  return (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('brave://') ||
    url.startsWith('about:') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('chrome-extension://')
  );
}

// Inject func into tabId. If closeAfter is true, removes the tab when done.
async function executeInTab<TArgs extends any[]>(
  tabId: number,
  func: (...args: TArgs) => Promise<KeychainResult>,
  args: TArgs,
  closeAfter = false
): Promise<KeychainResult> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func,
      args,
    });
    const r = results?.[0]?.result as KeychainResult | undefined;
    if (!r) return { success: false, error: 'No response from Keychain.' };
    if ((r as any).error === 'KEYCHAIN_NOT_FOUND') {
      return { success: false, error: 'Hive Keychain not found. Is it installed and unlocked?' };
    }
    return r;
  } catch (e: any) {
    return { success: false, error: e.message || 'Script injection failed.' };
  } finally {
    if (closeAfter) {
      try { chrome.tabs.remove(tabId); } catch {}
    }
  }
}

// A host-permission failure means we can't inject into the active tab — e.g. in
// side-panel mode (no activeTab grant) when the tab's host isn't in
// host_permissions (hivescan.info, arbitrary sites). We recover via ecency.com.
export function isHostPermissionError(msg?: string): boolean {
  return !!msg && /cannot access|host permission|must request permission|access this host|access the respective host|missing host/i.test(msg);
}

// Open ecency.com (a host we always hold permission for) in a background tab,
// wait for load, inject, then close it.
function runInEcencyTab<TArgs extends any[]>(
  func: (...args: TArgs) => Promise<KeychainResult>,
  args: TArgs
): Promise<KeychainResult> {
  return new Promise(resolve => {
    chrome.tabs.create({ url: 'https://ecency.com', active: false }, (tab: any) => {
      if (!tab?.id) {
        resolve({ success: false, error: 'Could not open background tab for Keychain.' });
        return;
      }
      const tabId = tab.id;
      const onUpdated = (updatedTabId: number, changeInfo: any) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          executeInTab(tabId, func, args, true).then(resolve);
        }
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

// 1. Use the active tab if it's not a restricted URL.
// 2. If that injection fails for lack of host permission (common in side-panel
//    mode on hosts outside host_permissions), fall back to an ecency.com tab.
// 3. Restricted active tab → go straight to the ecency.com fallback.
function runWithKeychainTab<TArgs extends any[]>(
  func: (...args: TArgs) => Promise<KeychainResult>,
  args: TArgs
): Promise<KeychainResult> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
      const activeTab = tabs?.[0];
      if (activeTab?.id && !isRestrictedUrl(activeTab.url || '')) {
        executeInTab(activeTab.id, func, args).then(r => {
          if (!r.success && isHostPermissionError(r.error)) {
            runInEcencyTab(func, args).then(resolve);
          } else {
            resolve(r);
          }
        });
      } else {
        runInEcencyTab(func, args).then(resolve);
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
  keyType: 'Posting' | 'Active' = 'Active',
  opts: SignOptions = {}
): Promise<KeychainResult> {
  if (!opts.acknowledgedRisk) {
    const blocked = blockedRecipient(assessOperations(username, operations));
    if (blocked) return refuse(blocked.recipient, blocked.reason);
  }

  if (typeof chrome !== 'undefined' && chrome.scripting) {
    return runWithKeychainTab(
      (u: string, ops: any[], kt: string): Promise<KeychainResult> => new Promise(resolve => {
        const kc = (window as any).hive_keychain;
        if (!kc) { resolve({ success: false, error: 'KEYCHAIN_NOT_FOUND' }); return; }
        kc.requestBroadcast(u, ops, kt, (r: any) => resolve({ success: r.success, error: r.message }));
      }),
      [username, operations, keyType]
    );
  }
  return webKeychainBroadcast(username, operations, keyType);
}

export async function requestKeychainTransfer(
  from: string,
  to: string,
  amount: string,
  memo: string,
  currency: 'HIVE' | 'HBD',
  opts: SignOptions = {}
): Promise<KeychainResult> {
  if (!opts.acknowledgedRisk) {
    const risk = assessRecipient(to);
    if (risk.level === 'blocked') return refuse(risk.recipient, risk.reason);
  }

  if (typeof chrome !== 'undefined' && chrome.scripting) {
    return runWithKeychainTab(
      (f: string, t: string, a: string, m: string, c: string): Promise<KeychainResult> => new Promise(resolve => {
        const kc = (window as any).hive_keychain;
        if (!kc) { resolve({ success: false, error: 'KEYCHAIN_NOT_FOUND' }); return; }
        kc.requestTransfer(f, t, a, m, c, (r: any) => resolve({ success: r.success, error: r.message }));
      }),
      [from, to, amount, memo, currency]
    );
  }
  return webKeychainTransfer(from, to, amount, memo, currency);
}
