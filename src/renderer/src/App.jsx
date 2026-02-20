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

const getRepoName = (repoPath) => {
  if (!repoPath) {
    return "";
  }

  const normalized = repoPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] || normalized;
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

  const {
    analysis,
    isLoading,
    error: analysisError,
  } = useAnalysisPoller({
    analysisRequest,
    settingsHydrated,
  });

  useEffect(() => {
    if (analysisError) {
      setNotice(null);
    }
  }, [analysisError]);

  const error = analysisError || localError;

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
    if (!analysis || !analysisRequest) {
      return;
    }

    try {
      const exportPath = await desktopClient.exportJson({
        request: analysisRequest,
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
