
export async function run(core, input) {
  const prompt = `
You are a coding agent with vision capabilities.
Analyze this image and describe its contents.
`;

  return core.think(prompt, { image: input.file.data });
}
