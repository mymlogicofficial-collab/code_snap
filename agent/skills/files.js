import fs from "fs";
import path from "path";

export async function run(core, input) {
  try {
    const operation = input.operation;

    switch (operation) {
      case "create": {
        const targetPath = path.resolve(process.cwd(), input.path);

        fs.writeFileSync(targetPath, input.content || "", "utf8");

        return {
          ok: true,
          action: "create",
          path: targetPath,
          size: fs.statSync(targetPath).size
        };
      }

      case "read": {
        const targetPath = path.resolve(process.cwd(), input.path);

        return {
          ok: true,
          action: "read",
          path: targetPath,
          content: fs.readFileSync(targetPath, "utf8")
        };
      }

      case "exists": {
        const targetPath = path.resolve(process.cwd(), input.path);

        return {
          ok: true,
          action: "exists",
          path: targetPath,
          exists: fs.existsSync(targetPath)
        };
      }

      default:
        return {
          ok: false,
          error: `Unknown file operation: ${operation}`
        };
    }
  } catch (err) {
    return {
      ok: false,
      error: err.message
    };
  }
}
