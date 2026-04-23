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

const HIVE_ENGINE_API = 'https://api.hive-engine.com/rpc/contracts';

/**
 * Fetches user's Hive-Engine token balances
 */
export const fetchHiveEngineBalances = async (username: string): Promise<any[]> => {
  try {
    const response = await fetch(HIVE_ENGINE_API, {
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
const fetchHiveEngineTokenInfo = async (symbols: string[]): Promise<Record<string, { name: string; logo: string }>> => {
  if (symbols.length === 0) return {};

  try {
    const response = await fetch(HIVE_ENGINE_API, {
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
      info[token.symbol] = {
        name: token.name || token.symbol,
        logo: token.logo || ''
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
const fetchHiveEngineMarketPrices = async (symbols: string[]): Promise<Record<string, number>> => {
  if (symbols.length === 0) return {};

  try {
    const response = await fetch(HIVE_ENGINE_API, {
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
    const priceInHive = pricesInHive[symbol] || 0;
    const priceUSD = priceInHive * hivePriceUSD;
    const info = tokenInfo[symbol];
    const name = info?.name || symbol;
    const iconUrl = resolveLogoUrl(info?.logo || '');

    return { symbol, name, balance: balanceValue, priceUSD, iconUrl };
  }).filter(t => t.symbol && t.balance > 0);

  return enriched.sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD));
};

/**
 * Fetch and calculate total Hive-Engine portfolio value.
 * Uses HIVE price to convert Hive-Engine market prices to USD.
 */
export const getHiveEnginePortfolioValue = async (
  username: string,
  hivePriceUSD: number
): Promise<{ tokens: HiveEngineToken[]; totalUSD: number }> => {
  try {
    const balances = await fetchHiveEngineBalances(username);

    const heldSymbols = balances
      .filter(b => (typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance) > 0)
      .map(b => b.symbol);

    if (heldSymbols.length === 0) {
      return { tokens: [], totalUSD: 0 };
    }

    const [pricesInHive, tokenInfo] = await Promise.all([
      fetchHiveEngineMarketPrices(heldSymbols),
      fetchHiveEngineTokenInfo(heldSymbols)
    ]);

    const tokens = enrichHiveEngineTokens(balances, pricesInHive, tokenInfo, hivePriceUSD);
    const totalUSD = tokens.reduce((sum, token) => sum + (token.balance * token.priceUSD), 0);

    return { tokens, totalUSD };
  } catch (error) {
    console.error('Failed to get Hive-Engine portfolio:', error);
    return { tokens: [], totalUSD: 0 };
  }
};