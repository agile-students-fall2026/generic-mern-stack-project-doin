import { useCallback, useEffect, useRef, useState } from "react";
import { processProfilePhoto } from "./profilePhoto";

export default function useProfilePhoto() {
  const [imageUrl, setImageUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(null);

  useEffect(() => () => active.current?.abort(), []);

  const setPhoto = useCallback((value) => {
    active.current?.abort();
    active.current = null;
    setImageUrl(value);
    setProcessing(false);
    setError("");
  }, []);

  async function choosePhoto(file, fields) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setProcessing(true);
    setError("");

    try {
      const photo = await processProfilePhoto(file, fields, controller.signal);
      if (controller.signal.aborted) return false;
      setImageUrl(photo);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message);
      return false;
    } finally {
      if (active.current === controller && !controller.signal.aborted) {
        active.current = null;
        setProcessing(false);
      }
    }
  }

  return { imageUrl, processing, error, choosePhoto, setPhoto };
}
