
import fs from "fs";
import { AgentCore } from "./agent/core.js";
import { AgentRouter } from "./agent/router.js";
import { startServer } from "./server/api.js";

async function bootstrap() {
  console.log("🚀 Booting CodeSnap Agent...");

  const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

  const core = new AgentCore(config);
  const router = new AgentRouter(core);

  await startServer({ router });

  console.log("🟢 Agent running at http://localhost:3000");
}

bootstrap();
