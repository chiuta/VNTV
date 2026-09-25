# Generează pictogramele aplicației (PNG) din sigla VNTV. Rulare: python3 tools/make-icons.py
# Necesită: pip install pillow fonttools brotli
import os, io
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "deploy/site/icons"); os.makedirs(out, exist_ok=True)
f = TTFont(os.path.join(root, "src/fonts/oswald-latin-700-normal.woff2")); f.flavor = None
buf = io.BytesIO(); f.save(buf); buf.seek(0); font_bytes = buf.getvalue()

def icon(size, maskable=False):
    S = 1024; im = Image.new("RGB", (S, S), (0, 0, 0)); d = ImageDraw.Draw(im)
    for r in range(940, 0, -8):  # fundal radial discret
        c = int(8 + 30 * max(0, 1 - r / 720)); d.ellipse([S/2 - r, S*0.42 - r, S/2 + r, S*0.42 + r], fill=(c // 3, c, int(c * .8)))
    scale = 0.72 if maskable else 0.86
    W = int(S * scale); H = int(W * 0.4); X0 = (S - W) // 2; Y0 = (S - H) // 2; half = W // 2; R = int(H * 0.21); lw = max(6, W // 34)
    grad = Image.new("RGB", (W - half, H)); gd = ImageDraw.Draw(grad)
    for x in range(W - half):
        t = x / max(1, W - half - 1); gd.line([(x, 0), (x, H)], fill=(int(79 + (58 - 79) * t), int(209 + (160 - 209) * t), int(165 + (255 - 165) * t)))
    mask = Image.new("L", (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], R, fill=255)
    d.rounded_rectangle([X0 + lw // 2, Y0 + lw // 2, X0 + W - lw // 2, Y0 + H - lw // 2], R, outline=(255, 255, 255), width=lw)
    im.paste(grad, (X0 + half, Y0), mask.crop((half, 0, W, H)))
    fnt = ImageFont.truetype(io.BytesIO(font_bytes), int(H * 0.74))
    d.text((X0 + half / 2 + lw / 2, Y0 + H / 2 + H * 0.03), "VN", font=fnt, fill=(255, 255, 255), anchor="mm")
    d.text((X0 + half + (W - half) / 2, Y0 + H / 2 + H * 0.03), "TV", font=fnt, fill=(4, 19, 13), anchor="mm")
    return im.resize((size, size), Image.LANCZOS)

for s in (180, 192, 512):
    icon(s).save(os.path.join(out, f"icon-{s}.png"), optimize=True)
icon(512, True).save(os.path.join(out, "maskable-512.png"), optimize=True)
icon(64).save(os.path.join(out, "favicon-64.png"), optimize=True)
print("icons ok:", sorted(os.listdir(out)))
