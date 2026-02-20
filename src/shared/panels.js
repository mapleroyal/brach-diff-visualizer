const PANEL_DEFINITIONS = [
  {
    id: "fileStatusDonut",
    title: "File Status Donut",
    description: "Added vs removed vs changed files.",
    chartType: "donut",
    datasetKey: "fileStatusDonut",
    emptyStateLabel: "No file status data.",
    chartOptions: {
      palette: "fileStatus",
    },
  },
  {
    id: "lineImpactBars",
    title: "Line Impact Bars",
    description: "Added, removed, and net line movement.",
    chartType: "metricBars",
    datasetKey: "lineImpactBars",
    emptyStateLabel: "No line impact data.",
    chartOptions: {
      palette: "lineImpact",
    },
  },
  {
    id: "statusNetDeltaBars",
    title: "Status Net Delta Bars",
    description: "Net line delta grouped by added, removed, and changed files.",
    chartType: "metricBarsWithZeroBaseline",
    datasetKey: "statusNetDeltaBars",
    emptyStateLabel: "No status net delta data.",
    chartOptions: {
      palette: "statusNetDelta",
      tooltipLabel: "Net Delta",
      signedTicks: true,
    },
  },
  {
    id: "fileTouchSegments",
    title: "File Touch Segments",
    description: "Added and removed lines per touched file.",
    chartType: "stackedFileBars",
    datasetKey: "fileTouchSegments",
    emptyStateLabel: "No file touch data.",
    chartOptions: {
      segments: [
        { key: "removed", label: "Lines Removed", tone: "removed" },
        { key: "added", label: "Lines Added", tone: "added" },
      ],
    },
  },
  {
    id: "topFilesChurn",
    title: "Top Files by Churn",
    description: "Most changed files ordered by churn.",
    chartType: "singleMetricFileBars",
    datasetKey: "topFilesChurn",
    emptyStateLabel: "No churn data available.",
    chartOptions: {
      valueKey: "churn",
      valueLabel: "Churn",
    },
  },
  {
    id: "directoryTreemap",
    title: "Directory Treemap",
    description: "Directory hotspots by cumulative churn.",
    chartType: "treemap",
    datasetKey: "directoryTreemap",
    emptyStateLabel: "No directory churn data.",
    chartOptions: {
      valueKey: "size",
      valueLabel: "Churn",
    },
  },
  {
    id: "extensionBreakdown",
    title: "Extension Breakdown",
    description: "Churn grouped by file extension.",
    chartType: "donut",
    datasetKey: "extensionBreakdown",
    emptyStateLabel: "No extension data.",
    chartOptions: {
      palette: "rotating",
    },
  },
  {
    id: "churnHistogram",
    title: "Churn Histogram",
    description: "Distribution of file-level churn buckets.",
    chartType: "histogram",
    datasetKey: "churnHistogram",
    emptyStateLabel: "No histogram data.",
    chartOptions: {
      xKey: "bucket",
      yKey: "count",
    },
  },
];

const PANEL_MAP = Object.fromEntries(
  PANEL_DEFINITIONS.map((definition) => [definition.id, definition])
);

const PANEL_IDS = PANEL_DEFINITIONS.map((definition) => definition.id);

const DEFAULT_ACTIVE_PANELS = ["fileTouchSegments", "lineImpactBars"];

export { DEFAULT_ACTIVE_PANELS, PANEL_DEFINITIONS, PANEL_IDS, PANEL_MAP };
