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
  // Internal market. `limit_order_cancel` is admitted only so the de-duplication in
  // fetchAccountHistoryFinance can see it; it rarely renders a row of its own.
  'limit_order_create',
  'limit_order_create2',
  'limit_order_cancel',
  'limit_order_cancelled',
  'fill_order',
  // Conversions. Unlike cancellations these do not pair up: the request and its fill
  // are days apart, and both are worth a row of their own.
  'convert',
  'collateralized_convert',
  'fill_convert_request',
  'fill_collateralized_convert_request',
  // The op that actually reports the HBD landing for a collateralized convert. It fires
  // at request time; the later fill only settles the collateral.
  'collateralized_convert_immediate_conversion',
]);

/**
 * `"208.739 HIVE"` -> `{ amount: 208.739, symbol: 'HIVE' }`.
 *
 * Must never throw. Op payloads come from whatever RPC node the user configured, and
 * a node answering with appbase assets (`{ amount, precision, nai }`) rather than the
 * legacy string would otherwise blow up the whole account-history fetch.
 *
 * The pattern is deliberately strict: `[\d.]+` would accept `"1.2.3 HIVE"`, which
 * parseFloat silently truncates to 1.2 — a wrong number stated as fact.
 */
function parseAsset(raw?: unknown): { amount: number; symbol: string } | null {
  if (typeof raw !== 'string') return null;
  const m = /^(\d+(?:\.\d+)?)\s+([A-Z]+)$/.exec(raw.trim());
  if (!m) return null;
  const amount = parseFloat(m[1]);
  return Number.isFinite(amount) ? { amount, symbol: m[2] } : null;
}

/**
 * HBD per HIVE for a HIVE/HBD pair, which is the number traders actually quote.
 * Returns null for any other pair, so a future non-HBD market cannot render a
 * meaningless rate.
 */
function pairRate(a?: string, b?: string): string | null {
  const x = parseAsset(a);
  const y = parseAsset(b);
  if (!x || !y) return null;
  const hive = x.symbol === 'HIVE' ? x : y.symbol === 'HIVE' ? y : null;
  const hbd = x.symbol === 'HBD' ? x : y.symbol === 'HBD' ? y : null;
  if (!hive || !hbd || hive.amount === 0) return null;
  // Dust legs quote nonsense: a 0.001/0.001 fill "prices" HIVE at 1 HBD, ~23x the real
  // market, and sits in the same column as genuine prices. Below a leg of 0.010 the
  // rounding dominates the rate, so no rate is better than a wrong one.
  if (hive.amount < 0.01 || hbd.amount < 0.01) return null;
  // 4dp is only ~3 significant figures at current prices, which hides exactly the
  // spread a trader cares about, and rounds small rates to a flat 0.0000.
  return `${(hbd.amount / hive.amount).toFixed(6)} HBD/HIVE`;
}

const withRate = (text: string, a?: string, b?: string): string => {
  const rate = pairRate(a, b);
  return rate ? `${text} @ ${rate}` : text;
};

/**
 * What `amountToSell` buys at `rate`.
 *
 * `exchange_rate` is a RATIO, not a total: limit_order_create2 carries `amount_to_sell`
 * and `exchange_rate` separately, and the chain only requires that
 * `exchange_rate.base.symbol === amount_to_sell.symbol` — the base AMOUNT is arbitrary,
 * and by convention is a unit. Returning `quote` verbatim therefore reported the price of
 * one unit as the proceeds of the whole order: selling 1000 HIVE at {base 1 HIVE,
 * quote 0.3 HBD} read as "sell 1000.000 HIVE for 0.300 HBD", understating both the
 * proceeds and the quoted rate by 1000x. Only base.amount === sell.amount was ever right.
 */
function priceToReceive(rate: any, amountToSell: any): string | null {
  const b = parseAsset(rate?.base);
  const q = parseAsset(rate?.quote);
  const sell = parseAsset(amountToSell);
  if (!b || !q || !sell || b.amount === 0) return null;
  return `${(sell.amount * q.amount / b.amount).toFixed(3)} ${q.symbol}`;
}

