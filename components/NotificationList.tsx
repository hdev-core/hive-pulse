import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { AppSettings, HiveNotification, HiveNotificationType } from '../types';
import { fetchNotifications, fetchAccountHistoryFinance } from '../utils/hiveHelpers';
import { NotificationItem } from './NotificationItem';
import { Bell, RefreshCw, ChevronDown, Loader } from 'lucide-react';

interface NotificationListProps {
  username: string;
  settings: AppSettings;
  allFrontends: any[];
}

type FilterTab = 'all' | 'social' | 'finance' | 'market' | 'engagement';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'social',     label: 'Social' },
  { key: 'finance',    label: 'Finance' },
  { key: 'market',     label: 'Market' },
  { key: 'engagement', label: 'Votes' },
];

const SOCIAL_TYPES     = new Set([HiveNotificationType.REPLY, HiveNotificationType.MENTION, HiveNotificationType.FOLLOW, HiveNotificationType.REBLOG]);
const FINANCE_TYPES    = new Set([
  HiveNotificationType.TRANSFER,
  HiveNotificationType.DELEGATIONS,
  HiveNotificationType.INTEREST,
  HiveNotificationType.CLAIM_REWARD,
  HiveNotificationType.POWER_UP,
  HiveNotificationType.POWER_DOWN,
  HiveNotificationType.POWER_DOWN_FILL,
  HiveNotificationType.SAVINGS_DEPOSIT,
  HiveNotificationType.SAVINGS_WITHDRAW,
  HiveNotificationType.SAVINGS_WITHDRAW_FILL,
  HiveNotificationType.PROPOSAL_PAY,
]);
/**
 * Market and Finance are deliberately disjoint. Finance is value moving in or out of
 * the account; Market is one asset being swapped for another. Leaving market rows in
 * both would defeat the split -- an active trader's cancellations alone outnumber
 * every other finance row put together, which is what pushed them into their own tab.
 */
const MARKET_TYPES     = new Set([
  HiveNotificationType.LIMIT_ORDER_CREATE,
  HiveNotificationType.LIMIT_ORDER_CANCEL,
  HiveNotificationType.LIMIT_ORDER_EXPIRED,
  HiveNotificationType.FILL_ORDER,
  HiveNotificationType.CONVERT_REQUEST,
  HiveNotificationType.CONVERT_FILL,
]);
const ENGAGEMENT_TYPES = new Set([HiveNotificationType.VOTE]);

function matchesFilter(n: HiveNotification, tab: FilterTab): boolean {
  if (tab === 'all')        return true;
  if (tab === 'social')     return SOCIAL_TYPES.has(n.type);
  if (tab === 'finance')    return FINANCE_TYPES.has(n.type);
  if (tab === 'market')     return MARKET_TYPES.has(n.type);
  if (tab === 'engagement') return ENGAGEMENT_TYPES.has(n.type);
  return true;
}

/**
 * Drop rows already represented in `prev`.
 *
 * Sequence id handles the ordinary case. Order closures need more: a cancellation emits
 * a signed op and a virtual op in adjacent sequence slots, and whichever one sits at a
 * page edge loses the lookahead that pairs them, so it re-renders as a second row with a
 * different sequence id. Matching on order id collapses those.
 */
const CLOSURE_TYPES = new Set([
  HiveNotificationType.LIMIT_ORDER_CANCEL,
  HiveNotificationType.LIMIT_ORDER_EXPIRED,
]);

/**
 * Returns the incoming rows to append, and the ids of already-shown rows to drop.
 *
 * A closure row at a page edge is classified without its neighbouring op, so it says only
 * "Order closed". The next (older) page carries the signed op that settles it. Keeping the
 * first row seen would preserve the uncertain one forever, so an uncertain row yields to
 * the definite one for the same order id.
 */
/** Hive timestamps are UTC-naive; both sources need the same Z applied before parsing. */
const toMs = (d: string): number =>
  new Date(d.endsWith('Z') ? d : d + 'Z').getTime();

