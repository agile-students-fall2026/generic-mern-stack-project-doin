import { NavLink } from "react-router";
import "./EventsTabs.css";

export default function EventsTabs() {
  return (
    <nav className="events-tabs" aria-label="Event navigation">
      <NavLink
        to="/events"
        end
        className={({ isActive }) =>
          `doin-button events-tabs-link ${
            isActive ? "doin-button--primary" : "doin-button--secondary"
          }`
        }
      >
        Discover events
      </NavLink>

      <NavLink
        to="/my-events"
        className={({ isActive }) =>
          `doin-button events-tabs-link ${
            isActive ? "doin-button--primary" : "doin-button--secondary"
          }`
        }
      >
        My events
      </NavLink>
    </nav>
  );
}
