import json
from pathlib import Path
from datetime import datetime

BASE_POOL = Path(r"C:\mymlo\training_pool")
MANIFEST_PATH = BASE_POOL / "manifest.jsonl"
STATS_PATH = BASE_POOL / "stats.json"

REPORT_JSON = BASE_POOL / "dataset_report.json"
REPORT_MD = BASE_POOL / "dataset_report.md"
REPORT_HTML = BASE_POOL / "dataset_report.html"

def calculate_readiness(assets_count):
    if assets_count >= 500: return "READY"
    elif assets_count >= 200: return "PARTIAL"
    else: return "EARLY"

def generate_reports():
    if not MANIFEST_PATH.exists(): return

    stats = json.load(open(STATS_PATH, "r", encoding="utf-8")) if STATS_PATH.exists() else {}
    total_assets = stats.get("total", 0)
    domain_counts = {
        "fortune_spheres": stats.get("fortune_spheres", 0),
        "mym_logic": stats.get("mym_logic", 0),
        "odds": stats.get("odds", 0)
    }

    records = [json.loads(line) for line in open(MANIFEST_PATH, "r", encoding="utf-8") if line.strip()]

    panel_types, episodes, characters = {}, {}, {}
    color_candidates = {"red": 0, "green": 0, "blue": 0}
    total_width, total_height, total_area_ratio, json_count = 0, 0, 0.0, 0

    for r in records:
        json_path = BASE_POOL / r.get("domain") / r.get("category", "") / r.get("file").replace(".png", ".json")
        if json_path.exists():
            meta = json.load(open(json_path, "r", encoding="utf-8"))
            json_count += 1
            ptype = meta.get("panel_type", "unknown")
            panel_types[ptype] = panel_types.get(ptype, 0) + 1
            ep_key = f"episode_{meta.get('episode', 1):02d}"
            episodes[ep_key] = episodes.get(ep_key, 0) + 1
            char = meta.get("character", "unknown")
            characters[char] = characters.get(char, 0) + 1

            total_width += meta.get("panel_width", 0)
            total_height += meta.get("panel_height", 0)
            total_area_ratio += meta.get("panel_area_ratio", 0.0)

            scores = meta.get("color_scores", {})
            if scores.get("red", 0) > 0.12: color_candidates["red"] += 1
            if scores.get("green", 0) > 0.12: color_candidates["green"] += 1
            if scores.get("blue", 0) > 0.12: color_candidates["blue"] += 1

    avg_width = int(total_width / json_count) if json_count else 0
    avg_height = int(total_height / json_count) if json_count else 0
    avg_area_ratio = round(total_area_ratio / json_count, 3) if json_count else 0.0

    readiness = {
        dom: {"assets": count, "status": calculate_readiness(count)}
        for dom, count in domain_counts.items()
    }

    report_data = {
        "generated_at": datetime.now().isoformat(),
        "total_assets": total_assets,
        "domains": domain_counts,
        "panel_types": panel_types,
        "episodes": episodes,
        "characters": characters,
        "geometry": {"avg_panel_width": avg_width, "avg_panel_height": avg_height, "avg_area_ratio": avg_area_ratio},
        "color_candidates": color_candidates,
        "training_readiness": readiness
    }

    with open(REPORT_JSON, "w", encoding="utf-8") as f: json.dump(report_data, f, indent=2)

    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write(f"# Training Pool Report\n\n- **Total Assets:** {total_assets}\n- **Fortune Spheres:** {domain_counts['fortune_spheres']} ({readiness['fortune_spheres']['status']})\n")

    fs_pct = min(100, int((domain_counts['fortune_spheres'] / 500) * 100))
    html_content = f"""<!DOCTYPE html><html><head><title>O.D.D.S. Command Center</title>
    <style>body{{background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:40px;}} .card{{background:#161b22;padding:20px;border-radius:8px;border:1px solid #30363d;}}</style>
    </head><body><div class="card"><h1>O.D.D.S. Dataset Dashboard</h1><p>Total Assets: {total_assets}</p><p>Fortune Spheres: {domain_counts['fortune_spheres']} ({readiness['fortune_spheres']['status']})</p></div></body></html>"""
    with open(REPORT_HTML, "w", encoding="utf-8") as f: f.write(html_content)

if __name__ == "__main__":
    generate_reports()
