import { execSync } from "child_process";
import path from "path";

export async function run(core, input) {
  const { prompt, lyrics = "", duration_sec = 30, output_path = "C:\\mymlo\\audio_output\\output.wav" } = input || {};

  if (!prompt) {
    return { error: "Missing prompt" };
  }

  try {
    console.log(`[MUSIC SKILL] Running local audio engine for: "${prompt}"`);
    const cmd = `python C:\\mymlo\\projects\\code_snap\\local_audio_engine.py --prompt "${prompt}" --duration ${duration_sec} --output_path "${output_path}"`;
    
    execSync(cmd, { stdio: "inherit" });

    return { 
      ok: true, 
      response: `Audio successfully generated and saved to ${output_path}`, 
      master_wav: output_path 
    };
  } catch (err) {
    return { ok: false, error: `Audio generation failed: ${err.message}` };
  }
}