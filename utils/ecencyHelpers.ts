import { Channel, PostResponse, Message } from '../types';

declare const chrome: any;

// Helper to interact with Ecency Chat API
const ECENCY_CHAT_BASE = 'https://ecency.com/api/mattermost';

interface UnreadResponse {
  channel_id: string;
  user_id: string;
  msg_count: number;
  mention_count: number;
  last_viewed_at: number;
}

/**
 * Creates auth headers.
 */
const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };
  
  if (token && token !== 'cookie-session') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Helper to retrieve the mm_pat cookie directly from the browser jar.
 */
const getMmPatCookie = async (): Promise<string | null> => {
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

/**
 * Bootstraps the Ecency Chat session.
 */
export const bootstrapEcencyChat = async (username: string, accessToken: string): Promise<string | null> => {
  try {
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    
    const body: any = {
      username: cleanUsername,
      accessToken
    };

    console.log('[EcencyChat] Bootstrapping...');
    const response = await fetch(`${ECENCY_CHAT_BASE}/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const txt = await response.text();
      console.warn(`[EcencyChat] Bootstrap failed: ${response.status}`, txt);
      return null;
    }

    await new Promise(resolve => setTimeout(resolve, 800));

    const cookieToken = await getMmPatCookie();
    if (cookieToken) {
      return cookieToken;
    }

    try {
        const data = await response.json();
        const token = data.token || data.access_token || data.sid || data.mm_token;
        if (token) return token;
        
        if (data && (data.ok || data.status === 'ok')) {
             return 'cookie-session'; 
        }
    } catch (e) { /* ignore json parse error */ }
    
    return null;

  } catch (e) {
    console.error('[EcencyChat] Bootstrap error:', e);
    return null;
  }
};

/**
 * Fetches the current authenticated user's details.
 */
export const fetchMe = async (token?: string): Promise<{ id: string; username: string } | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/users/me`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.id) {
       console.log('[EcencyChat] Resolved ME:', data.id, data.username);
       return { id: data.id, username: data.username };
    }
    return null;
  } catch (e) {
    console.error('[EcencyChat] Failed to fetch me:', e);
    return null;
  }
};

/**
 * Fetches the total unread message count.
 */
export const fetchUnreadChatCount = async (token?: string): Promise<number | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/unreads`, {
      method: 'GET', 
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) return null;

    const data = await response.json();
    
    let total = 0;
    if (Array.isArray(data)) {
      total = data.reduce((sum: any, item: UnreadResponse) => sum + (item.msg_count || 0), 0);
    } else if (data && typeof data === 'object') {
       total = (data.msg_count || 0);
    }
    return total;
  } catch (error) {
    console.error('[EcencyChat] Error fetching unread count:', error);
    return null;
  }
};

/**
 * Fetches the list of channels.
 */
export const fetchChannels = async (token?: string): Promise<Channel[] | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn(`[EcencyChat] Failed to fetch channels: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.channels)) return data.channels;
    return [];
  } catch (e) {
    console.error('[EcencyChat] Error fetching channels:', e);
    return null;
  }
};

/**
 * Creates DM channel.
 */
export const getOrCreateDirectChannel = async (username: string, token?: string): Promise<{ id: string | null, error?: string, success?: boolean }> => {
  try {
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    
    const response = await fetch(`${ECENCY_CHAT_BASE}/direct`, {
      method: 'POST',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify({ username: cleanUser })
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Error ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errMsg;
      } catch (e) {}
      return { id: null, error: errMsg };
    }

    const rawData = await response.text();
    let data;
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      return { id: null, success: true };
    }

    const channel = Array.isArray(data) ? data[0] : data;
    const id = channel?.id || channel?.channel_id || null;

    if (!id) return { id: null, success: true }; 

    return { id, success: true };
  } catch (e: any) {
    console.error('[EcencyChat] Error creating DM:', e);
    return { id: null, error: e.message || 'Network error' };
  }
};

/**
 * Resolves Mattermost User IDs to Hive usernames
 */
