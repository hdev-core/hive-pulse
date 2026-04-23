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

/**
 * Fetches user's Hive-Engine token balances
 */
export const fetchHiveEngineBalances = async (username: string): Promise<HiveEngineToken[]> => {
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
    return data.result || [];
  } catch (error) {
    console.error('Failed to fetch Hive-Engine balances:', error);
    return [];
  }
};

/**
 * Fetches Hive-Engine token prices from CoinGecko
 * Popular tokens: SWAP, BEE, STEM, LEO, etc.
 */
export const fetchHiveEngineTokenPrices = async (): Promise<Record<string, number>> => {
  try {
    const tokens = ['swapfifty', 'bee-crypto', 'stem', 'leo'];
    const ids = tokens.join(',');
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    );

    if (!response.ok) return {};

    const data = await response.json();
    
    // Map CoinGecko IDs back to symbols
    const priceMap: Record<string, number> = {};
    priceMap['SWAP'] = data['swapfifty']?.usd || 0;
    priceMap['BEE'] = data['bee-crypto']?.usd || 0;
    priceMap['STEM'] = data['stem']?.usd || 0;
    priceMap['LEO'] = data['leo']?.usd || 0;
    
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
  return balances
    .filter(b => b.balance > 0) // Only include non-zero balances
    .map(b => ({
      symbol: b.symbol,
      name: b.symbol, // Placeholder - could fetch from metadata
      balance: parseFloat(b.balance),
      priceUSD: prices[b.symbol] || 0
    }))
    .filter(t => t.priceUSD > 0) // Only include tokens with known prices
    .sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD)); // Sort by value
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

    const tokens = await enrichHiveEngineTokens(balances, prices);
    const totalUSD = tokens.reduce((sum, token) => sum + (token.balance * token.priceUSD), 0);

    return { tokens, totalUSD };
  } catch (error) {
    console.error('Failed to get Hive-Engine portfolio:', error);
    return { tokens: [], totalUSD: 0 };
  }
};
