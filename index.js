import { startServer } from "./server/api.js";
import { createRouter } from "./server/router.js";

async function main() {
  const router = createRouter();
  await startServer({ router });
}

main();