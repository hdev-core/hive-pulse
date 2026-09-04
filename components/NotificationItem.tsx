import React from 'react';
import { HiveNotification, HiveNotificationType, AppSettings, ActionMode } from '../types';
import { MessageSquare, AtSign, UserPlus, Repeat2, ArrowRightLeft, Heart, TrendingUp, TrendingDown, Info, Coins, Gift, Zap, PiggyBank, Banknote, Landmark, ListPlus, CandlestickChart, Ban, ArrowLeftRight, CheckCircle2, Clock } from 'lucide-react';
import { getTargetUrl, AUTHOR_PERMLINK_REGEX } from '../utils/urlHelpers';

interface NotificationItemProps {
  notification: HiveNotification;
  settings: AppSettings;
  allFrontends: any[];
}

interface TypeConfig {
  icon: React.ReactNode;
  label: string;
  accent: string;       // left border + icon bg
  iconColor: string;
  rowHover: string;
}

function getTypeConfig(type: HiveNotificationType): TypeConfig {
  switch (type) {
    case HiveNotificationType.MENTION:
      return {
        icon: <AtSign size={13} />,
        label: 'Mention',
        accent: 'border-l-orange-400 bg-orange-50',
        iconColor: 'bg-orange-100 text-orange-600',
        rowHover: 'hover:bg-orange-50/60',
      };
    case HiveNotificationType.REPLY:
      return {
        icon: <MessageSquare size={13} />,
        label: 'Reply',
        accent: 'border-l-blue-400 bg-blue-50/40',
        iconColor: 'bg-blue-100 text-blue-600',
        rowHover: 'hover:bg-blue-50/60',
      };
    case HiveNotificationType.FOLLOW:
      return {
        icon: <UserPlus size={13} />,
        label: 'Follow',
        accent: 'border-l-green-400 bg-green-50/40',
        iconColor: 'bg-green-100 text-green-600',
        rowHover: 'hover:bg-green-50/60',
      };
    case HiveNotificationType.REBLOG:
      return {
        icon: <Repeat2 size={13} />,
        label: 'Reblog',
        accent: 'border-l-purple-400 bg-purple-50/40',
        iconColor: 'bg-purple-100 text-purple-600',
        rowHover: 'hover:bg-purple-50/60',
      };
    case HiveNotificationType.TRANSFER:
      return {
        icon: <ArrowRightLeft size={13} />,
        label: 'Transfer',
        accent: 'border-l-emerald-400 bg-emerald-50/40',
        iconColor: 'bg-emerald-100 text-emerald-600',
        rowHover: 'hover:bg-emerald-50/60',
      };
    case HiveNotificationType.VOTE:
      return {
        icon: <Heart size={13} />,
        label: 'Vote',
        accent: 'border-l-rose-400 bg-rose-50/40',
        iconColor: 'bg-rose-100 text-rose-500',
        rowHover: 'hover:bg-rose-50/60',
      };
    case HiveNotificationType.DELEGATIONS:
      return {
        icon: <TrendingUp size={13} />,
        label: 'Delegation',
        accent: 'border-l-cyan-400 bg-cyan-50/40',
        iconColor: 'bg-cyan-100 text-cyan-600',
        rowHover: 'hover:bg-cyan-50/60',
      };
    case HiveNotificationType.INTEREST:
      return {
        icon: <Coins size={13} />,
        label: 'Interest',
        accent: 'border-l-emerald-400 bg-emerald-50/40',
        iconColor: 'bg-emerald-100 text-emerald-600',
        rowHover: 'hover:bg-emerald-50/60',
      };
    case HiveNotificationType.CLAIM_REWARD:
      return {
        icon: <Gift size={13} />,
        label: 'Reward',
        accent: 'border-l-amber-400 bg-amber-50/40',
        iconColor: 'bg-amber-100 text-amber-600',
        rowHover: 'hover:bg-amber-50/60',
      };
    case HiveNotificationType.POWER_UP:
      return {
        icon: <Zap size={13} />,
        label: 'Power Up',
        accent: 'border-l-violet-400 bg-violet-50/40',
        iconColor: 'bg-violet-100 text-violet-600',
        rowHover: 'hover:bg-violet-50/60',
      };
    case HiveNotificationType.POWER_DOWN:
    case HiveNotificationType.POWER_DOWN_FILL:
      return {
        icon: <TrendingDown size={13} />,
        label: type === HiveNotificationType.POWER_DOWN ? 'Power Down' : 'PD Payment',
        accent: 'border-l-orange-400 bg-orange-50/40',
        iconColor: 'bg-orange-100 text-orange-600',
        rowHover: 'hover:bg-orange-50/60',
      };
    case HiveNotificationType.SAVINGS_DEPOSIT:
      return {
        icon: <PiggyBank size={13} />,
        label: 'Savings In',
        accent: 'border-l-teal-400 bg-teal-50/40',
        iconColor: 'bg-teal-100 text-teal-600',
        rowHover: 'hover:bg-teal-50/60',
      };
    case HiveNotificationType.SAVINGS_WITHDRAW:
    case HiveNotificationType.SAVINGS_WITHDRAW_FILL:
      return {
        icon: <Banknote size={13} />,
        label: type === HiveNotificationType.SAVINGS_WITHDRAW ? 'Savings Out' : 'Savings Paid',
        accent: 'border-l-sky-400 bg-sky-50/40',
        iconColor: 'bg-sky-100 text-sky-600',
        rowHover: 'hover:bg-sky-50/60',
      };
    case HiveNotificationType.PROPOSAL_PAY:
      return {
        icon: <Landmark size={13} />,
        label: 'Proposal Pay',
        accent: 'border-l-indigo-400 bg-indigo-50/40',
        iconColor: 'bg-indigo-100 text-indigo-600',
        rowHover: 'hover:bg-indigo-50/60',
      };
    case HiveNotificationType.LIMIT_ORDER_CREATE:
      return {
        icon: <ListPlus size={13} />,
        label: 'Order',
        accent: 'border-l-lime-400 bg-lime-50/40',
        iconColor: 'bg-lime-100 text-lime-700',
        rowHover: 'hover:bg-lime-50/60',
      };
    case HiveNotificationType.FILL_ORDER:
      return {
        icon: <CandlestickChart size={13} />,
        label: 'Trade',
        accent: 'border-l-fuchsia-400 bg-fuchsia-50/40',
        iconColor: 'bg-fuchsia-100 text-fuchsia-600',
        rowHover: 'hover:bg-fuchsia-50/60',
      };
    case HiveNotificationType.LIMIT_ORDER_CANCEL:
      // Deliberately quiet -- a cancellation moves no value and traders cancel constantly.
      // Still a shade darker than the `default` fallback, or a cancelled order reads as an
      // unrecognised/broken row rather than a deliberately understated one.
      return {
        icon: <Ban size={13} />,
        label: 'Cancelled',
        accent: 'border-l-slate-400 bg-slate-50/40',
        iconColor: 'bg-slate-200 text-slate-600',
        rowHover: 'hover:bg-slate-50/60',
      };
    case HiveNotificationType.LIMIT_ORDER_EXPIRED:
      return {
        icon: <Clock size={13} />,
        label: 'Expired',
        accent: 'border-l-stone-300 bg-stone-50/40',
        iconColor: 'bg-stone-200 text-stone-600',
        rowHover: 'hover:bg-stone-50/60',
      };
    case HiveNotificationType.CONVERT_REQUEST:
      return {
        icon: <ArrowLeftRight size={13} />,
        label: 'Conversion',
        accent: 'border-l-yellow-400 bg-yellow-50/40',
        iconColor: 'bg-yellow-100 text-yellow-700',
        rowHover: 'hover:bg-yellow-50/60',
      };
    case HiveNotificationType.CONVERT_FILL:
      return {
        icon: <CheckCircle2 size={13} />,
        label: 'Converted',
        accent: 'border-l-lime-500 bg-lime-50/40',
        iconColor: 'bg-lime-200 text-lime-800',
        rowHover: 'hover:bg-lime-50/60',
      };
    default:
      return {
        icon: <Info size={13} />,
        label: 'Notice',
        accent: 'border-l-slate-300 bg-white',
        iconColor: 'bg-slate-100 text-slate-500',
        rowHover: 'hover:bg-slate-50',
      };
  }
}

