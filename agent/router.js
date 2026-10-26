import * as CodeSkill from "./skills/code.js";
import * as FileSkill from "./skills/files.js";
import * as ImageSkill from "./skills/images.js";
import * as VoiceSkill from "./skills/voice.js";
import * as SystemSkill from "./skills/system.js";
import * as AutoSkill from "./skills/autoskill.js";
import * as DiagnosticsSkill from "./skills/diagnostics.js";
import * as ExecuteSkill from "./skills/execute.js";
import * as MusicSkill from "./skills/music.js";
import * as VideoSkill from "./skills/video.js";

const CODER_MODEL = "qwen2.5-coder";
const IMAGE_MODEL = "llava-phi3:3.8b";

export class AgentRouter {
  constructor(core) {
    this.core = core;
    this.core.coderModel = CODER_MODEL;
    this.core.imageModel = IMAGE_MODEL;
  }

  async handle(input) {
    switch (input.type) {
      case "file":        return FileSkill.run(this.core, input);
      case "image":       return ImageSkill.run(this.core, input);
      case "voice":       return VoiceSkill.run(this.core, input);
      case "system":      return SystemSkill.run(this.core, input);
      case "code":        return CodeSkill.run(this.core, input);
      case "autoskill":   return AutoSkill.run(this.core, input);
      case "diagnostics": return DiagnosticsSkill.run(this.core, input);
      case "execute":     return ExecuteSkill.run(this.core, input);
      case "music":       return MusicSkill.run(this.core, input);
      case "video":       return VideoSkill.run(this.core, input);
      default:            return this.core.think(input.text);
    }
  }
}
