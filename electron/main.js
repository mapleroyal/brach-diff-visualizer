import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import simpleGit from "simple-git";
import { getAnalysisSignature, runAnalysis } from "@main/git/gitAnalyzer";
import { settingsStore } from "@main/persistence/settingsStore";

const __dirname = dirname(fileURLToPath(import.meta.url));

const toSuccess = (data) => ({ ok: true, data });

const toError = (error) => ({
  ok: false,
  error: error instanceof Error ? error.message : "Unexpected error",
});

const registerIpcHandler = (channel, handler) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return toSuccess(await handler(event, ...args));
    } catch (error) {
      return toError(error);
    }
  });
};

const createTimestamp = () => {
  const now = new Date();
  const pad = (value) => `${value}`.padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const sanitizeBranchForFilename = (value) =>
  value
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "branch";

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 1040,
    minWidth: 1200,
    minHeight: 820,
    backgroundColor: "#020617",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(() => {
  registerIpcHandler("repo:pick", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select a Git repository",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const repoPath = result.filePaths[0];
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      throw new Error("Selected directory is not a Git repository.");
    }

    return repoPath;
  });

  registerIpcHandler("git:listBranches", async (_event, repoPath) => {
    const git = simpleGit(repoPath);
    const summary = await git.branch(["--all"]);
    const names = new Set();

    for (const branchName of Object.keys(summary.branches)) {
      const normalized = branchName
        .replace(/^remotes\//, "")
        .replace(/^origin\//, "")
        .trim();

      if (
        !normalized ||
        normalized.endsWith("/HEAD") ||
        normalized === "HEAD"
      ) {
        continue;
      }

      names.add(normalized);
    }

    if (summary.current && summary.current !== "HEAD") {
      names.add(summary.current);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  });

  registerIpcHandler("analysis:run", async (_event, request) =>
    runAnalysis(request)
  );

  registerIpcHandler("analysis:getSignature", async (_event, request) =>
    getAnalysisSignature(request)
  );

  registerIpcHandler("analysis:exportJson", async (_event, payload) => {
    const suggestedName = `git-branch-analysis-${sanitizeBranchForFilename(
      payload.request.compareBranch
    )}-vs-${sanitizeBranchForFilename(payload.request.baseBranch)}-${createTimestamp()}.json`;
    const saveDialogResult = await dialog.showSaveDialog({
      title: "Export Analysis JSON",
      defaultPath: join(payload.request.repoPath, suggestedName),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (saveDialogResult.canceled || !saveDialogResult.filePath) {
      return null;
    }

    const exportPayload = {
      metadata: {
        generatedAt: new Date().toISOString(),
        appVersion: app.getVersion(),
      },
      inputConfig: {
        repoPath: payload.request.repoPath,
        baseBranch: payload.request.baseBranch,
        compareBranch: payload.request.compareBranch,
        mode: payload.request.mode,
        compareSource: payload.request.compareSource,
        ignorePatterns: payload.request.ignorePatterns,
      },
      resolvedRefs: payload.result.resolvedRefs,
      summary: payload.result.summary,
      datasets: payload.result.datasets,
      files: payload.result.files,
    };

    await writeFile(
      saveDialogResult.filePath,
      JSON.stringify(exportPayload, null, 2),
      "utf8"
    );

    return saveDialogResult.filePath;
  });

  registerIpcHandler("settings:loadForRepo", async (_event, repoPath) =>
    settingsStore.loadForRepo(repoPath)
  );

  registerIpcHandler(
    "settings:saveForRepo",
    async (_event, repoPath, settings) =>
      settingsStore.saveForRepo(repoPath, settings)
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
