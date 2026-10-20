export async function run(core, input) {
  const { prompt, lyrics = "", duration_sec = 30, output_path } = input || {};

  if (!prompt) {
    return { error: "Missing prompt" };
  }

  return core.generateMusic({ prompt, lyrics, duration_sec, output_path });
}
