import React from 'react';
import { HiveNotification, HiveNotificationType, AppSettings, FrontendId } from '../types';
import { MessageSquare, AtSign, UserPlus, Repeat, ArrowRightLeft, Heart, Info } from 'lucide-react';
import { getTargetUrl } from '../utils/urlHelpers';
import { FRONTENDS } from '../constants';

interface NotificationItemProps {
  notification: HiveNotification;
  settings: AppSettings;
  allFrontends: any[];
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, settings, allFrontends }) => {
  const getIcon = () => {
    switch (notification.type) {
      case HiveNotificationType.REPLY:
        return <MessageSquare size={16} className="text-blue-500" />;
      case HiveNotificationType.MENTION:
        return <AtSign size={16} className="text-orange-500" />;
      case HiveNotificationType.FOLLOW:
        return <UserPlus size={16} className="text-green-500" />;
      case HiveNotificationType.REBLOG:
        return <Repeat size={16} className="text-purple-500" />;
      case HiveNotificationType.TRANSFER:
        return <ArrowRightLeft size={16} className="text-emerald-500" />;
      case HiveNotificationType.VOTE:
        return <Heart size={16} className="text-red-500" />;
      default:
        return <Info size={16} className="text-slate-400" />;
    }
  };

  const handleClick = () => {
    let url = '';
    
    // Construct URL based on notification type
    // This uses getTargetUrl logic but adapted for notification context
    // Ideally we want to link to the specific content
    
    const frontendId = settings.preferredFrontendId;
    
    // Simple direct URL construction for now, as getTargetUrl is more about switching current view
    // We can use the helper if we construct a "path"
    
    let path = '/';
    
    if (notification.url) {
        // Notification API often returns a partial URL like "post/@author/permlink" or just "@author/permlink"
        // Check if it starts with http (unlikely from bridge)
        if (notification.url.startsWith('http')) {
            window.open(notification.url, '_blank');
            return;
        }
        path = notification.url.startsWith('/') ? notification.url : `/${notification.url}`;
    } else {
        // Fallbacks
        if (notification.type === 'follow') {
            path = `/@${notification.author}`;
        } else if (notification.type === 'transfer') {
            path = `/@${notification.author}/transfers`; // Approximation
        }
    }

    // Use getTargetUrl to resolve the full domain based on preference
    // We treat this as "SAME_PAGE" mode effectively, just resolving the domain
    
    // Use a temporary "current path" for the helper
    const targetUrl = getTargetUrl(frontendId, path, 'SAME_PAGE' as any, null, null, null, allFrontends);
    
    window.open(targetUrl, '_blank');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')); // Ensure UTC parsing if missing Z
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getMessage = () => {
      // Use the API message if available, otherwise construct it
      let msg = notification.msg;
      
      // If it's a mention and ends with "and 0 others", remove that part
      if (msg && notification.type === HiveNotificationType.MENTION) {
          if (msg.endsWith(' and 0 others')) {
              msg = msg.replace(' and 0 others', '');
          }
      }

      if (msg) return msg;
      
      switch(notification.type) {
          case HiveNotificationType.TRANSFER:
              return `Transferred ${notification.amount}`;
          case HiveNotificationType.FOLLOW:
              return `Followed you`;
          case HiveNotificationType.VOTE:
              return `Voted on your post`;
          default:
              return notification.type;
      }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
    >
      <div className="mt-0.5 shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-slate-800 truncate">
                @{notification.author}
            </span>
            <span className="text-[10px] text-slate-400 shrink-0">
                {formatDate(notification.date)}
            </span>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
           {getMessage()}
        </p>
        {notification.type === HiveNotificationType.TRANSFER && notification.memo && (
            <div className="mt-1 text-[10px] text-slate-500 italic bg-slate-50 p-1 rounded border border-slate-100">
                "{notification.memo}"
            </div>
        )}
      </div>
    </div>
  );
};
