
```js
import { logInfo } from "../utils/logger.js";

export const plugin = {
  name: "samplePlugin",
  description: "Demonstrates plugin structure and logging.",
  version: "1.0.0",
  author: "Renard",
  run: async (core, input) => {
    const text = input.text || "No input provided.";
    logInfo("samplePlugin", `Received input: ${text}`);

    const response = await core.think(`Respond to: ${text}`);
    return {
      text: `Plugin executed successfully.`,
      data: response.text
    };
  }
};
