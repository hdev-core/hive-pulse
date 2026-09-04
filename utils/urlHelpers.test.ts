import { describe, it, expect } from 'vitest';
import { parseUrl, getTargetUrl, frontendIsStandard } from './urlHelpers';
import { FRONTENDS } from '../constants';
import { ActionMode, FrontendConfig } from '../types';

/**
 * Every case here is a bug that actually shipped on a branch and was caught by review
 * rather than by code. urlHelpers is a pure function of (string, FrontendConfig[]) with no
 * DOM and no chrome API, so there was never a reason for it to be untested.
 */

/** A custom frontend created with the Add-Frontend form's pre-filled defaults. */
const mirror: FrontendConfig = {
  id: 'custom-mirror', name: 'Mirror', domain: 'mirror.example', aliases: [],
  color: '#000', textColor: '#fff', description: '', active: true, isCustom: true,
  customDomain: 'mirror.example', paths: { compose: '/submit' },
  linkStructure: {
    post: '/@{{author}}/{{permlink}}',
    profile: '/@{{username}}',
    wallet: '/@{{username}}/wallet',
  },
};
const F = [...FRONTENDS, mirror];
const same = (id: string, path: string, u: string | null, a: string | null, p: string | null,
              hive = true, std = true) =>
  getTargetUrl(id, path, ActionMode.SAME_PAGE, u, a, p, F, hive, std);

describe('parseUrl — identities are only read off recognised frontends', () => {
  it('does not treat a non-Hive site with /@handle URLs as Hive', () => {
    for (const u of ['https://medium.com/@dan/some-post', 'https://www.youtube.com/@veritasium/videos']) {
      const s = parseUrl(u, F);
      expect(s.isHiveUrl).toBe(false);
      expect(s.username).toBeNull();
      expect(s.author).toBeNull();
    }
  });

  it('sends a switch from a non-Hive page to the frontend home, not a grafted path', () => {
    const s = parseUrl('https://chromewebstore.google.com/detail/hivepulse/abc', F);
    expect(same('PEAKD', s.path, s.username, s.author, s.permlink, s.isHiveUrl))
      .toBe('https://peakd.com/');
  });
});

describe('parseUrl — frontend-declared templates', () => {
  it('parses SlothBuzz /post/<author>/<permlink> in both directions', () => {
    const s = parseUrl('https://www.slothbuzz.com/post/oflyhigh/4mf15k-and', F);
    expect([s.author, s.permlink]).toEqual(['oflyhigh', '4mf15k-and']);
    expect(same('PEAKD', s.path, s.username, s.author, s.permlink))
      .toBe('https://peakd.com/@oflyhigh/4mf15k-and');
    expect(same('SLOTHBUZZ', '/x', null, 'oflyhigh', '4mf15k-and'))
      .toBe('https://slothbuzz.com/post/oflyhigh/4mf15k-and');
  });

  it('normalises mis-cased identities rather than carrying them through', () => {
    expect(parseUrl('https://www.slothbuzz.com/post/AlIcE/My-Post', F).author).toBe('alice');
  });

  it('rejects a capture that is not a valid Hive identity', () => {
    // [^/]+ will match a percent-encoded slash; validation must drop it so it can never be
    // pasted onto another origin's path.
    for (const u of ['https://mirror.example/@a%2Fb/perm', 'https://mirror.example/@%2e%2e%2f%2e%2e/x']) {
      expect(parseUrl(u, F).author).toBeNull();
    }
  });

  it('does not let a template match stall on a pathological path', () => {
    const evil: FrontendConfig = { ...mirror, id: 'evil', domain: 'evil.example',
      customDomain: 'evil.example',
      linkStructure: { ...mirror.linkStructure!, post: '/{{author}}{{permlink}}{{username}}/x' } };
    const t0 = Date.now();
    parseUrl('https://evil.example/' + 'a'.repeat(4000), [...F, evil]);
    expect(Date.now() - t0).toBeLessThan(250);
  });

  it('parses a profile template, not only a post template', () => {
    const odd: FrontendConfig = { ...mirror, id: 'odd', domain: 'odd.example',
      customDomain: 'odd.example',
      linkStructure: { post: '/p/{{author}}/{{permlink}}', profile: '/user/{{username}}',
                       wallet: '/wallet' } };
    expect(parseUrl('https://odd.example/user/acidyo', [...F, odd]).username).toBe('acidyo');
  });
});