function normalizeAccountHistoryOp(
  seq: number,
  opType: string,
  opData: Record<string, any>,
  timestamp: string,
  username: string,
  /** The op one sequence slot older, used only to classify `limit_order_cancelled`. */
  prev?: [string, Record<string, any>],
  /** False at the oldest op of a page, where `prev` is absent only because it is unread. */
  prevKnown: boolean = true
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

    case 'limit_order_create':
    case 'limit_order_create2': {
      // create2 states its price as an exchange_rate instead of min_to_receive.
      // Without it, the feed shows fills for orders it never showed being placed.
      const sell = opData.amount_to_sell;
      const receive = opType === 'limit_order_create2'
        ? priceToReceive(opData.exchange_rate, sell)
        : opData.min_to_receive;
      if (!parseAsset(sell) || !parseAsset(receive)) return null;
      return {
        ...base,
        type: HiveNotificationType.LIMIT_ORDER_CREATE,
        msg: withRate(`Order placed: sell ${sell} for ${receive}`, sell, receive),
        amount: sell,
      };
    }

    case 'limit_order_cancelled': {
      // One virtual op, three very different events: the user cancelled, the order hit
      // its expiry, or the chain swept a sub-precision remainder after a fill. Calling
      // all three "cancelled" misreports the most common one -- on an account trading
      // with short expiries, every single row is an expiry, not a cancellation.
      if (!parseAsset(opData.amount_back)) return null;
      const orderid = opData.orderid;
      const prevType = prev?.[0];
      const prevData = prev?.[1];

      // Swept remainder immediately after the fill that created it: not an event the
      // user did anything about, and it lands directly under its own Trade row.
      if (prevType === 'fill_order' &&
          (prevData?.current_orderid === orderid || prevData?.open_orderid === orderid)) {
        return null;
      }

      const userCancelled = prevType === 'limit_order_cancel' && prevData?.orderid === orderid;

      // `prev` is the op one sequence slot older. At the oldest entry of a page there is
      // no such op IN THIS PAGE -- it is the first row of the next, older page -- so its
      // absence says nothing. Reading that as "no cancel op, therefore an expiry" made
      // every page boundary claim the chain expired an order the user had cancelled, and
      // on an active trader real expiries are rarer than 1 in 1000, so essentially every
      // "Expired" row was wrong. Say only what is known: the order closed.
      if (!userCancelled && !prevKnown) {
        return {
          ...base,
          type: HiveNotificationType.LIMIT_ORDER_CANCEL,
          msg: `Order closed — ${opData.amount_back} returned`,
          amount: opData.amount_back,
          orderid,
          closureUncertain: true,
        };
      }

      return {
        ...base,
        type: userCancelled
          ? HiveNotificationType.LIMIT_ORDER_CANCEL
          : HiveNotificationType.LIMIT_ORDER_EXPIRED,
        msg: userCancelled
          ? `Order cancelled — ${opData.amount_back} returned`
          : `Order expired — ${opData.amount_back} returned`,
        amount: opData.amount_back,
        orderid,
      };
    }

    case 'limit_order_cancel':
      // Only reached when the virtual op is not alongside it: history predating the
      // virtual op, or a page boundary that split the pair.
      return {
        ...base,
        type: HiveNotificationType.LIMIT_ORDER_CANCEL,
        msg: `Order #${opData.orderid} cancelled`,
        orderid: opData.orderid,
      };

    case 'fill_order': {
      // The account sits on exactly one side of the trade, and which side decides what
      // it paid versus received. Getting this backwards inverts every trade in the feed.
      const isCurrent = opData.current_owner === username;
      const isOpen = opData.open_owner === username;
      if (!isCurrent && !isOpen) return null;
      const paid = isCurrent ? opData.current_pays : opData.open_pays;
      const received = isCurrent ? opData.open_pays : opData.current_pays;
      if (!parseAsset(paid) || !parseAsset(received)) return null;

      // Hive has no self-trade prevention, and history stores such an op once. Reporting
      // one leg would assert a directional trade that did not happen.
      if (isCurrent && isOpen) {
        return {
          ...base,
          type: HiveNotificationType.FILL_ORDER,
          msg: `Matched your own order: ${paid} against ${received}`,
          amount: received,
        };
      }

      // The counterparty goes in the message, not in `author`. The row renders `author`
      // as the actor -- "@alice Trade Traded 3.879 HBD for 86.596 HIVE" reads as though
      // alice made the trade, when the account reading it did.
      const counterparty = isCurrent ? opData.open_owner : opData.current_owner;
      const withWhom = typeof counterparty === 'string' && counterparty
        ? ` with @${counterparty}` : '';
      return {
        ...base,
        type: HiveNotificationType.FILL_ORDER,
        msg: withRate(`Traded ${paid} for ${received}`, paid, received) + withWhom,
        amount: received,
      };
    }

    case 'convert':
    case 'collateralized_convert': {
      // `convert` is HBD -> HIVE, `collateralized_convert` is HIVE -> HBD. Both settle
      // on the median price later, so the amount received is unknown at request time.
      const sold = parseAsset(opData.amount);
      if (!sold) return null;
      const into = sold.symbol === 'HBD' ? 'HIVE' : 'HBD';
      return {
        ...base,
        type: HiveNotificationType.CONVERT_REQUEST,
        msg: `Conversion requested: ${opData.amount} to ${into}`,
        amount: opData.amount,
      };
    }

    case 'collateralized_convert_immediate_conversion': {
      // A collateralized convert pays the HBD out immediately, at request time. This is
      // the op that reports it; the fill days later only settles the collateral.
      if (!parseAsset(opData.hbd_out)) return null;
      return {
        ...base,
        type: HiveNotificationType.CONVERT_FILL,
        msg: `Received ${opData.hbd_out} up front — collateral settles in 3.5 days`,
        amount: opData.hbd_out,
      };
    }

    case 'fill_convert_request': {
      if (!parseAsset(opData.amount_in) || !parseAsset(opData.amount_out)) return null;
      return {
        ...base,
        type: HiveNotificationType.CONVERT_FILL,
        msg: `Conversion completed: ${opData.amount_in} to ${opData.amount_out}`,
        amount: opData.amount_out,
      };
    }

    case 'fill_collateralized_convert_request': {
      // amount_out was already paid at request time, and amount_in is only the part of
      // the collateral actually consumed -- so this row is a settlement, not a payout.
      // Wording it as "completed: X to Y" implies the Y arrives now, and makes the
      // unconsumed collateral look like it evaporated.
      if (!parseAsset(opData.amount_in)) return null;
      const back = parseAsset(opData.excess_collateral);
      const settled = `Conversion settled: ${opData.amount_in} collateral used`;
      return {
        ...base,
        type: HiveNotificationType.CONVERT_FILL,
        msg: back && back.amount > 0
          ? `${settled}, ${opData.excess_collateral} returned`
          : settled,
        amount: opData.amount_in,
      };
    }

    default:
      return null;
  }
}

