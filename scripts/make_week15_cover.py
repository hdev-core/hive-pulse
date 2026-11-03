#!/usr/bin/env python3
"""Render the Week 15 HivePulse contest cover.

The furniture changes this round because the offer changes. Weeks 12-14 showed a three-tier
ladder (300 / 400 / 500) where the bottom tier was always the live one, because the field
has never once exceeded nine. That made the upper tiers decoration.

From week 16 the pool depends on the field in BOTH directions, so the card that matters is
the one on the left: under five entrants, nothing is paid and the pool rolls over. That is
the news, it is the thing a reader has to act on, and it is deliberately the first box they
read rather than a footnote under the prizes.

Five tiers now instead of three, so the boxes are narrower; the "under 5" box is outlined in
red rather than gold because it is a warning, not an offer. The splits must match the table in
the post exactly - an earlier draft showed four tiers against the post's five.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1920, 1080
OUT = 'enhancements/images/contest-week15-cover.jpg'
SHADOW = (10, 16, 34)
WARN = (226, 72, 72)

# (amount, unit, who, split, is_warning)
TIERS = [
    ('0', 'HIVE', 'under 5', 'pool rolls over', True),
    ('300', 'HIVE', '5 - 9', '150 / 100 / 50', False),
    ('400', 'HIVE', '10 - 14', '200 / 100 / 60 / 40', False),
    ('500', 'HIVE', '15 - 19', '250 / 120 / 80 / 50', False),
    ('600', 'HIVE', '20 or more', '250 / 150 / 100 / 60 / 40', False),
]


def main():
    im = bs.gold_ground(W, H, bloom=(0.5, 0.30), intensity=1.0, seed=151)
    d = ImageDraw.Draw(im)
    bs.badge(im, 92, 74, d=104)
    d.text((222, 92), 'HIVEPULSE', font=bs.font('bold', 40), fill=bs.GOLD_HI,
           stroke_width=4, stroke_fill=SHADOW)
    d.text((222, 138), 'SEO CONTEST', font=bs.font('semi', 34), fill=bs.INK_2,
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, 232), 'THE POOL NOW GROWS WITH YOU', bs.font('bold', 96),
                 anchor='ma', stroke=8)
    d.text((W // 2, 356), 'From week 16 the prize depends on how many of us turn up.',
           font=bs.font('reg', 36), fill=bs.INK_2, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)

    # ── four tiers
    top, box_h = 420, 250
    gap, margin = 20, 90
    box_w = (W - margin * 2 - gap * 4) // 5
    for i, (amount, unit, who, split, warn) in enumerate(TIERS):
        x = margin + i * (box_w + gap)
        panel = Image.new('RGBA', (box_w, box_h), (0, 0, 0, 0))
        ImageDraw.Draw(panel).rounded_rectangle(
            [0, 0, box_w - 1, box_h - 1], radius=22,
            fill=(34, 14, 14, 224) if warn else (12, 20, 38, 224),
            outline=(WARN + (255,)) if warn else (72, 88, 120, 255),
            width=4 if warn else 2)
        im.paste(panel, (x, top), panel)
        cx = x + box_w // 2
        if warn:
            d.text((cx, top + 30), amount, font=bs.font('bold', 86), fill=(255, 150, 150),
                   anchor='ma', stroke_width=6, stroke_fill=SHADOW)
        else:
            bs.gold_text(im, (cx, top + 30), amount, bs.font('bold', 86), anchor='ma', stroke=6)
        d.text((cx, top + 128), unit, font=bs.font('bold', 34),
               fill=(255, 170, 170) if warn else bs.INK, anchor='ma',
               stroke_width=4, stroke_fill=SHADOW)
        d.text((cx, top + 174), who + ' entrants', font=bs.font('semi', 23), fill=bs.INK_2, anchor='ma')
        d.text((cx, top + 208), split, font=bs.font('reg', 19),
               fill=(255, 150, 150) if warn else bs.INK_3, anchor='ma')

    # ── the two rule changes, set apart
    band_y = top + box_h + 36
    for y in (band_y, band_y + 112):
        d.line([(margin, y), (W - margin, y)], fill=bs.GOLD, width=3)
    d.text((W // 2, band_y + 20), 'TIES NOW SPLIT THE PRIZE  ·  NO MORE RACE TO PUBLISH FIRST',
           font=bs.font('semi', 29), fill=bs.INK_2, anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, band_y + 58), 'Take the week. Draft it, score it, then publish.',
                 bs.font('bold', 42), anchor='ma', stroke=6)

    # ── side prizes
    by = band_y + 150
    for i, (head, sub) in enumerate([
        ('+25 HIVE', 'REFERRAL BONUS  ·  paid to BOTH of you'),
        ('50 HIVE', 'MOST ENGAGED QUOTE-RT ON X  ·  @HdevCore'),
    ]):
        cx = W // 4 + i * (W // 2)
        bs.gold_text(im, (cx, by), head, bs.font('bold', 48), anchor='ma', stroke=5)
        d.text((cx, by + 62), sub, font=bs.font('semi', 25), fill=bs.INK_2, anchor='ma',
               stroke_width=4, stroke_fill=SHADOW)
    d.line([(W // 2, by + 4), (W // 2, by + 84)], fill=(72, 88, 120), width=2)

    d.text((W // 2, H - 52), 'Week 15 closes 10 November 2026, 12:00 UTC   ·   Tag #hivepulse',
           font=bs.font('semi', 29), fill=bs.INK_2, anchor='mm',
           stroke_width=5, stroke_fill=SHADOW)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'  {OUT}  {os.path.getsize(OUT)/1024:.0f} KB  {W}x{H}')


if __name__ == '__main__':
    main()
