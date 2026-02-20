import { posix } from "node:path";
const normalizePath = (value) => {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  return posix.normalize(normalized);
};
const parseNumstat = (output) => {
  const rows = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const parts = line.split("	");
    if (parts.length < 3) {
      continue;
    }
    const [addedRaw, removedRaw, ...pathParts] = parts;
    const path = pathParts[pathParts.length - 1];
    if (!path) {
      continue;
    }
    const binary = addedRaw === "-" || removedRaw === "-";
    const previousPath = pathParts.length > 1 ? pathParts[0] : void 0;
    rows.push({
      path: normalizePath(path),
      previousPath: previousPath ? normalizePath(previousPath) : void 0,
      added: binary ? 0 : Number.parseInt(addedRaw, 10) || 0,
      removed: binary ? 0 : Number.parseInt(removedRaw, 10) || 0,
      binary,
    });
  }
  return rows;
};
const parseNameStatus = (output) => {
  const rows = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const parts = line.split("	");
    if (parts.length < 2) {
      continue;
    }
    const statusToken = parts[0].trim();
    const statusCode = statusToken.charAt(0).toUpperCase();
    const previousPath = parts.length > 2 ? parts[1] : void 0;
    const path = parts.length > 2 ? parts[2] : parts[1];
    if (!path) {
      continue;
    }
    rows.push({
      path: normalizePath(path),
      previousPath: previousPath ? normalizePath(previousPath) : void 0,
      statusCode,
    });
  }
  return rows;
};
export { parseNameStatus, parseNumstat };
