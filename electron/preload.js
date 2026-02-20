import { contextBridge, ipcRenderer } from "electron";
const api = {
  pickRepo: () => ipcRenderer.invoke("repo:pick"),
  listBranches: (repoPath) => ipcRenderer.invoke("git:listBranches", repoPath),
  getCurrentBranch: (repoPath) =>
    ipcRenderer.invoke("git:getCurrentBranch", repoPath),
  pollAnalysis: (request, previousSignature) =>
    ipcRenderer.invoke("analysis:poll", request, previousSignature),
  exportJson: (payload) => ipcRenderer.invoke("analysis:exportJson", payload),
  loadAppSettings: () => ipcRenderer.invoke("settings:loadAppSettings"),
  loadLastOpenedRepo: () => ipcRenderer.invoke("settings:loadLastOpenedRepo"),
  loadSettingsForRepo: (repoPath) =>
    ipcRenderer.invoke("settings:loadForRepo", repoPath),
  saveAppSettings: (settings) =>
    ipcRenderer.invoke("settings:saveAppSettings", settings),
  saveSettingsForRepo: (repoPath, settings) =>
    ipcRenderer.invoke("settings:saveForRepo", repoPath, settings),
};
contextBridge.exposeInMainWorld("api", api);
