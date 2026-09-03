
import { FRONTENDS, GENERIC_HIVE_PATH_REGEX, USERNAME_REGEX } from '../constants';
import { FrontendId, CurrentTabState, ActionMode, FrontendConfig } from '../types';

// Regex to extract author and permlink from a Hive post URL (e.g., /@author/permlink)
export const AUTHOR_PERMLINK_REGEX = /\/@([a-z0-9.-]+)\/([a-z0-9-]+)/;

/**
 * The condenser post shape. A frontend whose linkStructure.post matches this is a mirror
 * of the standard layout, so an arbitrary source path (/trending, /proposals, /witnesses)
 * is just as valid there — unlike SlothBuzz, which serves /post/<author>/<permlink> and
 * shares none of the other routes.
 */
export const STANDARD_POST_PATH = '/@{{author}}/{{permlink}}';

/** Hive consensus grammar. Used to reject anything a permissive template capture let through. */
export const HIVE_ACCOUNT_RE  = /^[a-z][a-z0-9.-]{2,15}$/;
export const HIVE_PERMLINK_RE = /^[a-z0-9][a-z0-9-]{0,255}$/;

/**
 * Longest path a template matcher will look at. parseUrl runs on every tab update in the
 * service worker and the path is attacker-supplied; adjacent placeholders in a user-typed
 * template backtrack polynomially, so a single long segment could stall the worker for
 * seconds. No real Hive URL is anywhere near this.
 */
const MAX_TEMPLATE_PATH = 512;

/** A frontend with no linkStructure is a plain condenser; otherwise judge its post shape. */
export const frontendIsStandard = (f?: FrontendConfig | null): boolean =>
  !f?.linkStructure || usesStandardPostPath(f.linkStructure.post);

