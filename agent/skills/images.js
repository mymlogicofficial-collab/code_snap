export async function run(core, input) {
  const promptText = input.prompt || input.text || "";

  // If input contains image attachment file -> Image Vision Analysis
  if (input.file && input.file.data) {
    const visionPrompt = `You are a vision-capable AI assistant. Analyze this image and describe its visual composition, colors, subjects, and key design elements in detail:`;
    return core.think(visionPrompt, { image: input.file.data });
  }

  // If text prompt asking to generate an image/logo/visual asset
  const safePrompt = typeof promptText === "string" ? promptText.trim() : "Visual Artwork";

  const imageGenPrompt = `
You are a master digital artist and visual design guru.
The user requested visual artwork generation for: "${safePrompt}".
Provide a detailed visual art specification, color palette breakdown, lighting mood, scene framing, and camera lens settings for this image request.
`;

  try {
    const result = await core.think(imageGenPrompt);
    return {
      ok: true,
      prompt: safePrompt,
      response: result?.text || result?.response || `Visual asset specification generated for: "${safePrompt}"`,
      mode: "image_generation"
    };
  } catch (err) {
    return {
      ok: false,
      error: `Image pipeline error: ${err.message}`
    };
  }
}
