import { useCallback, useEffect, useRef, useState } from "react";
import { currentUserId, getMyUser, setCurrentUserId } from "./api";

export function signedInPath(user) {
  if (user.profileComplete) return "/discover";
  return user.interests.length > 0 ? "/setup-profile" : "/select-interests";
}

export function useSession() {
  const [session, setSession] = useState(() => ({
    status: currentUserId() ? "loading" : "signed-out",
  }));
  const restoreController = useRef(null);

  const checkSavedSession = useCallback(() => {
    restoreController.current?.abort();
    const userId = currentUserId();
    if (!userId) return;

    const controller = new AbortController();
    restoreController.current = controller;

    getMyUser(controller.signal)
      .then((user) => {
        if (!controller.signal.aborted && currentUserId() === userId) {
          setSession({ status: "signed-in", user });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || currentUserId() !== userId) return;
        if (error.status === 401) {
          setCurrentUserId(null);
          setSession({ status: "signed-out" });
        } else {
          setSession({ status: "error", error: error.message });
        }
      });
  }, []);

  useEffect(() => {
    checkSavedSession();
    return () => restoreController.current?.abort();
  }, [checkSavedSession]);

  function restoreSession() {
    if (!currentUserId()) {
      setSession({ status: "signed-out" });
      return;
    }
    setSession({ status: "loading" });
    checkSavedSession();
  }

  function saveSession(user) {
    // A successful sign-in supersedes any outstanding restoration, even for the same ID.
    restoreController.current?.abort();
    setCurrentUserId(user.id);
    setSession({ status: "signed-in", user });
  }

  return { session, restoreSession, saveSession };
}
