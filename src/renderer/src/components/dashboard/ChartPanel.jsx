import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import { PANEL_MAP } from "@shared/panels";
import {
  buildTreemapColorScale,
  chartSemanticColors,
  chartUiColors,
  resolveChartColor,
  resolveColorWithAlpha,
} from "@renderer/lib/chartColors";

const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);

const lineImpactColors = {
  Added: chartSemanticColors.added,
  Removed: chartSemanticColors.removed,
  Net: chartSemanticColors.net,
};

const fileStatusColors = {
  added: chartSemanticColors.added,
  removed: chartSemanticColors.removed,
  changed: chartSemanticColors.changed,
};

const TREEMAP_LABEL_MIN_SIZE = 2;
const TREEMAP_LABEL_PADDING = 3;
const FILE_PATH_AXIS_WIDTH = 150;
const FILE_PATH_LABEL_MAX_CHARS = 24;
const FILE_CHART_BAR_SIZE = 27;

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

const clampTreemapLabel = (label, width, fontSize) => {
  const text = `${label || ""}`;
  if (!text) {
    return "";
  }

  const usableWidth = Math.max(1, width - TREEMAP_LABEL_PADDING * 2);
  const approximateCharWidth = Math.max(1, fontSize * 0.58);
  const maxChars = Math.max(1, Math.floor(usableWidth / approximateCharWidth));
  if (text.length <= maxChars) {
    return text;
  }

  return maxChars > 1
    ? `${text.slice(0, maxChars - 1)}…`
    : text.slice(0, maxChars);
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
            fill={chartUiColors.foreground}
            pointerEvents="none"
          >
            {labelText}
          </text>
        </>
      ) : null}
    </g>
  );
};

const donutChartGeometry = {
  cx: "50%",
  cy: "50%",
  outerRadius: "88%",
};

const FILE_CHART_MIN_HEIGHT = 240;
const FILE_CHART_ROW_HEIGHT = 32;

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

const resolveFileChartHeight = (rowCount) =>
  Math.max(FILE_CHART_MIN_HEIGHT, rowCount * FILE_CHART_ROW_HEIGHT);

const renderScrollableFileChart = (data, renderChart) => {
  const chartHeight = resolveFileChartHeight(data.length);

  return (
    <div className="h-full overflow-auto pr-1">
      <div
        style={{
          height: `${chartHeight}px`,
          minHeight: `${chartHeight}px`,
        }}
      >
        {renderChart()}
      </div>
    </div>
  );
};

const EmptyState = ({ label }) => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    {label}
  </div>
);

const renderFileStatusDonut = (data) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        innerRadius="56%"
        {...donutChartGeometry}
        stroke={chartUiColors.border}
      >
        {data.map((entry, index) => (
          <Cell
            key={`${entry.name}-${index}`}
            fill={fileStatusColors[entry.name] || resolveChartColor(index)}
          />
        ))}
      </Pie>
      <Tooltip {...chartTooltipProps} />
    </PieChart>
  </ResponsiveContainer>
);

const renderLineImpactBars = (data) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <XAxis dataKey="name" {...chartAxisProps} />
      <YAxis {...chartAxisProps} />
      <Tooltip
        {...chartTooltipProps}
        formatter={(value) => formatNumber(value)}
      />
      <Bar dataKey="value">
        {data.map((entry, index) => (
          <Cell
            key={`${entry.name}-${index}`}
            fill={lineImpactColors[entry.name] || resolveChartColor(index)}
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const renderFileTouchSegments = (data) =>
  renderScrollableFileChart(data, () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <XAxis type="number" {...chartAxisProps} />
        <YAxis {...filePathYAxisProps} {...chartAxisProps} />
        <Tooltip
          {...chartTooltipProps}
          formatter={(value, key) => [
            formatNumber(value),
            key === "removed" ? "Lines Removed" : "Lines Added",
          ]}
        />
        <Bar
          dataKey="removed"
          stackId="lines"
          barSize={FILE_CHART_BAR_SIZE}
          fill={chartSemanticColors.removed}
        />
        <Bar
          dataKey="added"
          stackId="lines"
          barSize={FILE_CHART_BAR_SIZE}
          fill={chartSemanticColors.added}
        />
      </BarChart>
    </ResponsiveContainer>
  ));

const renderTopFilesChurn = (data) =>
  renderScrollableFileChart(data, () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <XAxis type="number" {...chartAxisProps} />
        <YAxis {...filePathYAxisProps} {...chartAxisProps} />
        <Tooltip {...chartTooltipProps} />
        <Bar dataKey="churn" barSize={FILE_CHART_BAR_SIZE}>
          {data.map((entry, index) => (
            <Cell
              key={`${entry.path}-${index}`}
              fill={resolveChartColor(index)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ));

const renderDirectoryTreemap = (data) => {
  const colorPanel = buildTreemapColorScale(data.length);
  const renderTreemapNode = createTreemapNodeRenderer(colorPanel);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        colorPanel={colorPanel}
        stroke={chartUiColors.border}
        content={renderTreemapNode}
      >
        <Tooltip
          {...chartTooltipProps}
          formatter={(value) => [formatNumber(value), "Churn"]}
          labelFormatter={(label, payload) =>
            payload?.[0]?.payload?.name || label || "Directory"
          }
        />
      </Treemap>
    </ResponsiveContainer>
  );
};

const renderExtensionBreakdown = (data) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        innerRadius="52%"
        {...donutChartGeometry}
        stroke={chartUiColors.border}
      >
        {data.map((entry, index) => (
          <Cell
            key={`${entry.name}-${index}`}
            fill={resolveChartColor(index + 1)}
          />
        ))}
      </Pie>
      <Tooltip {...chartTooltipProps} />
    </PieChart>
  </ResponsiveContainer>
);

const renderChurnHistogram = (data) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <XAxis dataKey="bucket" {...chartAxisProps} />
      <YAxis {...chartAxisProps} />
      <Tooltip {...chartTooltipProps} />
      <Bar dataKey="count">
        {data.map((entry, index) => (
          <Cell
            key={`${entry.bucket}-${index}`}
            fill={resolveChartColor(index)}
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const PANEL_RENDERERS = {
  fileStatusDonut: renderFileStatusDonut,
  lineImpactBars: renderLineImpactBars,
  fileTouchSegments: renderFileTouchSegments,
  topFilesChurn: renderTopFilesChurn,
  directoryTreemap: renderDirectoryTreemap,
  extensionBreakdown: renderExtensionBreakdown,
  churnHistogram: renderChurnHistogram,
};

const ChartPanel = ({ panelId, analysis }) => {
  if (!analysis) {
    return (
      <EmptyState label="Run a comparison to populate this visualization." />
    );
  }

  const panelDefinition = PANEL_MAP[panelId];
  if (!panelDefinition) {
    return <EmptyState label="Unsupported chart panel." />;
  }

  const renderPanel = PANEL_RENDERERS[panelDefinition.id];
  if (!renderPanel) {
    return <EmptyState label="Unsupported chart panel." />;
  }

  const data = Array.isArray(analysis.datasets?.[panelDefinition.datasetKey])
    ? analysis.datasets[panelDefinition.datasetKey]
    : [];

  if (!data.length) {
    return (
      <EmptyState
        label={panelDefinition.emptyStateLabel || "No data available."}
      />
    );
  }

  return renderPanel(data);
};

export { ChartPanel };
