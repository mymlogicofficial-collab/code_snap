import express from "express";
import fileUpload from "express-fileupload";
import { logError, logInfo } from "../utils/logger.js";

export async function startServer({ router }) {
  const app = express();
  app.use(express.json());
  app.use(fileUpload());

  logInfo("Server", "API server starting...");

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

  app.listen(3000, () => {
    logInfo("Server", "Listening on port 3000");
  });
}
