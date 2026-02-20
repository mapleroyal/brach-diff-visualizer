const THEME_STORAGE_KEY = "branch-diff-visualizer-theme";
const DEFAULT_THEME_MODE = "system";

const THEME_MODE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const THEME_MODE_SET = new Set(
  THEME_MODE_OPTIONS.map((option) => option.value)
);

const resolveThemeMode = (value) =>
  THEME_MODE_SET.has(value) ? value : DEFAULT_THEME_MODE;

export {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  THEME_MODE_OPTIONS,
  resolveThemeMode,
};
