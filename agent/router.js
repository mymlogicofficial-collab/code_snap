import * as CodeSkill from "./skills/code.js";
import * as CoderSkill from "./skills/coder.js";
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
      case "coder":       return CoderSkill.run(this.core, input);
      case "autoskill":   return AutoSkill.run(this.core, input);
      case "diagnostics": return DiagnosticsSkill.run(this.core, input);
      case "execute":     return ExecuteSkill.run(this.core, input);
      case "music":       return MusicSkill.run(this.core, input);
      case "video":       return VideoSkill.run(this.core, input);
      default: {
        // Fallback: prompt the model to think
        const rawOutput = await this.core.think(input.text || input);
        const textContent = typeof rawOutput === "string" ? rawOutput : rawOutput?.text || "";

        let filePath = null;
        let content = null;

        // 1. Check for inline prefixes like python:hello_world.py
        const inlineMatch = textContent.match(/^(?:python|javascript|js):([a-zA-Z0-9_./-]+)\s*[\r\n]+([\s\S]*)$/i);
        if (inlineMatch) {
          filePath = inlineMatch[1].trim();
          content = inlineMatch[2].replace(/^["']|["']$/g, "").trim();
        } else {
          // 2. Fallback check for markdown code blocks with filename comments
          const fileMatch = textContent.match(/```(?:javascript|js|json|html|css|python)?\s*\n(?:\/\/|#)\s*(?:filename:)?\s*([^\n]+)\n([\s\S]*?)```/i) 
                         || textContent.match(/(?:javascript|python):([a-zA-Z0-9_./-]+)\n([\s\S]*?)```/i);
          if (fileMatch) {
            filePath = fileMatch[1].trim();
            content = fileMatch[2];
          }
        }

        if (filePath && content) {
          console.log(`[AgentRouter] Intercepted file block for ${filePath}. Triggering CoderSkill...`);
          const result = await CoderSkill.run(this.core, { filePath, content });
          return { text: textContent, execution: result };
        }

        return rawOutput;
      }
    }
  }
}
