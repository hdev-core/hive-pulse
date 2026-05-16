
import { Channel, PostResponse, Message, Reaction } from '../types';

declare const chrome: any;

// Custom error for auth failures
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

const ECENCY_CHAT_BASE = 'https://ecency.com/api/mattermost';

export interface UnreadChannel {
  channelId: string;
  type: string;
  mention_count: number;
  message_count: number;
}

export interface UnreadsApiResponse {
  channels: UnreadChannel[];
  totalMentions: number;
  totalDMs: number;
  totalUnread: number;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  last_viewed_at: number;
  msg_count: number;
  mention_count: number;
  last_update_at: number;
}

// Auth is entirely cookie-based (mm_pat cookie). Never send a Bearer token —
// the API ignores it and returns 401. All requests use credentials: 'include'
// so the browser's mm_pat cookie is sent automatically.
const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  // Only add Authorization for real Bearer tokens (not cookie-session placeholders)
  if (token && token !== 'cookie-session' && token !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const getMmPatCookie = async (): Promise<string | null> => {
  if (typeof chrome === 'undefined' || !chrome.cookies) return null;
  try {
    const cookie = await chrome.cookies.get({ url: 'https://ecency.com', name: 'mm_pat' });
    if (cookie) return cookie.value;
    const cookies = await chrome.cookies.getAll({ domain: 'ecency.com', name: 'mm_pat' });
    if (cookies && cookies.length > 0) {
      const valid = cookies.find((c: any) => c.value && c.value.length > 5);
      if (valid) return valid.value;
      return cookies[0].value;
    }
  } catch (e) {
    console.error('[EcencyChat] Failed to get cookie:', e);
  }
  return null;
};

// Sets the mm_pat cookie on ecency.com, effectively switching the browser's
// chat session to a different account.
export const setMmPatCookie = async (value: string): Promise<boolean> => {
  if (typeof chrome === 'undefined' || !chrome.cookies) return false;
  return new Promise((resolve) => {
    chrome.cookies.set(
      { url: 'https://ecency.com', name: 'mm_pat', value, path: '/', secure: true },
      (cookie: any) => resolve(!!cookie)
    );
  });
};

interface BootstrapResult {
  token: string;
  userId?: string;
  refreshToken?: string;
  mmPat?: string; // actual mm_pat cookie value captured during bootstrap
}

export const bootstrapEcencyChat = async (username: string, accessToken: string): Promise<BootstrapResult | null> => {
  try {
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    const body: any = { username: cleanUsername, accessToken };

    // credentials: 'include' is required — the server authenticates the Hive token and
    // responds with Set-Cookie: mm_pat=<value>, which the browser stores automatically.
    const response = await fetch(`${ECENCY_CHAT_BASE}/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const mmPat = await getMmPatCookie();
      let token = 'cookie-session';
      let userId: string | undefined;
      let refreshToken: string | undefined;
      try {
        const data = await response.json();
        token = data.token || data.access_token || data.sid || data.mm_token || 'cookie-session';
        userId = data.user_id || data.id;
        refreshToken = data.refresh_token || data.refreshToken;
      } catch (e) {}
      return { token, userId, refreshToken, mmPat: mmPat ?? undefined };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const refreshEcencySession = async (refreshToken: string): Promise<{ token: string, refreshToken?: string } | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken })
    });
    if (response.ok) {
      const data = await response.json();
      if (data && (data.token || data.access_token)) {
        return { token: data.token || data.access_token, refreshToken: data.refresh_token || data.refreshToken || refreshToken };
      }
    }
  } catch (e) {}
  return null;
};

export const fetchMe = async (token?: string): Promise<{ id: string; username: string } | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/users/me`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.id) return { id: data.id, username: data.username };
    return null;
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return null;
  }
};

export const fetchUnreads = async (token?: string): Promise<UnreadsApiResponse | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/unreads`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.channels) return data as UnreadsApiResponse;
    return null;
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return null;
  }
};

export const fetchChannels = async (token?: string): Promise<Channel[] | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.channels)) return data.channels;
    return [];
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return null;
  }
};

export const getOrCreateDirectChannel = async (username: string, token?: string): Promise<{ channel?: Channel, id: string | null, error?: string, success?: boolean }> => {
  try {
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    const response = await fetch(`${ECENCY_CHAT_BASE}/direct`, {
      method: 'POST',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify({ username: cleanUser })
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Error ${response.status}`;
      try { const errJson = JSON.parse(errText); errMsg = errJson.message || errMsg; } catch (e) {}
      return { id: null, success: false, error: errMsg };
    }
    const data = await response.json();
    const channelItem = Array.isArray(data) ? data[0] : (data.channel || data);
    if (channelItem && (channelItem.id || channelItem.channel_id)) {
      const channel = { ...channelItem, id: channelItem.id || channelItem.channel_id, type: channelItem.type || 'D' } as Channel;
      return { channel, id: channel.id, success: true };
    }
    return { id: null, success: false, error: 'Invalid response format' };
  } catch (e: any) {
    if (e instanceof UnauthorizedError) throw e;
    return { id: null, success: false, error: e.message || 'Network error' };
  }
};

