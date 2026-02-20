import { useEffect, useRef, useState } from "react";
import {
  desktopClient,
  getDesktopClientErrorMessage,
} from "@renderer/services/desktopClient";

const AUTO_REFRESH_INTERVAL_MS = 1000;

const useAnalysisPoller = ({
  analysisRequest,
  settingsHydrated,
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
}) => {
  const [signature, setSignature] = useState(null);
  const [analysis, setAnalysis] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeSignatureRef = useRef(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    activeSignatureRef.current = null;
    isPollingRef.current = false;

    if (!analysisRequest || !settingsHydrated) {
      setSignature(null);
      setAnalysis(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setSignature(null);
    setAnalysis(undefined);
    setError(null);
    setIsLoading(true);

    const poll = async () => {
      if (cancelled || isPollingRef.current) {
        return;
      }

      isPollingRef.current = true;

      try {
        const response = await desktopClient.pollAnalysis(
          analysisRequest,
          activeSignatureRef.current
        );

        if (cancelled) {
          return;
        }

        activeSignatureRef.current = response.signature;
        setSignature(response.signature);

        if (response.changed) {
          setAnalysis(response.result);
        }

        setError(null);
      } catch (pollError) {
        if (!cancelled) {
          setAnalysis(undefined);
          setError(getDesktopClientErrorMessage(pollError));
        }
      } finally {
        isPollingRef.current = false;
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      cancelled = true;
      isPollingRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [analysisRequest, intervalMs, settingsHydrated]);

  return { signature, analysis, isLoading, error };
};

export { useAnalysisPoller };
