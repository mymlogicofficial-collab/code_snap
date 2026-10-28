default: {
        // Fallback: prompt the model to think
        const rawOutput = await this.core.think(input.text || input);
        const textContent = typeof rawOutput === "string" ? rawOutput : rawOutput?.text || "";

        let filePath = null;
        let content = null;

        // 1. Scan anywhere in the text for inline prefixes like python:hello_world.py
        const inlineMatch = textContent.match(/(?:python|javascript|js):([a-zA-Z0-9_./-]+)\s*[\r\n]+([\s\S]*)/i);
        if (inlineMatch) {
          filePath = inlineMatch[1].trim();
          content = inlineMatch[2].replace(/```$|^```/g, "").replace(/^["']|["']$/g, "").trim();
        } else {
          // 2. Fallback check for markdown code blocks with filename comments
          const fileMatch = textContent.match(/```(?:javascript|js|json|html|css|python)?\s*\n(?:\/\/|#)\s*(?:filename:)?\s*([^\n]+)\n([\s\S]*?)```/i);
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
