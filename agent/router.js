
import * as CodeSkill from "./skills/code.js";
import * as FileSkill from "./skills/files.js";
import * as ImageSkill from "./skills/images.js";
import * as VoiceSkill from "./skills/voice.js";
import * as SystemSkill from "./skills/system.js";

export class AgentRouter {
  constructor(core) {
    this.core = core;
  }

  async handle(input) {
    switch (input.type) {
      case "file": return FileSkill.run(this.core, input);
      case "image": return ImageSkill.run(this.core, input);
      case "voice": return VoiceSkill.run(this.core, input);
      case "system": return SystemSkill.run(this.core, input);
      case "code": return CodeSkill.run(this.core, input);
      default: return this.core.think(input.text);
    }
  }
}
