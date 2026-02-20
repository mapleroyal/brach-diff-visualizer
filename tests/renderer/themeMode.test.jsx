import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "@renderer/lib/theme";
import { makeApi } from "./fixtures";
import { renderApp, selectOption, setWindowApi } from "./testUtils";

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

const openSettingsDialog = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
  });

  await waitFor(() => {
    expect(screen.getByText("Analysis Settings")).toBeInTheDocument();
  });
};

describe("Theme mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    setMatchMedia(createMatchMediaController(false));
    setWindowApi(makeApi());
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
