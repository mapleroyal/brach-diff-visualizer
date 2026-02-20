import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@renderer/App";

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

const selectOption = async (label, option) => {
  const trigger = screen.getByRole("combobox", { name: label });
  await act(async () => {
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
  });
  const optionNode = await screen.findByRole("option", { name: option });
  await act(async () => {
    fireEvent.click(optionNode);
  });
};

describe("App interactions", () => {
  beforeEach(() => {
    Object.defineProperty(window, "api", {
      writable: true,
      value: makeApi(),
    });
  });

  it("deactivates and reactivates visualization toggles", async () => {
    render(<App />);

    expect(screen.queryAllByText("Line Impact Bars").length).toBe(2);

    fireEvent.click(screen.getByRole("switch", { name: /Line Impact Bars/i }));

    await waitFor(() => {
      expect(screen.queryAllByText("Line Impact Bars").length).toBe(1);
    });

    fireEvent.click(
      screen.getByRole("switch", { name: /Extension Breakdown/i })
    );

    await waitFor(() => {
      expect(screen.queryAllByText("Extension Breakdown").length).toBe(2);
    });
  });

  it("shows replacement modal when enabling a 3rd chart", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("switch", { name: /Top Files by Churn/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Replace Active Visualization")
      ).toBeInTheDocument();
    });
  });

  it("keeps export disabled until analysis exists", () => {
    render(<App />);
    const exportButton = screen.getByRole("button", { name: /Export JSON/i });
    expect(exportButton).toBeDisabled();
  });

  it("removes the manual compare button", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: /^Compare$/i })).toBeNull();
  });

  it("defaults to left-right canvas orientation and allows switching", async () => {
    render(<App />);

    const leftRightTab = screen.getByRole("tab", {
      name: /Left \/ Right/i,
    });
    const topBottomTab = screen.getByRole("tab", {
      name: /Top \/ Bottom/i,
    });

    expect(leftRightTab).toHaveAttribute("aria-selected", "true");
    expect(topBottomTab).toHaveAttribute("aria-selected", "false");

    await act(async () => {
      topBottomTab.focus();
      fireEvent.keyDown(topBottomTab, { key: "Enter" });
    });

    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /Left \/ Right/i })
      ).toHaveAttribute("aria-selected", "false");
      expect(
        screen.getByRole("tab", { name: /Top \/ Bottom/i })
      ).toHaveAttribute("aria-selected", "true");
    });
  });

  it("auto refreshes on repo pick, branch changes, and mode changes", async () => {
    const api = makeApi({
      pickRepo: vi.fn().mockResolvedValue({ ok: true, data: "/tmp/repo" }),
      runAnalysis: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
      listBranches: vi.fn().mockResolvedValue({
        ok: true,
        data: ["feature", "initial-implementation", "main", "master"],
      }),
      loadSettingsForRepo: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          ...defaultSettings,
          baseBranch: "",
          compareBranch: "",
        },
      }),
      saveSettingsForRepo: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          ...defaultSettings,
          baseBranch: "",
          compareBranch: "",
        },
      }),
    });

    Object.defineProperty(window, "api", {
      writable: true,
      value: api,
    });

    render(<App />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Pick local repository/i })
      );
    });

    await waitFor(() => {
      expect(api.runAnalysis).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(api.runAnalysis.mock.calls.at(-1)[0].baseBranch).toBe("main");
    });

    await selectOption(/Compare Branch/i, "master");

    await waitFor(() => {
      expect(api.runAnalysis.mock.calls.at(-1)[0].compareBranch).toBe("master");
    });

    const tipToTipTab = screen.getByRole("tab", { name: /Tip to Tip/i });
    await act(async () => {
      tipToTipTab.focus();
      fireEvent.keyDown(tipToTipTab, { key: "Enter" });
    });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Tip to Tip/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    await waitFor(() => {
      expect(api.runAnalysis.mock.calls.at(-1)[0].mode).toBe("tip-to-tip");
    });
  });
});
