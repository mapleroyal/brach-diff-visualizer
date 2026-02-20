import Store from "electron-store";
import {
  DEFAULT_ACTIVE_PANELS,
  DEFAULT_CANVAS_ORIENTATION,
} from "@shared/types";
import {
  DEFAULT_ANALYSIS_MODE,
  DEFAULT_COMPARE_SOURCE,
} from "@shared/analysisOptions";
import { makeDefaultAppSettings } from "@shared/appSettings";
import { DEFAULT_IGNORE_PATTERNS } from "@shared/defaultIgnorePatterns";
import { appSettingsSchema, repoSettingsSchema } from "@shared/ipcContracts";

const makeDefaultSettings = () => ({
  ignorePatterns: [...DEFAULT_IGNORE_PATTERNS],
  mode: DEFAULT_ANALYSIS_MODE,
  compareSource: DEFAULT_COMPARE_SOURCE,
  baseBranch: "",
  compareBranch: "",
  panelOrder: [...DEFAULT_ACTIVE_PANELS],
  canvasOrientation: DEFAULT_CANVAS_ORIENTATION,
});

const normalizeRepoPath = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

class SettingsStore {
  store;

  constructor() {
    this.store = new Store({
      name: "repo-scoped-settings",
      defaults: {
        repos: {},
        lastOpenedRepoPath: null,
        appSettings: makeDefaultAppSettings(),
      },
    });
  }

  loadForRepo(repoPath) {
    const repos = this.store.get("repos");
    const existingSettings = repos?.[repoPath];

    if (existingSettings === undefined) {
      const defaults = makeDefaultSettings();
      return this.saveForRepo(repoPath, defaults);
    }

    return repoSettingsSchema.parse(existingSettings);
  }

  saveForRepo(repoPath, settings) {
    const repos = this.store.get("repos");
    const parsedSettings = repoSettingsSchema.parse(settings);

    this.store.set("repos", {
      ...repos,
      [repoPath]: parsedSettings,
    });

    return parsedSettings;
  }

  loadLastOpenedRepo() {
    return normalizeRepoPath(this.store.get("lastOpenedRepoPath"));
  }

  saveLastOpenedRepo(repoPath) {
    const parsedRepoPath = normalizeRepoPath(repoPath);
    if (!parsedRepoPath) {
      throw new Error("Last opened repo path must be a non-empty string.");
    }

    this.store.set("lastOpenedRepoPath", parsedRepoPath);
    return parsedRepoPath;
  }

  clearLastOpenedRepo() {
    this.store.set("lastOpenedRepoPath", null);
  }

  loadAppSettings() {
    const appSettings = this.store.get("appSettings");

    if (appSettings === undefined) {
      const defaults = makeDefaultAppSettings();
      return this.saveAppSettings(defaults);
    }

    return appSettingsSchema.parse(appSettings);
  }

  saveAppSettings(settings) {
    const parsedSettings = appSettingsSchema.parse(settings);
    this.store.set("appSettings", parsedSettings);
    return parsedSettings;
  }
}

const settingsStore = new SettingsStore();

export { settingsStore };
