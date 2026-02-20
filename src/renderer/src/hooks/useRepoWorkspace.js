import { useCallback, useMemo, useState } from "react";
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
import { desktopClient } from "@renderer/services/desktopClient";

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

const useRepoWorkspace = () => {
  const [repoPath, setRepoPath] = useState("");
  const [branches, setBranches] = useState([]);
  const [baseBranch, setBaseBranch] = useState("");
  const [compareBranch, setCompareBranch] = useState("");
  const [mode, setMode] = useState(DEFAULT_ANALYSIS_MODE);
  const [compareSource, setCompareSource] = useState(DEFAULT_COMPARE_SOURCE);
  const [ignorePatterns, setIgnorePatterns] = useState([
    ...DEFAULT_IGNORE_PATTERNS,
  ]);
  const [panelOrder, setPanelOrder] = useState([...DEFAULT_ACTIVE_PANELS]);
  const [canvasOrientation, setCanvasOrientation] = useState(
    DEFAULT_CANVAS_ORIENTATION
  );
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

  const loadRepoContext = useCallback(async (path) => {
    setSettingsHydrated(false);

    const [availableBranches, settings] = await Promise.all([
      desktopClient.listBranches(path),
      desktopClient.loadSettingsForRepo(path),
    ]);

    const resolvedBranches = resolveBranchSelection(
      availableBranches,
      settings.baseBranch,
      settings.compareBranch
    );

    setRepoPath(path);
    setBranches(availableBranches);
    setMode(settings.mode);
    setCompareSource(settings.compareSource);
    setIgnorePatterns(settings.ignorePatterns);
    setPanelOrder(settings.panelOrder);
    setCanvasOrientation(settings.canvasOrientation);
    setBaseBranch(resolvedBranches.baseBranch);
    setCompareBranch(resolvedBranches.compareBranch);
    setSettingsHydrated(true);
  }, []);

  const pickRepo = useCallback(async () => {
    const selectedRepoPath = await desktopClient.pickRepo();
    if (!selectedRepoPath) {
      return null;
    }

    await loadRepoContext(selectedRepoPath);
    return selectedRepoPath;
  }, [loadRepoContext]);

  const openLastRepo = useCallback(async () => {
    const lastOpenedRepoPath = await desktopClient.loadLastOpenedRepo();
    if (!lastOpenedRepoPath) {
      return null;
    }

    await loadRepoContext(lastOpenedRepoPath);
    return lastOpenedRepoPath;
  }, [loadRepoContext]);

  const refreshRepo = useCallback(async () => {
    if (!repoPath) {
      return false;
    }

    await loadRepoContext(repoPath);
    return true;
  }, [loadRepoContext, repoPath]);

  const togglePanel = useCallback((panelId) => {
    setPanelOrder((current) => {
      if (current.includes(panelId)) {
        return current.filter((id) => id !== panelId);
      }

      if (current.length >= MAX_ACTIVE_PANELS) {
        return [...current.slice(1), panelId];
      }

      return [...current, panelId];
    });
  }, []);

  return {
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
  };
};

export { useRepoWorkspace };
