import fs from "fs";
import path from "path";
import { logInfo, logError } from "../utils/logger.js";

const pluginsDir = path.join("plugins");

export function loadPlugins() {
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir);
    logInfo("Plugins", "Created plugins directory");
  }

  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
  const plugins = [];

  for (const file of files) {
    const fullPath = path.join(pluginsDir, file);
    try {
      const mod = require(fullPath);
      plugins.push({ name: file, module: mod });
      logInfo("Plugins", `Loaded plugin: ${file}`);
    } catch (err) {
      logError("Plugins", `Failed to load ${file}: ${err.message}`);
    }
  }

  return plugins;
}
