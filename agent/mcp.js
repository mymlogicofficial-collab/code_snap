
// Simple MCP-style tool registry placeholder

const tools = {
  summarizeFile: {
    description: "Summarize an uploaded file",
    run: async (core, input) => {
      const prompt = `Summarize this file:\n${input.content}`;
      return core.think(prompt);
    }
  }
};

export function listTools() {
  return Object.keys(tools).map((name) => ({
    name,
    description: tools[name].description
  }));
}

export async function runTool(core, name, input) {
  if (!tools[name]) {
    return { error: `Tool ${name} not found` };
  }
  return tools[name].run(core, input);
}
