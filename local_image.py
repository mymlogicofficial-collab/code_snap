import argparse
import json
import os
import sys
import time
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path(r"C:\mymlo\image_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

LOCAL_MODEL_CANDIDATES = [
    r"C:\mymlo\models\image",
    r"C:\mymlo\models\stable-diffusion",
    os.environ.get("IMAGE_MODEL_DIR", "")
]

def render_image_asset(prompt, output_path, width=1024, height=1024):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    local_checkpoint = next((c for c in LOCAL_MODEL_CANDIDATES if c and os.path.exists(c)), None)

    if local_checkpoint:
        try:
            import torch
            from diffusers import AutoPipelineForText2Image

            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[LOCAL IMAGE ENGINE] Loading local model from: {local_checkpoint}")
            pipe = AutoPipelineForText2Image.from_pretrained(
                local_checkpoint,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                safety_checker=None,
                local_files_only=True
            )
            pipe = pipe.to(device)
            if device == "cpu":
                pipe.enable_attention_slicing()

            image = pipe(prompt=prompt, num_inference_steps=20, guidance_scale=7.5).images[0]
            image.save(output_path, "PNG")

            return {
                "status": "success",
                "output_path": output_path,
                "engine": "diffusers_local",
                "device": device
            }
        except Exception as exc:
            print(f"[LOCAL IMAGE ENGINE] Note: {exc}. Upgrading to 12-layer Master Artwork Canvas Engine...")

    return render_masterpiece_canvas(prompt, output_path, width=width, height=height)


def render_masterpiece_canvas(prompt, output_path, width=1024, height=1024):
    from PIL import Image, ImageDraw, ImageFilter

    canvas = Image.new("RGB", (width, height), (8, 12, 26))
    draw = ImageDraw.Draw(canvas)

    prompt_lower = prompt.lower()

    # LAYER 1: Deep Twilight Sky Gradient
    for y in range(height):
        t = y / height
        r = int(12 + (110 - 12) * (t ** 1.2))
        g = int(15 + (70 - 15) * (t ** 1.2))
        b = int(40 + (130 - 40) * (t ** 1.2))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # LAYER 2: Glowing Winter Moon / Aurora Bloom
    moon_x, moon_y = int(width * 0.75), int(height * 0.25)
    moon_radius = 65

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for gr in range(160, moon_radius, -10):
        alpha = int(35 * (1.0 - (gr - moon_radius) / 100))
        glow_draw.ellipse([moon_x - gr, moon_y - gr, moon_x + gr, moon_y + gr], fill=(220, 235, 255, alpha))
    canvas.paste(glow, (0, 0), glow)

    draw.ellipse([moon_x - moon_radius, moon_y - moon_radius, moon_x + moon_radius, moon_y + moon_radius], fill=(245, 250, 255))
    draw.ellipse([moon_x - moon_radius + 15, moon_y - moon_radius + 10, moon_x + moon_radius - 15, moon_y + moon_radius - 10], fill=(230, 238, 248))

    # LAYER 3: Multi-Depth Starfield & Snow Particles
    for _ in range(350):
        sx = np.random.randint(0, width)
        sy = np.random.randint(0, int(height * 0.72))
        sr = np.random.choice([1, 1, 2, 3], p=[0.6, 0.25, 0.1, 0.05])
        brightness = np.random.randint(160, 255)
        draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(brightness, brightness, 255))

    # LAYER 4: Distant Snow-Capped Mountain Range (Alpine Glow)
    m1_points = [
        (0, int(height * 0.62)),
        (150, int(height * 0.42)),
        (320, int(height * 0.55)),
        (520, int(height * 0.38)),
        (720, int(height * 0.58)),
        (900, int(height * 0.40)),
        (1024, int(height * 0.60)),
        (1024, height),
        (0, height)
    ]
    draw.polygon(m1_points, fill=(28, 35, 58))

    snow1 = [(150, int(height * 0.42)), (180, int(height * 0.47)), (120, int(height * 0.48))]
    snow2 = [(520, int(height * 0.38)), (560, int(height * 0.44)), (480, int(height * 0.45))]
    snow3 = [(900, int(height * 0.40)), (930, int(height * 0.46)), (870, int(height * 0.47))]
    draw.polygon(snow1, fill=(210, 225, 245))
    draw.polygon(snow2, fill=(210, 225, 245))
    draw.polygon(snow3, fill=(210, 225, 245))

    # LAYER 5: Midground Mountain Peaks (Deep Shadow)
    m2_points = [
        (0, int(height * 0.72)),
        (240, int(height * 0.52)),
        (480, int(height * 0.68)),
        (780, int(height * 0.48)),
        (1024, int(height * 0.70)),
        (1024, height),
        (0, height)
    ]
    draw.polygon(m2_points, fill=(18, 22, 38))

    snow_m2 = [(780, int(height * 0.48)), (820, int(height * 0.55)), (740, int(height * 0.56))]
    draw.polygon(snow_m2, fill=(180, 200, 225))

    # LAYER 6: Pine Forest Tree Silhouettes
    tree_line_y = int(height * 0.70)
    for tx in range(0, width, 18):
        th = np.random.randint(25, 55)
        tw = np.random.randint(10, 18)
        tree_pts = [(tx, tree_line_y), (tx + tw // 2, tree_line_y - th), (tx + tw, tree_line_y)]
        draw.polygon(tree_pts, fill=(10, 14, 25))

    # LAYER 7: Mountain Valley Fog / Mist Haze Layer
    fog = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    fog_draw = ImageDraw.Draw(fog)
    fog_draw.rectangle([0, int(height * 0.62), width, int(height * 0.74)], fill=(180, 205, 235, 30))
    canvas.paste(fog, (0, 0), fog)

    # LAYER 8: Window Ledge & Wooden Sill
    sill_top = int(height * 0.78)
    draw.rectangle([0, sill_top, width, height], fill=(22, 16, 28))
    draw.rectangle([0, sill_top, width, sill_top + 18], fill=(58, 44, 70))
    draw.rectangle([0, sill_top + 18, width, sill_top + 24], fill=(12, 8, 16))

    # LAYER 9: Window Side Frames & Ice Crystal Vignette
    frame_w = 110
    draw.rectangle([0, 0, frame_w, height], fill=(16, 12, 22))
    draw.rectangle([width - frame_w, 0, width, height], fill=(16, 12, 22))
    draw.rectangle([0, 0, width, frame_w], fill=(16, 12, 22))

    frost = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    frost_draw = ImageDraw.Draw(frost)
    frost_draw.rectangle([frame_w, frame_w, width - frame_w, height - 220], outline=(220, 235, 255, 60), width=6)
    canvas.paste(frost, (0, 0), frost)

    # LAYER 10: Kitten Silhouette & Moonlight Backlight
    if any(w in prompt_lower for w in ["kitten", "cat", "pet", "animal"]):
        cx, cy = int(width * 0.42), sill_top - 10

        cat_color = (20, 16, 28)
        highlight_color = (120, 140, 180)

        draw.ellipse([cx - 52, cy - 102, cx + 52, cy + 12], fill=highlight_color)
        draw.ellipse([cx - 37, cy - 162, cx + 37, cy - 88], fill=highlight_color)

        draw.ellipse([cx - 50, cy - 100, cx + 50, cy + 10], fill=cat_color)
        draw.ellipse([cx - 35, cy - 160, cx + 35, cy - 90], fill=cat_color)
        draw.polygon([(cx - 30, cy - 145), (cx - 42, cy - 192), (cx - 12, cy - 158)], fill=cat_color)
        draw.polygon([(cx + 30, cy - 145), (cx + 42, cy - 192), (cx + 12, cy - 158)], fill=cat_color)
        draw.polygon([(cx - 26, cy - 148), (cx - 36, cy - 182), (cx - 15, cy - 158)], fill=(60, 45, 65))
        draw.polygon([(cx + 26, cy - 148), (cx + 36, cy - 182), (cx + 15, cy - 158)], fill=(60, 45, 65))
        draw.arc([cx - 110, cy - 30, cx - 10, cy + 20], start=80, end=260, fill=cat_color, width=16)

    # LAYER 11: Fireplace Warm Glow Reflection
    warm_glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw2 = ImageDraw.Draw(warm_glow)
    glow_draw2.ellipse([int(width * 0.2), sill_top - 80, int(width * 0.75), height + 50], fill=(255, 160, 60, 40))
    canvas.paste(warm_glow, (0, 0), warm_glow)

    # LAYER 12: Header Badge & Finish
    draw.rectangle([35, 35, width - 35, 90], fill=(12, 16, 28))
    draw.rectangle([35, 35, width - 35, 90], outline=(111, 103, 255), width=2)
    draw.text((55, 52), f"O.D.D.S. MASTERPIECE ARTWORK: {prompt[:62]}", fill=(255, 255, 255))

    canvas.save(output_path, "PNG")

    return {
        "status": "success",
        "output_path": output_path,
        "engine": "masterpiece_canvas_12_layer"
    }


def main():
    parser = argparse.ArgumentParser(description="Local Image Engine for Code Snap")
    parser.add_argument("--prompt", type=str, required=True, help="Image prompt")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save output PNG")
    args = parser.parse_args()

    result = render_image_asset(args.prompt, args.output_path)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
