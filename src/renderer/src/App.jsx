import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Settings2,
} from "lucide-react";
import {
  DEFAULT_ACTIVE_PANELS,
  DEFAULT_CANVAS_ORIENTATION,
  MAX_ACTIVE_PANELS,
} from "@shared/types";
import { DEFAULT_IGNORE_PATTERNS } from "@shared/defaultIgnorePatterns";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";
import { Card } from "@renderer/components/ui/card";
import { Input } from "@renderer/components/ui/input";
import { Label } from "@renderer/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@renderer/components/ui/tabs";
import { IgnorePatternsDialog } from "@renderer/components/dashboard/IgnorePatternsDialog";
import { ReplacePanelDialog } from "@renderer/components/dashboard/ReplacePanelDialog";
import { StatCards } from "@renderer/components/dashboard/StatCards";
import { VisualizationToggleRail } from "@renderer/components/dashboard/VisualizationToggleRail";
import { SnapCanvas } from "@renderer/components/canvas/SnapCanvas";

const resolveDefaultBaseBranch = (branches) => {
  if (branches.includes("main")) {
    return "main";
  }
  if (branches.includes("master")) {
    return "master";
  }
  return branches[0] || "";
};

const resolveBranchSelection = (branches, preferredBase, preferredCompare) => {
  const fallbackBase = resolveDefaultBaseBranch(branches);
  const baseBranch =
    preferredBase && branches.includes(preferredBase)
      ? preferredBase
      : fallbackBase;

  let compareBranch =
    preferredCompare && branches.includes(preferredCompare)
      ? preferredCompare
      : branches.find((branch) => branch !== baseBranch) || baseBranch || "";

  if (branches.length > 1 && compareBranch === baseBranch) {
    compareBranch = branches.find((branch) => branch !== baseBranch) || "";
  }

  return { baseBranch, compareBranch };
};

