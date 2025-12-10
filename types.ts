
export enum FrontendId {
  PEAKD = 'PEAKD',
  ECENCY = 'ECENCY',
  HIVEBLOG = 'HIVEBLOG',
  INLEO = 'INLEO',
  ACTIFIT = 'ACTIFIT',
  WAIVIO = 'WAIVIO',
  LIKETU = 'LIKETU'
}

export enum ActionMode {
  SAME_PAGE = 'SAME_PAGE',
  WALLET = 'WALLET',
  COMPOSE = 'COMPOSE'
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
  icon: string; // Lucide icon name or emoji
  category: 'Game' | 'DeFi' | 'Video' | 'Tool';
}

export interface AppSettings {
  autoRedirect: boolean;
  preferredFrontendId: FrontendId;
  openInNewTab: boolean;
}
