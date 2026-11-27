import { useCallback, useEffect, useRef, useState } from "react";

export default function useApiData(key, load, refreshKey, delay = 0) {
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const activeRequest = useRef(null);

  useEffect(() => {
    if (key === null) return;

    const controller = new AbortController();
    const { signal } = controller;
    activeRequest.current = controller;

    async function fetchData() {
      try {
        const data = await load(key, signal);
        if (!signal.aborted) setResult({ key, revision, refreshKey, data, error: "" });
      } catch (error) {
        if (!signal.aborted) setResult({ key, revision, refreshKey, error: error.message });
      }
    }

    const timer = delay ? window.setTimeout(fetchData, delay) : undefined;
    if (!delay) fetchData();

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, load, refreshKey, revision, delay]);

  const invalidate = useCallback(() => {
    activeRequest.current?.abort();
    setRevision((value) => value + 1);
  }, []);

  function replace(data) {
    activeRequest.current?.abort();
    setResult({ key, revision, refreshKey, data, error: "" });
  }

  const current = key !== null && result?.key === key ? result : null;
  return {
    data: current?.data,
    error: current?.error ?? "",
    loading: key !== null && !current,
    refreshing: Boolean(current && (current.refreshKey !== refreshKey || current.revision !== revision)),
    invalidated: Boolean(current && current.revision !== revision),
    invalidate,
    replace,
  };
}
