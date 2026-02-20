const ANALYSIS_MODES = ["merge-base", "tip-to-tip"];
const DEFAULT_ANALYSIS_MODE = ANALYSIS_MODES[0];
const isValidAnalysisMode = (value) => ANALYSIS_MODES.includes(value);

const COMPARE_SOURCES = ["working-tree", "branch-tip"];
const DEFAULT_COMPARE_SOURCE = COMPARE_SOURCES[0];
const isValidCompareSource = (value) => COMPARE_SOURCES.includes(value);

export {
  ANALYSIS_MODES,
  COMPARE_SOURCES,
  DEFAULT_ANALYSIS_MODE,
  DEFAULT_COMPARE_SOURCE,
  isValidAnalysisMode,
  isValidCompareSource,
};
