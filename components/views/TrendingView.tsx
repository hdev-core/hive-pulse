import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, RefreshCw, Loader, ExternalLink, Hash, MessageSquare, ThumbsUp } from 'lucide-react';
import { AppSettings, TrendingPost, TrendingTag } from '../../types';
import { fetchTrendingPosts, fetchTrendingTags } from '../../utils/hiveHelpers';

interface TrendingViewProps {
  settings: AppSettings;
  allFrontends: any[];
}

type Tab = 'posts' | 'tags';

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

export const TrendingView: React.FC<TrendingViewProps> = ({ settings, allFrontends }) => {
  const [tab, setTab]           = useState<Tab>('posts');
  const [posts, setPosts]       = useState<TrendingPost[]>([]);
  const [tags, setTags]         = useState<TrendingTag[]>([]);
  const [loading, setLoading]   = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const preferredFrontend = allFrontends.find(f => f.id === settings.preferredFrontendId);
  const baseDomain = preferredFrontend?.domain ?? 'peakd.com';

  const postUrl  = (author: string, permlink: string) => `https://${baseDomain}/@${author}/${permlink}`;
  const tagUrl   = (tag: string) => `https://${baseDomain}/trending/${tag}`;

  const load = useCallback(async (force = false) => {
    if (!force && lastFetched && Date.now() - lastFetched < REFRESH_INTERVAL_MS) return;
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        fetchTrendingPosts(20, '', settings),
        fetchTrendingTags(30, settings),
      ]);
      setPosts(p);
      setTags(t.filter(t => t.name && t.postsToday > 0));
      setLastFetched(Date.now());
    } finally {
      setLoading(false);
    }
  }, [lastFetched, settings]);

  useEffect(() => { load(); }, []);

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
        {(['posts', 'tags'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all capitalize ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'posts' ? '🔥 Posts' : '# Tags'}
          </button>
        ))}
      </div>

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
          {tags.map((tag, i) => (
            <button
              key={tag.name}
              onClick={() => openLink(tagUrl(tag.name))}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group"
            >
              <span className="text-[11px] font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
              <div className="bg-orange-50 rounded-lg p-1.5 shrink-0">
                <Hash size={12} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                  #{tag.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {tag.postsToday.toLocaleString()} posts today
                  {parseFloat(tag.totalPayouts) > 0 && (
                    <span className="text-emerald-500 ml-1.5">
                      · ${parseFloat(tag.totalPayouts).toLocaleString(undefined, { maximumFractionDigits: 0 })} total
                    </span>
                  )}
                </p>
              </div>
              <ExternalLink size={11} className="text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
            </button>
          ))}
          {tags.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-slate-400">No trending tags found.</div>
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
