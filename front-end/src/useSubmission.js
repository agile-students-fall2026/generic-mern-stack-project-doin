import { useEffect, useRef, useState } from "react";

export default function useSubmission() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function submit(send, onSuccess) {
    if (activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setError("");

    try {
      const result = await send(controller.signal);
      if (!controller.signal.aborted) onSuccess(result);
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
    } finally {
      activeRequest.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return { pending, error, setError, submit };
}