/** True when a frontend uses the standard condenser post shape, ignoring cosmetic drift. */
export const usesStandardPostPath = (tpl?: string): boolean =>
  !!tpl && tpl.trim().replace(/\/$/, '').replace(/\{\{\s*(\w+)\s*\}\}/g, '{{$1}}')
    === STANDARD_POST_PATH.replace(/\/$/, '');
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

    // Only read identities off a frontend we actually recognise. USERNAME_REGEX matches
    // "/@name" on ANY site, so an unguarded parse turned medium.com/@dan/some-post into
    // peakd.com/@dan/some-post — and where the foreign handle happens to be a real Hive
    // account, that is someone else's profile.
    if (!detectedFrontend) {
      return {
        url: urlString, isHiveUrl: false, detectedFrontendId: null,
        path: url.pathname + url.search + url.hash,
        username: null, author: null, permlink: null,
      };
    }

    // A frontend may declare its own post shape. SlothBuzz serves /post/<author>/<permlink>,
    // so without this the outbound fix has no inbound half: you could reach a SlothBuzz post
    // but switching away from it carried the raw path to peakd.com/post/...
    // Both post and profile: getTargetUrl already resolves linkStructure.profile outbound,
    // so reading only .post made custom frontends one-way — a /user/{{username}} profile
    // could be linked to but never parsed from.
    let matchedTemplate = false;
    const templatable = url.pathname.length <= MAX_TEMPLATE_PATH;
    for (const tpl of [detectedFrontend.linkStructure?.post, detectedFrontend.linkStructure?.profile]) {
      if (!tpl || matchedTemplate || !templatable) continue;
      const parts = tpl.split(/(\{\{author\}\}|\{\{permlink\}\}|\{\{username\}\})/);
      const order: string[] = [];
      let src = '^';
      for (const p of parts) {
        // [^/] keeps a capture inside one path segment. It does NOT make the match linear:
        // adjacent placeholders still backtrack polynomially on a long single segment
        // (measured seconds at 1600 chars), which is why the length cap above exists.
        if (p === '{{author}}')        { src += '([^/]+)'; order.push('author'); }
        else if (p === '{{permlink}}') { src += '([^/]+)'; order.push('permlink'); }
        else if (p === '{{username}}') { src += '([^/]+)'; order.push('username'); }
        else if (p)                    { src += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
      }
      const m = url.pathname.match(new RegExp(src + '/?$'));
      if (!m) continue;

      // Validate every capture against the real Hive grammar before trusting it. [^/]+ will
      // happily take a percent-encoded slash, so "@a%2Fb" parsed as the author "a%2fb" and
      // was then pasted onto another frontend's path. Lowercasing is safe here because Hive
      // names and permlinks are lowercase-canonical, so mixed case is a typo to normalise.
      const vals = order.map((_, i) => (m[i + 1] || '').toLowerCase());
      const ok = order.every((k, i) =>
        k === 'permlink' ? HIVE_PERMLINK_RE.test(vals[i]) : HIVE_ACCOUNT_RE.test(vals[i]));
      if (!ok) continue;

      matchedTemplate = true;
      order.forEach((k, i) => {
        if (k === 'author') author = vals[i];
        else if (k === 'permlink') permlink = vals[i];
        else username = vals[i];
      });
    }

    // Skip the generic parse only when a template actually matched — gating on
    // "author && permlink" instead discarded whatever a partial template had captured.
    //
    // `username` is deliberately NOT defaulted to `author` here. Doing that made Wallet mode
    // open the POST AUTHOR's wallet while you were reading their post. The profile branch in
    // getTargetUrl falls back to the author on its own where that is the right answer.
    if (matchedTemplate) {
      // nothing further: the template is authoritative for what it captured
    } else if (hostname === '3speak.tv') {
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
      // A recognised frontend is now the whole test: identities are only parsed above when
      // one matched, so the old "or a username was found" clause could only ever be true
      // for a non-Hive site that happens to use /@handle URLs.
      isHiveUrl: true,
      detectedFrontendId: detectedFrontend.id,
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
  // Only usable when the template needs no username, or we have one. resolveLinkTemplate
  // substitutes nothing for a falsy arg, so using it blindly shipped a literal
  // "/@{{username}}/wallet" to the address bar from any page with no user in it.
  // Resolve, then reject anything that still holds a placeholder. Testing for the literal
  // "{{username}}" was not enough: templates are free text, so "{{ username }}", "{{USERNAME}}"
  // and "/@{{author}}/wallet" all shipped a raw placeholder to the address bar.
  const tpl = config.linkStructure?.wallet;
  if (tpl) {
    const resolved = resolveLinkTemplate(tpl, { username });
    if (!/\{\{\s*\w+\s*\}\}/.test(resolved)) return resolved;
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
  sourceIsHive: boolean = true,
  /** Whether the SOURCE frontend also uses the standard condenser post shape. */
  sourceIsStandard: boolean = true
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
        // walletPath, not a bare resolveLinkTemplate: it tolerates a config whose
        // linkStructure has no wallet key (older stored custom frontends) instead of
        // throwing on undefined, and it substitutes nothing for a null username rather
        // than shipping a literal "{{username}}" in the URL.
        finalPath = walletPath(targetConfig, username);
        break;
      case ActionMode.SAME_PAGE:
        if (author && permlink && targetConfig.linkStructure.post) {
            finalPath = resolveLinkTemplate(targetConfig.linkStructure.post, templateArgs);
        } else if (username && targetConfig.linkStructure.profile) {
            finalPath = resolveLinkTemplate(targetConfig.linkStructure.profile, templateArgs);
        } else {
            // Carrying the source path is only meaningless where the target's scheme
            // actually differs: peakd.com/trending/x -> slothbuzz.com/trending/x is a 404.
            // But the Add-Frontend form pre-fills the STANDARD condenser shape, so most
            // custom frontends are mirrors where /trending, /proposals and /witnesses all
            // work. Blanket '/' threw those destinations away, and with autoRedirect on it
            // bounced every such page to the frontend root.
            // Both ends must use the standard shape. Checking only the target meant a
            // non-standard SOURCE path rode along: slothbuzz.com/dashboard became
            // mirror.example/dashboard, a 404 where the old code sent people home.
            finalPath = usesStandardPostPath(targetConfig.linkStructure.post) && sourceIsHive && sourceIsStandard
              ? currentPath
              : '/';
        }
        break;
      default:
        finalPath = '/';
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
