#!/usr/bin/env python3
"""
Week-5 data images for @HdevCore.

Two charts, both drawn from real numbers rather than mocked up:

  w5-tier.jpg         the live prize-pool ladder and where the entry count sits on it
  w5-correlation.jpg  every scored contest post on both axes, with the correlation trend

The tier card is the workhorse of the week and is meant to be re-rendered as entries
come in, so the number on the card is never stale:

    python scripts/make_week5_charts.py --entries 7

Palette matches scripts/make_geo_chart.py so the whole account looks like one account.

Dataset note: weeks 1, 2 and 4 come from their CSVs, one row per post. The week-3 raw
CSV was overwritten before it was archived, so week 3 contributes the seven per-author
rows published in the week-4 announcement instead. Every row is a real published score;
the week-3 rows are best-per-author rather than every post.
"""

from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import csv, os, argparse

W, H = 1600, 900

SURFACE = (15, 23, 42)
INK     = (240, 244, 250)
INK_2   = (166, 178, 196)
INK_3   = (104, 118, 138)
SEO_C   = (217, 89, 38)
GEO_C   = (25, 158, 112)
AMBER   = (251, 191, 36)
GRID    = (34, 45, 66)
TRACK   = (30, 41, 59)

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


PLATES = 'enhancements/images/social/plates'


def ground(plate):
    """Chart background: a Gemini plate, cover-cropped and darkened hard.

    The plate is texture, not subject. Data marks have to stay the brightest thing on
    the canvas, so this darkens to roughly a fifth and lays a slate wash over the top --
    enough to read as the same visual system as the text cards, not enough to compete
    with a 6px dot. Falls back to flat slate if the plate is missing.
    """
    path = f'{PLATES}/{plate}.jpg'
    if not os.path.exists(path):
        return Image.new('RGB', (W, H), SURFACE)
    im = Image.open(path).convert('RGB')
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left, top = (im.width - W) // 2, (im.height - H) // 2
    im = im.crop((left, top, left + W, top + H))
    im = ImageEnhance.Brightness(im).enhance(0.22)
    return Image.blend(im, Image.new('RGB', (W, H), SURFACE), 0.55)


# --------------------------------------------------------------- tier ladder

TIERS = [
    (0,  10, '300 HIVE', '150 / 100 / 50',      'under 10 entrants'),
    (10, 20, '400 HIVE', '200 / 100 / 60 / 40', '10-19 entrants'),
    (20, 26, '500 HIVE', '250 / 120 / 80 / 50', '20+ entrants'),
]


