
import fs from "fs";
import path from "path";

const logPath = path.join("logs", "error.log");

// Ensure logs directory exists
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

export function logError(source, error) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${source}] ${error}\n`;

  fs.appendFileSync(logPath, entry);
  console.error(entry);
}

export function logInfo(source, message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${source}] ${message}\n`;

  fs.appendFileSync(logPath, entry);
  console.log(entry);
}
