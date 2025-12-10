import { FrontendConfig, FrontendId } from './types';

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
  }
];

export const GENERIC_HIVE_PATH_REGEX = /(\/@[a-z0-9.-]+(\/[a-z0-9-]+)?)|(\/created\/.+)|(\/trending\/.+)|(\/hot\/.+)/;
export const USERNAME_REGEX = /\/@([a-z0-9.-]+)/;