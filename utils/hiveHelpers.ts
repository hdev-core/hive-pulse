import { AccountStats, HiveNotification, HiveNotificationType, TransferRecord, TrendingPost, TrendingCommunity } from '../types';
import { HIVE_RPC_NODES, FYP_API_BASE, BALANCE_API_BASE, HAF_STATS_API_BASE } from '../constants';

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
  received_vesting_shares: string;
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
    // Transient network/node failures are expected — degrade quietly, don't alarm the user
    const isNetwork = e instanceof TypeError && /fetch/i.test(e.message);
    if (isNetwork) console.warn("Notifications temporarily unavailable (node unreachable)");
    else console.error("Failed to fetch notifications:", e);
    return [];
  }
};

const ACCOUNT_HISTORY_FINANCE_OPS = new Set([
  'transfer',
  'interest',
  'claim_reward_balance',
  'transfer_to_vesting',
  'withdraw_vesting',
  'fill_vesting_withdraw',
  'transfer_to_savings',
  'transfer_from_savings',
  'fill_transfer_from_savings',
  'proposal_pay',
]);

function normalizeAccountHistoryOp(
  seq: number,
  opType: string,
  opData: Record<string, any>,
  timestamp: string,
  username: string
): HiveNotification | null {
  const base = {
    id: seq,
    score: 0,
    date: timestamp,
    url: `/@${username}/transfers`,
    author: '',
  };

  switch (opType) {
    case 'transfer': {
      const isIncoming = opData.to === username;
      const counterparty = isIncoming ? opData.from : opData.to;
      return {
        ...base,
        type: HiveNotificationType.TRANSFER,
        msg: isIncoming
          ? `Received ${opData.amount} from @${counterparty}`
          : `Sent ${opData.amount} to @${counterparty}`,
        amount: opData.amount,
        memo: opData.memo,
        author: counterparty,
      };
    }
    case 'proposal_pay':
      return {
        ...base,
        type: HiveNotificationType.PROPOSAL_PAY,
        msg: `Proposal #${opData.proposal_id} payment: ${opData.payment}`,
        amount: opData.payment,
        author: opData.receiver,
      };
    case 'interest':
      return { ...base, type: HiveNotificationType.INTEREST,
        msg: `HBD savings interest: ${opData.interest}`, amount: opData.interest };
    case 'claim_reward_balance': {
      const parts = [opData.reward_hive, opData.reward_hbd, opData.reward_vests]
        .filter((r: string) => r && !r.startsWith('0.000'));
      return { ...base, type: HiveNotificationType.CLAIM_REWARD,
        msg: `Claimed rewards: ${parts.join(' + ')}`, amount: parts.join(' + ') };
    }
    case 'transfer_to_vesting':
      return { ...base, type: HiveNotificationType.POWER_UP,
        msg: `Powered up ${opData.amount} to HP`, amount: opData.amount };
    case 'withdraw_vesting':
      return { ...base, type: HiveNotificationType.POWER_DOWN,
        msg: `Power down initiated: ${opData.vesting_shares}`, amount: opData.vesting_shares };
    case 'fill_vesting_withdraw':
      return { ...base, type: HiveNotificationType.POWER_DOWN_FILL,
        msg: `Power down payment: received ${opData.deposited}`, amount: opData.deposited };
    case 'transfer_to_savings':
      return { ...base, type: HiveNotificationType.SAVINGS_DEPOSIT,
        msg: `Moved ${opData.amount} to savings`, amount: opData.amount, memo: opData.memo };
    case 'transfer_from_savings':
      return { ...base, type: HiveNotificationType.SAVINGS_WITHDRAW,
        msg: `Savings withdrawal requested: ${opData.amount}`, amount: opData.amount, memo: opData.memo };
    case 'fill_transfer_from_savings':
      return { ...base, type: HiveNotificationType.SAVINGS_WITHDRAW_FILL,
        msg: `Savings withdrawal completed: ${opData.amount}`, amount: opData.amount };
    default:
      return null;
  }
}

