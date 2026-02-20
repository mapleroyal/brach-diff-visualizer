import { useEffect, useMemo, useState } from "react";
import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { Textarea } from "@renderer/components/ui/textarea";

const IgnorePatternsDialog = ({ open, initialPatterns, onClose, onSave }) => {
  const [draftText, setDraftText] = useState("");
  const normalizedInitial = useMemo(
    () => initialPatterns.join("\n"),
    [initialPatterns]
  );

  useEffect(() => {
    if (open) {
      setDraftText(normalizedInitial);
    }
  }, [open, normalizedInitial]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const handleSave = () => {
    const patterns = draftText
      .split("\n")
      .map((pattern) => pattern.trim())
      .filter(Boolean);

    onSave(patterns);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ignore Glob Patterns</DialogTitle>
          <DialogDescription>
            One glob per line. Patterns are applied before metric aggregation.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          className="h-72"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Patterns</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { IgnorePatternsDialog };
