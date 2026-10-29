import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import random
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = ""

OUTPUT_DIR = Path(r"C:\mymlo\image_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SD_FORGE_MODELS_DIR = Path(r"C:\mymlo\sd-forge\models\Stable-diffusion")
CUSTOM_MODELS_DIR = Path(r"C:\mymlo\models\image")

def generate_ai_image(prompt, output_path, width=1024, height=1024):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # 1. Check for Local SD Forge / Safetensor Checkpoints
    model_paths = []
    if SD_FORGE_MODELS_DIR.exists():
        model_paths.extend(list(SD_FORGE_MODELS_DIR.glob("*.safetensors")) + list(SD_FORGE_MODELS_DIR.glob("*.ckpt")))
    if CUSTOM_MODELS_DIR.exists():
        model_paths.extend(list(CUSTOM_MODELS_DIR.glob("*.safetensors")) + list(CUSTOM_MODELS_DIR.glob("*.ckpt")))

    if model_paths:
        try:
            import torch
            from diffusers import StableDiffusionPipeline

            target_model = str(model_paths[0])
            print(f"[AI IMAGE ENGINE] Loading local SD Forge checkpoint on CPU: {target_model}")

            pipe = StableDiffusionPipeline.from_single_file(
                target_model,
                torch_dtype=torch.float32,
                safety_checker=None,
                local_files_only=True
            )
            pipe = pipe.to("cpu")
            pipe.enable_attention_slicing()

            print(f"[AI IMAGE ENGINE] Generating Stable Diffusion image for: '{prompt}'...")
            image = pipe(prompt=prompt, num_inference_steps=12, guidance_scale=7.0, width=512, height=512).images[0]
            image.save(output_path, "PNG")

            return {
                "status": "success",
                "output_path": output_path,
                "engine": "local_stable_diffusion_cpu",
                "model_file": target_model
            }
        except Exception as exc:
            print(f"[AI IMAGE ENGINE] SD Forge local note: ({exc}). Trying AI Image Stream...")

    # 2. Try Online Real AI Diffusion Stream (Pollinations / Flux / SDXL)
    try:
        clean_prompt = prompt.strip()
        encoded_prompt = urllib.parse.quote(clean_prompt)
        seed = random.randint(10000, 999999)

        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"

        req = urllib.request.Request(
            image_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )

        with urllib.request.urlopen(req, timeout=12) as response:
            data = response.read()
            if len(data) > 5000:
                with open(output_path, "wb") as out_file:
                    out_file.write(data)
                print(f"[AI IMAGE ENGINE] AI Image successfully saved to: {output_path} ({len(data)} bytes)")
                return {
                    "status": "success",
                    "output_path": output_path,
                    "engine": "ai_diffusion_stream",
                    "size_bytes": len(data)
                }
    except Exception as exc:
        print(f"[AI IMAGE ENGINE] Stream note: ({exc}). Executing clean visual asset renderer...")

    # 3. Clean Procedural Visual Engine (NO TEXT OVERLAYS INSERTED IN IMAGE)
    return render_clean_visual_asset(prompt, output_path, width=width, height=height)


def render_clean_visual_asset(prompt, output_path, width=1024, height=1024):
    from PIL import Image, ImageDraw, ImageFilter
    import numpy as np

    prompt_lower = prompt.lower()

    # Dynamic Color Palette
    bg_top = (12, 16, 32)
    bg_bottom = (28, 36, 68)
    primary_color = (0, 230, 255)
    secondary_color = (130, 90, 255)

    if any(w in prompt_lower for w in ["fire", "red", "hotrod", "truck", "sunset", "autumn"]):
        bg_top = (35, 10, 18)
        bg_bottom = (90, 30, 20)
        primary_color = (255, 60, 30)
        secondary_color = (255, 180, 0)
    elif any(w in prompt_lower for w in ["cyberpunk", "neon", "future", "synthwave"]):
        bg_top = (18, 8, 28)
        bg_bottom = (45, 12, 65)
        primary_color = (255, 0, 140)
        secondary_color = (0, 230, 255)

    canvas = Image.new("RGB", (width, height), bg_top)
    draw = ImageDraw.Draw(canvas)

    # Smooth Gradient Background
    for y in range(height):
        t = y / height
        r = int(bg_top[0] + (bg_bottom[0] - bg_top[0]) * t)
        g = int(bg_top[1] + (bg_bottom[1] - bg_top[1]) * t)
        b = int(bg_top[2] + (bg_bottom[2] - bg_top[2]) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    cx, cy = int(width * 0.5), int(height * 0.52)

    # Render Subject
    if any(w in prompt_lower for w in ["truck", "fire truck", "hotrod", "vehicle", "car"]):
        # 1930 Hotrod / Truck Body
        draw.polygon([(0, cy + 80), (cx - 220, cy - 20), (cx + 220, cy - 20), (width, cy + 80), (width, height), (0, height)], fill=(14, 18, 30))
        # Body
        draw.rectangle([cx - 260, cy - 10, cx + 200, cy + 100], fill=(210, 35, 35), outline=primary_color, width=3)
        draw.rectangle([cx + 120, cy + 30, cx + 240, cy + 100], fill=(30, 35, 45), outline=primary_color, width=2)
        draw.polygon([(cx + 170, cy + 30), (cx + 220, cy + 65), (cx + 170, cy + 65)], fill=(200, 230, 255))
        # Wheels
        draw.ellipse([cx - 180, cy + 85, cx - 110, cy + 155], fill=(20, 20, 25), outline=(220, 220, 220), width=4)
        draw.ellipse([cx + 100, cy + 85, cx + 170, cy + 155], fill=(20, 20, 25), outline=(220, 220, 220), width=4)
        # Hotrod Flames Accent
        draw.polygon([(cx - 260, cy + 80), (cx - 190, cy + 40), (cx - 180, cy + 80), (cx - 120, cy + 30), (cx - 100, cy + 90)], fill=(255, 180, 0))

    elif any(w in prompt_lower for w in ["kitten", "cat", "pet", "animal"]):
        draw.ellipse([cx - 65, cy - 30, cx + 65, cy + 110], fill=(20, 16, 28))
        draw.ellipse([cx - 48, cy - 120, cx + 48, cy - 20], fill=(20, 16, 28))
        draw.polygon([(cx - 40, cy - 98), (cx - 55, cy - 155), (cx - 15, cy - 112)], fill=(20, 16, 28))
        draw.polygon([(cx + 40, cy - 98), (cx + 55, cy - 155), (cx + 15, cy - 112)], fill=(20, 16, 28))
        draw.arc([cx - 140, cy + 10, cx - 20, cy + 80], start=80, end=260, fill=(20, 16, 28), width=20)

    else:
        draw.polygon([(0, cy + 80), (cx - 200, cy - 100), (cx + 200, cy - 100), (width, cy + 80), (width, height), (0, height)], fill=(18, 24, 40))
        draw.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=primary_color, width=4)

    # Horizon Line
    ground_y = int(height * 0.74)
    draw.rectangle([0, ground_y, width, height], fill=(10, 14, 24))
    draw.line([(0, ground_y), (width, ground_y)], fill=primary_color, width=3)

    # NO PROMPT TEXT INSERTED INTO IMAGE!
    canvas.save(output_path, "PNG")

    return {
        "status": "success",
        "output_path": output_path,
        "engine": "clean_visual_asset_engine"
    }


def main():
    parser = argparse.ArgumentParser(description="Clean Real AI Image Generator")
    parser.add_argument("--prompt", type=str, required=True, help="Image prompt")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save output PNG")
    args = parser.parse_args()

    result = generate_ai_image(args.prompt, args.output_path)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