const App = () => {
  const [repoPath, setRepoPath] = useState("");
  const [branches, setBranches] = useState([]);
  const [baseBranch, setBaseBranch] = useState("");
  const [compareBranch, setCompareBranch] = useState("");
  const [mode, setMode] = useState("merge-base");
  const [ignorePatterns, setIgnorePatterns] = useState([
    ...DEFAULT_IGNORE_PATTERNS,
  ]);
  const [analysis, setAnalysis] = useState();
  const [panelOrder, setPanelOrder] = useState([...DEFAULT_ACTIVE_PANELS]);
  const [canvasOrientation, setCanvasOrientation] = useState(
    DEFAULT_CANVAS_ORIENTATION
  );
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [pendingPanelToAdd, setPendingPanelToAdd] = useState(null);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const analysisRequest = useMemo(() => {
    if (!repoPath || !baseBranch || !compareBranch) {
      return null;
    }

    return {
      repoPath,
      baseBranch,
      compareBranch,
      mode,
      ignorePatterns,
    };
  }, [repoPath, baseBranch, compareBranch, mode, ignorePatterns]);

  const saveSettings = useCallback(async (currentRepoPath, settings) => {
    const response = await window.api.saveSettingsForRepo(
      currentRepoPath,
      settings
    );

    if (!response.ok) {
      setError(response.error);
    }
  }, []);

  useEffect(() => {
    if (!repoPath || !settingsHydrated) {
      return;
    }

    void saveSettings(repoPath, {
      ignorePatterns,
      mode,
      baseBranch,
      compareBranch,
      panelOrder: [...panelOrder],
      canvasOrientation,
    });
  }, [
    repoPath,
    settingsHydrated,
    ignorePatterns,
    mode,
    baseBranch,
    compareBranch,
    panelOrder,
    canvasOrientation,
    saveSettings,
  ]);

  const loadRepoContext = useCallback(async (path) => {
    setSettingsHydrated(false);
    setError(null);
    setAnalysis(undefined);

    const [branchResponse, settingsResponse] = await Promise.all([
      window.api.listBranches(path),
      window.api.loadSettingsForRepo(path),
    ]);

    if (!branchResponse.ok) {
      setError(branchResponse.error);
      return;
    }

    if (!settingsResponse.ok) {
      setError(settingsResponse.error);
      return;
    }

    const availableBranches = branchResponse.data;
    const settings = settingsResponse.data;

    setRepoPath(path);
    setBranches(availableBranches);
    setMode(settings.mode);
    setIgnorePatterns(settings.ignorePatterns);
    setPanelOrder(settings.panelOrder.slice(0, MAX_ACTIVE_PANELS));
    setCanvasOrientation(
      settings.canvasOrientation || DEFAULT_CANVAS_ORIENTATION
    );

    const resolvedBranches = resolveBranchSelection(
      availableBranches,
      settings.baseBranch,
      settings.compareBranch
    );

    setBaseBranch(resolvedBranches.baseBranch);
    setCompareBranch(resolvedBranches.compareBranch);
    setSettingsHydrated(true);
  }, []);

  useEffect(() => {
    if (!analysisRequest || !settingsHydrated) {
      if (!analysisRequest) {
        setAnalysis(undefined);
      }
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      const response = await window.api.runAnalysis(analysisRequest);

      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (!response.ok) {
        setAnalysis(undefined);
        setError(response.error);
        return;
      }

      setAnalysis(response.data);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [analysisRequest, settingsHydrated]);

  const handlePickRepo = async () => {
    const response = await window.api.pickRepo();

    if (!response.ok) {
      setError(response.error);
      return;
    }

    if (!response.data) {
      return;
    }

    await loadRepoContext(response.data);
  };

  const handleRefreshRepo = async () => {
    if (!repoPath) {
      return;
    }

    await loadRepoContext(repoPath);
  };

  const handleExportJson = async () => {
    if (!analysis || !analysisRequest) {
      return;
    }

    const response = await window.api.exportJson({
      request: analysisRequest,
      result: analysis,
    });

    if (!response.ok) {
      setError(response.error);
      return;
    }

    if (response.data) {
      setError(`JSON exported to ${response.data}`);
    }
  };

  const handleTogglePanel = (panelId) => {
    setPanelOrder((current) => {
      if (current.includes(panelId)) {
        return current.filter((id) => id !== panelId);
      }

      if (current.length >= MAX_ACTIVE_PANELS) {
        setPendingPanelToAdd(panelId);
        return current;
      }

      return [...current, panelId];
    });
  };

  const handleReplacePanel = (panelToReplace) => {
    if (!pendingPanelToAdd) {
      return;
    }

    setPanelOrder((current) =>
      current.map((id) => (id === panelToReplace ? pendingPanelToAdd : id))
    );
    setPendingPanelToAdd(null);
  };

  return (
    <main className="flex h-full flex-col gap-3 p-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1.5fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto_auto] xl:items-center">
          <div className="space-y-2">
            <Label htmlFor="repository-path">Repository</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={handlePickRepo}
                aria-label="Pick local repository"
              >
                <FolderOpen />
              </Button>
              <Input
                id="repository-path"
                value={repoPath}
                placeholder="Pick local repository"
                readOnly
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRefreshRepo}
                disabled={!repoPath || isLoading}
                aria-label="Refresh repository"
              >
                <RefreshCw />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-branch">Base Branch</Label>
            <Select
              value={baseBranch}
              onValueChange={setBaseBranch}
              disabled={branches.length === 0}
            >
              <SelectTrigger id="base-branch">
                <SelectValue placeholder="Select base branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compare-branch">Compare Branch</Label>
            <Select
              value={compareBranch}
              onValueChange={setCompareBranch}
              disabled={branches.length === 0}
            >
              <SelectTrigger id="compare-branch">
                <SelectValue placeholder="Select compare branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mode</Label>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList>
                <TabsTrigger value="merge-base">Merge Base</TabsTrigger>
                <TabsTrigger value="tip-to-tip">Tip to Tip</TabsTrigger>
              </TabsList>
            </Tabs>
            {isLoading ? (
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle size={12} className="animate-spin" />
                Refreshing comparison...
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 xl:justify-self-end">
            <Button
              variant="secondary"
              onClick={() => setIgnoreDialogOpen(true)}
              className="gap-2"
            >
              <Settings2 size={15} />
              Ignore Patterns
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportJson}
              disabled={!analysis}
              className="gap-2"
            >
              <Download size={15} />
              Export JSON
            </Button>
          </div>
        </div>
      </Card>

      <StatCards summary={analysis?.summary} />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[320px_1fr]">
        <VisualizationToggleRail
          activePanels={panelOrder}
          onToggle={handleTogglePanel}
        />
        <SnapCanvas
          panelOrder={panelOrder}
          canvasOrientation={canvasOrientation}
          analysis={analysis}
          onOrientationChange={setCanvasOrientation}
        />
      </section>

      <IgnorePatternsDialog
        open={ignoreDialogOpen}
        initialPatterns={ignorePatterns}
        onClose={() => setIgnoreDialogOpen(false)}
        onSave={setIgnorePatterns}
      />

      <ReplacePanelDialog
        open={pendingPanelToAdd !== null}
        pendingPanel={pendingPanelToAdd}
        activePanels={panelOrder}
        onCancel={() => setPendingPanelToAdd(null)}
        onChooseReplacement={handleReplacePanel}
      />
    </main>
  );
};

export default App;
