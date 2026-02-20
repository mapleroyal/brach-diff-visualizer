import { describe, expect, it, vi } from "vitest";
import { AnalysisService } from "../../src/main/git/analysisService";

const buildRequest = (overrides = {}) => ({
  repoPath: "/tmp/repo",
  baseBranch: "main",
  compareBranch: "feature",
  mode: "merge-base",
  compareSource: "branch-tip",
  ignorePatterns: [],
  ...overrides,
});

const createGitMock = ({
  mergeBase = "abc123",
  numstatOutput = "10\t2\tsrc/app.js",
  nameStatusOutput = "M\tsrc/app.js",
  currentBranch = "feature",
} = {}) => {
  const raw = vi.fn(async (args) => {
    if (args[0] === "merge-base") {
      return `${mergeBase}\n`;
    }

    if (args[0] === "rev-parse") {
      return `${currentBranch}\n`;
    }

    if (args[0] === "diff" && args[1] === "--numstat") {
      return numstatOutput;
    }

    if (args[0] === "diff" && args[1] === "--name-status") {
      return nameStatusOutput;
    }

    throw new Error(`Unexpected git.raw invocation: ${args.join(" ")}`);
  });

  return { raw };
};

describe("AnalysisService", () => {
  it("returns changed + result on first poll", async () => {
    const git = createGitMock();
    const service = new AnalysisService({
      gitFactory: () => git,
    });

    const response = await service.poll(buildRequest(), null);

    expect(response.changed).toBe(true);
    expect(response.signature.length).toBeGreaterThan(0);
    expect(response.result.summary).toEqual({
      linesAdded: 10,
      linesRemoved: 2,
      linesNet: 8,
      filesAdded: 0,
      filesRemoved: 0,
      filesChanged: 1,
      totalTouched: 1,
    });
    expect(response.result.files).toEqual([
      {
        path: "src/app.js",
        status: "changed",
        added: 10,
        removed: 2,
        churn: 12,
        directory: "src",
        extension: "js",
        previousPath: undefined,
      },
    ]);
  });

  it("returns unchanged when the signature matches previous poll", async () => {
    const git = createGitMock();
    const service = new AnalysisService({
      gitFactory: () => git,
    });

    const first = await service.poll(buildRequest(), null);
    const second = await service.poll(buildRequest(), first.signature);

    expect(first.changed).toBe(true);
    expect(second).toEqual({
      signature: first.signature,
      changed: false,
    });
    expect(service.getSnapshotCacheSize()).toBe(1);
    expect(service.getResultCacheSize()).toBe(1);
  });

  it("reuses snapshots across ignore-pattern variants and builds filtered results", async () => {
    const git = createGitMock({
      numstatOutput: ["8\t3\tsrc/app.js", "5\t0\tdocs/guide.md"].join("\n"),
      nameStatusOutput: ["M\tsrc/app.js", "A\tdocs/guide.md"].join("\n"),
    });
    const service = new AnalysisService({
      gitFactory: () => git,
    });

    const baseRequest = buildRequest({ ignorePatterns: [] });
    const initial = await service.poll(baseRequest, null);
    const filtered = await service.poll(
      {
        ...baseRequest,
        ignorePatterns: ["docs/**"],
      },
      null
    );

    expect(initial.result.summary.totalTouched).toBe(2);
    expect(filtered.result.summary.totalTouched).toBe(1);
    expect(filtered.result.files.map((file) => file.path)).toEqual([
      "src/app.js",
    ]);
    expect(service.getSnapshotCacheSize()).toBe(1);
    expect(service.getResultCacheSize()).toBe(2);
  });

  it("evicts oldest snapshot and result entries when LRU limits are exceeded", async () => {
    const gitFactory = (repoPath) =>
      createGitMock({
        mergeBase: `merge-${repoPath}`,
        numstatOutput: `1\t0\t${repoPath.replace(/\//g, "-")}.js`,
        nameStatusOutput: `M\t${repoPath.replace(/\//g, "-")}.js`,
      });

    const service = new AnalysisService({
      snapshotCacheLimit: 2,
      resultCacheLimit: 2,
      gitFactory,
    });

    await service.poll(buildRequest({ repoPath: "/tmp/repo-1" }), null);
    await service.poll(buildRequest({ repoPath: "/tmp/repo-2" }), null);
    await service.poll(buildRequest({ repoPath: "/tmp/repo-3" }), null);

    expect(service.getSnapshotCacheSize()).toBe(2);

    const baseRequest = buildRequest({ repoPath: "/tmp/repo-result" });
    await service.poll({ ...baseRequest, ignorePatterns: ["a/**"] }, null);
    await service.poll({ ...baseRequest, ignorePatterns: ["b/**"] }, null);
    await service.poll({ ...baseRequest, ignorePatterns: ["c/**"] }, null);

    expect(service.getResultCacheSize()).toBe(2);
  });

  it("throws when working-tree comparison branch does not match checkout", async () => {
    const git = createGitMock({
      currentBranch: "main",
    });
    const service = new AnalysisService({
      gitFactory: () => git,
    });

    await expect(
      service.poll(
        buildRequest({
          mode: "tip-to-tip",
          compareSource: "working-tree",
          compareBranch: "feature",
        }),
        null
      )
    ).rejects.toThrow(
      'Working tree comparison requires "feature" to be checked out.'
    );
  });

  it("throws when working-tree comparison runs without active branch checkout", async () => {
    const git = createGitMock({
      currentBranch: "HEAD",
    });
    const service = new AnalysisService({
      gitFactory: () => git,
    });

    await expect(
      service.poll(
        buildRequest({
          mode: "tip-to-tip",
          compareSource: "working-tree",
        }),
        null
      )
    ).rejects.toThrow(
      "Working tree comparison requires an active branch checkout."
    );
  });
});
