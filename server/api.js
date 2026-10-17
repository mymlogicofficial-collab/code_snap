import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logError, logInfo } from "../utils/logger.js";

<<<<<<< Updated upstream
export async function startServer({ router, port } = {}) {
=======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Ollama Models ===
const CODER_MODEL = "qwen2.5-coder";
const IMAGE_MODEL = "llava-phi3:3.8b";

// === Auto-warm models (HDD friendly) ===
async function warmModel(model) {
  try {
    await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: "warmup" })
    });
    logInfo("Warmup", `${model} warmed`);
  } catch (err) {
    logError("Warmup", `Failed to warm ${model}: ${err.message}`);
  }
}

export async function startServer({ router }) {
>>>>>>> Stashed changes
  const app = express();
  app.use(express.json());
  app.use(fileUpload());

  // Serve UI static files
  app.use(express.static(path.join(__dirname, "../ui")));

  logInfo("Server", "API server starting...");

  // Root route - serve debug.html
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../ui/debug.html"));
  });

  // Serve Demo-First Apps
  app.get("/demo/fidgepop", (req, res) => {
    res.sendFile(path.join(__dirname, "../ui/fidgepop.html"));
  });

  app.get("/demo/codeme", (req, res) => {
    res.sendFile(path.join(__dirname, "../ui/codeme.html"));
  });

  app.get("/demo/fortune", (req, res) => {
    res.sendFile(path.join(__dirname, "../ui/fortune.html"));
  });

  app.post("/chat", async (req, res) => {
    try {
      const result = await router.handle({
        type: "text",
        text: req.body.text
      });
      res.json(result);
    } catch (err) {
      logError("API.chat", err.message);
      res.json({ error: "Chat handler failed", details: err.message });
    }
  });

  app.post("/upload", async (req, res) => {
    try {
      const file = req.files.file;
      const result = await router.handle({
        type: "file",
        file
      });
      res.json(result);
    } catch (err) {
      logError("API.upload", err.message);
      res.json({ error: "Upload handler failed", details: err.message });
    }
  });

  app.post("/image", async (req, res) => {
    try {
      const file = req.files.image;
      const result = await router.handle({
        type: "image",
        file
      });
      res.json(result);
    } catch (err) {
      logError("API.image", err.message);
      res.json({ error: "Image handler failed", details: err.message });
    }
  });

  app.post("/voice", async (req, res) => {
    try {
      const audio = req.files.audio;
      const result = await router.handle({
        type: "voice",
        audio
      });
      res.json(result);
    } catch (err) {
      logError("API.voice", err.message);
      res.json({ error: "Voice handler failed", details: err.message });
    }
  });

  app.post("/autoskill", async (req, res) => {
    try {
      const { skillName, description } = req.body;
      const result = await router.handle({
        type: "autoskill",
        skillName,
        description
      });
      res.json(result);
    } catch (err) {
      logError("API.autoskill", err.message);
      res.json({ error: "Auto-skill handler failed", details: err.message });
    }
  });

  app.post("/execute", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await router.handle({
        type: "execute",
        code
      });
      res.json(result);
    } catch (err) {
      logError("API.execute", err.message);
      res.json({ error: "Execute handler failed", details: err.message });
    }
  });

  app.get("/logs", (req, res) => {
    try {
      const text = fs.readFileSync("logs/error.log", "utf8");
      res.type("text/plain").send(text);
    } catch (err) {
      logError("API.logs", err.message);
      res.type("text/plain").send("No logs available.");
    }
  });

<<<<<<< Updated upstream
  const listenPort = port || Number(process.env.API_PORT) || 3000;
  app.listen(listenPort, () => {
    logInfo("Server", `Listening on port ${listenPort}`);
=======
  app.post("/diagnostics", (req, res) => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        ollama_url: "http://localhost:11434",
        local_model: "cieloforge/qwen2.5-coder-7b-instruct-spec:latest",
        allowed_paths: [
          "C:\\mymlo\\projects\\design-studio",
          "C:\\mymlo\\projects\\code_snap",
          "C:\\mymlo\\projects\\website"
        ]
      };
      res.json(diagnostics);
    } catch (err) {
      logError("API.diagnostics", err.message);
      res.json({ error: "Diagnostics failed", details: err.message });
    }
  });

  app.listen(3000, () => {
    logInfo("Server", "Listening on port 3000");
>>>>>>> Stashed changes
  });

  return app;
}
