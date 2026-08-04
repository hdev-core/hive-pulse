# Hive Anti-Scam Lists — Integration Brief

Reference for integrating Hive's community-maintained bad-actor (scam/phishing) account
lists into any Hive project. All links verified live and returning data.

## The sources (pick based on your needs)

### 1. Easiest to consume — `ecency/hivescript` (JSON, ecosystem standard)
The machine-readable list used by **Hive Keychain** and **Ecency**. Plain JSON arrays.
- Bad actors (~1,012): https://raw.githubusercontent.com/ecency/hivescript/master/bad-actors.json
- **Phishing domains (~559):** https://raw.githubusercontent.com/ecency/hivescript/master/bad-domains.json
- Repo: https://github.com/ecency/hivescript

### 2. Most comprehensive — `watchmen` aggregator (actively maintained)
Compiles condenser, denser, ecency, HiveWatchers, mahdiyari, and arbitrage-scam lists
into one flat file. ~14,927 entries.
- Compiled flat list (raw): https://gitlab.syncad.com/hive/watchmen/-/raw/main/output/flat/badactors.txt
- Repo (see `input/` for per-source lists): https://gitlab.syncad.com/hive/watchmen

### 3. Canonical / conservative — condenser `BadActorList.js`
The list `hive.blog` itself uses. ~908 entries, smaller and slower-moving.
- Raw: https://gitlab.syncad.com/hive/condenser/-/raw/master/src/app/utils/BadActorList.js
- (Note: it's a JS template literal, newline-separated names inside backticks — not JSON.)

## Recommendation

- **Just need a solid blocklist fast?** Use `ecency/hivescript/bad-actors.json` — JSON, ecosystem-standard, plus `bad-domains.json` for phishing-site detection.
- **Want maximum coverage?** Use the `watchmen` flat list (it's a superset of the others).
- **Want to distinguish scam from abuse?** Consume watchmen's per-source `input/` files and split into two tiers (see below).

## Two-tier approach (what we do)

The lists mix two threat models. We split them so warnings stay honest:
- **Scam tier** (~1k) — phishing / impersonation / fund-theft (condenser + denser + ecency
  + mahdiyari). → **hard block** ("funds not recoverable").
- **Watchlist tier** (~14k) — HiveWatchers abuse / farming / arbitrage flags. Not
  necessarily fund theft. → **soft warning** only.

## Important gotcha: exact matching only — do NOT fuzzy-match

Every name on these lists is, by construction, a near-miss of a *real* account. Legitimate
Hive accounts contain the same digits and separators the impersonators use, so any
normalization that catches a disguise also collapses the genuine article onto it. Measured
against the real list:
- stripping separators makes legitimate `blocktrades` match the listed `block-trades`,
- folding confusable digits makes `deepcrypto8` (Binance's real deposit account) match the
  listed `deepcrypt08`.

Blocking Binance/BlockTrades trains users to click through warnings — worse than not
warning. **Use exact set membership; add impersonation detection only against the user's
own trusted accounts (their own + accounts they've paid before), never against the list.**

## Consuming it (notes)

- Normalize entries: lowercase, strip a leading `@`.
- These are **static snapshots**. To stay current between your releases, periodically fetch
  the source and **union** it with a bundled offline copy (only ever *add* — never let a
  fetch shrink your list, in case it returns empty/garbage).
- Enforce the check at your **single signing chokepoint**, so every transfer/delegation/
  token-send is covered and future op types are protected by default.

## Where funds actually leave — extract every recipient

If you check transfers, remember Hive-Engine token sends hide the recipient inside a
`custom_json` op's JSON string payload (`contractPayload.to`), and delegations use
`delegatee`. Cover: `transfer`, `transfer_to_savings`, `transfer_from_savings`,
`recurrent_transfer`, `delegate_vesting_shares`, and `custom_json` (tokens). Skip
self-sends.
