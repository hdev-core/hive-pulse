
export enum FrontendId {
  PEAKD = 'PEAKD',
  ECENCY = 'ECENCY',
  HIVEBLOG = 'HIVEBLOG',
  INLEO = 'INLEO',
  ACTIFIT = 'ACTIFIT',
  WAIVIO = 'WAIVIO',
  LIKETU = 'LIKETU',
  HIVESCAN = 'HIVESCAN',
  THREESPEAK = 'THREESPEAK'
}

export enum ActionMode {
  SAME_PAGE = 'SAME_PAGE',
  WALLET = 'WALLET',
  COMPOSE = 'COMPOSE'
}

export enum AppView {
  SWITCHER = 'SWITCHER',
  SHARE = 'SHARE',
  STATS = 'STATS',
  CHAT = 'CHAT',
  WALLET = 'WALLET',
  SETTINGS = 'SETTINGS'
}

export interface PathConfig {
  compose: string;
  wallet: (username?: string) => string;
}

export interface LinkStructureConfig {
  post: string; // e.g., "/@{{author}}/{{permlink}}"
  profile: string; // e.g., "/@{{username}}"
  wallet: string; // e.g., "/@{{username}}/wallet"
  // Add other link types as needed
}

export interface FrontendConfig {
  id: FrontendId | string; // Allow string for custom frontend IDs
  name: string;
  domain: string;
  aliases: string[];
  color: string;
  textColor: string;
  description: string;
  paths: PathConfig;
  active: boolean; // Added active property
  isCustom?: boolean; // Flag for custom frontends
  logoUrl?: string; // URL for custom logo
  customDomain?: string; // Optional custom domain for custom frontends
  linkStructure?: LinkStructureConfig; // Link structure for custom frontends
}

export interface CurrentTabState {
  url: string;
  isHiveUrl: boolean;
  detectedFrontendId: FrontendId | string | null; // Allow string for custom frontend IDs
  path: string;
  username: string | null;
  author: string | null;
  permlink: string | null;
}

export interface DAppConfig {
  name: string;
  url: string;
  description: string;
  logo: string; // PNG filename
  category: 'Game' | 'DeFi' | 'Video' | 'Tool' | 'Social';
}

export interface AppSettings {
  autoRedirect: boolean;
  preferredFrontendId: FrontendId | string; // Allow string for custom frontend IDs
  openInNewTab: boolean;
  
  // Notification Settings
  notificationsEnabled: boolean;
  notificationInterval: number; // in minutes

  rcUser?: string;
  badgeMetric: 'RC' | 'VP';
  ecencyUsername?: string;
  ecencyAccessToken?: string; // Hive token (for bootstrap)
  ecencyChatToken?: string;   // Mattermost token (for chat)
  ecencyUserId?: string;      // Internal Mattermost User ID (for reliable 'isMe' check)
  ecencyRefreshToken?: string;
  overrideBadgeWithUnreadMessages: boolean;
  activeFrontendIds: (FrontendId | string)[]; // Added for ordered and active frontend IDs
  customFrontends: FrontendConfig[]; // New property to store custom frontends
}

export interface BalanceInfo {
  hive: number; // Liquid HIVE
  hbd: number; // Liquid HBD
  savingsHive: number; // HIVE in savings
  savingsHbd: number; // HBD in savings
  hivepower: number; // Staked HIVE (Hive Power / HP)
  pendingHive: number; // Pending HIVE rewards
  pendingHbd: number; // Pending HBD rewards
  delegatedHp?: number; // Delegated Hive Power (optional)
}

export interface AccountStats {
  username: string;
  rc: {
    percentage: number;
    current: number;
    max: number;
    isLow: boolean;
  };
  vp: {
    percentage: number;
    value: number; // 0-10000 basis points
    isLow: boolean;
  };
  balances?: BalanceInfo;
}

export interface Channel {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  team_id: string;
  type: 'O' | 'P' | 'D' | 'G'; // Open, Private, Direct, Group
  display_name: string;
  name: string;
  header: string;
  purpose: string;
  last_post_at: number;
  total_msg_count: number;
  extra_update_at: number;
  creator_id: string;
  // Enriched fields from Ecency Proxy
  unread_count?: number; 
  mention_count?: number;
  is_favorite?: boolean;
  last_viewed_at?: number; // Explicitly added for UI logic
  teammate?: {
    id: string;
    username: string;
  }
}

export interface Reaction {
  user_id: string;
  post_id: string;
  emoji_name: string;
  create_at: number;
}

export interface Message {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  user_id: string;
  channel_id: string;
  root_id: string;
  original_id: string;
  message: string;
  type: string;
  props: any;
  hashtag: string;
  file_ids: any[];
  pending_post_id: string;
  metadata: {
    embeds: any[];
    emojis: any[];
    files: any[];
    images: any[];
    reactions: Reaction[];
  };
  // API specific fields
  username?: string;
  sender_name?: string;
  // Injected field
  _username?: string;
}

export interface PostResponse {
  order: string[]; // array of post ids
  posts: Record<string, Message>; // map of id -> Message
}

export enum HiveNotificationType {
  REPLY = 'reply',
  MENTION = 'mention',
  FOLLOW = 'follow',
  VOTE = 'vote',
  REBLOG = 'reblog',
  TRANSFER = 'transfer',
  DELEGATIONS = 'delegations'
}

export interface HiveNotification {
  id: number;
  type: HiveNotificationType;
  score: number;
  date: string;
  msg: string;
  url: string;
  author: string; // The person who performed the action
  permlink?: string;
  amount?: string; // For transfers
  memo?: string; // For transfers
}

export interface HivePrices {
  exchange: number | null;
  internal: number | null;
}
