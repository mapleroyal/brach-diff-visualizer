const PANEL_DEFINITIONS = [
  {
    id: "fileStatusDonut",
    title: "File Status Donut",
    description: "Added vs removed vs changed files.",
    datasetKey: "fileStatusDonut",
    emptyStateLabel: "No file status data.",
  },
  {
    id: "lineImpactBars",
    title: "Line Impact Bars",
    description: "Added, removed, and net line movement.",
    datasetKey: "lineImpactBars",
    emptyStateLabel: "No line impact data.",
  },
  {
    id: "statusNetDeltaBars",
    title: "Status Net Delta Bars",
    description: "Net line delta grouped by added, removed, and changed files.",
    datasetKey: "statusNetDeltaBars",
    emptyStateLabel: "No status net delta data.",
  },
  {
    id: "fileTouchSegments",
    title: "File Touch Segments",
    description: "Added and removed lines per touched file.",
    datasetKey: "fileTouchSegments",
    emptyStateLabel: "No file touch data.",
  },
  {
    id: "topFilesChurn",
    title: "Top Files by Churn",
    description: "Most changed files ordered by churn.",
    datasetKey: "topFilesChurn",
    emptyStateLabel: "No churn data available.",
  },
  {
    id: "directoryTreemap",
    title: "Directory Treemap",
    description: "Directory hotspots by cumulative churn.",
    datasetKey: "directoryTreemap",
    emptyStateLabel: "No directory churn data.",
  },
  {
    id: "extensionBreakdown",
    title: "Extension Breakdown",
    description: "Churn grouped by file extension.",
    datasetKey: "extensionBreakdown",
    emptyStateLabel: "No extension data.",
  },
  {
    id: "churnHistogram",
    title: "Churn Histogram",
    description: "Distribution of file-level churn buckets.",
    datasetKey: "churnHistogram",
    emptyStateLabel: "No histogram data.",
  },
];

const PANEL_MAP = Object.fromEntries(
  PANEL_DEFINITIONS.map((definition) => [definition.id, definition])
);

const PANEL_IDS = PANEL_DEFINITIONS.map((definition) => definition.id);

const DEFAULT_ACTIVE_PANELS = ["fileTouchSegments", "lineImpactBars"];

export { DEFAULT_ACTIVE_PANELS, PANEL_DEFINITIONS, PANEL_IDS, PANEL_MAP };
