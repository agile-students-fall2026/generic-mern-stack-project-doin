import { useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router";
import { ViewHistory } from "../viewHistory";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  const navigation = useRef(null);
  const content = useRef(null);
  const [views] = useState(() => new Map());
  const { key } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    const entries = views;
    const saved = navigationType === "POP" ? entries.get(key) : null;
    const page = content.current;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    function restore() {
      const top = saved?.top ?? 0;
      window.scrollTo({ top, behavior: "instant" });
      const link = saved?.link && [...page.querySelectorAll("a[href]")]
        .find((element) => element.getAttribute("href") === saved.link);
      if (link && document.activeElement === document.body) link.focus({ preventScroll: true });
      if (window.scrollY >= top && (!saved?.link || link)) cancelRestore();
    }

    const resize = new ResizeObserver(restore);
    const mutations = new MutationObserver(restore);
    restore();
    if ((saved?.top ?? 0) > window.scrollY) resize.observe(page);
    if (saved?.link) mutations.observe(page, { childList: true, subtree: true });

    function cancelRestore() {
      resize.disconnect();
      mutations.disconnect();
    }

    function rememberScroll() {
      entries.set(key, { ...entries.get(key), top: window.scrollY });
    }

    page.addEventListener("pointerdown", cancelRestore);
    window.addEventListener("keydown", cancelRestore);
    window.addEventListener("wheel", cancelRestore, { passive: true });
    window.addEventListener("scroll", rememberScroll, { passive: true });

    return () => {
      cancelRestore();
      page.removeEventListener("pointerdown", cancelRestore);
      window.removeEventListener("keydown", cancelRestore);
      window.removeEventListener("wheel", cancelRestore);
      window.removeEventListener("scroll", rememberScroll);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [key, navigationType, views]);

  function rememberLink(event) {
    const link = event.target.closest("a[href]");
    if (link) {
      views.set(key, {
        ...views.get(key), top: window.scrollY, link: link.getAttribute("href"),
      });
    }
  }

  function revealFocusedControl(event) {
    const control = event.target;
    if (control.closest("dialog")) return;

    requestAnimationFrame(() => {
      if (document.activeElement !== control || !navigation.current) return;
      const bounds = control.getBoundingClientRect();
      const navTop = navigation.current.getBoundingClientRect().top;
      if (bounds.bottom > navTop) control.scrollIntoView({ block: "end" });
    });
  }

  return (
    <ViewHistory.Provider value={views}>
      <div className="app-layout">
        <div className="page-content" ref={content} onFocus={revealFocusedControl} onClickCapture={rememberLink}>
          {children}
        </div>
        <Navbar ref={navigation} />
      </div>
    </ViewHistory.Provider>
  );
}