export const fetchAccountHistoryFinance = async (
  username: string,
  settings?: { hiveRpcNode?: string; customHiveRpcNodes?: string[]; autoSwitchHiveNode?: boolean },
  start: number = -1,
  limit: number = 1000,
): Promise<{ items: HiveNotification[]; hasMore: boolean; oldestSeq: number | null; error?: string }> => {
  try {
    const { primary, fallback, autoSwitch } = getHiveNodes(settings);
    // condenser_api asserts `start >= limit - 1` for any start other than -1, so the final
    // page of an account whose op count is not a multiple of `limit` cannot be requested at
    // full width. Asking anyway returned an RPC error that read as "no more history", and
    // the oldest up-to-999 operations were dropped silently. Clamp instead: start 499 with
    // limit 500 satisfies the assert and returns exactly the remaining ops.
    const effLimit = start >= 0 ? Math.min(limit, start + 1) : limit;
    const data = await rpcFetchWithFallback(
      { jsonrpc: '2.0', method: 'condenser_api.get_account_history', params: [username, start, effLimit], id: 1 },
      primary, fallback, autoSwitch
    );
    // A JSON-RPC error body has no `result`. Treating that as an empty page made a failing
    // node indistinguishable from the end of the feed: "End of Pulse" on a truncated list,
    // the load-older button gone, and no way to retry.
    if (data?.error) {
      throw new Error(data.error.message || 'Hive node rejected the account-history request');
    }
    const ops: [number, any][] = Array.isArray(data?.result) ? data.result : [];
    const result: HiveNotification[] = [];
    for (let i = ops.length - 1; i >= 0; i--) {
      // Destructuring is inside the try because it is the line most likely to throw: a
      // null entry or one missing `.op` blew past the guard below straight to the outer
      // catch, blanking every finance row and nulling oldestSeq for the session -- the
      // exact failure the guard was written to prevent.
      let seq: number, opType: string, opData: Record<string, any>, entry: any;
      try {
        [seq, entry] = ops[i];
        [opType, opData] = entry.op;
      } catch (err) {
        console.warn('[HivePulse] Skipped malformed account-history entry', err);
        continue;
      }
      if (!ACCOUNT_HISTORY_FINANCE_OPS.has(opType)) continue;

      // Cancelling an order emits two ops: the signed `limit_order_cancel` and, in the
      // very next sequence slot, the virtual `limit_order_cancelled` carrying the
      // refunded amount. Rendering both would double every cancellation in the feed --
      // and for an active trader that is most of the feed. Keep the virtual one, which
      // is also the only one that can tell a cancellation from an expiry.
      //
      // ops ascends by sequence, so the virtual op sits at i + 1. If it is missing the
      // signed op still renders, which covers history older than the virtual op.
      if (opType === 'limit_order_cancel') {
        const nextOp = ops[i + 1]?.[1]?.op;
        if (nextOp?.[0] === 'limit_order_cancelled' && nextOp[1]?.orderid === opData.orderid) {
          continue;
        }
      }

      // One malformed op must cost one row, not the whole feed. Before this guard any
      // throw here escaped to the outer catch and blanked every finance row.
      try {
        const prev = ops[i - 1]?.[1]?.op as [string, Record<string, any>] | undefined;
        // At i === 0 a missing `prev` means "not in this page", not "does not exist".
        const notif = normalizeAccountHistoryOp(
          seq, opType, opData, entry.timestamp, username, prev, i > 0,
        );
        if (notif) result.push(notif);
      } catch (err) {
        console.warn(`[HivePulse] Skipped malformed ${opType} op at seq ${seq}`, err);
      }
    }

    const oldestSeq = ops.length > 0 ? ops[0][0] : null;
    return {
      items: result,
      // `oldestSeq === 0` is the account's very first operation. Reporting hasMore there
      // would send the next page to `start: -1`, which condenser reads as "newest" and
      // re-appends the head page forever.
      // oldestSeq === 0 is the account's first ever operation; anything below `effLimit`
      // means the clamped request above already returned the whole tail.
      hasMore: ops.length >= effLimit && oldestSeq !== null && oldestSeq > 0,
      oldestSeq,
    };
  } catch (e) {
    console.error('Failed to fetch account history finance ops', e);
    // oldestSeq stays null and the caller keeps its previous cursor, so a failed page can
    // be retried rather than permanently ending the feed.
    return {
      items: [], hasMore: false, oldestSeq: null,
      error: e instanceof Error ? e.message : 'Could not reach a Hive node',
    };
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
    const [acctData, globalData, profileData] = await Promise.all([
      rpcFetchWithFallback(
        { jsonrpc: '2.0', method: 'condenser_api.get_accounts', params: [[username]], id: 1 },
        primary, fallback, autoSwitch
      ),
      rpcFetchWithFallback(
        { jsonrpc: '2.0', method: 'condenser_api.get_dynamic_global_properties', params: [], id: 2 },
        primary, fallback, autoSwitch
      ),
      // Reputation lives in hivemind now — get_accounts.reputation is deprecated and
      // returns 0, so read the display value (e.g. 84.37) straight from bridge.get_profile.
      rpcFetchWithFallback(
        { jsonrpc: '2.0', method: 'bridge.get_profile', params: { account: username }, id: 3 },
        primary, fallback, autoSwitch
      ),
    ]);

    const a = acctData.result?.[0];
    const g = globalData.result;
    if (!a || !g) return null;

    const num = (s: string) => { const m = String(s).match(/[\d.]+/); return m ? parseFloat(m[0]) : 0; };
    const hp = (num(a.vesting_shares) / num(g.total_vesting_shares)) * num(g.total_vesting_fund_hive);

    // Prefer hivemind's already-converted reputation; fall back to converting the raw
    // legacy value only if the profile call is unavailable.
    const profileRep = profileData?.result?.reputation;
    let reputation = 25;
    if (typeof profileRep === 'number') {
      reputation = profileRep;
    } else {
      const raw = Number(a.reputation) || 0;
      if (raw !== 0) reputation = Math.max(Math.log10(Math.abs(raw)) - 9, 0) * 9 + 25;
    }

    const createdIso = a.created || '';
    const ageDays = createdIso
      ? Math.max(0, Math.floor((Date.now() - new Date(createdIso + 'Z').getTime()) / 86400000))
      : 0;

    return {
      username,
      reputation: Math.round(reputation),
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