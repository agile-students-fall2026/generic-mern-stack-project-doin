import { NavLink } from "react-router";
import "./EventsTabs.css";

export default function EventsTabs() {
  return (
    <nav className="events-tabs doin-segments" aria-label="Event navigation">
      <NavLink to="/events" end>Discover Events</NavLink>
      <NavLink to="/my-events?tab=joined">My Events</NavLink>
    </nav>
  );
}
