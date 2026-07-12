
import { logInfo } from "../../utils/logger.js";

export async function run(core, input) {
  const report = {
    engineMode: core.engine.mode,
    localModel: core.engine.localModel,
    environmentChanges: core.environment.allowChanges,
    skillsPath: core.environment.skillsPath,
    timestamp: new Date().toISOString()
  };

  logInfo("Diagnostics", "Diagnostics run");

  return {
    text: "Diagnostics Report",
    report
  };
}
