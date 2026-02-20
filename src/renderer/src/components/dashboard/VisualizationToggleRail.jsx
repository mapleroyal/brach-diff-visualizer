import { Card } from "@renderer/components/ui/card";
import { Label } from "@renderer/components/ui/label";
import { Switch } from "@renderer/components/ui/switch";
import { PANEL_DEFINITIONS } from "@shared/panels";

const VisualizationToggleRail = ({ activePanels, onToggle }) => {
  return (
    <Card className="h-full p-4">
      <div className="mb-4 text-sm font-medium">Visualizations</div>

      <div className="space-y-2">
        {PANEL_DEFINITIONS.map((panel) => {
          const isActive = activePanels.includes(panel.id);
          const switchId = `toggle-${panel.id}`;

          return (
            <div
              key={panel.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 space-y-1">
                <Label htmlFor={switchId}>{panel.title}</Label>
                <div className="text-xs text-muted-foreground">
                  {panel.description}
                </div>
              </div>

              <Switch
                id={switchId}
                checked={isActive}
                onCheckedChange={() => onToggle(panel.id)}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export { VisualizationToggleRail };
