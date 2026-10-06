#!/usr/bin/env node
/**
 * Collect contest entries and referral declarations from an announcement post's comments.
 *
 *   node scripts/collect-entries.mjs <author> <permlink>
 *
 * Written after week 10, where the ad-hoc version of this made two mistakes that both
 * reached the published results:
 *
 *   1. It treated any `@author/permlink` in a comment as a submission. App footers carry
 *      exactly that shape — "Posted via hivesuite.app/@nabbas0786/rynwny7x" — so a
 *      thank-you REPLY was scored as a failing entry and the results post told readers a
 *      participant had entered twice. A link is only an entry if it resolves to a root
 *      post, i.e. parent_author is empty. That is checked here.
 *
 *   2. It matched the referral declaration on the exact string "referred by". An entrant
 *      wrote "Referrad by @ahmedabbaci" and was silently skipped, costing two people
 *      25 HIVE each until someone noticed by eye. Spelling is not the point of the rule;
 *      finding the declaration is. The pattern below is deliberately forgiving.
 */

const RPC = 'https://api.hive.blog';
const rpc = async (method, params) => {
  const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }) });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
};

// referred / refered / referrad / reffered …, with or without the @
const REFERRAL = /\bre+f+e+r+[ae]?d\s+by\s*@?([a-z0-9][a-z0-9.\-]{1,15})\b/i;
const LINK = /@([a-z0-9][a-z0-9.\-]{1,15})\/([a-z0-9-]{6,})/gi;

const [author, permlink] = process.argv.slice(2);
if (!author || !permlink) {
  console.error('usage: node scripts/collect-entries.mjs <announcement-author> <announcement-permlink>');
  process.exit(1);
}

const thread = await rpc('bridge.get_discussion', { author, permlink, observer: '' });
const root = `${author}/${permlink}`;
const entries = new Map();   // author -> Set(permlink)
const referrals = [];
const skipped = [];

for (const [key, c] of Object.entries(thread)) {
  if (key === root || c.author === author || /bot$/i.test(c.author)) continue;

  const ref = REFERRAL.exec(c.body || '');
  // "don't type referred by me next time" is advice, not a declaration.
  if (ref && !/^me$/i.test(ref[1])) referrals.push({ by: c.author, referrer: ref[1].toLowerCase(), when: c.created });

  for (const m of (c.body || '').matchAll(LINK)) {
    const a = m[1].toLowerCase(), p = m[2].toLowerCase();
    if (`${a}/${p}` === root) continue;
    const post = await rpc('condenser_api.get_content', [a, p]);
    if (!post || !post.author) { skipped.push([`@${a}/${p}`, 'does not exist']); continue; }
    if (post.parent_author) { skipped.push([`@${a}/${p}`, `reply to @${post.parent_author} — not a post`]); continue; }
    if (a !== c.author) { skipped.push([`@${a}/${p}`, `authored by @${a}, linked by @${c.author}`]); continue; }
    let tags = [];
    try { tags = JSON.parse(post.json_metadata || '{}').tags || []; } catch {}
    if (!entries.has(a)) entries.set(a, new Set());
    entries.get(a).add(p);
    if (!tags.includes('hivepulse')) skipped.push([`@${a}/${p}`, 'NO #hivepulse tag — entry will not rank']);
  }
}

console.log(`# entries from comments on @${root}\n`);
for (const [a, perms] of [...entries].sort()) for (const p of perms) console.log(`@${a}/${p}`);

console.log(`\n# ${entries.size} entrant(s), ${[...entries.values()].reduce((n, s) => n + s.size, 0)} post(s)`);
if (referrals.length) {
  console.log('#\n# REFERRALS DECLARED:');
  for (const r of referrals) console.log(`#   @${r.by} referred by @${r.referrer}  (${r.when.slice(0, 16)})`);
} else {
  console.log('#\n# No referrals declared.');
}
if (skipped.length) {
  console.log('#\n# NOT COUNTED (check these by eye):');
  for (const [what, why] of skipped) console.log(`#   ${what} — ${why}`);
}
