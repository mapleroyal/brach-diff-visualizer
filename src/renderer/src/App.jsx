import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DEFAULT_ANALYSIS_MODE,
  DEFAULT_COMPARE_SOURCE,
} from "@shared/analysisOptions";
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
import { AnalysisSettingsDialog } from "@renderer/components/dashboard/AnalysisSettingsDialog";
import { IgnorePatternsDialog } from "@renderer/components/dashboard/IgnorePatternsDialog";
import { StatCards } from "@renderer/components/dashboard/StatCards";
import { VisualizationToggleRail } from "@renderer/components/dashboard/VisualizationToggleRail";
import { SnapCanvas } from "@renderer/components/canvas/SnapCanvas";

const REPO_PLACEHOLDER = "Pick local repository";
const AUTO_REFRESH_INTERVAL_MS = 1000;

const BranchSelectField = ({
  id,
  label,
  value,
  onValueChange,
  branches,
  placeholder,
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={branches.length === 0}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
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
);

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

const getRepoName = (repoPath) => {
  if (!repoPath) {
    return "";
  }

  const normalized = repoPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] || normalized;
};

const App = () => {
  const [repoPath, setRepoPath] = useState("");
  const [branches, setBranches] = useState([]);
  const [baseBranch, setBaseBranch] = useState("");
  const [compareBranch, setCompareBranch] = useState("");
  const [mode, setMode] = useState(DEFAULT_ANALYSIS_MODE);
  const [compareSource, setCompareSource] = useState(DEFAULT_COMPARE_SOURCE);
  const [ignorePatterns, setIgnorePatterns] = useState([
    ...DEFAULT_IGNORE_PATTERNS,
  ]);
  const [analysis, setAnalysis] = useState();
  const [panelOrder, setPanelOrder] = useState([...DEFAULT_ACTIVE_PANELS]);
  const [canvasOrientation, setCanvasOrientation] = useState(
    DEFAULT_CANVAS_ORIENTATION
  );
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const analysisSignatureRef = useRef(null);

  const repoName = useMemo(() => getRepoName(repoPath), [repoPath]);
  const repoDisplayWidth = useMemo(() => {
    const source = repoName || REPO_PLACEHOLDER;
    return `${source.length + 2}ch`;
  }, [repoName]);

  const analysisRequest = useMemo(() => {
    if (!repoPath || !baseBranch || !compareBranch) {
      return null;
    }

    return {
      repoPath,
      baseBranch,
      compareBranch,
      mode,
      compareSource,
      ignorePatterns,
    };
  }, [
    repoPath,
    baseBranch,
    compareBranch,
    mode,
    compareSource,
    ignorePatterns,
  ]);

  const setAppError = useCallback((message) => {
    setNotice(null);
    setError(message);
  }, []);

  const setAppNotice = useCallback((message) => {
    setError(null);
    setNotice(message);
  }, []);

  const saveSettings = useCallback(
    async (currentRepoPath, settings) => {
      const response = await window.api.saveSettingsForRepo(
        currentRepoPath,
        settings
      );

      if (!response.ok) {
        setAppError(response.error);
      }
    },
    [setAppError]
  );

  useEffect(() => {
    if (!repoPath || !settingsHydrated) {
      return;
    }

    void saveSettings(repoPath, {
      ignorePatterns,
      mode,
      compareSource,
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
    compareSource,
    baseBranch,
    compareBranch,
    panelOrder,
    canvasOrientation,
    saveSettings,
  ]);

  const loadRepoContext = useCallback(
    async (path) => {
      setSettingsHydrated(false);
      setError(null);
      setNotice(null);
      setAnalysis(undefined);

      const [branchResponse, settingsResponse] = await Promise.all([
        window.api.listBranches(path),
        window.api.loadSettingsForRepo(path),
      ]);

      if (!branchResponse.ok) {
        setAppError(branchResponse.error);
        return;
      }

      if (!settingsResponse.ok) {
        setAppError(settingsResponse.error);
        return;
      }

      const availableBranches = branchResponse.data;
      const settings = settingsResponse.data;

      setRepoPath(path);
      setBranches(availableBranches);
      setMode(settings.mode);
      setCompareSource(settings.compareSource);
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
    },
    [setAppError]
  );

  useEffect(() => {
    analysisSignatureRef.current = null;

    if (!analysisRequest || !settingsHydrated) {
      return;
    }

    let cancelled = false;
    let isPolling = false;

    const pollSignature = async () => {
      if (isPolling) {
        return;
      }

      isPolling = true;
      const response = await window.api.getAnalysisSignature(analysisRequest);
      isPolling = false;

      if (cancelled || !response.ok) {
        return;
      }

      const signature = response.data;

      if (analysisSignatureRef.current === null) {
        analysisSignatureRef.current = signature;
        return;
      }

      if (analysisSignatureRef.current !== signature) {
        analysisSignatureRef.current = signature;
        setRefreshCounter((current) => current + 1);
      }
    };

    void pollSignature();

    const intervalId = window.setInterval(
      () => void pollSignature(),
      AUTO_REFRESH_INTERVAL_MS
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [analysisRequest, settingsHydrated]);

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
      setNotice(null);

      const response = await window.api.runAnalysis(analysisRequest);

      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (!response.ok) {
        setAnalysis(undefined);
        setAppError(response.error);
        return;
      }

      setAnalysis(response.data);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [analysisRequest, settingsHydrated, refreshCounter, setAppError]);

  const handlePickRepo = async () => {
    const response = await window.api.pickRepo();

    if (!response.ok) {
      setAppError(response.error);
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
      setAppError(response.error);
      return;
    }

    if (response.data) {
      setAppNotice(`JSON exported to ${response.data}`);
    }
  };

  const handleOpenIgnorePatterns = () => {
    setIgnoreDialogOpen(true);
  };

  const handleTogglePanel = (panelId) => {
    setPanelOrder((current) => {
      if (current.includes(panelId)) {
        return current.filter((id) => id !== panelId);
      }

      if (current.length >= MAX_ACTIVE_PANELS) {
        return [...current.slice(1), panelId];
      }

      return [...current, panelId];
    });
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
                value={repoName}
                placeholder={REPO_PLACEHOLDER}
                title={repoPath || undefined}
                readOnly
                className="w-auto"
                style={{ width: repoDisplayWidth }}
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

          <BranchSelectField
            id="base-branch"
            label="Base Branch"
            value={baseBranch}
            onValueChange={setBaseBranch}
            branches={branches}
            placeholder="Select base branch"
          />

          <BranchSelectField
            id="compare-branch"
            label="Compare Branch"
            value={compareBranch}
            onValueChange={setCompareBranch}
            branches={branches}
            placeholder="Select compare branch"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Mode</Label>
              <span
                className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground"
                role="status"
                aria-live="polite"
                aria-label={
                  isLoading ? "Refreshing comparison" : "Comparison ready"
                }
              >
                {isLoading ? (
                  <LoaderCircle size={12} className="animate-spin" />
                ) : null}
              </span>
            </div>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList>
                <TabsTrigger value="merge-base">Merge Base</TabsTrigger>
                <TabsTrigger value="tip-to-tip">Tip to Tip</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-2 xl:justify-self-end">
            <Button
              variant="secondary"
              onClick={() => setSettingsDialogOpen(true)}
              className="gap-2"
            >
              <Settings2 size={15} />
              Settings
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

      {!error && notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
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

      <AnalysisSettingsDialog
        open={settingsDialogOpen}
        compareSource={compareSource}
        onCompareSourceChange={setCompareSource}
        onEditIgnorePatterns={handleOpenIgnorePatterns}
        onClose={() => setSettingsDialogOpen(false)}
      />

      <IgnorePatternsDialog
        open={ignoreDialogOpen}
        initialPatterns={ignorePatterns}
        onClose={() => setIgnoreDialogOpen(false)}
        onSave={setIgnorePatterns}
      />
    </main>
  );
};

export default App;
