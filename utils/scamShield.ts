import { SCAM_ACCOUNTS, WATCHLIST_ACCOUNTS } from './scamLists';

// Hive Scam Shield.
//
// The extension is the only thing sitting between the user and the signature, so this is
// the last place a transfer to a known drainer can be stopped. Three checks, two severities:
//
//   1. Known scam account  -> BLOCKED. On the phishing/fund-theft tier (condenser + denser +
//      ecency + mahdiyari, via watchmen). Sending here loses funds.
//   2. Watchlisted account  -> WARN. On the HiveWatchers abuse/farming/arbitrage tier. NOT
//      necessarily a scam that steals a transfer, but flagged — worth a heads-up, not a block.
//   3. Impersonation        -> WARN. A near-miss of an account the user actually trusts
//      (their own, or someone they have paid). How Hive users get drained: `actifit` vs
//      `actlfit`. Only ever compared against the user's OWN trusted set (see the note below).
//
// Pure and dependency-free on purpose: the popup imports it directly, and the background
// re-exports its verdict to the content script over sendMessage (content.ts is a classic
// script and cannot import shared modules).

export type RiskLevel = 'ok' | 'warn' | 'blocked';
export type RiskKind = 'none' | 'scam' | 'watchlist' | 'impersonation';

export interface RiskAssessment {
  level: RiskLevel;
  kind: RiskKind;
  recipient: string;
  reason: string;
  /** For impersonation warnings: the trusted account this one is masquerading as. */
  similarTo?: string;
}

export const normalizeAccount = (u: string): string =>
  (u || '').replace(/^@/, '').trim().toLowerCase();

const SCAM_SET: Set<string> = new Set(SCAM_ACCOUNTS.map(normalizeAccount));
const WATCHLIST_SET: Set<string> = new Set(WATCHLIST_ACCOUNTS.map(normalizeAccount));

/** Phishing / fund-theft tier — the hard-block list. */
export const isKnownBadActor = (username: string): boolean =>
  SCAM_SET.has(normalizeAccount(username));

/** HiveWatchers abuse/farming tier — soft-warn only. */
export const isWatchlisted = (username: string): boolean =>
  WATCHLIST_SET.has(normalizeAccount(username));

// Characters routinely swapped to build a lookalike name. Collapsing them (and the
// separators Hive account names allow) turns `b1ocktrades` and `block-trades` into the
// same skeleton as `blocktrades`, which is what makes the impersonation check bite.
const CONFUSABLES: Record<string, string> = {
  '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
};

const skeleton = (username: string): string =>
  normalizeAccount(username)
    .split('')
    .map(c => CONFUSABLES[c] ?? c)
    .join('')
    .replace(/[.\-_]/g, '');

/** Levenshtein distance, bailed out early once it exceeds `max`. */
const editDistance = (a: string, b: string, max = 2): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
};

/**
 * Assess a single recipient.
 *
 * `trusted` is the caller's set of accounts the user demonstrably trusts — their own
 * account(s) and anyone they have already transacted with. An exact match against one of
 * those is never suspicious; a *near* match is the entire point of the check.
 */
// NOTE: do not "improve" this by fuzzy- or skeleton-matching the recipient against the bad
// actor list. It was tried and it is unsafe. Every name on that list is a near-miss of a
// REAL account by construction, and legitimate Hive accounts contain the same digits and
// separators the disguises use, so any normalisation that catches a disguise also collapses
// the genuine article onto it. Measured against the real 906-entry list:
//   - stripping separators made the legitimate `blocktrades` match the listed `block-trades`
//     (260 such collisions);
//   - folding confusable digits made `deepcrypto8` — Binance's real deposit account — match
//     the listed `deepcrypt08` (49 such collisions).
// Blocking Binance and BlockTrades would train users to click straight through the warning,
// which is worse than not warning at all. Exact matching against the full list stays.

