// Auto-skill-generation agent: writes new skills into agent/skills via Environment

export async function run(core, input) {
  const { skillName, description } = input;

  const prompt = `
You are a coding agent that writes JavaScript "skills" for an agent.
Create a new skill file that exports:

export async function run(core, input) { ... }

Skill name: ${skillName}
Description: ${description}
Return ONLY valid JavaScript code.
`;

  const result = await core.think(prompt);
  const code = result.text || "";

  return core.environment.addSkill(skillName, code);
}