export const fetchUsersByIds = async (userIds: string[], token?: string): Promise<Record<string, string>> => {
  if (userIds.length === 0) return {};
  try {
    console.log('[EcencyChat] Resolving users:', userIds);
    // Dedup
    const uniqueIds = [...new Set(userIds)];
    
    const response = await fetch(`${ECENCY_CHAT_BASE}/users/ids`, {
      method: 'POST',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify(uniqueIds)
    });

    if (!response.ok) {
        console.warn('[EcencyChat] Resolve users failed status:', response.status);
        return {};
    }
    
    const users = await response.json();
    console.log('[EcencyChat] Resolved users payload:', users);

    const map: Record<string, string> = {};
    if (Array.isArray(users)) {
      users.forEach((u: any) => {
        if (u.id && u.username) map[u.id] = u.username;
      });
    }
    return map;
  } catch (e) {
    console.error('[EcencyChat] Failed to resolve users:', e);
    return {};
  }
};

/**
 * Fetches posts for a channel.
 * Returns raw messages AND a map of discovered users from data.profiles.
 */
export const fetchChannelPosts = async (channelId: string, token?: string): Promise<{ messages: Message[], users: Record<string, string> }> => {
  try {
    const ts = Date.now();
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts?page=0&per_page=100&t=${ts}`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
        console.warn(`[EcencyChat] fetchChannelPosts failed: ${response.status}`);
        return { messages: [], users: {} };
    }

    const data: any = await response.json();
    
    // DEBUG LOGGING
    console.log('[EcencyChat] fetchChannelPosts data:', {
        channelId,
        orderCount: data?.order?.length,
        postsCount: data?.posts ? Object.keys(data.posts).length : 0,
        hasProfiles: !!data?.profiles,
        profilesCount: data?.profiles ? Object.keys(data.profiles).length : 0
    });

    if (data?.posts) {
        // Log first post to inspect props/user_id
        const first = Object.values(data.posts)[0] as any;
        if (first) {
            console.log('[EcencyChat] Sample Post:', { 
                id: first.id, 
                user_id: first.user_id, 
                props: first.props, 
                username: first.username,
                sender_name: first.sender_name 
            });
        }
    }
    
    let messages: Message[] = [];
    const users: Record<string, string> = {};

    if (data) {
      // 1. Extract Profiles (Standard Mattermost way to get author info)
      if (data.profiles) {
        Object.values(data.profiles).forEach((u: any) => {
          if (u.id && u.username) {
             users[u.id] = u.username;
          }
        });
      }

      // 2. Parse Posts
      if (data.order && data.posts) {
         messages = data.order.map((id: string) => data.posts[id]).filter((p: any) => !!p);
      } else if (Array.isArray(data)) {
         messages = data;
      } else if (data.posts && Array.isArray(data.posts)) {
         messages = data.posts;
      }
    }

    // Sort: Oldest First
    messages.sort((a, b) => a.create_at - b.create_at);

    // 3. Fallback: Check if message objects themselves have user info (Bridge/Proxy cases)
    // Aggressively check props for override_username which is common in Ecency bridges
    // Also check standard `username` prop which might be present in some payloads
    messages.forEach(m => {
        // Direct property check
        if (m.username && !users[m.user_id]) users[m.user_id] = m.username;
        if (m.sender_name && !users[m.user_id]) users[m.user_id] = m.sender_name;
        
        // Props check (Webhooks/Bridges/System)
        if (m.props) {
            // Check for override_username, webhook_display_name, OR just 'username' in props
            const override = m.props.override_username || m.props.webhook_display_name || m.props.username;
            if (override && !users[m.user_id]) {
                users[m.user_id] = override;
            }
        }
    });

    console.log('[EcencyChat] Discovered Users:', Object.keys(users).length);

    return { messages, users };
  } catch (e) {
    console.error('[EcencyChat] Error fetching posts:', e);
    return { messages: [], users: {} };
  }
};

/**
 * Sends a message.
 */
export const sendMessage = async (channelId: string, message: string, token?: string): Promise<Message | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts`, {
      method: 'POST',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify({
        message,
        channel_id: channelId
      })
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('[EcencyChat] Error sending message:', e);
    return null;
  }
};

export const getAvatarUrl = (username?: string) => {
  if (!username) return '';
  const clean = username.replace(/^@/, '').trim();
  // Avoid internal IDs (usually 26 chars in MM)
  if (clean.length > 20 && !clean.includes(' ')) return ''; 
  return `https://images.ecency.com/u/${clean}/avatar/small`;
};