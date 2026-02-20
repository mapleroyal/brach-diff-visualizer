import Store from "electron-store";
import {
  DEFAULT_ACTIVE_PANELS,
  DEFAULT_CANVAS_ORIENTATION,
  MAX_ACTIVE_PANELS,
  PANEL_IDS,
  isValidCanvasOrientation,
} from "@shared/types";
import {
  DEFAULT_ANALYSIS_MODE,
  DEFAULT_COMPARE_SOURCE,
  isValidAnalysisMode,
  isValidCompareSource,
} from "@shared/analysisOptions";
import { DEFAULT_IGNORE_PATTERNS } from "@shared/defaultIgnorePatterns";

const makeDefaultSettings = () => ({
  ignorePatterns: [...DEFAULT_IGNORE_PATTERNS],
  mode: DEFAULT_ANALYSIS_MODE,
  compareSource: DEFAULT_COMPARE_SOURCE,
  baseBranch: "",
  compareBranch: "",
  panelOrder: [...DEFAULT_ACTIVE_PANELS],
  canvasOrientation: DEFAULT_CANVAS_ORIENTATION,
});

const sanitizePanelOrder = (input) => {
  if (!Array.isArray(input)) {
    return [...DEFAULT_ACTIVE_PANELS];
  }

  const deduped = [];

  for (const panelId of input) {
    if (PANEL_IDS.includes(panelId) && !deduped.includes(panelId)) {
      deduped.push(panelId);
    }

    if (deduped.length >= MAX_ACTIVE_PANELS) {
      break;
    }
  }

  return deduped;
};

const sanitizeIgnorePatterns = (input) => {
  if (!Array.isArray(input)) {
    return [...DEFAULT_IGNORE_PATTERNS];
  }

  return input.map((pattern) => pattern.trim()).filter(Boolean);
};

const sanitizeMode = (value) => {
  if (isValidAnalysisMode(value)) {
    return value;
  }

  return DEFAULT_ANALYSIS_MODE;
};

const sanitizeCompareSource = (value) => {
  if (isValidCompareSource(value)) {
    return value;
  }

  return DEFAULT_COMPARE_SOURCE;
};

const ensureSettings = (settings) => {
  if (!settings || typeof settings !== "object") {
    return makeDefaultSettings();
  }

  const defaults = makeDefaultSettings();

  return {
    ignorePatterns: sanitizeIgnorePatterns(settings.ignorePatterns),
    mode: sanitizeMode(settings.mode),
    compareSource: sanitizeCompareSource(settings.compareSource),
    baseBranch:
      typeof settings.baseBranch === "string" ? settings.baseBranch : "",
    compareBranch:
      typeof settings.compareBranch === "string" ? settings.compareBranch : "",
    panelOrder: sanitizePanelOrder(settings.panelOrder),
    canvasOrientation: isValidCanvasOrientation(settings.canvasOrientation)
      ? settings.canvasOrientation
      : defaults.canvasOrientation,
  };
};

class SettingsStore {
  store;

  constructor() {
    this.store = new Store({
      name: "repo-scoped-settings",
      defaults: {
        repos: {},
      },
    });
  }

  loadForRepo(repoPath) {
    const repos = this.store.get("repos");
    const settings = ensureSettings(repos[repoPath]);
    this.saveForRepo(repoPath, settings);
    return settings;
  }

  saveForRepo(repoPath, settings) {
    const repos = this.store.get("repos");
    const merged = ensureSettings(settings);

    this.store.set("repos", {
      ...repos,
      [repoPath]: merged,
    });

    return merged;
  }
}

const settingsStore = new SettingsStore();

export { settingsStore };