describe('getTargetUrl — wallets', () => {
  it('falls back to a real wallet page when the template needs a name it lacks', () => {
    // Asserted by equality on purpose: `not.toMatch(/{{/)` also passes for any wrong URL,
    // and did — replacing walletPath with a constant left the old assertion green.
    expect(getTargetUrl('custom-mirror', '/trending', ActionMode.WALLET, null, null, null, F))
      .toBe('https://mirror.example/wallet');
  });

  it('does not open the post author\'s wallet while reading their post', () => {
    const s = parseUrl('https://www.slothbuzz.com/post/bob/bobs-post', F);
    expect(getTargetUrl('PEAKD', s.path, ActionMode.WALLET, s.username, s.author, s.permlink, F))
      .toBe('https://peakd.com/wallet');
  });

  it('keeps hive.blog on its wallet subdomain', () => {
    expect(getTargetUrl('HIVEBLOG', '/x', ActionMode.WALLET, 'alice', null, null, F))
      .toBe('https://wallet.hive.blog/@alice/transfers');
  });

  it('resolves SlothBuzz to its single global wallet page', () => {
    expect(getTargetUrl('SLOTHBUZZ', '/x', ActionMode.WALLET, 'alice', null, null, F))
      .toBe('https://slothbuzz.com/wallet');
  });
});

describe('getTargetUrl — carrying the source path', () => {
  it('carries non-post paths between standard condenser frontends', () => {
    expect(same('PEAKD', '/trending/hive-167922', null, null, null))
      .toBe('https://peakd.com/trending/hive-167922');
    expect(same('custom-mirror', '/trending/hive-167922', null, null, null))
      .toBe('https://mirror.example/trending/hive-167922');
  });

  it('does not carry a path onto a frontend with a different scheme', () => {
    expect(same('SLOTHBUZZ', '/trending/hive-167922', null, null, null))
      .toBe('https://slothbuzz.com/');
  });

  it('does not carry a non-standard source path onto ANY standard frontend', () => {
    // slothbuzz.com/dashboard has no counterpart on a condenser frontend. Asserting only
    // the custom target here let the built-in branch ignore sourceIsStandard entirely, so
    // the motivating example still produced peakd.com/dashboard.
    for (const [id, home] of [['custom-mirror', 'https://mirror.example/'],
                              ['PEAKD', 'https://peakd.com/'],
                              ['ECENCY', 'https://ecency.com/'],
                              ['HIVEBLOG', 'https://hive.blog/']] as const) {
      expect(same(id, '/dashboard', null, null, null, true, false)).toBe(home);
    }
  });
});

describe('regressions in frontends that were not the subject of any fix', () => {
  it('keeps the standard shape for built-ins', () => {
    expect(same('PEAKD', '/x', null, 'hdev', 'my-post')).toBe('https://peakd.com/@hdev/my-post');
    expect(same('ECENCY', '/x', 'hdev', null, null)).toBe('https://ecency.com/@hdev');
  });

  it('keeps 3Speak on its watch URL', () => {
    expect(same('THREESPEAK', '/x', null, 'hdev', 'my-post'))
      .toBe('https://3speak.tv/watch?v=hdev/my-post');
  });

  it('still recovers Actifit @-less URLs', () => {
    const s = parseUrl('https://actifit.io/alice/my-report', F);
    expect([s.author, s.permlink]).toEqual(['alice', 'my-report']);
  });

  it('still extracts author and permlink from a community-prefixed URL', () => {
    const s = parseUrl('https://peakd.com/hive-167922/@oflyhigh/4mf15k-and', F);
    expect([s.author, s.permlink]).toEqual(['oflyhigh', '4mf15k-and']);
  });
});

