
import { FRONTENDS, GENERIC_HIVE_PATH_REGEX, USERNAME_REGEX } from '../constants';
import { FrontendId, CurrentTabState, ActionMode, FrontendConfig } from '../types';

// Regex to extract author and permlink from a Hive post URL (e.g., /@author/permlink)
export const AUTHOR_PERMLINK_REGEX = /\/@([a-z0-9.-]+)\/([a-z0-9-]+)/;
export const THREESPEAK_WATCH_REGEX = /v=([a-z0-9.-]+)\/([a-z0-9-]+)/;
export const THREESPEAK_USER_REGEX = /\/user\/([a-z0-9.-]+)/;

/**
 * Parses a URL string to determine if it belongs to a known Hive frontend
 * and extracts the relevant path, username, author, and permlink.
 */
export const parseUrl = (urlString: string, allFrontends: FrontendConfig[]): CurrentTabState => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.replace('www.', '');

    // Use allFrontends to find the detectedFrontend
    const detectedFrontend = allFrontends.find(
      (f) => f.domain === hostname || f.aliases.includes(hostname) || (f.isCustom && f.customDomain === hostname)
    );

    let username: string | null = null;
    let author: string | null = null;
    let permlink: string | null = null;

    if (hostname === '3speak.tv') {
      const searchParams = new URLSearchParams(url.search);
      const v = searchParams.get('v');
      if (v) {
        // v format is usually 'author/permlink'
        const parts = v.split('/');
        if (parts.length >= 2) {
          author = parts[0];
          permlink = parts[1];
        }
      }
      
      if (!author || !permlink) {
        const userMatch = url.pathname.match(THREESPEAK_USER_REGEX);
        username = userMatch ? userMatch[1] : null;
      }
    } else {
      // Extract username if present (e.g. /@alice/...)
      const userMatch = url.pathname.match(USERNAME_REGEX);
      username = userMatch ? userMatch[1] : null;

      // Extract author and permlink if present (e.g. /@author/permlink)
      const postMatch = url.pathname.match(AUTHOR_PERMLINK_REGEX);
      author = postMatch ? postMatch[1] : null;
      permlink = postMatch ? postMatch[2] : null;

      // Actifit uniquely serves @-less URLs (actifit.io/username and
      // actifit.io/author/permlink). Every other frontend needs the @, so recover the
      // bare name here; getTargetUrl always re-adds the @ when it builds the target URL.
      if (!username && !author && hostname === 'actifit.io') {
        const RESERVED = /^(blog|videos|leaderboard|rewards|about|faq|contact|privacy|terms|settings|notifications|wallet|communities|community|trending|hot|new|created|payout|tags|search|login|signup|logout|api|home|feed|explore|activity|rankings|posts|c|new)$/;
        const m = url.pathname.match(/^\/([a-z][a-z0-9.-]{2,15})(?:\/([a-z0-9][a-z0-9-]{2,})\/?)?$/);
        if (m && !RESERVED.test(m[1])) {
          if (m[2]) { author = m[1]; permlink = m[2]; }
          else { username = m[1]; }
        }
      }
    }
    
    return {
      url: urlString,
      isHiveUrl: !!detectedFrontend || (!!username || (!!author && !!permlink)), // Consider it a Hive URL if a user or post is detected
      detectedFrontendId: detectedFrontend ? detectedFrontend.id : null,
      path: url.pathname + url.search + url.hash,
      username,
      author,
      permlink,
    };
  } catch (e) {
    return {
      url: urlString,
      isHiveUrl: false,
      detectedFrontendId: null,
      path: '',
      username: null,
      author: null,
      permlink: null,
    };
  }
};

interface LinkTemplateArgs {
  author?: string | null;
  permlink?: string | null;
  username?: string | null;
}

/**
 * Resolves placeholders in a link template string.
 */
const resolveLinkTemplate = (template: string, args: LinkTemplateArgs): string => {
  let resolved = template;
  if (args.author) resolved = resolved.replace(/{{author}}/g, args.author);
  if (args.permlink) resolved = resolved.replace(/{{permlink}}/g, args.permlink);
  if (args.username) resolved = resolved.replace(/{{username}}/g, args.username);
  return resolved;
};

// paths.wallet is a function, so it does not survive a round-trip through storage.local.
// A config rehydrated from storage (any custom frontend, and older Chrome-persisted
// entries) will have lost it — fall back to the standard Hive wallet path rather than
// calling undefined.
const walletPath = (config: FrontendConfig, username: string | null): string => {
  if (typeof config.paths?.wallet === 'function') {
    return config.paths.wallet(username || undefined);
  }
  if (config.linkStructure?.wallet) {
    return resolveLinkTemplate(config.linkStructure.wallet, { username });
  }
  return username ? `/@${username}/wallet` : '/wallet';
};

