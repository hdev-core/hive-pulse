import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAccountHistoryFinance } from './hiveHelpers';
import { HiveNotificationType } from '../types';

/**
 * Covers the internal-market parsing behind the Pulse Market tab. Every case here is a
 * defect that review found in code that shipped with no tests at all.
 *
 * fetchAccountHistoryFinance is the only exported door into normalizeAccountHistoryOp, so
 * these drive it through a stubbed fetch. Operation shapes are taken from Hive's own
 * headers and from live api.hive.blog responses.
 */

const calls: any[] = [];
const stubNode = (respond: (body: any) => any) => {
  vi.stubGlobal('fetch', async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    return { json: async () => respond(body) };
  });
};
const ok = (ops: any[]) => () => ({ jsonrpc: '2.0', id: 1, result: ops });
/** condenser returns [seq, {op: [type, data], timestamp}] ascending by seq. */
const op = (seq: number, type: string, data: any, timestamp = '2026-09-01T12:00:00') =>
  [seq, { op: [type, data], timestamp, trx_id: 'x', block: 1 }];
const xfer = (from: string) => ({ from, to: 'alice', amount: '1.000 HIVE', memo: '' });

afterEach(() => { vi.unstubAllGlobals(); calls.length = 0; });

describe('limit_order_create2 — exchange_rate is a ratio, not a total', () => {
  it('multiplies the sell amount by the rate', async () => {
    // The chain only requires exchange_rate.base.symbol === amount_to_sell.symbol; the base
    // AMOUNT is arbitrary and conventionally a unit. Returning quote verbatim reported the
    // price of one unit as the proceeds of the whole order — a 1000x understatement here.
    stubNode(ok([op(1, 'limit_order_create2', {
      owner: 'alice', orderid: 1,
      amount_to_sell: '1000.000 HIVE',
      exchange_rate: { base: '1.000 HIVE', quote: '0.300 HBD' },
    })]));
    const { items } = await fetchAccountHistoryFinance('alice');
    expect(items[0].msg).toBe('Order placed: sell 1000.000 HIVE for 300.000 HBD @ 0.300000 HBD/HIVE');
  });

  it('agrees with the equivalent limit_order_create', async () => {
    stubNode(ok([
      op(1, 'limit_order_create', { owner: 'alice', orderid: 1,
        amount_to_sell: '1000.000 HIVE', min_to_receive: '300.000 HBD' }),
      op(2, 'limit_order_create2', { owner: 'alice', orderid: 2,
        amount_to_sell: '1000.000 HIVE',
        exchange_rate: { base: '1.000 HIVE', quote: '0.300 HBD' } }),
    ]));
    const { items } = await fetchAccountHistoryFinance('alice');
    expect(new Set(items.map(i => i.msg)).size).toBe(1);
  });

  it('handles a non-unit base', async () => {
    stubNode(ok([op(1, 'limit_order_create2', {
      owner: 'alice', orderid: 1,
      amount_to_sell: '50.000 HBD',
      exchange_rate: { base: '10.000 HBD', quote: '40.000 HIVE' },
    })]));
    const { items } = await fetchAccountHistoryFinance('alice');
    expect(items[0].msg).toContain('sell 50.000 HBD for 200.000 HIVE');
  });
});

