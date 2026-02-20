import { minimatch } from "minimatch";
import { normalizeRepoPath } from "./pathUtils";

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
  const normalizedPath = normalizeRepoPath(relativePath);
  return ignorePatterns.some((pattern) =>
    matchesIgnorePattern(normalizedPath, pattern)
  );
};

const readCurrentBranchName = async (git) => {
  const currentBranch = (
    await git.raw(["rev-parse", "--abbrev-ref", "HEAD"])
  ).trim();

  if (!currentBranch || currentBranch === "HEAD") {
    return null;
  }

  return currentBranch;
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

  const currentBranch = await readCurrentBranchName(git);
  if (!currentBranch) {
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

export {
  readCurrentBranchName,
  readDiffOutputs,
  resolveCompareTarget,
  resolveComparisonRefs,
  shouldIgnoreFile,
};
