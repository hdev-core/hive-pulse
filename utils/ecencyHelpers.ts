
import { Channel } from '../types';

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
 * Bootstraps the Ecency Chat session.
 * Exchanges Hive/Ecency tokens for a Mattermost PAT cookie (httpOnly).
 */
export const bootstrapEcencyChat = async (username: string, accessToken: string, refreshToken?: string): Promise<boolean> => {
  try {
    const cleanUsername = username.replace(/^@/, '');
    
    const body: any = {
      username: cleanUsername,
      accessToken
    };

    // Only include refreshToken if it exists (not used in self-minted flow)
    if (refreshToken) {
      body.refreshToken = refreshToken;
    }

    const response = await fetch(`${ECENCY_CHAT_BASE}/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Important: Allows setting the httpOnly cookie
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.warn(`[EcencyChat] Bootstrap failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    return !!(data && data.ok);

  } catch (e) {
    console.error('[EcencyChat] Bootstrap error:', e);
    return false;
  }
};

/**
 * Fetches the total unread message count for a user.
 */
export const fetchUnreadChatCount = async (): Promise<number | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels/unreads`, {
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) return null;

    const data: UnreadResponse[] | UnreadResponse = await response.json();
    
    let total = 0;
    if (Array.isArray(data)) {
      total = data.reduce((sum, item) => sum + (item.msg_count || 0), 0);
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
 * Fetches the list of channels for the current user.
 */
export const fetchChannels = async (): Promise<Channel[] | null> => {
  try {
    const response = await fetch(`${ECENCY_CHAT_BASE}/channels`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn(`[EcencyChat] Failed to fetch channels: ${response.status}`);
      return null;
    }

    const channels: Channel[] = await response.json();
    return channels;
  } catch (e) {
    console.error('[EcencyChat] Error fetching channels:', e);
    return null;
  }
};

/**
 * Gets or Creates a Direct Message channel with a specific user.
 * Returns the channel ID.
 */
export const getOrCreateDirectChannel = async (username: string): Promise<string | null> => {
  try {
    const cleanUser = username.replace(/^@/, '');
    const response = await fetch(`${ECENCY_CHAT_BASE}/direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: cleanUser })
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`[EcencyChat] Failed to create DM: ${err}`);
      return null;
    }

    const data = await response.json();
    // API returns { id: "channel_id", ... }
    return data?.id || null;
  } catch (e) {
    console.error('[EcencyChat] Error creating DM:', e);
    return null;
  }
};

export const getAvatarUrl = (username?: string) => {
  return username ? `https://images.ecency.com/u/${username}/avatar/small` : '';
};
