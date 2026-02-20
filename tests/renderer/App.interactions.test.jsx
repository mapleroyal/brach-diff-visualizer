import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analysisFixture, defaultSettings, makeApi } from "./fixtures";
import { renderApp, selectOption, setWindowApi } from "./testUtils";

describe("App interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    setWindowApi(makeApi());
  });

  it("deactivates and reactivates visualization toggles", async () => {
    renderApp();

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

  it("replaces the left visualization when enabling a 3rd chart", async () => {
    renderApp();

    expect(screen.queryAllByText("File Touch Segments").length).toBe(2);
    expect(screen.queryAllByText("Line Impact Bars").length).toBe(2);

    fireEvent.click(
      screen.getByRole("switch", { name: /Top Files by Churn/i })
    );

    await waitFor(() => {
      expect(screen.queryByText("Replace Active Visualization")).toBeNull();
      expect(screen.queryAllByText("File Touch Segments").length).toBe(1);
      expect(screen.queryAllByText("Line Impact Bars").length).toBe(2);
      expect(screen.queryAllByText("Top Files by Churn").length).toBe(2);
    });
  });

  it("enables the status net delta chart option", async () => {
    renderApp();

    fireEvent.click(
      screen.getByRole("switch", { name: /Status Net Delta Bars/i })
    );

    await waitFor(() => {
      expect(screen.queryAllByText("Status Net Delta Bars").length).toBe(2);
    });
  });

  it("keeps export disabled until analysis exists", () => {
    renderApp();
    const exportButton = screen.getByRole("button", { name: /Export JSON/i });
    expect(exportButton).toBeDisabled();
  });

  it("removes the manual compare button", () => {
    renderApp();
    expect(screen.queryByRole("button", { name: /^Compare$/i })).toBeNull();
  });

  it("defaults to left-right canvas orientation and allows switching", async () => {
    renderApp();

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
      pollAnalysis: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          signature: "stable",
          changed: true,
          result: analysisFixture,
        },
      }),
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

    setWindowApi(api);

    renderApp();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Pick local repository/i })
      );
    });

    await waitFor(() => {
      expect(api.pollAnalysis).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(api.pollAnalysis.mock.calls.at(-1)[0].baseBranch).toBe("main");
    });

    await selectOption(/Compare Branch/i, "master");

    await waitFor(() => {
      expect(api.pollAnalysis.mock.calls.at(-1)[0].compareBranch).toBe(
        "master"
      );
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
      expect(api.pollAnalysis.mock.calls.at(-1)[0].mode).toBe("tip-to-tip");
    });
  });
});
