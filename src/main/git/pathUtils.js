import { posix } from "node:path";

const normalizeRepoPath = (value) => {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  return normalized ? posix.normalize(normalized) : normalized;
};

export { normalizeRepoPath };
