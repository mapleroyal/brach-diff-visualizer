import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Settings2,
} from "lucide-react";
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
import { useAnalysisPoller } from "@renderer/hooks/useAnalysisPoller";
import { usePersistedRepoSettings } from "@renderer/hooks/usePersistedRepoSettings";
import { useRepoWorkspace } from "@renderer/hooks/useRepoWorkspace";
import { makeDefaultAppSettings } from "@shared/appSettings";
import {
  desktopClient,
  getDesktopClientErrorMessage,
} from "@renderer/services/desktopClient";

const REPO_PLACEHOLDER = "Pick local repository";

const BranchSelectField = ({
  id,
  label,
  value,
  onValueChange,
  branches,
  placeholder,
  disabledMessage,
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
    {branches.length === 0 && disabledMessage ? (
      <p className="text-xs text-muted-foreground">{disabledMessage}</p>
    ) : null}
  </div>
);

const getRepoName = (repoPath) => {
  if (!repoPath) {
    return "";
  }

  const normalized = repoPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] || normalized;
};

const resolveWorkingTreePreflightMessage = ({
  settingsHydrated,
  compareSource,
  repoPath,
  baseBranch,
  compareBranch,
  currentBranch,
}) => {
  if (
    !settingsHydrated ||
    compareSource !== "working-tree" ||
    !repoPath ||
    !baseBranch ||
    !compareBranch
  ) {
    return null;
  }

  if (!currentBranch) {
    return `Working Tree compare requires an active branch checkout. Check out "${compareBranch}", then refresh, or switch Compare Source to Branch Tip in Settings.`;
  }

  if (currentBranch !== compareBranch) {
    return `Working Tree compare requires "${compareBranch}" checked out, but the repository is on "${currentBranch}". Check out "${compareBranch}" and refresh, or switch Compare Source to Branch Tip in Settings.`;
  }

  return null;
};

