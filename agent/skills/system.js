
export async function run(core, input) {
  if (input.action === "addSkill") {
    return core.environment.addSkill(input.name, input.code);
  }

  if (input.action === "modifySkill") {
    return core.environment.modifySkill(input.name, input.code);
  }

  return { error: "Unknown system action" };
}
