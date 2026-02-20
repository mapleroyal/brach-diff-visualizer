import simpleGit from "simple-git";
import {
  analysisPollResponseSchema,
  analysisRequestSchema,
} from "@shared/ipcContracts";
import {
  buildDatasets,
  buildSummary,
  getDirectory,
  getExtension,
  statusCodeToFileStatus,
} from "./aggregators";
import {
  readDiffOutputs,
  resolveCompareTarget,
  resolveComparisonRefs,
  shouldIgnoreFile,
} from "./gitAnalyzer";
import { parseNameStatus, parseNumstat } from "./parsers";

const DEFAULT_SNAPSHOT_CACHE_LIMIT = 24;
const DEFAULT_RESULT_CACHE_LIMIT = 48;

class LruCache {
  #maxEntries;
  #entries;

  constructor(maxEntries) {
    this.#maxEntries = maxEntries;
    this.#entries = new Map();
  }

  get size() {
    return this.#entries.size;
  }

  get(key) {
    if (!this.#entries.has(key)) {
      return undefined;
    }

    const value = this.#entries.get(key);
    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#entries.has(key)) {
      this.#entries.delete(key);
    }

    this.#entries.set(key, value);

    if (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.#entries.delete(oldestKey);
      }
    }

    return value;
  }
}

const createGitClient = (repoPath) =>
  simpleGit({ baseDir: repoPath, binary: "git" });

const buildRequestCoreKey = (request) =>
  [
    request.repoPath,
    request.baseBranch,
    request.compareBranch,
    request.mode,
    request.compareSource,
  ].join("\n::\n");

const buildSnapshotSignature = (refs, diffOutputs) =>
  [
    refs.leftRef,
    refs.rightRef,
    diffOutputs.numstatOutput,
    diffOutputs.nameStatusOutput,
  ].join("\n::\n");

const buildIgnoreSignature = (ignorePatterns) => ignorePatterns.join("\n::\n");

const normalizePreviousSignature = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

class AnalysisService {
  #snapshotCache;
  #resultCache;
  #gitFactory;

  constructor({
    snapshotCacheLimit = DEFAULT_SNAPSHOT_CACHE_LIMIT,
    resultCacheLimit = DEFAULT_RESULT_CACHE_LIMIT,
    gitFactory = createGitClient,
  } = {}) {
    this.#snapshotCache = new LruCache(snapshotCacheLimit);
    this.#resultCache = new LruCache(resultCacheLimit);
    this.#gitFactory = gitFactory;
  }

  async poll(requestInput, previousSignatureInput) {
    const request = analysisRequestSchema.parse(requestInput);
    const previousSignature = normalizePreviousSignature(
      previousSignatureInput
    );
    const snapshot = await this.#resolveSnapshot(request);

    if (previousSignature && previousSignature === snapshot.signature) {
      return analysisPollResponseSchema.parse({
        signature: snapshot.signature,
        changed: false,
      });
    }

    const result = this.#resolveResult(snapshot, request.ignorePatterns);

    return analysisPollResponseSchema.parse({
      signature: snapshot.signature,
      changed: true,
      result,
    });
  }

  getSnapshotCacheSize() {
    return this.#snapshotCache.size;
  }

  getResultCacheSize() {
    return this.#resultCache.size;
  }

  async #resolveSnapshot(request) {
    const git = this.#gitFactory(request.repoPath);
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

    const resolvedRefs = {
      leftRef: refs.leftRef,
      rightRef: compareTarget.displayRightRef,
      mergeBase: refs.mergeBase,
      compareSource: request.compareSource,
    };
    const signature = buildSnapshotSignature(resolvedRefs, diffOutputs);
    const snapshotKey = `${buildRequestCoreKey(request)}\n::\n${signature}`;

    const cachedSnapshot = this.#snapshotCache.get(snapshotKey);
    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const numstatRows = parseNumstat(diffOutputs.numstatOutput);
    const nameStatusRows = parseNameStatus(diffOutputs.nameStatusOutput);
    const numstatByPath = new Map(numstatRows.map((row) => [row.path, row]));
    const statusByPath = new Map(nameStatusRows.map((row) => [row.path, row]));
    const allPaths = [
      ...new Set([...numstatByPath.keys(), ...statusByPath.keys()]),
    ];

    return this.#snapshotCache.set(snapshotKey, {
      key: snapshotKey,
      signature,
      resolvedRefs,
      numstatByPath,
      statusByPath,
      allPaths,
    });
  }

  #resolveResult(snapshot, ignorePatterns) {
    const ignoreSignature = buildIgnoreSignature(ignorePatterns);
    const resultKey = `${snapshot.key}\n::\n${ignoreSignature}`;
    const cachedResult = this.#resultCache.get(resultKey);
    if (cachedResult) {
      return cachedResult;
    }

    const files = [];

    for (const filePath of snapshot.allPaths) {
      const statusRow = snapshot.statusByPath.get(filePath);
      const numstatRow =
        snapshot.numstatByPath.get(filePath) ||
        (statusRow?.previousPath
          ? snapshot.numstatByPath.get(statusRow.previousPath)
          : undefined);
      const statusCode = statusRow?.statusCode || "M";
      const status = statusCodeToFileStatus(statusCode);
      const added = numstatRow?.added || 0;
      const removed = numstatRow?.removed || 0;

      if (shouldIgnoreFile(filePath, ignorePatterns)) {
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

    return this.#resultCache.set(resultKey, {
      resolvedRefs: snapshot.resolvedRefs,
      summary,
      datasets,
      files,
    });
  }
}

export { AnalysisService };
