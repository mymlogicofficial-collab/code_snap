# 🧠 CodeSnap Agent Plugins

Plugins extend the agent’s capabilities without modifying core code.  
Each plugin is a standalone `.js` file placed in this folder.

---

## 📦 Plugin Structure

Every plugin must export an object with these fields:

```js
export const plugin = {
  name: "plugin-name",
  description: "Short summary of what this plugin does.",
  version: "1.0.0",
  author: "Your Name or Org",
  run: async (core, input) => {
    // Your plugin logic here
    // Return { text: "...", data: ... }
  }
};
