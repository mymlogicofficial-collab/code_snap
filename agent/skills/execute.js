import vm from "vm";
import { logError, logInfo } from "../../utils/logger.js";

export async function run(core, input) {
  const { code } = input;

  const sandbox = {
    console: {
      log: (...args) => logInfo("Sandbox", args.join(" "))
    },
    result: null
  };

  const context = vm.createContext(sandbox);

  try {
    vm.runInContext(code, context, { timeout: 1000 });
    return {
      text: "Sandbox execution complete.",
      result: sandbox.result
    };
  } catch (err) {
    logError("Sandbox", err.message);
    return {
      error: "SANDBOX_ERROR",
      details: err.message
    };
  }
}
