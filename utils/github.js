import axios from "axios";
import { logError } from "./logger.js";
import fs from "fs";

export async function checkGitHub() {
  // Prefer env var, fall back to config.json
  let token = process.env.GITHUB_TOKEN || null;
  let owner = process.env.GITHUB_OWNER || null;
  let repo = process.env.GITHUB_REPO || null;

  try {
    const cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    token = token || cfg?.github?.token || cfg?.githubToken || null;
    owner = owner || cfg?.github?.owner || cfg?.githubOwner || null;
    repo = repo || cfg?.github?.repo || cfg?.githubRepo || null;
  } catch (err) {
    // ignore
  }

  if (!token) return { ok: false, reason: "no_token" };
  if (!owner || !repo) return { ok: false, reason: "no_repo_config" };

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await axios.get(url, { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" }, timeout: 10000 });
    if (res.status === 200) return { ok: true, repo: res.data.full_name };
    return { ok: false, reason: `status_${res.status}` };
  } catch (err) {
    logError("GitHub", err?.message || String(err));
    return { ok: false, reason: err?.message || "unknown_error" };
  }
}
