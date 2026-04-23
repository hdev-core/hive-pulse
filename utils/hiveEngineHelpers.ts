/**
 * Hive-Engine Integration
 * Handles fetching user's Hive-Engine token balances and prices
 */

export interface HiveEngineToken {
  symbol: string;
  name: string;
  balance: number;
  priceUSD: number;
}

const HIVE_ENGINE_API = 'https://api.hive-engine.com/rpc/contracts';

// Mapping of Hive-Engine symbols to CoinGecko IDs
const TOKEN_COINGECKO_MAP: Record<string, string> = {
  'SWAP': 'swapfifty',
  'BEE': 'bee-crypto',
  'STEM': 'stem',
  'LEO': 'leo',
  'ONEUP': 'oneup',
  'PAL': 'pal-crypto',
  'POSH': 'posh',
  'LASSECASH': 'lasse-cash',
  'DEC': 'splinterlands',
  'HKOIN': 'hokkaido-inu',
  'SIM': 'splinterlands',
  'ARCHON': 'archon'
};

/**
 * Fetches user's Hive-Engine token balances
 */
export const fetchHiveEngineBalances = async (username: string): Promise<any[]> => {
  try {
    const request = {
      jsonrpc: '2.0',
      method: 'find',
      params: {
        contract: 'tokens',
        table: 'balances',
        query: { account: username },
        limit: 1000
      },
      id: 1
    };
    
    const response = await fetch(HIVE_ENGINE_API, {
      method: 'POST',
      body: JSON.stringify(request),
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
 * Fetches Hive-Engine token prices from CoinGecko
 * Supports: SWAP, BEE, STEM, LEO, ONEUP, PAL, POSH, DEC, etc.
 */
export const fetchHiveEngineTokenPrices = async (): Promise<Record<string, number>> => {
  try {
    const coingeckoIds = Object.values(TOKEN_COINGECKO_MAP);
    const uniqueIds = [...new Set(coingeckoIds)];
    
    if (uniqueIds.length === 0) return {};
    
    const ids = uniqueIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return {};
    }

    const data = await response.json();
    
    const priceMap: Record<string, number> = {};
    for (const [symbol, coingeckoId] of Object.entries(TOKEN_COINGECKO_MAP)) {
      const price = data[coingeckoId]?.usd || 0;
      priceMap[symbol] = price;
    }
    
    return priceMap;
  } catch (error) {
    console.error('Failed to fetch Hive-Engine prices:', error);
    return {};
  }
};

/**
 * Enrich Hive-Engine balances with price data
 */
export const enrichHiveEngineTokens = (
  balances: any[],
  prices: Record<string, number>
): HiveEngineToken[] => {
  if (!balances || !Array.isArray(balances)) return [];
  
  const filtered = balances.filter(b => {
    const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
    return balanceValue > 0;
  });
  
  const mapped = filtered.map(b => {
    const symbol = (b.symbol?.toUpperCase() || '').trim();
    const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
    const price = prices[symbol] || 0;
    
    return {
      symbol,
      name: symbol,
      balance: balanceValue,
      priceUSD: price
    };
  }).filter(t => t.symbol && t.balance > 0);
  
  return mapped.sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD));
};

/**
 * Fetch and calculate total Hive-Engine portfolio value
 */
export const getHiveEnginePortfolioValue = async (
  username: string
): Promise<{ tokens: HiveEngineToken[]; totalUSD: number }> => {
  try {
    const [balances, prices] = await Promise.all([
      fetchHiveEngineBalances(username),
      fetchHiveEngineTokenPrices()
    ]);

    const tokens = enrichHiveEngineTokens(balances, prices);
    
    const totalUSD = tokens.reduce((sum, token) => sum + (token.balance * token.priceUSD), 0);

    return { tokens, totalUSD };
  } catch (error) {
    console.error('Failed to get Hive-Engine portfolio:', error);
    return { tokens: [], totalUSD: 0 };
  }
};
