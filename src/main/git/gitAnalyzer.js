import simpleGit from "simple-git";
import { minimatch } from "minimatch";
import { z } from "zod";
import {
  buildDatasets,
  buildSummary,
  getDirectory,
  getExtension,
  statusCodeToFileStatus,
} from "./aggregators";
import { parseNameStatus, parseNumstat } from "./parsers";
const analysisRequestSchema = z.object({
  repoPath: z.string().min(1),
  baseBranch: z.string().min(1),
  compareBranch: z.string().min(1),
  mode: z.enum(["merge-base", "tip-to-tip"]),
  ignorePatterns: z.array(z.string().min(1)),
});
const normalizePath = (value) => value.replace(/\\/g, "/").replace(/^\.\//, "");
const matchesIgnorePattern = (normalizedPath, pattern) => {
  const options = {
    dot: true,
    matchBase: true,
    nocase: false,
    windowsPathsNoEscape: true,
  };
  if (pattern === "**/.*") {
    return normalizedPath.split("/").some((segment) => segment.startsWith("."));
  }
  if (
    minimatch(normalizedPath, pattern, options) ||
    minimatch(normalizedPath, `**/${pattern}`, options)
  ) {
    return true;
  }
  if (pattern.endsWith("/**")) {
    const scope = pattern.slice(0, -3).replace(/^\.?\//, "");
    return (
      normalizedPath === scope ||
      normalizedPath.startsWith(`${scope}/`) ||
      normalizedPath.includes(`/${scope}/`)
    );
  }
  return false;
};
const shouldIgnoreFile = (relativePath, ignorePatterns) => {
  const normalizedPath = normalizePath(relativePath);
  return ignorePatterns.some((pattern) =>
    matchesIgnorePattern(normalizedPath, pattern)
  );
};
const resolveComparisonRefs = async (git, baseBranch, compareBranch, mode) => {
  if (mode === "tip-to-tip") {
    return {
      leftRef: baseBranch,
      rightRef: compareBranch,
    };
  }
  const mergeBase = (
    await git.raw(["merge-base", baseBranch, compareBranch])
  ).trim();
  if (!mergeBase) {
    throw new Error("Unable to resolve merge base for the selected branches.");
  }
  return {
    leftRef: mergeBase,
    rightRef: compareBranch,
    mergeBase,
  };
};
const runAnalysis = async (requestInput) => {
  const request = analysisRequestSchema.parse(requestInput);
  const git = simpleGit({ baseDir: request.repoPath, binary: "git" });
  const refs = await resolveComparisonRefs(
    git,
    request.baseBranch,
    request.compareBranch,
    request.mode
  );
  const [numstatOutput, nameStatusOutput] = await Promise.all([
    git.raw([
      "diff",
      "--numstat",
      "--find-renames",
      refs.leftRef,
      refs.rightRef,
      "--",
    ]),
    git.raw([
      "diff",
      "--name-status",
      "--find-renames",
      refs.leftRef,
      refs.rightRef,
      "--",
    ]),
  ]);
  const numstatRows = parseNumstat(numstatOutput);
  const nameStatusRows = parseNameStatus(nameStatusOutput);
  const numstatByPath = new Map(numstatRows.map((row) => [row.path, row]));
  const statusByPath = new Map(nameStatusRows.map((row) => [row.path, row]));
  const allPaths = /* @__PURE__ */ new Set([
    ...numstatByPath.keys(),
    ...statusByPath.keys(),
  ]);
  const files = [];
  for (const filePath of allPaths) {
    const statusRow = statusByPath.get(filePath);
    const numstatRow =
      numstatByPath.get(filePath) ||
      (statusRow?.previousPath
        ? numstatByPath.get(statusRow.previousPath)
        : void 0);
    const statusCode = statusRow?.statusCode || "M";
    const status = statusCodeToFileStatus(statusCode);
    const added = numstatRow?.added || 0;
    const removed = numstatRow?.removed || 0;
    if (shouldIgnoreFile(filePath, request.ignorePatterns)) {
      continue;
    }
    files.push({
      path: filePath,
      status,
      added,
      removed,
      churn: added + removed,
      directory: getDirectory(filePath),
      extension: getExtension(filePath),
      previousPath: statusRow?.previousPath || numstatRow?.previousPath,
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const summary = buildSummary(files);
  const datasets = buildDatasets(files, summary);
  return {
    resolvedRefs: refs,
    summary,
    datasets,
    files,
  };
};
export { resolveComparisonRefs, runAnalysis, shouldIgnoreFile };