describe('no result ever ships an unresolved template placeholder', () => {
  // Templates are free text from the Add-Frontend form. frontendIsStandard tolerates
  // spacing drift, so resolveLinkTemplate has to fill the same forms it tolerates —
  // previously it did not, and a spaced template put "{{ author }}" in the address bar.
  const spaced: FrontendConfig = {
    ...mirror, id: 'spaced', domain: 'spaced.example', customDomain: 'spaced.example',
    linkStructure: {
      post: '/@{{ author }}/{{ permlink }}',
      profile: '/@{{ username }}',
      wallet: '/@{{ username }}/wallet',
    },
  };
  const FS = [...F, spaced];

  it.each([
    ['post', ActionMode.SAME_PAGE, null, 'alice', 'my-post'],
    ['profile', ActionMode.SAME_PAGE, 'alice', null, null],
    ['wallet with a name', ActionMode.WALLET, 'alice', null, null],
    ['wallet without a name', ActionMode.WALLET, null, null, null],
    ['compose', ActionMode.COMPOSE, null, null, null],
  ] as const)('%s never leaks a placeholder', (_label, mode, u, a, pl) => {
    expect(getTargetUrl('spaced', '/x', mode, u, a, pl, FS)).not.toMatch(/\{\{|\}\}/);
  });

  it('fills a spaced post template rather than emitting it raw', () => {
    expect(getTargetUrl('spaced', '/x', ActionMode.SAME_PAGE, null, 'alice', 'my-post', FS))
      .toBe('https://spaced.example/@alice/my-post');
  });
});

describe('frontendIsStandard', () => {
  it('is true for the frontends that actually declare sharesCondenserRoutes', () => {
    for (const id of ['PEAKD', 'ECENCY', 'HIVEBLOG']) {
      expect(frontendIsStandard(FRONTENDS.find(f => f.id === id))).toBe(true);
    }
  });

  it('tolerates cosmetic drift in a user-typed template', () => {
    for (const post of ['/@{{author}}/{{permlink}}', '/@{{author}}/{{permlink}}/',
                        ' /@{{author}}/{{permlink}} ', '/@{{ author }}/{{ permlink }}']) {
      expect(frontendIsStandard({ ...mirror, linkStructure: { ...mirror.linkStructure!, post } }))
        .toBe(true);
    }
  });

  it('recognises SlothBuzz as non-standard', () => {
    expect(frontendIsStandard(FRONTENDS.find(f => f.id === 'SLOTHBUZZ'))).toBe(false);
  });
});

describe('regressions found by review that the first suite missed', () => {
  it('accepts permlinks beginning with a hyphen — 2.1% of live posts have them', () => {
    // /post/ismot/-lsn is a real root post. A hand-written "consensus grammar" rejected it
    // and broke the SlothBuzz round trip this validation sits inside.
    const s = parseUrl('https://www.slothbuzz.com/post/ismot/-lsn', F);
    expect([s.author, s.permlink]).toEqual(['ismot', '-lsn']);
    expect(same('PEAKD', s.path, s.username, s.author, s.permlink))
      .toBe('https://peakd.com/@ismot/-lsn');
  });

  it('does not recognise a lookalike host', () => {
    // hostname.replace('www.', '') is a substring strip: pwww.eakd.com became peakd.com,
    // and "we only trust recognised frontends" is the whole argument for parsing at all.
    for (const h of ['pwww.eakd.com', 'hivwww.e.blog', 'peakd.www.com']) {
      expect(parseUrl(`https://${h}/@alice/x`, F).detectedFrontendId).toBeNull();
    }
    expect(parseUrl('https://www.peakd.com/@a/b', F).detectedFrontendId).toBe('PEAKD');
  });

  it('rejects every placeholder shape a free-text template can hold', () => {
    for (const wallet of ['/@{{user-name}}/wallet', '/@{{user.name}}/wallet',
                          '/@{{}}/wallet', '/@{{ }}/wallet']) {
      const f: FrontendConfig = { ...mirror, id: 'ph', domain: 'ph.example',
        customDomain: 'ph.example', linkStructure: { ...mirror.linkStructure!, wallet } };
      expect(getTargetUrl('ph', '/x', ActionMode.WALLET, null, null, null, [...F, f]))
        .not.toMatch(/\{\{|\}\}/);
    }
  });
});