def tier_card(entries, out):
    im = ground('plate-ascend')
    d = ImageDraw.Draw(im)

    if entries < 10:
        head = f'{10 - entries} more writers and every prize on this board goes up.'
    elif entries < 20:
        head = f'{20 - entries} more writers and the top prize becomes 250 HIVE.'
    else:
        head = 'Top tier unlocked. 500 HIVE on the board.'

    d.text((100, 74), head, font=font('bold', 50), fill=INK)
    d.text((100, 142),
           'The HivePulse SEO Contest pool scales with how many people enter. '
           'Not a target we hope to hit, a rule.',
           font=font('reg', 27), fill=INK_2)

    x0, x1 = 150, W - 150
    y = 452
    hgt = 34
    span = 26.0

    def sx(v):
        return x0 + (min(v, span) / span) * (x1 - x0)

    d.rounded_rectangle([x0, y, x1, y + hgt], radius=hgt // 2, fill=TRACK)

    for lo, hi, pool, split, label in TIERS:
        cx = (sx(lo) + sx(hi)) / 2
        live = lo <= entries < hi
        d.text((cx, y - 178), pool, font=font('bold', 56),
               fill=(INK if live else INK_3), anchor='ma')
        d.text((cx, y - 106), split, font=font('semi', 27),
               fill=(AMBER if live else INK_3), anchor='ma')
        d.text((cx, y + hgt + 28), label, font=font('reg', 25), fill=INK_3, anchor='ma')
        if live:
            d.text((cx, y + hgt + 66), 'YOU ARE HERE', font=font('bold', 23),
                   fill=AMBER, anchor='ma')
        if lo:
            d.line([(sx(lo), y - 16), (sx(lo), y + hgt + 16)], fill=GRID, width=3)

    if entries > 0:
        d.rounded_rectangle([x0, y, max(sx(entries), x0 + hgt), y + hgt],
                            radius=hgt // 2, fill=AMBER)

    mx = sx(entries)
    d.polygon([(mx, y - 20), (mx - 15, y - 44), (mx + 15, y - 44)], fill=INK)
    d.text((mx, y - 52), f'{entries} so far', font=font('bold', 30), fill=INK, anchor='mb')

    by = 690
    for i, (t, s) in enumerate([
        ('Bring someone new', 'You both get 25 HIVE when their entry qualifies'),
        ('Every entrant helps you', 'A bigger field pays everyone more, you included'),
    ]):
        bx = 150 + i * 660
        d.rounded_rectangle([bx, by, bx + 620, by + 98], radius=14, fill=(22, 32, 51))
        d.text((bx + 28, by + 22), t, font=font('bold', 29), fill=AMBER)
        d.text((bx + 28, by + 60), s, font=font('reg', 24), fill=INK_2)

    d.text((100, H - 52), 'Week 5 closes 1 September, 23:59 UTC',
           font=font('reg', 23), fill=INK_3, anchor='lm')
    d.text((W - 100, H - 52), 'HivePulse  /  @HdevCore',
           font=font('semi', 24), fill=INK_3, anchor='rm')

    im.save(out, 'JPEG', quality=90, optimize=True, progressive=True)
    return out


# ------------------------------------------------------- correlation dumbbell

W3 = [('mein-senf-dazu', 98, 100), ('nabbas0786', 94, 100), ('katriel1', 83, 93),
      ('ekads', 78, 93), ('yusmelys', 74, 78), ('cositav', 58, 100), ('jankris', 94, 100)]


def load():
    rows = []
    for f in ('contest-results-week1.csv', 'contest-results-week2.csv',
              'contest-results-week4.csv'):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            rows.append((int(r['seo_pct']), int(r['geo_score'])))
    rows += [(s, g) for _, s, g in W3]
    return rows


def pearson(xs, ys):
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sx = sum((x - mx) ** 2 for x in xs) ** .5
    sy = sum((y - my) ** 2 for y in ys) ** .5
    return cov / (sx * sy)


def correlation_chart(out):
    rows = load()
    r = pearson([a for a, _ in rows], [b for _, b in rows])
    data = sorted(rows, key=lambda t: -(t[0] - t[1]))

    im = ground('plate-lines')
    d = ImageDraw.Draw(im)

    d.text((100, 66), 'The more posts we score, the less SEO predicts AI-quotability',
           font=font('bold', 44), fill=INK)
    d.text((100, 128),
           f'{len(data)} Hive posts, each scored on both axes. '
           f'r = {r:.2f}, down from 0.73 at 14 posts and 0.58 at 25.',
           font=font('reg', 27), fill=INK_2)

    x0, x1 = 250, W - 400
    y0, y1 = 220, H - 124
    lo, hi = 40, 100

    def sx(v):
        return x0 + (v - lo) / (hi - lo) * (x1 - x0)

    step = (y1 - y0) / len(data)

    for v in range(lo, hi + 1, 10):
        d.line([(sx(v), y0 - 12), (sx(v), y1 + 6)], fill=GRID, width=1)
        d.text((sx(v), y1 + 16), str(v), font=font('reg', 22), fill=INK_3, anchor='ma')

    for i, (seo, geo) in enumerate(data):
        yy = y0 + step * i + step / 2
        a, b = sx(min(seo, geo)), sx(max(seo, geo))
        d.line([(a, yy), (b, yy)], fill=(58, 72, 98), width=2)
        for val, col in ((geo, GEO_C), (seo, SEO_C)):
            cx = sx(val)
            rr = 6
            d.ellipse([cx - rr - 2, yy - rr - 2, cx + rr + 2, yy + rr + 2], fill=SURFACE)
            d.ellipse([cx - rr, yy - rr, cx + rr, yy + rr], fill=col)

    seo, geo = data[0]
    yy = y0 + step / 2
    d.text((sx(geo) - 16, yy), str(geo), font=font('bold', 24), fill=GEO_C, anchor='rm')
    d.text((sx(seo) + 16, yy), str(seo), font=font('bold', 24), fill=SEO_C, anchor='lm')
    d.text((100, yy), 'widest gap', font=font('semi', 22), fill=INK_3, anchor='lm')

    px = W - 320
    d.text((px, y0 + 6), 'CORRELATION', font=font('semi', 22), fill=INK_3)
    for i, (n, val) in enumerate([(14, 0.73), (25, 0.58), (len(data), round(r, 2))]):
        ty = y0 + 54 + i * 88
        cur = i == 2
        d.text((px, ty), f'{val:.2f}', font=font('bold', 46), fill=(AMBER if cur else INK_3))
        d.text((px + 124, ty + 18), f'at {n} posts', font=font('reg', 24), fill=INK_3)

    lx, ly = 100, H - 58
    for label, col in (('SEO score', SEO_C), ('GEO / AI-quotability', GEO_C)):
        d.ellipse([lx, ly - 7, lx + 14, ly + 7], fill=col)
        d.text((lx + 24, ly), label, font=font('semi', 24), fill=INK_2, anchor='lm')
        lx += int(d.textlength(label, font=font('semi', 24))) + 78
    d.text((W - 100, H - 58), 'HivePulse  /  @HdevCore',
           font=font('semi', 24), fill=INK_3, anchor='rm')

    im.save(out, 'JPEG', quality=90, optimize=True, progressive=True)
    return out, len(data), r


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--entries', type=int, default=2)
    a = ap.parse_args()
    od = 'enhancements/images/social'
    os.makedirs(od, exist_ok=True)
    p = tier_card(a.entries, f'{od}/w5-tier.jpg')
    print(f'  {p}  {os.path.getsize(p)/1024:.0f} KB   (entries={a.entries})')
    p, n, r = correlation_chart(f'{od}/w5-correlation.jpg')
    print(f'  {p}  {os.path.getsize(p)/1024:.0f} KB   ({n} posts, r={r:.3f})')
