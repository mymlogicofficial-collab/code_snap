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
      const category = categorizeError(err.message);
      logError(`Engine.${category}`, err.message);

      this.failCount++;

      if (this.failCount >= this.maxFails) {
        logInfo("Engine", "Auto-recovery triggered");
        return this.recover();
      }

      return { error: category, details: err.message };
    }
  }

  async sendLocal(prompt) {
    const res = await axios.post(this.localURL, {
      model: this.localModel,
      prompt,
      stream: false
    });

    return { text: res.data.response };
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
