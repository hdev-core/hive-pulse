
import { Channel, PostResponse, Message, Reaction } from '../types';

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

interface BootstrapResult {
    token: string;
    userId?: string;
}

/**
 * Bootstraps the Ecency Chat session.
 * Returns an object with token and optional userId.
 */
export const bootstrapEcencyChat = async (username: string, accessToken: string): Promise<BootstrapResult | null> => {
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
      console.warn(`[EcencyChat] Bootstrap HTTP ${response.status}`);
    } else {
        try {
            const data = await response.json();
            const token = data.token || data.access_token || data.sid || data.mm_token;
            let userId = data.user_id || data.id; 
            
            if (token) {
                // If we didn't get userId from bootstrap, verify strictly
                if (!userId) {
                    // Try /users/me first
                    const me = await fetchMe(token);
                    if (me && me.id) {
                      userId = me.id;
                    } else {
                      // Fallback to /users/username/{username}
                      const userByName = await fetchUserByUsername(cleanUsername, token);
                      if (userByName && userByName.id) userId = userByName.id;
                    }
                }
                return { token, userId };
            }
        } catch (e) { /* ignore */ }
    }

    // Check for cookie fallback
    const cookieToken = await getMmPatCookie();
    if (cookieToken) {
       // Try to get ID if possible
       const me = await fetchMe(cookieToken);
       let uid = me?.id;
       if (!uid) {
           const userByName = await fetchUserByUsername(cleanUsername, cookieToken);
           if (userByName) uid = userByName.id;
       }
       return { 
           token: 'cookie-session',
           userId: uid
       };
    }

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

    if (!response.ok) {
        // Suppress 404 warnings as it seems common for some accounts
        if (response.status !== 404) {
            console.warn(`[EcencyChat] fetchMe failed: ${response.status}`);
        }
        return null;
    }

    const data = await response.json();
    if (data && data.id) {
       return { id: data.id, username: data.username };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Fetches a user by username.
 */
export const fetchUserByUsername = async (username: string, token?: string): Promise<{ id: string; username: string } | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/users/username/${username}`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store'
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.id) {
       return { id: data.id, username: data.username };
    }
    return null;
  } catch (e) {
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

    if (!response.ok) return null;

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
 * Creates DM channel. Returns the full channel object if possible.
 */
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

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Error ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errMsg;
      } catch (e) {}
      return { id: null, success: false, error: errMsg };
    }

    const data = await response.json();
    
    if (!data) {
        return { id: null, success: false, error: "Empty response from server" };
    }

    const channelItem = Array.isArray(data) ? data[0] : (data.channel || data);
    
    if (channelItem && (channelItem.id || channelItem.channel_id)) {
        const channel = {
            ...channelItem,
            id: channelItem.id || channelItem.channel_id,
            type: channelItem.type || 'D'
        } as Channel;
        
        return { channel, id: channel.id, success: true };
    }

    return { id: null, success: false, error: `Invalid response format` };

  } catch (e: any) {
    return { id: null, success: false, error: e.message || 'Network error' };
  }
};

/**
 * Resolves Mattermost User IDs to Hive usernames.
 */
export const fetchUsersByIds = async (userIds: string[], token?: string): Promise<Record<string, string>> => {
  if (userIds.length === 0) return {};
  
  const map: Record<string, string> = {};
  const uniqueIds = [...new Set(userIds)];
  
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/users/ids`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ ids: uniqueIds }) 
    });

    if (response.ok) {
      const data = await response.json();
      const users = Array.isArray(data) ? data : (data.users || []);
      
      if (Array.isArray(users)) {
        users.forEach((u: any) => {
          if (u.id && u.username) {
            map[u.id] = u.username;
          }
        });
      }
      return map; 
    }
  } catch (e) {
    console.error('[EcencyChat] Batch resolve error:', e);
  }

  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/users?page=0&per_page=100`, {
       method: 'GET',
       headers: getHeaders(token)
    });

    if (response.ok) {
       const data = await response.json();
       if (Array.isArray(data)) {
         data.forEach((u: any) => {
            if (uniqueIds.includes(u.id) && u.username) {
               map[u.id] = u.username;
            }
         });
       }
    }
  } catch (e) { /* ignore */ }

  return map;
};

/**
 * Fetches posts for a channel.
 */
export const fetchChannelPosts = async (channelId: string, token?: string): Promise<{ messages: Message[], users: Record<string, string> }> => {
  try {
    const ts = Date.now();
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts?page=0&per_page=60&t=${ts}`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
        return { messages: [], users: {} };
    }

    const data: any = await response.json();
    
    let messages: Message[] = [];
    const users: Record<string, string> = {};

    if (data) {
      const extractUser = (u: any) => {
        if (u && u.id && u.username) {
            users[u.id] = u.username;
        }
      };

      if (data.profiles) {
        Object.values(data.profiles).forEach(extractUser);
      }
      
      if (data.users) {
         if (Array.isArray(data.users)) {
             data.users.forEach(extractUser);
         } else if (typeof data.users === 'object') {
             Object.values(data.users).forEach(extractUser);
         }
      }

      if (data.order && data.posts) {
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
            if (override && !users[m.user_id]) {
                users[m.user_id] = override;
            }
        }
    });

    return { messages, users };
  } catch (e) {
    console.error('[EcencyChat] Error fetching posts:', e);
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
      body: JSON.stringify({
        message,
        channel_id: channelId
      })
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
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
      body: JSON.stringify({
        message
      })
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};

export const deleteMessage = async (channelId: string, postId: string, token?: string): Promise<boolean> => {
  try {
    const headers = getHeaders(token);
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts/${postId}`, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
      credentials: 'include',
      body: JSON.stringify({})
    });

    if (!response.ok) return false;
    return true;
  } catch (e) {
    return false;
  }
};

export const toggleReaction = async (channelId: string, postId: string, emoji: string, shouldAdd: boolean, token?: string): Promise<boolean> => {
  try {
    // Always use POST with 'add' param as requested by API specs
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts/${postId}/reactions`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        emoji,
        add: shouldAdd
      })
    });

    if (!response.ok) {
        const text = await response.text();
        console.warn(`Reaction toggle failed:`, text);
        return false;
    }

    return true;
  } catch (e) {
    console.error('[EcencyChat] Toggle Reaction error:', e);
    return false;
  }
};

export const getAvatarUrl = (username?: string) => {
  if (!username) return '';
  const clean = username.replace(/^@/, '').trim();
  if (clean.length > 20 && !clean.includes(' ')) return 'https://images.ecency.com/u/hive-1/avatar/small'; 
  return `https://images.ecency.com/u/${clean}/avatar/small`;
};
