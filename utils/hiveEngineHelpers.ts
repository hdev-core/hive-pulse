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

const HIVE_ENGINE_API = 'https://api.hive-engine.com/rpc';

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
    console.log('Hive-Engine balances response:', data);
    
    if (data.result && Array.isArray(data.result)) {
      return data.result;
    }
    return [];
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
    // Get all unique CoinGecko IDs from our mapping
    const coingeckoIds = Object.values(TOKEN_COINGECKO_MAP);
    const uniqueIds = [...new Set(coingeckoIds)]; // Remove duplicates
    
    if (uniqueIds.length === 0) return {};
    
    const ids = uniqueIds.join(',');
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return {};
    }

    const data = await response.json();
    console.log('CoinGecko prices:', data);
    
    // Map CoinGecko responses back to symbols
    const priceMap: Record<string, number> = {};
    for (const [symbol, coingeckoId] of Object.entries(TOKEN_COINGECKO_MAP)) {
      priceMap[symbol] = data[coingeckoId]?.usd || 0;
    }
    
    console.log('Price map:', priceMap);
    return priceMap;
  } catch (error) {
    console.error('Failed to fetch Hive-Engine prices:', error);
    return {};
  }
};

/**
 * Enrich Hive-Engine balances with price data
 */
export const enrichHiveEngineTokens = async (
  balances: any[],
  prices: Record<string, number>
): Promise<HiveEngineToken[]> => {
  console.log('Enriching tokens. Balances:', balances, 'Prices:', prices);
  
  return balances
    .filter(b => {
      // Parse balance value
      const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
      return balanceValue > 0;
    })
    .map(b => {
      const symbol = b.symbol?.toUpperCase() || b.token?.toUpperCase() || '';
      const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
      
      return {
        symbol,
        name: symbol,
        balance: balanceValue,
        priceUSD: prices[symbol] || 0
      };
    })
    .filter(t => t.symbol && t.balance > 0) // Only include valid tokens with balance
    .sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD)); // Sort by value
};

/**
 * Fetch and calculate total Hive-Engine portfolio value
 */
export const getHiveEnginePortfolioValue = async (
  username: string
): Promise<{ tokens: HiveEngineToken[]; totalUSD: number }> => {
  try {
    console.log('Fetching Hive-Engine portfolio for:', username);
    
    const [balances, prices] = await Promise.all([
      fetchHiveEngineBalances(username),
      fetchHiveEngineTokenPrices()
    ]);

    console.log('Raw balances:', balances);
    console.log('Prices fetched:', prices);

    const tokens = await enrichHiveEngineTokens(balances, prices);
    
    console.log('Enriched tokens:', tokens);
    
    const totalUSD = tokens.reduce((sum, token) => sum + (token.balance * token.priceUSD), 0);

    return { tokens, totalUSD };
  } catch (error) {
    console.error('Failed to get Hive-Engine portfolio:', error);
    return { tokens: [], totalUSD: 0 };
  }
};
