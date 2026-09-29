# tools/

## contest-post-composer.html - announcement publisher

Loads `enhancements/seo-contest-week9-announcement.md`, provides editable Hive post metadata
and body preview, and publishes one `comment` operation through Hive Keychain using the posting
key. It does not broadcast on load. Open it from a server rooted at the repository, for example:

```
python -m http.server 8899
```

Then open `http://localhost:8899/tools/contest-post-composer.html`. Confirm the title, permlink,
community, tags, preview description, and body before publishing. The default community is Hdev
Contests (`hive-177727`) and the default content tag is `hivepulse`.

## contest-payouts.html — payout console

Two buttons: curate the winning posts, and pay everyone. Both preview everything first
and broadcast nothing until you press them.

### Run it

Hive Keychain does not inject into `file://` pages by default, so serve it:

```
cd tools
python -m http.server 8899
```

Then open **http://localhost:8899/contest-payouts.html**.

(If you would rather open the file directly, enable *Allow access to file URLs* in the
Keychain extension's details page in Chrome. Serving it is less fiddly.)

### What each button does

| Button | Key | Operations |
|---|---|---|
| Upvote + reblog | **posting** | one `vote` and one `custom_json` reblog per winning post |
| Send rewards | **active** | one `transfer` per recipient, memo attached |

Each button is **one atomic transaction**. Every operation lands or none of them do, so
there is no half-paid state to reconcile.

### Safety

- **Self-check on load.** Each recipient's line items must sum to their stated amount, the
  transfers must sum to `expectedTotal`, no recipient may appear twice, no memo may be
  empty or over-long. If any check fails the console renders an error and refuses to
  arm the buttons.
- **Already-done detection.** On load it reads the chain: whether you have already voted
  on each post, and whether a transfer of the exact amount already went to each recipient
  in your last 1000 operations. Repeats are flagged in red before you can press anything.
- **Balance check.** Warns if the sending account holds less HIVE than the total.
- **Two-step arming.** The payout button stays disabled until you type `SEND`, then a
  native confirm lists every recipient and amount.
- Memos are shown verbatim in the preview — what you read is what the recipient receives.

## Current round

The console is loaded with the Week 8 winners and bonuses. Verify the on-chain status badges
before broadcasting. The results archive is `contest-results-week8.csv` and the announcement
draft is `enhancements/seo-contest-week9-announcement.md`.

For the next round, edit only the `ROUND`, `CURATION` and `PAYMENTS` block at the top of the
`<script>`. Set `expectedTotal` to the intended total; if the transfers disagree the console
will refuse to run rather than quietly paying a different number.
