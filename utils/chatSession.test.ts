import { describe, it, expect, afterEach, vi } from 'vitest';
import { sessionBelongsTo } from './ecencyHelpers';

/**
 * Ecency chat authenticates with a single `mm_pat` cookie on ecency.com. It belongs to the
 * BROWSER, not to the extension and not to an account — so a session that answers our
 * requests is not proof it is the account HivePulse thinks is signed in. Before this gate,
 * both recovery paths in the background worker adopted whatever session was there: sign
 * into Ecency as one account in a tab while the extension holds another, and the toolbar
 * count and the desktop popups started describing a stranger's inbox under your name.
 *
 * These tests drive the identity check through a stubbed /users/me, because the only thing
 * that matters is which answers it accepts and which it refuses.
 */

const ME = 'https://ecency.com/api/mattermost/users/me';

const stubMe = (status: number, body?: unknown) => {
  const fetchMock = vi.fn(async (url: string) => {
    expect(String(url)).toBe(ME);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as any;
  });
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
};

afterEach(() => {
  delete (globalThis as any).fetch;
  vi.restoreAllMocks();
});

describe('sessionBelongsTo — whose chat session is this really', () => {
  it('accepts the session when the username matches', async () => {
    stubMe(200, { id: 'mm-ahmed', username: 'ahmedabbaci' });
    await expect(sessionBelongsTo('ahmedabbaci')).resolves.toEqual({
      id: 'mm-ahmed', username: 'ahmedabbaci',
    });
  });

  it('refuses a different account signed in on ecency.com', async () => {
    // The actual defect. @hdev is signed into Ecency in a tab; the extension holds
    // @ahmedabbaci; the cookie answers for @hdev. This must not be adopted.
    stubMe(200, { id: 'mm-hdev', username: 'hdev' });
    await expect(sessionBelongsTo('ahmedabbaci')).resolves.toBeNull();
  });

  it('ignores a leading @ and case on either side', async () => {
    stubMe(200, { id: 'mm-ahmed', username: 'AhmedAbbaci' });
    await expect(sessionBelongsTo('@ahmedabbaci')).resolves.not.toBeNull();
  });

  it('matches a Hive name containing a dot', async () => {
    // @itx.wardah is a real entrant. A gate that rejected dots would log her out of chat
    // every cycle, which is worse than the bug it was added to fix.
    stubMe(200, { id: 'mm-itx', username: 'itx.wardah' });
    await expect(sessionBelongsTo('itx.wardah')).resolves.not.toBeNull();
  });

  it('prefers the stored Mattermost id over the username when it has one', async () => {
    // The id settles identity without assuming anything about how Hive names map to chat
    // names, so it wins wherever we already hold one.
    stubMe(200, { id: 'mm-ahmed', username: 'something-else-entirely' });
    await expect(sessionBelongsTo('ahmedabbaci', 'mm-ahmed')).resolves.not.toBeNull();
  });

  it('refuses on an id mismatch even when the username looks right', async () => {
    stubMe(200, { id: 'mm-someone-else', username: 'ahmedabbaci' });
    await expect(sessionBelongsTo('ahmedabbaci', 'mm-ahmed')).resolves.toBeNull();
  });

  it('refuses a 401 — not a live session at all', async () => {
    stubMe(401);
    await expect(sessionBelongsTo('ahmedabbaci')).resolves.toBeNull();
  });

  it('refuses when the API will not say who it is', async () => {
    // Identity we cannot establish is not identity we may assume. An unanswered
    // /users/me has to fail CLOSED, or the gate is decorative on exactly the flaky
    // network where the recovery path runs.
    stubMe(500, {});
    await expect(sessionBelongsTo('ahmedabbaci')).resolves.toBeNull();
  });

  it('refuses a reply with no id', async () => {
    stubMe(200, { username: 'ahmedabbaci' });
    await expect(sessionBelongsTo('ahmedabbaci')).resolves.toBeNull();
  });

  it('refuses when a thrown fetch leaves us with nothing', async () => {
    (globalThis as any).fetch = vi.fn(async () => { throw new Error('offline'); });
    await expect(sessionBelongsTo('ahmedabbaci')).resolves.toBeNull();
  });

  it('asks nothing and refuses when it has no account to compare against', async () => {
    // Signed out. There is no right answer, so there must be no network call either.
    const f = stubMe(200, { id: 'mm-hdev', username: 'hdev' });
    await expect(sessionBelongsTo(undefined, undefined)).resolves.toBeNull();
    await expect(sessionBelongsTo('')).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
