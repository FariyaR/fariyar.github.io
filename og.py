#!/usr/bin/env python3
"""Generate og-image.png (1200x630) matching fariyar.github.io design."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
NAVY = (11, 32, 56)        # #0B2038
NAVY_DK = (7, 22, 40)
CYAN = (98, 217, 255)      # #62D9FF
ORANGE = (255, 122, 41)    # #FF7A29
WHITE = (240, 246, 252)
GREY = (110, 140, 170)

img = Image.new("RGB", (W, H), NAVY)
d = ImageDraw.Draw(img, "RGBA")

# subtle vertical gradient
for y in range(H):
    t = y / H
    r = int(NAVY[0] + (NAVY_DK[0] - NAVY[0]) * t)
    g = int(NAVY[1] + (NAVY_DK[1] - NAVY[1]) * t)
    b = int(NAVY[2] + (NAVY_DK[2] - NAVY[2]) * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# faint grid
for x in range(0, W, 60):
    d.line([(x, 0), (x, H)], fill=(255, 255, 255, 8))
for y in range(0, H, 60):
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 8))

POPPINS = "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf"
MONO = "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf"
MONO_B = "/usr/share/fonts/truetype/liberation2/LiberationMono-Bold.ttf"

f_name = ImageFont.truetype(POPPINS, 108)
f_sub = ImageFont.truetype(MONO_B, 34)
f_tag = ImageFont.truetype(MONO, 26)
f_small = ImageFont.truetype(MONO, 20)

# pipeline motif: connected nodes across upper area
nodes_y = 120
nodes_x = [420, 560, 700, 840, 980, 1120]
for i in range(len(nodes_x) - 1):
    d.line([(nodes_x[i], nodes_y), (nodes_x[i + 1], nodes_y)], fill=(98, 217, 255, 60), width=2)
for i, nx in enumerate(nodes_x):
    col = ORANGE if i == 3 else CYAN
    d.ellipse([nx - 7, nodes_y - 7, nx + 7, nodes_y + 7], outline=col, width=3)
# retry arc (orange) between node 3 and 2
d.arc([560, nodes_y - 46, 840, nodes_y + 46], start=180, end=360, fill=(255, 122, 41, 160), width=2)

# diamond logo top-left
cx, cy, s = 120, 120, 52
d.polygon([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], outline=CYAN, width=5)
s2 = 22
d.polygon([(cx, cy - s2), (cx + s2, cy), (cx, cy + s2), (cx - s2, cy)], fill=ORANGE)

# main text
d.text((100, 236), "FARIYA RAZA", font=f_name, fill=WHITE)
# cyan underline accent
d.line([(106, 380), (560, 380)], fill=ORANGE, width=5)
d.text((100, 404), "AI ENGINEER", font=f_sub, fill=CYAN)

d.text((100, 472), "Multi-agent systems that survive production.", font=f_tag, fill=(180, 200, 220))
d.text((100, 508), "LangGraph orchestration · LLM cost engineering ·", font=f_tag, fill=GREY)
d.text((100, 542), "validation-gated pipelines", font=f_tag, fill=GREY)

# bottom status bar
d.line([(0, 592), (W, 592)], fill=(98, 217, 255, 40), width=1)
d.text((100, 602), "KHI · 24.86°N 67.00°E // ALL SYSTEMS NOMINAL", font=f_small, fill=(98, 217, 255, 200))
tw = d.textlength("fariyar.github.io", font=f_small)
d.text((W - 100 - tw, 602), "fariyar.github.io", font=f_small, fill=ORANGE)

img.save("/sessions/eager-serene-shannon/mnt/outputs/og-image.png", optimize=True)
print("saved", img.size)
