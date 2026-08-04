import { AppSettings, FrontendId, HiveNotificationType } from '../types';
import { FRONTENDS, HIVE_RPC_NODES, HIVE_ENGINE_RPC_NODES } from '../constants';

declare const chrome: any;

export const DEFAULT_SETTINGS: AppSettings = {
  autoRedirect: false,
  preferredFrontendId: FrontendId.PEAKD,
  openInNewTab: false,
  notificationsEnabled: true,
  notificationInterval: 1,
  rcUser: '',
  badgeMetric: 'VP',
  overlayMetric: 'RC',
  ecencyUsername: '',
  ecencyAccessToken: '',
  ecencyChatToken: '',
  ecencyUserId: '',
  ecencyRefreshToken: '',
  overrideBadgeWithUnreadMessages: true,
  usernameHoverCards: true,
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

const hasStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

export const readSettings = async (): Promise<AppSettings> => {
  if (!hasStorage()) return { ...DEFAULT_SETTINGS };
  const stored = await chrome.storage.local.get(['settings']);
  return { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
};

// Settings live as a single blob under one storage key, written from the popup, the
// sidebar and the background worker. Persisting a whole snapshot taken before an await
// reverts every key another context changed in the meantime — that is how a freshly
// added custom frontend could vanish. Always re-read immediately before writing and
// persist only the keys being changed.
let writeQueue: Promise<AppSettings> = Promise.resolve(DEFAULT_SETTINGS);

// storage.local persists via the structured clone algorithm, which REJECTS function values:
// Firefox throws DataCloneError and the entire write is lost, while Chrome's JSON path
// silently drops them — which is why a custom frontend (whose config used to carry a
// `paths.wallet` function) could never persist on Firefox but appeared fine on Chrome.
// Strip anything non-serializable so one bad value can never take the whole blob down again.
const toStorable = (settings: AppSettings): AppSettings => JSON.parse(JSON.stringify(settings));

export const patchSettings = (patch: Partial<AppSettings>): Promise<AppSettings> => {
  writeQueue = writeQueue
    .catch(() => DEFAULT_SETTINGS)
    .then(async () => {
      const merged = toStorable({ ...(await readSettings()), ...patch });
      if (hasStorage()) await chrome.storage.local.set({ settings: merged });
      return merged;
    })
    .catch(err => {
      // A failed write must never be silent: the UI updates its React state optimistically,
      // so a swallowed error here looks like the setting saved when it did not.
      console.error('[HivePulse] Failed to persist settings', Object.keys(patch), err);
      throw err;
    });
  return writeQueue;
};