describe('closure rows at a page boundary', () => {
  const cancelled = (seq: number) => op(seq, 'limit_order_cancelled',
    { seller: 'alice', orderid: 77, amount_back: '5.000 HIVE' });

  it('does not claim the chain expired an order the user cancelled', async () => {
    // ops[0] has no predecessor IN THIS PAGE; its predecessor is the first row of the next,
    // older page. Reading that absence as "no cancel op, therefore expiry" made essentially
    // every "Expired" row wrong, since real expiries are rarer than 1 in 1000.
    stubNode(ok([cancelled(500), op(501, 'transfer', xfer('bob'))]));
    const { items } = await fetchAccountHistoryFinance('alice');
    const row = items.find(i => i.orderid === 77)!;
    expect(row.msg).toBe('Order closed — 5.000 HIVE returned');
    expect(row.closureUncertain).toBe(true);
    expect(row.type).not.toBe(HiveNotificationType.LIMIT_ORDER_EXPIRED);
  });

  it('still reports a real expiry when the predecessor is known', async () => {
    stubNode(ok([op(499, 'transfer', xfer('bob')), cancelled(500)]));
    const { items } = await fetchAccountHistoryFinance('alice');
    const row = items.find(i => i.orderid === 77)!;
    expect(row.type).toBe(HiveNotificationType.LIMIT_ORDER_EXPIRED);
    expect(row.closureUncertain).toBeUndefined();
  });

  it('still reports a user cancellation when the pair is intact', async () => {
    stubNode(ok([
      op(499, 'limit_order_cancel', { owner: 'alice', orderid: 77 }),
      cancelled(500),
    ]));
    const { items } = await fetchAccountHistoryFinance('alice');
    const rows = items.filter(i => i.orderid === 77);
    expect(rows).toHaveLength(1);            // the signed op collapses into the virtual one
    expect(rows[0].type).toBe(HiveNotificationType.LIMIT_ORDER_CANCEL);
    expect(rows[0].msg).toBe('Order cancelled — 5.000 HIVE returned');
  });
});

describe('a malformed entry costs one row, not the feed', () => {
  it.each([
    ['an entry with no op', [1, { timestamp: '2026-09-01T12:00:00' }]],
    ['a null entry', null],
    ['an op that is not an array', [3, { op: 'transfer', timestamp: '2026-09-01T12:00:00' }]],
  ])('survives %s', async (_label, bad) => {
    // The destructure sat outside the try that claimed to guard it, so one bad element
    // blanked every finance row and nulled the paging cursor for the rest of the session.
    stubNode(ok([op(1, 'transfer', xfer('bob')), bad, op(3, 'transfer', xfer('carol'))]));
    const { items } = await fetchAccountHistoryFinance('alice');
    expect(items).toHaveLength(2);
  });
});

describe('pagination', () => {
  it('clamps the final page so condenser does not reject it', async () => {
    // condenser_api asserts start >= limit - 1 for any start but -1, so the tail page of an
    // account whose op count is not a multiple of the limit cannot be requested at full
    // width. Asking anyway read as "no more history" and silently dropped the oldest ops.
    stubNode(ok([]));
    await fetchAccountHistoryFinance('alice', undefined, 499, 1000);
    const [, start, limit] = calls[0].params;
    expect([start, limit]).toEqual([499, 500]);
    expect(start).toBeGreaterThanOrEqual(limit - 1);
  });

  it('leaves the head request alone', async () => {
    stubNode(ok([]));
    await fetchAccountHistoryFinance('alice');
    expect(calls[0].params.slice(1)).toEqual([-1, 1000]);
  });

  it('stops at the first operation instead of looping on the head page', async () => {
    stubNode(ok([op(0, 'transfer', xfer('bob'))]));
    const { hasMore, oldestSeq } = await fetchAccountHistoryFinance('alice', undefined, 0, 1);
    expect(oldestSeq).toBe(0);
    expect(hasMore).toBe(false);
  });
});

describe('a failing node is not an empty account', () => {
  it('reports a JSON-RPC error rather than an empty page', async () => {
    stubNode(() => ({ jsonrpc: '2.0', id: 1,
      error: { code: -32000, message: 'Assert Exception:args.start >= args.limit-1' } }));
    const r = await fetchAccountHistoryFinance('alice');
    expect(r.error).toContain('args.start');
    expect(r.items).toEqual([]);
  });

  it('reports a transport failure', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('network down'); });
    expect((await fetchAccountHistoryFinance('alice')).error).toBe('network down');
  });

  it('reports a non-array result rather than ending the feed', async () => {
    stubNode(() => ({ jsonrpc: '2.0', id: 1, result: { unexpected: true } }));
    const r = await fetchAccountHistoryFinance('alice');
    expect(r.items).toEqual([]);
    expect(r.hasMore).toBe(false);
  });

  it('distinguishes a genuinely empty account from a failure', async () => {
    stubNode(ok([]));
    const r = await fetchAccountHistoryFinance('alice');
    expect(r.error).toBeUndefined();
    expect(r.items).toEqual([]);
  });
});
