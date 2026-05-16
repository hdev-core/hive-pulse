import { AccountStats, HiveNotification, TransferRecord } from '../types';
import { HIVE_RPC_NODES } from '../constants';

const DEFAULT_HIVE_RPC_NODE = HIVE_RPC_NODES[0];

type RpcBody = Record<string, any>;

const rpcFetch = async (nodeUrl: string, body: RpcBody): Promise<any> => {
  const response = await fetch(nodeUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
};

const rpcFetchWithFallback = async (
  body: RpcBody,
  primaryNode: string,
  fallbackNodes?: string[],
  autoSwitch?: boolean
): Promise<any> => {
  const data = await rpcFetch(primaryNode, body);
  if (data.result !== undefined && data.result !== null) return data;

  if (!autoSwitch || !fallbackNodes?.length) return data;

  for (const node of fallbackNodes) {
    if (node === primaryNode) continue;
    try {
      const fallbackData = await rpcFetch(node, body);
      if (fallbackData.result !== undefined && fallbackData.result !== null) return fallbackData;
    } catch {}
  }

  return data;
};

const getHiveNodes = (settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }): {
  primary: string;
  fallback: string[];
  autoSwitch: boolean;
} => {
  const primary = settings?.hiveRpcNode || DEFAULT_HIVE_RPC_NODE;
  const custom = settings?.customHiveRpcNodes || [];
  const fallback = [...HIVE_RPC_NODES.filter(n => n !== primary), ...custom.filter(n => n !== primary)];
  const autoSwitch = settings?.autoSwitchHiveNode || false;
  return { primary, fallback, autoSwitch };
};

interface RCAccountResponse {
  account: string;
  rc_manabar: { current_mana: string; last_update_time: number };
  max_rc: string;
}

interface AccountResponse {
  name: string;
  voting_power: number;
  last_vote_time: string;
  balance: string;
  hbd_balance: string;
  savings_balance: string;
  savings_hbd_balance: string;
  savings_hbd_last_interest_payment?: string;
  vesting_shares: string;
  delegated_vesting_shares: string;
  reward_hive_balance: string;
  reward_hbd_balance: string;
  reward_vesting_balance: string;
}

export const fetchNotifications = async (
  username: string,
  limit: number = 20,
  lastId: number | null = null,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<HiveNotification[]> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const params: any = { account: username, limit };
    if (lastId !== null) params.last_id = lastId;

    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'bridge.account_notifications', params, id: 1 },
      primary, fallback, autoSwitch
    );
    return data.result || [];
  } catch (e) {
    console.error("Failed to fetch notifications:", e);
    return [];
  }
};

export const fetchAccountStats = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<AccountStats | null> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const makeBody = (method: string, params: any, id: number) => ({
      jsonrpc: '2.0', method, params, id
    });

    const [rcData, acctData, globalData] = await Promise.all([
      rpcFetchWithFallback(makeBody('rc_api.find_rc_accounts', { accounts: [username] }, 1), primary, fallback, autoSwitch),
      rpcFetchWithFallback(makeBody('condenser_api.get_accounts', [[username]], 2), primary, fallback, autoSwitch),
      rpcFetchWithFallback(makeBody('condenser_api.get_dynamic_global_properties', [], 3), primary, fallback, autoSwitch),
    ]);

    const rcAccount = rcData.result?.rc_accounts?.[0] as RCAccountResponse | undefined;
    const account = acctData.result?.[0] as AccountResponse | undefined;
    const globals = globalData.result as any;

    if (!rcAccount || !account || !globals) return null;

    const now = Math.floor(Date.now() / 1000);
    const REGEN_TIME = 432000;

    const maxRc = Number(rcAccount.max_rc);
    const currentRcMana = Number(rcAccount.rc_manabar.current_mana);
    const lastRcUpdate = rcAccount.rc_manabar.last_update_time;
    const rcElapsed = now - lastRcUpdate;
    const rcRegenerated = (rcElapsed * maxRc) / REGEN_TIME;
    let actualCurrentRc = currentRcMana + rcRegenerated;
    if (actualCurrentRc > maxRc) actualCurrentRc = maxRc;
    const rcPercentage = (actualCurrentRc / maxRc) * 100;

    const lastVoteTime = new Date(account.last_vote_time + 'Z').getTime() / 1000;
    const vpElapsed = now - lastVoteTime;
    const vpRegenerated = (vpElapsed * 10000) / REGEN_TIME;
    let actualCurrentVp = account.voting_power + vpRegenerated;
    if (actualCurrentVp > 10000) actualCurrentVp = 10000;
    const vpPercentage = actualCurrentVp / 100;

    const parseBalance = (balanceStr: string): number => {
      const match = balanceStr.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    const vestingShares = parseBalance(account.vesting_shares);
    const totalVestingShares = parseBalance(globals.total_vesting_shares);
    const totalVestingFundHive = parseBalance(globals.total_vesting_fund_hive);
    const hp = (vestingShares / totalVestingShares) * totalVestingFundHive;

    const balances = {
      hive: parseBalance(account.balance),
      hbd: parseBalance(account.hbd_balance),
      savingsHive: parseBalance(account.savings_balance),
      savingsHbd: parseBalance(account.savings_hbd_balance),
      savingsHbdLastInterestPayment: account.savings_hbd_last_interest_payment,
      hivepower: hp,
      pendingHive: parseBalance(account.reward_hive_balance),
      pendingHbd: parseBalance(account.reward_hbd_balance),
      pendingVests: parseBalance(account.reward_vesting_balance),
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

export const fetchInternalMarketPrice = async (
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<number | null> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_ticker', params: [], id: 1 },
      primary, fallback, autoSwitch
    );
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

export interface PortfolioValue {
  total: number;
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
  hbdPrice: number = 1.0
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

export const validateHiveAccount = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<boolean> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_accounts', params: [[username]], id: 1 },
      primary, fallback, autoSwitch
    );
    return Array.isArray(data.result) && data.result.length > 0;
  } catch {
    return false;
  }
};

