import { FRONTENDS, GENERIC_HIVE_PATH_REGEX, USERNAME_REGEX } from '../constants';
import { FrontendId, CurrentTabState, ActionMode } from '../types';

/**
 * Parses a URL string to determine if it belongs to a known Hive frontend
 * and extracts the relevant path and username.
 */
export const parseUrl = (urlString: string): CurrentTabState => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace('www.', '');

    const detectedFrontend = FRONTENDS.find(
      (f) => f.domain === hostname || f.aliases.includes(hostname)
    );

    const matchesHivePath = GENERIC_HIVE_PATH_REGEX.test(url.pathname);
    
    // Extract username if present (e.g. /@alice/...)
    const userMatch = url.pathname.match(USERNAME_REGEX);
    const username = userMatch ? userMatch[1] : null;
    
    return {
      url: urlString,
      isHiveUrl: !!detectedFrontend,
      detectedFrontendId: detectedFrontend ? detectedFrontend.id : null,
      path: url.pathname + url.search + url.hash,
      username
    };
  } catch (e) {
    return {
      url: urlString,
      isHiveUrl: false,
      detectedFrontendId: null,
      path: '',
      username: null
    };
  }
};

/**
 * Generates a new URL for the target frontend based on mode.
 */
export const getTargetUrl = (
  targetId: FrontendId, 
  currentPath: string, 
  mode: ActionMode,
  username: string | null
): string => {
  const targetConfig = FRONTENDS.find((f) => f.id === targetId);
  
  if (!targetConfig) {
    return '#';
  }

  let finalPath = currentPath;

  if (mode === ActionMode.COMPOSE) {
    finalPath = targetConfig.paths.compose;
  } else if (mode === ActionMode.WALLET) {
    // If we detected a username in the current URL, use it.
    // Otherwise, generate a generic wallet link (which usually prompts login or goes to own wallet)
    finalPath = targetConfig.paths.wallet(username || undefined);
  }

  // Ensure no double slashes if path starts with /
  if (finalPath.startsWith('/') && targetConfig.domain.endsWith('/')) {
    finalPath = finalPath.substring(1);
  }

  return `https://${targetConfig.domain}${finalPath}`;
};