import fs from "fs";
import path from "path";

function readConfig() {
  try {
    const raw = fs.readFileSync("./config.json", "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeAllowedPaths(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "string") return null;
      return path.resolve(entry);
    })
    .filter(Boolean);
}

export function getPermissionPolicy(overrides = {}) {
  const cfg = readConfig();
  const fromConfig = cfg?.files?.allowedPaths || [];
  const envPaths = process.env.ALLOWED_PATHS || process.env.CODE_SNAP_ALLOWED_PATHS || "";
  const allowedPaths = normalizeAllowedPaths(overrides.allowedPaths || (envPaths ? envPaths.split(",") : fromConfig));

  const defaultPaths = [process.cwd(), path.resolve(".")];
  const finalPaths = Array.from(new Set([...defaultPaths, ...allowedPaths]));

  return {
    allowedPaths: finalPaths,
    maxFileSize: overrides.maxFileSize || cfg?.files?.maxFileSize || 10 * 1024 * 1024,
    allowWrites: overrides.allowWrites ?? true
  };
}

export function isAllowedPath(filePath, overrides = {}) {
  const policy = getPermissionPolicy(overrides);
  const resolved = path.resolve(filePath);
  return policy.allowedPaths.some((allowed) => {
    const target = path.resolve(allowed);
    return resolved === target || resolved.startsWith(target + path.sep);
  });
}

export function canAccess(filePath, overrides = {}) {
  const absolute = path.resolve(filePath);
  if (!isAllowedPath(absolute, overrides)) {
    return { ok: false, reason: "PATH_NOT_ALLOWED" };
  }

  try {
    const stats = fs.statSync(absolute);
    const policy = getPermissionPolicy(overrides);
    if (stats.size > policy.maxFileSize) {
      return { ok: false, reason: "FILE_TOO_LARGE" };
    }
    return { ok: true, path: absolute };
  } catch (err) {
    return { ok: false, reason: "FILE_NOT_FOUND" };
  }
}
