import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

export async function run(core, input) {
    const promptText = input.prompt || input.text || "";
    const safePrompt = typeof promptText === "string" && promptText.trim().length > 0 ? promptText.trim() : "Digital Artwork";
    const targetOutput = path.join("C:\\mymlo\\image_output", `image_${Date.now()}.png`);
    
    fs.mkdirSync("C:\\mymlo\\image_output", { recursive: true });

    // 1. Vision Analysis if image file attached
    if (input.file && input.file.data) {
        const visionPrompt = `You are a vision-capable AI assistant. Analyze this image and describe its visual composition, colors, subjects, and key design elements in detail:`;
        return core.think(visionPrompt, { image: input.file.data });
    }

    // 2. True AI Image Generation (Primary Engine)
    try {
        console.log(`[IMAGE SKILL] Attempting AI Image generation for: "${safePrompt}"`);
        
        // If core supports a direct image endpoint, call it here:
        const aiResponse = typeof core.generateImage === "function" ? 
            await core.generateImage({ prompt: safePrompt, output: targetOutput }) : null;

        if (aiResponse && aiResponse.success) {
            return {
                ok: true,
                response: `AI-generated image rendered and saved to ${targetOutput}`,
                image_path: targetOutput,
                engine: "ai_diffusion"
            };
        }
    } catch (aiErr) {
        console.warn(`[IMAGE SKILL] AI Image generation skipped/failed (${aiErr.message}). Falling back to local procedural engine...`);
    }

    // 3. Local Image Rendering via local_image.py (Fallback Engine)
    try {
        const scriptPath = path.resolve(process.cwd(), "local_image.py");
        const pythonBin = process.platform === "win32" ? "python" : "python3";
        const args = [scriptPath, "--prompt", safePrompt, "--output_path", targetOutput];

        const child = spawnSync(pythonBin, args, {
            cwd: process.cwd(),
            encoding: "utf8",
            env: { ...process.env, PYTHONUNBUFFERED: "1" }
        });

        if (child.error) throw child.error;
        if (child.status !== 0) throw new Error(child.stderr || child.stdout || "local_image.py execution failed");

        return {
            ok: true,
            response: `Local procedural artwork rendered and saved to ${targetOutput}`,
            image_path: targetOutput,
            engine: "local_image_py"
        };
    } catch (localErr) {
        return {
            ok: false,
            error: `Image generation failed: ${localErr.message}`
        };
    }
}
