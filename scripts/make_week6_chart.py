#!/usr/bin/env python3
"""
Scatter: SEO score against GEO (AI-quotability) for every scored contest post.

    python scripts/make_week6_chart.py

Writes enhancements/images/social/geo-vs-seo-week6.jpg at 1600x900.

Replaces a dumbbell chart that could not carry its own headline. The claim is about a
RELATIONSHIP between two measures, and a dumbbell shows 39 unlabelled gaps with the two
colours swapping sides depending on which score is higher — you had to already know the
conclusion to see it. A scatter with an equal-scores diagonal shows the claim directly:
every dot below the line is a post whose GEO lags its SEO.

The headline is stated as a range rather than as r, because "15 posts scored 90+ on SEO and
their GEO ran from 60 to 100" is the same fact as r = 0.60 and can be read without
statistics. Both appear; the range leads.

Palette #d95926 / #199e70 validated with the dataviz skill's validator against this dark
surface: lightness band PASS, chroma PASS, CVD deutan dE 9.4 PASS, normal-vision dE 26.5
PASS, contrast PASS.

Posts are unlabelled by name on purpose — the distribution is the point, and naming an
individual next to a low score adds nothing.
"""

from PIL import Image, ImageDraw, ImageFont
import csv, glob, os

W, H = 1600, 900
OUT = 'enhancements/images/social/geo-vs-seo-week6.jpg'

SURFACE = (15, 23, 42)
INK     = (240, 244, 250)
INK_2   = (166, 178, 196)
INK_3   = (104, 118, 138)
LAG_C   = (217, 89, 38)     # #d95926 — GEO lags SEO by 10+
OK_C    = (25, 158, 112)    # #199e70 — GEO keeps up
GRID    = (34, 45, 66)
BAND    = (24, 34, 56)

LAG_GAP = 10                # points of SEO-minus-GEO that counts as "lagging"

