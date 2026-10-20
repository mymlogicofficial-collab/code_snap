import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logError, logInfo } from "../utils/logger.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer({ router, port } = {}) {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(fileUpload());

  const uiDir = path.join(__dirname, "../ui");
  if (fs.existsSync(uiDir)) {
    app.use(express.static(uiDir));
    app.get("/", (req, res) => res.sendFile(path.join(uiDir, "index.html")));
  }

  logInfo("Server", "API server starting...");

  app.get("/health", (req, res) => {
    res.json({ ok: true, status: "ready" });
  });

  app.post("/chat", async (req, res) => {
    try {
      const result = await router.handle({
        type: "text",
        text: req.body.text
      });
      res.json(result);
    } catch (err) {
      logError("API.chat", err?.message || String(err));
      res.json({ error: "Chat handler failed", details: err?.message });
    }
  });

  app.post("/upload", async (req, res) => {
    try {
      const file = req.files?.file;
      const result = await router.handle({ type: "file", file });
      res.json(result);
    } catch (err) {
      logError("API.upload", err?.message || String(err));
      res.json({ error: "Upload handler failed", details: err?.message });
    }
  });

  app.post("/image", async (req, res) => {
    try {
      const file = req.files?.image;
      const result = await router.handle({ type: "image", file });
      res.json(result);
    } catch (err) {
      logError("API.image", err?.message || String(err));
      res.json({ error: "Image handler failed", details: err?.message });
    }
  });

  app.post("/image/generate", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const result = {
        ok: true,
        prompt,
        text: `Image generation ready for prompt: "${prompt}". Connect your image model to this endpoint to render local or web-generated assets.`,
        mode: "ready"
      };
      res.json(result);
    } catch (err) {
      logError("API.image.generate", err?.message || String(err));
      res.json({ error: "Image generation failed", details: err?.message });
    }
  });

  app.post("/voice", async (req, res) => {
    try {
      const audio = req.files?.audio;
      const result = await router.handle({ type: "voice", audio });
      res.json(result);
    } catch (err) {
      logError("API.voice", err?.message || String(err));
      res.json({ error: "Voice handler failed", details: err?.message });
    }
  });

  app.post("/autoskill", async (req, res) => {
    try {
      const { skillName, description } = req.body;
      const result = await router.handle({ type: "autoskill", skillName, description });
      res.json(result);
    } catch (err) {
      logError("API.autoskill", err?.message || String(err));
      res.json({ error: "Auto-skill handler failed", details: err?.message });
    }
  });

  app.post("/execute", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await router.handle({ type: "execute", code });
      res.json(result);
    } catch (err) {
      logError("API.execute", err?.message || String(err));
      res.json({ error: "Execute handler failed", details: err?.message });
    }
  });

  app.post("/music", async (req, res) => {
    try {
      const { prompt, lyrics = "", duration_sec = 30, output_path } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const result = await router.handle({
        type: "music",
        prompt,
        lyrics,
        duration_sec,
        output_path
      });

      res.json(result);
    } catch (err) {
      logError("API.music", err?.message || String(err));
      res.json({ error: "Music generation failed", details: err?.message });
    }
  });

  app.post("/video", async (req, res) => {
    try {
      const { prompt } = req.body || {};
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const result = await router.handle({ type: "video", prompt });
      res.json(result);
    } catch (err) {
      logError("API.video", err?.message || String(err));
      res.json({ error: "Video generation failed", details: err?.message });
    }
  });

  app.post("/proxy/generate", async (req, res) => {
    try {
      const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      const target = config?.engine?.localURL || "http://localhost:11434/api/generate";

      const axiosRes = await axios.post(target, req.body, {
        headers: { ...req.headers, host: new URL(target).host },
        responseType: "stream",
        timeout: 120000
      });

      res.status(axiosRes.status);
      for (const [k, v] of Object.entries(axiosRes.headers || {})) {
        if (["transfer-encoding", "content-encoding"].includes(k.toLowerCase())) continue;
        res.setHeader(k, v);
      }

      axiosRes.data.pipe(res);
    } catch (err) {
      logError("API.proxy", err?.message || String(err));
      const status = err?.response?.status || 502;
      res.status(status).json({ error: "Proxy to Ollama failed", details: err?.message });
    }
  });

  app.get("/logs", (req, res) => {
    try {
      const text = fs.readFileSync("logs/error.log", "utf8");
      res.type("text/plain").send(text);
    } catch (err) {
      logError("API.logs", err?.message || String(err));
      res.type("text/plain").send("No logs available.");
    }
  });

  app.get("/status", (req, res) => {
    try {
      const cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      const githubConfigured = !!(cfg.webKey && cfg.webURL);
      res.json({ githubConfigured });
    } catch (err) {
      res.json({ githubConfigured: false });
    }
  });

  const listenPort = port || Number(process.env.API_PORT) || 3000;
  app.listen(listenPort, () => {
    logInfo("Server", `Listening on port ${listenPort}`);
  });

  return app;
}
