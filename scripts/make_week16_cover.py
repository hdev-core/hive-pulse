#!/usr/bin/env python3
"""Render the Week 16 HivePulse contest cover.

Week 15 fell one entrant short of the five-entrant threshold, so nothing was paid and the
pool rolled. That makes 600 HIVE the single most useful thing on this card, and the reason
it is 600 is the second most useful: last round missed paying by one person. Everything
else is subordinate, so the tier strip from week 15 is gone and the number carries the
design.

The ask is one line and it is the whole point: five entrants. Four showed up last week.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1920, 1080
OUT = 'enhancements/images/contest-week16-cover.jpg'
SHADOW = (10, 16, 34)
WARN = (226, 72, 72)


def main():
    im = bs.gold_ground(W, H, bloom=(0.5, 0.34), intensity=1.12, seed=161)
    d = ImageDraw.Draw(im)
    bs.badge(im, 92, 74, d=104)
    d.text((222, 92), 'HIVEPULSE', font=bs.font('bold', 40), fill=bs.GOLD_HI,
           stroke_width=4, stroke_fill=SHADOW)
    d.text((222, 138), 'SEO CONTEST', font=bs.font('semi', 34), fill=bs.INK_2,
           stroke_width=4, stroke_fill=SHADOW)

    # ── the number, carrying the whole card
    bs.gold_text(im, (W // 2, 252), '600 HIVE', bs.font('bold', 210), anchor='ma', stroke=11)
    d.text((W // 2, 496), 'The biggest pool this contest has ever had.',
           font=bs.font('semi', 40), fill=bs.INK, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)

    # ── why it is 600
    band_y = 580
    for y in (band_y, band_y + 128):
        d.line([(170, y), (W - 170, y)], fill=bs.GOLD, width=3)
    d.text((W // 2, band_y + 22), 'BECAUSE NOBODY WAS PAID LAST ROUND',
           font=bs.font('semi', 32), fill=(255, 160, 160), anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, band_y + 64), 'Four writers entered. We needed five.',
                 bs.font('bold', 48), anchor='ma', stroke=6)

    # ── the ask
    ask_y = band_y + 172
    d.text((W // 2, ask_y), 'FIVE ENTRANTS UNLOCKS IT.  UNDER FIVE AND IT WAITS AGAIN.',
           font=bs.font('bold', 36), fill=bs.INK, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)
    d.text((W // 2, ask_y + 52),
           'Three entries scored a perfect 200/200 last week and went home with nothing.',
           font=bs.font('reg', 30), fill=bs.INK_2, anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)

    # ── side prizes
    by = ask_y + 132
    for i, (head, sub) in enumerate([
        ('+25 HIVE', 'REFERRAL BONUS  ·  paid to BOTH of you'),
        ('50 HIVE', 'MOST ENGAGED QUOTE-RT ON X  ·  @HdevCore'),
    ]):
        cx = W // 4 + i * (W // 2)
        bs.gold_text(im, (cx, by), head, bs.font('bold', 48), anchor='ma', stroke=5)
        d.text((cx, by + 62), sub, font=bs.font('semi', 25), fill=bs.INK_2, anchor='ma',
               stroke_width=4, stroke_fill=SHADOW)
    d.line([(W // 2, by + 4), (W // 2, by + 84)], fill=(72, 88, 120), width=2)

    d.text((W // 2, H - 48), 'Week 16 closes 17 November 2026, 12:00 UTC   ·   Tag #hivepulse',
           font=bs.font('semi', 29), fill=bs.INK_2, anchor='mm',
           stroke_width=5, stroke_fill=SHADOW)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'  {OUT}  {os.path.getsize(OUT)/1024:.0f} KB  {W}x{H}')


if __name__ == '__main__':
    main()
