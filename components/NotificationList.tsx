import React, { useEffect, useState, useRef } from 'react';
import { AppSettings, HiveNotification, HiveNotificationType } from '../types';
import { fetchNotifications } from '../utils/hiveHelpers';
import { NotificationItem } from './NotificationItem';
import { Bell, RefreshCw, ChevronDown, Loader } from 'lucide-react';

interface NotificationListProps {
  username: string;
  settings: AppSettings;
  allFrontends: any[];
}

type FilterTab = 'all' | 'social' | 'finance' | 'engagement';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'social',     label: 'Social' },
  { key: 'finance',    label: 'Finance' },
  { key: 'engagement', label: 'Votes' },
];

const SOCIAL_TYPES     = new Set([HiveNotificationType.REPLY, HiveNotificationType.MENTION, HiveNotificationType.FOLLOW, HiveNotificationType.REBLOG]);
const FINANCE_TYPES    = new Set([HiveNotificationType.TRANSFER, HiveNotificationType.DELEGATIONS]);
const ENGAGEMENT_TYPES = new Set([HiveNotificationType.VOTE]);

function matchesFilter(n: HiveNotification, tab: FilterTab): boolean {
  if (tab === 'all')        return true;
  if (tab === 'social')     return SOCIAL_TYPES.has(n.type);
  if (tab === 'finance')    return FINANCE_TYPES.has(n.type);
  if (tab === 'engagement') return ENGAGEMENT_TYPES.has(n.type);
  return true;
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async (isInitial = true) => {
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
        if (isInitial) setNotifications(data);
        else setNotifications(prev => [...prev, ...data]);
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
  };

  useEffect(() => { loadNotifications(true); }, [username]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || loading || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) loadNotifications(false);
  };

  if (!username) return null;

  const visible = notifications.filter(n => matchesFilter(n, activeFilter));
  const groups  = groupByDate(visible);

  // Per-tab counts for badges
  const counts: Record<FilterTab, number> = {
    all:        notifications.length,
    social:     notifications.filter(n => SOCIAL_TYPES.has(n.type)).length,
    finance:    notifications.filter(n => FINANCE_TYPES.has(n.type)).length,
    engagement: notifications.filter(n => ENGAGEMENT_TYPES.has(n.type)).length,
  };

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 rounded-lg p-1.5">
            <Bell size={13} className="text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">The Pulse</h3>
          {!loading && notifications.length > 0 && (
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          )}
        </div>
        <button
          onClick={() => loadNotifications(true)}
          disabled={loading || loadingMore}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 px-2 pt-1.5 gap-0.5">
        {FILTER_TABS.map(tab => {
          const count = counts[tab.key];
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-t-md transition-all ${
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
        {loading && visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Loader size={20} className="animate-spin opacity-40" />
            <span className="text-xs">Loading notifications…</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-red-400 bg-red-50/50">{error}</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Bell size={24} className="opacity-20" />
            <span className="text-xs">No notifications in this category</span>
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

            {/* Load more */}
            {hasMore && (
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
            )}

            {!hasMore && visible.length > 0 && (
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
