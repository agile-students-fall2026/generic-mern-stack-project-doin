import { useEffect, useState } from "react";

export default function useForegroundRefresh() {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let timer;

    function revalidateWhenVisible() {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return;

      // Browsers can deliver focus and visibilitychange together on tab return.
      timer = window.setTimeout(() => setRevision((value) => value + 1), 50);
    }

    window.addEventListener("focus", revalidateWhenVisible);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", revalidateWhenVisible);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, []);

  return revision;
}
