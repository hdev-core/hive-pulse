#!/usr/bin/env python3
"""
Verify every tweet in an X plan fits in 280.

X does not count characters the way len() does. Two rules matter here:

  * every URL counts as exactly 23, however long it actually is (t.co wrapping)
  * most characters weigh 1, but anything outside the Latin/general-punctuation
    ranges weighs 2 -- which includes every emoji

Both are implemented below from X's published weighted-length spec, so a PASS here
means the tweet actually sends.

    python scripts/check_tweet_lengths.py enhancements/x-plan-week5.md

Tweets are read from fenced ```tweet blocks so the plan document stays the single
source of truth and the copy cannot drift from what was measured.
"""

import re
import sys

LIMIT = 280
URL_RE = re.compile(r'https?://\S+')

# Ranges that weigh 1; everything else weighs 2. From X's weighted-length config.
LIGHT = [(0, 4351), (8192, 8205), (8208, 8223), (8242, 8247)]


def weight(ch):
    cp = ord(ch)
    return 1 if any(lo <= cp <= hi for lo, hi in LIGHT) else 2


def tweet_len(text):
    """Weighted length with every URL charged the flat t.co rate."""
    urls = URL_RE.findall(text)
    stripped = URL_RE.sub('', text)
    return sum(weight(c) for c in stripped) + 23 * len(urls)


def blocks(path):
    src = open(path, encoding='utf-8').read()
    return re.findall(r'```tweet(?:\s+(\S+))?\n(.*?)```', src, re.S)


def main(path):
    found = blocks(path)
    if not found:
        print(f'no ```tweet blocks found in {path}')
        return 1
    bad = 0
    for label, body in found:
        body = body.rstrip('\n')
        n = tweet_len(body)
        ok = n <= LIMIT
        bad += not ok
        first = body.splitlines()[0][:56] if body.strip() else '(empty)'
        print(f'  [{"PASS" if ok else "OVER"}] {n:>4}/{LIMIT}  '
              f'{(label or "-"):<14}  {first}')
    print(f'\n{len(found)} tweets checked, {bad} over the limit.')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'enhancements/x-plan-week5.md'))
