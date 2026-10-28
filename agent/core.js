import { Engine } from "./engine.js";
import { Environment } from "./environment.js";
import { run as runCoderSkill } from "./skills/coder.js";

export class AgentCore {
  constructor(config) {
    this.engine = new Engine(config.engine);
    this.environment = new Environment(config.agent);

    this.coderModel = null;
    this.imageModel = null;
  }

  async think(prompt, attachments = {}) {
    // 1. Get generation response from local model engine
    const rawOutput = await this.engine.send(prompt, attachments);
    const textContent = typeof rawOutput === "string" ? rawOutput : rawOutput?.text || JSON.stringify(rawOutput);

    // 2. Extract code block and target filename header
    // Looks for standard markdown: ```js\n// filename: relative/path/to/file.js\n...code...\n```
    const fileMatch = textContent.match(/```(?:javascript|js|json|html|css)?\s*\n\/\/\s*filename:\s*([^\n]+)\n([\s\S]*?)```/i)
                   || textContent.match(/javascript:([a-zA-Z0-9_./-]+)\n([\s\S]*?)```/i);

    if (fileMatch) {
      const filePath = fileMatch[1].trim();
      const content = fileMatch[2];

      console.log(`[AgentCore] Extracted file payload for ${filePath}. Triggering coder.js...`);

      // 3. Directly call coder.js to perform local disk I/O
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
