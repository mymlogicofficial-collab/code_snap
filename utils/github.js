import axios from "axios";
import { logError } from "./logger.js";
import fs from "fs";

export async function checkGitHub() {
  const token = process.env.GITHUB_TOKEN || null;
  // prefer config.json owner/repo if present
  let owner = null;
  let repo = null;

  try {
    const cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    owner = cfg.githubOwner || owner;
    repo = cfg.githubRepo || repo;
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
