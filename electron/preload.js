import { contextBridge, ipcRenderer } from "electron";
const api = {
  pickRepo: () => ipcRenderer.invoke("repo:pick"),
  listBranches: (repoPath) => ipcRenderer.invoke("git:listBranches", repoPath),
  runAnalysis: (request) => ipcRenderer.invoke("analysis:run", request),
  exportJson: (payload) => ipcRenderer.invoke("analysis:exportJson", payload),
  loadSettingsForRepo: (repoPath) =>
    ipcRenderer.invoke("settings:loadForRepo", repoPath),
  saveSettingsForRepo: (repoPath, settings) =>
    ipcRenderer.invoke("settings:saveForRepo", repoPath, settings),
};
contextBridge.exposeInMainWorld("api", api);
