
import { AccountStats, HiveNotification } from '../types';

const HIVE_RPC_NODE = 'https://api.hive.blog';

interface RCAccountResponse {
  account: string;
  rc_manabar: {
    current_mana: string;
    last_update_time: number;
  };
  max_rc: string;
}

interface AccountResponse {
  name: string;
  voting_power: number;
  last_vote_time: string; // "2023-10-27T10:00:00"
  balance: string; // e.g., "123.456 HIVE"
  hbd_balance: string; // e.g., "50.000 HBD"
  savings_balance: string; // e.g., "200.000 HIVE"
  savings_hbd_balance: string; // e.g., "30.000 HBD"
  vesting_shares: string; // e.g., "50000.123456 VESTS" (Staked HIVE / HP)
  delegated_vesting_shares: string; // e.g., "1000.000000 VESTS"
  reward_hive_balance: string; // e.g., "1.234 HIVE"
  reward_hbd_balance: string; // e.g., "0.567 HBD"
}

/**
 * Fetches notifications for a user using Hivemind bridge API.
 */
export const fetchNotifications = async (username: string, limit: number = 20, lastId: number | null = null): Promise<HiveNotification[]> => {
  try {
    const params: any = { account: username, limit };
    if (lastId !== null) {
      params.last_id = lastId;
    }

    const response = await fetch(HIVE_RPC_NODE, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'bridge.account_notifications',
        params,
        id: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return data.result || [];
  } catch (e) {
    console.error("Failed to fetch notifications:", e);
    return [];
  }
};

/**
 * Fetches both RC and VP data for a username.
 */
export const fetchAccountStats = async (username: string): Promise<AccountStats | null> => {
  try {
    // Parallel fetch for RC, Account data, and Global data (for vesting conversion)
    const [rcResponse, accountResponse, globalResponse] = await Promise.all([
      fetch(HIVE_RPC_NODE, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'rc_api.find_rc_accounts',
          params: { accounts: [username] },
          id: 1,
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(HIVE_RPC_NODE, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_accounts',
          params: [[username]],
          id: 2,
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(HIVE_RPC_NODE, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'condenser_api.get_dynamic_global_properties',
          params: [],
          id: 3,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    ]);

    const rcData = await rcResponse.json();
    const acctData = await accountResponse.json();
    const globalData = await globalResponse.json();

    const rcAccount = rcData.result?.rc_accounts?.[0] as RCAccountResponse | undefined;
    const account = acctData.result?.[0] as AccountResponse | undefined;
    const globals = globalData.result as any;

    if (!rcAccount || !account || !globals) return null;

    const now = Math.floor(Date.now() / 1000);
    const REGEN_TIME = 432000; // 5 days in seconds

    // --- CALCULATE RC ---
    const maxRc = Number(rcAccount.max_rc);
    const currentRcMana = Number(rcAccount.rc_manabar.current_mana);
    const lastRcUpdate = rcAccount.rc_manabar.last_update_time;
    
    const rcElapsed = now - lastRcUpdate;
    const rcRegenerated = (rcElapsed * maxRc) / REGEN_TIME;
    let actualCurrentRc = currentRcMana + rcRegenerated;
    if (actualCurrentRc > maxRc) actualCurrentRc = maxRc;
    
    const rcPercentage = (actualCurrentRc / maxRc) * 100;

    // --- CALCULATE VP ---
    // voting_power is 0-10000
    const lastVoteTime = new Date(account.last_vote_time + 'Z').getTime() / 1000;
    const vpElapsed = now - lastVoteTime;
    const vpRegenerated = (vpElapsed * 10000) / REGEN_TIME;
    
    let actualCurrentVp = account.voting_power + vpRegenerated;
    if (actualCurrentVp > 10000) actualCurrentVp = 10000;
    
    const vpPercentage = actualCurrentVp / 100;

    // --- EXTRACT BALANCES ---
    const parseBalance = (balanceStr: string): number => {
      const match = balanceStr.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    // Convert VESTS to HIVE
    const vestingShares = parseBalance(account.vesting_shares);
    const totalVestingShares = parseBalance(globals.total_vesting_shares);
    const totalVestingFundHive = parseBalance(globals.total_vesting_fund_hive);
    const hp = (vestingShares / totalVestingShares) * totalVestingFundHive;

    const balances = {
      hive: parseBalance(account.balance),
      hbd: parseBalance(account.hbd_balance),
      savingsHive: parseBalance(account.savings_balance),
      savingsHbd: parseBalance(account.savings_hbd_balance),
      hivepower: hp,
      pendingHive: parseBalance(account.reward_hive_balance),
      pendingHbd: parseBalance(account.reward_hbd_balance),
      delegatedHp: parseBalance(account.delegated_vesting_shares) / totalVestingShares * totalVestingFundHive
    };

    return {
      username: rcAccount.account,
      rc: {
        percentage: Math.min(Math.max(rcPercentage, 0), 100),
        current: actualCurrentRc,
        max: maxRc,
        isLow: rcPercentage < 20
      },
      vp: {
        percentage: Math.min(Math.max(vpPercentage, 0), 100),
        value: Math.floor(actualCurrentVp),
        isLow: vpPercentage < 20
      },
      balances
    };
  } catch (e) {
    console.error("Failed to fetch stats:", e);
    return null;
  }
};

/**
 * Fetches the current HIVE price from CoinGecko (Exchange price).
 */
export const fetchHivePrice = async (): Promise<number | null> => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive&vs_currencies=usd');
    const data = await response.json();
    return data?.hive?.usd || null;
  } catch (e) {
    console.error("Failed to fetch HIVE exchange price:", e);
    return null;
  }
};

/**
 * Fetches the HIVE price from the internal market (HBD/HIVE).
 */
export const fetchInternalMarketPrice = async (): Promise<number | null> => {
  try {
    const response = await fetch(HIVE_RPC_NODE, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_ticker',
        params: [],
        id: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    // highest_bid is the current market price in HBD
    return Number(data.result?.highest_bid) || null;
  } catch (e) {
    console.error("Failed to fetch HIVE internal market price:", e);
    return null;
  }
};

export const formatRCNumber = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'G';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(0);
};

/**
 * Calculates total portfolio value in USD from account balances and token prices.
 */
export interface PortfolioValue {
  total: number; // Total USD value
  breakdown: {
    hive: number;
    hbd: number;
    savingsHive: number;
    savingsHbd: number;
    hivepower: number;
    pendingHive: number;
    pendingHbd: number;
    delegatedHp: number;
  };
}

export const calculatePortfolioValue = (
  balances: {
    hive: number;
    hbd: number;
    savingsHive: number;
    savingsHbd: number;
    hivepower: number;
    pendingHive: number;
    pendingHbd: number;
    delegatedHp?: number;
  },
  hivePrice: number,
  hbdPrice: number = 1.0 // HBD is stablecoin, default to $1
): PortfolioValue => {
  const breakdown = {
    hive: balances.hive * hivePrice,
    hbd: balances.hbd * hbdPrice,
    savingsHive: balances.savingsHive * hivePrice,
    savingsHbd: balances.savingsHbd * hbdPrice,
    hivepower: balances.hivepower * hivePrice,
    pendingHive: balances.pendingHive * hivePrice,
    pendingHbd: balances.pendingHbd * hbdPrice,
    delegatedHp: (balances.delegatedHp || 0) * hivePrice
  };

  return {
    total: Object.values(breakdown).reduce((a, b) => a + b, 0),
    breakdown
  };
};

/**
 * Format number as USD currency.
 */
export const formatUSD = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};
