
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
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
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
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
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
      wallet: (user) => user ? `/@${user}` : '/wallet'
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
  },
  {
    id: FrontendId.THREESPEAK,
    name: '3Speak',
    domain: '3speak.tv',
    aliases: [],
    color: '#000000',
    textColor: '#ffffff',
    description: 'Censorship-resistant video platform.',
    paths: {
      compose: '/upload',
      wallet: (user) => user ? `/user/${user}` : '/'
    },
    active: true
  }
];

export const DAPPS: DAppConfig[] = [
  // --- Social ---
  {
    name: 'Ecency',
    url: 'https://ecency.com',
    description: 'Fast, open-source, mobile-first social.',
    logo: 'ecency.png',
    category: 'Social'
  },
  {
    name: 'PeakD',
    url: 'https://peakd.com',
    description: 'Feature-rich social media platform.',
    logo: 'peakd.png',
    category: 'Social'
  },
  {
    name: 'D.Buzz',
    url: 'https://d.buzz',
    description: 'Web3 microblogging for short content.',
    logo: 'https://images.ecency.com/u/dbuzz/avatar/small',
    category: 'Social'
  },
  {
    name: 'InLeo',
    url: 'https://inleo.io',
    description: 'Tokenized social media & finance.',
    logo: 'inleo.png',
    category: 'Social'
  },
  {
    name: 'Liketu',
    url: 'https://liketu.com',
    description: 'Visual storytelling & photography.',
    logo: 'liketu.png',
    category: 'Social'
  },
  {
    name: 'Waivio',
    url: 'https://waivio.com',
    description: 'Business-focused social with object indexing.',
    logo: 'waivio.png',
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
    name: 'Actifit',
    url: 'https://actifit.io',
    description: 'Move-to-earn fitness tracking.',
    logo: 'actifit.png',
    category: 'Social'
  },
  {
    name: 'Snapie',
    url: 'https://snapie.net',
    description: 'Share your moments.',
    logo: 'snapie.png',
    category: 'Social'
  },

  // --- Games ---
  {
    name: 'Splinterlands',
    url: 'https://splinterlands.com',
    description: 'The #1 Play2Earn card game.',
    logo: 'splinterlands.png',
    category: 'Game'
  },
  {
    name: 'HoloZing',
    url: 'https://holozing.com',
    description: 'Creature capture and training game.',
    logo: 'holozing.png',
    category: 'Game'
  },
  {
    name: 'DCity',
    url: 'https://dcity.io',
    description: 'Simulate and grow your virtual city.',
    logo: 'https://images.ecency.com/u/dcity/avatar/small',
    category: 'Game'
  },
  {
    name: 'Rising Star',
    url: 'https://www.risingstargame.com',
    description: 'Play to earn music career game.',
    logo: 'risingstar.png',
    category: 'Game'
  },
  {
    name: 'TerraCore',
    url: 'https://terracoregame.com',
    description: 'Post-apocalyptic strategy game.',
    logo: 'https://images.ecency.com/u/terracore/avatar/small',
    category: 'Game'
  },
  {
    name: 'Golem Overlord',
    url: 'https://golemoverlord.io',
    description: 'Idle RPG resource management game.',
    logo: 'https://images.ecency.com/u/golem.overlord/avatar/small',
    category: 'Game'
  },
  {
    name: 'Rabona',
    url: 'https://rabona.io',
    description: 'Soccer manager game on Hive.',
    logo: 'https://images.ecency.com/u/rabona/avatar/small',
    category: 'Game'
  },
  {
    name: 'D-Crops',
    url: 'https://dcrops.com',
    description: 'Decentralized farming simulator.',
    logo: 'https://images.ecency.com/u/dcrops/avatar/small',
    category: 'Game'
  },

  // --- DeFi ---
  {
    name: 'Hive-Engine',
    url: 'https://hive-engine.com',
    description: 'Smart contracts & sidechain tokens.',
    logo: 'hive-engine.png',
    category: 'DeFi'
  },
  {
    name: 'Tribaldex',
    url: 'https://tribaldex.com',
    description: 'DEX for Hive-Engine tokens.',
    logo: 'https://images.ecency.com/u/tribaldex/avatar/small',
    category: 'DeFi'
  },
  {
    name: 'BeeSwap',
    url: 'https://beeswap.dcity.io',
    description: 'Smart swaps and liquidity for Hive.',
    logo: 'https://images.ecency.com/u/beeswap/avatar/small',
    category: 'DeFi'
  },

  // --- Video ---
  {
    name: '3Speak',
    url: 'https://3speak.tv',
    description: 'Censorship-resistant video platform.',
    logo: '3speak.png',
    category: 'Video'
  },
  {
    name: 'Vimm',
    url: 'https://vimm.tv',
    description: 'Web3 live streaming platform.',
    logo: 'https://images.ecency.com/u/vimm/avatar/small',
    category: 'Video'
  },

  // --- Tools ---
  {
    name: 'Hive Keychain',
    url: 'https://hive-keychain.com',
    description: 'Secure key management browser extension.',
    logo: 'https://images.ecency.com/u/keychain/avatar/small',
    category: 'Tool'
  },
  {
    name: 'HiveScan',
    url: 'https://hivescan.info',
    description: 'Modern Hive block explorer.',
    logo: 'https://images.ecency.com/u/hiveio/avatar/small',
    category: 'Tool'
  },
  {
    name: 'PeakMonsters',
    url: 'https://peakmonsters.com',
    description: 'Advanced Splinterlands market.',
    logo: 'https://images.ecency.com/u/peakmonsters/avatar/small',
    category: 'Tool'
  },
  {
    name: 'HiveBuzz',
    url: 'https://hivebuzz.me',
    description: 'Gamification, badges & milestones.',
    logo: 'https://images.ecency.com/u/hivebuzz/avatar/small',
    category: 'Tool'
  },
  {
    name: 'HiveStats',
    url: 'https://hivestats.io',
    description: 'Advanced account analytics.',
    logo: 'https://images.ecency.com/u/hivestats.app/avatar/small',
    category: 'Tool'
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
    name: 'Magi',
    url: 'https://vsc.eco',
    description: 'Next-gen Smart Contracts (VSC).',
    logo: 'magi.png',
    category: 'Tool'
  }
];

export const GENERIC_HIVE_PATH_REGEX = /(\/@[a-z0-9.-]+(\/[a-z0-9-]+)?)|(\/created\/.+)|(\/trending\/.+)|(\/hot\/.+)/;
export const USERNAME_REGEX = /\/@([a-z0-9.-]+)/;

export const HIVE_RPC_NODES = [
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://api.openhive.network',
  'https://hiveapi.actifit.io',
  'https://techcoderx.com',
  'https://api.syncad.com',
  'https://rpc.mahdiyari.info',
  'https://api.c0ff33a.uk',
  'https://hive.atexoras.com:2096'
];

// HAF "For You Page" (FYP) ranking service — returns posts in bridge.get_ranked_posts
// shape plus a nested `fyp` scoring object, so it drops in alongside trending/hot/new.
export const FYP_API_BASE = 'https://testapi.hivescan.info/haf-fyp-api';

export const HIVE_ENGINE_RPC_NODES = [
  'https://api.hive-engine.com/rpc',
  'https://v6-he.atexoras.com:2083',
  'https://herpc.actifit.io',
  'https://he.c0ff33a.uk',
  'https://herpc.dtools.dev',
  'https://api2.hive-engine.com/rpc'
];
