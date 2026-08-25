#!/usr/bin/env python3
"""
Build branded X/social cards for the HivePulse contest.

Text is composed deterministically over an AI-generated background plate, so every
card has pixel-perfect typography — image models still garble lettering, and these
cards are almost entirely text.

    python scripts/make_social_cards.py

Outputs 1600x900 JPEGs into enhancements/images/social/.
Re-run after editing CARDS below; the plate is reused, so it costs nothing.
"""

from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import os

W, H = 1600, 900
PLATE = 'enhancements/images/social/_plate.jpg'
LOGO = 'HivePulse3-Transparent.png'
OUTDIR = 'enhancements/images/social'

SLATE = (15, 23, 42)
WHITE = (255, 255, 255)
MUTED = (203, 213, 225)
DIM = (148, 163, 184)
AMBER = (251, 191, 36)
EMERALD = (52, 211, 153)
ORANGE = (249, 115, 22)
RED    = (248, 113, 113)   # status: paired with a ✕ glyph, never colour alone

FONTS = {
    'bold': ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'],
    'semi': ['C:/Windows/Fonts/seguisb.ttf', 'C:/Windows/Fonts/segoeuib.ttf'],
    'reg':  ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'],
}
_cache = {}


def font(weight, size):
    key = (weight, size)
    if key not in _cache:
        for path in FONTS[weight]:
            if os.path.exists(path):
                _cache[key] = ImageFont.truetype(path, size)
                break
        else:
            _cache[key] = ImageFont.load_default()
    return _cache[key]


def wrap(draw, text, fnt, max_w):
    """Greedy word wrap to a pixel width."""
    words, lines, cur = text.split(), [], ''
    for w in words:
        trial = f'{cur} {w}'.strip()
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def background(mirror=False, darken=0.72):
    """Plate, cropped to 16:9, optionally mirrored, with a left-weighted scrim."""
    im = Image.open(PLATE).convert('RGB')
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    # cover-crop to canvas ratio
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = (im.width - W) // 2
    top = (im.height - H) // 2
    im = im.crop((left, top, left + W, top + H))
    im = ImageEnhance.Brightness(im).enhance(darken)

    # horizontal scrim: strong on the left where text sits, light on the right
    scrim = Image.new('L', (W, 1))
    for x in range(W):
        t = x / W
        scrim.putpixel((x, 0), int(210 * (1 - t) ** 1.35 + 40))
    scrim = scrim.resize((W, H))
    dark = Image.new('RGB', (W, H), SLATE)
    return Image.composite(dark, im, scrim.point(lambda v: min(255, int(v * 0.92))))


def render(card):
    im = background(card.get('mirror', False))
    d = ImageDraw.Draw(im)
    x = 110
    # Cards on a plate whose artwork reaches further left need a narrower column so
    # body copy never runs under the busy side. Default matches the original layout.
    max_w = card.get('max_w', 1230)
    accent = card.get('accent', AMBER)

    # measure total height so the block sits optically centred
    blocks = []
    for b in card['blocks']:
        fnt = font(b.get('weight', 'bold'), b['size'])
        lines = wrap(d, b['text'], fnt, max_w) if b.get('wrap', True) else [b['text']]
        lh = b.get('lh', round(b['size'] * 1.22))
        blocks.append((b, fnt, lines, lh))
    total = sum(len(l) * lh + b.get('gap', 22) for b, f, l, lh in blocks) - blocks[-1][0].get('gap', 22)

    y = (H - total) // 2 - 20
    top_y = y

    for b, fnt, lines, lh in blocks:
        for line in lines:
            d.text((x, y), line, font=fnt, fill=b.get('color', WHITE))
            y += lh
        y += b.get('gap', 22)

    # accent bar spanning the text block
    d.rounded_rectangle([x - 34, top_y + 6, x - 26, y - blocks[-1][0].get('gap', 22) - 6],
                        radius=4, fill=accent)

    # footer: badge chip + handle.
    # The source logo is a light-background lockup (navy pulse line, wordmark underneath),
    # so on a dark card it disappears. Crop to the circular badge and set it on a white
    # chip — the mark was drawn for white, so this is how it stays legible.
    fy = H - 100
    tx = x
    if os.path.exists(LOGO):
        src = Image.open(LOGO).convert('RGBA')
        s = src.width / 1024.0
        badge = src.crop((int(225 * s), int(135 * s), int(805 * s), int(715 * s)))
        chip_d = 58
        chip = Image.new('RGBA', (chip_d, chip_d), (0, 0, 0, 0))
        ImageDraw.Draw(chip).ellipse([0, 0, chip_d - 1, chip_d - 1], fill=(255, 255, 255, 255))
        inner = chip_d - 10
        chip.paste(badge.resize((inner, inner), Image.LANCZOS), (5, 5), badge.resize((inner, inner), Image.LANCZOS))
        im.paste(chip, (x, fy), chip)
        tx = x + chip_d + 20
    d.text((tx, fy + 16), 'HivePulse', font=font('bold', 27), fill=(235, 240, 248))
    off = d.textlength('HivePulse', font=font('bold', 27))
    d.text((tx + off, fy + 16), '   ·   @HdevCore', font=font('semi', 27), fill=DIM)

    os.makedirs(OUTDIR, exist_ok=True)
    path = os.path.join(OUTDIR, card['name'] + '.jpg')
    im.save(path, 'JPEG', quality=88, optimize=True, progressive=True)
    return path, os.path.getsize(path) / 1024


