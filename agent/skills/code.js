import fs from "fs";
import path from "path";

export async function run(core, input) {
  const repoRoot = process.cwd();
  const targetPath = input.path ? path.resolve(repoRoot, input.path) : null;

  // If the user/agent provided a path and content, write it directly to disk
  if (targetPath && input.content) {
    if (!targetPath.startsWith(repoRoot)) {
      return { error: "INVALID_PATH", details: "Path must be inside the repository root." };
    }

    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(targetPath, input.content, "utf8");
      return { ok: true, message: `Successfully wrote file to ${input.path}` };
    } catch (err) {
      return { error: "FILE_WRITE_FAILED", details: err.message };
    }
  }

  // Fallback: Code analysis prompt if no direct write parameters are passed
  const prompt = `
You are an expert local code assistant. Analyze the following code, identify bugs or bottlenecks, and provide a production-ready, improved version:
${input.code || input.text || ""}
`;

  return core.think(prompt);
}
