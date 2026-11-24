#!/usr/bin/env python3
"""Render the Week 18 HivePulse contest cover.

Week 17's pool was 300 against week 16's 600, so a bare prize number as the hero would
read as a contest shrinking - true of the pool, false of the round, which actually paid
450 once the X prize and the first referrals since week 10 are counted.

So the hero is the story instead: HALF A POINT. Every entry scored GEO 100, which means
readability alone separated the field and one point of reading ease put two writers off
the podium. That is memorable, it is specific, and it tells people what to work on this
week in three words. The money goes in the band below it, where 450 can be stated without
being mistaken for the pool.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1920, 1080
OUT = 'enhancements/images/contest-week18-cover.jpg'
SHADOW = (10, 16, 34)
GREEN = (140, 228, 160)


def main():
    im = bs.gold_ground(W, H, bloom=(0.5, 0.34), intensity=1.12, seed=181)
    d = ImageDraw.Draw(im)
    bs.badge(im, 92, 74, d=104)
    d.text((222, 92), 'HIVEPULSE', font=bs.font('bold', 40), fill=bs.GOLD_HI,
           stroke_width=4, stroke_fill=SHADOW)
    d.text((222, 138), 'SEO CONTEST', font=bs.font('semi', 34), fill=bs.INK_2,
           stroke_width=4, stroke_fill=SHADOW)

    # ── the story, not the prize
    bs.gold_text(im, (W // 2, 244), 'HALF A POINT', bs.font('bold', 190), anchor='ma', stroke=11)
    d.text((W // 2, 470), 'decided week 17. Every entry scored GEO 100.',
           font=bs.font('semi', 40), fill=bs.INK, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)

    # ── what actually separated them
    band_y = 552
    for y in (band_y, band_y + 128):
        d.line([(170, y), (W - 170, y)], fill=bs.GOLD, width=3)
    d.text((W // 2, band_y + 22), 'SO READING EASE ALONE SEPARATED THE FIELD',
           font=bs.font('semi', 32), fill=GREEN, anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, band_y + 64), '450 HIVE paid  ·  three tied on a perfect 200/200',
                 bs.font('bold', 44), anchor='ma', stroke=6)

    # ── the ask
    ask_y = band_y + 172
    d.text((W // 2, ask_y), 'WEEK 18 IS OPEN  ·  300 HIVE AT FIVE ENTRANTS, 600 AT TWENTY',
           font=bs.font('bold', 36), fill=bs.INK, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)
    d.text((W // 2, ask_y + 52),
           'Shorter sentences. Reading ease is the number still doing real work.',
           font=bs.font('reg', 30), fill=bs.INK_2, anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)

    # ── side prizes. The referral line changed this week, so say the new rule.
    by = ask_y + 132
    for i, (head, sub) in enumerate([
        ('+25 HIVE', 'REFERRAL  ·  BOTH of you  ·  NO account-age limit'),
        ('50 HIVE', 'MOST ENGAGED QUOTE-RT ON X  ·  @HdevCore'),
    ]):
        cx = W // 4 + i * (W // 2)
        bs.gold_text(im, (cx, by), head, bs.font('bold', 48), anchor='ma', stroke=5)
        d.text((cx, by + 62), sub, font=bs.font('semi', 24), fill=bs.INK_2, anchor='ma',
               stroke_width=4, stroke_fill=SHADOW)
    d.line([(W // 2, by + 4), (W // 2, by + 84)], fill=(72, 88, 120), width=2)

    d.text((W // 2, H - 48), 'Week 18 closes 1 December 2026, 12:00 UTC   ·   Tag #hivepulse',
           font=bs.font('semi', 29), fill=bs.INK_2, anchor='mm',
           stroke_width=5, stroke_fill=SHADOW)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'  {OUT}  {os.path.getsize(OUT)/1024:.0f} KB  {W}x{H}')


if __name__ == '__main__':
    main()
