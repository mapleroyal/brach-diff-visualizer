import { useMemo } from "react";
import { DEFAULT_CANVAS_ORIENTATION } from "@shared/types";
import { PANEL_MAP } from "@shared/panels";
import { cn } from "@renderer/lib/utils";
import { Card } from "@renderer/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { CanvasPanel } from "./CanvasPanel";
import { computeCanvasLayout } from "./layoutEngine";

const ORIENTATION_OPTIONS = [
  { id: "left-right", label: "Left / Right" },
  { id: "top-bottom", label: "Top / Bottom" },
];

const resolveCanvasGridClassName = (panelCount, orientation) => {
  if (panelCount <= 1) {
    return "grid-cols-1 grid-rows-1";
  }

  if (orientation === "top-bottom") {
    return "grid-cols-1 grid-rows-2";
  }

  return "grid-cols-2 grid-rows-1";
};

const SnapCanvas = ({
  panelOrder,
  canvasOrientation,
  analysis,
  onOrientationChange,
}) => {
  const resolvedOrientation = canvasOrientation || DEFAULT_CANVAS_ORIENTATION;
  const layout = useMemo(
    () => computeCanvasLayout(panelOrder, resolvedOrientation),
    [panelOrder, resolvedOrientation]
  );
  const gridClassName = useMemo(
    () => resolveCanvasGridClassName(layout.length, resolvedOrientation),
    [layout.length, resolvedOrientation]
  );

  return (
    <Card className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Canvas Layout</div>
        <Tabs value={resolvedOrientation} onValueChange={onOrientationChange}>
          <TabsList>
            {ORIENTATION_OPTIONS.map((option) => (
              <TabsTrigger key={option.id} value={option.id}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1">
        {layout.length === 0 ? (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border px-3 text-sm text-muted-foreground">
            Enable one or two visualizations to populate the canvas.
          </div>
        ) : (
          <div className={cn("grid h-full min-h-0 gap-3", gridClassName)}>
            {layout.map((positionedPanel) => {
              const definition = PANEL_MAP[positionedPanel.id];
              if (!definition) {
                return null;
              }

              return (
                <CanvasPanel
                  key={positionedPanel.id}
                  panel={positionedPanel}
                  definition={definition}
                  analysis={analysis}
                />
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

export { SnapCanvas };
