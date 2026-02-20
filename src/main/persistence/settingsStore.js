import Store from "electron-store";
import {
  DEFAULT_ACTIVE_PANELS,
  DEFAULT_CANVAS_ORIENTATION,
  MAX_ACTIVE_PANELS,
  PANEL_IDS,
  isValidCanvasOrientation,
} from "@shared/types";
import { DEFAULT_IGNORE_PATTERNS } from "@shared/defaultIgnorePatterns";

const ANALYSIS_MODES = ["merge-base", "tip-to-tip"];

const makeDefaultSettings = () => ({
  ignorePatterns: [...DEFAULT_IGNORE_PATTERNS],
  mode: ANALYSIS_MODES[0],
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
  if (ANALYSIS_MODES.includes(value)) {
    return value;
  }

  return ANALYSIS_MODES[0];
};

const ensureSettings = (settings) => {
  if (!settings || typeof settings !== "object") {
    return makeDefaultSettings();
  }

  const defaults = makeDefaultSettings();

  return {
    ignorePatterns: sanitizeIgnorePatterns(settings.ignorePatterns),
    mode: sanitizeMode(settings.mode),
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
