
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
}

/**
 * Fetches notifications for a user using Hivemind bridge API.
 */
export const fetchNotifications = async (username: string, limit: number = 20): Promise<HiveNotification[]> => {
  try {
    const response = await fetch(HIVE_RPC_NODE, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'bridge.account_notifications',
        params: { account: username, limit },
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
    // Parallel fetch for RC and standard Account data
    const [rcResponse, accountResponse] = await Promise.all([
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
      })
    ]);

    const rcData = await rcResponse.json();
    const acctData = await accountResponse.json();

    const rcAccount = rcData.result?.rc_accounts?.[0] as RCAccountResponse | undefined;
    const account = acctData.result?.[0] as AccountResponse | undefined;

    if (!rcAccount || !account) return null;

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
      }
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