export const fetchAccountHistoryFinance = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean },
  start: number = -1,
  limit: number = 1000,
): Promise<{ items: HiveNotification[]; hasMore: boolean; oldestSeq: number | null }> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_account_history', params: [username, start, limit], id: 1 },
      primary, fallback, autoSwitch
    );
    const ops: [number, any][] = data.result || [];
    const result: HiveNotification[] = [];
    for (let i = ops.length - 1; i >= 0; i--) {
      const [seq, entry] = ops[i];
      const [opType, opData] = entry.op;
      if (!ACCOUNT_HISTORY_FINANCE_OPS.has(opType)) continue;
      const notif = normalizeAccountHistoryOp(seq, opType, opData, entry.timestamp, username);
      if (notif) result.push(notif);
    }
    return {
      items: result,
      hasMore: ops.length >= limit,
      oldestSeq: ops.length > 0 ? ops[0][0] : null,
    };
  } catch (e) {
    console.error('Failed to fetch account history finance ops', e);
    return { items: [], hasMore: false, oldestSeq: null };
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
      delegatedHp: parseBalance(account.delegated_vesting_shares) / totalVestingShares * totalVestingFundHive,
      receivedDelegations: parseBalance(account.received_vesting_shares) / totalVestingShares * totalVestingFundHive,
    };

    const vestingRatio = hp > 0 ? totalVestingFundHive / hp : 1;

    return {
      username: rcAccount.account,
      rc: {
        percentage: Math.min(Math.max(rcPercentage, 0), 100),
        current: actualCurrentRc,
        max: maxRc,
        isLow: rcPercentage < 20,
        vestingRatio,
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

// ── Trending ──────────────────────────────────────────────────────────────────

export const fetchTrendingPosts = async (
  limit = 20,
  tag = '',
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean },
  sort: 'trending' | 'hot' | 'created' = 'trending'
): Promise<TrendingPost[]> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'bridge.get_ranked_posts',
        params: { sort, limit, tag, observer: '' }, id: 1 },
      primary, fallback, autoSwitch
    );
    const posts: any[] = data.result || [];
    return posts.map(p => ({
      author:       p.author,
      permlink:     p.permlink,
      title:        p.title || '(no title)',
      pendingPayout: parseFloat(p.pending_payout_value?.split(' ')[0] || '0'),
      totalPayout:   parseFloat(p.total_payout_value?.split(' ')[0] || '0') +
                     parseFloat(p.curator_payout_value?.split(' ')[0] || '0'),
      votes:         p.net_votes ?? 0,
      comments:      p.children ?? 0,
      created:       p.created || '',
      tags:          p.json_metadata ? (() => { try { return JSON.parse(p.json_metadata).tags || []; } catch { return []; } })() : [],
    }));
  } catch (e) {
    console.error('Failed to fetch trending posts:', e);
    return [];
  }
};

// ── For You (FYP) ───────────────────────────────────────────────────────────
// The HAF FYP service returns posts in bridge.get_ranked_posts shape (so the
// mapping mirrors fetchTrendingPosts) with two differences: json_metadata is
// already an object, and each post carries a nested `fyp` scoring object.

const parsePayoutNum = (v: any): number => parseFloat(String(v ?? '').split(' ')[0] || '0') || 0;