F = {'bold': ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
     'semi': ['C:/Windows/Fonts/seguisb.ttf', 'C:/Windows/Fonts/segoeuib.ttf'],
     'reg':  ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf']}
_c = {}


def font(w, s):
    k = (w, s)
    if k not in _c:
        for p in F[w]:
            if os.path.exists(p):
                _c[k] = ImageFont.truetype(p, s)
                break
        else:
            _c[k] = ImageFont.load_default()
    return _c[k]


def load():
    """Every archived round. Week 3's CSV was never archived, so this is 39 of the 46
    posts scored to date."""
    rows = []
    for f in sorted(glob.glob('contest-results-week*.csv')):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            rows.append((int(r['seo_pct']), int(r['geo_score'])))
    return rows


def pearson(data):
    n = len(data)
    mx = sum(a for a, _ in data) / n
    my = sum(b for _, b in data) / n
    num = sum((a - mx) * (b - my) for a, b in data)
    dx = sum((a - mx) ** 2 for a, _ in data) ** 0.5
    dy = sum((b - my) ** 2 for _, b in data) ** 0.5
    return num / (dx * dy) if dx and dy else 0.0


def main():
    data = load()
    r = pearson(data)
    hi = [b for a, b in data if a >= 90]

    im = Image.new('RGB', (W, H), SURFACE)
    d = ImageDraw.Draw(im)

    # ── header
    d.text((92, 62), 'A top SEO score does not mean an AI will quote you',
           font=font('bold', 46), fill=INK)
    d.text((92, 126),
           f'{len(data)} scored Hive posts. Each dot is one post: SEO across, GEO up. '
           'On the dashed line the two scores agree.',
           font=font('reg', 25), fill=INK_2)

    # ── plot geometry: square, because both axes are the same 0-100 unit
    lo, hi_ax = 40, 102
    x0, x1 = 150, 750
    y0, y1 = 212, 812
    sx = lambda v: x0 + (v - lo) / (hi_ax - lo) * (x1 - x0)
    sy = lambda v: y1 - (v - lo) / (hi_ax - lo) * (y1 - y0)

    # the 90+ SEO band this chart is an argument about
    d.rectangle([sx(90), y0, x1, y1], fill=BAND)

    # bottom of the band, not the top — the top is a row of dots at GEO 100
    d.text(((sx(90) + x1) // 2, y1 - 34), 'SEO 90+', font=font('semi', 18),
           fill=INK_3, anchor='ma')

    # recessive grid
    for v in range(40, 101, 10):
        d.line([(sx(v), y0), (sx(v), y1)], fill=GRID, width=1)
        d.line([(x0, sy(v)), (x1, sy(v))], fill=GRID, width=1)
        d.text((sx(v), y1 + 14), str(v), font=font('reg', 21), fill=INK_3, anchor='ma')
        d.text((x0 - 16, sy(v)), str(v), font=font('reg', 21), fill=INK_3, anchor='rm')

    # equal-scores diagonal
    for t in range(0, 62, 4):
        a, b = lo + t, lo + t + 2
        if b > 101:
            break
        d.line([(sx(a), sy(a)), (sx(b), sy(b))], fill=(70, 86, 116), width=2)
    d.text((sx(56) + 10, sy(56) - 26), 'SEO = GEO', font=font('semi', 19), fill=INK_3)

    # ── marks: 2px surface ring so coincident dots stay countable
    for a, b in sorted(data, key=lambda t: -(t[0] - t[1])):
        cx, cy = sx(a), sy(b)
        col = LAG_C if (a - b) >= LAG_GAP else OK_C
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=SURFACE)
        d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=col)

    # direct label on the single worst case only
    wa, wb = max(data, key=lambda t: t[0] - t[1])
    # down-left into clear space: up-right runs into the legend, left runs into
    # the neighbouring dots at SEO 67-78
    d.line([(sx(wa) - 4, sy(wb) + 10), (sx(wa) - 14, sy(wb) + 40)], fill=INK_3, width=1)
    d.text((sx(wa) - 16, sy(wb) + 44), f'SEO {wa}, GEO {wb}',
           font=font('bold', 20), fill=INK, anchor='ma')

    # axis titles
    d.text(((x0 + x1) // 2, y1 + 52), 'SEO score', font=font('semi', 23), fill=INK_2, anchor='ma')
    lab = Image.new('RGB', (150, 32), SURFACE)
    ImageDraw.Draw(lab).text((75, 16), 'GEO score', font=font('semi', 23), fill=INK_2, anchor='mm')
    im.paste(lab.rotate(90, expand=True), (x0 - 104, (y0 + y1) // 2 - 75))

    # ── right-hand panel: the argument in words
    px = 860
    d.text((px, 236), 'What the dots say', font=font('bold', 30), fill=INK)

    d.text((px, 300), f'{len(hi)} posts scored 90 or more for SEO.',
           font=font('semi', 26), fill=INK)
    d.text((px, 340), f'Their GEO scores ran from {min(hi)} to {max(hi)}.',
           font=font('semi', 26), fill=INK)
    d.text((px, 392),
           'Knowing a post scored well on SEO tells you\n'
           'almost nothing about whether an AI engine\n'
           'will quote it. The two are different jobs.',
           font=font('reg', 24), fill=INK_2, spacing=10)

    d.line([(px, 508), (px + 620, 508)], fill=GRID, width=1)

    lag_n = sum(1 for a, b in data if (a - b) >= LAG_GAP)
    d.ellipse([px, 540, px + 16, 556], fill=LAG_C)
    d.text((px + 30, 548), f'GEO lags SEO by {LAG_GAP}+  ({lag_n} posts)',
           font=font('semi', 23), fill=INK_2, anchor='lm')
    d.ellipse([px, 588, px + 16, 604], fill=OK_C)
    d.text((px + 30, 596), f'GEO keeps up  ({len(data) - lag_n} posts)',
           font=font('semi', 23), fill=INK_2, anchor='lm')

    d.text((px, 650), f'Correlation r = {r:.2f} — SEO explains about {r*r*100:.0f}%\nof GEO.',
           font=font('reg', 22), fill=INK_3, spacing=8)

    d.text((px, H - 60), 'HivePulse  ·  @HdevCore', font=font('semi', 22), fill=INK_3)

    im.save(OUT, quality=92, subsampling=0)
    print(f'  {OUT}  {os.path.getsize(OUT)//1024} KB   '
          f'({len(data)} posts, r={r:.2f}, {lag_n} lagging)')


if __name__ == '__main__':
    main()
