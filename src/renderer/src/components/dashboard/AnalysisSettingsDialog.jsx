import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { Label } from "@renderer/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import {
  DEFAULT_THEME_MODE,
  THEME_MODE_OPTIONS,
  resolveThemeMode,
} from "@renderer/lib/theme";

const AnalysisSettingsDialog = ({
  open,
  compareSource,
  onCompareSourceChange,
  onEditIgnorePatterns,
  onClose,
}) => {
  const { theme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const activeThemeMode = resolveThemeMode(theme);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const handleThemeModeChange = (nextThemeMode) => {
    setTheme(resolveThemeMode(nextThemeMode));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Analysis Settings</DialogTitle>
          <DialogDescription>
            Configure how branch diffs are computed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="compare-source">Compare Source</Label>
            <Select value={compareSource} onValueChange={onCompareSourceChange}>
              <SelectTrigger id="compare-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working-tree">
                  Working Tree (Saved Changes)
                </SelectItem>
                <SelectItem value="branch-tip">
                  Branch Tip (Committed)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Working Tree includes saved local edits on the checked out compare
              branch. Branch Tip uses committed history only.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ignore Patterns</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onEditIgnorePatterns}
            >
              Edit Ignore Patterns
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme-mode">Theme</Label>
            <Select
              value={themeReady ? activeThemeMode : DEFAULT_THEME_MODE}
              onValueChange={handleThemeModeChange}
              disabled={!themeReady}
            >
              <SelectTrigger id="theme-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              System follows your operating system preference.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { AnalysisSettingsDialog };
