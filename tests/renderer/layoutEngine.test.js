import { describe, expect, it } from "vitest";
import { computeCanvasLayout } from "@renderer/components/canvas/layoutEngine";

describe("layout engine", () => {
  it("uses full canvas for a single panel", () => {
    const layout = computeCanvasLayout(["alpha"], "left-right");

    expect(layout).toEqual([
      {
        id: "alpha",
        row: 0,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
    ]);
  });

  it("defaults two panels to a left-right split", () => {
    const layout = computeCanvasLayout(["alpha", "beta"], "left-right");

    expect(layout).toEqual([
      {
        id: "alpha",
        row: 0,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        id: "beta",
        row: 0,
        col: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ]);
  });

  it("supports top-bottom split for two panels", () => {
    const layout = computeCanvasLayout(["alpha", "beta"], "top-bottom");

    expect(layout).toEqual([
      {
        id: "alpha",
        row: 0,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        id: "beta",
        row: 1,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
      },
    ]);
  });

  it("throws when more than two panels are provided", () => {
    expect(() =>
      computeCanvasLayout(["one", "two", "three"], "left-right")
    ).toThrow("Canvas supports at most 2 panels");
  });
});
