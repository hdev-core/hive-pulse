#!/usr/bin/env python3
"""
Week-5 text cards for @HdevCore, in the HivePulse house style.

Drawn entirely in code on top of scripts/brand_style.py -- the same warm gold bloom,
tumbling mosaic and crimson badge the contest covers use. No model-generated artwork,
so there is no provenance watermark, no per-image cost, and no proof-reading pass
before a card can be reused.

    python scripts/make_week5_cards.py

Outputs 1600x900 JPEGs into enhancements/images/social/.
Run from the repository root; brand_style resolves the logo relatively.

A block may set 'gold': True for the dimensional gradient-and-stroke treatment. Use it
once per card, on the line that has to survive being seen at thumbnail size.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1600, 900
OUTDIR = 'enhancements/images/social'
SHADOW = (10, 16, 34)


def wrap(d, text, fnt, max_w):
    words, lines, cur = text.split(), [], ''
    for w in words:
        trial = f'{cur} {w}'.strip()
        if d.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def render(card):
    im = bs.gold_ground(W, H, bloom=card.get('bloom', (0.88, 0.30)),
                        intensity=card.get('intensity', 0.92),
                        seed=card.get('seed', 5))
    d = ImageDraw.Draw(im)
    x = 110
    max_w = card.get('max_w', 980)

    measured = []
    for b in card['blocks']:
        fnt = bs.font(b.get('weight', 'bold'), b['size'])
        lines = wrap(d, b['text'], fnt, max_w)
        lh = b.get('lh', round(b['size'] * 1.24))
        measured.append((b, fnt, lines, lh))

    total = sum(len(l) * lh + b.get('gap', 22) for b, f, l, lh in measured)
    total -= measured[-1][0].get('gap', 22)

    y = (H - total) // 2 - 26
    top_y = y

    for b, fnt, lines, lh in measured:
        for line in lines:
            if b.get('gold'):
                bs.gold_text(im, (x, y), line, fnt, stroke=5)
            else:
                # Every label carries a dark stroke. The ground is warm and uneven, and
                # flat text dissolves into the bloom wherever a tile lands behind it.
                d.text((x, y), line, font=fnt, fill=b.get('color', bs.INK),
                       stroke_width=b.get('stroke', 4), stroke_fill=SHADOW)
            y += lh
        y += b.get('gap', 22)

    bar_h = max(1, int(y - measured[-1][0].get('gap', 22) - top_y))
    bar = Image.new('RGB', (1, bar_h))
    bp = bar.load()
    for i in range(bar_h):
        t = i / max(1, bar_h - 1)
        bp[0, i] = tuple(round(bs.GOLD_HI[k] + (bs.GOLD_LO[k] - bs.GOLD_HI[k]) * t)
                         for k in range(3))
    im.paste(bar.resize((9, bar_h)), (x - 34, int(top_y) + 6))

    bs.badge(im, x, H - 118, d=72)
    bs.wordmark(im, x + 92, H - 110, size=32)

    os.makedirs(OUTDIR, exist_ok=True)
    path = os.path.join(OUTDIR, card['name'] + '.jpg')
    im.save(path, 'JPEG', quality=90, optimize=True, progressive=True)
    return path, os.path.getsize(path) / 1024


CARDS = [
    {   # Fri -- the friction remover. Ship news framed as "the hard part is gone".
        # Wording stays neutral about store availability: submitted is not live.
        'name': 'w5-keyword', 'seed': 11,
        'blocks': [
            {'text': 'HIVEPULSE v1.13.1', 'size': 31, 'weight': 'semi',
             'color': bs.GOLD_HI, 'gap': 24},
            {'text': 'It picks the keyword for you', 'size': 64, 'gold': True, 'gap': 30},
            {'text': 'The focus keyword is worth 35 of the 100 SEO points, and choosing '
                     'it was the step people got wrong most.',
             'size': 32, 'weight': 'reg', 'color': bs.INK_2, 'gap': 20},
            {'text': 'Press suggest. It reads your draft, ranks the candidates, and '
                     'scores each one before you commit.',
             'size': 32, 'weight': 'reg', 'color': bs.INK_2, 'gap': 28},
            {'text': 'Free. Chrome, Firefox, Opera, Brave, Edge.', 'size': 31,
             'weight': 'semi', 'color': bs.EMERALD},
        ],
    },
    {   # Sat -- the most saveable artifact of the week. No product mentioned on purpose:
        # it has to be worth keeping to someone who will never install anything.
        'name': 'w5-audit', 'seed': 23, 'bloom': (0.92, 0.22), 'intensity': 0.82,
        'blocks': [
            {'text': 'NO TOOL REQUIRED', 'size': 31, 'weight': 'semi',
             'color': bs.EMERALD, 'gap': 24},
            {'text': 'The 30-second audit', 'size': 64, 'gold': True, 'gap': 32},
            {'text': '1.  Read your first sentence alone. Does it answer the title, '
                     'or clear its throat?',
             'size': 33, 'weight': 'semi', 'gap': 18},
            {'text': '2.  Find a sentence starting with This or It. Read it alone. '
                     'Does it still mean anything?',
             'size': 33, 'weight': 'semi', 'gap': 18},
            {'text': '3.  Count the times you wrote "it" where the noun would fit.',
             'size': 33, 'weight': 'semi', 'gap': 28},
            {'text': 'That is essentially the whole AI-quotability score.',
             'size': 31, 'weight': 'reg', 'color': bs.INK_2},
        ],
    },
    {   # Sun -- the referral mechanic as arithmetic. Bringing someone is not altruism:
        # it pays twice, and the second payment is the tier.
        'name': 'w5-referral', 'seed': 37,
        'blocks': [
            {'text': 'WHY BRINGING A FRIEND PAYS YOU TWICE', 'size': 30, 'weight': 'semi',
             'color': bs.GOLD_HI, 'gap': 26},
            {'text': 'They write "referred by @you"', 'size': 58, 'gold': True, 'gap': 28},
            {'text': 'Their post qualifies  →  you get 25 HIVE, they get 25 HIVE',
             'size': 34, 'weight': 'semi', 'color': bs.EMERALD, 'gap': 16},
            {'text': 'The field grows  →  the pool everyone competes for grows',
             'size': 34, 'weight': 'semi', 'color': bs.EMERALD, 'gap': 28},
            {'text': 'Two referrals each. They have to be genuinely new and the entry '
                     'has to be real. We check both.',
             'size': 30, 'weight': 'reg', 'color': bs.INK_2, 'gap': 22},
            {'text': 'The only contest mechanic where helping a rival pays you.',
             'size': 31, 'weight': 'semi', 'color': bs.INK},
        ],
    },
    {   # Tue -- close. Deliberately plain: nobody needs persuading at this point,
        # they need the four steps and the deadline.
        'name': 'w5-final', 'seed': 53, 'bloom': (0.86, 0.34), 'intensity': 1.0,
        'blocks': [
            {'text': 'FINAL DAY', 'size': 32, 'weight': 'semi',
             'color': bs.CRIMSON, 'gap': 24},
            {'text': 'Closes tonight, 23:59 UTC', 'size': 62, 'gold': True, 'gap': 30},
            {'text': 'Publish a new post with the analyzer open', 'size': 33,
             'weight': 'reg', 'color': bs.INK_2, 'gap': 14},
            {'text': 'Comment your link and your score screenshot', 'size': 33,
             'weight': 'reg', 'color': bs.INK_2, 'gap': 14},
            {'text': 'Tag it #hivepulse — enforced, and it has decided podiums',
             'size': 33, 'weight': 'reg', 'color': bs.INK_2, 'gap': 14},
            {'text': 'SEO 70 or above to qualify', 'size': 33, 'weight': 'reg',
             'color': bs.INK_2, 'gap': 28},
            {'text': 'Referred by someone? Add "referred by @name".', 'size': 31,
             'weight': 'semi', 'color': bs.GOLD_HI},
        ],
    },
]

if __name__ == '__main__':
    for c in CARDS:
        p, kb = render(c)
        print(f'  {p}  {kb:.0f} KB')
    print(f'\n{len(CARDS)} cards written.')
