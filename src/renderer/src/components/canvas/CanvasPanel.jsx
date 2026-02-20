import { useMemo } from "react";
import { ChartPanel } from "@renderer/components/dashboard/ChartPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@renderer/components/ui/card";

const CanvasPanel = ({ panel, definition, analysis }) => {
  const style = useMemo(
    () => ({
      gridColumn: `${panel.col + 1} / span ${panel.colSpan}`,
      gridRow: `${panel.row + 1} / span ${panel.rowSpan}`,
    }),
    [panel.col, panel.colSpan, panel.row, panel.rowSpan]
  );

  return (
    <Card
      style={style}
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      <CardHeader className="flex-row items-center justify-between gap-3 border-b px-3 py-2">
        <CardTitle className="truncate text-sm">{definition.title}</CardTitle>
        <CardDescription className="hidden max-w-[48%] truncate xl:block">
          {definition.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-2">
        <div className="h-full rounded-lg border p-1">
          <ChartPanel panelId={panel.id} analysis={analysis} />
        </div>
      </CardContent>
    </Card>
  );
};

export { CanvasPanel };
