import { describe, expect, it } from "vitest";
import { repoSettingsSchema } from "../../src/shared/ipcContracts";

const baseSettings = {
  ignorePatterns: ["node_modules/**"],
  mode: "merge-base",
  compareSource: "working-tree",
  baseBranch: "main",
  compareBranch: "feature",
  canvasOrientation: "left-right",
};

describe("repoSettingsSchema", () => {
  it("accepts unique panel orders with 0-2 entries", () => {
    const validPanelOrders = [
      [],
      ["fileTouchSegments"],
      ["fileTouchSegments", "lineImpactBars"],
    ];

    for (const panelOrder of validPanelOrders) {
      const parsed = repoSettingsSchema.parse({
        ...baseSettings,
        panelOrder,
      });

      expect(parsed.panelOrder).toEqual(panelOrder);
    }
  });

  it("rejects duplicate panel ids", () => {
    expect(() =>
      repoSettingsSchema.parse({
        ...baseSettings,
        panelOrder: ["fileTouchSegments", "fileTouchSegments"],
      })
    ).toThrow();
  });

  it("rejects panel orders that exceed the max active count", () => {
    expect(() =>
      repoSettingsSchema.parse({
        ...baseSettings,
        panelOrder: ["fileTouchSegments", "lineImpactBars", "topFilesChurn"],
      })
    ).toThrow();
  });

  it("rejects invalid canvas orientation", () => {
    expect(() =>
      repoSettingsSchema.parse({
        ...baseSettings,
        panelOrder: ["fileTouchSegments"],
        canvasOrientation: "diagonal",
      })
    ).toThrow();
  });
});