const mapFypPost = (p: any): TrendingPost => {
  const meta = typeof p.json_metadata === 'string'
    ? (() => { try { return JSON.parse(p.json_metadata); } catch { return {}; } })()
    : (p.json_metadata || {});
  const f = p.fyp || {};
  return {
    author:        p.author,
    permlink:      p.permlink,
    title:         p.title || '(no title)',
    pendingPayout: parsePayoutNum(p.pending_payout_value),
    totalPayout:   parsePayoutNum(p.author_payout_value) + parsePayoutNum(p.curator_payout_value),
    votes:         p.stats?.total_votes ?? p.net_votes ?? (p.active_votes?.length ?? 0),
    comments:      p.children ?? 0,
    created:       p.created || '',
    tags:          Array.isArray(meta.tags) ? meta.tags : [],
    fyp: {
      rank:                  f.rank ?? 0,
      finalScore:            f.final_score ?? 0,
      boostSource:           f.boost_source ?? null,
      scoreRecency:          f.score_recency ?? null,
      scoreRelevance:        f.score_relevance ?? null,
      scoreEngagement:       f.score_engagement ?? null,
      scoreCredibility:      f.score_credibility ?? null,
      communityBoostApplied: !!f.community_boost_applied,
    },
  };
};

// Personalized "For You" feed when a username is provided (the ranker falls back
// to the global feed until it has built a profile for that user); otherwise the
// public global feed. Both return the same post shape.
export const fetchFypPosts = async (
  username?: string,
  limit = 20,
  page = 1
): Promise<TrendingPost[]> => {
  try {
    const qs = `page=${page}&page-size=${limit}&truncate_body=1`;
    const url = username
      ? `${FYP_API_BASE}/v1/fyp/feed/${encodeURIComponent(username)}?${qs}`
      : `${FYP_API_BASE}/v1/fyp/global?${qs}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error(`FYP API ${response.status}`);
    const posts = await response.json();
    return Array.isArray(posts) ? posts.map(mapFypPost) : [];
  } catch (e) {
    console.error('Failed to fetch For You feed:', e);
    return [];
  }
};

// ── Power-down status ───────────────────────────────────────────────────────
// HP power-down lives on the account object: vesting_withdraw_rate (VESTS/week),
// to_withdraw / withdrawn (µVESTS), and next_vesting_withdrawal (next payout).

export interface PowerDownStatus {
  active: boolean;
  weeklyRateHp: number;
  remainingHp: number;
  totalHp: number;
  nextDate: string | null;
  weeksLeft: number;
}

const INACTIVE_POWER_DOWN: PowerDownStatus = {
  active: false, weeklyRateHp: 0, remainingHp: 0, totalHp: 0, nextDate: null, weeksLeft: 0,
};

export const fetchPowerDownStatus = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<PowerDownStatus> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const [acctData, conv] = await Promise.all([
      rpcFetchWithFallback(
        { jsonrpc: '2.0', method: 'condenser_api.get_accounts', params: [[username]], id: 1 },
        primary, fallback, autoSwitch
      ),
      fetchHpVestConversion(settings),
    ]);
    const a = acctData.result?.[0];
    if (!a || !conv) return INACTIVE_POWER_DOWN;

    const num = (s: any) => { const m = String(s).match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
    const rateVests = num(a.vesting_withdraw_rate);
    const nextMs = new Date(a.next_vesting_withdrawal + 'Z').getTime();
    const active = rateVests > 0 && nextMs > Date.now();
    if (!active) return INACTIVE_POWER_DOWN;

    // to_withdraw / withdrawn are integers in µVESTS (VESTS × 1e6).
    const remainingVests = Math.max(0, (Number(a.to_withdraw) - Number(a.withdrawn)) / 1e6);
    const totalVests = Number(a.to_withdraw) / 1e6;
    const hp = (v: number) => v * conv.hivePerVests;
    const weeklyRateHp = hp(rateVests);

    return {
      active: true,
      weeklyRateHp,
      remainingHp: hp(remainingVests),
      totalHp: hp(totalVests),
      nextDate: a.next_vesting_withdrawal,
      weeksLeft: weeklyRateHp > 0 ? Math.ceil(hp(remainingVests) / weeklyRateHp) : 0,
    };
  } catch (e) {
    console.error('Failed to fetch power-down status:', e);
    return INACTIVE_POWER_DOWN;
  }
};

// ── Balance history (HAF Balance Tracker) ───────────────────────────────────
// Monthly aggregated balances for a coin. Raw values are integers in the coin's
// smallest unit (HIVE/HBD = 3 decimals, VESTS = 6), so we scale to whole tokens.

export interface BalancePoint {
  date: string;   // ISO month bucket
  value: number;  // whole tokens (VESTS still in VESTS — convert to HP at the call site)
}

export const fetchHiveBalanceHistory = async (
  username: string,
  coin: 'HIVE' | 'HBD' | 'VESTS',
  months = 18
): Promise<BalancePoint[]> => {
  try {
    const url = `${BALANCE_API_BASE}/accounts/${encodeURIComponent(username)}/aggregated-history?coin-type=${coin}&granularity=monthly&direction=asc`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`balance-api ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) return [];

    const divisor = coin === 'VESTS' ? 1e6 : 1000;
    const points: BalancePoint[] = data.map((d: any) => ({
      date: d.date,
      value: (parseFloat(d.balance?.balance ?? '0') || 0) / divisor,
    }));

    // Drop the long all-zero prefix before the account first held this coin.
    const firstNonZero = points.findIndex(p => p.value > 0);
    const trimmed = firstNonZero >= 0 ? points.slice(firstNonZero) : points;
    return trimmed.slice(-months);
  } catch (e) {
    console.error('Failed to fetch balance history:', e);
    return [];
  }
};

