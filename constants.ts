
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
    // /trending, /created, /communities, /witnesses and /proposals all resolve here.
    sharesCondenserRoutes: true,
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
    // /trending, /created, /communities, /witnesses and /proposals all resolve here.
    sharesCondenserRoutes: true,
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
    // /trending, /created, /communities, /witnesses and /proposals all resolve here.
    sharesCondenserRoutes: true,
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
  },
  {
    id: FrontendId.UREKA,
    name: 'Ureka',
    domain: 'ureka.social',
    aliases: [],
    color: '#2d1b69',
    textColor: '#ffffff',
    description: 'Decentralized social network on Hive.',
    logoUrl: 'https://ureka.social/apple-touch-icon.png',
    paths: {
      compose: '/create',
      // Wins over linkStructure.wallet, and only for the no-username case: '/wallet' is
      // walletPath's generic fallback but is not a Ureka route, so it would land on the
      // catch-all's not-found rather than anywhere useful.
      wallet: (u?: string) => (u ? `/@${u}/wallet` : '/'),
    },
    // Ureka's declarative route table lists /post/:author/:permlink, but the app never
    // links to it — there is not one `/post/` href in the bundle, while every post link is
    // built as `/@${author}/${permlink}`. The @-routes live inside the /* catch-all
    // component, which regex-matches /@user, /@user/wallet, /@user/posts|comments|replies|
    // feed, /@user/thread/:permlink and finally /@user/:permlink. So Ureka is condenser-
    // shaped after all; reading only the declared `path:` entries missed all of it.
    sharesCondenserRoutes: true,
    linkStructure: {
      post:      '/@{{author}}/{{permlink}}',
      profile:   '/@{{username}}',
      wallet:    '/@{{username}}/wallet',
      community: '/community/{{name}}/trending',
    },
    active: true
  },
  {
    // The extension already injects its content script and post analyzer here (see the
    // manifests, content.ts HIVE_HOSTS and compose.ts COMPOSE_HOSTS), but it was missing
    // from this list — so once parseUrl started treating FRONTENDS as the sole authority
    // on "is this Hive", the popup announced "No Hive frontend detected" on a site we
    // actively support.
    //
    // active: false means "off by default", not "hidden forever" — settingsStore seeds
    // activeFrontendIds from this flag, and from then on that list is what the user
    // controls. Previously the default list ignored the flag entirely, so this appeared as
    // a switch target on fresh installs.
    //
    // Off by default because Cloudflare answers 403 to every non-browser request, so its
    // post URL scheme could not be verified. The standard shape below is what the generic
    // parser already assumed here, so enabling it is no worse than the old behaviour.
    // Promote to active: true once someone confirms /@author/permlink in a real browser.
    id: FrontendId.SUSEONA,
    name: 'Suseona',
    domain: 'blog.suseona.com',
    aliases: [],
    color: '#1f2937',
    textColor: '#ffffff',
    description: 'Hive blogging on Suseona.',
    paths: {
      compose: '/create',
      wallet: (user) => user ? `/@${user}/wallet` : '/wallet'
    },
    active: false
  },
  {
    id: FrontendId.SLOTHBUZZ,
    name: 'SlothBuzz',
    domain: 'slothbuzz.com',
    aliases: ['www.slothbuzz.com'],
    color: '#0d0d12',
    textColor: '#ffffff',
    description: 'Your Hive home.',
    logoUrl: 'https://www.slothbuzz.com/apple-icon.png',
    paths: {
      compose: '/publish',
      wallet: () => '/wallet'
    },
    // SlothBuzz is the one built-in that does not use /@author/permlink. Posts live under
    // /post/<author>/<permlink>, the wallet is a single global page, and profiles are the
    // only path that matches the usual shape. Verified live: /post/... 200, /@a/p 404,
    // /@user/wallet 404, /wallet 200.
    linkStructure: {
      post:    '/post/{{author}}/{{permlink}}',
      profile: '/@{{username}}',
      wallet:  '/wallet',
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

// HAF Balance Tracker — historical account balances (used for the wallet history chart).
export const BALANCE_API_BASE = 'https://testapi.hivescan.info/balance-api';

// HAF Stats — network/account analytics, incl. calibrated per-op RC costs (RC budget).
export const HAF_STATS_API_BASE = 'https://testapi.hivescan.info/haf-stats-api';

export const HIVE_ENGINE_RPC_NODES = [
  'https://api.hive-engine.com/rpc',
  'https://v6-he.atexoras.com:2083',
  'https://herpc.actifit.io',
  'https://he.c0ff33a.uk',
  'https://herpc.dtools.dev',
  'https://api2.hive-engine.com/rpc'
];
