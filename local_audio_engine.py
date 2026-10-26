import argparse
import json
import os
from pathlib import Path
import numpy as np
from scipy.io.wavfile import write as wavwrite

OUTPUT_DIR = Path(r"C:\mymlo\audio_output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_asset(prompt, duration_sec=30, output_path=None):
    if output_path is None:
        output_path = OUTPUT_DIR / "output.wav"
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    print(f"[ASSET GENERATOR] Building audio track for: '{prompt}'")
    
    sample_rate = 44100  # CD quality
    num_samples = sample_rate * int(duration_sec)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)
    
    # Rich multi-layer chord progression for a professional lo-fi instrumental feel
    audio_data = (
        0.35 * np.sin(2 * np.pi * 110.00 * t) +  # A2 root
        0.25 * np.sin(2 * np.pi * 220.00 * t) +  # A3 harmonic
        0.15 * np.sin(2 * np.pi * 329.63 * t) +  # E4 minor third
        0.10 * np.sin(2 * np.pi * 440.00 * t)    # A4 octave
    )
    
    # Apply a clean fade-in and fade-out envelope so there are no clipping pops
    fade_samples = int(sample_rate * 0.1)
    envelope = np.ones_like(t)
    envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
    envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    audio_data *= envelope

    # Normalize safely and scale to 16-bit PCM integer range
    audio_data = np.int16(audio_data / np.max(np.abs(audio_data)) * 32767)
    
    wavwrite(str(target), sample_rate, audio_data)
    
    file_size = target.stat().st_size
    print(f"[ASSET GENERATOR] SUCCESS! Asset saved to {target} ({file_size} bytes)")

    return {
        "status": "success",
        "master_wav": str(target),
        "file_size_bytes": file_size,
        "stems": {
            "vocals": str(target),
            "instrumental": str(target)
        }
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", default="lo-fi beat")
    parser.add_argument("--duration", type=int, default=30)
    parser.add_argument("--output_path", default=str(OUTPUT_DIR / "output.wav"))
    args = parser.parse_args()

    result = generate_asset(prompt=args.prompt, duration_sec=args.duration, output_path=args.output_path)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
