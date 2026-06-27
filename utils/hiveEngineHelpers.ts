/**
 * Hive-Engine Integration
 * Fetches user token balances, market prices (from HE directly), and token metadata (logos/names).
 * Prices come from Hive-Engine market metrics in SWAP.HIVE (~1:1 with HIVE),
 * then converted to USD using the known HIVE price.
 */

export interface HiveEngineToken {
  symbol: string;
  name: string;
  balance: number;
  priceUSD: number;
  iconUrl?: string;
}

const DEFAULT_HE_API = 'https://api.hive-engine.com/rpc';

const HE_CONTRACTS_PATH = '/contracts';

const getHeNode = (nodeOverride?: string): string => {
  const base = (nodeOverride || DEFAULT_HE_API).replace(/\/+$/, '');
  return base + HE_CONTRACTS_PATH;
};

/**
 * Fetches user's Hive-Engine token balances
 */
export const fetchHiveEngineBalances = async (username: string, heRpcNode?: string): Promise<any[]> => {
  try {
    const nodeUrl = getHeNode(heRpcNode);
    const response = await fetch(nodeUrl, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'find',
        params: {
          contract: 'tokens',
          table: 'balances',
          query: { account: username },
          limit: 1000
        },
        id: 1
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.error) {
      console.error('Hive-Engine API error:', data.error);
      return [];
    }

    if (!data.result || !Array.isArray(data.result)) {
      console.error('Unexpected Hive-Engine response format:', data);
      return [];
    }

    return data.result;
  } catch (error) {
    console.error('Failed to fetch Hive-Engine balances:', error);
    return [];
  }
};

/**
 * Fetches token metadata (name, logo) from Hive-Engine for specific symbols.
 */
const fetchHiveEngineTokenInfo = async (symbols: string[], heRpcNode?: string): Promise<Record<string, { name: string; logo: string }>> => {
  if (symbols.length === 0) return {};

  try {
    const nodeUrl = getHeNode(heRpcNode);
    const response = await fetch(nodeUrl, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'find',
        params: {
          contract: 'tokens',
          table: 'tokens',
          query: { symbol: { $in: symbols } },
          limit: 1000
        },
        id: 2
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (!data.result || !Array.isArray(data.result)) return {};

    const info: Record<string, { name: string; logo: string }> = {};
    for (const token of data.result) {
      let logo = '';
      if (token.metadata && typeof token.metadata === 'string') {
        try {
          const meta = JSON.parse(token.metadata);
          logo = meta.icon || '';
        } catch {}
      } else if (token.metadata?.icon) {
        logo = token.metadata.icon;
      }
      info[token.symbol] = {
        name: token.name || token.symbol,
        logo
      };
    }
    return info;
  } catch (error) {
    console.error('Failed to fetch Hive-Engine token info:', error);
    return {};
  }
};

/**
 * Fetches market prices from Hive-Engine for specific symbols.
 * Returns prices in SWAP.HIVE (pegged ~1:1 to HIVE).
 */
const fetchHiveEngineMarketPrices = async (symbols: string[], heRpcNode?: string): Promise<Record<string, number>> => {
  if (symbols.length === 0) return {};

  try {
    const nodeUrl = getHeNode(heRpcNode);
    const response = await fetch(nodeUrl, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'find',
        params: {
          contract: 'market',
          table: 'metrics',
          query: { symbol: { $in: symbols } },
          limit: 1000
        },
        id: 3
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    if (!data.result || !Array.isArray(data.result)) return {};

    const prices: Record<string, number> = {};
    for (const metric of data.result) {
      const price = parseFloat(metric.lastPrice) || 0;
      if (metric.symbol && price > 0) {
        prices[metric.symbol] = price;
      }
    }
    return prices;
  } catch (error) {
    console.error('Failed to fetch Hive-Engine market prices:', error);
    return {};
  }
};

/**
 * Token precision (decimal places) per symbol, from the tokens table.
 * Balance strings don't reliably carry full precision, so transfer/stake
 * quantities must be formatted against this authoritative value.
 */
const fetchHiveEngineTokenPrecisions = async (symbols: string[], heRpcNode?: string): Promise<Record<string, number>> => {
  if (symbols.length === 0) return {};
  try {
    const nodeUrl = getHeNode(heRpcNode);
    const response = await fetch(nodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'find',
        params: { contract: 'tokens', table: 'tokens', query: { symbol: { $in: symbols } }, limit: 1000 },
        id: 7,
      }),
    });
    const data = await response.json();
    const out: Record<string, number> = {};
    if (Array.isArray(data.result)) {
      for (const t of data.result) {
        out[(t.symbol || '').toUpperCase().trim()] = typeof t.precision === 'number' ? t.precision : 3;
      }
    }
    return out;
  } catch {
    return {};
  }
};

export interface HiveEngineHolding {
  symbol: string;
  balance: number;   // liquid — sendable / stakeable
  stake: number;     // staked — unstakeable
  precision: number;
}

/**
 * A user's Hive-Engine holdings including both liquid and staked amounts,
 * with token precision — everything the send/stake/unstake actions need.
 */
