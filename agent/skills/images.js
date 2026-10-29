import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

export async function run(core, input) {
  const promptText = input.prompt || input.text || "";

  // 1. Vision Analysis if image file attached
  if (input.file && input.file.data) {
    const visionPrompt = `You are a vision-capable AI assistant. Analyze this image and describe its visual composition, colors, subjects, and key design elements in detail:`;
    return core.think(visionPrompt, { image: input.file.data });
  }

  // 2. Local Image Rendering via local_image.py
  const safePrompt = typeof promptText === "string" && promptText.trim().length > 0 ? promptText.trim() : "Digital Artwork";
  const targetOutput = path.join("C:\\mymlo\\image_output", `image_${Date.now()}.png`);

  try {
    const scriptPath = path.resolve(process.cwd(), "local_image.py");
    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const args = [
      scriptPath,
      "--prompt", safePrompt,
      "--output_path", targetOutput
    ];

    console.log(`[IMAGE SKILL] Executing local_image.py for: "${safePrompt}"`);
    const child = spawnSync(pythonBin, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    if (child.error) throw child.error;
    if (child.status !== 0) throw new Error(child.stderr || child.stdout || "local_image.py execution failed");

    const outputLines = (child.stdout || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let parsedResult = null;

    for (let i = outputLines.length - 1; i >= 0; i--) {
      try {
        parsedResult = JSON.parse(outputLines[i]);
        break;
      } catch {
        // continue
      }
    }

    if (parsedResult && parsedResult.status === "success") {
      return {
        ok: true,
        response: `Digital artwork PNG rendered and saved to ${parsedResult.output_path || targetOutput}`,
        output_path: parsedResult.output_path || targetOutput,
        image_path: parsedResult.output_path || targetOutput,
        engine: parsedResult.engine || "local_image_py"
      };
    }
  } catch (localErr) {
    console.warn(`[IMAGE SKILL] local_image.py error (${localErr.message}). Attempting OpenRouter fallback...`);
  }

  // 3. OpenRouter Fallback
  try {
    const fallbackPrompt = `The user requested image artwork generation for: "${safePrompt}". Provide a complete visual composition breakdown, artwork style guide, and digital design prompt specifications.`;
    const fallbackResponse = await core.think(fallbackPrompt);

    return {
      ok: true,
      response: fallbackResponse?.text || fallbackResponse?.response || "Image specification generated via OpenRouter fallback.",
      mode: "openrouter_fallback"
    };
  } catch (fallbackErr) {
    return {
      ok: false,
      error: `Image generation failed: ${fallbackErr.message}`
    };
  }
}
