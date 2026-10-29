import os
import sys
import json
import hashlib
import argparse
from datetime import datetime
from pathlib import Path
from PIL import Image

BASE_POOL = Path(r"C:\mymlo\training_pool")
INDEX_PATH = BASE_POOL / "hash_index.json"
MANIFEST_PATH = BASE_POOL / "manifest.jsonl"
STATS_PATH = BASE_POOL / "stats.json"

VALID_DOMAINS = {
    "fortune_spheres",
    "mym_logic",
    "odds"
}

def load_hash_index():
    if INDEX_PATH.exists():
        try:
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_hash_index(index):
    BASE_POOL.mkdir(parents=True, exist_ok=True)
    tmp_path = INDEX_PATH.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)
    tmp_path.replace(INDEX_PATH)

def update_and_get_stats():
    stats = {domain: 0 for domain in VALID_DOMAINS}
    total = 0
    if BASE_POOL.exists():
        for domain in VALID_DOMAINS:
            domain_dir = BASE_POOL / domain
            if domain_dir.exists():
                count = sum(1 for _ in domain_dir.rglob("*.png"))
                stats[domain] = count
                total += count
    stats["total"] = total
    with open(STATS_PATH, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    return stats

def append_manifest(record):
    BASE_POOL.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

def calculate_file_hash(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def initialize_pool_structure():
    structure = {
        "fortune_spheres": ["covers", "comic_pages", "panels", "red", "blaze", "green", "group_shots", "logos", "environments"],
        "mym_logic": ["commercials", "storyboards", "logos", "branding"],
        "odds": ["dashboards", "ui", "mockups", "assets"]
    }
    BASE_POOL.mkdir(parents=True, exist_ok=True)
    for domain, subcategories in structure.items():
        for sub in subcategories:
            (BASE_POOL / domain / sub).mkdir(parents=True, exist_ok=True)

def ingest_asset(source_image_path, domain, category, metadata_override=None):
    if domain not in VALID_DOMAINS:
        raise ValueError(f"Invalid domain '{domain}'. Must be one of {VALID_DOMAINS}")

    src = Path(source_image_path)
    if not src.exists():
        return False

    try:
        with Image.open(src) as test_img:
            test_img.verify()
    except Exception:
        return False

    target_dir = BASE_POOL / domain / category
    target_dir.mkdir(parents=True, exist_ok=True)

    file_hash = calculate_file_hash(src)
    hash_index = load_hash_index()
    if file_hash in hash_index:
        return False

    try:
        img = Image.open(src).convert("RGB")
        width, height = img.size

        if width < 512 or height < 512:
            return False

        aspect_ratio = round(width / height, 3)
        asset_name = f"{domain}_{category}_{file_hash[:8]}"
        final_img_path = target_dir / f"{asset_name}.png"
        final_json_path = target_dir / f"{asset_name}.json"
        final_txt_path = target_dir / f"{asset_name}.txt"

        img.save(final_img_path, "PNG")

        metadata_override = metadata_override or {}
        default_tags = [domain, category, "custom_asset"]
        if "tags" in metadata_override and isinstance(metadata_override["tags"], list):
            default_tags.extend(metadata_override["tags"])
            
        cleaned_tags = sorted({str(tag).strip().lower() for tag in default_tags if str(tag).strip()})
        custom_caption = metadata_override.get("caption", ", ".join(cleaned_tags))

        metadata = {
            "file": final_img_path.name,
            "source_file": str(src.resolve()),
            "domain": domain,
            "category": category,
            "ip": metadata_override.get("ip", domain),
            "character": metadata_override.get("character", "none"),
            "episode": metadata_override.get("episode", "none"),
            "panel": metadata_override.get("panel", "none"),
            "scene": metadata_override.get("scene", "general"),
            "format": metadata_override.get("format", "asset"),
            "width": width,
            "height": height,
            "aspect_ratio": aspect_ratio,
            "resolution": [width, height],
            "sha256": file_hash,
            "caption": custom_caption,
            "tags": cleaned_tags
        }

        with open(final_json_path, "w", encoding="utf-8") as jf:
            json.dump(metadata, jf, indent=2)

        with open(final_txt_path, "w", encoding="utf-8") as tf:
            tf.write(custom_caption)

        hash_index[file_hash] = final_img_path.name
        save_hash_index(hash_index)

        append_manifest({
            "timestamp": datetime.now().isoformat(),
            "file": final_img_path.name,
            "domain": domain,
            "category": category,
            "character": metadata["character"],
            "sha256": file_hash
        })
        update_and_get_stats()
        return True
    except Exception:
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=str)
    parser.add_argument("--domain", type=str)
    parser.add_argument("--category", type=str)
    parser.add_argument("--metadata", type=str)
    args = parser.parse_args()

    initialize_pool_structure()
    if args.file and args.domain and args.category:
        meta = json.loads(args.metadata) if args.metadata else {}
        ingest_asset(args.file, args.domain, args.category, meta)
