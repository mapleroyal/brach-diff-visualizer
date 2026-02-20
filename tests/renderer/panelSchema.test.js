import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { PANEL_DEFINITIONS, PANEL_IDS, PANEL_MAP } from "@shared/panels";
import { ChartPanel } from "@renderer/components/dashboard/ChartPanel";
import { chartRenderers } from "@renderer/components/dashboard/chartRenderers";

const emptyAnalysis = {
  resolvedRefs: {
    leftRef: "main",
    rightRef: "feature",
    compareSource: "working-tree",
  },
  summary: {
    linesAdded: 0,
    linesRemoved: 0,
    linesNet: 0,
    filesAdded: 0,
    filesRemoved: 0,
    filesChanged: 0,
    totalTouched: 0,
  },
  datasets: {},
  files: [],
};

describe("panel schema", () => {
  it("resolves every panel id to a valid schema", () => {
    for (const panelId of PANEL_IDS) {
      const definition = PANEL_MAP[panelId];
      expect(definition).toBeDefined();
      expect(definition.id).toBe(panelId);
      expect(typeof definition.datasetKey).toBe("string");
      expect(definition.datasetKey.length).toBeGreaterThan(0);
      expect(typeof definition.emptyStateLabel).toBe("string");
      expect(definition.emptyStateLabel.length).toBeGreaterThan(0);
    }
  });

  it("maps every chart type to an implemented renderer", () => {
    for (const definition of PANEL_DEFINITIONS) {
      expect(typeof definition.chartType).toBe("string");
      expect(typeof chartRenderers[definition.chartType]).toBe("function");
    }
  });

  it("uses dataset keys and empty-state labels when data is missing", () => {
    for (const definition of PANEL_DEFINITIONS) {
      render(
        createElement(ChartPanel, {
          panelId: definition.id,
          analysis: emptyAnalysis,
        })
      );

      expect(
        screen.getByText(definition.emptyStateLabel, { exact: false })
      ).toBeInTheDocument();

      cleanup();
    }
  });

  it("resolves treemap tooltip header from payload data", () => {
    const chartElement = chartRenderers.treemap(
      [{ name: "src/renderer/src", size: 124 }],
      { valueKey: "size", valueLabel: "Churn" }
    );
    const treemapElement = chartElement.props.children;
    const tooltipElement = treemapElement.props.children;

    expect(typeof tooltipElement.props.content).toBe("function");

    const tooltipContent = tooltipElement.props.content({
      active: true,
      payload: [
        {
          value: 124,
          payload: {
            name: "src/renderer/src",
          },
        },
      ],
    });

    expect(tooltipContent.props.label).toBe("src/renderer/src");
    expect(tooltipContent.props.formatter(124)).toEqual(["124", "Churn"]);
  });
});
