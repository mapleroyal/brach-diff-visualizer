import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@renderer/App";
import { ThemeProvider } from "@renderer/components/theme-provider";
import { THEME_STORAGE_KEY } from "@renderer/lib/theme";

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

const createMatchMediaController = (prefersDark = false) => {
  let darkModeEnabled = prefersDark;
  const darkSchemeListeners = new Set();

  const matchMedia = (query) => {
    const isDarkQuery = query === "(prefers-color-scheme: dark)";

    return {
      matches: isDarkQuery ? darkModeEnabled : false,
      media: query,
      onchange: null,
      addListener: (listener) => {
        if (isDarkQuery) {
          darkSchemeListeners.add(listener);
        }
      },
      removeListener: (listener) => {
        darkSchemeListeners.delete(listener);
      },
      addEventListener: (_eventName, listener) => {
        if (isDarkQuery) {
          darkSchemeListeners.add(listener);
        }
      },
      removeEventListener: (_eventName, listener) => {
        darkSchemeListeners.delete(listener);
      },
      dispatchEvent: () => true,
    };
  };

  return {
    matchMedia,
    setPrefersDark: (nextValue) => {
      darkModeEnabled = nextValue;
      const event = {
        matches: darkModeEnabled,
        media: "(prefers-color-scheme: dark)",
      };

      for (const listener of darkSchemeListeners) {
        listener(event);
      }
    },
  };
};

const setMatchMedia = (controller) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: controller.matchMedia,
  });
};

const renderApp = () =>
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

const openSettingsDialog = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
  });

  await waitFor(() => {
    expect(screen.getByText("Analysis Settings")).toBeInTheDocument();
  });
};

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

describe("Theme mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    setMatchMedia(createMatchMediaController(false));

    Object.defineProperty(window, "api", {
      writable: true,
      value: makeApi(),
    });
  });

  it("renders theme options and updates the class state", async () => {
    renderApp();
    await openSettingsDialog();

    await act(async () => {
      const trigger = screen.getByRole("combobox", { name: /Theme/i });
      trigger.focus();
      fireEvent.keyDown(trigger, { key: "ArrowDown" });
    });

    expect(await screen.findByRole("option", { name: "System" })).toBeVisible();
    expect(await screen.findByRole("option", { name: "Light" })).toBeVisible();
    expect(await screen.findByRole("option", { name: "Dark" })).toBeVisible();

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "System" }));
    });

    await selectOption(/Theme/i, "Dark");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    await selectOption(/Theme/i, "Light");
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("uses the OS preference when System is selected", async () => {
    const mediaController = createMatchMediaController(true);
    setMatchMedia(mediaController);

    renderApp();
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    await openSettingsDialog();
    await selectOption(/Theme/i, "System");

    await act(async () => {
      mediaController.setPrefersDark(false);
    });
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("persists theme preference across reloads", async () => {
    setMatchMedia(createMatchMediaController(false));

    const { unmount } = renderApp();
    await openSettingsDialog();
    await selectOption(/Theme/i, "Dark");

    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    });

    unmount();
    document.documentElement.className = "";

    renderApp();
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
