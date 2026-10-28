import path from "path";

export async function run(core, input) {
  const { prompt = "lo-fi beat", lyrics = "", duration_sec = 30, output_path } = input || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return { error: "Missing prompt" };
  }

  const safePrompt = prompt.trim();
  const safeDuration = Number(duration_sec) || 30;
  const targetOutput = output_path || path.join("C:\\mymlo\\audio_output", `master_${Date.now()}.wav`);

  // 1. Attempt local CPU audio generation & studio mastering DSP pipeline
  try {
    console.log(`[MUSIC SKILL] Running local CPU studio audio engine & DSP mastering pipeline for: "${safePrompt}"`);
    const localResult = await core.generateMusic({
      prompt: safePrompt,
      lyrics,
      duration_sec: safeDuration,
      output_path: targetOutput
    });

    if (localResult && (localResult.status === "success" || localResult.master_wav)) {
      return {
        ok: true,
        response: `Studio-quality master track generated and formatted for Spotify (-14 LUFS / -1.0 dBFS Peak). Saved to ${localResult.master_wav}`,
        master_wav: localResult.master_wav || targetOutput,
        spotify_ready_mp3: localResult.spotify_ready_mp3 || null,
        mastering_specs: localResult.mastering_specs || null,
        stems: localResult.stems || null,
        mode: "studio_master_cpu"
      };
    }
  } catch (localErr) {
    console.warn(`[MUSIC SKILL] Local CPU studio audio engine failed (${localErr.message}). Catching and attempting OpenRouter LLM fallback...`);
  }

  // 2. Fallback catch system: Use OpenRouter API via core.think
  try {
    const fallbackPrompt = `The user requested music generation for: "${safePrompt}". Provide a complete musical arrangement, chord breakdown, lyrics, and studio mastering FX guide for this track.`;
    const fallbackResponse = await core.think(fallbackPrompt);

    return {
      ok: true,
      response: fallbackResponse?.text || fallbackResponse?.response || "Music pipeline completed via OpenRouter fallback.",
      mode: "openrouter_fallback",
      note: "Local CPU studio audio engine skipped/failed; generated musical structure via OpenRouter AI model."
    };
  } catch (fallbackErr) {
    return {
      ok: false,
      error: `Music generation pipeline failed locally and on OpenRouter fallback: ${fallbackErr.message}`
    };
  }
}
