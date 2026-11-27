
import { useRef } from "react";
import Navbar from "./Navbar";

function Layout({ children }) {
  const navigation = useRef(null);

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
    <div className="app-layout">
      <div className="page-content" onFocus={revealFocusedControl}>
        {children}
      </div>
      <Navbar ref={navigation} />
    </div>
  );
}

export default Layout;
