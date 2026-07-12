import axios from "axios";

export class Engine {
  constructor(config) {
    this.mode = config.mode;
    this.localURL = config.localURL;
    this.localModel = config.localModel;
    this.webURL = config.webURL;
    this.webKey = config.webKey;
  }

  async send(prompt, attachments = {}) {
    return this.mode === "local"
      ? this.sendLocal(prompt, attachments)
      : this.sendWeb(prompt, attachments);
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
      return { error: "Web API error", details: err.message };
    }
  }
}