// Extract @author from the msg string if the author field is empty.
function resolveAuthor(notification: HiveNotification): string {
  if (notification.author) return notification.author;
  const match = notification.msg?.match(/^@([\w.-]+)/);
  return match?.[1] ?? '';
}

// Strip the leading "@author " prefix from msg since we display the author separately.
function resolveBody(notification: HiveNotification, author: string): string {
  let msg = notification.msg ?? '';
  if (author && msg.startsWith(`@${author}`)) {
    msg = msg.slice(author.length + 1).trimStart();
  }
  // Clean trailing " and 0 others"
  msg = msg.replace(/\s+and 0 others$/i, '');
  // Transfer: show amount prominently if present
  if (notification.type === HiveNotificationType.TRANSFER && notification.amount && !msg.includes(notification.amount)) {
    msg = `sent you ${notification.amount}${msg ? ` · ${msg}` : ''}`;
  }
  return msg || notification.type;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, settings, allFrontends }) => {
  const cfg = getTypeConfig(notification.type);
  const author = resolveAuthor(notification);
  const body = resolveBody(notification, author);

  const handleClick = () => {
    let path = notification.url
      ? (notification.url.startsWith('http') ? null : (notification.url.startsWith('/') ? notification.url : `/${notification.url}`))
      : notification.type === HiveNotificationType.FOLLOW
        ? `/@${author}`
        : null;

    if (!path && notification.url?.startsWith('http')) {
      window.open(notification.url, '_blank');
      return;
    }
    if (!path) return;

    // Pull the identity out of the path instead of passing nulls. With nulls, getTargetUrl
    // has nothing to build from and falls back to carrying this path verbatim — which sends
    // every notification click to /@author/permlink, a 404 on any frontend that does not use
    // that shape (SlothBuzz serves /post/<author>/<permlink>) and a bare homepage on 3Speak.
    const post = path.match(AUTHOR_PERMLINK_REGEX);
    const user = path.match(/^\/@([a-z0-9.-]+)\/?$/);
    // A wallet-ish path is an action, not a page: let the target resolve its own wallet URL
    // rather than assuming /@user/transfers exists there.
    const walletish = /^\/@[a-z0-9.-]+\/(transfers|wallet|permissions|password)$/.test(path);
    const mode = walletish ? ActionMode.WALLET : ActionMode.SAME_PAGE;
    const who = walletish ? path.match(/^\/@([a-z0-9.-]+)\//)?.[1] ?? null : (user?.[1] ?? null);

    const url = getTargetUrl(
      settings.preferredFrontendId, path, mode,
      who,
      post ? post[1] : null,
      post ? post[2] : null,
      allFrontends,
    );
    if (url) window.open(url, '_blank');
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0 cursor-pointer transition-colors border-l-2 ${cfg.accent} ${cfg.rowHover}`}
    >
      {/* Colored icon */}
      <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${cfg.iconColor}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5 min-w-0">
            {author ? (
              <span className="text-xs font-bold text-slate-800 truncate">@{author}</span>
            ) : null}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.iconColor}`}>
              {cfg.label}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{formatDate(notification.date)}</span>
        </div>

        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
          {body}
        </p>

        {notification.type === HiveNotificationType.TRANSFER && notification.memo && (
          <p className="mt-1 text-[10px] italic text-slate-500 bg-white/70 rounded px-1.5 py-0.5 border border-slate-100 truncate">
            "{notification.memo}"
          </p>
        )}
      </div>
    </div>
  );
};
