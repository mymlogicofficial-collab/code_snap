import axios from "axios";
import fs from "fs";

export async function uploadFileToGitHub(owner, repo, pathInRepo, contentBase64, message, token) {
  // token param optional: fall back to config.json
  let authToken = token;
  if (!authToken) {
    try {
      const cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      authToken = cfg?.github?.token || cfg?.githubToken || null;
    } catch (err) {
      authToken = null;
    }
  }

  if (!authToken) return { ok: false, details: "no_github_token" };

  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(pathInRepo)}`;

  try {
    // Check if file exists to get sha
    let sha = null;
    try {
      const getRes = await axios.get(base, { headers: { Authorization: `token ${authToken}`, Accept: "application/vnd.github.v3+json" }, timeout: 10000 });
      if (getRes.status === 200 && getRes.data && getRes.data.sha) sha = getRes.data.sha;
    } catch (err) {
      // 404 means file doesn't exist which is okay
      if (!err.response || err.response.status !== 404) {
        return { ok: false, details: err.message || String(err) };
      }
    }

    const payload = {
      message: message || `Update ${pathInRepo}`,
      content: contentBase64
    };
    if (sha) payload.sha = sha;

    const putRes = await axios.put(base, payload, { headers: { Authorization: `token ${authToken}`, Accept: "application/vnd.github.v3+json" }, timeout: 10000 });

    if (putRes.status === 201 || putRes.status === 200) {
      return { ok: true, url: putRes.data.content.html_url };
    }

    return { ok: false, details: `unexpected_status_${putRes.status}` };
  } catch (err) {
    return { ok: false, details: err.message || String(err) };
  }
}
