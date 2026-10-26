import fs from "fs";
import path from "path";

export class Environment {
  constructor(config) {
    this.allowChanges = config.allowEnvironmentChanges;
    this.skillsPath = config.skillsPath;
  }

  async addSkill(name, code, targetPath = null) {
    if (!this.allowChanges) {
      return { error: "Environment changes disabled" };
    }

    const filePath = targetPath
      ? path.resolve(process.cwd(), targetPath)
      : path.join(this.skillsPath, `${name}.js`);

    fs.writeFileSync(filePath, code ?? "", "utf8");

    return {
      success: true,
      filePath,
      exists: fs.existsSync(filePath),
      size: fs.statSync(filePath).size
    };
  }

  async modifySkill(name, code, targetPath = null) {
    if (!this.allowChanges) {
      return { error: "Environment changes disabled" };
    }

    const filePath = targetPath
      ? path.resolve(process.cwd(), targetPath)
      : path.join(this.skillsPath, `${name}.js`);

    fs.writeFileSync(filePath, code ?? "", "utf8");

