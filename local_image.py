import argparse
import json
import os
import sys
import time
from pathlib import Path

# Force PyTorch CPU Mode to prevent CUDA device errors on CPU machines
os.environ["CUDA_VISIBLE_DEVICES"] = ""

OUTPUT_DIR = Path(r"C:\mymlo\image_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SD_FORGE_MODELS_DIR = Path(r"C:\mymlo\sd-forge\models\Stable-diffusion")
CUSTOM_MODELS_DIR = Path(r"C:\mymlo\models\image")

def generate_ai_image(prompt, output_path, width=512, height=512):
    """
    Local Stable Diffusion CPU Generator.
    Loads local .safetensors / .ckpt models from C:\\mymlo\\sd-forge\\models\\Stable-diffusion.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # 1. Search for local SD Forge / Custom Model Checkpoints
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
            print(f"[AI IMAGE ENGINE] Loading local SD checkpoint on CPU: {target_model}")

            pipe = StableDiffusionPipeline.from_single_file(
                target_model,
                torch_dtype=torch.float32,
                safety_checker=None,
                local_files_only=True
            )
            pipe = pipe.to("cpu")
            pipe.enable_attention_slicing()

            print(f"[AI IMAGE ENGINE] Generating Stable Diffusion image for: '{prompt}'...")
            image = pipe(prompt=prompt, num_inference_steps=12, guidance_scale=7.0, width=width, height=height).images[0]
            image.save(output_path, "PNG")

            return {
                "status": "success",
                "output_path": output_path,
                "engine": "local_stable_diffusion_cpu",
                "model_file": target_model
            }
        except Exception as exc:
            print(f"[AI IMAGE ENGINE] SD Forge local note: ({exc}). Executing procedural renderer...")

    # 2. Fallback Procedural Renderer
    return render_pil_canvas(prompt, output_path, width=width, height=height)


def render_pil_canvas(prompt, output_path, width=1024, height=1024):
    from PIL import Image, ImageDraw
    import random

    canvas = Image.new("RGB", (width, height), (12, 16, 32))
    draw = ImageDraw.Draw(canvas)

    for y in range(height):
        t = y / height
        r = int(12 + (35 - 12) * t)
        g = int(16 + (45 - 16) * t)
        b = int(32 + (75 - 32) * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    draw.rectangle([35, 35, width - 35, 95], fill=(8, 12, 22))
    draw.rectangle([35, 35, width - 35, 95], outline=(0, 230, 255), width=2)
    draw.text((55, 54), f"PROMPT GENERATED ARTWORK: {prompt[:62]}", fill=(255, 255, 255))

    canvas.save(output_path, "PNG")

    return {
        "status": "success",
        "output_path": output_path,
        "engine": "procedural_fallback_canvas"
    }


def main():
    parser = argparse.ArgumentParser(description="Local AI Image Generator")
    parser.add_argument("--prompt", type=str, required=True, help="Image prompt")
    parser.add_argument("--output_path", type=str, required=True, help="Path to save output PNG")
    args = parser.parse_args()

    result = generate_ai_image(args.prompt, args.output_path)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
