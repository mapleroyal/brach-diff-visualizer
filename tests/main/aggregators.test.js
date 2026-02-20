import { describe, expect, it } from "vitest";
import { buildDatasets, buildSummary } from "../../src/main/git/aggregators";
const files = [
  {
    path: "src/main.ts",
    status: "changed",
    added: 30,
    removed: 10,
    churn: 40,
    directory: "src",
    extension: "ts",
  },
  {
    path: "src/App.tsx",
    status: "added",
    added: 80,
    removed: 0,
    churn: 80,
    directory: "src",
    extension: "tsx",
  },
  {
    path: "docs/guide.md",
    status: "removed",
    added: 0,
    removed: 20,
    churn: 20,
    directory: "docs",
    extension: "md",
  },
];
describe("aggregators", () => {
  it("computes summary counts correctly", () => {
    const summary = buildSummary(files);
    expect(summary).toEqual({
      linesAdded: 110,
      linesRemoved: 30,
      linesNet: 80,
      filesAdded: 1,
      filesRemoved: 1,
      filesChanged: 1,
      totalTouched: 3,
    });
  });
  it("builds top files, extension and histogram datasets", () => {
    const summary = buildSummary(files);
    const datasets = buildDatasets(files, summary);
    expect(datasets.topFilesChurn.map((row) => row.path)).toEqual([
      "src/App.tsx",
      "src/main.ts",
      "docs/guide.md",
    ]);
    const extensionTotals = Object.fromEntries(
      datasets.extensionBreakdown.map((row) => [row.name, row.value])
    );
    expect(extensionTotals).toEqual({ tsx: 80, ts: 40, md: 20 });
    const histogram = Object.fromEntries(
      datasets.churnHistogram.map((row) => [row.bucket, row.count])
    );
    expect(histogram["10-24"]).toBe(1);
    expect(histogram["25-49"]).toBe(1);
    expect(histogram["50-99"]).toBe(1);
    expect(datasets.lineImpactBars).toEqual([
      { name: "Added", value: 110, metric: "added" },
      { name: "Removed", value: 30, metric: "removed" },
      { name: "Net", value: 80, metric: "net" },
    ]);
    expect(datasets.fileTouchSegments).toEqual([
      {
        path: "src/App.tsx",
        added: 80,
        removed: 0,
        churn: 80,
        status: "added",
      },
      {
        path: "src/main.ts",
        added: 30,
        removed: 10,
        churn: 40,
        status: "changed",
      },
      {
        path: "docs/guide.md",
        added: 0,
        removed: 20,
        churn: 20,
        status: "removed",
      },
    ]);
  });
});
