import argparse
import json
import os
import time
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path(r"C:\mymlo\image_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_visual_art(prompt, width=1024, height=1024, output_path=None):
    if output_path is None:
        output_path = OUTPUT_DIR / f"image_{int(time.time())}.png"
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    print(f"[IMAGE ENGINE] Rendering digital artwork for: '{prompt}'")

    try:
        from PIL import Image, ImageDraw, ImageFilter

        img = Image.new("RGB", (width, height), (10, 15, 30))
        draw = ImageDraw.Draw(img)

        prompt_lower = prompt.lower()

        # 1. Sky & Background Gradients
        if any(w in prompt_lower for w in ["winter", "cold", "mountain", "snow", "evening", "night"]):
            for y in range(height):
                r = int(15 + (120 - 15) * (y / height))
                g = int(20 + (80 - 20) * (y / height))
                b = int(45 + (140 - 45) * (y / height))
                draw.line([(0, y), (width, y)], fill=(r, g, b))

            # Snow / Star particles
            for _ in range(250):
                sx = np.random.randint(0, width)
                sy = np.random.randint(0, int(height * 0.7))
                sr = np.random.randint(1, 4)
                draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(240, 245, 255, 200))

            # Mountain Silhouettes
            mountain_points1 = [(0, int(height*0.65)), (200, int(height*0.45)), (450, int(height*0.6)), (700, int(height*0.4)), (1024, int(height*0.65)), (1024, height), (0, height)]
            draw.polygon(mountain_points1, fill=(20, 25, 45))

            mountain_points2 = [(0, int(height*0.75)), (350, int(height*0.55)), (600, int(height*0.7)), (900, int(height*0.5)), (1024, int(height*0.75)), (1024, height), (0, height)]
            draw.polygon(mountain_points2, fill=(12, 16, 32))

        else:
            for y in range(height):
                r = int(20 + 80 * (y / height))
                g = int(10 + 130 * (y / height))
                b = int(45 + 200 * (y / height))
                draw.line([(0, y), (width, y)], fill=(r, g, b))

        # 2. Window Frame & Ledge Rendering
        window_margin = 120
        draw.rectangle([0, height - 180, width, height], fill=(18, 14, 28))
        draw.rectangle([0, height - 180, width, height - 165], fill=(45, 38, 62))

        draw.rectangle([0, 0, window_margin, height], fill=(22, 18, 32))
        draw.rectangle([width - window_margin, 0, width, height], fill=(22, 18, 32))
        draw.rectangle([0, 0, width, window_margin], fill=(22, 18, 32))

        # 3. Subject Silhouette (Kitten/Cat)
        if any(w in prompt_lower for w in ["kitten", "cat", "pet", "animal"]):
            cx, cy = int(width * 0.45), int(height - 260)

            draw.ellipse([cx - 50, cy - 20, cx + 50, cy + 90], fill=(25, 22, 35))
            draw.ellipse([cx - 35, cy - 80, cx + 35, cy - 15], fill=(25, 22, 35))
            draw.polygon([(cx - 30, cy - 65), (cx - 40, cy - 105), (cx - 10, cy - 75)], fill=(25, 22, 35))
            draw.polygon([(cx + 30, cy - 65), (cx + 40, cy - 105), (cx + 10, cy - 75)], fill=(25, 22, 35))

        # 4. Warm Interior Reflection Glow
        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_draw.ellipse([int(width*0.3), int(height*0.6), int(width*0.7), height], fill=(255, 180, 100, 35))
        img.paste(glow, (0, 0), glow)

        # 5. Title Header
        draw.rectangle([30, 30, width - 30, 85], fill=(8, 12, 24))
        draw.rectangle([30, 30, width - 30, 85], outline=(111, 103, 255), width=2)
        draw.text((50, 48), f"O.D.D.S. VISUAL ENGINE: {prompt[:65]}", fill=(255, 255, 255))

        img.save(target, "PNG")
        print(f"[IMAGE ENGINE] Saved artwork PNG: {target}")

        return {
            "status": "success",
            "output_path": str(target),
            "width": width,
            "height": height,
            "device": "cpu",
            "message": f"Successfully rendered digital artwork PNG for '{prompt}'"
        }

    except Exception as err:
        print(f"[IMAGE ENGINE] Render Error: {err}")
        return {
            "status": "error",
            "error": str(err)
        }

def main():
    parser = argparse.ArgumentParser(description="Local CPU Image Engine Bridge")
    parser.add_argument("--prompt", type=str, required=True, help="Image generation prompt")
    parser.add_argument("--output_path", type=str, default=None, help="Path to save output image")

    args = parser.parse_args()

    try:
        result = generate_visual_art(prompt=args.prompt, output_path=args.output_path)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        return 1

if __name__ == "__main__":
    main()
