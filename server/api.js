import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { logError, logInfo } from "../utils/logger.js";
import axios from "axios";

// Load environment variables from local .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Code Execution Handler
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

  // System Status & GitHub Sync Check (Checks .env and config.json)
  app.get("/status", (req, res) => {
    try {
      let cfg = {};
      if (fs.existsSync("./config.json")) {
        cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      }

      // Check environment variables from .env as well as config.json
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