export const assessRecipient = (recipient: string, trusted: string[] = []): RiskAssessment => {
  const to = normalizeAccount(recipient);
  if (!to) return { level: 'ok', kind: 'none', recipient: to, reason: '' };

  // Tier 1 — phishing / fund-theft. Checked against every scam account, always, never gated
  // on prior interaction. Hard block.
  if (isKnownBadActor(to)) {
    return {
      level: 'blocked',
      kind: 'scam',
      recipient: to,
      reason: 'This account is on the known Hive scam/phishing list. Funds sent here are not recoverable.',
    };
  }

  // A near-miss of an account this user actually trusts. Checked before the watchlist so an
  // impersonation of someone you pay is called out specifically. Safe in this direction: an
  // exact match against a trusted account short-circuits to `ok`, so a legitimate counterparty
  // can never be flagged as a lookalike of itself.
  const trustedNames = trusted.map(normalizeAccount).filter(Boolean);
  if (trustedNames.includes(to)) {
    return { level: 'ok', kind: 'none', recipient: to, reason: '' };
  }
  const toSkeleton = skeleton(to);
  for (const known of trustedNames) {
    const isLookalike = skeleton(known) === toSkeleton || editDistance(to, known, 1) === 1;
    if (isLookalike) {
      return {
        level: 'warn',
        kind: 'impersonation',
        recipient: to,
        similarTo: known,
        reason: `"${to}" looks almost identical to "${known}", an account you trust. Impersonation is the most common way Hive funds are stolen — check every character.`,
      };
    }
  }

  // Tier 2 — HiveWatchers abuse / farming / arbitrage flag. Not necessarily a scam that steals
  // a transfer, so a soft warning rather than a block: the user may well have a legitimate
  // reason to send here.
  if (isWatchlisted(to)) {
    return {
      level: 'warn',
      kind: 'watchlist',
      recipient: to,
      reason: `This account is flagged on a Hive community watchlist (HiveWatchers) for abuse or scam-related activity. It is not confirmed to steal transfers, but verify who you are sending to before continuing.`,
    };
  }

  return { level: 'ok', kind: 'none', recipient: to, reason: '' };
};

/** Short toast line shown when a flagged send is attempted without acknowledgement. */
export const riskToastMessage = (risk: RiskAssessment): string => {
  switch (risk.kind) {
    case 'scam':
      return `Blocked: @${risk.recipient} is a known scam account. Tick the box above if you are certain.`;
    case 'impersonation':
      return `Hold on — @${risk.recipient} may be impersonating @${risk.similarTo}. Tick the box above to proceed.`;
    case 'watchlist':
      return `@${risk.recipient} is flagged on a Hive watchlist. Tick the box above to proceed.`;
    default:
      return '';
  }
};

/**
 * Pull every account that would RECEIVE something from a Keychain operation array.
 * Self-sends (powering up, saving, staking to yourself) are not recipients.
 */
export const extractRecipients = (from: string, operations: any[]): string[] => {
  const self = normalizeAccount(from);
  const out: string[] = [];

  const add = (v: unknown) => {
    const n = normalizeAccount(typeof v === 'string' ? v : '');
    if (n && n !== self && !out.includes(n)) out.push(n);
  };

  for (const op of operations || []) {
    if (!Array.isArray(op) || op.length < 2) continue;
    const [name, payload] = op as [string, any];
    if (!payload || typeof payload !== 'object') continue;

    switch (name) {
      case 'transfer':
      case 'transfer_to_savings':
      case 'transfer_from_savings':
      case 'transfer_to_vesting':
      case 'recurrent_transfer':
        add(payload.to);
        break;
      case 'delegate_vesting_shares':
        add(payload.delegatee);
        break;
      case 'custom_json': {
        // Hive-Engine token ops carry the recipient inside a JSON string payload.
        try {
          const parsed = JSON.parse(payload.json || '{}');
          add(parsed?.contractPayload?.to);
        } catch {
          /* not a shape we understand — nothing to guard */
        }
        break;
      }
      default:
        break;
    }
  }

  return out;
};

/** Assess every recipient in an operation array. Returns only non-`ok` findings. */
export const assessOperations = (
  from: string,
  operations: any[],
  trusted: string[] = []
): RiskAssessment[] =>
  extractRecipients(from, operations)
    .map(to => assessRecipient(to, trusted))
    .filter(a => a.level !== 'ok');
