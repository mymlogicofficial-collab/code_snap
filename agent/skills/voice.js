
export async function run(core, input) {
  const prompt = `
Transcribe this audio and respond naturally.
`;

  return core.think(prompt, { audio: input.audio.data });
}
