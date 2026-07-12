
export async function run(core, input) {
  const file = input.file;

  const summaryPrompt = `
You are a coding agent. Summarize this file and identify useful code patterns.
Filename: ${file.name}
Content:
${file.data.toString()}
`;

  return core.think(summaryPrompt);
}
