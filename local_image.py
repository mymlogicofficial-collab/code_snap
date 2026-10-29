import argparse
import json
import os
import sys
import re
import random
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUTPUT_DIR = Path(r"C:\mymlo\image_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_prompt_driven_artwork(prompt, output_path, width=1024, height=1024):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    prompt_lower = prompt.lower()

    # 1. PARSE PALETTE & ATMOSPHERE
    bg_top = (12, 16, 32)
    bg_bottom = (28, 36, 68)
    primary_color = (0, 230, 255)
    secondary_color = (130, 90, 255)
    accent_glow = (255, 100, 200, 60)

    if any(w in prompt_lower for w in ["cyberpunk", "neon", "future", "sci-fi", "synthwave"]):
        bg_top = (18, 8, 28)
        bg_bottom = (45, 12, 65)
        primary_color = (255, 0, 140)
        secondary_color = (0, 230, 255)
        accent_glow = (255, 200, 0, 70)
    elif any(w in prompt_lower for w in ["forest", "nature", "tree", "jungle", "green", "landscape"]):
        bg_top = (8, 24, 18)
        bg_bottom = (22, 58, 38)
        primary_color = (80, 240, 120)
        secondary_color = (220, 255, 120)
        accent_glow = (100, 220, 150, 50)
    elif any(w in prompt_lower for w in ["sunset", "fire", "orange", "warm", "desert", "red", "autumn"]):
        bg_top = (38, 12, 22)
        bg_bottom = (95, 38, 22)
        primary_color = (255, 140, 30)
        secondary_color = (255, 220, 60)
        accent_glow = (255, 180, 50, 65)
    elif any(w in prompt_lower for w in ["ocean", "beach", "water", "sea", "underwater", "aqua", "river"]):
        bg_top = (6, 22, 38)
        bg_bottom = (16, 68, 98)
        primary_color = (0, 220, 240)
        secondary_color = (100, 245, 255)
        accent_glow = (80, 240, 255, 60)
    elif any(w in prompt_lower for w in ["space", "cosmic", "galaxy", "nebula", "astronaut", "star"]):
        bg_top = (6, 6, 20)
        bg_bottom = (26, 14, 48)
        primary_color = (180, 100, 255)
        secondary_color = (255, 120, 220)
        accent_glow = (140, 60, 255, 75)

    # 2. CREATE CANVAS GRADIENT
    canvas = Image.new("RGB", (width, height), bg_top)
    draw = ImageDraw.Draw(canvas)

    for y in range(height):
        t = y / height
        r = int(bg_top[0] + (bg_bottom[0] - bg_top[0]) * t)
        g = int(bg_top[1] + (bg_bottom[1] - bg_top[1]) * t)
        b = int(bg_top[2] + (bg_bottom[2] - bg_top[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # 3. ATMOSPHERIC PARTICLES / STARS / RAIN
    if any(w in prompt_lower for w in ["star", "space", "night", "cosmic", "sky", "galaxy", "winter", "rain"]):
        is_rain = "rain" in prompt_lower
        for _ in range(350):
            sx = int(random.randint(0, width))
            sy = int(random.randint(0, height))
            if is_rain:
                draw.line([(sx, sy), (sx - 4, sy + 18)], fill=(180, 220, 255, 180), width=1)
            else:
                sr = int(random.choice([1, 1, 2, 3]))
                draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(220, 238, 255))

    # Ambient Light Glow
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([int(width * 0.2), int(height * 0.2), int(width * 0.8), int(height * 0.8)], fill=accent_glow)
    canvas.paste(glow, (0, 0), glow)

    # 4. DYNAMIC PROMPT-DRIVEN SUBJECT RENDERING
    cx, cy = int(width * 0.5), int(height * 0.52)

    if any(w in prompt_lower for w in ["car", "vehicle", "sports car", "automobile"]):
        draw.polygon([(0, cy + 80), (cx - 200, cy - 20), (cx + 200, cy - 20), (width, cy + 80), (width, height), (0, height)], fill=(14, 18, 30))
        draw.rectangle([cx - 240, cy + 10, cx + 240, cy + 90], fill=(22, 26, 40), outline=primary_color, width=2)
        draw.polygon([(cx - 170, cy + 10), (cx - 90, cy - 65), (cx + 110, cy - 65), (cx + 190, cy + 10)], fill=(32, 38, 58), outline=secondary_color, width=2)
        draw.ellipse([cx - 170, cy + 70, cx - 90, cy + 150], fill=(45, 52, 75), outline=primary_color, width=3)
        draw.ellipse([cx + 90, cy + 70, cx + 170, cy + 150], fill=(45, 52, 75), outline=primary_color, width=3)
        headlight = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        h_draw = ImageDraw.Draw(headlight)
        h_draw.polygon([(cx - 240, cy + 30), (0, cy - 40), (0, cy + 220)], fill=(255, 240, 180, 80))
        canvas.paste(headlight, (0, 0), headlight)

    elif any(w in prompt_lower for w in ["astronaut", "space suit", "cosmonaut"]):
        draw.ellipse([cx - 90, cy - 190, cx + 90, cy - 10], fill=(225, 230, 245), outline=primary_color, width=3)
        draw.ellipse([cx - 65, cy - 175, cx + 65, cy - 45], fill=(15, 25, 50))
        draw.ellipse([cx - 50, cy - 160, cx + 50, cy - 60], fill=(255, 180, 30))
        draw.rectangle([cx - 110, cy - 10, cx + 110, cy + 190], fill=(205, 215, 235), outline=secondary_color, width=2)

    elif any(w in prompt_lower for w in ["kitten", "cat", "pet", "animal"]):
        draw.ellipse([cx - 65, cy - 30, cx + 65, cy + 110], fill=(20, 16, 28))
        draw.ellipse([cx - 48, cy - 120, cx + 48, cy - 20], fill=(20, 16, 28))
        draw.polygon([(cx - 40, cy - 98), (cx - 55, cy - 155), (cx - 15, cy - 112)], fill=(20, 16, 28))
        draw.polygon([(cx + 40, cy - 98), (cx + 55, cy - 155), (cx + 15, cy - 112)], fill=(20, 16, 28))
        draw.arc([cx - 140, cy + 10, cx - 20, cy + 80], start=80, end=260, fill=(20, 16, 28), width=20)

    elif any(w in prompt_lower for w in ["taco", "food", "burger", "pizza", "dish", "plate"]):
        draw.ellipse([cx - 260, cy - 60, cx + 260, cy + 200], fill=(215, 220, 230), outline=primary_color, width=3)
        draw.ellipse([cx - 210, cy - 35, cx + 210, cy + 160], fill=(240, 245, 252))
        draw.arc([cx - 150, cy - 25, cx + 150, cy + 130], start=0, end=180, fill=(235, 175, 45), width=50)

    elif any(w in prompt_lower for w in ["logo", "icon", "symbol", "emblem", "badge"]):
        draw.ellipse([cx - 180, cy - 180, cx + 180, cy + 180], outline=primary_color, width=8)
        draw.polygon([(cx, cy - 130), (cx + 110, cy + 90), (cx - 110, cy + 90)], outline=secondary_color, width=6)

    else:
        draw.polygon([(0, cy + 80), (cx - 200, cy - 100), (cx + 200, cy - 100), (width, cy + 80), (width, height), (0, height)], fill=(18, 24, 40))
        draw.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=primary_color, width=4)

    # 5. DYNAMIC HORIZON GROUND / LEDGE
    ground_y = int(height * 0.74)
    draw.rectangle([0, ground_y, width, height], fill=(10, 14, 24))
    draw.line([(0, ground_y), (width, ground_y)], fill=primary_color, width=3)

    # 6. HEADER BADGE & PROMPT OVERLAY
    draw.rectangle([35, 35, width - 35, 95], fill=(8, 12, 22))
    draw.rectangle([35, 35, width - 35, 95], outline=primary_color, width=2)
    draw.text((55, 54), f"PROMPT GENERATED ARTWORK: {prompt[:62]}", fill=(255, 255, 255))

    canvas.save(output_path, "PNG")

    return {
        "status": "success",
        "output_path": output_path,
        "engine": "dynamic_prompt_driven_engine",
        "prompt_parsed": prompt
    }

def main():
    parser = argparse.ArgumentParser(description="Prompt-Driven Local Image Engine")
    parser.add_argument("--prompt", type=str, required=True, help="Image generation prompt")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save output PNG")
    args = parser.parse_args()

    result = generate_prompt_driven_artwork(args.prompt, args.output_path)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