// ── RC Operation Costs ───────────────────────────────────────────────────────
// Average RC consumed per operation, used to show "how many X can I do with my
// current RC" in the RC budget card. Standard Hive nodes don't expose a real
// per-op RC price, so we use the HAF Stats `rc-footprint` endpoint, which prices
// each op type from the calibrated `rc_op_stats_daily` rates. These rates are
// effectively network constants (near-identical across all accounts), so we seed
// from a stable fallback table and override with the account's own live rates
// wherever its on-chain history covers that op type.
//
// Note: posts and comments are both `comment_operation` on-chain, so they share
// the same RC cost.

export interface RcOperationCosts {
  vote: number;
  comment: number;
  post: number;
  transfer: number;
  customJson: number;
}

// Network-calibrated fallback rates (avg RC per op), harvested from HAF Stats
// rc_op_stats_daily (2026). Stable to within ~1% across accounts; used when the
// stats node is unreachable or the account has no history for a given op type.
const RC_RATE_FALLBACK = {
  vote:       97_300_000,
  comment:    1_200_000_000, // comment_operation — covers both posts and comments
  transfer:   166_000_000,
  customJson: 167_700_000,
};

export const fetchRcOperationCosts = async (
  username: string
): Promise<RcOperationCosts | null> => {
  const rates = { ...RC_RATE_FALLBACK };
  try {
    // Wide window so an active account's footprint covers as many op types as
    // possible; missing op types simply keep their calibrated fallback rate.
    const from = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
    const url = `${HAF_STATS_API_BASE}/account/${encodeURIComponent(username)}/rc-footprint?group_by=op_type&from_date=${from}`;
    const res = await fetch(url);
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const count = Number(r.op_count);
          const consumed = Number(r.rc_consumed);
          if (!count || !consumed) continue;
          const avg = consumed / count;
          switch (r.label) {
            case 'vote_operation':        rates.vote = avg;       break;
            case 'comment_operation':     rates.comment = avg;    break;
            case 'transfer_operation':    rates.transfer = avg;   break;
            case 'custom_json_operation': rates.customJson = avg; break;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch RC footprint, using calibrated fallback rates:', e);
  }

  return {
    vote:       rates.vote,
    comment:    rates.comment,
    post:       rates.comment, // same on-chain op as comment
    transfer:   rates.transfer,
    customJson: rates.customJson,
  };
};

export const fetchTrendingCommunities = async (
  limit = 20,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<TrendingCommunity[]> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'bridge.list_communities',
        params: { sort: 'rank', limit, observer: '' }, id: 1 },
      primary, fallback, autoSwitch
    );
    const communities: any[] = data.result || [];
    return communities.map(c => ({
      name:        c.name,
      title:       c.title || c.name,
      about:       c.about || '',
      subscribers: c.subscribers ?? 0,
      numAuthors:  c.num_authors ?? 0,
      numPending:  c.num_pending ?? 0,
      sumPending:  c.sum_pending ?? 0,
    }));
  } catch (e) {
    console.error('Failed to fetch trending communities:', e);
    return [];
  }
};

