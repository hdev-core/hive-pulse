#!/usr/bin/env python3
"""
Week-5 text cards for @HdevCore.

Reuses the renderer in make_social_cards.py so the whole account stays one visual
system. That module composes text deterministically over an AI-generated plate —
these cards are almost entirely words, and image models still garble lettering.

    python scripts/make_week5_cards.py

Outputs 1600x900 JPEGs into enhancements/images/social/.
Run from the repository root; the renderer resolves the plate and logo relatively.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from make_social_cards import render, AMBER, EMERALD, ORANGE, RED, WHITE, MUTED, DIM  # noqa: E402

CARDS = [
    {   # Fri -- the friction remover. Ship news, but framed as "the hard part is gone".
        # Keep the wording neutral about store availability: submitted and rolling out
        # is not the same as live, and review times are not ours to promise.
        'name': 'w5-keyword', 'accent': AMBER,
        'blocks': [
            {'text': 'HIVEPULSE v1.13.1', 'size': 30, 'weight': 'semi', 'color': AMBER, 'gap': 26},
            {'text': 'It now picks the keyword for you', 'size': 62, 'gap': 30},
            {'text': 'The focus keyword is worth 35 of the 100 SEO points, and choosing it '
                     'was the one step people got wrong.',
             'size': 32, 'weight': 'reg', 'color': MUTED, 'gap': 20},
            {'text': 'Press the suggest button. It reads your draft, ranks the candidates, '
                     'and scores each one.',
             'size': 32, 'weight': 'reg', 'color': MUTED, 'gap': 30},
            {'text': 'Also new: blog.suseona.com support, and a fix for RPC nodes that '
                     'could not connect.',
             'size': 29, 'weight': 'reg', 'color': DIM, 'gap': 26},
            {'text': 'Free. Chrome, Firefox, Opera, Brave, Edge.', 'size': 30, 'weight': 'semi', 'color': EMERALD},
        ],
    },
    {   # Sat -- the most saveable artifact of the week. No product mentioned on purpose:
        # this has to be worth keeping to someone who will never install anything.
        'name': 'w5-audit', 'accent': EMERALD, 'mirror': True,
        'blocks': [
            {'text': 'NO TOOL REQUIRED', 'size': 30, 'weight': 'semi', 'color': EMERALD, 'gap': 28},
            {'text': 'The 30-second audit', 'size': 62, 'gap': 34},
            {'text': '1.  Read your first sentence alone. Does it answer the title, '
                     'or clear its throat?',
             'size': 33, 'weight': 'semi', 'color': WHITE, 'gap': 20},
            {'text': '2.  Find a sentence starting with This, It or They. Read it with '
                     'nothing before it. Still meaningful?',
             'size': 33, 'weight': 'semi', 'color': WHITE, 'gap': 20},
            {'text': '3.  Count how often you wrote "it" where the actual noun would fit.',
             'size': 33, 'weight': 'semi', 'color': WHITE, 'gap': 30},
            {'text': 'That is essentially the whole AI-quotability score.',
             'size': 31, 'weight': 'reg', 'color': DIM},
        ],
    },
    {   # Sun -- the referral mechanic, stated as arithmetic. The point is that bringing
        # someone is not altruism: it pays twice, and the second payment is the tier.
        'name': 'w5-referral', 'accent': AMBER,
        'blocks': [
            {'text': 'WHY BRINGING A FRIEND PAYS YOU TWICE', 'size': 30, 'weight': 'semi',
             'color': AMBER, 'gap': 30},
            {'text': 'They write "referred by @you" in their entry.', 'size': 46, 'gap': 26},
            {'text': 'Their post qualifies  →  you get 25 HIVE, they get 25 HIVE',
             'size': 34, 'weight': 'semi', 'color': EMERALD, 'gap': 18},
            {'text': 'The field gets bigger  →  the pool everyone competes for goes up',
             'size': 34, 'weight': 'semi', 'color': EMERALD, 'gap': 30},
            {'text': 'Up to two referrals each. They have to be genuinely new and the '
                     'entry has to be real. We check both.',
             'size': 30, 'weight': 'reg', 'color': DIM, 'gap': 26},
            {'text': 'This is the only contest mechanic where helping a rival pays you.',
             'size': 30, 'weight': 'semi', 'color': MUTED},
        ],
    },
    {   # Tue -- close. Deliberately plain: at this point nobody needs persuading, they
        # need the four steps and the deadline.
        'name': 'w5-final', 'accent': ORANGE, 'mirror': True,
        'blocks': [
            {'text': 'FINAL DAY', 'size': 32, 'weight': 'semi', 'color': ORANGE, 'gap': 26},
            {'text': 'Closes tonight, 23:59 UTC', 'size': 64, 'gap': 32},
            {'text': 'Publish a new post with the analyzer open', 'size': 33, 'weight': 'reg',
             'color': MUTED, 'gap': 16},
            {'text': 'Comment your link and your score screenshot', 'size': 33, 'weight': 'reg',
             'color': MUTED, 'gap': 16},
            {'text': 'Tag it #hivepulse — enforced, and it has decided podiums',
             'size': 33, 'weight': 'reg', 'color': MUTED, 'gap': 16},
            {'text': 'SEO 70 or above to qualify', 'size': 33, 'weight': 'reg',
             'color': MUTED, 'gap': 30},
            {'text': 'Referred by someone? Add "referred by @name".', 'size': 30,
             'weight': 'semi', 'color': AMBER},
        ],
    },
]

if __name__ == '__main__':
    for c in CARDS:
        p, kb = render(c)
        print(f'  {p}  {kb:.0f} KB')
    print(f'\n{len(CARDS)} cards written.')
