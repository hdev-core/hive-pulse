#!/usr/bin/env python3
"""
Week-6 contest cover, drawn in the HivePulse house style.

    python scripts/make_week6_cover.py

Writes enhancements/images/contest-week6-cover.jpg at 1920x1080.

Composed rather than generated: the ladder numbers have to be exactly right, and a cover
carrying wrong prize figures is permanent once it is on-chain. Also means no provenance
watermark and no cost to re-render if a number changes.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1920, 1080
OUT = 'enhancements/images/contest-week6-cover.jpg'
SHADOW = (10, 16, 34)

TIERS = [
    ('300', 'HIVE', 'under 10 entrants', '150 / 100 / 50'),
    ('400', 'HIVE', '10 - 19 entrants', '200 / 100 / 60 / 40'),
    ('500', 'HIVE', '20+ entrants', '250 / 120 / 80 / 50'),
]


def main():
    im = bs.gold_ground(W, H, bloom=(0.5, 0.30), intensity=1.0, seed=61)
    d = ImageDraw.Draw(im)

    # ── masthead
    bs.badge(im, 92, 74, d=104)
    d.text((222, 92), 'HIVEPULSE', font=bs.font('bold', 40), fill=bs.GOLD_HI,
           stroke_width=4, stroke_fill=SHADOW)
    d.text((222, 138), 'SEO CONTEST', font=bs.font('semi', 34), fill=bs.INK_2,
           stroke_width=4, stroke_fill=SHADOW)

    bs.gold_text(im, (W // 2, 250), 'WEEK 6 IS OPEN', bs.font('bold', 112),
                 anchor='ma', stroke=8)
    d.text((W // 2, 386), 'Optimize your next Hive post. The pool grows with the field.',
           font=bs.font('reg', 36), fill=bs.INK_2, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)

    # ── prize ladder
    top, box_h = 470, 300
    gap, margin = 34, 110
    box_w = (W - margin * 2 - gap * 2) // 3
    for i, (amount, unit, who, split) in enumerate(TIERS):
        x = margin + i * (box_w + gap)
        live = i == 0
        panel = Image.new('RGBA', (box_w, box_h), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle(
            [0, 0, box_w - 1, box_h - 1], radius=22,
            fill=(12, 20, 38, 224),
            outline=(bs.GOLD + (255,)) if live else (72, 88, 120, 255),
            width=4 if live else 2)
        im.paste(panel, (x, top), panel)

        cx = x + box_w // 2
        bs.gold_text(im, (cx, top + 46), amount, bs.font('bold', 96), anchor='ma', stroke=6)
        d.text((cx, top + 156), unit, font=bs.font('bold', 40), fill=bs.INK,
               anchor='ma', stroke_width=4, stroke_fill=SHADOW)
        d.text((cx, top + 212), who, font=bs.font('semi', 29), fill=bs.INK_2, anchor='ma')
        d.text((cx, top + 252), split, font=bs.font('reg', 26), fill=bs.INK_3, anchor='ma')

    # ── the two side prizes
    by = top + box_h + 52
    for i, (head, sub) in enumerate([
        ('+25 HIVE', 'REFERRAL BONUS  ·  paid to BOTH of you'),
        ('50 HIVE', 'MOST ENGAGED QUOTE-RT ON X  ·  @HdevCore'),
    ]):
        cx = W // 4 + i * (W // 2)
        bs.gold_text(im, (cx, by), head, bs.font('bold', 54), anchor='ma', stroke=5)
        d.text((cx, by + 72), sub, font=bs.font('semi', 27), fill=bs.INK_2, anchor='ma',
               stroke_width=4, stroke_fill=SHADOW)
    d.line([(W // 2, by + 6), (W // 2, by + 96)], fill=(72, 88, 120), width=2)

    d.text((W // 2, H - 62), 'Closes 8 September 2026, 23:59 UTC   ·   Tag #hivepulse',
           font=bs.font('semi', 30), fill=bs.INK_2, anchor='mm',
           stroke_width=5, stroke_fill=SHADOW)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'  {OUT}  {os.path.getsize(OUT)/1024:.0f} KB  {W}x{H}')


if __name__ == '__main__':
    main()