CARDS = [
    {  # The single most useful teaching artifact: what "self-contained" actually means.
       # BEFORE/AFTER are word labels, not glyphs — Segoe UI Bold has no U+2713/U+2715
       # (they render as tofu), and status colour needs a non-colour cue regardless.
        'name': 'quotable-rewrite', 'accent': EMERALD,
        'blocks': [
            {'text': 'THE ONE REWRITE THAT MOVES YOUR SCORE', 'size': 30, 'weight': 'semi', 'color': EMERALD, 'gap': 32},
            {'text': 'BEFORE', 'size': 24, 'weight': 'semi', 'color': RED, 'gap': 8},
            {'text': '"This shows a 40% improvement."', 'size': 44, 'color': RED, 'gap': 10},
            {'text': 'Quoted on its own it says nothing. What shows? Improvement in what?',
             'size': 29, 'weight': 'reg', 'color': DIM, 'gap': 34},
            {'text': 'AFTER', 'size': 24, 'weight': 'semi', 'color': EMERALD, 'gap': 8},
            {'text': '"Weekly digests improved retention 40%."', 'size': 44, 'color': EMERALD, 'gap': 10},
            {'text': 'Survives being lifted off the page. That is the whole test.',
             'size': 29, 'weight': 'reg', 'color': DIM, 'gap': 32},
            {'text': 'An answer engine quotes sentences, not articles.', 'size': 30, 'weight': 'semi', 'color': MUTED},
        ],
    },
    {  # Week-3 contest cover — deterministic fallback when image credits are unavailable.
       # Cover-weight typography; text is composed, never model-rendered.
        'name': 'week3-cover', 'accent': AMBER,
        'blocks': [
            {'text': 'HIVEPULSE SEO CONTEST', 'size': 34, 'weight': 'semi', 'color': AMBER, 'gap': 26},
            {'text': 'Week 3 is open', 'size': 86, 'gap': 18},
            {'text': '300 HIVE  ·  150 / 100 / 50', 'size': 52, 'color': EMERALD, 'gap': 28},
            {'text': 'Optimize your next Hive post, comment your score, tag #hivepulse.',
             'size': 32, 'weight': 'reg', 'color': MUTED, 'gap': 14},
            {'text': 'Closes 18 August, 23:59 UTC.', 'size': 32, 'weight': 'reg', 'color': DIM},
        ],
    },
    {  # Wed 19:00 — friction killer. Locations verified against live editors 5 Aug 2026;
       # do not edit these without re-checking the actual frontend.
        'name': 'wed-description', 'accent': AMBER,
        'blocks': [
            {'text': 'WORTH 10 POINTS · TAKES 15 SECONDS', 'size': 30, 'weight': 'semi', 'color': AMBER, 'gap': 28},
            {'text': 'Where the preview description hides', 'size': 58, 'gap': 34},
            {'text': 'PeakD — "Short preview description", right under the editor',
             'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 18},
            {'text': 'Ecency — Story preview step, the box under the greyed-out title',
             'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 18},
            {'text': 'It is pre-filled from your post, so it looks like your text. Editing it changes only your search snippet.',
             'size': 30, 'weight': 'reg', 'color': DIM, 'gap': 30},
            {'text': 'HivePulse flags it the moment it is empty.', 'size': 30, 'weight': 'semi', 'color': EMERALD},
        ],
    },
    {  # Thu 14:00 — thread opener
        'name': 'thu-stats', 'accent': EMERALD,
        'blocks': [
            {'text': 'CONTEST DATA · WEEK 1', 'size': 30, 'weight': 'semi', 'color': EMERALD, 'gap': 30},
            {'text': 'SEO scores averaged 89%.', 'size': 62, 'gap': 8},
            {'text': 'AI-quotability ranged 60 to 100.', 'size': 62, 'color': AMBER, 'gap': 30},
            {'text': 'All three winners scored a perfect 100.', 'size': 34, 'weight': 'reg', 'color': MUTED},
        ],
    },
    {  # Thu 19:00 — standalone quote
        'name': 'thu-quote', 'accent': ORANGE, 'mirror': True,
        'blocks': [
            {'text': 'A page can rank #1 on Google and never be quoted by ChatGPT once.', 'size': 66, 'gap': 30},
            {'text': 'Ranking and being quoted are different games. Almost nobody is playing the second one yet.',
             'size': 34, 'weight': 'reg', 'color': MUTED},
        ],
    },
    {  # Fri 14:00 — release
        'name': 'fri-release', 'accent': AMBER,
        'blocks': [
            {'text': 'NOW SHIPPING', 'size': 30, 'weight': 'semi', 'color': AMBER, 'gap': 26},
            {'text': 'HivePulse v1.12.0', 'size': 72, 'gap': 34},
            {'text': 'Firefox for Android — it runs on your phone', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 14},
            {'text': 'Opera support', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 14},
            {'text': 'SlothBuzz + Ureka frontends', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 14},
            {'text': 'Hover-card reputation bug fixed', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 30},
            {'text': 'Every one of these came from a user telling us.', 'size': 30, 'weight': 'semi', 'color': EMERALD},
        ],
    },
    {  # Fri 19:00 — winner spotlight
        'name': 'fri-winner', 'accent': AMBER, 'mirror': True,
        'blocks': [
            {'text': 'WEEK 1 WINNER · 150 HIVE', 'size': 30, 'weight': 'semi', 'color': AMBER, 'gap': 26},
            {'text': '@mein-senf-dazu', 'size': 66, 'gap': 16},
            {'text': 'SEO 97  ·  GEO 100', 'size': 44, 'color': EMERALD, 'gap': 30},
            {'text': 'A guide to treating mosquito bites with a heat pen. Not a crypto post — a genuinely useful thing they had actually tested.',
             'size': 34, 'weight': 'reg', 'color': MUTED},
        ],
    },
    {  # Sat 14:00 — tutorial winner
        'name': 'sat-winner', 'accent': ORANGE,
        'blocks': [
            {'text': 'WEEK 1 · THIRD PLACE', 'size': 30, 'weight': 'semi', 'color': ORANGE, 'gap': 26},
            {'text': '@jankris', 'size': 66, 'gap': 16},
            {'text': 'SEO 94  ·  GEO 100', 'size': 44, 'color': EMERALD, 'gap': 30},
            {'text': 'Had never used HivePulse before. So they wrote the install guide — in Spanish and English, 20 screenshots — and scored 94 doing it.',
             'size': 34, 'weight': 'reg', 'color': MUTED},
        ],
    },
    {  # Sun 14:00 — the flagship saveable card
        'name': 'sun-habits', 'accent': EMERALD,
        'blocks': [
            {'text': 'HOW TO GET QUOTED BY AI', 'size': 30, 'weight': 'semi', 'color': EMERALD, 'gap': 30},
            {'text': 'Three habits behind every perfect score', 'size': 56, 'gap': 34},
            {'text': '1.  Open with the answer, in the first 8–60 words', 'size': 36, 'weight': 'semi', 'color': WHITE, 'gap': 18},
            {'text': '2.  Write sentences that survive being quoted alone', 'size': 36, 'weight': 'semi', 'color': WHITE, 'gap': 18},
            {'text': '3.  Name your subjects — repeat the noun, drop the "it"', 'size': 36, 'weight': 'semi', 'color': WHITE, 'gap': 30},
            {'text': 'That is the whole trick.', 'size': 32, 'weight': 'reg', 'color': DIM},
        ],
    },
    {  # Mon 19:00 — checklist
        'name': 'mon-checklist', 'accent': AMBER, 'mirror': True,
        'blocks': [
            {'text': 'ENTRY CHECKLIST', 'size': 30, 'weight': 'semi', 'color': AMBER, 'gap': 30},
            {'text': 'Sixty seconds to enter', 'size': 58, 'gap': 34},
            {'text': 'Post published 5–11 August', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 16},
            {'text': 'Tagged #hivepulse — enforced this week', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 16},
            {'text': 'Meta description filled in', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 16},
            {'text': 'Comment your link + score screenshot', 'size': 34, 'weight': 'reg', 'color': MUTED, 'gap': 16},
            {'text': 'SEO 70+ to qualify', 'size': 34, 'weight': 'reg', 'color': MUTED},
        ],
    },
    {  # Tue — final day
        'name': 'tue-final', 'accent': ORANGE,
        'blocks': [
            {'text': 'FINAL DAY', 'size': 32, 'weight': 'semi', 'color': ORANGE, 'gap': 26},
            {'text': 'Closes tonight, 23:59 UTC', 'size': 66, 'gap': 34},
            {'text': '150  ·  100  ·  50 HIVE', 'size': 50, 'color': AMBER, 'gap': 26},
            {'text': 'Post, score, comment, tag #hivepulse.', 'size': 34, 'weight': 'reg', 'color': MUTED},
        ],
    },
]

if __name__ == '__main__':
    for c in CARDS:
        p, kb = render(c)
        print(f'  {p}  {kb:.0f} KB')
    print(f'\n{len(CARDS)} cards written to {OUTDIR}/')