export const fetchHiveEngineHoldings = async (username: string, heRpcNode?: string): Promise<HiveEngineHolding[]> => {
  const rows = await fetchHiveEngineBalances(username, heRpcNode);
  const held = rows
    .map(r => ({
      symbol: (r.symbol || '').toUpperCase().trim(),
      balance: parseFloat(r.balance) || 0,
      stake: parseFloat(r.stake) || 0,
    }))
    .filter(h => h.symbol && (h.balance > 0 || h.stake > 0));

  if (held.length === 0) return [];

  const precisions = await fetchHiveEngineTokenPrecisions(held.map(h => h.symbol), heRpcNode);
  return held
    .map(h => ({ ...h, precision: precisions[h.symbol] ?? 3 }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
};

// ── Hive-Engine custom_json action builders (active auth) ────────────────────
// All Hive-Engine token actions are custom_json ops with id "ssc-mainnet-hive".
const heCustomJson = (username: string, action: string, payload: Record<string, any>): any[] => ([
  'custom_json',
  {
    required_auths: [username],
    required_posting_auths: [],
    id: 'ssc-mainnet-hive',
    json: JSON.stringify({ contract: 'tokens', action, payload }),
  },
]);

export const heTransferOp = (username: string, symbol: string, to: string, quantity: string, memo = ''): any[] =>
  heCustomJson(username, 'transfer', { symbol, to, quantity, ...(memo ? { memo } : {}) });

export const heStakeOp = (username: string, symbol: string, quantity: string, to?: string): any[] =>
  heCustomJson(username, 'stake', { symbol, to: to || username, quantity });

export const heUnstakeOp = (username: string, symbol: string, quantity: string): any[] =>
  heCustomJson(username, 'unstake', { symbol, quantity });

/**
 * Resolves a Hive-Engine logo value to a usable image URL.
 * Logo can be: a full URL, an IPFS hash, or empty.
 */
const resolveLogoUrl = (logo: string): string | undefined => {
  if (!logo) return undefined;
  if (logo.startsWith('http')) return logo;
  if (logo.startsWith('Qm') || logo.startsWith('bafy')) return `https://ipfs.io/ipfs/${logo}`;
  return undefined;
};

/**
 * Combines balances, market prices, and token metadata into display tokens.
 * Returns immediately with icon URLs — icons are resolved to data URLs
 * lazily by the UI component to avoid blocking the token list render.
 */
const enrichHiveEngineTokens = (
  balances: any[],
  pricesInHive: Record<string, number>,
  tokenInfo: Record<string, { name: string; logo: string }>,
  hivePriceUSD: number
): HiveEngineToken[] => {
  if (!balances || !Array.isArray(balances)) return [];

  const filtered = balances.filter(b => {
    const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
    return balanceValue > 0;
  });

  const enriched = filtered.map(b => {
    const symbol = (b.symbol || '').toUpperCase().trim();
    const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
    // SWAP.HIVE is the market's base currency, so it has no metric against
    // itself — but it's pegged 1:1 to HIVE, so its price in HIVE is exactly 1.
    const priceInHive = symbol === 'SWAP.HIVE' ? 1 : (pricesInHive[symbol] || 0);
    const priceUSD = priceInHive * hivePriceUSD;
    const info = tokenInfo[symbol];
    const name = info?.name || symbol;
    const iconUrl = resolveLogoUrl(info?.logo || '');

    return { symbol, name, balance: balanceValue, priceUSD, iconUrl };
  }).filter(t => t.symbol && t.balance > 0);

  return enriched.sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD));
};

/**
 * Fetch an image and convert to data URL for CSP-compatible rendering.
 * Returns undefined if fetch fails (caller should use fallback).
 */
export const loadIconAsDataUrl = async (url: string): Promise<string | undefined> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) return undefined;
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) return undefined;
      return new Promise<string | undefined>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return undefined;
  }
};

/**
 * Fetch and calculate total Hive-Engine portfolio value.
 * Uses HIVE price to convert Hive-Engine market prices to USD.
 */
export const getHiveEnginePortfolioValue = async (
  username: string,
  hivePriceUSD: number,
  heRpcNode?: string
): Promise<{ tokens: HiveEngineToken[]; totalUSD: number }> => {
  try {
    const balances = await fetchHiveEngineBalances(username, heRpcNode);

    const heldSymbols = balances
      .filter(b => (typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance) > 0)
      .map(b => b.symbol);

    if (heldSymbols.length === 0) {
      return { tokens: [], totalUSD: 0 };
    }

    const [pricesInHive, tokenInfo] = await Promise.all([
      fetchHiveEngineMarketPrices(heldSymbols, heRpcNode),
      fetchHiveEngineTokenInfo(heldSymbols, heRpcNode)
    ]);

    const tokens = enrichHiveEngineTokens(balances, pricesInHive, tokenInfo, hivePriceUSD);
    const totalUSD = tokens.reduce((sum, token) => sum + (token.balance * token.priceUSD), 0);

    return { tokens, totalUSD };
  } catch (error) {
    console.error('Failed to get Hive-Engine portfolio:', error);
    return { tokens: [], totalUSD: 0 };
  }
};