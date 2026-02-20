import { useEffect } from "react";
import {
  desktopClient,
  getDesktopClientErrorMessage,
} from "@renderer/services/desktopClient";

const SETTINGS_PERSIST_DEBOUNCE_MS = 200;

const usePersistedRepoSettings = ({
  repoPath,
  settingsHydrated,
  settings,
  onError,
}) => {
  useEffect(() => {
    if (!repoPath || !settingsHydrated) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        await desktopClient.saveSettingsForRepo(repoPath, settings);
      } catch (error) {
        if (!cancelled && onError) {
          onError(getDesktopClientErrorMessage(error));
        }
      }
    }, SETTINGS_PERSIST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [onError, repoPath, settings, settingsHydrated]);
};

export { SETTINGS_PERSIST_DEBOUNCE_MS, usePersistedRepoSettings };