/**
 * Newest first. Decorate-sort-undecorate: the previous comparator allocated two Date
 * objects and did two string tests per comparison, so a 20,000-row list parsed dates
 * hundreds of thousands of times per render. This parses each date once.
 */
const sortByDateDesc = (list: HiveNotification[]): HiveNotification[] =>
  list.map(n => [toMs(n.date), n] as const)
      .sort((a, b) => b[0] - a[0])
      .map(([, n]) => n);

/**
 * Merge an older history page into what is already on screen, and settle any closure row
 * that was classified at a page edge.
 *
 * A cancellation is two ops in adjacent sequence slots: the signed `limit_order_cancel`
 * and the virtual `limit_order_cancelled`, and only the virtual one carries the refunded
 * amount. When they straddle a page boundary the virtual one is read first, without its
 * partner, so it can only say "Order closed".
 *
 * An earlier attempt settled this by dropping the uncertain row and keeping the signed one
 * from the next page. That kept a correct label but threw the money away -- measured
 * against 4,000 real ops it turned "Order cancelled - 1611.627 HBD returned" into
 * "Order #8176769 cancelled". The row to keep is always the virtual one; what changes is
 * its label, not which row survives.
 */
function mergeHistory(
  prev: HiveNotification[],
  incoming: HiveNotification[],
  /** Raw sequence span the incoming page covered, including ops that produced no row. */
  page: { oldestSeq: number | null; newestSeq: number | null },
): { add: HiveNotification[]; dropIds: Set<number>; patch: Map<number, Partial<HiveNotification>> } {
  const seenIds = new Set(prev.map(n => n.id));
  const dropIds = new Set<number>();
  const patch = new Map<number, Partial<HiveNotification>>();

  // The op one slot older than an uncertain row, if this page read that slot at all.
  const byPredecessor = new Map<number, HiveNotification>();
  for (const n of incoming) byPredecessor.set(n.id, n);
  const covers = (seq: number) =>
    page.oldestSeq !== null && page.newestSeq !== null &&
    seq >= page.oldestSeq && seq <= page.newestSeq;

  for (const row of prev) {
    if (!row.closureUncertain || row.orderid === undefined) continue;
    const predSeq = row.id - 1;
    if (!covers(predSeq)) continue;          // still unread; leave the row uncertain
    const pred = byPredecessor.get(predSeq);
    const amount = row.amount ?? '';

    if (pred?.type === HiveNotificationType.LIMIT_ORDER_CANCEL && pred.orderid === row.orderid) {
      // The user cancelled. Keep this row's amount, take the signed row's certainty, and
      // drop the signed row so the cancellation is not listed twice.
      patch.set(row.id, { msg: `Order cancelled — ${amount} returned`, closureUncertain: undefined });
      dropIds.add(pred.id);
    } else if (pred?.type === HiveNotificationType.FILL_ORDER && pred.orderid === row.orderid) {
      // A sub-precision remainder swept straight after its own fill. Within a page this is
      // suppressed outright; across a seam it had leaked through as a phantom row.
      dropIds.add(row.id);
    } else {
      // The slot was read and holds no cancel, so the chain expired the order.
      patch.set(row.id, {
        type: HiveNotificationType.LIMIT_ORDER_EXPIRED,
        msg: `Order expired — ${amount} returned`,
        closureUncertain: undefined,
      });
    }
  }

  const add = incoming.filter(n => !seenIds.has(n.id) && !dropIds.has(n.id));
  return { add, dropIds, patch };
}

// Group notifications by recency bucket
type DateGroup = { label: string; items: HiveNotification[] };

