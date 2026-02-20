import { vi } from "vitest";

const analysisFixture = {
  resolvedRefs: {
    leftRef: "main",
    rightRef: "feature",
    compareSource: "working-tree",
  },
  summary: {
    linesAdded: 12,
    linesRemoved: 4,
    linesNet: 8,
    filesAdded: 1,
    filesRemoved: 0,
    filesChanged: 2,
    totalTouched: 3,
  },
  datasets: {
    fileStatusDonut: [
      { name: "added", value: 1 },
      { name: "removed", value: 0 },
      { name: "changed", value: 2 },
    ],
    lineImpactBars: [
      { name: "Added", value: 12, metric: "added" },
      { name: "Removed", value: 4, metric: "removed" },
      { name: "Net", value: 8, metric: "net" },
    ],
    statusNetDeltaBars: [
      { name: "Added", value: 4, metric: "added" },
      { name: "Removed", value: -2, metric: "removed" },
      { name: "Changed", value: 6, metric: "changed" },
    ],
    fileTouchSegments: [
      {
        path: "src/App.tsx",
        added: 12,
        removed: 4,
        churn: 16,
        status: "changed",
      },
    ],
    topFilesChurn: [{ path: "src/App.tsx", churn: 16 }],
    directoryTreemap: [{ name: "src", size: 16 }],
    extensionBreakdown: [{ name: "tsx", value: 16 }],
    churnHistogram: [{ bucket: "10-24", count: 1 }],
  },
  files: [
    {
      path: "src/App.tsx",
      status: "changed",
      added: 12,
      removed: 4,
      churn: 16,
      directory: "src",
      extension: "tsx",
    },
  ],
};

const defaultSettings = {
  ignorePatterns: ["node_modules/**"],
  mode: "merge-base",
  compareSource: "working-tree",
  baseBranch: "main",
  compareBranch: "feature",
  panelOrder: ["fileTouchSegments", "lineImpactBars"],
  canvasOrientation: "left-right",
};

const makeApi = (overrides = {}) => ({
  pickRepo: vi.fn().mockResolvedValue({ ok: true, data: null }),
  listBranches: vi
    .fn()
    .mockResolvedValue({ ok: true, data: ["main", "feature"] }),
  runAnalysis: vi.fn().mockResolvedValue({ ok: true, data: analysisFixture }),
  getAnalysisSignature: vi.fn().mockResolvedValue({ ok: true, data: "stable" }),
  exportJson: vi.fn().mockResolvedValue({ ok: true, data: "/tmp/export.json" }),
  loadSettingsForRepo: vi.fn().mockResolvedValue({
    ok: true,
    data: defaultSettings,
  }),
  saveSettingsForRepo: vi.fn().mockResolvedValue({
    ok: true,
    data: defaultSettings,
  }),
  ...overrides,
});

export { analysisFixture, defaultSettings, makeApi };
