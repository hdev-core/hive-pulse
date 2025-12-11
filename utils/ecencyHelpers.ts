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
 * We manually attach the token as Bearer because extension fetch requests 
 * often fail to send SameSite=Lax cookies to cross-origin domains.
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
 * Uses robust search across domain and subdomains.
 */
const getMmPatCookie = async (): Promise<string | null> => {
  if (typeof chrome === 'undefined' || !chrome.cookies) return null;

  try {
    // 1. Try exact URL match
    const cookie = await chrome.cookies.get({ url: 'https://ecency.com', name: 'mm_pat' });
    if (cookie) return cookie.value;

    // 2. Try domain wide search (handles .ecency.com)
    // We iterate to find one that isn't empty
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

    // Increased delay to ensure Set-Cookie is processed by the browser
    await new Promise(resolve => setTimeout(resolve, 800));

    // Success! The server has set the 'mm_pat' cookie.
    // Now we extract it so we can use it in headers for future requests.
    const cookieToken = await getMmPatCookie();
    if (cookieToken) {
      console.log('[EcencyChat] Successfully retrieved auth cookie');
      return cookieToken;
    } else {
      console.warn('[EcencyChat] Bootstrap OK but cookie not found in jar.');
    }

    // Fallback: Check if body has it
    try {
        const data = await response.json();
        const token = data.token || data.access_token || data.sid || data.mm_token;
        if (token) return token;
        
        // If we really can't find the token, but API said OK, we return 'cookie-session'
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
    console.log('[EcencyChat] Fetching channels...');
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
    
    // Check for different response structures
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.channels)) return data.channels;
    
    // If we got an empty object or null, return empty array
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
      console.warn(`[EcencyChat] DM creation failed (${response.status}):`, errText);
      
      let errMsg = `Error ${response.status}: Failed to create chat.`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) errMsg = errJson.message;
        else if (errJson.error) errMsg = errJson.error;
      } catch (e) {
        if (response.status === 404) errMsg = 'User not found.';
        if (response.status === 401) errMsg = 'Session expired.';
      }
      return { id: null, error: errMsg };
    }

    const rawData = await response.text();
    let data;
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      console.error('[EcencyChat] Failed to parse DM response JSON', rawData);
      // If we got a 200 OK but invalid JSON, we might assume success but can't get ID
      return { id: null, success: true };
    }

    // Handle various response shapes
    const channel = Array.isArray(data) ? data[0] : data;
    const id = channel?.id || channel?.channel_id || null;

    if (!id) {
       console.warn('[EcencyChat] DM created but ID missing in response:', data);
       // Return success: true so the App knows to just refresh the list to find it
       return { id: null, success: true }; 
    }

    return { id, success: true };
  } catch (e: any) {
    console.error('[EcencyChat] Error creating DM:', e);
    return { id: null, error: e.message || 'Network error' };
  }
};

/**
 * Fetches posts for a channel.
 */
export const fetchChannelPosts = async (channelId: string, token?: string): Promise<Message[]> => {
  try {
    // page=0&per_page=60 is standard Mattermost pagination
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/${channelId}/posts?page=0&per_page=60`, {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn(`[EcencyChat] Failed to fetch posts: ${response.status}`);
      return [];
    }

    const data: PostResponse = await response.json();
    
    if (!data || !data.order || !data.posts) return [];

    // Map order array to actual message objects
    return data.order.map(id => data.posts[id]);
  } catch (e) {
    console.error('[EcencyChat] Error fetching posts:', e);
    return [];
  }
};

/**
 * Sends a message to a channel.
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

    if (!response.ok) {
      const txt = await response.text();
      console.warn(`[EcencyChat] Failed to send message: ${response.status}`, txt);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('[EcencyChat] Error sending message:', e);
    return null;
  }
};

export const getAvatarUrl = (username?: string) => {
  return username ? `https://images.ecency.com/u/${username}/avatar/small` : '';
};
