import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildTreemapColorScale,
  chartSemanticColors,
  chartUiColors,
  fileTouchSegmentColors,
  resolveChartColor,
  resolveColorWithAlpha,
} from "@renderer/lib/chartColors";
import { formatNumber, formatSignedNumber } from "@renderer/lib/numberFormat";

const TREEMAP_LABEL_MIN_SIZE = 2;
const TREEMAP_LABEL_PADDING = 3;
const FILE_PATH_AXIS_WIDTH = 150;
const FILE_PATH_LABEL_MAX_CHARS = 24;
const FILE_CHART_MIN_ROW_HEIGHT = 28;
const CHART_ANIMATION_DURATION_MS = 667;

const chartAnimationProps = {
  isAnimationActive: true,
  animationDuration: CHART_ANIMATION_DURATION_MS,
};

const chartAxisProps = {
  axisLine: { stroke: chartUiColors.border },
  tickLine: { stroke: chartUiColors.border },
  tick: { fill: chartUiColors.mutedForeground },
};

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: chartUiColors.popover,
    borderColor: chartUiColors.border,
    borderRadius: "var(--radius)",
    color: chartUiColors.popoverForeground,
  },
  itemStyle: {
    color: chartUiColors.popoverForeground,
  },
  labelStyle: {
    color: chartUiColors.mutedForeground,
  },
};

const filePathYAxisProps = {
  type: "category",
  dataKey: "path",
  width: FILE_PATH_AXIS_WIDTH,
  interval: 0,
  minTickGap: 0,
  tickFormatter: (value) =>
    clampLabelFromLeft(value, FILE_PATH_LABEL_MAX_CHARS),
};

const donutChartGeometry = {
  cx: "50%",
  cy: "50%",
  outerRadius: "88%",
};

const lineImpactColors = {
  Added: chartSemanticColors.added,
  Removed: chartSemanticColors.removed,
  Net: chartSemanticColors.net,
};

const statusNetDeltaColors = {
  Added: chartSemanticColors.added,
  Removed: chartSemanticColors.removed,
  Changed: chartSemanticColors.changed,
};

const fileStatusColors = {
  added: chartSemanticColors.added,
  removed: chartSemanticColors.removed,
  changed: chartSemanticColors.changed,
};

const paletteMapByName = {
  lineImpact: lineImpactColors,
  statusNetDelta: statusNetDeltaColors,
  fileStatus: fileStatusColors,
};

const clampTreemapLabel = (label, width, fontSize) => {
  const text = `${label || ""}`;
  if (!text) {
    return "";
  }

  const usableWidth = Math.max(1, width - TREEMAP_LABEL_PADDING * 2);
  const approximateCharWidth = Math.max(1, fontSize * 0.58);
  const maxChars = Math.max(1, Math.floor(usableWidth / approximateCharWidth));
  return clampLabelFromLeft(text, maxChars);
};

const clampLabelFromLeft = (value, maxChars) => {
  const text = `${value || ""}`;
  if (text.length <= maxChars) {
    return text;
  }

  if (maxChars <= 1) {
    return text.slice(-maxChars);
  }

  return `…${text.slice(-(maxChars - 1))}`;
};

const resolveTreemapNodeFill = (nodeProps, colorPanel) => {
  if (nodeProps.depth >= 2) {
    return "rgba(255,255,255,0)";
  }

  if (colorPanel.length > 0) {
    return colorPanel[nodeProps.index % colorPanel.length];
  }

  if (typeof nodeProps.fill === "string" && nodeProps.fill.length > 0) {
    return nodeProps.fill;
  }

  return resolveColorWithAlpha(resolveChartColor(nodeProps.index || 0), 0.9);
};

const createTreemapNodeRenderer = (colorPanel) => (nodeProps) => {
  const width = Math.max(0, nodeProps.width || 0);
  const height = Math.max(0, nodeProps.height || 0);
  const x = nodeProps.x || 0;
  const y = nodeProps.y || 0;
  const fill = resolveTreemapNodeFill(nodeProps, colorPanel);
  const fontSize = Math.max(
    7,
    Math.min(13, Math.floor(Math.min(width, height) * 0.32))
  );
  const labelText =
    nodeProps.depth > 0
      ? clampTreemapLabel(nodeProps.name, width, fontSize)
      : "";
  const showLabel =
    labelText.length > 0 &&
    width > TREEMAP_LABEL_MIN_SIZE &&
    height > TREEMAP_LABEL_MIN_SIZE;
  const clipId = `treemap-label-${nodeProps.depth}-${nodeProps.index}-${Math.round(x)}-${Math.round(y)}`;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={nodeProps.stroke || chartUiColors.border}
      />
      {showLabel ? (
        <>
          <clipPath id={clipId}>
            <rect
              x={x + 1}
              y={y + 1}
              width={Math.max(0, width - 2)}
              height={Math.max(0, height - 2)}
            />
          </clipPath>
          <text
            x={x + TREEMAP_LABEL_PADDING}
            y={y + TREEMAP_LABEL_PADDING + fontSize}
            fontSize={fontSize}
            clipPath={`url(#${clipId})`}
            fill={chartUiColors.treemapLabel}
            stroke="none"
            strokeWidth={0}
            pointerEvents="none"
          >
            {labelText}
          </text>
        </>
      ) : null}
    </g>
  );
};

const resolveFileChartMinHeight = (rowCount) =>
  Math.max(0, rowCount * FILE_CHART_MIN_ROW_HEIGHT);

