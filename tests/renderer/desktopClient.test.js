import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  desktopClient,
  getDesktopClientErrorMessage,
} from "../../src/renderer/src/services/desktopClient";

const analysisRequest = {
  repoPath: "/tmp/repo",
  baseBranch: "main",
  compareBranch: "feature",
  mode: "merge-base",
  compareSource: "branch-tip",
  ignorePatterns: ["node_modules/**"],
};

const setWindowApi = (api) => {
  Object.defineProperty(window, "api", {
    writable: true,
    value: api,
  });
};

describe("desktopClient.pollAnalysis", () => {
  beforeEach(() => {
    setWindowApi({});
  });

  it("uses only the analysis:poll bridge method", async () => {
    const pollAnalysis = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        signature: "signature-1",
        changed: false,
      },
    });
    const getAnalysisSignature = vi.fn();
    const runAnalysis = vi.fn();

    setWindowApi({
      pollAnalysis,
      getAnalysisSignature,
      runAnalysis,
    });

    const response = await desktopClient.pollAnalysis(analysisRequest, "prev");

    expect(response).toEqual({
      signature: "signature-1",
      changed: false,
    });
    expect(pollAnalysis).toHaveBeenCalledTimes(1);
    expect(pollAnalysis).toHaveBeenCalledWith(analysisRequest, "prev");
    expect(getAnalysisSignature).not.toHaveBeenCalled();
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it("throws a modern bridge error when pollAnalysis is unavailable", async () => {
    const getAnalysisSignature = vi.fn();
    const runAnalysis = vi.fn();

    setWindowApi({
      getAnalysisSignature,
      runAnalysis,
    });

    const error = await desktopClient
      .pollAnalysis(analysisRequest, null)
      .catch((value) => value);

    expect(getDesktopClientErrorMessage(error)).toBe(
      'Desktop bridge method "pollAnalysis" is unavailable.'
    );
    expect(getAnalysisSignature).not.toHaveBeenCalled();
    expect(runAnalysis).not.toHaveBeenCalled();
  });
});

describe("desktopClient.loadLastOpenedRepo", () => {
  beforeEach(() => {
    setWindowApi({});
  });

  it("uses only the settings:loadLastOpenedRepo bridge method", async () => {
    const loadLastOpenedRepo = vi.fn().mockResolvedValue({
      ok: true,
      data: "/tmp/repo",
    });
    const pickRepo = vi.fn();
    const loadSettingsForRepo = vi.fn();

    setWindowApi({
      loadLastOpenedRepo,
      pickRepo,
      loadSettingsForRepo,
    });

    const response = await desktopClient.loadLastOpenedRepo();

    expect(response).toBe("/tmp/repo");
    expect(loadLastOpenedRepo).toHaveBeenCalledTimes(1);
    expect(pickRepo).not.toHaveBeenCalled();
    expect(loadSettingsForRepo).not.toHaveBeenCalled();
  });

  it("throws a bridge error when loadLastOpenedRepo is unavailable", async () => {
    const pickRepo = vi.fn();
    const loadSettingsForRepo = vi.fn();

    setWindowApi({
      pickRepo,
      loadSettingsForRepo,
    });

    const error = await desktopClient
      .loadLastOpenedRepo()
      .catch((value) => value);

    expect(getDesktopClientErrorMessage(error)).toBe(
      'Desktop bridge method "loadLastOpenedRepo" is unavailable.'
    );
    expect(pickRepo).not.toHaveBeenCalled();
    expect(loadSettingsForRepo).not.toHaveBeenCalled();
  });
});

describe("desktopClient.getCurrentBranch", () => {
  beforeEach(() => {
    setWindowApi({});
  });

  it("loads current branch via git:getCurrentBranch", async () => {
    const getCurrentBranch = vi.fn().mockResolvedValue({
      ok: true,
      data: "feature",
    });
    const listBranches = vi.fn();

    setWindowApi({
      getCurrentBranch,
      listBranches,
    });

    const response = await desktopClient.getCurrentBranch("/tmp/repo");

    expect(response).toBe("feature");
    expect(getCurrentBranch).toHaveBeenCalledWith("/tmp/repo");
    expect(listBranches).not.toHaveBeenCalled();
  });

  it("throws a bridge error when getCurrentBranch is unavailable", async () => {
    const listBranches = vi.fn();

    setWindowApi({
      listBranches,
    });

    const error = await desktopClient
      .getCurrentBranch("/tmp/repo")
      .catch((value) => value);

    expect(getDesktopClientErrorMessage(error)).toBe(
      'Desktop bridge method "getCurrentBranch" is unavailable.'
    );
    expect(listBranches).not.toHaveBeenCalled();
  });
});

describe("desktopClient app settings methods", () => {
  beforeEach(() => {
    setWindowApi({});
  });

  it("loads app settings via settings:loadAppSettings", async () => {
    const loadAppSettings = vi.fn().mockResolvedValue({
      ok: true,
      data: { autoOpenLastRepoOnStartup: false },
    });
    const saveAppSettings = vi.fn();

    setWindowApi({
      loadAppSettings,
      saveAppSettings,
    });

    const response = await desktopClient.loadAppSettings();

    expect(response).toEqual({ autoOpenLastRepoOnStartup: false });
    expect(loadAppSettings).toHaveBeenCalledTimes(1);
    expect(saveAppSettings).not.toHaveBeenCalled();
  });

  it("saves app settings via settings:saveAppSettings", async () => {
    const loadAppSettings = vi.fn();
    const saveAppSettings = vi.fn().mockResolvedValue({
      ok: true,
      data: { autoOpenLastRepoOnStartup: false },
    });

    setWindowApi({
      loadAppSettings,
      saveAppSettings,
    });

    const response = await desktopClient.saveAppSettings({
      autoOpenLastRepoOnStartup: false,
    });

    expect(response).toEqual({ autoOpenLastRepoOnStartup: false });
    expect(saveAppSettings).toHaveBeenCalledWith({
      autoOpenLastRepoOnStartup: false,
    });
    expect(loadAppSettings).not.toHaveBeenCalled();
  });
});
