#!/usr/bin/env python3
"""Render the Week 17 HivePulse contest cover.

Week 16 is the first round where the five-entrant threshold actually paid, so the useful
thing on this card is proof that it pays - not the size of the new pool. Hence the hero
reads "600 HIVE PAID", in the past tense and with the word PAID attached to the number.

That tense matters more than it looks. Last week's card led with a bare "600 HIVE" and
week 17 is worth 300 at five entrants, so a bare number here would read as this week's
prize and be wrong by double. The ask line carries 300 on its own line, with the ceiling
next to it, and the two are never adjacent to the hero number.
"""

from PIL import Image, ImageDraw
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand_style as bs  # noqa: E402

W, H = 1920, 1080
OUT = 'enhancements/images/contest-week17-cover.jpg'
SHADOW = (10, 16, 34)
GREEN = (140, 228, 160)


def main():
    im = bs.gold_ground(W, H, bloom=(0.5, 0.34), intensity=1.12, seed=171)
    d = ImageDraw.Draw(im)
    bs.badge(im, 92, 74, d=104)
    d.text((222, 92), 'HIVEPULSE', font=bs.font('bold', 40), fill=bs.GOLD_HI,
           stroke_width=4, stroke_fill=SHADOW)
    d.text((222, 138), 'SEO CONTEST', font=bs.font('semi', 34), fill=bs.INK_2,
           stroke_width=4, stroke_fill=SHADOW)

    # ── the result, past tense so it cannot be read as this week's pool
    bs.gold_text(im, (W // 2, 244), '600 HIVE PAID', bs.font('bold', 186), anchor='ma', stroke=11)
    d.text((W // 2, 464), 'Five writers entered. The threshold is five. It paid.',
           font=bs.font('semi', 40), fill=bs.INK, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)

    # ── who, and the tie rule doing its job
    band_y = 548
    for y in (band_y, band_y + 128):
        d.line([(170, y), (W - 170, y)], fill=bs.GOLD, width=3)
    d.text((W // 2, band_y + 22), 'THREE ENTRIES TIED ON A PERFECT 200/200',
           font=bs.font('semi', 32), fill=GREEN, anchor='ma',
           stroke_width=4, stroke_fill=SHADOW)
    bs.gold_text(im, (W // 2, band_y + 64), '200 HIVE each  ·  a tie splits, it is not broken',
                 bs.font('bold', 44), anchor='ma', stroke=6)

    # ── the ask: this week's number, deliberately away from the hero
    ask_y = band_y + 172
    d.text((W // 2, ask_y), 'WEEK 17 IS OPEN  ·  300 HIVE AT FIVE ENTRANTS, 600 AT TWENTY',
           font=bs.font('bold', 36), fill=bs.INK, anchor='ma',
           stroke_width=5, stroke_fill=SHADOW)
    d.text((W // 2, ask_y + 52),
           'The pool follows the field. Five is the bar; below it nothing is paid.',
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

    d.text((W // 2, H - 48), 'Week 17 closes 24 November 2026, 12:00 UTC   ·   Tag #hivepulse',
           font=bs.font('semi', 29), fill=bs.INK_2, anchor='mm',
           stroke_width=5, stroke_fill=SHADOW)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'  {OUT}  {os.path.getsize(OUT)/1024:.0f} KB  {W}x{H}')


if __name__ == '__main__':
    main()
