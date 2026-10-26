import axios from "axios";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { logError, logInfo } from "../utils/logger.js";
import { categorizeError } from "../utils/errors.js";

export class Engine {
  constructor(config) {
    this.mode = config.mode;
    this.localURL = config.localURL;
    this.localModel = config.localModel;
    this.webURL = config.webURL;
    this.webKey = config.webKey;

    this.failCount = 0;
    this.maxFails = 3;

    logInfo("Engine", `Initialized in ${this.mode} mode`);
  }

  async send(prompt, attachments = {}) {
    try {
      const result =
        this.mode === "local"
          ? await this.sendLocal(prompt, attachments)
          : await this.sendWeb(prompt, attachments);

      this.failCount = 0;
      return result;
    } catch (err) {
      const msg = err?.message || String(err);
      const category = categorizeError(msg);
      logError(`Engine.${category}`, msg);

      this.failCount++;

      if (this.failCount >= this.maxFails) {
        logInfo("Engine", "Auto-recovery triggered");
        return this.recover();
      }

      return { error: category, details: msg };
    }
  }

  async sendLocal(prompt, attachments = {}) {
    const proxyURL = process.env.PROXY_INTERNAL_URL || "http://localhost:3001/api/generate";
    const target = process.env.USE_PROXY_INTERNAL === "true" ? proxyURL : this.localURL;

    const payload = {
      model: attachments.model || this.localModel,
      prompt,
      stream: false
    };

    if (attachments.image) payload.images = [attachments.image];

    console.log("TARGET =", target);
    console.log("LOCAL URL =", this.localURL);

    try {
      // Attempt Local Generation with a generous timeout
      const res = await axios.post(target, payload, { timeout: 180000 }); // 3 min local cap

      if (res?.data && typeof res.data === "object") {
        if (res.data.response) return { text: res.data.response };
        if (res.data.result) return { text: res.data.result };
        return { text: JSON.stringify(res.data) };
      }

      return { text: String(res?.data || "") };

    } catch (localError) {
      console.warn("[Engine] Local generation timed out/failed. Checking OpenRouter fallback...");

      // Fallback to OpenRouter if balance/key is available and local choked on heavy payload
      if (process.env.OPENROUTER_API_KEY) {
        try {
          const openRouterRes = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "qwen/qwen-2.5-coder-32b-instruct",
            messages: [{ role: "user", content: prompt }]
          }, {
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://thinkmym.com",
              "X-Title": "ODDS Local Bridge"
            },
            timeout: 30000
          });

          return { text: openRouterRes.data.choices[0].message.content };
        } catch (routerErr) {
          throw new Error(`Local failed (${localError.message}) and OpenRouter fallback failed (${routerErr.message})`);
        }
      }

      throw localError;
    }
  }

  async sendWeb(prompt, attachments) {
    const res = await axios.post(
      this.webURL,
      {
        model: "web-model",
        prompt,
        attachments
      },
      {
        headers: { Authorization: `Bearer ${this.webKey}` }
      }
    );

    return res.data;
  }

  async generateLocalAudio({ prompt, lyrics = "", duration_sec = 30, output_path } = {}) {
    const safePrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!safePrompt) {
      throw new Error("Music prompt is required");
    }

    const scriptPath = path.resolve(process.cwd(), "local_audio_engine.py");
    const pythonBin = process.platform === "win32" ? "python" : process.env.PYTHON_BIN || "python3";

    const modelCandidates = [
      process.env.ACE_STEP_MODEL_DIR,
      "C:\\mymlo\\ACE-Step-1.5",
      "C:\\mymlo\\models\\ace-step-1.5",
      path.resolve(process.cwd(), "ACE-Step-1.5"),
      path.resolve(process.cwd(), "models", "ace-step-1.5"),
    ].filter(Boolean);

    const resolvedModel = modelCandidates.find((candidate) => {
      try {
        return fs.existsSync(candidate);
      } catch {
        return false;
      }
    });

    const args = [
      scriptPath,
      "--prompt",
      safePrompt,
      "--lyrics",
      String(lyrics || ""),
      "--duration",
      String(duration_sec),
    ];

    if (output_path) args.push("--output_path", output_path);
    if (resolvedModel) args.push("--model_dir", resolvedModel);

    const child = spawnSync(pythonBin, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    });

    if (child.error) {
      throw child.error;
    }

    const stdout = child.stdout ? child.stdout.trim() : "";
    const stderr = child.stderr ? child.stderr.trim() : "";

    if (child.status !== 0) {
      throw new Error(stderr || stdout || "Audio engine failed");
    }

    const parsedJSON = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .reverse()
      .find((line) => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
      });

    if (!parsedJSON) {
      throw new Error(stderr || stdout || "Audio engine returned no JSON payload");
    }

    const parsed = JSON.parse(parsedJSON);
    if (parsed?.status === "error") {
      throw new Error(parsed.error || "Audio engine error");
    }

    return parsed;
  }

  recover() {
    this.failCount = 0;
    this.mode = "local";
    logInfo("Engine", "Engine restarted in LOCAL mode");
    return { text: "Engine auto-recovered and restarted." };
  }
}