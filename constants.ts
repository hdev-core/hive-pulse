
import { FrontendConfig, FrontendId, DAppConfig } from './types';

export const FRONTENDS: FrontendConfig[] = [
  {
    id: FrontendId.PEAKD,
    name: 'PeakD',
    domain: 'peakd.com',
    aliases: [],
    color: '#0d121f',
    textColor: '#ffffff',
    description: 'The most feature-rich interface.',
    paths: {
      compose: '/publish',
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
    }
  },
  {
    id: FrontendId.ECENCY,
    name: 'Ecency',
    domain: 'ecency.com',
    aliases: [],
    color: '#2658fc',
    textColor: '#ffffff',
    description: 'Fast, open-source, mobile-first.',
    paths: {
      compose: '/submit',
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
    }
  },
  {
    id: FrontendId.HIVEBLOG,
    name: 'Hive.blog',
    domain: 'hive.blog',
    aliases: [],
    color: '#c51d24',
    textColor: '#ffffff',
    description: 'The classic reference implementation.',
    paths: {
      compose: '/submit.html',
      wallet: (user) => user ? `/@${user}/transfers` : '/wallet'
    }
  },
  {
    id: FrontendId.INLEO,
    name: 'InLeo',
    domain: 'inleo.io',
    aliases: ['leofinance.io'],
    color: '#e37400',
    textColor: '#ffffff',
    description: 'Tokenized social media & microblogging.',
    paths: {
      compose: '/publish',
      wallet: (user) => user ? `/${user}` : '/wallet'
    }
  },
  {
    id: FrontendId.ACTIFIT,
    name: 'Actifit',
    domain: 'actifit.io',
    aliases: [],
    color: '#ff2c48',
    textColor: '#ffffff',
    description: 'Move-to-earn fitness tracking.',
    paths: {
      compose: '/submit',
      wallet: (user) => user ? `/${user}/wallet` : '/wallet'
    }
  },
  {
    id: FrontendId.WAIVIO,
    name: 'Waivio',
    domain: 'waivio.com',
    aliases: [],
    color: '#F87070',
    textColor: '#ffffff',
    description: 'Business & object-oriented social.',
    paths: {
      compose: '/editor',
      wallet: (user) => user ? `/@${user}/transfers` : '/wallet'
    }
  },
  {
    id: FrontendId.LIKETU,
    name: 'Liketu',
    domain: 'liketu.com',
    aliases: ['www.liketu.com'],
    color: '#3B82F6',
    textColor: '#ffffff',
    description: 'Visual storytelling & photography.',
    paths: {
      compose: '/submit',
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
    }
  },
  {
    id: FrontendId.HIVESCAN,
    name: 'HiveScan',
    domain: 'hivescan.info',
    aliases: [],
    color: '#E31337',
    textColor: '#ffffff',
    description: 'Modern Hive block explorer.',
    paths: {
      compose: '/', // Explorers don't support composing
      wallet: (user) => user ? `/@${user}` : '/'
    }
  }
];

export const DAPPS: DAppConfig[] = [
  {
    name: 'Dbuzz',
    url: 'https://d.buzz',
    description: 'Micro-blogging on Hive.',
    icon: 'MessageCircle',
    category: 'Social'
  },
  {
    name: 'Actifit',
    url: 'https://actifit.io',
    description: 'Move-to-earn fitness tracking.',
    icon: 'Activity',
    category: 'Social'
  },
  {
    name: 'Splinterlands',
    url: 'https://splinterlands.com',
    description: 'The #1 Play2Earn card game.',
    icon: 'Sword',
    category: 'Game'
  },
  {
    name: 'Rising Star',
    url: 'https://www.risingstargame.com',
    description: 'Play to earn music career game.',
    icon: 'Music',
    category: 'Game'
  },
  {
    name: 'Hive-Engine',
    url: 'https://hive-engine.com',
    description: 'Smart contracts & sidechain tokens.',
    icon: 'Coins',
    category: 'DeFi'
  },
  {
    name: 'PeakMonsters',
    url: 'https://peakmonsters.com',
    description: 'Advanced Splinterlands market.',
    icon: 'ShoppingCart',
    category: 'Tool'
  },
  {
    name: '3Speak',
    url: 'https://3speak.tv',
    description: 'Censorship-resistant video platform.',
    icon: 'Video',
    category: 'Video'
  },
  {
    name: 'Vimm',
    url: 'https://vimm.tv',
    description: 'Web3 Live Streaming.',
    icon: 'MonitorPlay',
    category: 'Video'
  },
  {
    name: 'TravelFeed',
    url: 'https://travelfeed.io',
    description: 'Travel community & blogs.',
    icon: 'Plane',
    category: 'Social'
  },
  {
    name: 'HoloZing',
    url: 'https://holozing.com',
    description: 'Upcoming creature capture game.',
    icon: 'Gamepad2',
    category: 'Game'
  },
  {
    name: 'NFTShowroom',
    url: 'https://nftshowroom.com',
    description: 'Digital Art Marketplace.',
    icon: 'Palette',
    category: 'Tool'
  },
  {
    name: 'HiveDAO',
    url: 'https://hive.blog/proposals',
    description: 'Vote on ecosystem proposals.',
    icon: 'Vote',
    category: 'Tool'
  }
];

export const GENERIC_HIVE_PATH_REGEX = /(\/@[a-z0-9.-]+(\/[a-z0-9-]+)?)|(\/created\/.+)|(\/trending\/.+)|(\/hot\/.+)/;
export const USERNAME_REGEX = /\/@([a-z0-9.-]+)/;
