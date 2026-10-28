import { Engine } from "./engine.js";
import { Environment } from "./environment.js";
import { run as runCoderSkill } from "./skills/coder.js";
import { run as runCodeSkill } from "./skills/code.js";

export class AgentCore {
  constructor(config) {
    this.engine = new Engine(config.engine);
    this.environment = new Environment(config.agent);

    this.coderModel = null;
    this.imageModel = null;
  }

  async think(prompt, attachments = {}) {
    // 1. Get raw text/generation response from the engine
    const rawOutput = await this.engine.send(prompt, attachments);
    const textContent = typeof rawOutput === "string" ? rawOutput : rawOutput?.text || JSON.stringify(rawOutput);

    // 2. Parse out markdown code blocks with target filenames
    // Example format: ```js\n// filename: relative/path/to/file.js\n...code...\n```
    const fileMatch = textContent.match(/```(?:javascript|js|json|html|css)?\s*\n\/\/\s*filename:\s*([^\n]+)\n([\s\S]*?)```/i)
                   || textContent.match(/javascript:([a-zA-Z0-9_./-]+)\n([\s\S]*?)```/i);

    if (fileMatch) {
      const filePath = fileMatch[1].trim();
      const content = fileMatch[2];

      console.log(`[AgentCore Execution] Extracted file write payload for ${filePath}`);

      // 3. Dispatch directly to the coder skill to write disk changes
      const executionResult = await runCoderSkill(this, {
        filePath,
        content,
        commit: false
      });

      return {
        text: textContent,
        execution: executionResult
      };
    }

    return textContent;
  }

  async generateMusic(options = {}) {
    return this.engine.generateLocalAudio(options);
  }
}