const App = () => {
  const [localError, setLocalError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [appSettings, setAppSettings] = useState(() =>
    makeDefaultAppSettings()
  );
  const [appSettingsHydrated, setAppSettingsHydrated] = useState(false);
  const [isSavingAppSettings, setIsSavingAppSettings] = useState(false);
  const startupRepoRestoreAttemptedRef = useRef(false);

  const {
    repoPath,
    currentBranch,
    branches,
    baseBranch,
    compareBranch,
    mode,
    compareSource,
    ignorePatterns,
    panelOrder,
    canvasOrientation,
    settingsHydrated,
    analysisRequest,
    setBaseBranch,
    setCompareBranch,
    setMode,
    setCompareSource,
    setIgnorePatterns,
    setCanvasOrientation,
    pickRepo,
    openLastRepo,
    refreshRepo,
    togglePanel,
  } = useRepoWorkspace();

  const persistedSettings = useMemo(
    () => ({
      ignorePatterns,
      mode,
      compareSource,
      baseBranch,
      compareBranch,
      panelOrder: [...panelOrder],
      canvasOrientation,
    }),
    [
      ignorePatterns,
      mode,
      compareSource,
      baseBranch,
      compareBranch,
      panelOrder,
      canvasOrientation,
    ]
  );

  const setAppError = useCallback((message) => {
    setNotice(null);
    setLocalError(message);
  }, []);

  const setAppNotice = useCallback((message) => {
    setLocalError(null);
    setNotice(message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAppSettings = async () => {
      try {
        const loadedAppSettings = await desktopClient.loadAppSettings();
        if (!cancelled) {
          setAppSettings(loadedAppSettings);
        }
      } catch (errorValue) {
        if (!cancelled) {
          setAppError(getDesktopClientErrorMessage(errorValue));
        }
      } finally {
        if (!cancelled) {
          setAppSettingsHydrated(true);
        }
      }
    };

    void loadAppSettings();

    return () => {
      cancelled = true;
    };
  }, [setAppError]);

  useEffect(() => {
    if (!appSettingsHydrated || startupRepoRestoreAttemptedRef.current) {
      return;
    }

    startupRepoRestoreAttemptedRef.current = true;
    if (!appSettings.autoOpenLastRepoOnStartup) {
      return;
    }

    let cancelled = false;

    const initializeRepo = async () => {
      try {
        await openLastRepo();
      } catch (errorValue) {
        if (!cancelled) {
          setAppError(getDesktopClientErrorMessage(errorValue));
        }
      }
    };

    void initializeRepo();

    return () => {
      cancelled = true;
    };
  }, [
    appSettings.autoOpenLastRepoOnStartup,
    appSettingsHydrated,
    openLastRepo,
    setAppError,
  ]);

  usePersistedRepoSettings({
    repoPath,
    settingsHydrated,
    settings: persistedSettings,
    onError: setAppError,
  });

  const workingTreePreflightMessage = useMemo(
    () =>
      resolveWorkingTreePreflightMessage({
        settingsHydrated,
        compareSource,
        repoPath,
        baseBranch,
        compareBranch,
        currentBranch,
      }),
    [
      settingsHydrated,
      compareSource,
      repoPath,
      baseBranch,
      compareBranch,
      currentBranch,
    ]
  );
  const effectiveAnalysisRequest = workingTreePreflightMessage
    ? null
    : analysisRequest;

  const {
    analysis,
    isLoading,
    error: analysisError,
  } = useAnalysisPoller({
    analysisRequest: effectiveAnalysisRequest,
    settingsHydrated,
  });

  useEffect(() => {
    if (analysisError) {
      setNotice(null);
    }
  }, [analysisError]);

  const error = analysisError || localError;
  const branchFieldDisabledMessage = repoPath
    ? "No branches available for this repository."
    : "Pick a repository to load branches.";
  const exportDisabledReason = useMemo(() => {
    if (analysis) {
      return null;
    }

    if (!repoPath) {
      return "Pick a repository to enable JSON export.";
    }

    if (!baseBranch || !compareBranch) {
      return "Select base and compare branches to run a comparison.";
    }

    if (workingTreePreflightMessage) {
      return "Resolve working-tree requirements to enable export.";
    }

    if (isLoading) {
      return "Waiting for comparison results.";
    }

    return "Run a comparison to enable JSON export.";
  }, [
    analysis,
    repoPath,
    baseBranch,
    compareBranch,
    workingTreePreflightMessage,
    isLoading,
  ]);

  const repoName = useMemo(() => getRepoName(repoPath), [repoPath]);
  const repoDisplayWidth = useMemo(() => {
    const source = repoName || REPO_PLACEHOLDER;
    return `${source.length + 2}ch`;
  }, [repoName]);

  const handlePickRepo = async () => {
    setNotice(null);
    setLocalError(null);

    try {
      await pickRepo();
    } catch (errorValue) {
      setAppError(getDesktopClientErrorMessage(errorValue));
    }
  };

  const handleRefreshRepo = async () => {
    if (!repoPath) {
      return;
    }

    setNotice(null);
    setLocalError(null);

    try {
      await refreshRepo();
    } catch (errorValue) {
      setAppError(getDesktopClientErrorMessage(errorValue));
    }
  };

  const handleExportJson = async () => {
    if (!analysis || !effectiveAnalysisRequest) {
      return;
    }

    try {
      const exportPath = await desktopClient.exportJson({
        request: effectiveAnalysisRequest,
        result: analysis,
      });

      if (exportPath) {
        setAppNotice(`JSON exported to ${exportPath}`);
      }
    } catch (errorValue) {
      setAppError(getDesktopClientErrorMessage(errorValue));
    }
  };

  const handleOpenIgnorePatterns = () => {
    setIgnoreDialogOpen(true);
  };

  const handleAutoOpenLastRepoOnStartupChange = async (enabled) => {
    setNotice(null);
    setLocalError(null);
    setIsSavingAppSettings(true);

    try {
      const savedSettings = await desktopClient.saveAppSettings({
        ...appSettings,
        autoOpenLastRepoOnStartup: enabled,
      });
      setAppSettings(savedSettings);
    } catch (errorValue) {
      setAppError(getDesktopClientErrorMessage(errorValue));
    } finally {
      setIsSavingAppSettings(false);
    }
  };

  return (
    <main className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(250px,1.35fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto_auto] lg:items-center">
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
                style={{ width: repoDisplayWidth, maxWidth: "100%" }}
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
            disabledMessage={branchFieldDisabledMessage}
          />

          <BranchSelectField
            id="compare-branch"
            label="Compare Branch"
            value={compareBranch}
            onValueChange={setCompareBranch}
            branches={branches}
            placeholder="Select compare branch"
            disabledMessage={branchFieldDisabledMessage}
          />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex flex-col gap-2 lg:justify-self-end">
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
              disabled={Boolean(exportDisabledReason)}
              title={exportDisabledReason || undefined}
              className="gap-2"
            >
              <Download size={15} />
              Export JSON
            </Button>
            {exportDisabledReason ? (
              <p className="max-w-[18rem] text-xs text-muted-foreground">
                {exportDisabledReason}
              </p>
            ) : null}
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

      {!error && !notice && workingTreePreflightMessage ? (
        <Alert>
          <AlertDescription>{workingTreePreflightMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-1">
        <VisualizationToggleRail
          activePanels={panelOrder}
          onToggle={togglePanel}
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
        autoOpenLastRepoOnStartup={appSettings.autoOpenLastRepoOnStartup}
        onAutoOpenLastRepoOnStartupChange={
          handleAutoOpenLastRepoOnStartupChange
        }
        isAutoOpenLastRepoOnStartupUpdating={
          !appSettingsHydrated || isSavingAppSettings
        }
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
