#!/usr/bin/env python3
"""
Week-6 text cards for @HdevCore.

Reuses the renderer in make_week5_cards.py, which draws on brand_style -- warm gold
bloom, tumbling mosaic, real crimson badge, no model-generated artwork.

    python scripts/make_week6_cards.py

Outputs 1600x900 JPEGs into enhancements/images/social/.
Run from the repository root.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402
from make_week5_cards import render  # noqa: E402

CARDS = [
    {   # Fri -- the X prize, whose rules changed after nobody met the old brief.
        # The whole point is that it is now trivially easy to enter, so the card has to
        # look easy: one instruction, three examples, no conditions.
        'name': 'w6-qrt', 'seed': 71,
        'blocks': [
            {'text': '50 HIVE ON X', 'size': 31, 'weight': 'semi',
             'color': bs.GOLD_HI, 'gap': 24},
            {'text': 'Most engagement wins', 'size': 64, 'gold': True, 'gap': 28},
            {'text': 'Quote-retweet our week 6 announcement with anything true about '
                     'using HivePulse.',
             'size': 33, 'weight': 'semi', 'gap': 22},
            {'text': 'Your score screenshot.  ·  What surprised you.  ·  One sentence '
                     'you would rewrite.',
             'size': 30, 'weight': 'reg', 'color': bs.INK_2, 'gap': 26},
            {'text': 'Likes + reposts + replies, counted 8 September. No taste, no '
                     'debate, no judging panel.',
             'size': 30, 'weight': 'reg', 'color': bs.INK_2, 'gap': 24},
            {'text': 'Nobody won it last round. It rolled over.', 'size': 31,
             'weight': 'semi', 'color': bs.EMERALD},
        ],
    },
    {   # Sat -- the saveable teaching card. Alt text, because week 5's runner-up won the
        # media points outright with 24 described photos and it is the least-known rule.
        'name': 'w6-images', 'seed': 89, 'bloom': (0.92, 0.24), 'intensity': 0.84,
        'blocks': [
            {'text': 'THE RULE ALMOST NOBODY KNOWS', 'size': 31, 'weight': 'semi',
             'color': bs.EMERALD, 'gap': 24},
            {'text': 'Your images are text too', 'size': 64, 'gold': True, 'gap': 30},
            {'text': 'Search engines and screen readers both read the description you '
                     'attach to an image. A filename is not a description.',
             'size': 32, 'weight': 'reg', 'color': bs.INK_2, 'gap': 22},
            {'text': 'Costs you the points:   ![IMG_1234.png](url)',
             'size': 31, 'weight': 'semi', 'color': bs.CRIMSON, 'gap': 16},
            {'text': 'Earns them:   ![a hiking trail at sunset](url)',
             'size': 31, 'weight': 'semi', 'color': bs.EMERALD, 'gap': 26},
            {'text': 'Our week 5 runner-up did this on all 24 photos and scored 97.',
             'size': 31, 'weight': 'semi', 'color': bs.INK},
        ],
    },
    {   # Sun -- referral, now with proof rather than a promise. It paid twice last round,
        # which is a far better argument than explaining the mechanic again.
        'name': 'w6-referral', 'seed': 103,
        'blocks': [
            {'text': 'IT ACTUALLY PAID OUT LAST ROUND', 'size': 30, 'weight': 'semi',
             'color': bs.GOLD_HI, 'gap': 26},
            {'text': 'Bring one person, both get 25', 'size': 58, 'gold': True, 'gap': 28},
            {'text': '@cositav brought @cayitus63  →  25 HIVE each',
             'size': 33, 'weight': 'semi', 'color': bs.EMERALD, 'gap': 16},
            {'text': '@nabbas0786 brought @les90  →  25 HIVE each, and @les90 finished 3rd',
             'size': 33, 'weight': 'semi', 'color': bs.EMERALD, 'gap': 26},
            {'text': 'They write "referred by @you" in their entry. If it qualifies, you '
                     'are both paid on top of anything you win.',
             'size': 30, 'weight': 'reg', 'color': bs.INK_2, 'gap': 22},
            {'text': 'A bigger field also raises the pool everyone competes for.',
             'size': 31, 'weight': 'semi', 'color': bs.INK},
        ],
    },
    {   # Tue -- close.
        'name': 'w6-final', 'seed': 127, 'bloom': (0.86, 0.34), 'intensity': 1.0,
        'blocks': [
            {'text': 'FINAL DAY', 'size': 32, 'weight': 'semi',
             'color': bs.CRIMSON, 'gap': 24},
            {'text': 'Closes today, 12:00 UTC', 'size': 62, 'gold': True, 'gap': 30},
            {'text': 'Publish a new post with the analyzer open', 'size': 33,
             'weight': 'reg', 'color': bs.INK_2, 'gap': 14},
            {'text': 'Comment your link and your score screenshot', 'size': 33,
             'weight': 'reg', 'color': bs.INK_2, 'gap': 14},
            {'text': 'Tag it #hivepulse — it has cost someone their entry in 4 of 5 rounds',
             'size': 33, 'weight': 'reg', 'color': bs.INK_2, 'gap': 14},
            {'text': 'SEO 70 or above to qualify', 'size': 33, 'weight': 'reg',
             'color': bs.INK_2, 'gap': 28},
            {'text': 'Referred by someone? Write "referred by @name".', 'size': 31,
             'weight': 'semi', 'color': bs.GOLD_HI},
        ],
    },
]

if __name__ == '__main__':
    for c in CARDS:
        p, kb = render(c)
        print(f'  {p}  {kb:.0f} KB')
    print(f'\n{len(CARDS)} cards written.')
