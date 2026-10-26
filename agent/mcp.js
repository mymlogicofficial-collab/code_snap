import fs from "fs";
import path from "path";

const tools = {
  summarizeFile: {
    description: "Read a file and summarize its contents for the agent.",
    run: async (core, input) => {
      const filePath = input.filePath || input.path;
      if (!filePath) {
        return { error: "MISSING_FILE_PATH", details: "filePath is required" };
      }

      const safePath = path.resolve(filePath);
      const text = fs.readFileSync(safePath, "utf8");
      const response = await core.think(`Summarize this file content and identify any issues or improvements:\n\n${text}`);
      return { ok: true, text: response?.text || text.slice(0, 500) };
    }
  },
  listDirectory: {
    description: "List files in a local directory.",
    run: async (_core, input) => {
      const dir = input.dir || process.cwd();
      return {
        ok: true,
        entries: fs.readdirSync(path.resolve(dir), { withFileTypes: true }).map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "dir" : "file"
        }))
      };
    }
  },
  readFile: {
    description: "Read a file and return raw text content.",
    run: async (_core, input) => {
      const filePath = input.filePath || input.path;
      if (!filePath) {
        return { error: "MISSING_FILE_PATH" };
      }
      const text = fs.readFileSync(path.resolve(filePath), "utf8");
      return { ok: true, content: text };
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
  const tool = tools[name];
  if (!tool) {
    return { error: `Tool ${name} not found` };
  }
  return tool.run(core, input);
}
