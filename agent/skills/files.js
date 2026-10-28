import fs from "fs";
import path from "path";

export async function run(core, input) {
  try {
    const operation = input.operation || "summarize";

    switch (operation) {
      case "create": {
        const targetPath = path.resolve(process.cwd(), input.path);
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(targetPath, input.content || "", "utf8");

        return {
          ok: true,
          operation: "create",
          path: targetPath,
          size: fs.statSync(targetPath).size,
          text: `Created file ${input.path}`
        };
      }

      case "exists": {
        const targetPath = path.resolve(process.cwd(), input.path);

        return {
          ok: true,
          operation: "exists",
          path: targetPath,
          exists: fs.existsSync(targetPath)
        };
      }

      case "read": {
        const targetPath = path.resolve(process.cwd(), input.path);

        return {
          ok: true,
          operation: "read",
          path: targetPath,
          content: fs.readFileSync(targetPath, "utf8")
        };
      }

      default: {
        const file = input.file;

        const summaryPrompt = `
You are a coding agent. Summarize this file and identify useful code patterns.
Filename: ${file.name}
Content:
${file.data.toString()}
`;

        return core.think(summaryPrompt);
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: err.message
    };
  }
}
