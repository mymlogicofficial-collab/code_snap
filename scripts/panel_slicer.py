import os
import sys
import json
import argparse
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

from ingest_dataset import ingest_asset, initialize_pool_structure

MIN_PANEL_AREA = 25000
CROP_PADDING = 10

def analyze_character_color_scores(panel_crop_cv):
    hsv = cv2.cvtColor(panel_crop_cv, cv2.COLOR_RGB2HSV)
    total_pixels = panel_crop_cv.shape[0] * panel_crop_cv.shape[1]
    if total_pixels == 0:
        return {"red": 0.0, "green": 0.0, "blue": 0.0}, []

    mask_red = cv2.bitwise_or(
        cv2.inRange(hsv, np.array([0, 70, 50]), np.array([10, 255, 255])),
        cv2.inRange(hsv, np.array([170, 70, 50]), np.array([180, 255, 255]))
    )
    red_ratio = round(float(np.sum(mask_red > 0) / total_pixels), 3)

    mask_green = cv2.inRange(hsv, np.array([35, 50, 50]), np.array([85, 255, 255]))
    green_ratio = round(float(np.sum(mask_green > 0) / total_pixels), 3)

    mask_blue = cv2.inRange(hsv, np.array([90, 50, 50]), np.array([130, 255, 255]))
    blue_ratio = round(float(np.sum(mask_blue > 0) / total_pixels), 3)

    color_scores = {"red": red_ratio, "green": green_ratio, "blue": blue_ratio}
    candidate_tags = []
    if red_ratio > 0.12: candidate_tags.append(f"red_sphere_candidate:{red_ratio}")
    if green_ratio > 0.12: candidate_tags.append(f"green_sphere_candidate:{green_ratio}")
    if blue_ratio > 0.12: candidate_tags.append(f"blue_sphere_candidate:{blue_ratio}")

    return color_scores, candidate_tags

def classify_panel_type(w, h, page_w, page_h):
    area_ratio = (w * h) / (page_w * page_h)
    if area_ratio > 0.65: return "cover"
    elif w > page_w * 0.80 and h < page_h * 0.18: return "title_strip"
    elif w < page_w * 0.25: return "inset"
    elif h < 220: return "banner"
    return "panel"

def generate_debug_overlay_and_json(original_img_path, detected_panels, output_dir, page_w, page_h):
    src = Path(original_img_path)
    base_img = Image.open(src).convert("RGB")
    draw = ImageDraw.Draw(base_img)
    panels_manifest = []

    for idx, (x, y, w, h) in enumerate(detected_panels, start=1):
        draw.rectangle([x, y, x + w, y + h], outline=(0, 255, 255), width=6)
        draw.text((x + 12, y + 12), f"PANEL {idx}", fill=(255, 255, 0))
        panels_manifest.append({
            "panel": idx,
            "panel_type": classify_panel_type(w, h, page_w, page_h),
            "bbox": [int(x), int(y), int(x + w), int(y + h)],
            "panel_width": int(w),
            "panel_height": int(h)
        })

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    base_img.save(out_path / "panel_detection_overlay.jpg", "JPEG", quality=95)
    with open(out_path / "panel_detection_overlay.json", "w", encoding="utf-8") as jf:
        json.dump({"source_file": src.name, "total_panels": len(detected_panels), "panels": panels_manifest}, jf, indent=2)

def generate_contact_sheet(crop_paths, output_dir):
    if not crop_paths: return
    thumb_size = (300, 300)
    cols = 2
    rows = (len(crop_paths) + cols - 1) // cols
    contact_sheet = Image.new("RGB", (cols * 320, rows * 320), (20, 24, 40))

    for idx, path_str in enumerate(crop_paths):
        r, c = idx // cols, idx % cols
        with Image.open(path_str) as img:
            img = img.convert("RGB")
            img.thumbnail(thumb_size)
            contact_sheet.paste(img, (c * 320 + 10, r * 320 + 10))
    contact_sheet.save(Path(output_dir) / "panel_preview.jpg", "JPEG", quality=90)

def slice_comic_page(file_path, domain="fortune_spheres", episode=1, output_dir=None):
    src = Path(file_path)
    if not src.exists(): return

    output_path = Path(output_dir) if output_dir else src.parent / "sliced_panels"
    output_path.mkdir(parents=True, exist_ok=True)
    initialize_pool_structure()

    img_cv = cv2.imread(str(src))
    if img_cv is None: return
    img_pil = Image.open(src).convert("RGB")
    height, width = img_cv.shape[:2]

    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    raw_panels = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w * h < MIN_PANEL_AREA or (w > width * 0.98 and h > height * 0.98): continue
        raw_panels.append((x, y, w, h))

    filtered_panels = []
    for x, y, w, h in raw_panels:
        contained = any(x >= ox and y >= oy and x + w <= ox + ow and y + h <= oy + oh for ox, oy, ow, oh in raw_panels if (x, y, w, h) != (ox, oy, ow, oh))
        if not contained: filtered_panels.append((x, y, w, h))

    sorted_panels = sorted(filtered_panels, key=lambda p: (round(p[1] / 100), p[0]))
    if not sorted_panels: return

    generate_debug_overlay_and_json(src, sorted_panels, output_path, width, height)
    saved_crop_paths = []

    for idx, (x, y, w, h) in enumerate(sorted_panels, start=1):
        x1, y1 = max(0, x - CROP_PADDING), max(0, y - CROP_PADDING)
        x2, y2 = min(width, x + w + CROP_PADDING), min(height, y + h + CROP_PADDING)

        panel_crop = img_pil.crop((x1, y1, x2, y2))
        color_scores, candidate_tags = analyze_character_color_scores(np.array(panel_crop))
        p_type = classify_panel_type(w, h, width, height)

        panel_width, panel_height = x2 - x1, y2 - y1
        panel_area = panel_width * panel_height
        page_area = width * height

        temp_crop_path = output_path / f"panel_{idx:03d}_{src.stem}.png"
        panel_crop.save(temp_crop_path, "PNG")
        saved_crop_paths.append(str(temp_crop_path))

        panel_metadata = {
            "ip": domain, "episode": int(episode), "panel": idx, "panel_type": p_type,
            "panel_width": panel_width, "panel_height": panel_height, "panel_area": panel_area,
            "panel_aspect_ratio": round(panel_width / panel_height, 3), "page_width": width,
            "page_height": height, "panel_area_ratio": round(panel_area / page_area, 4),
            "bbox": [x1, y1, x2, y2], "color_scores": color_scores, "format": "comic_panel",
            "source_file": src.name, "tags": [domain, "comic_panel", f"episode_{episode}", f"panel_{idx}", f"type_{p_type}"] + candidate_tags,
            "caption": f"{domain} {p_type}, episode {episode}, panel {idx}"
        }

        ingest_asset(str(temp_crop_path), domain, "panels", panel_metadata)

    if saved_crop_paths: generate_contact_sheet(saved_crop_paths, output_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=str, required=True)
    parser.add_argument("--domain", type=str, default="fortune_spheres")
    parser.add_argument("--episode", type=int, default=1)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()
    slice_comic_page(args.file, args.domain, args.episode, args.output)
