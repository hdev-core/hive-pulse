
export enum FrontendId {
  PEAKD = 'PEAKD',
  ECENCY = 'ECENCY',
  HIVEBLOG = 'HIVEBLOG',
  INLEO = 'INLEO',
  ACTIFIT = 'ACTIFIT',
  WAIVIO = 'WAIVIO',
  LIKETU = 'LIKETU',
  HIVESCAN = 'HIVESCAN'
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
  APPS = 'APPS',
  SETTINGS = 'SETTINGS'
}

export interface PathConfig {
  compose: string;
  wallet: (username?: string) => string;
}

export interface FrontendConfig {
  id: FrontendId;
  name: string;
  domain: string;
  aliases: string[];
  color: string;
  textColor: string;
  description: string;
  paths: PathConfig;
}

export interface CurrentTabState {
  url: string;
  isHiveUrl: boolean;
  detectedFrontendId: FrontendId | null;
  path: string;
  username: string | null;
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
  preferredFrontendId: FrontendId;
  openInNewTab: boolean;
  rcUser?: string;
  badgeMetric: 'RC' | 'VP';
  ecencyUsername?: string;
  ecencyAccessToken?: string; // Hive token (for bootstrap)
  ecencyChatToken?: string;   // Mattermost token (for chat)
  ecencyUserId?: string;      // Internal Mattermost User ID (for reliable 'isMe' check)
  ecencyRefreshToken?: string;
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
