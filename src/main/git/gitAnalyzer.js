import simpleGit from "simple-git";
import { minimatch } from "minimatch";
import { z } from "zod";
import {
  ANALYSIS_MODES,
  COMPARE_SOURCES,
  DEFAULT_COMPARE_SOURCE,
} from "@shared/analysisOptions";
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
  mode: z.enum(ANALYSIS_MODES),
  compareSource: z.enum(COMPARE_SOURCES).default(DEFAULT_COMPARE_SOURCE),
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

const resolveCompareTarget = async (git, compareBranch, compareSource) => {
  if (compareSource === "branch-tip") {
    return {
      diffRightRef: compareBranch,
      displayRightRef: compareBranch,
    };
  }

  const currentBranch = (
    await git.raw(["rev-parse", "--abbrev-ref", "HEAD"])
  ).trim();

  if (!currentBranch || currentBranch === "HEAD") {
    throw new Error(
      "Working tree comparison requires an active branch checkout."
    );
  }

  if (currentBranch !== compareBranch) {
    throw new Error(
      `Working tree comparison requires "${compareBranch}" to be checked out. Current branch is "${currentBranch}". Switch to "${compareBranch}" or use Branch Tip source.`
    );
  }

  return {
    diffRightRef: null,
    displayRightRef: `${compareBranch} (working tree)`,
  };
};

const createDiffArgs = (formatFlag, leftRef, rightRef) => {
  const args = ["diff", formatFlag, "--find-renames", leftRef];

  if (rightRef) {
    args.push(rightRef);
  }

  args.push("--");
  return args;
};

const readDiffOutputs = async (git, leftRef, rightRef) => {
  const [numstatOutput, nameStatusOutput] = await Promise.all([
    git.raw(createDiffArgs("--numstat", leftRef, rightRef)),
    git.raw(createDiffArgs("--name-status", leftRef, rightRef)),
  ]);

  return {
    numstatOutput,
    nameStatusOutput,
  };
};

const resolveAnalysisContext = async (request) => {
  const git = simpleGit({ baseDir: request.repoPath, binary: "git" });
  const refs = await resolveComparisonRefs(
    git,
    request.baseBranch,
    request.compareBranch,
    request.mode
  );
  const compareTarget = await resolveCompareTarget(
    git,
    request.compareBranch,
    request.compareSource
  );
  const diffOutputs = await readDiffOutputs(
    git,
    refs.leftRef,
    compareTarget.diffRightRef
  );

  return {
    refs: {
      leftRef: refs.leftRef,
      rightRef: compareTarget.displayRightRef,
      mergeBase: refs.mergeBase,
      compareSource: request.compareSource,
    },
    diffOutputs,
  };
};

const getAnalysisSignature = async (requestInput) => {
  const request = analysisRequestSchema.parse(requestInput);
  const context = await resolveAnalysisContext(request);

  return [
    context.refs.leftRef,
    context.refs.rightRef,
    context.diffOutputs.numstatOutput,
    context.diffOutputs.nameStatusOutput,
  ].join("\n::\n");
};

const runAnalysis = async (requestInput) => {
  const request = analysisRequestSchema.parse(requestInput);
  const context = await resolveAnalysisContext(request);
  const { numstatOutput, nameStatusOutput } = context.diffOutputs;
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
    resolvedRefs: context.refs,
    summary,
    datasets,
    files,
  };
};
export { getAnalysisSignature, resolveComparisonRefs, runAnalysis, shouldIgnoreFile };
