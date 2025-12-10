
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
  RC = 'RC',
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
  icon: string; // Lucide icon name or emoji
  category: 'Game' | 'DeFi' | 'Video' | 'Tool' | 'Social';
}

export interface AppSettings {
  autoRedirect: boolean;
  preferredFrontendId: FrontendId;
  openInNewTab: boolean;
}

export interface RCData {
  username: string;
  percentage: number;
  current: number;
  max: number;
  isLow: boolean;
}
