
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
    },
    active: true
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
    },
    active: true
  },
  {
    id: FrontendId.HIVEBLOG,
    name: 'Hive.blog',
    domain: 'hive.blog',
    aliases: ['wallet.hive.blog'],
    color: '#c51d24',
    textColor: '#ffffff',
    description: 'The classic reference implementation.',
    paths: {
      compose: '/submit.html',
      wallet: (user) => user ? `/@${user}/transfers` : '/transfers'
    },
    active: true
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
    },
    active: true
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
      compose: '/blog/new',
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
    },
    active: true
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
    },
    active: true
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
    },
    active: true
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
    },
    active: true
  }
];

export const DAPPS: DAppConfig[] = [
  {
    name: 'Splinterlands',
    url: 'https://splinterlands.com',
    description: 'The #1 Play2Earn card game.',
    logo: 'splinterlands.png',
    category: 'Game'
  },
  {
    name: 'Hive-Engine',
    url: 'https://hive-engine.com',
    description: 'Smart contracts & sidechain tokens.',
    logo: 'hive-engine.png',
    category: 'DeFi'
  },
  {
    name: 'Actifit',
    url: 'https://actifit.io',
    description: 'Move-to-earn fitness tracking.',
    logo: 'actifit.png',
    category: 'Social'
  },
  {
    name: 'PeakMonsters',
    url: 'https://peakmonsters.com',
    description: 'Advanced Splinterlands market.',
    logo: 'peakmonsters.png',
    category: 'Tool'
  },
  {
    name: '3Speak',
    url: 'https://3speak.tv',
    description: 'Censorship-resistant video platform.',
    logo: '3speak.png',
    category: 'Video'
  },
  {
    name: 'InLeo',
    url: 'https://inleo.io',
    description: 'Tokenized social media.',
    logo: 'inleo.png',
    category: 'Social'
  },
  {
    name: 'Snapie',
    url: 'https://snapie.net',
    description: 'Share your moments.',
    logo: 'snapie.png',
    category: 'Social'
  },
  {
    name: 'TravelFeed',
    url: 'https://travelfeed.io',
    description: 'Travel community & blogs.',
    logo: 'travelfeed.png',
    category: 'Social'
  },
  {
    name: 'HoloZing',
    url: 'https://holozing.com',
    description: 'Upcoming creature capture game.',
    logo: 'holozing.png',
    category: 'Game'
  },
  {
    name: 'NFTShowroom',
    url: 'https://nftshowroom.com',
    description: 'Digital Art Marketplace.',
    logo: 'nftshowroom.png',
    category: 'Tool'
  },
  {
    name: 'WorldMappin',
    url: 'https://worldmappin.com',
    description: 'Interactive visual map for Hive.',
    logo: 'worldmappin.png',
    category: 'Tool'
  },
  {
    name: 'Rising Star',
    url: 'https://www.risingstargame.com',
    description: 'Play to earn music career game.',
    logo: 'risingstar.png',
    category: 'Game'
  },
  {
    name: 'Magi',
    url: 'https://vsc.eco',
    description: 'Next-gen Smart Contracts (VSC).',
    logo: 'magi.png',
    category: 'Tool'
  }
];

export const GENERIC_HIVE_PATH_REGEX = /(\/@[a-z0-9.-]+(\/[a-z0-9-]+)?)|(\/created\/.+)|(\/trending\/.+)|(\/hot\/.+)/;
export const USERNAME_REGEX = /\/@([a-z0-9.-]+)/;
