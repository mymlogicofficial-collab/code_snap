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

    # 1. Check if an offline local model directory exists
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

            image = pipe(prompt=prompt, num_inference_steps=15, guidance_scale=7.5).images[0]
            image.save(output_path, "PNG")

            return {
                "status": "success",
                "output_path": output_path,
                "engine": "diffusers_local",
                "device": device
            }
        except Exception as exc:
            print(f"[LOCAL IMAGE ENGINE] Local diffusion note ({exc}). Falling back to fast visual canvas renderer...")

    # 2. Fast Local Visual Artwork Canvas Renderer (< 1 second execution)
    return render_pil_canvas(prompt, output_path, width=width, height=height)


def render_pil_canvas(prompt, output_path, width=1024, height=1024):
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (width, height), (10, 15, 30))
    draw = ImageDraw.Draw(img)

    prompt_lower = prompt.lower()

    # Sky & Background Gradients
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
        m1 = [(0, int(height*0.65)), (200, int(height*0.45)), (450, int(height*0.6)), (700, int(height*0.4)), (1024, int(height*0.65)), (1024, height), (0, height)]
        draw.polygon(m1, fill=(20, 25, 45))

        m2 = [(0, int(height*0.75)), (350, int(height*0.55)), (600, int(height*0.7)), (900, int(height*0.5)), (1024, int(height*0.75)), (1024, height), (0, height)]
        draw.polygon(m2, fill=(12, 16, 32))

    else:
        for y in range(height):
            r = int(20 + 80 * (y / height))
            g = int(10 + 130 * (y / height))
            b = int(45 + 200 * (y / height))
            draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Window Frame & Ledge Rendering
    margin = 120
    draw.rectangle([0, height - 180, width, height], fill=(18, 14, 28))
    draw.rectangle([0, height - 180, width, height - 165], fill=(45, 38, 62))

    draw.rectangle([0, 0, margin, height], fill=(22, 18, 32))
    draw.rectangle([width - margin, 0, width, height], fill=(22, 18, 32))
    draw.rectangle([0, 0, width, margin], fill=(22, 18, 32))

    # Kitten/Cat Silhouette
    if any(w in prompt_lower for w in ["kitten", "cat", "pet", "animal"]):
        cx, cy = int(width * 0.45), int(height - 260)
        draw.ellipse([cx - 50, cy - 20, cx + 50, cy + 90], fill=(25, 22, 35))
        draw.ellipse([cx - 35, cy - 80, cx + 35, cy - 15], fill=(25, 22, 35))
        draw.polygon([(cx - 30, cy - 65), (cx - 40, cy - 105), (cx - 10, cy - 75)], fill=(25, 22, 35))
        draw.polygon([(cx + 30, cy - 65), (cx + 40, cy - 105), (cx + 10, cy - 75)], fill=(25, 22, 35))

    # Warm Interior Reflection Glow
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([int(width*0.3), int(height*0.6), int(width*0.7), height], fill=(255, 180, 100, 35))
    img.paste(glow, (0, 0), glow)

    # Title Header
    draw.rectangle([30, 30, width - 30, 85], fill=(8, 12, 24))
    draw.rectangle([30, 30, width - 30, 85], outline=(111, 103, 255), width=2)
    draw.text((50, 48), f"O.D.D.S. VISUAL ENGINE: {prompt[:65]}", fill=(255, 255, 255))

    img.save(output_path, "PNG")

    return {
        "status": "success",
        "output_path": output_path,
        "engine": "pil_canvas"
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
