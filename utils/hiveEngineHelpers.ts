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
    
    console.log('🔵 Hive-Engine Request:', JSON.stringify(request, null, 2));
    
    const response = await fetch(HIVE_ENGINE_API, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('🔵 Hive-Engine Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('🔵 Hive-Engine Response Data:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.error('🔴 Hive-Engine API Error:', data.error);
      return [];
    }
    
    if (data.result && Array.isArray(data.result)) {
      console.log(`🟢 Found ${data.result.length} token balances`);
      return data.result;
    }
    
    console.warn('⚠️ Unexpected response format:', data);
    return [];
  } catch (error) {
    console.error('🔴 Failed to fetch Hive-Engine balances:', error);
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
    
    if (uniqueIds.length === 0) {
      console.warn('⚠️ No token mappings configured');
      return {};
    }
    
    const ids = uniqueIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    
    console.log('🔵 CoinGecko Request URL:', url);
    
    const response = await fetch(url);

    console.log('🔵 CoinGecko Response Status:', response.status);
    
    if (!response.ok) {
      console.error('🔴 CoinGecko API error:', response.status, response.statusText);
      return {};
    }

    const data = await response.json();
    console.log('🔵 CoinGecko Response:', JSON.stringify(data, null, 2));
    
    // Map CoinGecko responses back to symbols
    const priceMap: Record<string, number> = {};
    for (const [symbol, coingeckoId] of Object.entries(TOKEN_COINGECKO_MAP)) {
      const price = data[coingeckoId]?.usd || 0;
      priceMap[symbol] = price;
      if (price > 0) {
        console.log(`🟢 ${symbol}: $${price}`);
      }
    }
    
    console.log('🔵 Final Price Map:', priceMap);
    return priceMap;
  } catch (error) {
    console.error('🔴 Failed to fetch Hive-Engine prices:', error);
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
  console.log('🔵 === ENRICHING TOKENS ===');
  console.log('Raw balances received:', JSON.stringify(balances, null, 2));
  console.log('Prices available:', prices);
  
  if (!balances || !Array.isArray(balances)) {
    console.error('🔴 Balances is not an array:', balances);
    return [];
  }
  
  console.log(`🔵 Processing ${balances.length} balances`);
  
  const filtered = balances.filter(b => {
    const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
    const hasBalance = balanceValue > 0;
    if (!hasBalance) {
      console.log(`⚠️ Skipping ${b.symbol || b.token} (balance: ${balanceValue})`);
    }
    return hasBalance;
  });
  
  console.log(`🟢 ${filtered.length} tokens have balance > 0`);
  
  const mapped = filtered.map(b => {
    const symbol = (b.symbol?.toUpperCase() || b.token?.toUpperCase() || '').trim();
    const balanceValue = typeof b.balance === 'string' ? parseFloat(b.balance) : b.balance;
    const price = prices[symbol] || 0;
    
    console.log(`  - ${symbol}: balance=${balanceValue}, price=$${price}`);
    
    return {
      symbol,
      name: symbol,
      balance: balanceValue,
      priceUSD: price
    };
  });
  
  console.log('🔵 Mapped tokens:', mapped);
  
  const withPrice = mapped.filter(t => t.symbol && t.balance > 0);
  console.log(`🟢 ${withPrice.length} tokens have symbol and balance`);
  
  const sorted = withPrice.sort((a, b) => (b.balance * b.priceUSD) - (a.balance * a.priceUSD));
  
  console.log('🟢 Final enriched tokens:', sorted);
  
  return sorted;
};

/**
 * Fetch and calculate total Hive-Engine portfolio value
 */
export const getHiveEnginePortfolioValue = async (
  username: string
): Promise<{ tokens: HiveEngineToken[]; totalUSD: number }> => {
  try {
    console.log('\n🔵 ========== HIVE-ENGINE PORTFOLIO FETCH START ==========');
    console.log('Username:', username);
    console.log('API Endpoint:', HIVE_ENGINE_API);
    console.time('HiveEnginePortfolioFetch');
    
    const [balances, prices] = await Promise.all([
      fetchHiveEngineBalances(username),
      fetchHiveEngineTokenPrices()
    ]);

    console.log('\n🔵 --- COMBINING RESULTS ---');
    console.log('Balances returned:', balances.length, 'items');
    console.log('Prices returned:', Object.keys(prices).length, 'tokens');

    const tokens = await enrichHiveEngineTokens(balances, prices);
    
    console.log('\n🔵 --- FINAL RESULT ---');
    console.log('Tokens with prices:', tokens.length);
    
    const totalUSD = tokens.reduce((sum, token) => {
      const tokenTotal = token.balance * token.priceUSD;
      console.log(`  ${token.symbol}: ${token.balance} × $${token.priceUSD} = $${tokenTotal.toFixed(2)}`);
      return sum + tokenTotal;
    }, 0);

    console.log(`🟢 Total Portfolio Value: $${totalUSD.toFixed(2)}`);
    console.timeEnd('HiveEnginePortfolioFetch');
    console.log('🔵 ========== HIVE-ENGINE PORTFOLIO FETCH END ==========\n');

    return { tokens, totalUSD };
  } catch (error) {
    console.error('🔴 ========== CRITICAL ERROR ==========');
    console.error('Failed to get Hive-Engine portfolio:', error);
    console.error('Stack:', (error as Error).stack);
    console.error('🔴 ==========================================\n');
    return { tokens: [], totalUSD: 0 };
  }
};
