"""
Generate OG image (PNG) for social media sharing.

Creates a 1200x630 PNG image with the DatePulse branding.
Requires: Pillow (pip install Pillow)

Usage:
    python scripts/generate_og_image.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow not installed. Install with: pip install Pillow")
    print("Falling back to SVG-only OG image at frontend/public/og-image.svg")
    sys.exit(0)


def generate():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), color=(3, 7, 18))  # gray-950
    draw = ImageDraw.Draw(img)

    # Gradient-like overlay (simplified: dark bottom-right)
    for y in range(H):
        alpha = int(30 * (y / H))
        draw.line([(0, y), (W, y)], fill=(31 + alpha, 10, 30 + alpha))

    # Score circle
    cx, cy, r = 600, 210, 70
    draw.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        outline=(244, 114, 182),  # brand-400
        width=5,
    )

    # Try to use a system font, fallback to default
    try:
        font_big = ImageFont.truetype("arial.ttf", 48)
        font_title = ImageFont.truetype("arial.ttf", 52)
        font_sub = ImageFont.truetype("arial.ttf", 24)
        font_small = ImageFont.truetype("arial.ttf", 18)
        font_xs = ImageFont.truetype("arial.ttf", 16)
    except (OSError, IOError):
        font_big = ImageFont.load_default()
        font_title = font_big
        font_sub = font_big
        font_small = font_big
        font_xs = font_big

    # Score number
    draw.text((600, 195), "78", fill=(244, 114, 182), font=font_big, anchor="mm")
    draw.text((600, 235), "/100", fill=(156, 163, 175), font=font_small, anchor="mm")

    # Title
    draw.text((600, 350), "DatePulse", fill=(249, 250, 251), font=font_title, anchor="mm")

    # Subtitle
    draw.text(
        (600, 400),
        "Sais quand ouvrir ton app de dating",
        fill=(156, 163, 175),
        font=font_sub,
        anchor="mm",
    )

    # Tags
    draw.text(
        (600, 460),
        "Score en temps reel  |  Previsions 7 jours  |  Alertes Telegram",
        fill=(107, 114, 128),
        font=font_small,
        anchor="mm",
    )

    # Apps
    draw.text(
        (600, 510),
        "Tinder  -  Bumble  -  Hinge  -  Happn",
        fill=(75, 85, 99),
        font=font_xs,
        anchor="mm",
    )

    output_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "og-image.png"
    img.save(str(output_path), "PNG")
    print(f"OG image generated at {output_path}")


if __name__ == "__main__":
    generate()