function groupByDate(notifications: HiveNotification[]): DateGroup[] {
  const now = Date.now();
  const buckets: { label: string; maxAge: number }[] = [
    { label: 'Today',      maxAge: 86_400_000 },
    { label: 'Yesterday',  maxAge: 2 * 86_400_000 },
    { label: 'This Week',  maxAge: 7 * 86_400_000 },
    { label: 'This Month', maxAge: 30 * 86_400_000 },
    { label: 'Older',      maxAge: Infinity },
  ];

  const groups: DateGroup[] = [];
  const used = new Set<HiveNotification>();

  for (const bucket of buckets) {
    const items = notifications.filter(n => {
      if (used.has(n)) return false;
      const age = now - new Date(n.date.endsWith('Z') ? n.date : n.date + 'Z').getTime();
      return age < bucket.maxAge;
    });
    items.forEach(n => used.add(n));
    if (items.length > 0) groups.push({ label: bucket.label, items });
  }
  return groups;
}

export const NotificationList: React.FC<NotificationListProps> = ({ username, settings, allFrontends }) => {
  const [notifications, setNotifications] = useState<HiveNotification[]>([]);
  const [loading, setLoading]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [lastId, setLastId]               = useState<number | null>(null);
  const [hasMore, setHasMore]             = useState(true);
  const [activeFilter, setActiveFilter]   = useState<FilterTab>('all');

  const [financeHistory, setFinanceHistory]         = useState<HiveNotification[]>([]);
  const [financeLoading, setFinanceLoading]         = useState(false);
  const [financeHasMore, setFinanceHasMore]         = useState(false);
  const [financeOldestSeq, setFinanceOldestSeq]     = useState<number | null>(null);
  const [loadingMoreFinance, setLoadingMoreFinance] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  /** Bumped per account-history request so a late response for an old account is ignored. */
  const financeGenerationRef = useRef(0);
  const financeFetchedRef                           = useRef(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoLoadCountRef   = useRef(0);

  const loadNotifications = useCallback(async (isInitial = true) => {
    if (!username) return;
    if (isInitial) { setLoading(true); setLastId(null); }
    else setLoadingMore(true);
    setError(null);

    try {
      const limit = 40;
      const data  = await fetchNotifications(username, limit, isInitial ? null : lastId, settings);
      setHasMore(data.length >= limit);
      if (data.length > 0) {
        setLastId(data[data.length - 1].id);
        if (isInitial) {
          setNotifications(data);
          // Mark as read: background will clear the badge on next tick
          try { (chrome as any).storage.local.set({ lastSeenHiveNotifId: data[0].id }); } catch {}
        } else setNotifications(prev => [...prev, ...data]);
      } else if (isInitial) {
        setNotifications([]);
        setHasMore(false);
      }
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [username, lastId]);

  // Reset auto-load counter when filter tab changes
  useEffect(() => { autoLoadCountRef.current = 0; }, [activeFilter]);

  // Auto-load more bridge pages when the active filter tab has no visible results
  useEffect(() => {
    // Market rows only ever come from account history, so paging bridge finds nothing.
    if (activeFilter === 'market') return;
    const bridgeFiltered = notifications.filter(n => matchesFilter(n, activeFilter));
    // Count only history rows this tab would actually show. Counting all of them meant a
    // trader's market rows suppressed the backfill on Social and Votes too.
    const historyCount = financeHistory.filter(n => matchesFilter(n, activeFilter)).length;
    if (bridgeFiltered.length === 0 && historyCount === 0 && hasMore && !loading && !loadingMore && autoLoadCountRef.current < 10) {
      autoLoadCountRef.current++;
      loadNotifications(false);
    }
  }, [activeFilter, notifications, financeHistory, hasMore, loading, loadingMore]);

  useEffect(() => {
    financeFetchedRef.current = false;
    financeGenerationRef.current++;
    setFinanceHistory([]);
    setFinanceOldestSeq(null);
    setFinanceHasMore(false);
    setFinanceError(null);
    loadNotifications(true);
  }, [username]);

  // Fetch account history finance ops eagerly on mount so All tab is always complete
  useEffect(() => {
    if (financeFetchedRef.current || !username) return;
    financeFetchedRef.current = true;
    setFinanceLoading(true);
    setFinanceError(null);
    // A slow response for a previous username used to land after the switch and render
    // that account's transfers under the new one. Stamp the request and drop anything that
    // is no longer the current one. (Reproduced by switching accounts against a slow node.)
    const generation = ++financeGenerationRef.current;
    fetchAccountHistoryFinance(username, settings).then(({ items, hasMore, oldestSeq, error: fetchError }) => {
      if (generation !== financeGenerationRef.current) return;
      // A failed first page used to be indistinguishable from "this account has never
      // traded", and financeFetchedRef made it permanent for the life of the mount.
      if (fetchError) {
        setFinanceError(fetchError);
        financeFetchedRef.current = false;
        setFinanceLoading(false);
        return;
      }
      setFinanceHistory(items);
      setFinanceHasMore(hasMore);
      setFinanceOldestSeq(oldestSeq);
      setFinanceLoading(false);
    });
  }, [username, refreshNonce]);

  const loadMoreAccountHistory = useCallback(async () => {
    if (!username || financeOldestSeq === null || loadingMoreFinance) return;
    setLoadingMoreFinance(true);
    const generation = financeGenerationRef.current;
    const { items, hasMore, oldestSeq, newestSeq, error: fetchError } =
      await fetchAccountHistoryFinance(username, settings, financeOldestSeq - 1);
    // Same guard as the mount fetch: a page for the previous account must not be merged.
    if (generation !== financeGenerationRef.current) return;
    if (fetchError) {
      // The cursor is left untouched so pressing the button again re-requests exactly the
      // page that failed. Rows already loaded stay on screen -- see the error banner.
      setFinanceError(fetchError);
      setLoadingMoreFinance(false);
      return;
    }
    setFinanceError(null);
    setFinanceHistory(prev => {
      const { add, dropIds, patch } = mergeHistory(prev, items, { oldestSeq, newestSeq: newestSeq ?? null });
      const kept = prev
        .filter(n => !dropIds.has(n.id))
        .map(n => (patch.has(n.id) ? { ...n, ...patch.get(n.id) } : n));
      return [...kept, ...add];
    });
    setFinanceHasMore(hasMore);
    setFinanceOldestSeq(oldestSeq);
    setLoadingMoreFinance(false);
  }, [username, financeOldestSeq, loadingMoreFinance]);

  // Only for the case where nothing loaded at all: there is no page to resume from, so
  // this restarts at the newest page. When rows are present the banner retries the failed
  // page instead, which is why the two are not the same handler.
  const retryAccountHistory = useCallback(() => {
    financeFetchedRef.current = false;
    setFinanceError(null);
    setRefreshNonce(n => n + 1);
  }, []);

  const handleScroll = () => {
    // Account-history tabs page through a different source; firing the bridge fetch here
    // would round-trip on every scroll and add nothing to the list.
    if (activeFilter === 'finance' || activeFilter === 'market') return;
    if (!scrollContainerRef.current || loading || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) loadNotifications(false);
  };

  // Account history renders transfers better than bridge does (both directions, memo),
  // so bridge transfers are suppressed once history covers them. "Covers" has to mean
  // the time window, not `financeHistory.length > 0`: a trader's 1000-op window can be
  // 100% market ops spanning a few hours, and suppressing on that dropped real transfers
  // that history had never loaded.
  const oldestHistoryMs = useMemo(() => financeHistory.reduce((oldest, n) => {
    const t = toMs(n.date);
    return Number.isFinite(t) && t < oldest ? t : oldest;
  }, Infinity), [financeHistory]);

  // All of this used to run on every render, re-parsing every date several times over --
  // ~8.6ms at 1,000 rows and ~135ms at 20,000, and financeHistory is uncapped, so paging
  // deep put every later click and scroll behind that. The side panel stays mounted, so it
  // did not go away.
  const bridgeNotifs = useMemo(() => notifications.filter(n => {
    if (n.type !== HiveNotificationType.TRANSFER) return true;
    const t = toMs(n.date);
    return !(Number.isFinite(t) && t >= oldestHistoryMs);
  }), [notifications, oldestHistoryMs]);
  const bridgeFinance = useMemo(
    () => bridgeNotifs.filter(n => FINANCE_TYPES.has(n.type)), [bridgeNotifs]);

  const usesAccountHistory = activeFilter === 'finance' || activeFilter === 'market';
  const historyFinance = useMemo(
    () => financeHistory.filter(n => FINANCE_TYPES.has(n.type)), [financeHistory]);
  const historyMarket = useMemo(
    () => financeHistory.filter(n => MARKET_TYPES.has(n.type)), [financeHistory]);

  const visible = useMemo(() => {
    if (activeFilter === 'finance') {
      return sortByDateDesc([...bridgeFinance, ...historyFinance]);
    }
    if (activeFilter === 'market') {
      return sortByDateDesc(historyMarket);
    }
    if (activeFilter === 'all') {
      // Market rows are excluded here on purpose. They outnumber every other row type by
      // roughly 500:1 for a trading account, and All is the default tab -- including them
      // buries every mention, reply and transfer behind order spam. The Market tab exists
      // precisely so this one stays readable.
      return sortByDateDesc([...bridgeNotifs, ...historyFinance]);
    }
    return notifications.filter(n => matchesFilter(n, activeFilter));
  }, [activeFilter, bridgeNotifs, bridgeFinance, historyFinance, historyMarket, notifications]);

  // groupByDate buckets against Date.now(), so memoising on `visible` alone froze "Today"
  // in place -- and the side panel stays mounted for hours, which is the whole reason the
  // memo exists. Re-bucket when the hour turns; that is the finest granularity any label
  // here depends on.
  const [hourTick, setHourTick] = useState(() => Math.floor(Date.now() / 3600000));
  useEffect(() => {
    const t = setInterval(() => setHourTick(Math.floor(Date.now() / 3600000)), 60000);
    return () => clearInterval(t);
  }, []);
  const groups = useMemo(() => groupByDate(visible), [visible, hourTick]);


  // Per-tab counts for badges
  const counts: Record<FilterTab, number> = useMemo(() => ({
    all:        bridgeNotifs.length + historyFinance.length,
    social:     notifications.filter(n => SOCIAL_TYPES.has(n.type)).length,
    finance:    bridgeFinance.length + historyFinance.length,
    market:     historyMarket.length,
    engagement: notifications.filter(n => ENGAGEMENT_TYPES.has(n.type)).length,
  }), [bridgeNotifs, bridgeFinance, historyFinance, historyMarket, notifications]);

  // Bailing out must come after every hook: React counts hooks per render, so returning
  // above any of the useMemos would crash the moment a username appeared or cleared.
  if (!username) return null;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 rounded-lg p-1.5">
            <Bell size={13} className="text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">The Pulse</h3>
          {!loading && counts.all > 0 && (
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {counts.all > 99 ? '99+' : counts.all}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            // Refresh only re-fetched bridge notifications, so a failed account-history
            // call left Finance and Market empty with no way back short of reopening.
            financeFetchedRef.current = false;
            setFinanceHistory([]);
            setFinanceOldestSeq(null);
            setFinanceHasMore(false);
            setFinanceError(null);
            setRefreshNonce(n => n + 1);
            loadNotifications(true);
          }}
          disabled={loading || loadingMore}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 pt-1.5 gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_TABS.map(tab => {
          const count = counts[tab.key];
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex shrink-0 items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-t-md transition-all ${
                isActive
                  ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full leading-none ${
                  isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex flex-col max-h-[380px] overflow-y-auto"
      >
        {(loading || financeLoading) && visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Loader size={20} className="animate-spin opacity-40" />
            <span className="text-xs">Loading notifications…</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-red-400 bg-red-50/50">{error}</div>
        ) : usesAccountHistory && financeError && visible.length === 0 ? (
          // Only when there is nothing to show. Rendering this branch whenever financeError
          // was set replaced every row already loaded -- a failed "Load older" on click 40
          // wiped 2,000 rows off the screen and the retry then restarted from the newest
          // page, discarding all 40 clicks. With rows present the banner below is used
          // instead, and the rows stay put.
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
            <span className="text-xs text-red-400">Could not load account history</span>
            <span className="text-[10px] text-slate-400 break-all">{financeError}</span>
            <button
              onClick={retryAccountHistory}
              className="mt-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Bell size={24} className="opacity-20" />
            {/* The account-history tabs read one 1000-op page at a time, and an account can
                easily have none of these ops in its most recent page — an account with
                millions of ops reliably has none. The load-older button used to live only
                in the non-empty branch and scrolling is disabled on these tabs, so the
                empty state was a dead end that read as "you have never traded". */}
            <span className="text-xs">
              {usesAccountHistory && financeHasMore
                ? 'Nothing here in the most recent history yet'
                : 'No notifications in this category'}
            </span>
            {usesAccountHistory && financeHasMore && (
              <button
                onClick={loadMoreAccountHistory}
                disabled={loadingMoreFinance}
                className="flex items-center gap-1.5 mt-1 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all disabled:opacity-40"
              >
                {loadingMoreFinance
                  ? <><Loader size={13} className="animate-spin" /><span>Loading…</span></>
                  : <><ChevronDown size={13} /><span>Search older history</span></>
                }
              </button>
            )}
          </div>
        ) : (
          <>
            {groups.map(group => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.label}</span>
                  <span className="text-[10px] text-slate-300 font-medium">{group.items.length}</span>
                </div>
                {group.items.map((n, i) => (
                  <NotificationItem
                    key={`${n.id}-${i}`}
                    notification={n}
                    settings={settings}
                    allFrontends={allFrontends}
                  />
                ))}
              </div>
            ))}

            {/* A failed page must not cost the rows already loaded, so this sits with the
                list rather than replacing it. Retrying re-requests the page that failed,
                because the cursor was deliberately left untouched. */}
            {usesAccountHistory && financeError && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] bg-red-50/60 border-t border-red-100">
                <span className="text-red-400 truncate" title={financeError}>
                  Could not load older history — {financeError}
                </span>
                <button
                  onClick={loadMoreAccountHistory}
                  disabled={loadingMoreFinance}
                  className="shrink-0 font-medium text-slate-500 hover:text-blue-600 underline disabled:opacity-40"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Load more — Finance and Market paginate account history; the rest paginate bridge */}
            {usesAccountHistory ? (
              financeHasMore && (
                <button
                  onClick={loadMoreAccountHistory}
                  disabled={loadingMoreFinance}
                  className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all border-t border-slate-100"
                >
                  {loadingMoreFinance
                    ? <><Loader size={13} className="animate-spin" /><span>Loading…</span></>
                    : <><ChevronDown size={13} /><span>Load older</span></>
                  }
                </button>
              )
            ) : (
              hasMore && (
                <button
                  onClick={() => loadNotifications(false)}
                  disabled={loadingMore}
                  className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all border-t border-slate-100"
                >
                  {loadingMore
                    ? <><Loader size={13} className="animate-spin" /><span>Loading…</span></>
                    : <><ChevronDown size={13} /><span>Load older</span></>
                  }
                </button>
              )
            )}

            {!(usesAccountHistory ? financeHasMore : hasMore) && visible.length > 0 && (
              <div className="py-3 text-center text-[10px] text-slate-300 uppercase tracking-widest font-bold border-t border-slate-50">
                End of Pulse
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
