import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Loader, ExternalLink, Users, MessageSquare, ThumbsUp } from 'lucide-react';
import { AppSettings, TrendingPost, TrendingCommunity, ActionMode } from '../../types';
import { getTargetUrl, frontendIsStandard } from '../../utils/urlHelpers';

// Module scope: this was being reallocated on every render.
const COMMUNITY_OK = new Set(['peakd.com', 'ecency.com', 'hive.blog', 'inleo.io',
                              'waivio.com', 'ureka.social']);
import { fetchTrendingPosts, fetchTrendingCommunities, fetchFypPosts } from '../../utils/hiveHelpers';

interface TrendingViewProps {
  settings: AppSettings;
  allFrontends: any[];
}

type Tab  = 'posts' | 'communities';
type Sort = 'foryou' | 'trending' | 'hot' | 'created';

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
  { key: 'foryou',   label: '✨ For You'  },
  { key: 'trending', label: '🔥 Trending' },
  { key: 'hot',      label: '⚡ Hot'      },
  { key: 'created',  label: '🆕 New'      },
];

// A short, human reason explaining why a post was surfaced in the For You feed.
const fypReason = (post: TrendingPost): string | null => {
  const f = post.fyp;
  if (!f) return null;
  if (f.boostSource) return `✨ ${f.boostSource}`;
  if (f.scoreRelevance != null) return `${Math.round(f.scoreRelevance * 100)}% match`;
  return '✨ For You';
};

export const TrendingView: React.FC<TrendingViewProps> = ({ settings, allFrontends }) => {
  const [tab, setTab]                     = useState<Tab>('posts');
  const [sort, setSort]                   = useState<Sort>('foryou');
  const [posts, setPosts]                 = useState<TrendingPost[]>([]);
  const [communities, setCommunities]     = useState<TrendingCommunity[]>([]);
  const [loading, setLoading]             = useState(false);
  const [lastFetched, setLastFetched]     = useState<Record<Sort, number>>({ foryou: 0, trending: 0, hot: 0, created: 0 });

  // When logged in we get a personalized For You feed; otherwise the public global feed.
  const fypUser = settings.ecencyUsername || settings.rcUser || '';

  const preferredFrontend = allFrontends.find(f => f.id === settings.preferredFrontendId);
  const baseDomain = preferredFrontend?.customDomain ?? preferredFrontend?.domain ?? 'peakd.com';

  // Route posts through getTargetUrl rather than assembling /@author/permlink here. Pasting
  // that shape onto the preferred frontend's domain ignores every frontend whose posts do
  // not live there: SlothBuzz (/post/...), 3Speak (/watch?v=...) and any custom frontend's
  // linkStructure. Every trending row was a 404 for a SlothBuzz user.
  const postUrl = (author: string, permlink: string) =>
    getTargetUrl(settings.preferredFrontendId, `/@${author}/${permlink}`,
                 ActionMode.SAME_PAGE, null, author, permlink, allFrontends);

  // There is no community template to resolve, so this is an explicit list rather than a
  // guess. Using "has a linkStructure" as the discriminator was wrong in both directions:
  // it sent every custom condenser mirror to its home page, while still handing Actifit a
  // /trending/<community> URL that answers HTTP 500. Verified live per frontend; anything
  // not listed falls back to the home page rather than a URL we have not checked.
  // Confirmed to render a real community feed at /trending/<name>. liketu.com and
  // hivescan.info were dropped after checking content rather than status: both answer 200
  // for any path, but liketu returns its homepage byte-for-byte and hivescan has no
  // /trending route at all. actifit.io answers 500. A custom frontend using the standard
  // condenser shape is a mirror, so it qualifies too — keying on the domain alone sent
  // every custom mirror to its home page, which is what the previous version got wrong.
  const communitySupported =
    COMMUNITY_OK.has(baseDomain) || (preferredFrontend?.isCustom === true
      && frontendIsStandard(preferredFrontend));
  const communityUrl = (name: string) =>
    communitySupported ? `https://${baseDomain}/trending/${name}` : `https://${baseDomain}/`;

  const load = useCallback(async (force = false) => {
    const ts = lastFetched[sort];
    if (!force && ts && Date.now() - ts < REFRESH_INTERVAL_MS) return;
    setLoading(true);
    try {
      const postsPromise = sort === 'foryou'
        ? fetchFypPosts(fypUser || undefined, 20)
        : fetchTrendingPosts(20, '', settings, sort);
      const [p, c] = await Promise.all([
        postsPromise,
        fetchTrendingCommunities(30, settings),
      ]);
      setPosts(p);
      setCommunities(c);
      setLastFetched(prev => ({ ...prev, [sort]: Date.now() }));
    } finally {
      setLoading(false);
    }
  }, [lastFetched, sort, settings, fypUser]);

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
            <Sparkles size={14} className="text-orange-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Hive Feed</h2>
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

      {/* For You context — personalized vs global */}
      {tab === 'posts' && sort === 'foryou' && (
        <p className="text-[10px] text-violet-500 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5 -mt-1">
          {fypUser
            ? <>✨ Personalized for <span className="font-semibold">@{fypUser}</span> — ranked by your interests &amp; communities</>
            : <>✨ Global picks — <span className="font-semibold">log in</span> to personalize your feed</>}
        </p>
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
            const reason = sort === 'foryou' ? fypReason(post) : null;
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
                    {reason && (
                      <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                        {reason}
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

      {lastFetched[sort] > 0 && (
        <p className="text-center text-[9px] text-slate-300 uppercase tracking-widest font-semibold pb-1">
          Updated {timeAgo(new Date(lastFetched[sort]).toISOString())} · auto-refreshes hourly
        </p>
      )}
    </div>
  );
};
