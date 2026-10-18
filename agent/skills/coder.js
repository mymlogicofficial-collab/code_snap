import fs from "fs";
import path from "path";
import { logInfo, logError } from "../../utils/logger.js";
import { uploadFileToGitHub } from "../../utils/githubCommit.js";

export async function run(core, input) {
  const { filePath, content, commit = false, message = "Update from CodeSnap agent" } = input;

  if (!core.environment.allowChanges) {
    return { error: "ENVIRONMENT_CHANGES_DISABLED", details: "Environment changes are disabled in config" };
  }

  if (!filePath || !content) {
    return { error: "INVALID_INPUT", details: "filePath and content are required" };
  }

  // Prevent path escapes outside repo root
  const repoRoot = process.cwd();
  const targetPath = path.resolve(repoRoot, filePath);
  if (!targetPath.startsWith(repoRoot)) {
    return { error: "INVALID_PATH", details: "Path must be inside the repository" };
  }

  try {
    // Ensure directory exists
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Write file locally
    fs.writeFileSync(targetPath, content, "utf8");
    logInfo("CoderSkill", `Wrote file ${targetPath}`);

    // Optionally commit to GitHub
    if (commit) {
      // Read config for owner/repo if available
      let owner = process.env.GITHUB_OWNER || null;
      let repo = process.env.GITHUB_REPO || null;
      let token = process.env.GITHUB_TOKEN || null;
      try {
        const cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
        owner = owner || cfg.github?.owner || cfg.githubOwner || null;
        repo = repo || cfg.github?.repo || cfg.githubRepo || cfg.githubRepo || null;
        token = token || cfg.github?.token || cfg.githubToken || null;
      } catch (err) {
        // ignore
      }

      if (!token) return { error: "NO_GITHUB_TOKEN", details: "Set GITHUB_TOKEN env var or config.json github.token to enable commits" };
      if (!owner || !repo) return { error: "NO_REPO_CONFIG", details: "Set github.owner/github.repo in config.json or GITHUB_OWNER/GITHUB_REPO env vars" };

      const relPath = path.relative(repoRoot, targetPath).replace(/\\/g, "/");
      const contentBase64 = Buffer.from(content, "utf8").toString("base64");

      const res = await uploadFileToGitHub(owner, repo, relPath, contentBase64, message, token);
      if (!res.ok) {
        return { error: "GITHUB_COMMIT_FAILED", details: res.details };
      }

      logInfo("CoderSkill", `Committed ${relPath} to ${owner}/${repo}`);
      return { text: `File written and committed to ${owner}/${repo}:${relPath}`, url: res.url };
    }

    return { text: `File written to ${targetPath}` };
  } catch (err) {
    logError("CoderSkill", err?.message || String(err));
    return { error: "WRITE_FAILED", details: err?.message || String(err) };
  }
}