// HP <-> VESTS conversion factor from global dynamic properties.
// withdraw_vesting (power down) takes VESTS, but users think in HP — convert with this.
/**
 * Hive accounts starting with `prefix`, for recipient autocomplete.
 * condenser_api.lookup_accounts is a straight prefix scan over the account index.
 */
export const lookupHiveAccounts = async (
  prefix: string,
  limit = 8,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<string[]> => {
  const q = prefix.replace('@', '').trim().toLowerCase();
  if (!q) return [];
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.lookup_accounts', params: [q, Math.min(limit, 20)], id: 1 },
      primary, fallback, autoSwitch
    );
    const names: string[] = data.result || [];
    // lookup_accounts returns names >= the query, not only those matching it.
    return names.filter(n => n.startsWith(q));
  } catch {
    return [];
  }
};

export interface AccountCard {
  username: string;
  reputation: number;   // the familiar 25–80ish display score
  hp: number;
  postCount: number;
  createdIso: string;   // account creation date
  ageDays: number;
}

/**
 * Compact profile for the on-page username hover card.
 *
 * Reputation and account age are deliberately front and centre: together they are the
 * cheapest, most reliable scam heuristic on Hive — a days-old account with default
 * reputation asking for funds is the shape of virtually every impersonation attempt.
 */
export const fetchAccountCard = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<AccountCard | null> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const [acctData, globalData] = await Promise.all([
      rpcFetchWithFallback(
        { jsonrpc: '2.0', method: 'condenser_api.get_accounts', params: [[username]], id: 1 },
        primary, fallback, autoSwitch
      ),
      rpcFetchWithFallback(
        { jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 2 },
        primary, fallback, autoSwitch
      ),
    ]);

    const a = acctData.result?.[0];
    const g = globalData.result;
    if (!a || !g) return null;

    const num = (s: string) => { const m = String(s).match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
    const hp = (num(a.vesting_shares) / num(g.total_vesting_shares)) * num(g.total_vesting_fund_hive);

    // Raw reputation -> the 25-80 score users recognise.
    const raw = Number(a.reputation) || 0;
    let reputation = 25;
    if (raw !== 0) {
      const neg = raw < 0;
      const log = Math.log10(Math.abs(raw));
      let out = Math.max(log - 9, 0);
      if (neg) out = -out;
      reputation = out * 9 + 25;
    }

    const createdIso = a.created || '';
    const ageDays = createdIso
      ? Math.max(0, Math.floor((Date.now() - new Date(createdIso + 'Z').getTime()) / 86400000))
      : 0;

    return {
      username,
      reputation: Math.round(reputation * 10) / 10,
      hp,
      postCount: Number(a.post_count) || 0,
      createdIso,
      ageDays,
    };
  } catch {
    return null;
  }
};

export const fetchHpVestConversion = async (
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean }
): Promise<{ vestsPerHive: number; hivePerVests: number } | null> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 1 },
      primary, fallback, autoSwitch
    );
    const g = data.result;
    if (!g) return null;
    const num = (s: string) => { const m = String(s).match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
    const totalVests = num(g.total_vesting_shares);
    const totalHive  = num(g.total_vesting_fund_hive);
    if (totalVests <= 0 || totalHive <= 0) return null;
    return { vestsPerHive: totalVests / totalHive, hivePerVests: totalHive / totalVests };
  } catch {
    return null;
  }
};