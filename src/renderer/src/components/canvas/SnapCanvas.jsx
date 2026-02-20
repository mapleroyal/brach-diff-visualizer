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
  const canChangeOrientation = layout.length > 1;
  const gridClassName = useMemo(
    () => resolveCanvasGridClassName(layout.length, resolvedOrientation),
    [layout.length, resolvedOrientation]
  );

  return (
    <Card className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium">Canvas Layout</div>
        <Tabs value={resolvedOrientation} onValueChange={onOrientationChange}>
          <TabsList className="w-full sm:w-auto">
            {ORIENTATION_OPTIONS.map((option) => (
              <TabsTrigger
                key={option.id}
                value={option.id}
                disabled={!canChangeOrientation}
                className="flex-1 text-xs sm:flex-none sm:text-sm"
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      {!canChangeOrientation ? (
        <div className="mb-3 text-xs text-muted-foreground">
          Enable two visualizations to change split direction.
        </div>
      ) : null}

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
