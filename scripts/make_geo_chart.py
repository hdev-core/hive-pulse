#!/usr/bin/env python3
"""
Dumbbell chart: SEO score vs GEO (AI-quotability) across every scored contest post.

The story is the GAP between the two measures, so rows are sorted by gap descending
and each post gets one connected pair. Posts are unlabelled — the distribution is the
point, and naming individuals next to a low score adds nothing analytically.

Palette validated with the dataviz skill's validator against a dark surface:
  #d95926 / #199e70 — lightness band PASS, chroma PASS, CVD deutan dE 9.4 PASS,
  normal-vision dE 26.5 PASS, contrast PASS.

    python scripts/make_geo_chart.py
"""

from PIL import Image, ImageDraw, ImageFont
import csv, os

W, H = 1600, 900
OUT = 'enhancements/images/social/geo-vs-seo.jpg'

SURFACE = (15, 23, 42)
INK     = (240, 244, 250)
INK_2   = (166, 178, 196)
INK_3   = (104, 118, 138)
SEO_C   = (217, 89, 38)     # #d95926
GEO_C   = (25, 158, 112)    # #199e70
GRID    = (34, 45, 66)

F = {'bold': ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
     'semi': ['C:/Windows/Fonts/seguisb.ttf', 'C:/Windows/Fonts/segoeuib.ttf'],
     'reg':  ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf']}
_c = {}
def font(w, s):
    k = (w, s)
    if k not in _c:
        for p in F[w]:
            if os.path.exists(p):
                _c[k] = ImageFont.truetype(p, s); break
        else:
            _c[k] = ImageFont.load_default()
    return _c[k]


def load():
    rows = []
    for f in ('contest-results-week1.csv', 'contest-results-week2.csv'):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            rows.append((int(r['seo_pct']), int(r['geo_score'])))
    return sorted(rows, key=lambda t: -(t[0] - t[1]))     # widest gap first


def main():
    data = load()
    im = Image.new('RGB', (W, H), SURFACE)
    d = ImageDraw.Draw(im)

    # ── header
    d.text((100, 74), 'SEO score barely predicts whether an AI will quote you',
           font=font('bold', 48), fill=INK)
    d.text((100, 140),
           f'{len(data)} Hive posts, each scored on both axes. Correlation r = 0.73 — '
           'SEO explains just over half of GEO.',
           font=font('reg', 27), fill=INK_2)

    # ── plot geometry
    x0, x1 = 250, W - 150
    y0, y1 = 232, H - 132
    lo, hi = 40, 100
    sx = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)
    step = (y1 - y0) / len(data)

    # recessive grid + axis labels
    for v in range(lo, hi + 1, 10):
        d.line([(sx(v), y0 - 12), (sx(v), y1 + 6)], fill=GRID, width=1)
        d.text((sx(v), y1 + 16), str(v), font=font('reg', 22), fill=INK_3, anchor='ma')

    # ── dumbbells
    for i, (seo, geo) in enumerate(data):
        y = y0 + step * i + step / 2
        a, b = sx(min(seo, geo)), sx(max(seo, geo))
        d.line([(a, y), (b, y)], fill=(58, 72, 98), width=2)
        for val, col in ((geo, GEO_C), (seo, SEO_C)):
            cx = sx(val); r = 7
            # 2px surface ring so overlapping marks stay separable
            d.ellipse([cx - r - 2, y - r - 2, cx + r + 2, y + r + 2], fill=SURFACE)
            d.ellipse([cx - r, y - r, cx + r, y + r], fill=col)

    # ── selective direct labels: only the widest gap, which carries the headline
    seo, geo = data[0]
    y = y0 + step / 2
    d.text((sx(geo) - 18, y), str(geo), font=font('bold', 25), fill=GEO_C, anchor='rm')
    d.text((sx(seo) + 18, y), str(seo), font=font('bold', 25), fill=SEO_C, anchor='lm')
    d.text((100, y), 'widest gap', font=font('semi', 22), fill=INK_3, anchor='lm')

    # ── legend (always present for 2 series)
    lx, ly = 100, H - 66
    for label, col in (('SEO score', SEO_C), ('GEO / AI-quotability', GEO_C)):
        d.ellipse([lx, ly - 7, lx + 14, ly + 7], fill=col)
        d.text((lx + 24, ly), label, font=font('semi', 24), fill=INK_2, anchor='lm')
        lx += int(d.textlength(label, font=font('semi', 24))) + 78

    d.text((W - 100, H - 66), 'HivePulse  ·  @HdevCore',
           font=font('semi', 24), fill=INK_3, anchor='rm')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'JPEG', quality=90, optimize=True, progressive=True)
    print(f'{OUT}  {os.path.getsize(OUT)/1024:.0f} KB   ({len(data)} posts, '
          f'widest gap {data[0][0]-data[0][1]} pts)')


if __name__ == '__main__':
    main()
