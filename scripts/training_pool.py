import json
from pathlib import Path

BASE_POOL = Path(r"C:\mymlo\training_pool")

STRUCTURE = {
    "fortune_spheres": [
        "covers", "comic_pages", "panels", "red", 
        "blaze", "green", "group_shots", "logos", "environments"
    ],
    "mym_logic": [
        "commercials", "storyboards", "logos", "branding"
    ],
    "odds": [
        "dashboards", "ui", "mockups", "assets"
    ]
}

def init_pool():
    """Builds the entire C:\\mymlo\\training_pool directory tree."""
    BASE_POOL.mkdir(parents=True, exist_ok=True)
    for domain, subfolders in STRUCTURE.items():
        for sub in subfolders:
            (BASE_POOL / domain / sub).mkdir(parents=True, exist_ok=True)
    print(f"[Training Pool] Initialized dataset directory at: {BASE_POOL}")

def verify_pool():
    """Checks missing folders and counts assets across all domains."""
    print(f"\n--- Training Pool Audit ({BASE_POOL}) ---")
    if not BASE_POOL.exists():
        print("[Error] Training pool directory does not exist yet.")
        return False

    total_files = 0
    for domain, subfolders in STRUCTURE.items():
        domain_count = 0
        for sub in subfolders:
            sub_path = BASE_POOL / domain / sub
            if sub_path.exists():
                count = sum(1 for _ in sub_path.glob("*.png"))
                domain_count += count
        total_files += domain_count
        print(f" - {domain}: {domain_count} PNG assets")

    print(f"Total Ingested PNG Assets: {total_files}\n")
    return True

if __name__ == "__main__":
    init_pool()
    verify_pool()
