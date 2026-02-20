const CHART_TOKEN_SEQUENCE = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];

const resolveThemeColor = (token) => `var(--${token})`;

const resolveChartToken = (index) => {
  const sequenceLength = CHART_TOKEN_SEQUENCE.length;
  const normalizedIndex =
    ((index % sequenceLength) + sequenceLength) % sequenceLength;
  return CHART_TOKEN_SEQUENCE[normalizedIndex];
};

const resolveChartColor = (index) =>
  resolveThemeColor(resolveChartToken(index));

const chartSemanticColors = {
  added: resolveThemeColor("chart-2"),
  removed: resolveThemeColor("chart-5"),
  net: resolveThemeColor("chart-4"),
  changed: resolveThemeColor("chart-4"),
  neutral: resolveThemeColor("chart-1"),
};

const fileTouchSegmentColors = {
  added: chartSemanticColors.added,
  removed: chartSemanticColors.removed,
};

const chartUiColors = {
  border: resolveThemeColor("border"),
  foreground: resolveThemeColor("foreground"),
  treemapLabel: "oklch(0.985 0 0)",
  mutedForeground: resolveThemeColor("muted-foreground"),
  popover: resolveThemeColor("popover"),
  popoverForeground: resolveThemeColor("popover-foreground"),
};

const resolveColorWithAlpha = (color, alpha) =>
  `color-mix(in oklab, ${color} ${Math.round(Math.min(1, Math.max(0, alpha)) * 100)}%, transparent)`;

const resolveTreemapGradientColor = (ratio) => {
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const addedWeight = Math.round(clampedRatio * 100);
  const removedWeight = 100 - addedWeight;

  return `color-mix(in oklab, ${chartSemanticColors.removed} ${removedWeight}%, ${chartSemanticColors.added} ${addedWeight}%)`;
};

const buildTreemapColorScale = (segmentCount) => {
  if (segmentCount <= 0) {
    return [];
  }

  if (segmentCount === 1) {
    return [resolveTreemapGradientColor(0.5)];
  }

  return Array.from({ length: segmentCount }, (_, index) =>
    resolveTreemapGradientColor(index / (segmentCount - 1))
  );
};

const statCardToneClasses = {
  linesAdded: {
    card: "border-chart-2/45 bg-chart-2/10",
    icon: "text-chart-2",
    value: "text-chart-2",
  },
  linesRemoved: {
    card: "border-chart-5/45 bg-chart-5/10",
    icon: "text-chart-5",
    value: "text-chart-5",
  },
  linesNet: {
    card: "border-chart-4/45 bg-chart-4/10",
    icon: "text-chart-4",
    value: "text-chart-4",
  },
  totalTouched: {
    card: "border-chart-1/45 bg-chart-1/10",
    icon: "text-chart-1",
    value: "text-chart-1",
  },
  filesAdded: {
    card: "border-chart-2/45 bg-chart-2/10",
    icon: "text-chart-2",
    value: "text-chart-2",
  },
  filesRemoved: {
    card: "border-chart-5/45 bg-chart-5/10",
    icon: "text-chart-5",
    value: "text-chart-5",
  },
  filesChanged: {
    card: "border-chart-4/45 bg-chart-4/10",
    icon: "text-chart-4",
    value: "text-chart-4",
  },
};

export {
  buildTreemapColorScale,
  chartSemanticColors,
  chartUiColors,
  fileTouchSegmentColors,
  resolveChartColor,
  resolveColorWithAlpha,
  statCardToneClasses,
};
