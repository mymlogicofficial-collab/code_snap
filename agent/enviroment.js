
import fs from "fs";
import path from "path";

export class Environment {
  constructor(config) {
    this.allowChanges = config.allowEnvironmentChanges;
    this.skillsPath = config.skillsPath;
  }

  async addSkill(name, code) {
    if (!this.allowChanges) {
      return { error: "Environment changes disabled" };
    }

    const filePath = path.join(this.skillsPath, `${name}.js`);
    fs.writeFileSync(filePath, code);
    return { success: true, filePath };
  }

  async modifySkill(name, code) {
    if (!this.allowChanges) {
      return { error: "Environment changes disabled" };
    }

    const filePath = path.join(this.skillsPath, `${name}.js`);
    fs.writeFileSync(filePath, code);
    return { success: true, filePath };
  }
}
