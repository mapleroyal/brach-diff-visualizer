import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { MAX_ACTIVE_PANELS } from "@shared/types";
import { PANEL_MAP } from "@shared/panels";

const ReplacePanelDialog = ({
  open,
  pendingPanel,
  activePanels,
  onCancel,
  onChooseReplacement,
}) => {
  if (!pendingPanel) {
    return null;
  }

  const pendingTitle = PANEL_MAP[pendingPanel].title;

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace Active Visualization</DialogTitle>
          <DialogDescription>
            Canvas supports a maximum of {MAX_ACTIVE_PANELS} visualizations.
            Select one to replace with{" "}
            <span className="font-semibold">{pendingTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {activePanels.map((panelId) => (
            <Button
              key={panelId}
              type="button"
              variant="outline"
              onClick={() => onChooseReplacement(panelId)}
              className="h-auto justify-start py-3 text-left"
            >
              {PANEL_MAP[panelId].title}
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ReplacePanelDialog };