const renderScrollableFileChart = (data, renderChart) => {
  const chartMinHeight = resolveFileChartMinHeight(data.length);

  return (
    <div className="h-full overflow-auto pr-1">
      <div
        className="h-full"
        style={{
          minHeight: `${chartMinHeight}px`,
        }}
      >
        {renderChart()}
      </div>
    </div>
  );
};

const resolvePaletteColor = (paletteName, entry, index) => {
  if (paletteName === "rotating") {
    return resolveChartColor(index + 1);
  }

  const palette = paletteMapByName[paletteName];
  if (palette && typeof entry?.name === "string" && palette[entry.name]) {
    return palette[entry.name];
  }

  return resolveChartColor(index);
};

const renderDonutChart = (data, options = {}) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Pie
        data={data}
        dataKey={options.valueKey || "value"}
        nameKey={options.nameKey || "name"}
        innerRadius={options.innerRadius || "56%"}
        {...donutChartGeometry}
        {...chartAnimationProps}
        stroke={chartUiColors.border}
      >
        {data.map((entry, index) => (
          <Cell
            key={`${entry?.name || "slice"}-${index}`}
            fill={resolvePaletteColor(options.palette, entry, index)}
          />
        ))}
      </Pie>
      <Tooltip {...chartTooltipProps} />
    </PieChart>
  </ResponsiveContainer>
);

const renderMetricBars = (data, options = {}) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <XAxis dataKey={options.xKey || "name"} {...chartAxisProps} />
      <YAxis
        {...chartAxisProps}
        tickFormatter={
          options.signedTicks ? (value) => formatSignedNumber(value) : undefined
        }
      />
      <Tooltip
        {...chartTooltipProps}
        formatter={(value) => {
          if (options.tooltipLabel) {
            return [formatSignedNumber(value), options.tooltipLabel];
          }

          return [formatNumber(value)];
        }}
      />
      {options.showZeroBaseline ? (
        <ReferenceLine y={0} stroke={chartUiColors.border} />
      ) : null}
      <Bar dataKey={options.yKey || "value"} {...chartAnimationProps}>
        {data.map((entry, index) => (
          <Cell
            key={`${entry?.name || "metric"}-${index}`}
            fill={resolvePaletteColor(options.palette, entry, index)}
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const resolveSegmentColor = (tone) => {
  if (tone === "added") {
    return fileTouchSegmentColors.added;
  }

  if (tone === "removed") {
    return fileTouchSegmentColors.removed;
  }

  return resolveChartColor(0);
};

const renderStackedFileBars = (data, options = {}) => {
  const segments = Array.isArray(options.segments) ? options.segments : [];

  return renderScrollableFileChart(data, () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <XAxis type="number" {...chartAxisProps} />
        <YAxis {...filePathYAxisProps} {...chartAxisProps} />
        <Tooltip
          {...chartTooltipProps}
          formatter={(value, key) => {
            const segment = segments.find((candidate) => candidate.key === key);
            return [formatNumber(value), segment?.label || key];
          }}
        />
        {segments.map((segment) => (
          <Bar
            key={segment.key}
            dataKey={segment.key}
            stackId="lines"
            fill={resolveSegmentColor(segment.tone)}
            {...chartAnimationProps}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  ));
};

const renderSingleMetricFileBars = (data, options = {}) => {
  const valueKey = options.valueKey || "value";

  return renderScrollableFileChart(data, () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <XAxis type="number" {...chartAxisProps} />
        <YAxis {...filePathYAxisProps} {...chartAxisProps} />
        <Tooltip
          {...chartTooltipProps}
          formatter={(value) => [
            formatNumber(value),
            options.valueLabel || valueKey,
          ]}
        />
        <Bar dataKey={valueKey} {...chartAnimationProps}>
          {data.map((entry, index) => (
            <Cell
              key={`${entry.path || valueKey}-${index}`}
              fill={resolveChartColor(index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ));
};

const renderTreemap = (data, options = {}) => {
  const colorPanel = buildTreemapColorScale(data.length);
  const renderTreemapNode = createTreemapNodeRenderer(colorPanel);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey={options.valueKey || "size"}
        nameKey={options.nameKey || "name"}
        colorPanel={colorPanel}
        {...chartAnimationProps}
        stroke={chartUiColors.border}
        content={renderTreemapNode}
      >
        <Tooltip
          {...chartTooltipProps}
          formatter={(value) => [
            formatNumber(value),
            options.valueLabel || "Value",
          ]}
          labelFormatter={(label, payload) =>
            payload?.[0]?.payload?.name || label || "Directory"
          }
        />
      </Treemap>
    </ResponsiveContainer>
  );
};

const renderHistogram = (data, options = {}) => {
  const xKey = options.xKey || "bucket";
  const yKey = options.yKey || "count";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey={xKey} {...chartAxisProps} />
        <YAxis {...chartAxisProps} />
        <Tooltip {...chartTooltipProps} />
        <Bar dataKey={yKey} {...chartAnimationProps}>
          {data.map((entry, index) => (
            <Cell
              key={`${entry?.[xKey] || "bucket"}-${index}`}
              fill={resolveChartColor(index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const chartRenderers = {
  donut: renderDonutChart,
  metricBars: renderMetricBars,
  metricBarsWithZeroBaseline: (data, options) =>
    renderMetricBars(data, {
      ...options,
      showZeroBaseline: true,
    }),
  stackedFileBars: renderStackedFileBars,
  singleMetricFileBars: renderSingleMetricFileBars,
  treemap: renderTreemap,
  histogram: renderHistogram,
};

export { chartRenderers };
