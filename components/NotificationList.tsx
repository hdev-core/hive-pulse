import React, { useEffect, useState, useRef } from 'react';
import { AppSettings, HiveNotification, HiveNotificationType } from '../types';
import { fetchNotifications } from '../utils/hiveHelpers';
import { NotificationItem } from './NotificationItem';
import { Bell, RefreshCw, ChevronDown, Activity } from 'lucide-react';

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
  { key: 'engagement', label: 'Engagement' },
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

export const NotificationList: React.FC<NotificationListProps> = ({ username, settings, allFrontends }) => {
  const [notifications, setNotifications] = useState<HiveNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async (isInitial = true) => {
    if (!username) return;
    if (isInitial) { setLoading(true); setLastId(null); }
    else setLoadingMore(true);
    setError(null);

    try {
      const limit = 40;
      const data = await fetchNotifications(username, limit, isInitial ? null : lastId);

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

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-slate-600" />
          <h3 className="text-sm font-bold text-slate-700">The Pulse</h3>
        </div>
        <button
          onClick={() => loadNotifications(true)}
          disabled={loading || loadingMore}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading || loadingMore ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/30 px-2 pt-1 gap-0.5">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-t transition-colors ${
              activeFilter === tab.key
                ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex flex-col max-h-[350px] overflow-y-auto custom-scrollbar"
      >
        {loading && visible.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading pulse...</div>
        ) : error && visible.length === 0 ? (
          <div className="p-4 text-center text-xs text-red-400">{error}</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No notifications in this category</div>
        ) : (
          <>
            {visible.map((n, i) => (
              <NotificationItem
                key={`${n.id}-${i}`}
                notification={n}
                settings={settings}
                allFrontends={allFrontends}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => loadNotifications(false)}
                disabled={loadingMore}
                className="flex items-center justify-center gap-2 p-4 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-all border-t border-slate-50"
              >
                {loadingMore
                  ? <Activity size={14} className="animate-spin" />
                  : <><ChevronDown size={14} /><span>Load older</span></>
                }
              </button>
            )}

            {!hasMore && visible.length > 0 && (
              <div className="p-4 text-center text-[10px] text-slate-300 uppercase tracking-widest font-bold">
                End of Pulse
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