/**
 * Generates a new URL for the target frontend based on mode.
 */
export const getTargetUrl = (
  targetId: FrontendId | string,
  currentPath: string, // Fallback if no specific entity detected
  mode: ActionMode,
  username: string | null,
  author: string | null,
  permlink: string | null,
  allFrontends: FrontendConfig[],
  /**
   * Whether `currentPath` came from a Hive page and is therefore safe to carry across to
   * another frontend. When it did not, carrying it produces nonsense: switching frontends
   * from our own Chrome Web Store listing sent people to
   * peakd.com/detail/hivepulse/<extension-id>, because that store path was pasted onto
   * peakd's domain. Defaults true so callers that build their own Hive path — the Pulse
   * feed does — keep working unchanged.
   */
  sourceIsHive: boolean = true
): string => {
  const targetConfig = allFrontends.find((f) => f.id === targetId);
  
  if (!targetConfig) {
    return '#'; // Fallback for unknown frontend
  }

  let finalPath = '';
  let targetDomain = targetConfig.domain;

  if (targetConfig.id === FrontendId.THREESPEAK) {
    if (mode === ActionMode.COMPOSE) {
      finalPath = targetConfig.paths.compose;
    } else if (mode === ActionMode.WALLET) {
      finalPath = walletPath(targetConfig, username);
    } else { // SAME_PAGE
      if (author && permlink) {
        finalPath = `/watch?v=${author}/${permlink}`;
      } else if (username) {
        finalPath = `/user/${username}`;
      } else {
        finalPath = '/';
      }
    }
  } else if (targetConfig.linkStructure) {
    // Any frontend may declare a linkStructure, not just custom ones. SlothBuzz needs it
    // because its post URLs are /post/<author>/<permlink>; the standard branch below
    // hardcodes /@author/permlink and would 404 there.
    targetDomain = targetConfig.customDomain || targetConfig.domain;

    const templateArgs = { author, permlink, username };

    switch (mode) {
      case ActionMode.COMPOSE:
        finalPath = targetConfig.paths.compose;
        break;
      case ActionMode.WALLET:
        finalPath = resolveLinkTemplate(targetConfig.linkStructure.wallet, templateArgs);
        break;
      case ActionMode.SAME_PAGE:
        if (author && permlink && targetConfig.linkStructure.post) {
            finalPath = resolveLinkTemplate(targetConfig.linkStructure.post, templateArgs);
        } else if (username && targetConfig.linkStructure.profile) {
            finalPath = resolveLinkTemplate(targetConfig.linkStructure.profile, templateArgs);
        } else {
            finalPath = sourceIsHive ? currentPath : '/';
        }
        break;
      default:
        finalPath = sourceIsHive ? currentPath : '/';
        break;
    }
  } else {
    // Logic for standard predefined frontends (PeakD, Ecency, etc.)
    if (mode === ActionMode.COMPOSE) {
      finalPath = targetConfig.paths.compose;
    } else if (mode === ActionMode.WALLET) {
      finalPath = walletPath(targetConfig, username);
    } else { // SAME_PAGE
      // If we have author and permlink, reconstruct the traditional path
      // This handles cases where we are coming FROM a non-standard URL (like 3speak)
      if (author && permlink) {
        finalPath = `/@${author}/${permlink}`;
      } else if (username) {
        finalPath = `/@${username}`;
      } else {
        // No post and no profile to carry over. If the source was not a Hive page there is
        // nothing meaningful to preserve, so send them to the frontend's home page rather
        // than to an invented URL.
        finalPath = sourceIsHive ? currentPath : '/';
      }
    }

    // Special handling for Hive.blog's dedicated wallet subdomain
    if (targetConfig.id === FrontendId.HIVEBLOG) {
      const isWalletAction = mode === ActionMode.WALLET;
      const isWalletPath = /\/@[\w.-]+\/(transfers|permissions|password|wallet)/.test(finalPath);
      
      if (isWalletAction || isWalletPath) {
        return `https://wallet.hive.blog${finalPath}`;
      }
    }
  }

  // Ensure no double slashes if path starts with /
  if (finalPath.startsWith('/') && targetDomain.endsWith('/')) {
    finalPath = finalPath.substring(1);
  } else if (!finalPath.startsWith('/') && !targetDomain.endsWith('/')) {
    finalPath = `/${finalPath}`; // Add leading slash if missing for a clean URL
  }


  return `https://${targetDomain}${finalPath}`;
};
