export async function run(core, input) {
  const { prompt, lyrics = "", duration_sec = 30, output_path } = input || {};

  if (!prompt) {
    return { error: "Missing prompt" };
  }

  return {
    ok: true,
    prompt,
    status: "ready_for_frame_pipeline",
    text: `Video generation request accepted for: "${prompt}". Wire in your frame-by-frame generation service here.`
  };
}
