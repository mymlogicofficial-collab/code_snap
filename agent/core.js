import { Engine } from "./engine.js";
import { Environment } from "./environment.js";

export class AgentCore {
  constructor(config) {
    this.engine = new Engine(config.engine);
    this.environment = new Environment(config.agent);
  }

async think(prompt, attachments = {}) {
  const model = attachments.image
    ? this.imageModel      // llava-phi3:3.8b
    : this.coderModel;     // qwen2.5-coder

  return this.engine.send(prompt, { ...attachments, model });
}
