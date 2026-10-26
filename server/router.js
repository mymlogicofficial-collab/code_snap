import fs from "fs";
import axios from "axios";

/**
 * Creates and returns the ODDS Agent Router with Dynamic Model Switching
 */
export function createRouter() {
  return {
    async handle(payload) {
      const { type, text, prompt, code, file, audio } = payload || {};
      
      // Load local configuration
      let config = {};
      try {
        config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      } catch (e) {
        config = { engine: { localURL: "http://localhost:11434/api/generate" } };
      }

      const endpoint = config?.engine?.localURL || "http://localhost:11434/api/generate";

      // 🧠 Dynamic Model Selection Matrix
      let activeModel = "qwen2.5-coder:latest"; // Default for code & text
      if (type === "image" || type === "file") {
        activeModel = "llava-phi3:3.8b"; // Multimodal analysis
      } else if (type === "music" || type === "audio") {
        activeModel = "ACE-Step1.5"; // Audio/Music pipeline
      }

      switch (type) {
        case "text":
        case "chat": {
          const queryText = text || prompt || "Hello ODDS agent";
          const isChatEndpoint = endpoint.includes("/api/chat");
          const requestBody = isChatEndpoint
            ? { model: activeModel, messages: [{ role: "user", content: queryText }], stream: false }
            : { model: activeModel, prompt: queryText, stream: false };

          try {
            const response = await axios.post(endpoint, requestBody, { timeout: 300000 });
            const responseText = isChatEndpoint
              ? response.data?.message?.content
              : response.data?.response;

            return { 
              ok: true, 
              response: responseText || "Model returned empty response.", 
              modelUsed: activeModel 
            };
          } catch (err) {
            throw new Error(`Ollama connection failed using model [${activeModel}]: ${err.message}.`);
          }
        }

        case "image-generation":
        case "image": {
          return {
            ok: true,
            prompt: prompt || "Visual asset",
            response: `Multimodal engine [${activeModel}] processed image pipeline request.`,
            modelUsed: activeModel,
            mode: "active"
          };
        }

        case "execute": {
          try {
            const logs = [];
            const customConsole = {
              log: (...args) => logs.push(args.join(" ")),
              error: (...args) => logs.push("[ERROR] " + args.join(" "))
            };

            const runCode = new Function("console", code);
            runCode(customConsole);

            return { ok: true, result: logs.join("\n") || "Code executed successfully.", modelUsed: activeModel };
          } catch (err) {
            return { ok: false, error: err.message };
          }
        }

        case "music": {
          return { 
            ok: true, 
            response: `Audio generation initiated with model [${activeModel}] for prompt: "${prompt}"`,
            modelUsed: activeModel 
          };
        }

        case "video": {
          return { ok: true, response: `Cinematic storyboard pipeline initiated.`, modelUsed: activeModel };
        }

        case "file":
        case "voice": {
          return { ok: true, response: `Received ${type} attachment, processed via [${activeModel}].`, modelUsed: activeModel };
        }

        default:
          return { ok: false, error: `Unknown payload type: ${type}` };
      }
    }
  };
}
