import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { exec } from "child_process";
import { logError, logInfo } from "../utils/logger.js";
import axios from "axios";

// Load environment variables from local .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

function autoSaveGeneratedFiles(text, promptText) {
  if (!text || typeof text !== "string") return text;

  // 1. Check for filename mentioned in user prompt, e.g. "create file project_memory.js" or "named foo.kt"
  let promptTargetFile = null;
  const match = promptText.match(/(?:file|create|named|called|write)\s+([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)/i);
  if (match) {
    promptTargetFile = match[1];
  }

  // 2. Extract code blocks from LLM response
  const codeBlockRegex = /```(?:[a-zA-Z0-9_+\-]*[:\s]+([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+))?\r?\n([\s\S]*?)```/g;
  let codeMatch;
  const savedFiles = [];

  while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
    const headerPath = codeMatch[1];
    const codeContent = codeMatch[2];

    const targetFile = headerPath || promptTargetFile;
    if (targetFile && codeContent && codeContent.trim().length > 0) {
      try {
        const repoRoot = process.cwd();
        const absolutePath = path.resolve(repoRoot, targetFile);

        if (absolutePath.startsWith(repoRoot)) {
          const dir = path.dirname(absolutePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          fs.writeFileSync(absolutePath, codeContent.trim(), "utf8");
          savedFiles.push(targetFile);
          logInfo("AutoCoder", `Automatically wrote generated code to file: ${absolutePath}`);
        }
      } catch (err) {
        logError("AutoCoder", `Failed to auto-save file ${targetFile}: ${err.message}`);
      }
    }
  }

  if (savedFiles.length > 0) {
    return `✅ Automatically generated and wrote file(s) to disk: [${savedFiles.join(", ")}]\n\n` + text;
  }

  return text;
}

export async function startServer({ router, port } = {}) {
  const app = express();

  // Middleware configuration
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(fileUpload());

  // Serve the UI directory statically
  const uiDir = path.join(__dirname, "../ui");
  if (fs.existsSync(uiDir)) {
    app.use(express.static(uiDir));
    app.get("/", (req, res) => res.sendFile(path.join(uiDir, "index.html")));
    app.get("/debug", (req, res) => res.sendFile(path.join(uiDir, "debug.html")));
    app.get("/marketplace", (req, res) => res.sendFile(path.join(uiDir, "marketplace.html")));
  }

  logInfo("Server", "ODDS API server starting up...");

  // Health check
  app.get("/health", (req, res) => {
    res.json({ ok: true, status: "ready", system: "ODDS (Ollama-mated Design & Development System)" });
  });

  // Direct File Upload Endpoint
  app.post("/api/upload", (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ ok: false, error: "No files uploaded" });
      }

      const uploadedFile = req.files.file || req.files.audio || req.files.image;
      if (!uploadedFile) {
        return res.status(400).json({ ok: false, error: "File field missing" });
      }

      const uploadDir = path.join(PROJECT_ROOT, "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const safeName = `${Date.now()}_${uploadedFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const destPath = path.join(uploadDir, safeName);

      uploadedFile.mv(destPath, (err) => {
        if (err) {
          logError("API.upload", err.message);
          return res.status(500).json({ ok: false, error: err.message });
        }
        res.json({
          ok: true,
          fileName: uploadedFile.name,
          filePath: destPath,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimetype
        });
      });
    } catch (err) {
      logError("API.upload", err?.message || String(err));
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Core Chat Handler
  app.post("/chat", async (req, res) => {
    try {
      const payloadText = req.body.text || req.body.prompt || req.body.message;
      let request = { type: "text", text: payloadText };

      // Route image generation requests directly to ImageSkill
      if (/(?:generate|create|draw|paint|make)\s+(?:an?\s+)?(?:image|picture|artwork|logo|photo|illustration|drawing)/i.test(payloadText)) {
        request = { type: "image", prompt: payloadText, text: payloadText };
      }

      const result = await router.handle(request);

      // Auto-extract code blocks and write generated code directly to disk
      if (result && typeof result.response === "string") {
        result.response = autoSaveGeneratedFiles(result.response, payloadText);
      } else if (result && typeof result.text === "string") {
        result.text = autoSaveGeneratedFiles(result.text, payloadText);
      }

      res.json(result);
    } catch (err) {
      logError("API.chat", err?.message || String(err));
      res.status(500).json({ ok: false, error: "Chat handler failed", details: err?.message });
    }
  });

  // Image Generation Handler
  app.post("/image/generate", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ ok: false, error: "Missing prompt" });
      }
      const result = await router.handle({ type: "image-generation", prompt });
      res.json(result);
    } catch (err) {
      logError("API.image.generate", err?.message || String(err));
      res.status(500).json({ ok: false, error: "Image generation failed", details: err?.message });
    }
  });

  // Code Execution Handler (Router fallback)
  app.post("/execute", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await router.handle({ type: "execute", code });
      res.json(result);
    } catch (err) {
      logError("API.execute", err?.message || String(err));
      res.status(500).json({ ok: false, error: "Execute handler failed", details: err?.message });
    }
  });

  // Direct Shell Command Execution Kernel (Executes commands on host machine)
  app.post("/api/execute-command", async (req, res) => {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ ok: false, error: "Missing command to execute" });
    }

    logInfo("API.ExecuteCommand", `Running shell command: ${command}`);
    exec(command, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
      if (error) {
        logError("API.ExecuteCommand", error.message);
        return res.json({ ok: false, error: error.message, stderr, stdout });
      }
      res.json({ ok: true, stdout, stderr });
    });
  });

  // Direct File Writer Endpoint
  app.post("/api/write-file", async (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ ok: false, error: "Missing filePath or content" });
    }

    try {
      const absolutePath = path.resolve(PROJECT_ROOT, filePath);
      fs.writeFileSync(absolutePath, content, "utf8");
      logInfo("API.writeFile", `Successfully wrote to ${absolutePath}`);
      res.json({ ok: true, path: absolutePath });
    } catch (err) {
      logError("API.writeFile", err?.message || String(err));
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Direct File Reader Endpoint (Streams audio, video, images, or text)
  app.get("/api/read-file", (req, res) => {
    const targetPath = req.query.path || req.query.filePath;
    if (!targetPath) {
      return res.status(400).json({ ok: false, error: "Missing path parameter" });
    }

    try {
      const resolvedPath = path.resolve(targetPath);
      if (fs.existsSync(resolvedPath)) {
        return res.sendFile(resolvedPath);
      }
      return res.status(404).json({ ok: false, error: "File not found" });
    } catch (err) {
      logError("API.readFile", err?.message || String(err));
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // Diagnostics Handler
  app.post("/diagnostics", async (req, res) => {
    try {
      const result = await router.handle({
        type: "diagnostics"
      });
      res.json(result);
    } catch (err) {
      logError("API.diagnostics", err?.message || String(err));
      res.status(500).json({
        ok: false,
        error: "Diagnostics failed",
        details: err?.message
      });
    }
  });

  // Music Generation Handler
  app.post("/music", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      const result = await router.handle({ type: "music", prompt });
      res.json(result);
    } catch (err) {
      logError("API.music", err?.message || String(err));
      res.status(500).json({ ok: false, error: "Music handler failed", details: err?.message });
    }
  });

  // Video Generation Handler
  app.post("/video", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      const result = await router.handle({ type: "video", prompt });
      res.json(result);
    } catch (err) {
      logError("API.video", err?.message || String(err));
      res.status(500).json({ ok: false, error: "Video handler failed", details: err?.message });
    }
  });

  // System Status
  app.get("/status", (req, res) => {
    try {
      let cfg = {};
      if (fs.existsSync("./config.json")) {
        cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      }

      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || cfg?.github?.token;
      const githubConfigured = !!(token && token.trim() !== "");

      res.json({
        ok: true,
        githubConfigured,
        githubStatus: githubConfigured ? "Connected" : "Not configured",
        ollamaStatus: "Connected",
        system: "ODDS Active"
      });
    } catch (err) {
      logError("API.status", err?.message || String(err));
      res.json({ ok: false, githubConfigured: false, ollamaStatus: "Error" });
    }
  });

  // System Logs Route
  app.get("/logs", (req, res) => {
    try {
      const logPath = "logs/error.log";
      const text = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "No errors logged yet.";
      res.type("text/plain").send(text);
    } catch (err) {
      res.type("text/plain").send("Could not read logs.");
    }
  });

  const listenPort = port || Number(process.env.API_PORT) || 3000;
  app.listen(listenPort, () => {
    logInfo("Server", `ODDS API Server listening on port ${listenPort}`);
  });

  return app;
}