describe('Ureka — /@author/permlink, confirmed against a live post', () => {
  // A first pass read only the declarative `path:` entries in Ureka's bundle, concluded it
  // had no /@username and no wallet route, and reconfigured it onto /post/. It was wrong:
  // the @-routes live inside the /* catch-all component, which regex-matches /@user,
  // /@user/wallet, /@user/posts|comments|replies|feed, /@user/thread/:permlink and
  // /@user/:permlink. /post/:author/:permlink is declared but dead — the bundle contains no
  // `/post/` href at all, while every post link is built as `/@${author}/${permlink}`.
  // Live proof: ureka.social/@yolimarag/lkt-mtmbgy8c-jei8a2oh renders a real post.
  const ureka = FRONTENDS.find(f => f.id === 'UREKA')!;

  it('is a standard condenser frontend', () => {
    expect(frontendIsStandard(ureka)).toBe(true);
  });

  it('builds post links on /@, and round-trips with a condenser frontend', () => {
    expect(same('UREKA', '/x', null, 'yolimarag', 'lkt-mtmbgy8c-jei8a2oh'))
      .toBe('https://ureka.social/@yolimarag/lkt-mtmbgy8c-jei8a2oh');
    const s = parseUrl('https://ureka.social/@yolimarag/lkt-mtmbgy8c-jei8a2oh', F);
    expect([s.author, s.permlink]).toEqual(['yolimarag', 'lkt-mtmbgy8c-jei8a2oh']);
    expect(same('PEAKD', s.path, s.username, s.author, s.permlink))
      .toBe('https://peakd.com/@yolimarag/lkt-mtmbgy8c-jei8a2oh');
  });

  it('has the profile and wallet routes the first pass claimed it lacked', () => {
    expect(same('UREKA', '/x', 'alice', null, null)).toBe('https://ureka.social/@alice');
    expect(getTargetUrl('UREKA', '/x', ActionMode.WALLET, 'alice', null, null, F))
      .toBe('https://ureka.social/@alice/wallet');
  });

  it('sends a wallet click with no username home, not to the generic /wallet', () => {
    // '/wallet' is walletPath's fallback but is not a Ureka route — it would hit the
    // catch-all's not-found.
    expect(getTargetUrl('UREKA', '/x', ActionMode.WALLET, null, null, null, F))
      .toBe('https://ureka.social/');
  });

  it('carries a condenser path across, since it shares the routes', () => {
    expect(same('UREKA', '/trending/hive-167922', null, null, null))
      .toBe('https://ureka.social/trending/hive-167922');
  });

  it('opens its real composer, which is /create and not /submit', () => {
    expect(getTargetUrl('UREKA', '/x', ActionMode.COMPOSE, null, null, null, F))
      .toBe('https://ureka.social/create');
  });
});

describe('frontendIsStandard is declared, not inferred', () => {
  it('does not call a frontend standard just because it declares no post template', () => {
    // The old rule was "no linkStructure ⇒ standard", so any frontend added without one
    // silently inherited condenser routes. Ureka does declare one; this covers the shape.
    const bare: FrontendConfig = { ...mirror, id: 'bare', domain: 'bare.example',
      customDomain: 'bare.example', isCustom: false, linkStructure: undefined };
    expect(frontendIsStandard(bare)).toBe(false);
  });

  it('is false for a missing frontend rather than throwing', () => {
    expect(frontendIsStandard(undefined)).toBe(false);
    expect(frontendIsStandard(FRONTENDS.find(f => f.id === 'NOPE'))).toBe(false);
  });
});
