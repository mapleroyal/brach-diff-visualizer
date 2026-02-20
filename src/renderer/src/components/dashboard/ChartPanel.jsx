import { PANEL_MAP } from "@shared/panels";
import { chartRenderers } from "@renderer/components/dashboard/chartRenderers";

const EmptyState = ({ label }) => (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    {label}
  </div>
);

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

  const renderChart = chartRenderers[panelDefinition.chartType];
  if (!renderChart) {
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

  return renderChart(data, panelDefinition.chartOptions || {});
};

export { ChartPanel, EmptyState };
