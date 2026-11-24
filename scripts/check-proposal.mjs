#!/usr/bin/env node
/**
 * Where does the Hdev DHF proposal stand against the return proposal, right now?
 *
 *   node scripts/check-proposal.mjs [proposalId]
 *
 * Written because the contest posts quote this figure, and a proposal's standing moves
 * every day as stake votes and unvotes. Saying "it is below the line" after it has crossed
 * would be exactly the kind of stale claim we correct other people on.
 *
 * Votes are reported in vests. They are converted to HP here with the chain's own
 * total_vesting_fund_hive / total_vesting_shares ratio, because "71,788" in raw vest units
 * means nothing to a reader and 44.8M HP does.
 */

const RPC = 'https://api.hive.blog';
const PROPOSAL_ID = Number(process.argv[2] || 391);

const rpc = async (method, params) => {
  const r = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
};

const main = async () => {
  const g = await rpc('condenser_api.get_dynamic_global_properties', []);
  const fund = parseFloat(g.total_vesting_fund_hive);
  const shares = parseFloat(g.total_vesting_shares);
  const hp = v => Number(v) / 1e6 * fund / shares;
  const fmt = n => Math.round(n).toLocaleString('en-US');

  const { proposals } = await rpc('database_api.list_proposals', {
    start: [], limit: 100, order: 'by_total_votes',
    order_direction: 'descending', status: 'votable',
  });

  const ret = proposals.find(p => p.proposal_id === 0);
  const me = proposals.find(p => p.proposal_id === PROPOSAL_ID);
  if (!me) {
    console.error(`Proposal ${PROPOSAL_ID} is not in the votable list.`);
    process.exit(1);
  }

  const rank = proposals.findIndex(p => p.proposal_id === PROPOSAL_ID) + 1;
  const gap = Number(ret.total_votes) - Number(me.total_votes);
  const above = gap <= 0;
  const startsIn = (Date.parse(me.start_date + 'Z') - Date.now()) / 86400000;

  console.log(`\n  #${me.proposal_id}  ${me.subject}`);
  console.log(`  @${me.creator}/${me.permlink}  ->  @${me.receiver}`);
  console.log(`  ${me.daily_pay.amount / 1000} HBD/day   ${me.start_date.slice(0, 10)} -> ${me.end_date.slice(0, 10)}`);
  console.log(`  ${startsIn > 0 ? `starts in ${startsIn.toFixed(1)} days` : `started ${(-startsIn).toFixed(1)} days ago`}\n`);

  console.log(`  support          ${fmt(hp(me.total_votes)).padStart(12)} HP`);
  console.log(`  return proposal  ${fmt(hp(ret.total_votes)).padStart(12)} HP`);
  console.log(`  ${above ? 'margin ABOVE    ' : 'gap TO CROSS    '} ${fmt(Math.abs(hp(gap))).padStart(12)} HP` +
              `   (${(Math.abs(gap) / Number(ret.total_votes) * 100).toFixed(1)}%)`);
  console.log(`  rank             ${String(rank).padStart(12)} of ${proposals.length} votable\n`);

  // "Above the line" and "being paid" are DIFFERENT THINGS, and conflating them put a false
  // sentence into a draft post: it told entrants the DHF was funding their prizes while
  // proposal #391 was still `inactive` with a December start, the previous proposal had
  // expired on 1 November, and @hdev had paid 1,250 HIVE out of pocket in between. Vote
  // standing says what WOULD happen; the start date says whether anything IS happening.
  const started = Date.parse(me.start_date + 'Z') <= Date.now();
  const ended = Date.parse(me.end_date + 'Z') <= Date.now();
  const paying = started && !ended && above;

  console.log(above
    ? '  >>> ABOVE THE LINE on votes — it would be funded.'
    : '  >>> BELOW THE LINE on votes — it would NOT be funded.');

  if (!started) {
    console.log(`  >>> NOT PAYING ANYTHING YET — status "${me.status}", starts ${me.start_date.slice(0, 10)}.`);
    console.log('      Do NOT write that the DHF funds the contest. It does not, yet.');
  } else if (ended) {
    console.log(`  >>> EXPIRED ${me.end_date.slice(0, 10)} — paying nothing.`);
  } else if (paying) {
    console.log('  >>> LIVE AND ABOVE THE LINE — actually receiving payments.');
  } else {
    console.log('  >>> LIVE BUT BELOW THE LINE — receiving nothing while it stays there.');
  }
  console.log('      Re-run this before quoting the figure anywhere; it moves daily.\n');
};

main().catch(e => { console.error(e.message); process.exit(1); });
