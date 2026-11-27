import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { ToastContext } from "../useToast";
import "../styles/feedback.css";

const toastDuration = 3000;
const supportsPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

function SuccessToast({ notice, onDismiss }) {
  const toastRef = useRef(null);
  const { key: routeKey } = useLocation();
  const previousFocus = useRef(null);
  const remaining = useRef(toastDuration);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);

  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (supportsPopover) toast.showPopover();

  }, []);

  useLayoutEffect(() => {
    const toast = toastRef.current;

    function placeToast() {
      toast.style.removeProperty("top");
      const box = toast.getBoundingClientRect();
      const navTop = document.querySelector(".navbar")?.getBoundingClientRect().top ?? window.innerHeight;
      const visibleBottom = (window.visualViewport?.height ?? window.innerHeight) + (window.visualViewport?.offsetTop ?? 0);
      const limit = Math.min(navTop, visibleBottom) - 8;
      const controls = Array.from(document.querySelectorAll(
        ".app-layout :is(a[href], button, input, select, textarea, summary), #root > main :is(a[href], button, input, select, textarea, summary)",
      ), (element) => element.getBoundingClientRect()).filter((control) =>
        control.width && control.height && control.bottom > box.top && control.top < limit &&
        control.right > box.left && control.left < box.right,
      ).sort((a, b) => a.top - b.top);
      let top = box.top;
      for (const control of controls) {
        if (top + box.height + 4 <= control.top) break;
        if (top < control.bottom + 4) top = control.bottom + 4;
      }
      const fits = top + box.height <= limit;
      toast.toggleAttribute("data-overlap", !fits);
      if (fits) toast.style.top = `${top}px`;
    }

    placeToast();
    const observer = new ResizeObserver(placeToast);
    observer.observe(toast);
    const content = document.querySelector(".page-content");
    const mutations = new MutationObserver(placeToast);
    if (content) {
      observer.observe(content);
      // Async route content can replace a loading state without resizing the page shell.
      mutations.observe(content, { childList: true, subtree: true, characterData: true });
    }
    window.addEventListener("scroll", placeToast, { passive: true });
    window.addEventListener("resize", placeToast);
    window.visualViewport?.addEventListener("resize", placeToast);
    window.visualViewport?.addEventListener("scroll", placeToast);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", placeToast);
      window.removeEventListener("resize", placeToast);
      window.visualViewport?.removeEventListener("resize", placeToast);
      window.visualViewport?.removeEventListener("scroll", placeToast);
    };
  }, [routeKey]);

  useEffect(() => {
    if (focused || interacting) return;
    const started = performance.now();
    const timer = window.setTimeout(() => onDismiss(notice), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [focused, interacting, notice, onDismiss]);

  function dismiss() {
    const target = previousFocus.current;
    if (toastRef.current.contains(document.activeElement) && target?.isConnected) {
      target.focus({ preventScroll: true });
    }
    onDismiss(notice);
  }

  return (
    <div
      className="doin-toast"
      ref={toastRef}
      popover={supportsPopover ? "manual" : undefined}
      role="region"
      aria-label="Notification"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onPointerCancel={() => setInteracting(false)}
      onFocus={(event) => {
        previousFocus.current = event.relatedTarget;
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
      <p>{notice.message}</p>
      <button type="button" className="doin-button doin-toast-close" aria-label="Dismiss notification" onClick={dismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export default function ToastProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const nextId = useRef(0);

  const showSuccess = useCallback((message) => {
    const next = { id: ++nextId.current, message };
    setNotice((current) => current?.message === message ? current : next);
  }, []);

  const dismiss = useCallback((displayed) => {
    setNotice((current) => current === displayed ? null : current);
  }, []);

  return (
    <ToastContext.Provider value={showSuccess}>
      {children}
      <p className="doin-sr-only" role="status" aria-atomic="true">{notice?.message}</p>
      {notice && <SuccessToast key={notice.id} notice={notice} onDismiss={dismiss} />}
    </ToastContext.Provider>
  );
}
