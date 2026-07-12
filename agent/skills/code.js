
export async function run(core, input) {
  const prompt = `
Analyze this code and provide improvements:
${input.code}
`;

  return core.think(prompt);
}
