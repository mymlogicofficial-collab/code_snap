import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

export async function run(core, input) {
  const { prompt, lyrics = "", duration_sec = 10, output_path } = input || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return { error: "Missing or invalid prompt for video generation" };
  }

  const safePrompt = prompt.trim();
  const safeDuration = Number(duration_sec) || 10;
  const targetOutput = output_path || path.join("C:\\mymlo\\video_output", `video_${Date.now()}.mp4`);

  // 1. Attempt local CPU video rendering using local_video_engine.py
  try {
    const scriptPath = path.resolve(process.cwd(), "local_video_engine.py");
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`local_video_engine.py not found at ${scriptPath}`);
    }

    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const args = [
      scriptPath,
      "--prompt", safePrompt,
      "--duration", String(safeDuration),
      "--output_path", targetOutput
    ];

    console.log(`[VIDEO SKILL] Running local CPU video engine for: "${safePrompt}"`);
    const child = spawnSync(pythonBin, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    if (child.error) {
      throw child.error;
    }

    if (child.status !== 0) {
      throw new Error(child.stderr || child.stdout || "Video engine execution failed");
    }

    // Parse clean JSON output from python script
    const outputLines = (child.stdout || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let parsedResult = null;

    for (let i = outputLines.length - 1; i >= 0; i--) {
      try {
        parsedResult = JSON.parse(outputLines[i]);
        break;
      } catch {
        // keep searching backwards for JSON payload
      }
    }

    if (parsedResult && parsedResult.status === "success") {
      return {
        ok: true,
        response: `Video successfully rendered and saved to ${parsedResult.output_path || targetOutput}`,
        output_path: parsedResult.output_path || targetOutput,
        duration_sec: safeDuration,
        mode: "local_cpu"
      };
    }
  } catch (localErr) {
    console.warn(`[VIDEO SKILL] Local CPU video engine failed (${localErr.message}). Catching and attempting OpenRouter LLM fallback...`);
  }

  // 2. OpenRouter API Fallback Catch System
  try {
    const fallbackPrompt = `The user requested video generation for: "${safePrompt}". Provide a complete cinematic storyboard, shot list, scene directions, camera angles, and AI video prompt instructions.`;
    const fallbackResponse = await core.think(fallbackPrompt);

    return {
      ok: true,
      response: fallbackResponse?.text || fallbackResponse?.response || "Video pipeline completed via OpenRouter fallback.",
      mode: "openrouter_fallback",
      note: "Local CPU video engine skipped/failed; generated video storyboard via OpenRouter AI model."
    };
  } catch (fallbackErr) {
    return {
      ok: false,
      error: `Video generation pipeline failed locally and on OpenRouter fallback: ${fallbackErr.message}`
    };
  }
}
