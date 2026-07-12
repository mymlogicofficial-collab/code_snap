import axios from "axios";
import { logError, logInfo } from "../utils/logger.js";

export class Engine {
  constructor(config) {
    this.mode = config.mode;
    this.localURL = config.localURL;
    this.localModel = config.localModel;
    this.webURL = config.webURL;
    this.webKey = config.webKey;

    logInfo("Engine", `Initialized in ${this.mode} mode`);
  }

  async send(prompt, attachments = {}) {
    try {
      if (this.mode === "local") {
        return await this.sendLocal(prompt, attachments);
      } else {
        return await this.sendWeb(prompt, attachments);
      }
    } catch (err) {
      logError("Engine.send", err.message);
      return { error: "Engine failure", details: err.message };
    }
  }

  async sendLocal(prompt, attachments) {
    try {
      const res = await axios.post(this.localURL, {
        model: this.localModel,
        prompt,
        stream: false
      });

      return { text: res.data.response };
    } catch (err) {
      logError("Engine.local", err.message);
      return { error: "Local engine error", details: err.message };
    }
  }

  async sendWeb(prompt, attachments) {
    try {
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
    } catch (err) {
      logError("Engine.web", err.message);
      return { error: "Web API error", details: err.message };
    }
  }
}
