import fs from "fs";
import { logInfo } from "../../utils/logger.js";
import { Memory } from "../memory.js";
import { checkGitHub } from "../../utils/github.js";

export async function run(core, input) {
  const memory = new Memory();
  const memList = memory.list();

  const github = await checkGitHub();

  const report = {
    engineMode: core.engine.mode,
    localModel: core.engine.localModel,
    environmentChanges: core.environment.allowChanges,
    skillsPath: core.environment.skillsPath,
    pluginCount: (await core.loadPlugins?.())?.length || 0,
    memoryCount: memList.length,
    github
  };

  logInfo("Diagnostics", "Diagnostics run");

  return {
    text: "Diagnostics Report",
    report
  };
}
