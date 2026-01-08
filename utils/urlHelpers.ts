
import { FRONTENDS, GENERIC_HIVE_PATH_REGEX, USERNAME_REGEX } from '../constants';
import { FrontendId, CurrentTabState, ActionMode, FrontendConfig } from '../types';

// Regex to extract author and permlink from a Hive post URL (e.g., /@author/permlink)
export const AUTHOR_PERMLINK_REGEX = /\/@([a-z0-9.-]+)\/([a-z0-9-]+)/;

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

    // Extract username if present (e.g. /@alice/...)
    const userMatch = url.pathname.match(USERNAME_REGEX);
    const username = userMatch ? userMatch[1] : null;

    // Extract author and permlink if present (e.g. /@author/permlink)
    const postMatch = url.pathname.match(AUTHOR_PERMLINK_REGEX);
    const author = postMatch ? postMatch[1] : null;
    const permlink = postMatch ? postMatch[2] : null;
    
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

/**
 * Generates a new URL for the target frontend based on mode.
 */
export const getTargetUrl = (
  targetId: FrontendId | string,
  currentPath: string, // Not directly used for custom frontends, but kept for compatibility
  mode: ActionMode,
  username: string | null,
  author: string | null, // New parameter
  permlink: string | null, // New parameter
  allFrontends: FrontendConfig[] // New parameter to include custom frontends
): string => {
  const targetConfig = allFrontends.find((f) => f.id === targetId);
  
  if (!targetConfig) {
    return '#'; // Fallback for unknown frontend
  }

  let finalPath = '';
  let targetDomain = targetConfig.domain;

  if (targetConfig.isCustom && targetConfig.linkStructure) {
    targetDomain = targetConfig.customDomain || targetConfig.domain; // Use customDomain if available

    const templateArgs = { author, permlink, username };

    switch (mode) {
      case ActionMode.COMPOSE:
        finalPath = targetConfig.paths.compose; // Custom frontends might not have custom compose paths
        break;
      case ActionMode.WALLET:
        finalPath = resolveLinkTemplate(targetConfig.linkStructure.wallet, templateArgs);
        break;
      case ActionMode.SAME_PAGE:
        // Attempt to convert current path using custom link structure
        // This is a simplified approach; a more robust solution would involve
        // parsing the current path and matching it against *all* known link structures
        // to determine if it's a post, profile, etc., and then reconstructing.
        // For now, if we have author/permlink, assume it's a post.
        if (author && permlink && targetConfig.linkStructure.post) {
            finalPath = resolveLinkTemplate(targetConfig.linkStructure.post, templateArgs);
        } else if (username && targetConfig.linkStructure.profile) {
            finalPath = resolveLinkTemplate(targetConfig.linkStructure.profile, templateArgs);
        } else {
            // Fallback to original path if not a recognized post/profile structure
            finalPath = currentPath;
        }
        break;
      default:
        finalPath = currentPath;
        break;
    }
  } else {
    // Existing logic for predefined frontends
    if (mode === ActionMode.COMPOSE) {
      finalPath = targetConfig.paths.compose;
    } else if (mode === ActionMode.WALLET) {
      finalPath = targetConfig.paths.wallet(username || undefined);
    } else { // ActionMode.SAME_PAGE
      finalPath = currentPath;
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
