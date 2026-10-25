import argparse
import json
import os
import shutil
import subprocess
import sys
import traceback
from pathlib import Path

try:
    import torch
except Exception:
    torch = None

MODEL_CANDIDATES = [
    Path(os.environ.get("ACE_STEP_MODEL_DIR", "")) if os.environ.get("ACE_STEP_MODEL_DIR") else None,
    Path(r"C:\mymlo\ACE-Step-1.5"),
    Path(r"C:\mymlo\models\ace-step-1.5"),
    Path(r"C:\mymlo\ACE-Step_1.5"),
]
MODEL_CANDIDATES = [p for p in MODEL_CANDIDATES if p is not None]
OUTPUT_DIR = Path(os.environ.get("ACE_STEP_OUTPUT_DIR", r"C:\mymlo\audio_output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def find_model_dir():
    for candidate in MODEL_CANDIDATES:
        if candidate.exists():
            return candidate
    return MODEL_CANDIDATES[0] if MODEL_CANDIDATES else Path(r"C:\mymlo\ACE-Step-1.5")


def ensure_runtime():
    if shutil.which("python") is None and shutil.which("python3") is None:
        raise RuntimeError("python executable not found on PATH")
    if shutil.which("demucs") is None:
        print("[ENGINE] demucs CLI not found; continuing but stem isolation will fail unless it is installed.")


def build_prompt(prompt, lyrics):
    prompt = (prompt or "").strip()
    lyrics_text = (lyrics or "").strip()
    if not prompt:
        raise ValueError("prompt is required")
    if lyrics_text:
        return f"{prompt}\n\nLyrics:\n{lyrics_text}"
    return prompt


class LocalAudioEngine:
    def __init__(self, model_dir=None, output_dir=None):
        self.device = "cpu"
        self.model_dir = Path(model_dir) if model_dir else find_model_dir()
        self.output_dir = Path(output_dir) if output_dir else OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.pipe = None
        self.runner_script = None
        self._load_pipeline()

    def _load_pipeline(self):
        print(f"[ENGINE] Loading local ACE-Step 1.5 model from: {self.model_dir}")

        if not self.model_dir.exists():
            raise FileNotFoundError(
                f"ACE-Step model dir not found: {self.model_dir}. "
                "Set ACE_STEP_MODEL_DIR or place the model in C:\\mymlo\\ACE-Step-1.5."
            )

        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["CUDA_VISIBLE_DEVICES"] = ""

        try:
            if torch is not None:
                torch.set_grad_enabled(False)
            from transformers import pipeline

            self.pipe = pipeline(
                task="text-to-audio",
                model=str(self.model_dir),
                tokenizer=str(self.model_dir),
                device="cpu",
                torch_dtype=torch.float32,
                local_files_only=True,
                trust_remote_code=True,  # Added to support custom model architecture
            )
            print("[ENGINE] Local transformers pipeline loaded on CPU.")
            return
        except Exception as exc:
            print(f"[ENGINE] transformers pipeline load failed: {exc}")

        for candidate in [
            self.model_dir / "cli.py",
            self.model_dir / "run.py",
            self.model_dir / "inference.py",
            self.model_dir / "generate.py",
            self.model_dir / "app.py",
        ]:
            if candidate.exists():
                self.runner_script = candidate
                print(f"[ENGINE] Found local runner script: {candidate}")
                return

        print("[ENGINE] No compatible local runner script found; model will still be attempted via CLI fallback.")

    def _call_model(self, prompt, lyrics, duration_sec):
        full_prompt = build_prompt(prompt, lyrics)

        if self.pipe is not None:
            try:
                result = self.pipe(
                    full_prompt,
                    generate_kwargs={"do_sample": True, "temperature": 0.7},
                    num_frames=max(1, int(duration_sec * 16000 / 16000)),
                )
                if isinstance(result, dict):
                    if "audio" in result:
                        return result["audio"], result.get("sampling_rate", 16000)
                    if "waveform" in result:
                        return result["waveform"], result.get("sampling_rate", 16000)
                    if "samples" in result:
                        return result["samples"], result.get("sampling_rate", 16000)
                if isinstance(result, (list, tuple)) and len(result) >= 2:
                    return result[0], result[1]
                return result, 16000
            except Exception as exc:
                print(f"[ENGINE] pipe inference failed: {exc}")

        if self.runner_script is not None:
            out_file = self.output_dir / "generated_track.wav"
            cmd = [
                sys.executable,
                str(self.runner_script),
                "--prompt",
                prompt,
                "--lyrics",
                lyrics or "",
                "--duration",
                str(duration_sec),
                "--output",
                str(out_file),
            ]
            print(f"[ENGINE] Running runner: {' '.join(cmd)}")
            subprocess.run(cmd, check=True)
            if out_file.exists():
                return out_file, 16000

        raise RuntimeError(
            "ACE-Step 1.5 local inference did not produce audio output. "
            "Ensure the model is present in C:\\mymlo\\ACE-Step-1.5 or C:\\mymlo\\models\\ace-step-1.5."
        )

    def _write_audio_file(self, audio_data, output_path):
        try:
            import numpy as np
            from scipy.io.wavfile import write as wavwrite
        except Exception as exc:
            raise RuntimeError(f"numpy/scipy required for audio export: {exc}") from exc

        if isinstance(audio_data, Path):
            audio_path = Path(audio_data)
            if audio_path.exists():
                shutil.copyfile(audio_path, output_path)
                return

        if isinstance(audio_data, dict):
            if "audio" in audio_data:
                audio_data = audio_data["audio"]
            elif "waveform" in audio_data:
                audio_data = audio_data["waveform"]
            elif "samples" in audio_data:
                audio_data = audio_data["samples"]
            else:
                raise ValueError("Audio payload does not contain an audio waveform")

        arr = np.asarray(audio_data)
        if arr.ndim == 2:
            arr = arr[:, 0]
        if arr.dtype.kind not in {"f", "i", "u"}:
            arr = arr.astype(np.float32)
        wavwrite(str(output_path), 16000, np.asarray(arr, dtype=np.float32))

    def _isolate_stems(self, wav_path):
        wav_path = Path(wav_path)
        if not wav_path.exists():
            raise FileNotFoundError(f"Wave file not found: {wav_path}")

        out_dir = self.output_dir / "separated"
        out_dir.mkdir(parents=True, exist_ok=True)

        demucs_bin = shutil.which("demucs")
        if not demucs_bin:
            raise RuntimeError("demucs CLI not installed or not on PATH")

        cmd = [
            demucs_bin,
            "--two-stems=vocals",
            "-d",
            "cpu",
            str(wav_path),
            "-o",
            str(out_dir),
        ]
        print(f"[ENGINE] Running stem isolation: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)

        stem_dir = out_dir / "htdemucs" / wav_path.stem
        vocals = stem_dir / "vocals.wav"
        instrumental = stem_dir / "no_vocals.wav"
        if not vocals.exists():
            raise FileNotFoundError(f"Vocals stem missing: {vocals}")
        if not instrumental.exists():
            raise FileNotFoundError(f"Instrumental stem missing: {instrumental}")

        return {
            "vocals": str(vocals),
            "instrumental": str(instrumental),
        }

    def generate(self, prompt, lyrics="", duration_sec=30, output_path=None):
        if output_path is None:
            output_path = self.output_dir / "output.wav"
        target = Path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)

        print(f"[ENGINE] Generating ACE-Step 1.5 track for: {prompt}")
        audio_payload, _ = self._call_model(prompt, lyrics, duration_sec)
        self._write_audio_file(audio_payload, target)

        stem_paths = self._isolate_stems(target)
        return {
            "status": "success",
            "master_wav": str(target),
            "stems": {
                "vocals": stem_paths["vocals"],
                "instrumental": stem_paths["instrumental"],
            },
        }


def main():
    parser = argparse.ArgumentParser(description="Local ACE-Step 1.5 audio engine")
    parser.add_argument("--prompt", required=True, help="Music prompt")
    parser.add_argument("--lyrics", default="", help="Lyrics or text input")
    parser.add_argument("--duration", type=int, default=30, help="Track duration in seconds")
    parser.add_argument("--output_path", default=str(OUTPUT_DIR / "output.wav"), help="Full output WAV path")
    parser.add_argument("--model_dir", default=None, help="Override local model directory")
    args = parser.parse_args()

    try:
        ensure_runtime()
        engine = LocalAudioEngine(model_dir=args.model_dir, output_dir=str(Path(args.output_path).parent))
        result = engine.generate(
            prompt=args.prompt,
            lyrics=args.lyrics,
            duration_sec=args.duration,
            output_path=args.output_path,
        )
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        traceback.print_exc()
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