const parseOpAmount = (amount: any): string => {
  if (typeof amount === 'string') return amount;
  // HF26+ object format: {amount, precision, nai}
  if (amount && typeof amount === 'object') {
    const naiMap: Record<string, string> = {
      '@@000000021': 'HIVE',
      '@@000000013': 'HBD',
      '@@000000037': 'VESTS',
    };
    const symbol = naiMap[amount.nai] || amount.nai || '';
    const val = (Number(amount.amount) / Math.pow(10, amount.precision)).toFixed(amount.precision);
    return `${val} ${symbol}`;
  }
  return String(amount);
};

const PAGE_SIZE = 20;

export const fetchTransferHistory = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean },
  start: number = -1
): Promise<{ records: TransferRecord[]; nextCursor: number | null }> => {
  const { primary, fallback, autoSwitch } = getHiveNodes(settings);
  // operation_filter_low bitmask: transfer = op type 2 → 1 << 2 = 4
  const data = await rpcFetchWithFallback(
    { jsonrpc: '2.0', method: 'condenser_api.get_account_history', params: [username, start, PAGE_SIZE, 4], id: 1 },
    primary, fallback, autoSwitch
  );

  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const ops: any[] = data.result || [];
  if (!ops.length) return { records: [], nextCursor: null };

  // ops are [seq, entry] tuples sorted oldest-first; oldest seq is ops[0][0]
  const oldestSeq: number = Array.isArray(ops[0]) ? ops[0][0] : null;
  const nextCursor = oldestSeq !== null && oldestSeq > 0 ? oldestSeq - 1 : null;

  const transfers: TransferRecord[] = [];
  // iterate newest-first
  for (let i = ops.length - 1; i >= 0; i--) {
    const entry = Array.isArray(ops[i]) ? ops[i][1] : ops[i];
    if (!entry) continue;

    // Handle both old tuple format ["transfer", {...}] and new object format {type, value}
    let opType: string;
    let opValue: any;
    if (Array.isArray(entry.op)) {
      [opType, opValue] = entry.op;
    } else if (entry.op && typeof entry.op === 'object') {
      opType = (entry.op.type || '').replace('_operation', '');
      opValue = entry.op.value;
    } else {
      continue;
    }

    if (opType !== 'transfer' || !opValue) continue;

    transfers.push({
      trxId: entry.trx_id || '',
      timestamp: entry.timestamp || '',
      from: opValue.from || '',
      to: opValue.to || '',
      amount: parseOpAmount(opValue.amount),
      memo: opValue.memo || '',
    });
  }
  return { records: transfers, nextCursor };
};

export const fetchHbdInterestRate = async (
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<number | null> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 1 },
      primary, fallback, autoSwitch
    );
    // hbd_interest_rate is in basis points (e.g. 2000 = 20%)
    const basisPoints = data.result?.hbd_interest_rate;
    return typeof basisPoints === 'number' ? basisPoints / 10000 : null;
  } catch (e) {
    console.error('Failed to fetch HBD interest rate:', e);
    return null;
  }
};

export const formatUSD = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export interface HbdInterestRecord {
  timestamp: string;
  amount: number;
}

export const fetchHbdInterestHistory = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean },
  limit: number = 5
): Promise<HbdInterestRecord[]> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_account_history', params: [username, -1, 200], id: 1 },
      primary, fallback, autoSwitch
    );

    const ops: any[] = data.result || [];
    const records: HbdInterestRecord[] = [];

    for (let i = ops.length - 1; i >= 0 && records.length < limit; i--) {
      const entry = Array.isArray(ops[i]) ? ops[i][1] : ops[i];
      if (!entry) continue;

      let opType: string;
      let opValue: any;

      if (Array.isArray(entry.op)) {
        [opType, opValue] = entry.op;
      } else if (entry.op && typeof entry.op === 'object') {
        opType = (entry.op.type || '').replace('_operation', '');
        opValue = entry.op.value;
      } else {
        continue;
      }

      if (opType !== 'interest' || !opValue) continue;

      const raw = opValue.interest;
      const amountStr = parseOpAmount(raw);
      const amount = parseFloat(amountStr.match(/[\d.]+/)?.[0] || '0');
      records.push({ timestamp: entry.timestamp || '', amount });
    }

    return records;
  } catch (e) {
    console.error('Failed to fetch HBD interest history:', e);
    return [];
  }
};