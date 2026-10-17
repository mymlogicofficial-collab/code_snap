import fs from "fs";
import { AgentCore } from "agent/core.js";
import { AgentRouter } from "agent/router.js";
import { startServer } from "server/api.js";
import "./server/proxy.js";

async function bootstrap() {
  console.log("🚀 Booting CodeSnap Agent...");

  const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));

  const core = new AgentCore(config);
  const router = new AgentRouter(core);

  const apiPort = process.env.API_PORT ? Number(process.env.API_PORT) : undefined;
  await startServer({ router, port: apiPort });

  console.log(`🟢 Agent running at http://localhost:${apiPort || 3000}`);
}

bootstrap();
