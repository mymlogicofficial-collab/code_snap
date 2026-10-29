import argparse
import json
import os
import random
from pathlib import Path
from PIL import Image, ImageDraw

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

    if any(w in prompt_lower for w in ["cyberpunk", "neon", "future", "sci-fi", "synthwave", "tokyo"]):
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

    # 3. ATMOSPHERIC PARTICLES & BACKGROUND ELEMENTS
    if any(w in prompt_lower for w in ["star", "space", "night", "cosmic", "sky", "galaxy", "winter", "rain", "tokyo"]):
        is_rain = "rain" in prompt_lower
        for _ in range(300):
            sx = int(random.randint(0, width))
            sy = int(random.randint(0, height))
            if is_rain:
                draw.line([(sx, sy), (sx - 3, sy + 15)], fill=(180, 220, 255), width=1)
            else:
                sr = int(random.choice([1, 1, 2]))
                draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(220, 238, 255))

    # Ambient Light Glow
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([int(width * 0.15), int(height * 0.15), int(width * 0.85), int(height * 0.85)], fill=accent_glow)
    canvas.paste(glow, (0, 0), glow)

    # Background Skyline if Tokyo/City mentioned
    if any(w in prompt_lower for w in ["tokyo", "city", "downtown", "cyberpunk"]):
        for i in range(8):
            bx = i * 130
            bh = random.randint(200, 450)
            by = height - 260 - bh
            draw.rectangle([bx, by, bx + 115, height - 260], fill=(16, 20, 35), outline=secondary_color, width=2)

    # 4. COMPOSABLE FEATURE FLAGS (Independent Rendering Passes)
    cx, cy = int(width * 0.5), int(height * 0.55)

    has_truck = any(w in prompt_lower for w in ["fire truck", "firetruck", "truck", "semi", "lorry", "van", "pickup"])
    has_car = any(w in prompt_lower for w in ["car", "sports car", "automobile"]) and not has_truck
    has_astronaut = any(w in prompt_lower for w in ["astronaut", "space suit", "cosmonaut"])
    has_cat = any(w in prompt_lower for w in ["kitten", "cat", "pet", "animal"])
    has_donut = any(w in prompt_lower for w in ["taco", "food", "burger", "pizza", "dish", "plate", "donut"])
    has_logo = any(w in prompt_lower for w in ["logo", "icon", "symbol", "emblem", "badge"])
    has_explosion = any(w in prompt_lower for w in ["explode", "exploding", "explosion", "smash", "crash", "fire"])

    # Pass A: Render Donut / Food Backdrop
    if has_donut:
        draw.ellipse([cx - 220, cy - 220, cx + 220, cy + 220], fill=(235, 150, 70), outline=primary_color, width=8)
        draw.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=bg_top)

    # Pass B: Logo / Symbol Rendering
    if has_logo:
        style = random.choice(["triangle", "diamond", "hex", "orbit"])
        draw.ellipse([cx - 180, cy - 180, cx + 180, cy + 180], outline=primary_color, width=10)
        
        if style == "triangle":
            draw.polygon([(cx, cy - 130), (cx + 110, cy + 90), (cx - 110, cy + 90)], outline=secondary_color, width=8)
        elif style == "diamond":
            draw.polygon([(cx, cy - 120), (cx + 120, cy), (cx, cy + 120), (cx - 120, cy)], outline=secondary_color, width=8)
        elif style == "hex":
            draw.regular_polygon((cx, cy, 120), n_sides=6, outline=secondary_color, width=8)
        elif style == "orbit":
            draw.arc([cx - 140, cy - 90, cx + 140, cy + 90], start=0, end=360, fill=secondary_color, width=8)

    # Pass C: Render Vehicles
    if has_truck:
        truck_color = (220, 40, 40) if "fire" in prompt_lower else (40, 120, 220)
        draw.rectangle([cx - 260, cy - 10, cx + 200, cy + 100], fill=truck_color, outline=primary_color, width=3)
        draw.rectangle([cx + 120, cy + 30, cx + 240, cy + 100], fill=(30, 35, 45), outline=primary_color, width=2)
        draw.polygon([(cx + 170, cy + 30), (cx + 220, cy + 65), (cx + 170, cy + 65)], fill=(200, 230, 255))
        draw.ellipse([cx - 180, cy + 85, cx - 110, cy + 155], fill=(20, 20, 25), outline=(220, 220, 220), width=4)
        draw.ellipse([cx + 100, cy + 85, cx + 170, cy + 155], fill=(20, 20, 25), outline=(220, 220, 220), width=4)
        if "fire" in prompt_lower:
            draw.rectangle([cx - 240, cy - 40, cx + 100, cy - 20], fill=(180, 180, 190), outline=(220, 220, 220), width=2)
    elif has_car:
        draw.rectangle([cx - 220, cy + 20, cx + 220, cy + 90], fill=(22, 26, 40), outline=primary_color, width=2)
        draw.polygon([(cx - 140, cy + 20), (cx - 70, cy - 35), (cx + 90, cy - 35), (cx + 150, cy + 20)], fill=(32, 38, 58), outline=secondary_color, width=2)
        draw.ellipse([cx - 150, cy + 75, cx - 90, cy + 135], fill=(45, 52, 75), outline=primary_color, width=3)
        draw.ellipse([cx + 90, cy + 75, cx + 150, cy + 135], fill=(45, 52, 75), outline=primary_color, width=3)

    # Pass D: Render Astronaut or Cat
    if has_astronaut:
        draw.ellipse([cx - 80, cy - 160, cx + 80, cy], fill=(225, 230, 245), outline=primary_color, width=3)
        draw.ellipse([cx - 55, cy - 145, cx + 55, cy - 40], fill=(15, 25, 50))
    elif has_cat:
        draw.ellipse([cx - 55, cy - 10, cx + 55, cy + 90], fill=(20, 16, 28))
        draw.ellipse([cx - 40, cy - 90, cx + 40, cy - 10], fill=(20, 16, 28))

    # Pass E: Explosion / Sparks Overlay
    if has_explosion:
        for _ in range(40):
            ex = cx + random.randint(-180, 180)
            ey = cy + random.randint(-100, 100)
            er = random.randint(4, 14)
            draw.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(255, random.randint(100, 200), 50))

    # Fallback default geometry
    if not any([has_truck, has_car, has_astronaut, has_cat, has_donut, has_logo]):
        draw.polygon([(0, cy + 80), (cx - 200, cy - 100), (cx + 200, cy - 100), (width, cy + 80), (width, height), (0, height)], fill=(18, 24, 40))
        draw.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=primary_color, width=4)

    # 5. DYNAMIC HORIZON GROUND / LEDGE
    ground_y = int(height * 0.74)
    draw.rectangle([0, ground_y, width, height], fill=(10, 14, 24))
    draw.line([(0, ground_y), (width, ground_y)], fill=primary_color, width=3)

    # 6. CLEAN EXPORT
    canvas.save(output_path, "PNG")

    return {
        "status": "success",
        "output_path": output_path,
        "engine": "composable_prompt_engine",
        "prompt_parsed": prompt
    }

def main():
    parser = argparse.ArgumentParser(description="Composable Local Image Engine")
    parser.add_argument("--prompt", type=str, required=True, help="Image generation prompt")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save output PNG")
    args = parser.parse_args()

    result = generate_prompt_driven_artwork(args.prompt, args.output_path)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()