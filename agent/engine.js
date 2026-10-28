import axios from "axios";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { logError, logInfo } from "../utils/logger.js";
import { categorizeError } from "../utils/errors.js";

const AUTONOMOUS_SYSTEM_PROMPT = `
SYSTEM DIRECTIVE: You are an autonomous AI coding guru and system developer.
When the user asks to create, update, code, or build a file, module, script, or feature:
1. Output the complete production-ready code directly inside markdown code blocks with the target file path specified in the block header or comments (e.g. \`\`\`javascript:project_memory.js ... \`\`\` or \`\`\`python:script.py ... \`\`\`).
2. DO NOT explain manual steps like "open VSCode", "use touch command", or "navigate to directory". Output the complete code immediately so the system can automatically write the file directly to disk.
`;

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

    const fullPrompt = `${AUTONOMOUS_SYSTEM_PROMPT}\nUSER REQUEST: ${prompt}`;

    const payload = {
      model: attachments.model || this.localModel,
      prompt: fullPrompt,
      stream: false
    };

    if (attachments.image) payload.images = [attachments.image];

    try {
      const res = await axios.post(target, payload, { timeout: 300000 });

      if (res?.data && typeof res.data === "object") {
        if (res.data.response) return { text: res.data.response };
        if (res.data.result) return { text: res.data.result };
        return { text: JSON.stringify(res.data) };
      }

      return { text: String(res?.data || "") };

    } catch (localError) {
      console.warn("[Engine] Local generation timed out/failed. Checking OpenRouter fallback...");

      if (process.env.OPENROUTER_API_KEY) {
        try {
          const openRouterRes = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "qwen/qwen-2.5-coder-32b-instruct",
            messages: [
              { role: "system", content: AUTONOMOUS_SYSTEM_PROMPT },
              { role: "user", content: prompt }
            ]
          }, {
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://thinkmym.com",
              "X-Title": "ODDS Local Bridge"
            },
            timeout: 300000
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
      { model: "web-model", prompt, attachments },
      { headers: { Authorization: `Bearer ${this.webKey}` } }
    );
    return res.data;
  }

  async generateLocalAudio({ prompt, lyrics = "", duration_sec = 30, output_path } = {}) {
    const safePrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!safePrompt) throw new Error("Music prompt is required");

    const scriptPath = path.resolve(process.cwd(), "local_audio_engine.py");
    const pythonBin = process.platform === "win32" ? "python" : "python3";

    const args = [
      scriptPath,
      "--prompt", safePrompt,
      "--lyrics", String(lyrics || ""),
      "--duration", String(duration_sec)
    ];

    if (output_path) args.push("--output_path", output_path);

    const child = spawnSync(pythonBin, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    if (child.error) throw child.error;
    if (child.status !== 0) throw new Error(child.stderr || child.stdout || "Audio engine failed");

    const stdout = child.stdout ? child.stdout.trim() : "";
    const outputLines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let parsedResult = null;

    for (let i = outputLines.length - 1; i >= 0; i--) {
      try {
        parsedResult = JSON.parse(outputLines[i]);
        break;
      } catch {
        // continue
      }
    }

    if (!parsedResult) throw new Error("Audio engine returned no JSON payload");
    return parsedResult;
  }

  recover() {
    this.failCount = 0;
    this.mode = "local";
    logInfo("Engine", "Engine restarted in LOCAL mode");
    return { text: "Engine auto-recovered and restarted." };
  }
}
