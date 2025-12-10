
import { RCData } from '../types';

const HIVE_RPC_NODE = 'https://api.hive.blog';

interface RCResponse {
  rc_accounts: Array<{
    account: string;
    rc_manabar: {
      current_mana: string;
      last_update_time: number;
    };
    max_rc: string;
  }>;
}

/**
 * Fetches RC data for a username and calculates current level based on regeneration.
 */
export const fetchRC = async (username: string): Promise<RCData | null> => {
  try {
    const response = await fetch(HIVE_RPC_NODE, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'rc_api.find_rc_accounts',
        params: { accounts: [username] },
        id: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    const account = data.result?.rc_accounts?.[0];

    if (!account) return null;

    const maxRc = Number(account.max_rc);
    const currentMana = Number(account.rc_manabar.current_mana);
    const lastUpdate = account.rc_manabar.last_update_time;
    const now = Math.floor(Date.now() / 1000);

    // Calculate regeneration
    // Full regen is 5 days (432,000 seconds)
    const REGEN_TIME = 432000;
    const elapsed = now - lastUpdate;
    const regenerated = (elapsed * maxRc) / REGEN_TIME;
    
    let actualCurrent = currentMana + regenerated;
    if (actualCurrent > maxRc) actualCurrent = maxRc;

    const percentage = (actualCurrent / maxRc) * 100;

    return {
      username: account.account,
      percentage: Math.min(Math.max(percentage, 0), 100),
      current: actualCurrent,
      max: maxRc,
      isLow: percentage < 20
    };
  } catch (e) {
    console.error("Failed to fetch RC:", e);
    return null;
  }
};

export const formatRCNumber = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'G';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toFixed(0);
};
