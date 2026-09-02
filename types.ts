
export enum FrontendId {
  PEAKD = 'PEAKD',
  ECENCY = 'ECENCY',
  HIVEBLOG = 'HIVEBLOG',
  INLEO = 'INLEO',
  ACTIFIT = 'ACTIFIT',
  WAIVIO = 'WAIVIO',
  LIKETU = 'LIKETU',
  HIVESCAN = 'HIVESCAN',
  THREESPEAK = 'THREESPEAK',
  UREKA = 'UREKA',
  SLOTHBUZZ = 'SLOTHBUZZ'
}

export enum ActionMode {
  SAME_PAGE = 'SAME_PAGE',
  WALLET = 'WALLET',
  COMPOSE = 'COMPOSE'
}

export enum AppView {
  SWITCHER = 'SWITCHER',
  SHARE = 'SHARE',
  NOTIFICATIONS = 'NOTIFICATIONS',
  CHAT = 'CHAT',
  WALLET = 'WALLET',
  TRENDING = 'TRENDING',
  SETTINGS = 'SETTINGS'
}

// Ranking metadata attached to posts coming from the HAF FYP service.
export interface FypScore {
  rank: number;
  finalScore: number;
  boostSource: string | null;        // e.g. "subscribed" — why the post was surfaced
  scoreRecency: number | null;
  scoreRelevance: number | null;     // null on the global (unpersonalized) feed
  scoreEngagement: number | null;
  scoreCredibility: number | null;
  communityBoostApplied: boolean;
}

export interface TrendingPost {
  author: string;
  permlink: string;
  title: string;
  pendingPayout: number;
  totalPayout: number;
  votes: number;
  comments: number;
  created: string;
  tags: string[];
  fyp?: FypScore;                     // present only for "For You" posts
}

export interface TrendingCommunity {
  name: string;      // e.g. "hive-194913"
  title: string;     // display name
  about: string;
  subscribers: number;
  numAuthors: number;
  numPending: number;
  sumPending: number;
}

export interface PathConfig {
  compose: string;
  // Built-in frontends only. Custom frontends resolve their wallet path from
  // linkStructure instead — they must stay free of functions, because settings are
  // persisted via storage.local, whose structured clone rejects function values
  // (Firefox throws DataCloneError; Chrome's JSON path silently drops them).
  wallet?: (username?: string) => string;
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

export interface SavedAccount {
  username: string;
  ecencyAccessToken: string;
  ecencyChatToken: string;
  ecencyUserId: string;
  ecencyRefreshToken: string;
  mmPat?: string; // mm_pat cookie value — swapped on account switch for correct chat session
}

export interface AppSettings {
  autoRedirect: boolean;
  preferredFrontendId: FrontendId | string; // Allow string for custom frontend IDs
  openInNewTab: boolean;
  
  // Notification Settings
  notificationsEnabled: boolean;
  notificationInterval: number; // in minutes
  hiveNotificationBadgeEnabled: boolean;
  hiveNotificationFilterTypes: HiveNotificationType[];

  rcUser?: string;
  badgeMetric: 'RC' | 'VP';
  overlayMetric?: 'RC' | 'VP' | 'both' | 'off'; // on-page floating badge: which metric to show (default RC)
  hiveRpcNode?: string;
  heRpcNode?: string;
  customHiveRpcNodes?: string[];
  customHeRpcNodes?: string[];
  autoSwitchHiveNode?: boolean;
  autoSwitchHeNode?: boolean;
  ecencyUsername?: string;
  ecencyAccessToken?: string; // Hive token (for bootstrap)
  ecencyChatToken?: string;   // Mattermost token (for chat)
  ecencyUserId?: string;      // Internal Mattermost User ID (for reliable 'isMe' check)
  ecencyRefreshToken?: string;
  overrideBadgeWithUnreadMessages: boolean;
  /** Show the @username hover card on Hive frontends. Opt-out; some people find it noisy. */
  usernameHoverCards?: boolean;
  /**
   * Show the post analyzer panel on supported compose pages. Opt-out: it runs constantly
   * while you write, and not everyone wants it there for every post.
   */
  postAnalyzerEnabled?: boolean;
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
  pendingVests: number; // Pending VESTS rewards (needed for claim_reward_balance)
  delegatedHp?: number; // Delegated Hive Power (optional)
  receivedDelegations?: number; // HP received from other accounts (optional)
  savingsHbdLastInterestPayment?: string; // ISO timestamp of last HBD savings interest payment
}

export interface TransferRecord {
  trxId: string;
  timestamp: string;
  from: string;
  to: string;
  amount: string;
  memo: string;
}

export interface AccountStats {
  username: string;
  rc: {
    percentage: number;
    current: number;
    max: number;
    isLow: boolean;
    vestingRatio: number; // totalVestingFundHive / hivepower — scales absolute RC costs
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
  DELEGATIONS = 'delegations',
  // From condenser_api.get_account_history
  INTEREST = 'interest',
  CLAIM_REWARD = 'claim_reward_balance',
  POWER_UP = 'transfer_to_vesting',
  POWER_DOWN = 'withdraw_vesting',
  POWER_DOWN_FILL = 'fill_vesting_withdraw',
  SAVINGS_DEPOSIT = 'transfer_to_savings',
  SAVINGS_WITHDRAW = 'transfer_from_savings',
  SAVINGS_WITHDRAW_FILL = 'fill_transfer_from_savings',
  PROPOSAL_PAY = 'proposal_pay',
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
