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

export const NotificationList: React.FC<NotificationListProps> = ({ username, settings, allFrontends }) => {
  const [notifications, setNotifications] = useState<HiveNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const PULSE_TYPES = [
    HiveNotificationType.REPLY, 
    HiveNotificationType.MENTION, 
    HiveNotificationType.TRANSFER, 
    HiveNotificationType.FOLLOW
  ];

  const loadNotifications = async (isInitial = true) => {
    if (!username) return;
    
    if (isInitial) {
        setLoading(true);
        setLastId(null);
    } else {
        setLoadingMore(true);
    }
    
    setError(null);
    try {
      // Fetch batch
      const limit = 40;
      const data = await fetchNotifications(username, limit, isInitial ? null : lastId);
      
      if (data.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (data.length > 0) {
          const batchLastId = data[data.length - 1].id;
          setLastId(batchLastId);

          const filtered = data.filter(n => PULSE_TYPES.includes(n.type));
          
          if (isInitial) {
            setNotifications(filtered);
          } else {
            setNotifications(prev => [...prev, ...filtered]);
          }
      } else if (isInitial) {
          setNotifications([]);
          setHasMore(false);
      }
    } catch (err) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
  }, [username]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || loading || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      loadNotifications(false);
    }
  };

  if (!username) return null;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
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
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex flex-col max-h-[350px] overflow-y-auto custom-scrollbar"
      >
        {loading && notifications.length === 0 ? (
           <div className="p-8 text-center text-xs text-slate-400">Loading pulse...</div>
        ) : error && notifications.length === 0 ? (
           <div className="p-4 text-center text-xs text-red-400">{error}</div>
        ) : notifications.length === 0 ? (
           <div className="p-8 text-center text-xs text-slate-400">No recent notifications</div>
        ) : (
            <>
                {notifications.map((n, i) => (
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
                        {loadingMore ? (
                            <Activity size={14} className="animate-spin" />
                        ) : (
                            <>
                                <ChevronDown size={14} />
                                <span>Load older pulse</span>
                            </>
                        )}
                    </button>
                )}

                {!hasMore && notifications.length > 0 && (
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
