import { Engine } from "./engine.js";
import { Environment } from "./environment.js";

export class AgentCore {
  constructor(config) {
    this.engine = new Engine(config.engine);
    this.environment = new Environment(config.agent);

    this.coderModel = null;
    this.imageModel = null;
  }

  async think(prompt, attachments = {}) {
    return this.engine.send(prompt, attachments);
  }

  async generateMusic(options = {}) {
    return this.engine.generateLocalAudio(options);
  }
}
