#!/usr/bin/env python3
"""Render the Week 11 HivePulse contest cover.

Same furniture as weeks 6-10 so the series stays recognisable, with one addition: a
full-width band for the rule change. Week 11 retires word count as the tiebreak, and that
is the news of the round - five entries tied on a perfect 200 in each of the last two
rounds, and the winning post went 1,730 -> 3,217 -> 7,569 words. The band gets its own
gold rule above and below so it reads as an announcement rather than another prize tier.

The three prize boxes lose 40px of height to make room; everything else is unchanged.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1920, 1080
OUT = 'enhancements/images/contest-week11-cover.jpg'
SHADOW = (10, 16, 34)
TIERS = [
    ('300', 'HIVE', 'under 10 entrants', '150 / 100 / 50'),
    ('400', 'HIVE', '10 - 19 entrants', '200 / 100 / 60 / 40'),
    ('500', 'HIVE', '20+ entrants', '250 / 120 / 80 / 50'),
]


def main():
    im = bs.gold_ground(W, H, bloom=(0.5, 0.30), intensity=1.0, seed=111)
    d = ImageDraw.Draw(im)
    bs.badge(im, 92, 74, d=104)
    d.text((222, 92), 'HIVEPULSE', font=bs.font('bold', 40), fill=bs.GOLD_HI,
           stroke_width=4, stroke_fill=SHADOW)
    d.text((222, 138), 'SEO CONTEST', font=bs.font('semi', 34), fill=bs.INK_2,
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, 236), 'WEEK 11 IS OPEN', bs.font('bold', 112),
                 anchor='ma', stroke=8)
    d.text((W // 2, 370), 'Optimize your next Hive post. The pool grows with the field.',
           font=bs.font('reg', 36), fill=bs.INK_2, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)

    # ── prize tiers
    top, box_h = 430, 256
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
        bs.gold_text(im, (cx, top + 34), amount, bs.font('bold', 90), anchor='ma', stroke=6)
        d.text((cx, top + 136), unit, font=bs.font('bold', 38), fill=bs.INK,
               anchor='ma', stroke_width=4, stroke_fill=SHADOW)
        d.text((cx, top + 184), who, font=bs.font('semi', 28), fill=bs.INK_2, anchor='ma')
        d.text((cx, top + 218), split, font=bs.font('reg', 25), fill=bs.INK_3, anchor='ma')

    # ── the rule change, set apart by a gold rule above and below
    band_y = top + box_h + 40
    for y in (band_y, band_y + 112):
        d.line([(margin, y), (W - margin, y)], fill=bs.GOLD, width=3)
    d.text((W // 2, band_y + 20), 'NEW TIEBREAK  ·  WORD COUNT IS RETIRED',
           font=bs.font('semi', 30), fill=bs.INK_2, anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, band_y + 58), 'Tied on score? Closest to Reading Ease 60 wins.',
                 bs.font('bold', 44), anchor='ma', stroke=6)

    # ── side prizes
    by = band_y + 152
    for i, (head, sub) in enumerate([
        ('+25 HIVE', 'REFERRAL BONUS  ·  paid to BOTH of you'),
        ('50 HIVE', 'MOST ENGAGED QUOTE-RT ON X  ·  @HdevCore'),
    ]):
        cx = W // 4 + i * (W // 2)
        bs.gold_text(im, (cx, by), head, bs.font('bold', 50), anchor='ma', stroke=5)
        d.text((cx, by + 66), sub, font=bs.font('semi', 26), fill=bs.INK_2, anchor='ma',
               stroke_width=4, stroke_fill=SHADOW)
    d.line([(W // 2, by + 4), (W // 2, by + 88)], fill=(72, 88, 120), width=2)

    d.text((W // 2, H - 56), 'Closes 13 October 2026, 12:00 UTC   ·   Tag #hivepulse',
           font=bs.font('semi', 30), fill=bs.INK_2, anchor='mm',
           stroke_width=5, stroke_fill=SHADOW)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'  {OUT}  {os.path.getsize(OUT)/1024:.0f} KB  {W}x{H}')


if __name__ == '__main__':
    main()
