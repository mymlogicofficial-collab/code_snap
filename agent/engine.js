import axios from "axios";
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
    // Prefer going through the app proxy so model traffic stays local to the app
    const proxyURL = process.env.PROXY_INTERNAL_URL || "http://localhost:3000/proxy/generate";
    const target = process.env.USE_PROXY_INTERNAL === "true" ? proxyURL : this.localURL;

    const payload = {
      model: attachments.model || this.localModel,
      prompt,
      stream: false
    };

    if (attachments.image) payload.images = [attachments.image];

    const res = await axios.post(target, payload, { timeout: 120000 });

    // Support several response shapes: { response: '...' } or raw model data
    if (res?.data && typeof res.data === "object") {
      if (res.data.response) return { text: res.data.response };
      if (res.data.result) return { text: res.data.result };
      return { text: JSON.stringify(res.data) };
    }

    return { text: String(res?.data || "") };
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

  recover() {
    this.failCount = 0;
    this.mode = "local";
    logInfo("Engine", "Engine restarted in LOCAL mode");
    return { text: "Engine auto-recovered and restarted." };
  }
}
