import React, { useEffect, useState } from 'react';
import { AppSettings, HiveNotification, HiveNotificationType } from '../types';
import { fetchNotifications } from '../utils/hiveHelpers';
import { NotificationItem } from './NotificationItem';
import { Bell, RefreshCw } from 'lucide-react';

interface NotificationListProps {
  username: string;
  settings: AppSettings;
  allFrontends: any[];
}

export const NotificationList: React.FC<NotificationListProps> = ({ username, settings, allFrontends }) => {
  const [notifications, setNotifications] = useState<HiveNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch more to account for filtered items
      const data = await fetchNotifications(username, 50);
      
      // Filter for "Pulse" relevant types (Social + Finance)
      // Excluding generic votes to reduce noise, unless it's a very specific "witness vote" (which usually comes as 'account_witness_vote' op but simplified in notifications?)
      // Bridge notification types: reply, mention, follow, reblog, transfer, vote
      const filtered = data.filter(n => 
        [
            HiveNotificationType.REPLY, 
            HiveNotificationType.MENTION, 
            HiveNotificationType.TRANSFER, 
            HiveNotificationType.FOLLOW
        ].includes(n.type)
      ).slice(0, 20); // Show top 20 relevant

      setNotifications(filtered);
    } catch (err) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [username]);

  if (!username) return null;

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
            <Bell size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700">The Pulse</h3>
        </div>
        <button 
            onClick={loadNotifications} 
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
        {loading && notifications.length === 0 ? (
           <div className="p-8 text-center text-xs text-slate-400">Loading pulse...</div>
        ) : error ? (
           <div className="p-4 text-center text-xs text-red-400">{error}</div>
        ) : notifications.length === 0 ? (
           <div className="p-8 text-center text-xs text-slate-400">No recent notifications</div>
        ) : (
            notifications.map((n, i) => (
                <NotificationItem 
                    key={`${n.id}-${i}`} 
                    notification={n} 
                    settings={settings}
                    allFrontends={allFrontends}
                />
            ))
        )}
      </div>
    </div>
  );
};
