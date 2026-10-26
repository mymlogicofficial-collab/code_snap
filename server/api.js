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

  // Core Chat Handler
  app.post("/chat", async (req, res) => {
    try {
      const payloadText = req.body.text || req.body.prompt || req.body.message;
      const result = await router.handle({ type: "text", text: payloadText });
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

  // Music Generation Handler (Matched to frontend /music fetch call)
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

  // Video Generation Handler (Matched to frontend /video fetch call)
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

  // System Status & GitHub Sync Check (Checks .env and config.json)
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