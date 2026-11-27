import { Link, useLocation } from "react-router";
import { eventProfileOrigin } from "../viewHistory";
import Icon from "./Icon";
import "./Navbar.css";

const items = [
  ["/discover", "People", "people"],
  ["/events", "Events", "date"],
  ["/connections", "Connect", "connect"],
  ["/profile", "Profile", "profile"],
];

function activeSection(pathname, search) {
  if (pathname.startsWith("/connections")) return "/connections";
  if (pathname.startsWith("/events") || pathname === "/my-events" || pathname === "/create-event"
    || (pathname.startsWith("/discover/") && eventProfileOrigin(search))) return "/events";
  if (pathname === "/profile" || pathname === "/edit-profile") return "/profile";
  return pathname.startsWith("/discover") ? "/discover" : "";
}

export default function Navbar({ ref }) {
  const { pathname, search } = useLocation();
  const active = activeSection(pathname, search);

  return (
    <nav className="navbar" aria-label="Main navigation" ref={ref}>
      {items.map(([to, label, icon]) => (
        <Link to={to} key={to} aria-current={active === to ? "page" : undefined}>
          <span className="navbar-icon"><Icon name={icon} /></span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
