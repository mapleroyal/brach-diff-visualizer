import { posix } from "node:path";
const HISTOGRAM_BUCKETS = [
  { label: "0-9", min: 0, max: 9 },
  { label: "10-24", min: 10, max: 24 },
  { label: "25-49", min: 25, max: 49 },
  { label: "50-99", min: 50, max: 99 },
  { label: "100-249", min: 100, max: 249 },
  { label: "250+", min: 250, max: Number.POSITIVE_INFINITY },
];
const statusCodeToFileStatus = (statusCode) => {
  switch (statusCode) {
    case "A":
      return "added";
    case "D":
      return "removed";
    default:
      return "changed";
  }
};
const getDirectory = (filePath) => {
  const dir = posix.dirname(filePath);
  return dir === "." ? "(root)" : dir;
};
const getExtension = (filePath) => {
  const extension = posix.extname(filePath).toLowerCase();
  return extension ? extension.slice(1) : "(none)";
};
const buildSummary = (files) => {
  let linesAdded = 0;
  let linesRemoved = 0;
  let filesAdded = 0;
  let filesRemoved = 0;
  let filesChanged = 0;
  for (const file of files) {
    linesAdded += file.added;
    linesRemoved += file.removed;
    if (file.status === "added") {
      filesAdded += 1;
    } else if (file.status === "removed") {
      filesRemoved += 1;
    } else {
      filesChanged += 1;
    }
  }
  return {
    linesAdded,
    linesRemoved,
    linesNet: linesAdded - linesRemoved,
    filesAdded,
    filesRemoved,
    filesChanged,
    totalTouched: files.length,
  };
};
const buildDatasets = (files, summary) => {
  const fileStatusDonut = [
    { name: "added", value: summary.filesAdded },
    { name: "removed", value: summary.filesRemoved },
    { name: "changed", value: summary.filesChanged },
  ];
  const lineImpactBars = [
    { name: "Added", value: summary.linesAdded, metric: "added" },
    { name: "Removed", value: summary.linesRemoved, metric: "removed" },
    { name: "Net", value: summary.linesNet, metric: "net" },
  ];
  const fileTouchSegments = [...files]
    .map((file) => ({
      path: file.path,
      added: file.added,
      removed: file.removed,
      churn: file.churn,
      status: file.status,
    }))
    .sort((a, b) => b.churn - a.churn || a.path.localeCompare(b.path));
  const topFilesChurn = [...files]
    .sort((a, b) => b.churn - a.churn || a.path.localeCompare(b.path))
    .slice(0, 15)
    .map((file) => ({ path: file.path, churn: file.churn }));
  const directoryMap = /* @__PURE__ */ new Map();
  const extensionMap = /* @__PURE__ */ new Map();
  for (const file of files) {
    directoryMap.set(
      file.directory,
      (directoryMap.get(file.directory) || 0) + file.churn
    );
    extensionMap.set(
      file.extension,
      (extensionMap.get(file.extension) || 0) + file.churn
    );
  }
  const directoryTreemap = [...directoryMap.entries()]
    .map(([name, size]) => ({ name, size }))
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  const extensionBreakdown = [...extensionMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const histogramCounts = new Map(
    HISTOGRAM_BUCKETS.map((bucket) => [bucket.label, 0])
  );
  for (const file of files) {
    const bucket = HISTOGRAM_BUCKETS.find(
      (candidate) => file.churn >= candidate.min && file.churn <= candidate.max
    );
    if (bucket) {
      histogramCounts.set(
        bucket.label,
        (histogramCounts.get(bucket.label) || 0) + 1
      );
    }
  }
  const churnHistogram = HISTOGRAM_BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: histogramCounts.get(bucket.label) || 0,
  }));
  return {
    fileStatusDonut,
    lineImpactBars,
    fileTouchSegments,
    topFilesChurn,
    directoryTreemap,
    extensionBreakdown,
    churnHistogram,
  };
};
export {
  buildDatasets,
  buildSummary,
  getDirectory,
  getExtension,
  statusCodeToFileStatus,
};