export const fetchUsersByIds = async (userIds: string[], token?: string): Promise<Record<string, string>> => {
  if (userIds.length === 0) return {};
  const map: Record<string, string> = {};
  const uniqueIds = [...new Set(userIds)];
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/users/ids`, {
      method: 'POST',
      headers: getHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ ids: uniqueIds })
    });
    if (response.ok) {
      const data = await response.json();
      const users = Array.isArray(data) ? data : (data.users || []);
      if (Array.isArray(users)) users.forEach((u: any) => { if (u.id && u.username) map[u.id] = u.username; });
    }
  } catch (e) {}
  return map;
};

export const fetchChannelPosts = async (channelId: string, token?: string, limit: number = 60): Promise<{ messages: Message[], users: Record<string, string> }> => {
  const ts = Date.now();
  const url = `${ECENCY_CHAT_BASE}/channels/${channelId}/posts?page=0&per_page=${limit}&t=${ts}`;
  try {
    let response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if ((response.status === 401 || response.status === 403) && token && token !== '') {
      response = await fetch(url, { method: 'GET', headers: getHeaders(''), cache: 'no-store', credentials: 'include' });
    }

    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) return { messages: [], users: {} };

    const data: any = await response.json();
    let messages: Message[] = [];
    const users: Record<string, string> = {};

    if (data) {
      const extractUser = (u: any) => { if (u && u.id && u.username) users[u.id] = u.username; };
      if (data.profiles) Object.values(data.profiles).forEach(extractUser);
      if (data.users) {
        if (Array.isArray(data.users)) data.users.forEach(extractUser);
        else if (typeof data.users === 'object') Object.values(data.users).forEach(extractUser);
      }
      if (data.order && data.posts && typeof data.posts === 'object') {
        messages = data.order.map((id: string) => data.posts[id]).filter((p: any) => !!p);
      } else if (Array.isArray(data)) {
        messages = data;
      } else if (data.posts && Array.isArray(data.posts)) {
        messages = data.posts;
      }
    }

    messages.sort((a, b) => a.create_at - b.create_at);
    messages.forEach(m => {
      if (m.username && !users[m.user_id]) users[m.user_id] = m.username;
      if (m.sender_name && !users[m.user_id]) users[m.user_id] = m.sender_name;
      if (m.props) {
        const override = m.props.override_username || m.props.webhook_display_name || m.props.username;
        if (override && !users[m.user_id]) users[m.user_id] = override;
      }
    });
    return { messages, users };
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return { messages: [], users: {} };
  }
};

export const sendMessage = async (channelId: string, message: string, token?: string): Promise<Message | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts`, {
      method: 'POST',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify({ message, channel_id: channelId })
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return null;
  }
};

export const editMessage = async (channelId: string, postId: string, message: string, token?: string): Promise<Message | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts/${postId}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify({ message })
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return null;
  }
};

export const deleteMessage = async (channelId: string, postId: string, token?: string): Promise<boolean> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    return response.ok;
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return false;
  }
};

export const toggleReaction = async (channelId: string, postId: string, emoji: string, shouldAdd: boolean, token?: string): Promise<boolean> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts/${postId}/reactions`, {
      method: 'POST',
      headers: getHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ emoji, add: shouldAdd })
    });
    if (response.status === 401) throw new UnauthorizedError('Unauthorized');
    return response.ok;
  } catch (e) {
    if (e instanceof UnauthorizedError) throw e;
    return false;
  }
};

export const getAvatarUrl = (username?: string) => {
  if (!username) return '';
  const clean = username.replace(/^@/, '').trim();
  if (clean.length > 20 && !clean.includes(' ')) return 'https://images.ecency.com/u/ecency/avatar/small';
  return `https://images.ecency.com/u/${clean}/avatar/small`;
};
