import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, Loader, ExternalLink, Users, MessageSquare, ThumbsUp } from 'lucide-react';
import { AppSettings, TrendingPost, TrendingCommunity } from '../../types';
import { fetchTrendingPosts, fetchTrendingCommunities } from '../../utils/hiveHelpers';

interface TrendingViewProps {
  settings: AppSettings;
  allFrontends: any[];
}

type Tab  = 'posts' | 'communities';
type Sort = 'trending' | 'hot' | 'created';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  return `${m}m ago`;
};

const payout = (post: TrendingPost) => {
  const total = post.pendingPayout > 0 ? post.pendingPayout : post.totalPayout;
  return total > 0 ? `$${total.toFixed(2)}` : null;
};

const SORT_LABELS: { key: Sort; label: string }[] = [
  { key: 'trending', label: '🔥 Trending' },
  { key: 'hot',      label: '⚡ Hot'      },
  { key: 'created',  label: '🆕 New'      },
];

export const TrendingView: React.FC<TrendingViewProps> = ({ settings, allFrontends }) => {
  const [tab, setTab]                     = useState<Tab>('posts');
  const [sort, setSort]                   = useState<Sort>('trending');
  const [posts, setPosts]                 = useState<TrendingPost[]>([]);
  const [communities, setCommunities]     = useState<TrendingCommunity[]>([]);
  const [loading, setLoading]             = useState(false);
  const [lastFetched, setLastFetched]     = useState<Record<Sort, number>>({ trending: 0, hot: 0, created: 0 });

  const preferredFrontend = allFrontends.find(f => f.id === settings.preferredFrontendId);
  const baseDomain = preferredFrontend?.domain ?? 'peakd.com';

  const postUrl      = (author: string, permlink: string) => `https://${baseDomain}/@${author}/${permlink}`;
  const communityUrl = (name: string) => `https://${baseDomain}/trending/${name}`;

  const load = useCallback(async (force = false) => {
    const ts = lastFetched[sort];
    if (!force && ts && Date.now() - ts < REFRESH_INTERVAL_MS) return;
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        fetchTrendingPosts(20, '', settings, sort),
        fetchTrendingCommunities(30, settings),
      ]);
      setPosts(p);
      setCommunities(c);
      setLastFetched(prev => ({ ...prev, [sort]: Date.now() }));
    } finally {
      setLoading(false);
    }
  }, [lastFetched, sort, settings]);

  useEffect(() => { load(); }, [sort]);

  const openLink = (url: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-orange-100 rounded-lg p-1.5">
            <TrendingUp size={14} className="text-orange-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Trending on Hive</h2>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
        {(['posts', 'communities'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all capitalize ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'posts' ? '📰 Posts' : '🏘️ Communities'}
          </button>
        ))}
      </div>

      {/* Sort selector — posts only */}
      {tab === 'posts' && (
        <div className="flex gap-1.5">
          {SORT_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                sort === key
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
          <Loader size={20} className="animate-spin opacity-40" />
          <span className="text-xs">Loading trending data…</span>
        </div>
      ) : tab === 'posts' ? (
        <div className="flex flex-col gap-2">
          {posts.map((post, i) => {
            const reward = payout(post);
            return (
              <button
                key={`${post.author}/${post.permlink}`}
                onClick={() => openLink(postUrl(post.author, post.permlink))}
                className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group"
              >
                {/* Rank */}
                <span className="text-[11px] font-bold text-slate-300 w-4 shrink-0 pt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">@{post.author}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[10px] text-slate-400">{timeAgo(post.created)}</span>
                    {reward && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="text-[10px] font-semibold text-emerald-600">{reward}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <ThumbsUp size={9} /> {post.votes.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MessageSquare size={9} /> {post.comments}
                    </span>
                    {post.tags[0] && (
                      <span className="text-[10px] text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-full">
                        #{post.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink size={11} className="text-slate-300 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
              </button>
            );
          })}
          {posts.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-slate-400">No trending posts found.</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {communities.map((c, i) => (
            <button
              key={c.name}
              onClick={() => openLink(communityUrl(c.name))}
              className="flex items-start gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group"
            >
              <span className="text-[11px] font-bold text-slate-300 w-4 shrink-0 pt-0.5">{i + 1}</span>
              <div className="bg-orange-50 rounded-lg p-1.5 shrink-0">
                <Users size={12} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                  {c.title}
                </p>
                {c.about && (
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{c.about}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">
                    {c.subscribers.toLocaleString()} subscribers
                  </span>
                  {c.numAuthors > 0 && (
                    <>
                      <span className="text-slate-200">·</span>
                      <span className="text-[10px] text-slate-400">{c.numAuthors} active authors</span>
                    </>
                  )}
                  {c.sumPending > 0 && (
                    <>
                      <span className="text-slate-200">·</span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        ${c.sumPending.toLocaleString(undefined, { maximumFractionDigits: 0 })} pending
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ExternalLink size={11} className="text-slate-300 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
            </button>
          ))}
          {communities.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-slate-400">No communities found.</div>
          )}
        </div>
      )}

      {lastFetched && (
        <p className="text-center text-[9px] text-slate-300 uppercase tracking-widest font-semibold pb-1">
          Updated {timeAgo(new Date(lastFetched).toISOString())} · auto-refreshes hourly
        </p>
      )}
    </div>
  );
};
